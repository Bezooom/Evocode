// DLP Guard — маскировка секретов перед cloud (не для local path)
import { defaultConfig, DLPRule, EvocodeConfig } from '../core/config';
import * as fs from 'fs';
import * as path from 'path';

export interface DLPConfig {
  enabled: boolean;
  blockOnCritical: boolean;
  rules: DLPRule[];
}

export interface DLPChange {
  rule: string;
  original: string;
  masked: string;
  position: number;
  critical: boolean;
}

export interface DLPResult {
  original: string;
  masked: string;
  changes: DLPChange[];
  wasMasked: boolean;
  blocked: boolean;
}

export class DLPBlockedError extends Error {
  constructor(
    message: string,
    public readonly changes: DLPChange[]
  ) {
    super(message);
    this.name = 'DLPBlockedError';
  }
}

export class DLPGuard {
  private config: DLPConfig;

  constructor(config?: Partial<DLPConfig>) {
    this.config = {
      enabled: true,
      blockOnCritical: defaultConfig.dlp.blockOnCritical,
      rules: defaultConfig.dlp.rules,
      ...config,
    };
  }

  async mask(text: string): Promise<DLPResult> {
    if (!this.config.enabled) {
      return {
        original: text,
        masked: text,
        changes: [],
        wasMasked: false,
        blocked: false,
      };
    }

    let masked = text;
    const changes: DLPChange[] = [];

    for (const rule of this.config.rules) {
      const flags = rule.pattern.flags.includes('g')
        ? rule.pattern.flags
        : rule.pattern.flags + 'g';
      const regex = new RegExp(rule.pattern.source, flags);
      const matches = [...text.matchAll(regex)];

      for (const match of matches) {
        const originalValue = match[1] || match[0];
        const maskedValue = rule.replacement;
        // replace only first occurrence of this exact match in current masked text
        const idx = masked.indexOf(match[0]);
        if (idx === -1) continue;
        masked =
          masked.slice(0, idx) + maskedValue + masked.slice(idx + match[0].length);

        changes.push({
          rule: rule.name,
          original: originalValue.length > 24
            ? originalValue.slice(0, 8) + '…'
            : originalValue,
          masked: maskedValue,
          position: idx,
          critical: !!rule.critical,
        });
      }
    }

    const hasCritical = changes.some((c) => c.critical);
    const blocked = this.config.blockOnCritical && hasCritical && changes.length >= 3;

    return {
      original: text,
      masked,
      changes,
      wasMasked: masked !== text,
      blocked,
    };
  }

  async processRequest(request: {
    prompt: string;
    systemPrompt?: string;
  }): Promise<{
    prompt: string;
    systemPrompt?: string;
    changes: DLPChange[];
    blocked: boolean;
  }> {
    const promptResult = await this.mask(request.prompt);
    let systemPrompt = request.systemPrompt;
    let systemChanges: DLPChange[] = [];
    let systemBlocked = false;

    if (systemPrompt) {
      const systemResult = await this.mask(systemPrompt);
      systemPrompt = systemResult.masked;
      systemChanges = systemResult.changes;
      systemBlocked = systemResult.blocked;
    }

    this.logAudit(promptResult, systemBlocked);

    return {
      prompt: promptResult.masked,
      systemPrompt,
      changes: [...promptResult.changes, ...systemChanges],
      blocked: promptResult.blocked || systemBlocked,
    };
  }

  private logAudit(promptResult: DLPResult, systemBlocked: boolean): void {
    try {
      const root = process.env.EVOCODE_ROOT || path.resolve(__dirname, '../../');
      const auditDir = path.join(root, '.evocode');
      fs.mkdirSync(auditDir, { recursive: true });
      const auditPath = path.join(auditDir, 'audit.log');
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'cloud_request',
        blocked: promptResult.blocked || systemBlocked,
        wasMasked: promptResult.wasMasked,
        changesCount: promptResult.changes.length,
        rulesMatched: promptResult.changes.map(c => c.rule),
      };
      
      fs.appendFileSync(auditPath, JSON.stringify(logEntry) + '\n', 'utf-8');
    } catch (err) {
      console.error('DLP Guard audit log error:', (err as Error).message);
    }
  }

  getReport(result: DLPResult): string {
    if (!result.wasMasked) {
      return 'Данные не требуют маскировки.';
    }
    const lines = [`DLP Guard применил ${result.changes.length} изменений:`, ''];
    for (const change of result.changes) {
      lines.push(
        `  • ${change.rule}${change.critical ? ' [critical]' : ''}: → ${change.masked}`
      );
    }
    if (result.blocked) {
      lines.push('', '⛔ Отправка в облако заблокирована.');
    }
    return lines.join('\n');
  }
}

export const dlpGuard = new DLPGuard({
  enabled: true,
  blockOnCritical: defaultConfig.dlp.blockOnCritical,
  rules: defaultConfig.dlp.rules,
});
