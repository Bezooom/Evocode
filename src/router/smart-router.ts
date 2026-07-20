// Умный роутер — local ↔ cloud (токены + сложность + privacyMode)
import {
  InferenceEngine,
  InferenceError,
  InferenceRequest,
  InferenceResponse,
  inferenceEngine,
} from '../engine/inference';
import { defaultConfig, EvocodeConfig } from '../core/config';
import { dlpGuard, DLPBlockedError } from '../guard/dlp-guard';

export type RouterDecision = 'local' | 'cloud';

export interface RouterContext {
  request: InferenceRequest;
  /** Оценка токенов (prompt + system), не миллисекунды */
  contextSize: number;
  taskComplexity: 'simple' | 'medium' | 'complex';
  isCodeGeneration: boolean;
  hasAttachments: boolean;
}

export interface RouteMeta {
  decision: RouterDecision;
  reason: string;
  complexity: RouterContext['taskComplexity'];
  contextTokens: number;
  dlpChanges: number;
  fallback?: string;
}

export class SmartRouter {
  private engine: InferenceEngine;
  private config: EvocodeConfig;

  constructor(engine: InferenceEngine = inferenceEngine, config?: Partial<EvocodeConfig>) {
    this.engine = engine;
    this.config = config
      ? ({ ...defaultConfig, ...config } as EvocodeConfig)
      : defaultConfig;
  }

  async route(context: RouterContext): Promise<{ decision: RouterDecision; reason: string }> {
    const { privacyMode, enabled, localMaxTokens, cloudMinTokens } = this.config.router;
    const hasCloudKey = Boolean(this.config.inference.cloud.apiKey);

    if (!enabled || privacyMode === 'always-local') {
      return { decision: 'local', reason: 'privacyMode=always-local или router disabled' };
    }
    if (privacyMode === 'always-cloud') {
      if (!hasCloudKey) {
        return { decision: 'local', reason: 'always-cloud but no OPENROUTER_API_KEY → local' };
      }
      return { decision: 'cloud', reason: 'privacyMode=always-cloud' };
    }

    // Without a cloud API key never select cloud (would 401: Missing Authentication header)
    if (!hasCloudKey) {
      return { decision: 'local', reason: 'no cloud api key → local-only' };
    }

    if (context.taskComplexity === 'simple' && context.contextSize <= localMaxTokens) {
      return { decision: 'local', reason: 'simple + малый контекст' };
    }

    if (context.hasAttachments) {
      return { decision: 'cloud', reason: 'есть вложения' };
    }

    if (context.taskComplexity === 'complex' || context.contextSize >= cloudMinTokens) {
      return { decision: 'cloud', reason: 'complex или большой контекст' };
    }

    if (context.isCodeGeneration) {
      return { decision: 'local', reason: 'генерация кода — local-first' };
    }

    return { decision: 'local', reason: 'default local-first' };
  }

  /**
   * Выполнение запроса.
   * DLP применяется ТОЛЬКО на cloud-маршруте (privacy model из ТЗ).
   * Local failure → fallback cloud (через DLP), если privacyMode=auto и есть ключ.
   */
  async processRequest(
    request: InferenceRequest,
    context: RouterContext
  ): Promise<{ response: InferenceResponse; meta: RouteMeta }> {
    const { decision, reason } = await this.route(context);
    console.log(`Маршрутизация: ${decision} (${reason})`);

    if (decision === 'local') {
      try {
        const response =
          context.taskComplexity === 'simple' &&
          request.maxTokens !== undefined &&
          request.maxTokens < 500
            ? await this.engine.fim(request)
            : await this.engine.chat(request);

        return {
          response,
          meta: {
            decision: 'local',
            reason,
            complexity: context.taskComplexity,
            contextTokens: context.contextSize,
            dlpChanges: 0,
          },
        };
      } catch (err) {
        if (
          this.config.router.privacyMode === 'auto' &&
          this.config.inference.cloud.apiKey &&
          err instanceof InferenceError &&
          err.code === 'LOCAL_UNAVAILABLE'
        ) {
          console.warn('Local fallback → cloud (через DLP)');
          return this.runCloud(request, context, `${reason}; fallback after local error`);
        }
        throw err;
      }
    }

    return this.runCloud(request, context, reason);
  }

  private async runCloud(
    request: InferenceRequest,
    context: RouterContext,
    reason: string
  ): Promise<{ response: InferenceResponse; meta: RouteMeta }> {
    // DLP only on cloud path
    const dlpResult = await dlpGuard.processRequest({
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      messages: request.messages,
    });

    if (dlpResult.blocked) {
      throw new DLPBlockedError(
        'Облачный запрос заблокирован DLP Guard: обнаружены критичные секреты',
        dlpResult.changes
      );
    }

    const safeRequest: InferenceRequest = {
      ...request,
      prompt: dlpResult.prompt,
      systemPrompt: dlpResult.systemPrompt,
      messages: dlpResult.messages,
    };

    const response = await this.engine.chatCloud(safeRequest);
    return {
      response,
      meta: {
        decision: 'cloud',
        reason,
        complexity: context.taskComplexity,
        contextTokens: context.contextSize,
        dlpChanges: dlpResult.changes.length,
        fallback: reason.includes('fallback') ? 'local→cloud' : undefined,
      },
    };
  }

  analyzeTask(request: InferenceRequest): RouterContext {
    const contextSize = this.estimateContextSize(request);
    const taskComplexity = this.classifyTask(request);
    const prompt = String(request.prompt ?? '').toLowerCase();

    return {
      request,
      contextSize,
      taskComplexity,
      isCodeGeneration:
        prompt.includes('код') ||
        prompt.includes('code') ||
        prompt.includes('функци') ||
        prompt.includes('function') ||
        prompt.includes('class '),
      hasAttachments: false,
    };
  }

  private estimateContextSize(request: InferenceRequest): number {
    const promptTokens = Math.ceil(String(request.prompt ?? '').length / 4);
    const systemTokens = request.systemPrompt
      ? Math.ceil(String(request.systemPrompt).length / 4)
      : 0;
    if (request.messages) {
      const msgTokens = request.messages.reduce(
        (s, m) => s + Math.ceil(String(m.content ?? '').length / 4),
        0
      );
      return msgTokens + systemTokens;
    }
    return promptTokens + systemTokens;
  }

  private classifyTask(request: InferenceRequest): 'simple' | 'medium' | 'complex' {
    const prompt = String(request.prompt ?? '').toLowerCase();

    const simpleKeywords = [
      'исправь', 'обнови', 'допиши', 'напиши функцию', 'добавь',
      'переименуй', 'удали', 'убери', 'форматируй',
      'fix', 'update', 'rename', 'delete', 'remove', 'format',
    ];
    if (simpleKeywords.some((kw) => prompt.includes(kw))) {
      return 'simple';
    }

    const complexKeywords = [
      'спроектируй', 'архитектуру', 'объясни', 'проанализируй',
      'рефакторинг', 'миграция', 'ревью',
      'refactor', 'migrate', 'design', 'review', 'debug',
      'architecture', 'multi-file', 'microservice',
    ];
    if (complexKeywords.some((kw) => prompt.includes(kw))) {
      return 'complex';
    }

    return 'medium';
  }
}

export const smartRouter = new SmartRouter(inferenceEngine);
