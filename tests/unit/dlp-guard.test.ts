// Тесты для DLP Guard
import { DLPGuard } from '../../src/guard/dlp-guard';

describe('DLPGuard', () => {
  let guard: DLPGuard;

  beforeEach(() => {
    guard = new DLPGuard({
      enabled: true,
      blockOnCritical: false,
      rules: [
        {
          name: 'api-key',
          pattern: /api[_-]?key[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
          replacement: 'api_key: "[REDACTED_API_KEY]"',
          description: 'Маскировка API-ключей',
          critical: true,
        },
        {
          name: 'token',
          pattern: /token[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
          replacement: 'token: "[REDACTED_TOKEN]"',
          description: 'Маскировка токенов',
          critical: true,
        },
      ],
    });
  });

  it('должен маскировать API-ключ', async () => {
    const text = 'api_key: abc123def456ghi789012345';
    const result = await guard.mask(text);

    expect(result.wasMasked).toBe(true);
    expect(result.masked).toContain('[REDACTED_API_KEY]');
    expect(result.changes).toHaveLength(1);
  });

  it('должен обрабатывать запросы', async () => {
    const result = await guard.processRequest({
      prompt: 'api_key: abc123def456ghi789012345',
    });
    expect(result.prompt).toContain('[REDACTED_API_KEY]');
    expect(result.changes).toHaveLength(1);
    expect(result.blocked).toBe(false);
  });

  it('должен возвращать отчёт без изменений', () => {
    const report = guard.getReport({
      original: 'test',
      masked: 'test',
      changes: [],
      wasMasked: false,
      blocked: false,
    });
    expect(report).toContain('Данные не требуют маскировки');
  });

  it('должен писать в аудит-лог при обработке запроса', async () => {
    const fs = require('fs');
    const path = require('path');
    const root = process.env.EVOCODE_ROOT || path.resolve(__dirname, '../../');
    const auditPath = path.join(root, '.evocode', 'audit.log');
    
    // Clear previous logs
    if (fs.existsSync(auditPath)) {
      fs.unlinkSync(auditPath);
    }
    
    await guard.processRequest({
      prompt: 'api_key: abc123def456ghi789012345',
    });
    
    expect(fs.existsSync(auditPath)).toBe(true);
    const content = fs.readFileSync(auditPath, 'utf-8');
    const entry = JSON.parse(content.trim().split('\n').pop()!);
    expect(entry.action).toBe('cloud_request');
    expect(entry.wasMasked).toBe(true);
    expect(entry.changesCount).toBe(1);
    expect(entry.rulesMatched).toContain('api-key');
  });

  it('должен блокировать отправку при наличии критического ключа, если blockOnCritical=true', async () => {
    const blockingGuard = new DLPGuard({
      enabled: true,
      blockOnCritical: true,
      rules: [
        {
          name: 'api-key',
          pattern: /api[_-]?key[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
          replacement: 'api_key: "[REDACTED_API_KEY]"',
          description: 'Маскировка API-ключей',
          critical: true,
        },
      ],
    });
    const result = await blockingGuard.mask('api_key: abc123def456ghi789012345');
    expect(result.blocked).toBe(true);
  });

  it('должен заменять все вхождения секрета, а не только первое', async () => {
    const text = 'api_key: abc123def456ghi789012345 и api_key: abc123def456ghi789012345';
    const result = await guard.mask(text);
    expect(result.masked).not.toContain('abc123def456ghi789012345');
    expect(result.changes.length).toBe(2);
  });
});
