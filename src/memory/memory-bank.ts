import * as fs from 'fs';
import * as path from 'path';

export interface MemoryBankState {
  projectbrief: string;
  activeContext: string;
  systemPatterns: string;
  techContext: string;
  progress: string;
}

export type MemoryFileName = keyof MemoryBankState;

export const DEFAULT_MEMORY_TEMPLATES: Record<MemoryFileName, string> = {
  projectbrief: `# Project Brief\n\n- **Project**: Evocode AI Development Platform\n- **Goal**: Local/Cloud hybrid AI coding assistant & IDE runtime.\n`,
  activeContext: `# Active Context\n\n- **Current Focus**: Multi-model execution, External Memory Bank, & UI Stream stability.\n- **Active Session**: Persistent memory active across LLM model switches.\n`,
  systemPatterns: `# System Patterns\n\n- **Core Architecture**: Node.js/TypeScript backend server (:8083) routing local (ik_llama/buun) and cloud models.\n- **Extensions**: Kilo/VS Code webview agent integration.\n`,
  techContext: `# Tech Context\n\n- **Stack**: TypeScript, Node.js, Express/HTTP, llama.cpp GGUF profiles, OpenRouter API.\n- **Build & Test**: \`npm run build\`, \`npm test\`.\n`,
  progress: `# Progress\n\n- [x] OpenAI-compatible chat & FIM endpoints\n- [x] Smart routing & hardware profiling\n- [x] Reasoning stream normalization\n- [x] Persistent External Agent Memory Bank\n`,
};

export class ExternalMemoryManager {
  private baseDir: string;

  constructor(workspacePath?: string) {
    this.baseDir = this.resolveMemoryDir(workspacePath);
    this.ensureDirExists();
  }

  public setWorkspace(workspacePath: string): void {
    this.baseDir = this.resolveMemoryDir(workspacePath);
    this.ensureDirExists();
  }

  public getMemoryDir(): string {
    return this.baseDir;
  }

  private resolveMemoryDir(workspacePath?: string): string {
    const root = workspacePath || process.cwd();
    return path.join(root, '.evocode', 'memory');
  }

  private ensureDirExists(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      this.ensureDefaultTemplates();
    } catch (e) {
      console.warn(`[MemoryBank] Failed to create directory ${this.baseDir}: ${(e as Error).message}`);
    }
  }

  private ensureDefaultTemplates(): void {
    const keys: MemoryFileName[] = ['projectbrief', 'activeContext', 'systemPatterns', 'techContext', 'progress'];
    for (const key of keys) {
      const filePath = path.join(this.baseDir, `${key}.md`);
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(filePath, DEFAULT_MEMORY_TEMPLATES[key], 'utf-8');
        } catch {
          /* ignore write error */
        }
      }
    }
  }

  public readMemoryFile(name: MemoryFileName): string {
    const filePath = path.join(this.baseDir, `${name}.md`);
    if (fs.existsSync(filePath)) {
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch {
        return '';
      }
    }
    return DEFAULT_MEMORY_TEMPLATES[name] || '';
  }

  public writeMemoryFile(name: MemoryFileName, content: string): boolean {
    this.ensureDirExists();
    const filePath = path.join(this.baseDir, `${name}.md`);
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (e) {
      console.error(`[MemoryBank] Failed to write ${filePath}: ${(e as Error).message}`);
      return false;
    }
  }

  public getAllMemory(): MemoryBankState {
    return {
      projectbrief: this.readMemoryFile('projectbrief'),
      activeContext: this.readMemoryFile('activeContext'),
      systemPatterns: this.readMemoryFile('systemPatterns'),
      techContext: this.readMemoryFile('techContext'),
      progress: this.readMemoryFile('progress'),
    };
  }

  public buildSystemPromptSnippet(): string {
    const mem = this.getAllMemory();
    const sections: string[] = [];

    if (mem.activeContext.trim()) sections.push(`## Active Context\n${mem.activeContext.trim()}`);
    if (mem.projectbrief.trim()) sections.push(`## Project Brief\n${mem.projectbrief.trim()}`);
    if (mem.systemPatterns.trim()) sections.push(`## System Patterns\n${mem.systemPatterns.trim()}`);
    if (mem.techContext.trim()) sections.push(`## Tech Context\n${mem.techContext.trim()}`);
    if (mem.progress.trim()) sections.push(`## Progress\n${mem.progress.trim()}`);

    if (sections.length === 0) return '';

    return `[ВНЕШНЯЯ ПАМЯТЬ АГЕНТА / EXTERNAL AGENT MEMORY]
Эта внешняя память сохраняется при смене моделей и перезапусках. Используйте её для поддержки непрерывного контекста проекта.

<external_agent_memory>
${sections.join('\n\n')}
</external_agent_memory>`;
  }

  public syncFromWorkspace(activeTaskDescription?: string): void {
    if (activeTaskDescription && activeTaskDescription.trim()) {
      const currentActive = this.readMemoryFile('activeContext');
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const updated = `${currentActive.trim()}\n- Last Active Task (${timestamp}): ${activeTaskDescription.trim()}\n`;
      this.writeMemoryFile('activeContext', updated);
    }
  }
}

export const defaultMemoryManager = new ExternalMemoryManager();
