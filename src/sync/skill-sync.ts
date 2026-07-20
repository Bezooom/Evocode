// Skill Sync Engine — ежедневная автоактуализация навыков
// Реальная реализация: GitHub API через https.get()
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { defaultConfig, EvocodeConfig, SyncSource } from '../core/config';
import {
  isPathInside,
  sanitizeSkillRelativePath,
  safeSkillFetchUrl,
} from './path-safe';

export type SkillStatus = 'new' | 'changed' | 'removed' | 'unchanged';

export interface SkillFile {
  name: string;
  path: string;
  status: SkillStatus;
  version?: string;
  sha?: string;
}

export interface SyncResult {
  newSkills: SkillFile[];
  changedSkills: SkillFile[];
  removedSkills: SkillFile[];
  unchangedSkills: number;
  errors: string[];
  timestamp: Date;
}

interface SourceCheckResult {
  source: SyncSource;
  needsUpdate: boolean;
  lastModified: Date;
  skillCount: number;
}

export class SkillSyncEngine {
  private config: EvocodeConfig;
  private sources: SyncSource[];
  private log: string[] = [];
  private lastSync: Date | null = null;
  private syncInProgress: boolean = false;
  
  constructor(config?: Partial<EvocodeConfig>) {
    this.config = config ? { ...defaultConfig, ...config } : defaultConfig;
    this.sources = this.config.sync.sources;
  }
  
