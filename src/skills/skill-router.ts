/**
 * Skill Router v2 — ranking, mutex, budget inject payload.
 * @see specs/SKILL_ROUTER_V2.md
 */
import { defaultConfig, EvocodeConfig } from '../core/config';
import { normalizeTrigger } from './frontmatter';
import { SkillIndex } from './skill-index';
import {
  getSkillEmbeddingStore,
  hashEmbed,
  SkillEmbeddingStore,
} from './skill-embeddings';
import {
  ProductMode,
  RouteRequest,
  RouteResult,
  ScoredSkill,
  SkillRecord,
} from './types';

const OPERATOR_BOOST_DOMAINS = new Set(['docs', 'business', 'general']);
const OPERATOR_DEMOTE_PACKS = new Set(['web3', 'seo-growth']);

function normalizeQuery(q: string): string {
  return normalizeTrigger(q);
}

/** Simple BM25-ish bag score on description (capped). */
function bm25Desc(query: string, description: string): number {
  if (!description) return 0;
  const qTokens = query.split(/\s+/).filter((t) => t.length >= 4);
  if (!qTokens.length) return 0;
  const desc = description.toLowerCase();
  let hits = 0;
  for (const t of qTokens) {
    if (desc.includes(t)) hits++;
  }
  return Math.min(15, (hits / qTokens.length) * 15);
}

