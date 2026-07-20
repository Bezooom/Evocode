/**
 * Эвокод Core — privacy brain для IDE (VSCodium + fork kilo-vscode).
 * HTTP API: health, chat, index-file, OpenAI-compatible /v1/*
 */
import { inferenceEngine, InferenceError } from './engine/inference';
import { runtimeManager } from './engine/runtime-manager';
import {
  foldReasoningDelta,
  foldReasoningMessage,
  isAbortLikeError,
} from './engine/openai-normalize';
import { smartRouter } from './router/smart-router';
import { skillSyncEngine } from './sync/skill-sync';
import { DLPBlockedError } from './guard/dlp-guard';
import { vectorIndex } from './indexer/vector-index';
import { skillLoader } from './skills/skill-loader';
import { defaultConfig, initConfig, saveConfig } from './core/config';
import { contentToText } from './core/text';
import { probeHardware } from './core/hardware';
import * as http from 'http';
import { ProxyAgent } from 'undici';

/** Soft cache so /health stays fast but does not always report fimReady:false */
let cachedFimReady: boolean | null = null;
let cachedFimReadyAt = 0;

export interface ChatResult {
  answer: string;
  model: string;
  source: string;
  route: string;
  reason: string;
  skills: string[];
  dlpChanges: number;
  latency: number;
}

async function initialize(): Promise<void> {
  initConfig();
  // SkillLoader constructed at import time — re-bind after .evocode/config.json
  skillLoader.applyConfig(defaultConfig);
  console.log('🧬 Инициализация Эвокод Core...');
  console.log(`   mode=${defaultConfig.mode}, privacy=${defaultConfig.router.privacyMode}`);

  try {
    await inferenceEngine.startLocalServer();
  } catch (err) {
    console.warn(
      '⚠️ Локальный llama-server не запущен. Local-запросы будут ошибкой; cloud — при наличии ключа.',
      (err as Error).message
    );
  }

  if (defaultConfig.sync.enabled) {
    console.log('📚 Синхронизация навыков...');
    try {
      await skillSyncEngine.sync();
      skillLoader.invalidate();
    } catch (err) {
      console.warn('Skill sync пропущен:', (err as Error).message);
    }
  }

  const skills = skillLoader.loadAll();
  console.log(`✅ Эвокод готов (${skills.length} навыков на диске)`);
  // Skill embeddings warm-up runs AFTER HTTP listen (see main) so /health is immediate
}

async function warmSkillEmbeddings(): Promise<void> {
  if (!defaultConfig.skills.useEmbeddings) return;
  try {
    let embedFn: ((t: string) => Promise<number[]>) | undefined;
    if (defaultConfig.skills.embedBackend === 'inference') {
      embedFn = async (t: string) => {
        try {
          return await inferenceEngine.getEmbeddings(t.slice(0, 2000));
        } catch {
          const { hashEmbed } = await import('./skills/skill-embeddings');
          return hashEmbed(t);
        }
      };
    }
    const emb = await skillLoader.ensureEmbeddings(embedFn);
    console.log(
      `🧠 Skill embeddings: upserted=${emb.upserted} skipped=${emb.skipped} errors=${emb.errors} (backend=${defaultConfig.skills.embedBackend})`
    );
  } catch (e) {
    console.warn('Skill embeddings skipped:', (e as Error).message);
  }
}

/** Полный pipeline: skills → RAG → router → (DLP only if cloud) → inference */
export async function handleRequest(query: string | unknown): Promise<ChatResult> {
  const text = contentToText(query);
  const skillInj = await skillLoader.buildInjectionAsync(text);

  let ragContext = '';
  try {
    const queryEmbedding = await inferenceEngine.getEmbeddings(text.slice(0, 2000));
    const relevantChunks = vectorIndex.search(queryEmbedding, 3);
    if (relevantChunks.length > 0) {
      ragContext =
        'Контекст из кодовой базы:\n' +
        relevantChunks.map((c) => `[${c.filePath}]\n${c.content}`).join('\n\n') +
        '\n\n';
    }
  } catch {
    // RAG optional when embeddings unavailable
    ragContext = '';
  }

  const systemPrompt = [skillInj.text, ragContext].filter(Boolean).join('\n\n');

  const context = smartRouter.analyzeTask({
    prompt: text,
    systemPrompt,
  });

  const { response, meta } = await smartRouter.processRequest(
    { prompt: text, systemPrompt: systemPrompt || undefined },
    context
  );

  return {
    answer: response.text,
    model: response.model,
    source: response.source,
    route: meta.decision,
    reason: meta.reason,
    skills: skillInj.skills.map((s) => s.name),
    dlpChanges: meta.dlpChanges,
    latency: response.latency,
  };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 2 * 1024 * 1024;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function mapError(err: unknown): { status: number; body: Record<string, unknown> } {
  if (err instanceof DLPBlockedError) {
    return {
      status: 403,
      body: {
        error: {
          message: err.message,
          type: 'dlp_blocked',
          changes: err.changes.length,
        },
      },
    };
  }
  if (err instanceof InferenceError) {
    return {
      status: 503,
      body: {
        error: {
          message: err.message,
          type: err.code.toLowerCase(),
        },
      },
    };
  }
  if (isAbortLikeError(err)) {
    return {
      status: 504,
      body: {
        error: {
          message:
            'The operation was aborted (timeout or client cancel). ' +
            'Typical causes: thinking model filled max_tokens with reasoning_content only; ' +
            'client idle timeout; Core AbortSignal.timeout. ' +
            'Try larger max_tokens, restart chat with --reasoning-budget 512, EVOCODE_FOLD_REASONING=true.',
          type: 'aborted',
          name: 'AbortError',
        },
      },
    };
  }
  const code = (err as { code?: string })?.code;
  if (code === 'UNKNOWN_PROFILE') {
    return {
      status: 404,
      body: { error: { message: (err as Error).message, type: 'unknown_profile' } },
    };
  }
  if (code === 'BINARY_MISSING' || code === 'MODEL_MISSING') {
    return {
      status: 400,
      body: { error: { message: (err as Error).message, type: code.toLowerCase() } },
    };
  }
  return {
    status: 500,
    body: { error: { message: String((err as Error)?.message || err), type: 'internal' } },
  };
}

/** После start chat-профиля — синхронизировать InferenceEngine */
async function applyRuntimeToInference(profileId: string, online: boolean): Promise<void> {
  const p = runtimeManager.getProfile(profileId);
  if (!p) return;
  if (p.role === 'chat') {
    inferenceEngine.bindChatProfile(p, online);
    if (online) {
      await inferenceEngine.refreshLocalReady();
    }
  } else if (p.role === 'embed') {
    inferenceEngine.bindEmbedProfile(p);
  }
}

const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const isLocal =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost';

  if (isLocal) return true;

  const now = Date.now();
  const limit = rateLimits.get(ip);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (limit.count >= 100) {
    return false;
  }
  
  limit.count++;
  return true;
}

