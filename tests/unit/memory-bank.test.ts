import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExternalMemoryManager } from '../../src/memory/memory-bank';

describe('ExternalMemoryManager', () => {
  let tmpDir: string;
  let memoryManager: ExternalMemoryManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evocode-mem-test-'));
    memoryManager = new ExternalMemoryManager(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup error */
    }
  });

  it('creates memory directory and default templates', () => {
    const memDir = memoryManager.getMemoryDir();
    expect(fs.existsSync(memDir)).toBe(true);
    expect(fs.existsSync(path.join(memDir, 'projectbrief.md'))).toBe(true);
    expect(fs.existsSync(path.join(memDir, 'activeContext.md'))).toBe(true);
  });

  it('reads and writes memory files correctly', () => {
    const ok = memoryManager.writeMemoryFile('activeContext', '# Custom Active Task\n- Refactoring stream parser');
    expect(ok).toBe(true);
    const content = memoryManager.readMemoryFile('activeContext');
    expect(content).toContain('Refactoring stream parser');
  });

  it('builds system prompt snippet with memory sections', () => {
    memoryManager.writeMemoryFile('activeContext', 'Focus: Memory Bank Integration');
    const snippet = memoryManager.buildSystemPromptSnippet();
    expect(snippet).toContain('EXTERNAL AGENT MEMORY');
    expect(snippet).toContain('<external_agent_memory>');
    expect(snippet).toContain('Focus: Memory Bank Integration');
  });

  it('syncs workspace task to activeContext', () => {
    memoryManager.syncFromWorkspace('Implement unit tests for ExternalMemoryManager');
    const active = memoryManager.readMemoryFile('activeContext');
    expect(active).toContain('Implement unit tests for ExternalMemoryManager');
  });
});
