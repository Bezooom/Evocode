// Загрузка system + user skills и сборка system-prompt injection (Router v2/M4 facade)
import { defaultConfig, EvocodeConfig } from '../core/config';
import { contentToText } from '../core/text';
import { SkillRouter } from './skill-router';
import { SkillIndex } from './skill-index';
import {
  getSkillEmbeddingStore,
  hashEmbed,
  resetSkillEmbeddingStore,
  SkillEmbeddingStore,
  skillEmbedText,
} from './skill-embeddings';
import { ProductMode, SkillRecord } from './types';

/** @deprecated shape kept for API/UI compatibility */
export interface LoadedSkill {
  name: string;
  path: string;
  content: string;
  source: 'system' | 'user';
  description?: string;
  triggers: string[];
}

function toLoaded(r: SkillRecord): LoadedSkill {
  return {
    name: r.name,
    path: r.path,
    content: r.content,
    source: r.source,
    description: r.description,
    triggers: r.triggers,
  };
}

function mergeConfig(partial?: Partial<EvocodeConfig>): EvocodeConfig {
  if (!partial) return defaultConfig;
  return {
    ...defaultConfig,
    ...partial,
    skills: { ...defaultConfig.skills, ...(partial.skills || {}) },
  } as EvocodeConfig;
}

export class SkillLoader {
  private config: EvocodeConfig;
  private index: SkillIndex;
  private router: SkillRouter;
  private embedStore: SkillEmbeddingStore | null = null;

  constructor(config?: Partial<EvocodeConfig>) {
    this.config = mergeConfig(config);
    this.index = new SkillIndex(this.config);
    this.router = new SkillRouter(this.config, this.index, null);
  }

  /** user overrides system при совпадении name */
  loadAll(force = false): LoadedSkill[] {
    return this.index.getAll(force).map(toLoaded);
  }

  /**
   * Подбирает навыки по query и склеивает в блок для system prompt.
   * v2/M4: hybrid lexical + hash embeddings (sync).
   */
  buildInjection(
    query: string | unknown,
    maxSkills?: number,
    opts?: { mode?: ProductMode; explicitSkills?: string[]; queryEmbedding?: number[] }
  ): { text: string; skills: LoadedSkill[]; meta?: ReturnType<SkillRouter['route']> } {
    const q = contentToText(query);
    const sc = this.config.skills;

    if (sc.routerVersion === 'v1') {
      return this.buildInjectionV1(q, maxSkills ?? sc.maxSkills ?? 3);
    }

    const result = this.router.route({
      query: q,
      maxSkills: maxSkills ?? sc.maxSkills,
      maxInjectChars: sc.maxInjectChars,
      mode: opts?.mode || 'auto',
      explicitSkills: opts?.explicitSkills,
      allowLab: sc.enableLab,
      minScore: sc.minScore,
      queryEmbedding: opts?.queryEmbedding,
      useEmbeddings: sc.useEmbeddings,
    });

    return {
      text: result.text,
      skills: result.selected.map((s) => toLoaded(s.skill)),
      meta: result,
    };
  }

  /**
   * Async inject with optional inference embeddings + ensure embed index warm.
   */
  async buildInjectionAsync(
    query: string | unknown,
    maxSkills?: number,
    opts?: {
      mode?: ProductMode;
      explicitSkills?: string[];
      embedFn?: (text: string) => Promise<number[]> | number[];
    }
  ) {
    const q = contentToText(query);
    if (this.config.skills.useEmbeddings) {
      await this.ensureEmbeddings(opts?.embedFn);
    }
    let queryEmbedding: number[] | undefined;
    if (this.config.skills.useEmbeddings) {
      try {
        const fn = opts?.embedFn || hashEmbed;
        queryEmbedding = await Promise.resolve(fn(q));
      } catch {
        queryEmbedding = hashEmbed(q);
      }
    }
    return this.buildInjection(q, maxSkills, {
      mode: opts?.mode,
      explicitSkills: opts?.explicitSkills,
      queryEmbedding,
    });
  }