export function isAuthorized(
  remoteAddress: string | undefined,
  headers: http.IncomingHttpHeaders,
  authToken: string
): boolean {
  const ip = remoteAddress || '';
  const isLocal =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost';

  if (isLocal) return true;

  if (!authToken) return false;

  const authHeader = headers['authorization'] || '';
  const expected = `Bearer ${authToken}`;
  return authHeader === expected;
}

async function main(): Promise<void> {
  await initialize();

  const server = http.createServer(async (req, res) => {
    const remoteIp = req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(remoteIp)) {
      sendJson(res, 429, { error: { message: 'Too many requests, rate limit exceeded', type: 'rate_limit' } });
      return;
    }

    if (!isAuthorized(req.socket.remoteAddress, req.headers, defaultConfig.security.authToken)) {
      sendJson(res, 401, { error: { message: 'Unauthorized (invalid or missing token)', type: 'unauthorized' } });
      return;
    }

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const url = req.url?.split('?')[0] || '/';

    try {
      if (req.method === 'GET' && url === '/health') {
        // Keep health FAST — launchers poll this; never block on llama or full skill scan
        const fimStale = Date.now() - cachedFimReadyAt > 15_000;
        sendJson(res, 200, {
          status: 'ok',
          version: defaultConfig.appVersion,
          product: 'evocode-core',
          localReady: inferenceEngine.isLocalReady(),
          fimEnabled: inferenceEngine.isFimEnabled(),
          fimReady: cachedFimReady === true,
          fimReadyCached: cachedFimReady,
          fim: inferenceEngine.getFimInfo(),
          skills: skillLoader.skillCount(),
          runtime: inferenceEngine.getRuntimeInfo(),
        });
        // Soft refresh readiness in background (do not await)
        void inferenceEngine.refreshLocalReady().catch(() => undefined);
        if (fimStale || cachedFimReady === null) {
          void inferenceEngine
            .isFimReady()
            .then((ok) => {
              cachedFimReady = ok;
              cachedFimReadyAt = Date.now();
            })
            .catch(() => {
              cachedFimReady = false;
              cachedFimReadyAt = Date.now();
            });
        }
        return;
      }

      if (req.method === 'GET' && url === '/v1/hardware') {
        const report = await probeHardware();
        sendJson(res, 200, { ok: true, ...report });
        return;
      }

      // ─── P0 Runtime: модели / llama из UI ───────────────────────────
      if (req.method === 'GET' && (url === '/v1/runtime' || url === '/v1/runtime/status')) {
        await inferenceEngine.refreshLocalReady();
        const status = await runtimeManager.getStatus(inferenceEngine.isLocalReady());
        const fimReady = await inferenceEngine.isFimReady();
        sendJson(res, 200, {
          ...status,
          fim: {
            ...inferenceEngine.getFimInfo(),
            ready: fimReady,
          },
        });
        return;
      }

      if (req.method === 'GET' && url === '/v1/runtime/profiles') {
        const status = await runtimeManager.getStatus(inferenceEngine.isLocalReady());
        sendJson(res, 200, {
          profiles: status.profiles,
          forks: status.forks,
          modelsDir: status.modelsDir,
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/runtime/start') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const profileId = body.profile || body.profileId || body.id;
        if (!profileId || typeof profileId !== 'string') {
          sendJson(res, 400, {
            error: {
              message: 'Укажите profile (например coder, chat-buun, embed-nomic)',
              type: 'invalid_request',
            },
          });
          return;
        }
        const result = await runtimeManager.start(profileId, {
          force: !!body.force,
          waitSec: body.waitSec,
        });
        await applyRuntimeToInference(profileId, result.ok || result.profile.online);
        sendJson(res, result.ok ? 200 : 202, result);
        return;
      }

      if (req.method === 'POST' && url === '/v1/runtime/stop') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const profileId = body.profile || body.profileId || body.id;
        if (!profileId && !body.all) {
          sendJson(res, 400, {
            error: {
              message: 'Укажите profile или all:true',
              type: 'invalid_request',
            },
          });
          return;
        }
        const result = await runtimeManager.stop(
          body.all || profileId === 'all' ? undefined : String(profileId)
        );
        await inferenceEngine.refreshLocalReady();
        sendJson(res, 200, {
          ...result,
          localReady: inferenceEngine.isLocalReady(),
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/runtime/switch') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const profileId = body.profile || body.profileId || body.id;
        if (!profileId) {
          sendJson(res, 400, {
            error: { message: 'Укажите profile для переключения', type: 'invalid_request' },
          });
          return;
        }
        // stop same-role peers via start(force)
        const result = await runtimeManager.start(profileId, { force: true });
        await applyRuntimeToInference(profileId, result.ok || result.profile.online);
        sendJson(res, result.ok ? 200 : 202, { ...result, switched: true });
        return;
      }

      if (req.method === 'POST' && url === '/v1/skills/sync') {
        const result = await skillSyncEngine.sync();
        skillLoader.invalidate();
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && url === '/v1/skills/reindex') {
        const body = JSON.parse(await readBody(req) || '{}');
        let embedFn: ((t: string) => Promise<number[]>) | undefined;
        if (defaultConfig.skills.embedBackend === 'inference') {
          embedFn = async (t: string) => {
            try {
              return await inferenceEngine.getEmbeddings(t.slice(0, 2000));
            } catch {
              const { hashEmbed } = await import('./skills/skill-embeddings');
              return hashEmbed(t);
            }
          };
        }
        const result = await skillLoader.reindexAll({
          forceEmbed: !!body.forceEmbed,
          embedFn,
        });
        sendJson(res, 200, {
          ok: true,
          ...result,
          routerVersion: defaultConfig.skills.routerVersion,
          useEmbeddings: defaultConfig.skills.useEmbeddings,
          embedBackend: defaultConfig.skills.embedBackend,
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/skills/route') {
        const body = JSON.parse(await readBody(req) || '{}');
        const query = String(body.query || body.q || '');
        if (!query.trim()) {
          sendJson(res, 400, { error: { message: 'query обязателен', type: 'invalid_request' } });
          return;
        }
        let embedFn: ((t: string) => Promise<number[]>) | undefined;
        if (defaultConfig.skills.embedBackend === 'inference') {
          embedFn = async (t: string) => {
            try {
              return await inferenceEngine.getEmbeddings(t.slice(0, 2000));
            } catch {
              const { hashEmbed } = await import('./skills/skill-embeddings');
              return hashEmbed(t);
            }
          };
        }
        const route = await skillLoader.routeAsync(query, {
          mode: body.mode,
          explicitSkills: Array.isArray(body.explicitSkills) ? body.explicitSkills : undefined,
          maxSkills: body.maxSkills,
          embedFn,
        });
        sendJson(res, 200, {
          query,
          routerVersion: route.routerVersion,
          hybrid: defaultConfig.skills.useEmbeddings,
          embedBackend: defaultConfig.skills.embedBackend,
          injectChars: route.injectChars,
          selected: route.selected.map((s) => ({
            name: s.skill.name,
            score: Math.round(s.score * 100) / 100,
            reasons: s.reasons,
            tier: s.skill.tier,
            pack: s.skill.pack,
            domain: s.skill.domain,
            injectMode: s.skill.injectMode,
            chars: s.skill.chars,
            path: s.skill.path,
            persona: s.skill.persona,
          })),
          rejected: route.rejected.slice(0, 20),
          textPreview: route.text.slice(0, 500),
        });
        return;
      }

      if (req.method === 'GET' && url === '/v1/skills') {
        const { PACK_CATALOG } = await import('./skills/skill-index');
        const detailed = skillLoader.listDetailed(false);
        sendJson(res, 200, {
          routerVersion: defaultConfig.skills.routerVersion,
          count: detailed.length,
          packs: PACK_CATALOG,
          skillsConfig: {
            enableLab: defaultConfig.skills.enableLab,
            enabledPacks: defaultConfig.skills.enabledPacks,
            maxSkills: defaultConfig.skills.maxSkills,
            maxInjectChars: defaultConfig.skills.maxInjectChars,
            minScore: defaultConfig.skills.minScore,
            routerVersion: defaultConfig.skills.routerVersion,
          },
          skills: detailed.map((d) => ({
            name: d.name,
            path: d.path,
            source: d.source,
            description: (d.description || '').slice(0, 280),
            triggers: d.triggers.slice(0, 16),
            tier: d.tier,
            pack: d.pack,
            domain: d.domain,
            injectMode: d.injectMode,
            persona: d.persona,
            chars: d.chars,
            priority: d.priority,
          })),
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/skills/user') {
        const body = JSON.parse(await readBody(req) || '{}');
        const name = String(body.name || '').trim();
        const content = String(body.content || '');
        if (!name) {
          sendJson(res, 400, { error: { message: 'Имя навыка обязательно', type: 'invalid_request' } });
          return;
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
          sendJson(res, 400, { error: { message: 'Имя: только латиница, цифры, . _ -', type: 'invalid_request' } });
          return;
        }
        const fs = await import('fs');
        const pathModule = await import('path');
        const userSkillDir = pathModule.join(defaultConfig.skills.userPath, name);
        fs.mkdirSync(userSkillDir, { recursive: true });
        const skillFile = pathModule.join(userSkillDir, 'SKILL.md');

        let finalContent = content;
        if (!finalContent) {
          finalContent = [
            '---',
            `name: ${name}`,
            'version: "1.0.0"',
            'description: >',
            `  [RU] Пользовательский навык ${name}.`,
            `  [EN] User skill ${name}.`,
            'tier: optional',
            'domain: general',
            'pack: general',
            'lang: [ru, en]',
            'persona: false',
            'inject_mode: core_only',
            'triggers:',
            `  - ${name.replace(/-/g, ' ')}`,
            `  - ${name}`,
            '---',
            '',
            `# ${name}`,
            '',
            '## When to use',
            '',
            '- …',
            '',
            '## When NOT to use',
            '',
            '- …',
            '',
            '## Procedure',
            '',
            '1. …',
            '',
            '## Constraints',
            '',
            '- …',
            '',
            '## Verification',
            '',
            '- [ ] …',
            '',
          ].join('\n');
        }

        fs.writeFileSync(skillFile, finalContent, 'utf-8');
        skillLoader.invalidate();
        sendJson(res, 200, { success: true, path: pathModule.resolve(skillFile) });
        return;
      }

      if (req.method === 'DELETE' && url === '/v1/skills/user') {
        const body = JSON.parse(await readBody(req) || '{}');
        const name = String(body.name || '').trim();
        if (!name) {
          sendJson(res, 400, { error: { message: 'Имя навыка обязательно', type: 'invalid_request' } });
          return;
        }
        const fs = await import('fs');
        const pathModule = await import('path');
        const userSkillDir = pathModule.join(defaultConfig.skills.userPath, name);
        const skillFile = pathModule.join(userSkillDir, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          fs.unlinkSync(skillFile);
        }
        if (fs.existsSync(userSkillDir)) {
          try {
            const files = fs.readdirSync(userSkillDir);
            if (files.length === 0) {
              fs.rmdirSync(userSkillDir);
            }
          } catch {
            /* */
          }
        }
        skillLoader.invalidate();
        sendJson(res, 200, { success: true });
        return;
      }

      if (req.method === 'GET' && url === '/v1/config') {
        const { PACK_CATALOG } = await import('./skills/skill-index');
        sendJson(res, 200, {
          inference: {
            cloud: defaultConfig.inference.cloud,
          },
          router: {
            privacyMode: defaultConfig.router.privacyMode,
            localMaxTokens: defaultConfig.router.localMaxTokens,
            cloudMinTokens: defaultConfig.router.cloudMinTokens,
          },
          skills: {
            enableLab: defaultConfig.skills.enableLab,
            enabledPacks: defaultConfig.skills.enabledPacks,
            maxSkills: defaultConfig.skills.maxSkills,
            maxInjectChars: defaultConfig.skills.maxInjectChars,
            minScore: defaultConfig.skills.minScore,
            routerVersion: defaultConfig.skills.routerVersion,
            useEmbeddings: defaultConfig.skills.useEmbeddings,
            embedBackend: defaultConfig.skills.embedBackend,
            embedWeight: defaultConfig.skills.embedWeight,
            packsCatalog: PACK_CATALOG,
          },
          fim: {
            ...inferenceEngine.getFimInfo(),
            ready: await inferenceEngine.isFimReady(),
          },
        });
        return;
      }

      if (req.method === 'POST' && url === '/v1/config') {
        const body = JSON.parse(await readBody(req) || '{}');
        if (body.inference?.cloud) {
          Object.assign(defaultConfig.inference.cloud, body.inference.cloud);
        }
        if (body.router) {
          if (body.router.privacyMode !== undefined) {
            defaultConfig.router.privacyMode = body.router.privacyMode;
          }
          if (body.router.localMaxTokens !== undefined) {
            defaultConfig.router.localMaxTokens = Number(body.router.localMaxTokens);
          }
          if (body.router.cloudMinTokens !== undefined) {
            defaultConfig.router.cloudMinTokens = Number(body.router.cloudMinTokens);
          }
        }
        if (body.skills) {
          if (body.skills.enableLab !== undefined) {
            defaultConfig.skills.enableLab = !!body.skills.enableLab;
          }
          if (Array.isArray(body.skills.enabledPacks)) {
            defaultConfig.skills.enabledPacks = body.skills.enabledPacks.map(String);
          }
          if (body.skills.maxSkills !== undefined) {
            defaultConfig.skills.maxSkills = Math.max(1, Math.min(5, Number(body.skills.maxSkills) || 2));
          }
          if (body.skills.maxInjectChars !== undefined) {
            defaultConfig.skills.maxInjectChars = Math.max(2000, Number(body.skills.maxInjectChars) || 8000);
          }
          if (body.skills.minScore !== undefined) {
            defaultConfig.skills.minScore = Number(body.skills.minScore) || 15;
          }
          if (body.skills.routerVersion === 'v1' || body.skills.routerVersion === 'v2') {
            defaultConfig.skills.routerVersion = body.skills.routerVersion;
          }
          if (body.skills.useEmbeddings !== undefined) {
            defaultConfig.skills.useEmbeddings = !!body.skills.useEmbeddings;
          }
          if (body.skills.embedBackend === 'hash' || body.skills.embedBackend === 'inference') {
            defaultConfig.skills.embedBackend = body.skills.embedBackend;
          }
          if (body.skills.embedWeight !== undefined) {
            defaultConfig.skills.embedWeight = Number(body.skills.embedWeight) || 40;
          }
          skillLoader.applyConfig(defaultConfig);
        }
        if (body.fim) {
          if (body.fim.enabled !== undefined) {
            defaultConfig.inference.fim.enabled = !!body.fim.enabled;
          }
          if (body.fim.port !== undefined) {
            defaultConfig.inference.fim.port = Number(body.fim.port) || 8082;
          }
          if (body.fim.modelId) {
            defaultConfig.inference.fim.modelId = String(body.fim.modelId);
          }
          if (body.fim.profileId) {
            defaultConfig.inference.fim.profileId = String(body.fim.profileId);
          }
          // InferenceEngine holds its own config snapshot
          Object.assign(inferenceEngine.getConfig().inference.fim, defaultConfig.inference.fim);
        }
        saveConfig(defaultConfig);
        sendJson(res, 200, { success: true, skills: {
          enableLab: defaultConfig.skills.enableLab,
          enabledPacks: defaultConfig.skills.enabledPacks,
          maxSkills: defaultConfig.skills.maxSkills,
          routerVersion: defaultConfig.skills.routerVersion,
        }});
        return;
      }

      if (req.method === 'POST' && url === '/v1/models/fetch') {
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const { provider, apiKey, baseUrl, proxyUrl } = body;
          
          if (!apiKey && provider !== 'openaicompatible') {
            sendJson(res, 400, { error: { message: 'API key is required' } });
            return;
          }

          let fetchedModels: string[] = [];

          if (provider === 'openrouter') {
            const targetUrl = 'https://openrouter.ai/api/v1/models';
            const fetchOptions: any = {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            };
            const proxy = proxyUrl || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
            if (proxy) {
              fetchOptions.dispatcher = new ProxyAgent(proxy);
            }
            const r = await fetch(targetUrl, fetchOptions);
            if (r.ok) {
              const resData = await r.json() as any;
              if (Array.isArray(resData.data)) {
                fetchedModels = resData.data.map((m: any) => m.id);
              }
            } else {
              throw new Error(`OpenRouter returned status ${r.status}`);
            }
          } else if (provider === 'openai') {
            const targetUrl = `${baseUrl || 'https://api.openai.com/v1'}/models`;
            const fetchOptions: any = {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            };
            const proxy = proxyUrl || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
            if (proxy) {
              fetchOptions.dispatcher = new ProxyAgent(proxy);
            }
            const r = await fetch(targetUrl, fetchOptions);
            if (r.ok) {
              const resData = await r.json() as any;
              if (Array.isArray(resData.data)) {
                fetchedModels = resData.data.map((m: any) => m.id);
              }
            } else {
              throw new Error(`OpenAI returned status ${r.status}`);
            }
          } else if (provider === 'gemini') {
            const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const fetchOptions: any = {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            };
            const proxy = proxyUrl || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
            if (proxy) {
              fetchOptions.dispatcher = new ProxyAgent(proxy);
            }
            const r = await fetch(targetUrl, fetchOptions);
            if (r.ok) {
              const resData = await r.json() as any;
              if (Array.isArray(resData.models)) {
                fetchedModels = resData.models
                  .map((m: any) => m.name.replace(/^models\//, ''))
                  .filter((name: string) => name.startsWith('gemini'));
              }
            } else {
              throw new Error(`Gemini API returned status ${r.status}`);
            }
          } else if (provider === 'anthropic') {
            fetchedModels = [
              'claude-3-5-sonnet-latest',
              'claude-3-5-haiku-latest',
              'claude-3-opus-latest',
              'claude-3-5-sonnet-20241022',
              'claude-3-5-haiku-20241022',
              'claude-3-opus-20240229'
            ];
          } else if (provider === 'openaicompatible') {
            const targetUrl = `${baseUrl || 'http://127.0.0.1:8000/v1'}/models`;
            const fetchOptions: any = {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              } as any,
              signal: AbortSignal.timeout(10000),
            };
            if (apiKey) {
              fetchOptions.headers['Authorization'] = `Bearer ${apiKey}`;
            }
            const proxy = proxyUrl || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
            if (proxy) {
              fetchOptions.dispatcher = new ProxyAgent(proxy);
            }
            const r = await fetch(targetUrl, fetchOptions);
            if (r.ok) {
              const resData = await r.json() as any;
              if (Array.isArray(resData.data)) {
                fetchedModels = resData.data.map((m: any) => m.id);
              }
            } else {
              throw new Error(`Custom provider returned status ${r.status}`);
            }
          } else {
            throw new Error(`Unsupported provider: ${provider}`);
          }

          sendJson(res, 200, { success: true, models: fetchedModels });
        } catch (err) {
          sendJson(res, 500, { error: { message: (err as Error).message } });
        }
        return;
      }

      if (req.method === 'GET' && (url === '/v1/models' || url === '/models')) {
        const models: Array<Record<string, unknown>> = [
          { id: 'evocode-local', object: 'model', owned_by: 'evocode', purpose: 'chat' },
          { id: 'evocode-auto', object: 'model', owned_by: 'evocode', purpose: 'chat' },
          {
            id: defaultConfig.inference.local.model,
            object: 'model',
            owned_by: 'evocode-local',
            purpose: 'chat',
          },
        ];
        if (defaultConfig.inference.fim.enabled) {
          const fid = defaultConfig.inference.fim.modelId || 'evocode-fim';
          models.push(
            {
              id: fid,
              object: 'model',
              owned_by: 'evocode-fim',
              purpose: 'fim',
              description: 'Лёгкая FIM/autocomplete (Neurocontrol ~2G)',
            },
            {
              id: 'evocode-autocomplete',
              object: 'model',
              owned_by: 'evocode-fim',
              purpose: 'fim',
            },
            {
              id: 'fim-small',
              object: 'model',
              owned_by: 'evocode-fim',
              purpose: 'fim',
            }
          );
        }
        sendJson(res, 200, { object: 'list', data: models });
        return;
      }

      // OpenAI Completions — autocomplete / FIM → лёгкая модель :8082
      if (req.method === 'POST' && (url === '/v1/completions' || url === '/v1/fim')) {
        const body = JSON.parse(await readBody(req) || '{}');
        const prompt = contentToText(
          body.prompt != null
            ? body.suffix
              ? `${body.prompt}${body.suffix}`
              : body.prompt
            : body.input || ''
        );
        if (!prompt) {
          sendJson(res, 400, { error: { message: 'prompt required', type: 'invalid_request' } });
          return;
        }
        if (!defaultConfig.inference.fim.enabled) {
          sendJson(res, 503, {
            error: {
              message: 'FIM отключён. Включите LLAMA_FIM_ENABLED=true или inference.fim.enabled',
              type: 'fim_disabled',
            },
          });
          return;
        }
        try {
          const result = await inferenceEngine.fim({
            prompt,
            maxTokens: body.max_tokens || body.n_predict || 128,
            temperature: body.temperature ?? 0.1,
            model: body.model,
          });
          sendJson(res, 200, {
            id: `cmpl-evocode-${Date.now()}`,
            object: 'text_completion',
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [
              {
                index: 0,
                text: result.text,
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: result.usage.promptTokens,
              completion_tokens: result.usage.completionTokens,
              total_tokens: result.usage.totalTokens,
            },
            evocode: {
              source: result.source,
              latency: result.latency,
              purpose: 'fim',
              port: defaultConfig.inference.fim.port,
            },
          });
        } catch (e) {
          const err = e as Error & { code?: string };
          sendJson(res, 503, {
            error: {
              message: err.message,
              type: err.code || 'local_unavailable',
            },
          });
        }
        return;
      }

      if (req.method === 'POST' && url === '/chat') {
        const body = JSON.parse(await readBody(req));
        const query = contentToText(body.query || body.message || body.prompt);
        if (!query) {
          sendJson(res, 400, { error: 'No query provided' });
          return;
        }
        const result = await handleRequest(query);
        sendJson(res, 200, {
          ...result,
          answer: `🤖 Эвокод (${result.source}/${result.route}): ${result.answer}`,
        });
        return;
      }

      // OpenAI-compatible — точка входа для fork kilo-vscode / любых SDK
      if (req.method === 'POST' && url === '/v1/chat/completions') {
        const body = JSON.parse(await readBody(req));
        const messages: { role: string; content: unknown }[] = body.messages || [];
        const userRaw = [...messages].reverse().find((m) => m.role === 'user')?.content;
        const userText = contentToText(userRaw);
        if (!userText) {
          sendJson(res, 400, {
            error: { message: 'messages must include a user turn', type: 'invalid_request' },
          });
          return;
        }

        const systemFromClient = messages
          .filter((m) => m.role === 'system')
          .map((m) => contentToText(m.content))
          .join('\n');

        const skillInj = await skillLoader.buildInjectionAsync(userText);
        let ragContext = '';
        
        const uaRaw = req.headers['user-agent'] || '';
        const userAgent = (Array.isArray(uaRaw) ? uaRaw.join(' ') : uaRaw).toLowerCase();
        const clientRaw = req.headers['x-client'] || req.headers['x-title'] || '';
        const clientHeader = (Array.isArray(clientRaw) ? clientRaw.join(' ') : clientRaw).toLowerCase();
        const isAgent =
          userAgent.includes('kilo') ||
          userAgent.includes('evocode') ||
          clientHeader.includes('kilo') ||
          clientHeader.includes('evocode');
          
        const skipCoreRag = defaultConfig.router.preferKiloIndexing && isAgent;

        if (!skipCoreRag) {
          try {
            const emb = await inferenceEngine.getEmbeddings(userText.slice(0, 2000));
            const chunks = vectorIndex.search(emb, 3);
            if (chunks.length) {
              ragContext = chunks.map((c) => `[${c.filePath}]\n${c.content}`).join('\n\n');
            }
          } catch {
            /* optional */
          }
        }

        const artifactInstructions = `
[СИСТЕМНОЕ РУКОВОДСТВО: ВРЕМЕННЫЕ АРТЕФАКТЫ]
Если оператор запрашивает отчет, документ, аналитическую записку, презентацию, документацию, или готовую HTML/Markdown страницу, вы должны вынести её в отдельный временный артефакт.
Оберните этот контент в XML-тег:
<artifact title="Название_файла.md">
содержимое в формате Markdown...
</artifact>
или для HTML:
<artifact title="Название_файла.html">
содержимое в формате HTML...
</artifact>

Важные правила:
1. В атрибуте 'title' обязательно должно быть расширение (.md или .html).
2. Сам ответ в чате оставляйте кратким и резюмирующим (1-3 абзаца). Не дублируйте весь текст артефакта в чат. Напишите, что подробный документ открыт на панели справа.
3. Артефакт будет автоматически сохранен во временной папке и выведен справа на предпросмотр в красивом отрендеренном виде без исходного кода.

[ОФОРМЛЕНИЕ ОТВЕТА]
Критически важно: НИКОГДА не выводите технические заголовки или маркеры вроде "[PLAN]" или "[EXECUTE]" в чат. Пишите ваши мысли и действия простым, естественным языком на русском.
`;

        const systemPrompt = [systemFromClient, skillInj.text, ragContext, artifactInstructions]
          .filter(Boolean)
          .join('\n\n');

        // Normalize message content to strings for local inference / router
        const updatedMessages = messages.map((m) => ({
          role: m.role,
          content: contentToText(m.content),
        }));
        const sysIndex = updatedMessages.findIndex((m) => m.role === 'system');
        if (sysIndex !== -1) {
          updatedMessages[sysIndex] = { role: 'system', content: systemPrompt };
        } else if (systemPrompt) {
          updatedMessages.unshift({ role: 'system', content: systemPrompt });
        }

        // Автоматическое уплотнение/компакт сессии при превышении лимита токенов (~250k токенов)
        const compactedMessages = compactHistory(updatedMessages, 250000);
        // Гарантируем чередование ролей (user/assistant) и то, что первый не-system месседж — это 'user'
        const finalMessages = ensureRoleAlternation(compactedMessages);

        // Решение о маршрутизации
        const context = smartRouter.analyzeTask({
          prompt: userText,
          systemPrompt,
          maxTokens: body.max_tokens,
          temperature: body.temperature,
        });

        let { decision, reason } = await smartRouter.route(context);
        // Hard safety: never hit cloud without a real key (OpenRouter 401 Missing Authentication header)
        if (decision === 'cloud' && !defaultConfig.inference.cloud.apiKey) {
          decision = 'local';
          reason = `${reason}; forced local (no OPENROUTER_API_KEY)`;
        }
        console.log(`Маршрутизация: ${decision} (${reason})`);

        let targetUrl = '';
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        let requestBody: Record<string, unknown> = { ...body, messages: finalMessages };

        if (decision === 'local') {
          const port = defaultConfig.inference.local.port;
          targetUrl = `http://127.0.0.1:${port}/v1/chat/completions`;
          
          let modelToUse = body.model;
          const isVirtual = !modelToUse || modelToUse.startsWith('evocode');
          if (isVirtual) {
            modelToUse = defaultConfig.inference.local.model;
          }
          requestBody = { ...body, model: modelToUse, messages: finalMessages };
        } else {
          // DLP is mandatory on every cloud egress (mask + blockOnCritical)
          if (!defaultConfig.dlp.enabled) {
            sendJson(res, 403, {
              error: {
                message:
                  'Cloud route requires DLP (EVOCODE_DLP_ENABLED). Refusing to send unfiltered data.',
                type: 'dlp_required',
              },
            });
            return;
          }
          const { dlpGuard } = await import('./guard/dlp-guard');
          const dlpResult = await dlpGuard.processRequest({
            prompt: userText,
            systemPrompt,
            messages: finalMessages,
          });

          if (dlpResult.blocked) {
            const { DLPBlockedError } = await import('./guard/dlp-guard');
            throw new DLPBlockedError(
              'Облачный запрос заблокирован DLP Guard: обнаружены критичные секреты',
              dlpResult.changes
            );
          }

          // Only masked messages leave Core toward cloud providers
          const maskedMessages = dlpResult.messages || [];

          const cloud = defaultConfig.inference.cloud;
          const isAnthropic = cloud.provider === 'anthropic' || cloud.baseUrl.includes('api.anthropic.com');
          const isGemini = cloud.provider === 'gemini' || cloud.baseUrl.includes('googleapis.com');

          // Определяем целевую модель
          let modelToUse = body.model;
          const isVirtual = !modelToUse || modelToUse.startsWith('evocode');
          if (isVirtual) {
            modelToUse = cloud.model;
          }

          // Умный роутер для бесплатных моделей OpenRouter
          if (modelToUse === 'openrouter-auto') {
            modelToUse = 'openrouter/free';
          }

          if (isAnthropic) {
            targetUrl = `${cloud.baseUrl}/messages`;
            headers['x-api-key'] = cloud.apiKey;
            headers['anthropic-version'] = '2023-06-01';

            const systemMsg = maskedMessages.find(m => m.role === 'system')?.content || '';
            const userMsgs = maskedMessages
              .filter(m => m.role !== 'system')
              .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
              }));

            requestBody = {
              model: modelToUse || 'claude-3-5-sonnet-20241022',
              messages: userMsgs,
              system: systemMsg || undefined,
              max_tokens: body.max_tokens || 4096,
              temperature: body.temperature ?? 0.7,
              stream: body.stream || false
            };
          } else {
            let actualBaseUrl = cloud.baseUrl;
            if (actualBaseUrl.endsWith('/')) {
              actualBaseUrl = actualBaseUrl.slice(0, -1);
            }
            targetUrl = `${actualBaseUrl}/chat/completions`;
            if (isGemini && !actualBaseUrl.includes('key=')) {
              targetUrl += `?key=${cloud.apiKey}`;
            } else {
              headers['Authorization'] = `Bearer ${cloud.apiKey}`;
            }

            if (cloud.provider === 'openrouter' || actualBaseUrl.includes('openrouter.ai')) {
              headers['HTTP-Referer'] = 'https://github.com/evocode/evocode';
              headers['X-Title'] = 'Evocode';
            }

            requestBody = { ...body, model: modelToUse, messages: maskedMessages };
          }
        }

        const startTime = Date.now();
        const doFetch = async (url: string, hdrs: Record<string, string>, bodyObj: unknown) => {
          const fetchOptions: any = {
            method: 'POST',
            headers: hdrs,
            body: JSON.stringify(bodyObj),
            signal: AbortSignal.timeout(defaultConfig.inference.local.timeout * 1000),
          };
          const proxyUrl =
            defaultConfig.inference.cloud.proxyUrl ||
            process.env.HTTP_PROXY ||
            process.env.HTTPS_PROXY;
          if (proxyUrl && decision === 'cloud') {
            fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
          }
          return fetch(url, fetchOptions);
        };

        let response = await doFetch(targetUrl, headers, requestBody);

        // Cloud failure (any status >= 400, e.g. 401, 402, 403, 404, 5xx) → retry local once
        if (
          !response.ok &&
          decision === 'cloud'
        ) {
          console.warn(`Cloud request failed (status ${response.status}) → falling back to local`);
          decision = 'local';
          reason = `${reason}; fallback local after cloud error ${response.status}`;
          const port = defaultConfig.inference.local.port;
          targetUrl = `http://127.0.0.1:${port}/v1/chat/completions`;
          headers = { 'Content-Type': 'application/json' };
          
          let fallbackModel = body.model;
          if (!fallbackModel || fallbackModel.startsWith('evocode')) {
            fallbackModel = defaultConfig.inference.local.model;
          }
          requestBody = { ...body, messages: finalMessages, model: fallbackModel };
          response = await doFetch(targetUrl, headers, requestBody);
        }

        if (!response.ok) {
          const errText = await response.text();
          sendJson(res, response.status >= 400 && response.status < 600 ? response.status : 502, {
            error: { message: `Inference failed: ${errText}`, type: 'inference_failed' },
          });
          return;
        }

        const latency = Date.now() - startTime;

        // Добавляем заголовки Evocode
        res.setHeader('X-Evocode-Route', decision);
        res.setHeader('X-Evocode-Source', decision);
        res.setHeader('X-Evocode-Latency', String(latency));

        let fullContent = '';

        if (body.stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          });

          if (response.body) {
            let buffer = '';
            const decoder = new TextDecoder();
            
            const cloud = defaultConfig.inference.cloud;
            const isAnthropic = cloud.provider === 'anthropic' || cloud.baseUrl.includes('api.anthropic.com');

            if (decision === 'cloud' && isAnthropic) {
              for await (const byteChunk of response.body as any) {
                buffer += decoder.decode(byteChunk, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  if (trimmed.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(trimmed.slice(6));
                      if (data.type === 'content_block_delta' && data.delta?.text) {
                        fullContent += data.delta.text;
                        const openaiChunk = {
                          id: 'chatcmpl-anthropic',
                          object: 'chat.completion.chunk',
                          created: Math.floor(Date.now() / 1000),
                          model: body.model || cloud.model,
                          choices: [
                            {
                              index: 0,
                              delta: {
                                content: data.delta.text
                              },
                              finish_reason: null
                            }
                          ]
                        };
                        res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);
                      } else if (data.type === 'message_stop') {
                        res.write('data: [DONE]\n\n');
                      }
                    } catch {
                      /* */
                    }
                  }
                }
              }
              res.end();
              processArtifacts(fullContent);
              return;
            }

            // Читаем поток из fetch
            for await (const byteChunk of response.body as any) {
              buffer += decoder.decode(byteChunk, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed === 'data: [DONE]') {
                  res.write('data: [DONE]\n\n');
                  continue;
                }
                if (trimmed.startsWith('data: ')) {
                  try {
                    const jsonText = trimmed.slice(6);
                    const data = JSON.parse(jsonText);
                    
                    if (data.choices) {
                      for (const choice of data.choices) {
                        if (choice.delta) {
                          // Thinking models (ornith etc.): only reasoning_content → agent aborts on empty content
                          choice.delta = foldReasoningDelta(choice.delta);
                        }
                        if (choice.delta && choice.delta.content) {
                          fullContent += choice.delta.content;
                        }
                        if (choice.delta && choice.delta.tool_calls) {
                          for (const tc of choice.delta.tool_calls) {
                            if (!tc.id) {
                              tc.id = `call_${Math.random().toString(36).substring(2, 12)}`;
                            }
                            if (!tc.type) {
                              tc.type = 'function';
                            }
                          }
                        }
                      }
                    }
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                  } catch (err) {
                    res.write(`${line}\n`);
                  }
                } else {
                  res.write(`${line}\n`);
                }
              }
            }
          }
          res.end();
          processArtifacts(fullContent);
          return;
        } else {
          // Не-стриминговый ответ
          let data = (await response.json()) as any;
          
          const cloud = defaultConfig.inference.cloud;
          const isAnthropic = cloud.provider === 'anthropic' || cloud.baseUrl.includes('api.anthropic.com');

          if (decision === 'cloud' && isAnthropic) {
            data = {
              id: data.id || 'msg-anthropic',
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: data.model || body.model || cloud.model,
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: data.content?.[0]?.text || ''
                  },
                  finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason
                }
              ],
              usage: {
                prompt_tokens: data.usage?.input_tokens || 0,
                completion_tokens: data.usage?.output_tokens || 0,
                total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
              }
            };
          }
          
          // Корректируем tool_calls + fold empty content from reasoning_content
          if (data.choices) {
            for (const choice of data.choices) {
              if (choice.message) {
                choice.message = foldReasoningMessage(choice.message);
              }
              if (choice.message && choice.message.tool_calls) {
                for (const tc of choice.message.tool_calls) {
                  if (!tc.id) {
                    tc.id = `call_${Math.random().toString(36).substring(2, 12)}`;
                  }
                  if (!tc.type) {
                    tc.type = 'function';
                  }
                }
              }
            }
          }

          // Добавляем метаданные Evocode
          data.evocode = {
            route: decision,
            reason,
            source: decision,
            skills: skillInj.skills.map((s) => s.name),
            latency,
            foldReasoning: true,
          };

          if (data.choices && data.choices[0]?.message) {
            fullContent = data.choices[0].message.content || '';
          }

          sendJson(res, 200, data);
          processArtifacts(fullContent);
          return;
        }
      }

      if (req.method === 'POST' && url === '/index-file') {
        const body = JSON.parse(await readBody(req));
        const { filePath, content } = body;
        if (!filePath || !content) {
          sendJson(res, 400, { error: 'Missing filePath or content' });
          return;
        }
        const embedding = await inferenceEngine.getEmbeddings(
          String(content).substring(0, 1000)
        );
        const id = vectorIndex.insertChunk(filePath, content, embedding);
        sendJson(res, 200, { success: true, id });
        return;
      }

      if (req.method === 'POST' && url === '/v1/embeddings') {
        const body = JSON.parse(await readBody(req));
        const input = body.input;
        const texts = Array.isArray(input) ? input : [input];
        const data = [];
        for (let i = 0; i < texts.length; i++) {
          const emb = await inferenceEngine.getEmbeddings(String(texts[i]).slice(0, 8000));
          data.push({ object: 'embedding', index: i, embedding: emb });
        }
        sendJson(res, 200, { object: 'list', data, model: body.model || 'evocode-embed' });
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (error) {
      const mapped = mapError(error);
      sendJson(res, mapped.status, mapped.body);
    }
  });

  // 8083 — не конфликтует с chat:8080 и legacy embed:8081
  const PORT = Number(process.env.PORT || 8083);
  const HOST = process.env.EVOCODE_HOST || '127.0.0.1';
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Evocode Core http://${HOST}:${PORT}`);
    console.log(`   OpenAI-compat: POST http://${HOST}:${PORT}/v1/chat/completions`);
    if (defaultConfig.inference.fim.enabled) {
      console.log(
        `   FIM/autocomplete: POST http://${HOST}:${PORT}/v1/completions → :${defaultConfig.inference.fim.port} (${defaultConfig.inference.fim.modelId})`
      );
    }
    console.log(`   Health:        GET  http://${HOST}:${PORT}/health`);
    console.log(`   Runtime API:   GET  /v1/runtime  POST /v1/runtime/start|stop|switch`);
    console.log(`   Runtime:       ${JSON.stringify(inferenceEngine.getRuntimeInfo())}`);
    // Background — never block listen/health
    void warmSkillEmbeddings();
  });
}