  // Запуск синхронизации
  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      this.log.push(`[${new Date().toISOString()}] Синхронизация уже выполняется, пропуск`);
      return {
        newSkills: [],
        changedSkills: [],
        removedSkills: [],
        unchangedSkills: 0,
        errors: ['Синхронизация уже выполняется'],
        timestamp: new Date(),
      };
    }

    this.syncInProgress = true;
    this.log.push(`[${new Date().toISOString()}] Начало синхронизации...`);
    
    const result: SyncResult = {
      newSkills: [],
      changedSkills: [],
      removedSkills: [],
      unchangedSkills: 0,
      errors: [],
      timestamp: new Date(),
    };
    
    try {
      // Проверяем каждый источник и синхронизируем при необходимости
      const checks = await Promise.all(
        this.sources.map(source => this.checkSource(source))
      );

      for (const check of checks) {
        if (!check.needsUpdate) {
          this.log.push(`[${new Date().toISOString()}] Источник ${check.source.name}: обновление не требуется`);
          continue;
        }

        try {
          const syncResult = await this.syncWithSource(check.source);
          result.newSkills.push(...syncResult.newSkills);
          result.changedSkills.push(...syncResult.changedSkills);
          result.removedSkills.push(...syncResult.removedSkills);
          result.unchangedSkills += syncResult.unchangedSkills;
        } catch (error) {
          result.errors.push(`Ошибка синхронизации с ${check.source.name}: ${(error as Error).message}`);
          this.log.push(`[${new Date().toISOString()}] Ошибка: ${(error as Error).message}`);
        }
      }

      this.lastSync = new Date();
      this.log.push(`[${new Date().toISOString()}] Синхронизация завершена: ${result.newSkills.length} новых, ${result.changedSkills.length} изменённых`);
      console.log(`Эвокод: Навыки синхронизированы (${new Date().toLocaleTimeString()})`);
    } catch (error) {
      const msg = (error as Error).message;
      result.errors.push(`Критическая ошибка синхронизации: ${msg}`);
      this.log.push(`[${new Date().toISOString()}] Критическая ошибка: ${msg}`);
      console.error(`Эвокод: Ошибка синхронизации: ${msg}`);
    } finally {
      this.syncInProgress = false;
    }
    
    return result;
  }

  // Проверка источника: загрузка манифеста и определение необходимости обновления
  private async checkSource(source: SyncSource): Promise<SourceCheckResult> {
    try {
      const manifestUrl = `${source.url}/raw/${source.branch}/MANIFEST.json`;
      const manifest = await this.fetchJson(manifestUrl);

      const lastModified = new Date(manifest.lastUpdated || Date.now());
      const skillCount = manifest.skills?.length || 0;
      const needsUpdate = !this.lastSync || lastModified > this.lastSync;

      return { source, needsUpdate, lastModified, skillCount };
    } catch (error) {
      console.error(`SkillSync: Ошибка проверки источника ${source.name}:`, error);
      return { source, needsUpdate: false, lastModified: new Date(), skillCount: 0 };
    }
  }
  
  // Синхронизация с одним источником — реальная загрузка из GitHub
  private async syncWithSource(source: SyncSource): Promise<SyncResult> {
    const result: SyncResult = {
      newSkills: [],
      changedSkills: [],
      removedSkills: [],
      unchangedSkills: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Загрузка манифеста навыков из GitHub
      const manifestUrl = `${source.url}/raw/${source.branch}/MANIFEST.json`;
      const manifest = await this.fetchJson(manifestUrl);

      // Always resolve under cwd-relative skills root (never write outside repo skills tree)
      const systemRoot = path.resolve(process.cwd(), this.config.skills.systemPath);
      const sourceName = String(source.name || 'remote').replace(/[^a-zA-Z0-9._-]/g, '_');
      const resolvedLocalDir = path.resolve(systemRoot, sourceName);
      if (!isPathInside(systemRoot, resolvedLocalDir)) {
        result.errors.push(`Ошибка безопасности: имя источника ${source.name} выходит за skills root`);
        return result;
      }
      if (!fs.existsSync(resolvedLocalDir)) {
        fs.mkdirSync(resolvedLocalDir, { recursive: true });
      }

      for (const skill of manifest.skills || []) {
        const rel = sanitizeSkillRelativePath(skill.path);
        if (!rel) {
          result.errors.push(
            `Ошибка безопасности ${skill.name || '?'}: небезопасный path в манифесте: ${skill.path}`
          );
          this.log.push(`  ❌ path reject: ${skill.path}`);
          continue;
        }
        const skillPath = path.resolve(resolvedLocalDir, rel);
        if (!isPathInside(resolvedLocalDir, skillPath)) {
          result.errors.push(
            `Ошибка безопасности ${skill.name}: path traversal в пути ${skill.path}`
          );
          this.log.push(`  ❌ path traversal: ${skill.path}`);
          continue;
        }
        // Only allow SKILL.md (and nested skill docs under same skill folder)
        const base = path.basename(skillPath);
        if (!/\.(md|txt|json|yml|yaml)$/i.test(base)) {
          result.errors.push(`Ошибка безопасности ${skill.name}: запрещённый тип файла ${base}`);
          continue;
        }
        const skillDir = path.dirname(skillPath);
        if (!isPathInside(resolvedLocalDir, skillDir)) {
          result.errors.push(`Ошибка безопасности ${skill.name}: skillDir вне root`);
          continue;
        }

        // Загрузка содержимого навыка (только https github / raw)
        const skillUrl = safeSkillFetchUrl(
          source.url,
          source.branch,
          source.path,
          rel
        );
        if (!skillUrl) {
          result.errors.push(`Ошибка безопасности ${skill.name}: URL fetch отклонён`);
          continue;
        }
        let skillContent: string;
        try {
          skillContent = await this.fetchText(skillUrl);
        } catch (fetchErr) {
          result.errors.push(`Ошибка загрузки ${skill.name}: ${(fetchErr as Error).message}`);
          continue;
        }

        // Верификация контрольной суммы (SHA-256)
        if (skill.sha) {
          const crypto = require('crypto');
          const calculatedSha = crypto.createHash('sha256').update(skillContent, 'utf-8').digest('hex');
          if (calculatedSha !== skill.sha) {
            result.errors.push(`Ошибка верификации SHA для ${skill.name}: контрольная сумма не совпадает`);
            this.log.push(`  ❌ Ошибка верификации SHA для ${skill.name}: контрольная сумма не совпадает`);
            continue;
          }
        }

        // Определяем статус: новый или изменённый
        const isExisting = fs.existsSync(skillPath);
        let status: SkillStatus = 'new';

        if (isExisting) {
          const existingContent = fs.readFileSync(skillPath, 'utf-8');
          if (existingContent === skillContent) {
            result.unchangedSkills++;
            continue;
          }
          status = 'changed';
        }

        // Создаём директорию и записываем файл
        if (!fs.existsSync(skillDir)) {
          fs.mkdirSync(skillDir, { recursive: true });
        }
        fs.writeFileSync(skillPath, skillContent);

        const skillFile: SkillFile = {
          name: skill.name,
          path: skillPath,
          status,
          version: skill.version,
          sha: skill.sha,
        };

        if (status === 'new') {
          result.newSkills.push(skillFile);
          this.log.push(`  ✅ Добавлен навык: ${skill.name} v${skill.version}`);
        } else {
          result.changedSkills.push(skillFile);
          this.log.push(`  ✅ Обновлён навык: ${skill.name} v${skill.version}`);
        }

        console.log(`SkillSync: Применён навык ${skill.name} v${skill.version}`);
      }
    } catch (error) {
      result.errors.push(`Ошибка загрузки манифеста ${source.name}: ${(error as Error).message}`);
    }

    return result;
  }

  // HTTP GET запрос, возвращающий JSON
  private async fetchJson(url: string): Promise<any> {
    const text = await this.fetchText(url);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`JSON parse error для ${url}: ${(error as Error).message}`);
    }
  }

  // HTTP GET запрос, возвращающий текст
  private async fetchText(url: string, redirectsLeft = 3): Promise<string> {
    const isTrustedRedirect = (originalUrl: string, redirectUrl: string): boolean => {
      try {
        const orig = new URL(originalUrl);
        const redir = new URL(redirectUrl);
        
        if (redir.protocol !== 'https:') return false;
        
        const origHost = orig.hostname.toLowerCase();
        const redirHost = redir.hostname.toLowerCase();
        
        if (origHost === redirHost) return true;
        
        const trustedHosts = ['github.com', 'raw.githubusercontent.com'];
        if (trustedHosts.includes(redirHost) || redirHost.endsWith('.github.com') || redirHost.endsWith('.githubusercontent.com')) {
          return true;
        }
        
        return false;
      } catch {
        return false;
      }
    };

    // Initial URL must be https + trusted host (no plain http SSRF)
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') {
        return Promise.reject(new Error(`SSRF Prevention: only https allowed (${url})`));
      }
      const host = u.hostname.toLowerCase();
      const ok =
        host === 'github.com' ||
        host === 'raw.githubusercontent.com' ||
        host.endsWith('.githubusercontent.com');
      if (!ok) {
        return Promise.reject(new Error(`SSRF Prevention: untrusted host ${host}`));
      }
    } catch (e) {
      return Promise.reject(new Error(`Invalid URL: ${url}`));
    }

    return new Promise((resolve, reject) => {
      const protocol = https;
      protocol.get(url, (res: any) => {
        // Обработка редиректов (301, 302, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          const redirectUrl = res.headers.location;
          if (!isTrustedRedirect(url, redirectUrl)) {
            reject(new Error(`SSRF Prevention: Untrusted redirect target: ${redirectUrl}`));
            return;
          }
          this.fetchText(redirectUrl, redirectsLeft - 1).then(resolve, reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} (${url})`));
          res.resume(); // сбрасываем данные из потока
          return;
        }

        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
  
  // Загрузка существующих навыков с диска
  loadExistingSkills(): SkillFile[] {
    const skills: SkillFile[] = [];
    const skillsDir = this.config.skills.systemPath;

    if (!fs.existsSync(skillsDir)) {
      return skills;
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDir = path.join(skillsDir, entry.name);
        const manifestPath = path.join(skillDir, 'SKILL.md');

        if (fs.existsSync(manifestPath)) {
          skills.push({
            name: entry.name,
            path: manifestPath,
            status: 'unchanged',
          });
        }
      }
    }

    return skills;
  }

  // Получение лога синхронизации
  getLog(): string[] {
    return this.log;
  }
  
  // Очистка лога
  clearLog(): void {
    this.log = [];
  }

  // Последняя синхронизация
  getLastSync(): Date | null {
    return this.lastSync;
  }

  // Синхронизация в процессе?
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
  
  /**
   * @deprecated Синхронизация уже пишет файлы в syncWithSource.
   * Этот метод только создаёт бэкап путей — НЕ перезаписывает контент заглушками.
   */
  applyChanges(result: SyncResult): void {
    this.log.push(`[${new Date().toISOString()}] Бэкап метаданных синхронизации...`);
    const backupPath = path.join(
      this.config.skills.backupPath,
      result.timestamp.toISOString().replace(/[:.]/g, '-')
    );
    fs.mkdirSync(backupPath, { recursive: true });
    fs.writeFileSync(
      path.join(backupPath, 'sync-result.json'),
      JSON.stringify(
        {
          new: result.newSkills.map((s) => s.path),
          changed: result.changedSkills.map((s) => s.path),
          removed: result.removedSkills.map((s) => s.path),
          errors: result.errors,
        },
        null,
        2
      )
    );
    this.log.push(`[${new Date().toISOString()}] Бэкап: ${backupPath}`);
  }
}

// Экспорт для использования
export const skillSyncEngine = new SkillSyncEngine();

