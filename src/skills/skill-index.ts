/**
 * Skill catalog index: scan skills/system + skills/user → SkillRecord[].
 * Optional cache file at config.skills.indexPath.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { defaultConfig, EvocodeConfig } from '../core/config';
import { detectPersona, normalizeTrigger, parseSkillDocument, syntheticTriggersFromDescription } from './frontmatter';
import { InjectMode, SkillRecord, SkillSource, SkillTier } from './types';

const LAB_PATH_RE =
  /(attack|exploit|pentest|red-team|redteam|active-directory-attacks|password-spray|c2-|malware|weaponiz|lateral-movement|privilege-escalation|kerberoast|mimikatz|metasploit|payload-gen|phishing-kit)/i;

/** Known packs for UI toggles (id → label RU) */
export const PACK_CATALOG: Array<{ id: string; label: string; description: string }> = [
  { id: 'evocode-core', label: 'Эвокод core', description: 'Privacy, operator, local LLM, DLP, authoring' },
  { id: 'dev-frontend', label: 'Frontend', description: 'React, Angular, UI, a11y' },
  { id: 'dev-backend', label: 'Backend', description: 'API, DB, services' },
  { id: 'devops', label: 'DevOps', description: 'K8s, Docker, CI/CD' },
  { id: 'security', label: 'Security', description: 'Audit, threat modeling (без lab)' },
  { id: 'docs', label: 'Документы', description: 'MD, PPTX, operator docs' },
  { id: 'agent', label: 'Agent', description: 'Orchestration, multi-agent' },
  { id: 'data', label: 'Data', description: 'ETL, analytics' },
  { id: 'seo-growth', label: 'SEO / growth', description: 'Marketing, SEO clusters' },
  { id: 'web3', label: 'Web3', description: 'Solidity, DeFi' },
  { id: 'science', label: 'Science', description: 'Viz, papers, research' },
  { id: 'general', label: 'General', description: 'Прочее / uncategorized' },
];

const PACK_RULES: Array<{ re: RegExp; pack: string; domain: string }> = [
  { re: /^evocode-/, pack: 'evocode-core', domain: 'general' },
  { re: /angular|react|vue|frontend|css|tailwind|a11y|accessibility|ui-ux|nextjs|svelte/, pack: 'dev-frontend', domain: 'frontend' },
  { re: /backend|api|node|django|fastapi|graphql|postgres|sql|database/, pack: 'dev-backend', domain: 'backend' },
  { re: /k8s|kubernetes|docker|devops|helm|terraform|gitops|ci-cd|deploy/, pack: 'devops', domain: 'devops' },
  { re: /security|owasp|threat|vuln|secure|audit|stride|dlp|crypto/, pack: 'security', domain: 'security' },
  { re: /seo|marketing|sales|hr|pricing|growth/, pack: 'seo-growth', domain: 'business' },
  { re: /solidity|web3|defi|blockchain|nft/, pack: 'web3', domain: 'backend' },
  { re: /scientific|latex|phylogen|pandas|jupyter|matplotlib|research/, pack: 'science', domain: 'research' },
  { re: /agent|orchestr|multi-agent|subagent|llm|prompt/, pack: 'agent', domain: 'agent' },
  { re: /pptx|docx|pdf|markdown|slides|poster|document|obsidian/, pack: 'docs', domain: 'docs' },
  { re: /data|etl|airflow|spark|vector|embed/, pack: 'data', domain: 'data' },
];

function inferPackDomain(name: string, filePath: string): { pack: string; domain: string } {
  const hay = `${name} ${filePath}`.toLowerCase();
  for (const rule of PACK_RULES) {
    if (rule.re.test(hay)) return { pack: rule.pack, domain: rule.domain };
  }
  return { pack: 'general', domain: 'general' };
}

function inferTier(name: string, filePath: string, explicit?: SkillTier): SkillTier {
  if (explicit) return explicit;
  if (LAB_PATH_RE.test(filePath) || LAB_PATH_RE.test(name)) return 'lab';
  if (name.startsWith('evocode-')) return 'core';
  return 'optional';
}

function inferInjectMode(chars: number, layer: string | undefined, explicit?: InjectMode): InjectMode {
  if (explicit) return explicit;
  if (chars > 12_000) return 'summary_only';
  if (layer && /master|macro|fractal/i.test(layer)) return 'core_plus_toc';
  if (chars > 6_000) return 'core_plus_toc';
  return 'core_only';
}