function processArtifacts(fullText: string) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const regex = /<artifact\s+title=["']([^"']+)["']\s*>([^]*?)<\/artifact>/gi;
  let match;
  const artifactDir = path.join(os.homedir(), '.config', 'evocode', 'artifacts');
  
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  while ((match = regex.exec(fullText)) !== null) {
    const originalTitle = match[1];
    const content = match[2];
    
    const safeTitle = originalTitle
      .replace(/[^a-zA-Z0-9А-Яа-яЁё._-]/g, '_')
      .replace(/_+/g, '_');
      
    const filePath = path.join(artifactDir, safeTitle);
    try {
      fs.writeFileSync(filePath, content.trim(), 'utf-8');
      console.log(`[Artifact] Created artifact file: ${filePath}`);
    } catch (e: any) {
      console.error(`[Artifact] Failed to write artifact file: ${e.message}`);
    }
  }
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 2);
}

function compactHistory(messages: any[], maxTokens: number = 250000): any[] {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');
  
  if (nonSystemMessages.length <= 1) {
    return messages;
  }
  
  const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
  const historyToPrune = nonSystemMessages.slice(0, nonSystemMessages.length - 1);
  
  const systemTokens = systemMessages.reduce((sum, m) => sum + estimateTokens(contentToText(m.content)), 0);
  const lastMessageTokens = estimateTokens(contentToText(lastMessage.content));
  
  let currentTokens = systemTokens + lastMessageTokens;
  if (currentTokens >= maxTokens) {
    return [...systemMessages, lastMessage];
  }
  
  const keptHistory: any[] = [];
  for (let i = historyToPrune.length - 1; i >= 0; i--) {
    const msg = historyToPrune[i];
    const msgTokens = estimateTokens(contentToText(msg.content));
    if (currentTokens + msgTokens > maxTokens) {
      console.warn(`[Core Router] Pruned conversation history: context limit reached (${currentTokens} tokens)`);
      break;
    }
    currentTokens += msgTokens;
    keptHistory.unshift(msg);
  }
  
  return [...systemMessages, ...keptHistory, lastMessage];
}

function ensureRoleAlternation(messages: any[]): any[] {
  const system = messages.filter((m) => m.role === 'system');
  const others = messages.filter((m) => m.role !== 'system');
  
  if (others.length === 0) return system;
  
  const temp: any[] = [];
  let currentExpectedRole = others[others.length - 1].role;
  
  for (let i = others.length - 1; i >= 0; i--) {
    const msg = others[i];
    if (msg.role === currentExpectedRole) {
      temp.unshift(msg);
      currentExpectedRole = currentExpectedRole === 'user' ? 'assistant' : 'user';
    } else {
      console.warn(`[Core Router] Propagating role check: skipping message with role ${msg.role}`);
    }
  }
  
  while (temp.length > 0 && temp[0].role !== 'user') {
    temp.shift();
  }
  
  return [...system, ...temp];
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { initialize, inferenceEngine, runtimeManager, smartRouter, skillLoader, ensureRoleAlternation, compactHistory };
