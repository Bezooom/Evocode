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
});