function walkSkillFiles(dir: string): string[] {
  const out: string[] = [];
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
        // skip nested copies like skill/skills/skill
        walk(full);
      } else if (entry.name === 'SKILL.md') {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

function loadDir(dir: string, source: SkillSource, maxCoreDefault: number): SkillRecord[] {
  const files = walkSkillFiles(dir);
  const out: SkillRecord[] = [];

  for (const full of files) {
    let content: string;
    try {
      content = fs.readFileSync(full, 'utf-8');
    } catch {
      continue;
    }
    const fallbackName = path.basename(path.dirname(full));
    const parsed = parseSkillDocument(content, fallbackName);
    const name = (parsed.name || fallbackName).trim();
    const { pack: inferredPack, domain: inferredDomain } = inferPackDomain(name, full);
    const chars = content.length;

    const triggers = new Set<string>();
    triggers.add(normalizeTrigger(name.replace(/-/g, ' ')));
    triggers.add(normalizeTrigger(name));
    for (const t of parsed.triggers) {
      if (t) triggers.add(t);
    }
    // synthetic only if no real triggers beyond name
    if (parsed.triggers.length === 0 && parsed.description) {
      for (const t of syntheticTriggersFromDescription(parsed.description)) {
        triggers.add(t);
      }
    }

    const tier = inferTier(name, full, parsed.tier);
    const injectMode = inferInjectMode(chars, parsed.layer, parsed.injectMode);
    const persona = parsed.persona ?? detectPersona(parsed.body);
    const risk =
      parsed.risk ||
      (tier === 'lab' ? 'offensive' : 'low');

    out.push({
      name,
      path: full,
      source,
      version: parsed.version,
      description: parsed.description,
      content,
      body: parsed.body,
      triggers: [...triggers].filter(Boolean),
      tier,
      domain: (parsed.domain || inferredDomain).toLowerCase(),
      pack: (parsed.pack || inferredPack).toLowerCase(),
      lang: parsed.lang.length ? parsed.lang : ['en'],
      mutex: parsed.mutex,
      priority: parsed.priority ?? (tier === 'core' ? 70 : 50),
      maxInjectChars: parsed.maxInjectChars ?? maxCoreDefault,
      injectMode,
      persona,
      risk,
      subskills: parsed.subskills,
      chars,
    });
  }
  return out;
}

export class SkillIndex {
  private config: EvocodeConfig;
  private records: SkillRecord[] | null = null;

  constructor(config?: Partial<EvocodeConfig>) {
    this.config = config
      ? ({ ...defaultConfig, ...config, skills: { ...defaultConfig.skills, ...(config.skills || {}) } } as EvocodeConfig)
      : defaultConfig;
  }

  /** user overrides system by name */
  build(force = false): SkillRecord[] {
    if (this.records && !force) return this.records;

    const maxCore = this.config.skills.maxSkillCoreChars ?? 4000;
    const system = loadDir(this.config.skills.systemPath, 'system', maxCore);
    const user = loadDir(this.config.skills.userPath, 'user', maxCore);

    const byName = new Map<string, SkillRecord>();
    // Prefer non-community paths when same name from system
    const rankPath = (p: string) => {
      let s = 0;
      if (p.includes('-community')) s -= 2;
      if (p.includes('-official')) s += 1;
      if (p.includes(`${path.sep}evocode`)) s += 2;
      return s;
    };

    for (const rec of system) {
      const prev = byName.get(rec.name);
      if (!prev || rankPath(rec.path) >= rankPath(prev.path)) {
        byName.set(rec.name, rec);
      }
    }
    for (const rec of user) {
      byName.set(rec.name, rec); // user always wins
    }

    this.records = [...byName.values()];
    this.persistMeta(this.records);
    return this.records;
  }

  getAll(force = false): SkillRecord[] {
    return this.build(force);
  }

  invalidate(): void {
    this.records = null;
  }

  private persistMeta(records: SkillRecord[]): void {
    try {
      const indexPath = this.config.skills.indexPath || '.evocode/skills-index.json';
      const dir = path.dirname(path.resolve(indexPath));
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const slim = records.map((r) => ({
        name: r.name,
        path: r.path,
        source: r.source,
        version: r.version,
        description: r.description.slice(0, 240),
        triggers: r.triggers.slice(0, 24),
        tier: r.tier,
        domain: r.domain,
        pack: r.pack,
        lang: r.lang,
        mutex: r.mutex,
        priority: r.priority,
        maxInjectChars: r.maxInjectChars,
        injectMode: r.injectMode,
        persona: r.persona,
        risk: r.risk,
        subskills: r.subskills,
        chars: r.chars,
        contentHash: crypto.createHash('sha256').update(r.content).digest('hex').slice(0, 16),
      }));
      const payload = {
        version: 2 as const,
        builtAt: new Date().toISOString(),
        count: slim.length,
        skills: slim,
      };
      fs.writeFileSync(indexPath, JSON.stringify(payload, null, 0), { encoding: 'utf-8', mode: 0o600 });
    } catch {
      /* cache is best-effort */
    }
  }
}

export const skillIndex = new SkillIndex();
