// Загрузка system + user skills и сборка system-prompt injection
import * as fs from 'fs';
import * as path from 'path';
import { defaultConfig, EvocodeConfig } from '../core/config';
import { contentToText } from '../core/text';

export interface LoadedSkill {
  name: string;
  path: string;
  content: string;
  source: 'system' | 'user';
  description?: string;
  triggers: string[];
}

export class SkillLoader {
  private config: EvocodeConfig;
  private cache: LoadedSkill[] | null = null;

  constructor(config?: Partial<EvocodeConfig>) {
    this.config = config
      ? ({ ...defaultConfig, ...config } as EvocodeConfig)
      : defaultConfig;
  }

  /** user overrides system при совпадении name */
  loadAll(force = false): LoadedSkill[] {
    if (this.cache && !force) return this.cache;

    const system = this.loadDir(this.config.skills.systemPath, 'system');
    const user = this.loadDir(this.config.skills.userPath, 'user');

    const byName = new Map<string, LoadedSkill>();
    for (const s of system) byName.set(s.name, s);
    for (const s of user) byName.set(s.name, s); // override

    this.cache = [...byName.values()];
    return this.cache;
  }

  private loadDir(dir: string, source: 'system' | 'user'): LoadedSkill[] {
    const out: LoadedSkill[] = [];
    if (!fs.existsSync(dir)) return out;

    const walk = (current: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.')) continue;
          walk(full);
        } else if (entry.name === 'SKILL.md' || entry.name.endsWith('.md')) {
          if (entry.name !== 'SKILL.md' && !full.includes(`${path.sep}skills${path.sep}`)) {
            // only SKILL.md as primary units at skill roots; allow nested refs later
          }
          if (entry.name !== 'SKILL.md') continue;
          try {
            const content = fs.readFileSync(full, 'utf-8');
            const name = this.extractName(content, path.basename(path.dirname(full)));
            const description = this.extractField(content, 'description');
            const triggers = this.extractTriggers(content, name);
            out.push({ name, path: full, content, source, description, triggers });
          } catch {
            /* skip unreadable */
          }
        }
      }
    };

    walk(dir);
    return out;
  }

  private extractName(content: string, fallback: string): string {
    const m = content.match(/^---[\s\S]*?^name:\s*["']?([^\n"']+)/m);
    return (m?.[1] || fallback).trim();
  }

  private extractField(content: string, field: string): string | undefined {
    const m = content.match(new RegExp(`^${field}:\\s*["']?(.+?)$`, 'm'));
    return m?.[1]?.trim();
  }

  private extractTriggers(content: string, name: string): string[] {
    const triggers = [name.toLowerCase().replace(/-/g, ' ')];
    const m = content.match(/^triggers:\s*\[([^\]]*)\]/m);
    if (m) {
      triggers.push(
        ...m[1]
          .split(',')
          .map((s) => s.replace(/["']/g, '').trim().toLowerCase())
          .filter(Boolean)
      );
    }
    // keywords from description
    const desc = this.extractField(content, 'description');
    if (desc) {
      for (const w of desc.toLowerCase().split(/\W+/)) {
        if (w.length > 4) triggers.push(w);
      }
    }
    return [...new Set(triggers)];
  }

  /**
   * Подбирает навыки по query и склеивает в блок для system prompt.
   * User skills уже перекрыли system в loadAll.
   */
  buildInjection(query: string | unknown, maxSkills = 3): { text: string; skills: LoadedSkill[] } {
    const all = this.loadAll();
    const q = contentToText(query).toLowerCase();
    const scored = all
      .map((skill) => {
        let score = 0;
        for (const t of skill.triggers) {
          if (t && q.includes(t)) score += t.length;
        }
        if (skill.description && q.includes(skill.description.toLowerCase().slice(0, 20))) {
          score += 5;
        }
        return { skill, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSkills)
      .map((x) => x.skill);

    // если ничего не матчится — не пихаем все навыки (экономия контекста)
    if (scored.length === 0) {
      return { text: '', skills: [] };
    }

    const parts: string[] = [
      '# Активные навыки Эвокод',
      'Следуй инструкциям навыков, релевантных запросу пользователя.',
      '',
    ];

    let total = parts.join('\n').length;
    const used: LoadedSkill[] = [];
    const limit = this.config.skills.maxInjectChars;

    for (const skill of scored) {
      const block = `## Skill: ${skill.name} (${skill.source})\n${skill.content}\n`;
      if (total + block.length > limit) break;
      parts.push(block);
      total += block.length;
      used.push(skill);
    }

    return { text: parts.join('\n'), skills: used };
  }

  invalidate(): void {
    this.cache = null;
  }
}

export const skillLoader = new SkillLoader();