function buildPayload(skill: SkillRecord, globalCoreCap: number): string {
  const cap = Math.min(skill.maxInjectChars || globalCoreCap, globalCoreCap);
  const header = `## Skill: ${skill.name} (${skill.source}, tier=${skill.tier}, pack=${skill.pack})\n`;

  if (skill.injectMode === 'summary_only') {
    const lines = skill.body.split(/\r?\n/);
    const keep: string[] = [];
    let n = 0;
    for (const line of lines) {
      if (line.startsWith('#')) keep.push(line);
      else if (n < 40) {
        keep.push(line);
        n++;
      }
      if (keep.join('\n').length > cap) break;
    }
    let summary = keep.join('\n').slice(0, cap);
    summary += `\n\n<!-- full skill path: ${skill.path} — read file for full playbook -->\n`;
    return header + summary + '\n';
  }

  let body = skill.body;
  if (skill.injectMode === 'core_plus_toc') {
    const toc: string[] = [];
    // headings as TOC hint
    for (const line of skill.body.split(/\r?\n/)) {
      const m = line.match(/^(#{1,3})\s+(.+)/);
      if (m) toc.push(`- ${m[2].trim()}`);
      if (toc.length >= 24) break;
    }
    for (const s of skill.subskills) {
      toc.push(`- sub: ${s.path}${s.title ? ` (${s.title})` : ''}`);
    }
    if (toc.length) {
      body = `${skill.body.slice(0, Math.floor(cap * 0.7))}\n\n### Modules / TOC\n${toc.join('\n')}\n`;
    }
  }

  if (body.length > cap) {
    body = body.slice(0, cap) + '\n\n<!-- truncated to max_inject_chars -->\n';
  }

  return header + body + '\n';
}

export class SkillRouter {
  private config: EvocodeConfig;
  private index: SkillIndex;
  private embedStore: SkillEmbeddingStore | null = null;

  constructor(config?: Partial<EvocodeConfig>, index?: SkillIndex, embedStore?: SkillEmbeddingStore | null) {
    this.config = config
      ? ({ ...defaultConfig, ...config, skills: { ...defaultConfig.skills, ...(config.skills || {}) } } as EvocodeConfig)
      : defaultConfig;
    this.index = index || new SkillIndex(this.config);
    this.embedStore = embedStore === undefined ? null : embedStore;
  }

  invalidate(): void {
    this.index.invalidate();
  }

  getIndex(): SkillIndex {
    return this.index;
  }

  setEmbedStore(store: SkillEmbeddingStore | null) {
    this.embedStore = store;
  }

  private getStore(): SkillEmbeddingStore | null {
    if (this.embedStore) return this.embedStore;
    if (!this.config.skills.useEmbeddings) return null;
    try {
      this.embedStore = getSkillEmbeddingStore(this.config.skills.embeddingsDbPath);
      return this.embedStore;
    } catch {
      return null;
    }
  }

  route(req: RouteRequest): RouteResult {
    const sc = this.config.skills;
    const maxSkills = req.maxSkills ?? sc.maxSkills ?? 2;
    const maxInject = req.maxInjectChars ?? sc.maxInjectChars ?? 8000;
    const minScore = req.minScore ?? sc.minScore ?? 15;
    const allowLab = req.allowLab ?? sc.enableLab ?? false;
    const mode: ProductMode = req.mode || 'auto';
    const q = normalizeQuery(req.query || '');
    const enabledPacks = new Set((sc.enabledPacks || []).map((p) => p.toLowerCase()));
    const packsOpen = enabledPacks.size === 0;
    const useEmbed = req.useEmbeddings ?? sc.useEmbeddings ?? false;
    const embedWeight = sc.embedWeight ?? 40;
    const embedMin = sc.embedMinCosine ?? 0.18;

    const all = this.index.getAll();
    const rejected: RouteResult['rejected'] = [];
    const candidates: SkillRecord[] = [];
    const candidateNames = new Set<string>();

    for (const skill of all) {
      if (skill.tier === 'banned') {
        rejected.push({ name: skill.name, score: 0, reason: 'banned' });
        continue;
      }
      if (skill.tier === 'lab' && !allowLab) {
        rejected.push({ name: skill.name, score: 0, reason: 'lab_disabled' });
        continue;
      }
      if (!packsOpen && !enabledPacks.has(skill.pack) && skill.tier !== 'core') {
        // core always eligible
        if (skill.source !== 'user') {
          rejected.push({ name: skill.name, score: 0, reason: 'pack_disabled' });
          continue;
        }
      }
      candidates.push(skill);
      candidateNames.add(skill.name);
    }

    // Embed hits map name → cosine
    const embedScores = new Map<string, number>();
    if (useEmbed && q) {
      try {
        const store = this.getStore();
        if (store && store.count() > 0) {
          const qEmb = req.queryEmbedding?.length ? req.queryEmbedding : hashEmbed(req.query || '');
          for (const hit of store.search(qEmb, 40)) {
            if (candidateNames.has(hit.name) && hit.score >= embedMin * 0.7) {
              embedScores.set(hit.name, hit.score);
            }
          }
        }
      } catch {
        /* embed optional */
      }
    }

    // Explicit skills first
    const explicit = new Set((req.explicitSkills || []).map((n) => n.toLowerCase()));
    const scored: ScoredSkill[] = [];
    const scoredNames = new Set<string>();

    for (const skill of candidates) {
      const reasons: string[] = [];
      let score = 0;

      if (explicit.has(skill.name.toLowerCase())) {
        score += 100;
        reasons.push('explicit');
      }

      if (!q && score === 0) {
        continue;
      }

      // exact name / slug in query
      const namePhrase = normalizeTrigger(skill.name.replace(/-/g, ' '));
      if (namePhrase && q.includes(namePhrase)) {
        score += 100;
        reasons.push('name');
      } else if (q.includes(normalizeTrigger(skill.name))) {
        score += 90;
        reasons.push('name_raw');
      }

      // trigger phrase match — longest first; multi-word phrases dominate single tokens
      const triggers = [...skill.triggers].sort((a, b) => b.length - a.length);
      let bestTrig = 0;
      for (const t of triggers) {
        if (t.length < 3) continue;
        if (!q.includes(t)) continue;
        const words = t.split(/\s+/).filter(Boolean).length;
        // single short tokens from synthetic desc are weak; multi-word strong
        const boost =
          words >= 2
            ? 50 + Math.min(50, t.length)
            : t.length >= 8
              ? 35 + Math.min(25, t.length)
              : 12 + Math.min(12, t.length);
        if (boost > bestTrig) {
          bestTrig = boost;
          reasons.push(`trigger:${t}`);
        }
      }
      score += bestTrig;

      // secondary: count extra multi-word trigger hits lightly
      let extra = 0;
      for (const t of triggers) {
        if (t.includes(' ') && t.length >= 5 && q.includes(t)) extra++;
      }
      if (extra > 1) score += Math.min(20, (extra - 1) * 8);

      const descScore = bm25Desc(q, skill.description);
      score += descScore * 0.6; // desc weaker than explicit triggers
      if (descScore > 5) reasons.push('desc');

      // mode alignment
      if (mode === 'operator') {
        if (OPERATOR_BOOST_DOMAINS.has(skill.domain)) {
          score += 10;
          reasons.push('operator_boost');
        }
        if (OPERATOR_DEMOTE_PACKS.has(skill.pack)) {
          score -= 15;
          reasons.push('operator_demote');
        }
      }

      score += (skill.priority || 50) / 10;

      if (skill.source === 'user') {
        score += 5;
        reasons.push('user');
      }

      // M4 hybrid: cosine boost
      const cos = embedScores.get(skill.name) || 0;
      if (cos >= embedMin) {
        const boost = cos * embedWeight;
        score += boost;
        reasons.push(`embed:${cos.toFixed(2)}`);
      }

      if (score > 0) {
        scored.push({ skill, score, reasons });
        scoredNames.add(skill.name);
      }
    }

    // Embed-only rescue: high cosine but weak lexical
    if (useEmbed && embedScores.size) {
      const byName = new Map(candidates.map((c) => [c.name, c]));
      for (const [name, cos] of embedScores) {
        if (scoredNames.has(name)) continue;
        if (cos < Math.max(embedMin, 0.28)) continue;
        const skill = byName.get(name);
        if (!skill) continue;
        const boost = cos * embedWeight;
        if (boost < minScore * 0.8) continue;
        scored.push({
          skill,
          score: boost + (skill.priority || 50) / 20,
          reasons: [`embed_rescue:${cos.toFixed(2)}`],
        });
        scoredNames.add(name);
      }
    }

    scored.sort((a, b) => b.score - a.score || b.skill.priority - a.skill.priority);

    // Select with mutex + persona cap + minScore
    const selected: ScoredSkill[] = [];
    const selectedNames = new Set<string>();
    let hasPersona = false;

    for (const item of scored) {
      if (selected.length >= maxSkills) break;
      if (item.score < minScore && !explicit.has(item.skill.name.toLowerCase())) {
        rejected.push({ name: item.skill.name, score: item.score, reason: 'below_min_score' });
        continue;
      }
      if (item.skill.persona && hasPersona) {
        rejected.push({ name: item.skill.name, score: item.score, reason: 'persona_cap' });
        continue;
      }
      // mutex
      const mutexHit = item.skill.mutex.some((m) => selectedNames.has(m) || selectedNames.has(m.replace(/\s+/g, '-')));
      if (mutexHit) {
        rejected.push({ name: item.skill.name, score: item.score, reason: 'mutex' });
        continue;
      }
      // reverse mutex: selected skill mutexes this name
      const blocked = selected.some((s) =>
        s.skill.mutex.some((m) => normalizeTrigger(m) === normalizeTrigger(item.skill.name) || m === item.skill.name)
      );
      if (blocked) {
        rejected.push({ name: item.skill.name, score: item.score, reason: 'mutex_by_selected' });
        continue;
      }

      selected.push(item);
      selectedNames.add(item.skill.name);
      if (item.skill.persona) hasPersona = true;
    }

    // Budget inject
    const coreCap = sc.maxSkillCoreChars ?? 4000;
    const parts: string[] = [
      '# Активные навыки Эвокод',
      'Следуй инструкциям навыков, релевантных запросу. Не меняй постоянную identity на persona skill.',
      'При необходимости читай sub-skill / full path с диска.',
      '',
    ];
    let total = parts.join('\n').length;
    const used: ScoredSkill[] = [];

    for (const item of selected) {
      const block = buildPayload(item.skill, coreCap);
      if (total + block.length > maxInject) {
        // try summary only once
        const slimSkill = { ...item.skill, injectMode: 'summary_only' as const };
        const slim = buildPayload(slimSkill, Math.min(1500, coreCap));
        if (total + slim.length > maxInject) {
          rejected.push({ name: item.skill.name, score: item.score, reason: 'budget' });
          continue;
        }
        parts.push(slim);
        total += slim.length;
        used.push({ ...item, reasons: [...item.reasons, 'summary_budget'] });
        continue;
      }
      parts.push(block);
      total += block.length;
      used.push(item);
    }

    const text = used.length ? parts.join('\n') : '';
    return {
      selected: used,
      rejected: rejected.slice(0, 50),
      injectChars: text.length,
      text,
      routerVersion: 'v2',
    };
  }
}

export const skillRouter = new SkillRouter();