  /** Dry-run routing for API / debug */
  route(
    query: string,
    opts?: {
      mode?: ProductMode;
      explicitSkills?: string[];
      maxSkills?: number;
      queryEmbedding?: number[];
      useEmbeddings?: boolean;
    }
  ) {
    return this.router.route({
      query,
      mode: opts?.mode || 'auto',
      explicitSkills: opts?.explicitSkills,
      maxSkills: opts?.maxSkills ?? this.config.skills.maxSkills,
      maxInjectChars: this.config.skills.maxInjectChars,
      allowLab: this.config.skills.enableLab,
      minScore: this.config.skills.minScore,
      queryEmbedding: opts?.queryEmbedding,
      useEmbeddings: opts?.useEmbeddings ?? this.config.skills.useEmbeddings,
    });
  }

  async routeAsync(
    query: string,
    opts?: {
      mode?: ProductMode;
      explicitSkills?: string[];
      maxSkills?: number;
      embedFn?: (text: string) => Promise<number[]> | number[];
    }
  ) {
    if (this.config.skills.useEmbeddings) {
      await this.ensureEmbeddings(opts?.embedFn);
    }
    let queryEmbedding: number[] | undefined;
    if (this.config.skills.useEmbeddings) {
      try {
        const fn = opts?.embedFn || hashEmbed;
        queryEmbedding = await Promise.resolve(fn(query));
      } catch {
        queryEmbedding = hashEmbed(query);
      }
    }
    return this.route(query, {
      mode: opts?.mode,
      explicitSkills: opts?.explicitSkills,
      maxSkills: opts?.maxSkills,
      queryEmbedding,
    });
  }

  /** Full SkillRecord list for UI / API */
  listDetailed(force = false): SkillRecord[] {
    return this.index.getAll(force);
  }

  reindex(): { count: number } {
    const all = this.index.getAll(true);
    return { count: all.length };
  }

  /** Rebuild lexical index + skill embedding vectors */
  async reindexAll(opts?: {
    forceEmbed?: boolean;
    embedFn?: (text: string) => Promise<number[]> | number[];
  }): Promise<{ count: number; embeddings?: { upserted: number; skipped: number; errors: number } }> {
    const all = this.index.getAll(true);
    let embeddings: { upserted: number; skipped: number; errors: number } | undefined;
    if (this.config.skills.useEmbeddings) {
      embeddings = await this.ensureEmbeddings(opts?.embedFn, { force: opts?.forceEmbed, skills: all });
    }
    return { count: all.length, embeddings };
  }

  async ensureEmbeddings(
    embedFn?: (text: string) => Promise<number[]> | number[],
    opts?: { force?: boolean; skills?: SkillRecord[] }
  ) {
    const sc = this.config.skills;
    if (!sc.useEmbeddings) return { upserted: 0, skipped: 0, errors: 0 };
    if (!this.embedStore) {
      this.embedStore = getSkillEmbeddingStore(sc.embeddingsDbPath);
      this.router.setEmbedStore(this.embedStore);
    }
    const skills = opts?.skills || this.index.getAll(false);
    const fn = embedFn || ((t: string) => hashEmbed(t));
    return this.embedStore.sync(skills, fn, { force: opts?.force });
  }

  /** Apply runtime config changes (packs, lab, limits) without process restart */
  applyConfig(partial?: Partial<EvocodeConfig>): void {
    this.config = mergeConfig({ ...this.config, ...partial, skills: { ...this.config.skills, ...(partial?.skills || {}) } });
    this.index = new SkillIndex(this.config);
    this.router = new SkillRouter(this.config, this.index, this.embedStore);
  }

  invalidate(): void {
    this.index.invalidate();
    this.router.invalidate();
  }

  /** Legacy bag-of-words path (feature flag v1) */
  private buildInjectionV1(query: string, maxSkills: number): { text: string; skills: LoadedSkill[] } {
    const all = this.loadAll();
    const q = query.toLowerCase();
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
}

export const skillLoader = new SkillLoader();

// re-export helpers for tests / API
export { hashEmbed, skillEmbedText, resetSkillEmbeddingStore };
