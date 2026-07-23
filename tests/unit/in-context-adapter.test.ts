import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatasetCollector } from '../../src/learning/dataset-collector';
import { InContextAdapter } from '../../src/learning/in-context-adapter';

describe('DatasetCollector & InContextAdapter', () => {
  let tmpDir: string;
  let collector: DatasetCollector;
  let adapter: InContextAdapter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evocode-dataset-test-'));
    collector = new DatasetCollector(tmpDir);
    adapter = new InContextAdapter(collector, path.join(tmpDir, 'adapters'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup error */
    }
  });

  it('records interaction and sanitizes DLP secrets', async () => {
    const ok = await collector.recordInteraction(
      'Write function for api key sk-or-v1-MOCKKEYSECRETNOTREALJUSTDUMMYFORTESTS',
      'const key = "sk-or-v1-MOCKKEYSECRETNOTREALJUSTDUMMYFORTESTS"; return key;'
    );

    expect(ok).toBe(true);
    const stats = collector.getStats();
    expect(stats.count).toBe(1);

    const items = collector.getRecentItems(1);
    expect(items[0].prompt).not.toContain('sk-or-v1-1234567890abcdef');
    expect(items[0].prompt).toContain('[REDACTED');
  });

  it('builds adapter prompt snippet from dataset', async () => {
    await collector.recordInteraction('How to handle async in TS?', 'Use async/await with try-catch.');
    const snippet = adapter.buildAdapterPromptSnippet(1);
    expect(snippet).toContain('IN-CONTEXT MODEL ADAPTER');
    expect(snippet).toContain('Use async/await with try-catch.');
  });
});
