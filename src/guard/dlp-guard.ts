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

        if (masked.includes(match[0])) {
          let count = 0;
          while (masked.includes(match[0])) {
            masked = masked.replace(match[0], maskedValue);
            count++;
          }
          for (let i = 0; i < count; i++) {
            changes.push({
              rule: rule.name,
              original: originalValue.length > 24
                ? originalValue.slice(0, 8) + '…'
                : originalValue,
              masked: maskedValue,
              position: match.index ?? -1,
              critical: !!rule.critical,
            });
          }
        }
      }
    }

    const hasCritical = changes.some((c) => c.critical);
    const blocked = !!(this.config.blockOnCritical && hasCritical);

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
    messages?: { role: string; content: string }[];
  }): Promise<{
    prompt: string;
    systemPrompt?: string;
    messages?: { role: string; content: string }[];
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

    let messages = request.messages;
    let messagesChanges: DLPChange[] = [];
    let messagesBlocked = false;

    if (messages) {
      const maskedMsgs = [];
      for (const m of messages) {
        if (typeof m.content === 'string') {
          const res = await this.mask(m.content);
          if (res.blocked) messagesBlocked = true;
          messagesChanges.push(...res.changes);
          maskedMsgs.push({ ...m, content: res.masked });
        } else if (Array.isArray(m.content)) {
          // multimodal / content parts — mask string parts only
          const parts = [];
          for (const part of m.content as unknown[]) {
            if (part && typeof part === 'object' && typeof (part as any).text === 'string') {
              const res = await this.mask((part as any).text);
              if (res.blocked) messagesBlocked = true;
              messagesChanges.push(...res.changes);
              parts.push({ ...(part as object), text: res.masked });
            } else if (typeof part === 'string') {
              const res = await this.mask(part);
              if (res.blocked) messagesBlocked = true;
              messagesChanges.push(...res.changes);
              parts.push(res.masked);
            } else {
              parts.push(part);
            }
          }
          maskedMsgs.push({ ...m, content: parts as any });
        } else if (m.content != null) {
          // unknown shape — stringify + mask rather than forward raw
          const res = await this.mask(String(m.content));
          if (res.blocked) messagesBlocked = true;
          messagesChanges.push(...res.changes);
          maskedMsgs.push({ ...m, content: res.masked });
        } else {
          maskedMsgs.push(m);
        }
      }
      messages = maskedMsgs;
    }

    const totalBlocked = promptResult.blocked || systemBlocked || messagesBlocked;
    const allChanges = [...promptResult.changes, ...systemChanges, ...messagesChanges];
    const totalWasMasked = promptResult.wasMasked || systemChanges.length > 0 || messagesChanges.length > 0;

    this.logAudit({
      blocked: totalBlocked,
      wasMasked: totalWasMasked,
      changes: allChanges,
    });

    return {
      prompt: promptResult.masked,
      systemPrompt,
      messages,
      changes: allChanges,
      blocked: totalBlocked,
    };
  }

  private logAudit(result: { blocked: boolean; wasMasked: boolean; changes: DLPChange[] }): void {
    try {
      const root = process.env.EVOCODE_ROOT || path.resolve(__dirname, '../../');
      const auditDir = path.join(root, '.evocode');
      fs.mkdirSync(auditDir, { recursive: true, mode: 0o700 });
      const auditPath = path.join(auditDir, 'audit.log');
      if (!fs.existsSync(auditPath)) {
        fs.writeFileSync(auditPath, '', { mode: 0o600 });
      }
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'cloud_request',
        blocked: result.blocked,
        wasMasked: result.wasMasked,
        changesCount: result.changes.length,
        rulesMatched: result.changes.map(c => c.rule),
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
