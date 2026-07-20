/**
 * Multi-dialect frontmatter parser for SKILL.md (Router v2).
 * No external YAML dependency — covers formats found in the corpus.
 */
import {
  InjectMode,
  SkillSubskillRef,
  SkillTier,
} from './types';

export interface ParsedFrontmatter {
  name?: string;
  version?: string;
  description: string;
  triggers: string[];
  tier?: SkillTier;
  domain?: string;
  pack?: string;
  lang: string[];
  mutex: string[];
  priority?: number;
  maxInjectChars?: number;
  injectMode?: InjectMode;
  persona?: boolean;
  risk?: 'low' | 'medium' | 'high' | 'offensive';
  category?: string;
  layer?: string;
  subskills: SkillSubskillRef[];
  raw: Record<string, string>;
  body: string;
  hasFrontmatter: boolean;
}

const STOPWORDS = new Set(
  [
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'you', 'are', 'was',
    'were', 'been', 'being', 'have', 'has', 'had', 'will', 'would', 'could', 'should',
    'skill', 'using', 'when', 'where', 'what', 'which', 'into', 'about', 'than', 'then',
    'them', 'they', 'their', 'there', 'these', 'those', 'also', 'only', 'just', 'over',
    'such', 'through', 'after', 'before', 'between', 'under', 'again', 'further',
    'для', 'при', 'или', 'как', 'это', 'что', 'чтобы', 'если', 'также', 'более', 'между',
    'через', 'после', 'перед', 'когда', 'который', 'которая', 'которые', 'навык', 'используй',
    'use', 'used', 'uses', 'using', 'make', 'made', 'need', 'needs', 'help', 'work', 'works',
    'task', 'tasks', 'code', 'based', 'provide', 'provides', 'including', 'include',
    // high-frequency domain noise — must not become synthetic triggers
    'review', 'reviews', 'request', 'requests', 'development', 'developer', 'develop',
    'testing', 'tests', 'project', 'projects', 'application', 'system', 'systems',
    'guide', 'guides', 'pattern', 'patterns', 'modern', 'build', 'building', 'create',
    'creating', 'implement', 'implementation', 'support', 'supports', 'framework',
    'service', 'services', 'component', 'components', 'script', 'scripts', 'engine',
    'expert', 'elite', 'master', 'comprehensive', 'complete', 'best', 'practice',
    'practices', 'workflow', 'workflows', 'management', 'process', 'processes',
  ].map((w) => w.toLowerCase())
);

export function normalizeTrigger(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s/+._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitFrontmatter(content: string): { fm: string; body: string; has: boolean } {
  if (!content.startsWith('---')) {
    return { fm: '', body: content, has: false };
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return { fm: '', body: content, has: false };
  }
  const fm = content.slice(4, end).replace(/^\n/, '');
  let body = content.slice(end + 4);
  if (body.startsWith('\n')) body = body.slice(1);
  return { fm, body, has: true };
}

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Extract scalar field from FM text (first match). */
function scalarField(fm: string, field: string): string | undefined {
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'im');
  const m = fm.match(re);
  if (!m) return undefined;
  let v = m[1].trim();
  if (v === '|' || v === '>' || v === '>-' || v === '|-') {
    // multiline — gather indented lines after this
    const lines = fm.split(/\r?\n/);
    const idx = lines.findIndex((l) => new RegExp(`^${field}:\\s*`).test(l));
    if (idx === -1) return undefined;
    const collected: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\S/.test(line) && !line.startsWith(' ')) break;
      if (/^\s*$/.test(line)) {
        collected.push('');
        continue;
      }
      collected.push(line.replace(/^\s+/, ''));
    }
    return collected.join(' ').replace(/\s+/g, ' ').trim();
  }
  return unquote(v);
}

/**
 * Collect list items after a `key:` line (inline [a,b] or YAML `- item`).
 */
function listField(fm: string, field: string): string[] {
  const out: string[] = [];
  const lines = fm.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // field: [a, b]
    const inline = line.match(new RegExp(`^\\s*${field}:\\s*\\[([^\\]]*)\\]\\s*$`, 'i'));
    if (inline) {
      out.push(
        ...inline[1]
          .split(',')
          .map((s) => unquote(s))
          .filter(Boolean)
      );
      continue;
    }
    // field: then indented dashes OR field nested under metadata
    const keyOnly = line.match(new RegExp(`^(\\s*)${field}:\\s*$`, 'i'));
    if (keyOnly) {
      const baseIndent = keyOnly[1].length;
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j];
        if (/^\s*$/.test(l)) continue;
        const indent = (l.match(/^(\s*)/) || ['', ''])[1].length;
        if (indent <= baseIndent && /^\S/.test(l.trim()) && !l.trim().startsWith('-')) break;
        const item = l.match(/^\s*-\s+(.+)$/);
        if (item) out.push(unquote(item[1]));
        else if (indent <= baseIndent) break;
      }
    }
  }
  return out;
}

/** All trigger lists: top-level + any nested `triggers:` under metadata */
function extractAllTriggers(fm: string): string[] {
  const triggers = new Set<string>();
  for (const t of listField(fm, 'triggers')) {
    const n = normalizeTrigger(t);
    if (n) triggers.add(n);
  }
  // also scan every "triggers:" occurrence with following list (metadata block)
  const lines = fm.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*triggers:\s*/i.test(lines[i])) continue;
    const inline = lines[i].match(/triggers:\s*\[([^\]]*)\]/i);
    if (inline) {
      for (const p of inline[1].split(',')) {
        const n = normalizeTrigger(unquote(p));
        if (n) triggers.add(n);
      }
      continue;
    }
    const baseIndent = (lines[i].match(/^(\s*)/) || ['', ''])[1].length;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^\s*$/.test(l)) continue;
      const indent = (l.match(/^(\s*)/) || ['', ''])[1].length;
      const item = l.match(/^\s*-\s+(.+)$/);
      if (item && indent > baseIndent) {
        const n = normalizeTrigger(unquote(item[1]));
        if (n) triggers.add(n);
      } else if (indent <= baseIndent) {
        break;
      }
    }
  }
  return [...triggers];
}

function extractSubskills(fm: string): SkillSubskillRef[] {
  // Very light: look for subskills: list of path: lines — optional for M1
  const refs: SkillSubskillRef[] = [];
  const lines = fm.split(/\r?\n/);
  let inSub = false;
  let base = 0;
  let current: SkillSubskillRef | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*subskills:\s*$/i.test(line)) {
      inSub = true;
      base = (line.match(/^(\s*)/) || ['', ''])[1].length;
      continue;
    }
    if (!inSub) continue;
    const indent = (line.match(/^(\s*)/) || ['', ''])[1].length;
    if (/^\S/.test(line) && indent <= base && !line.trim().startsWith('-')) {
      inSub = false;
      continue;
    }
    const pathM = line.match(/^\s*-\s+path:\s*(.+)$/i) || line.match(/^\s+path:\s*(.+)$/i);
    if (pathM) {
      if (current?.path) refs.push(current);
      current = { path: unquote(pathM[1]) };
      continue;
    }
    const titleM = line.match(/^\s+title:\s*(.+)$/i);
    if (titleM && current) current.title = unquote(titleM[1]);
  }
  if (current?.path) refs.push(current);
  return refs;
}

function parseBool(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  const s = v.toLowerCase();
  if (['true', 'yes', '1'].includes(s)) return true;
  if (['false', 'no', '0'].includes(s)) return false;
  return undefined;
}

function parseTier(v: string | undefined): SkillTier | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase() as SkillTier;
  if (['core', 'optional', 'lab', 'banned'].includes(s)) return s;
  return undefined;
}

function parseInjectMode(v: string | undefined): InjectMode | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase() as InjectMode;
  if (['core_only', 'core_plus_toc', 'summary_only'].includes(s)) return s;
  return undefined;
}

/** Synthetic triggers from description — limited, stopword-filtered (NOT every word). */
export function syntheticTriggersFromDescription(description: string, max = 12): string[] {
  const words = description
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w));
  const uniq: string[] = [];
  for (const w of words) {
    if (!uniq.includes(w)) uniq.push(w);
    if (uniq.length >= max) break;
  }
  return uniq;
}

export function parseSkillDocument(content: string, fallbackName: string): ParsedFrontmatter {
  const { fm, body, has } = splitFrontmatter(content);
  const name = scalarField(fm, 'name') || fallbackName;
  let description = scalarField(fm, 'description') || '';
  // strip [RU]/[EN] noise for length but keep text
  description = description.replace(/\s+/g, ' ').trim();

  const triggers = extractAllTriggers(fm);
  const langList = listField(fm, 'lang');
  const mutex = listField(fm, 'mutex').map(normalizeTrigger);

  const priorityRaw = scalarField(fm, 'priority');
  const maxInjRaw = scalarField(fm, 'max_inject_chars') || scalarField(fm, 'maxInjectChars');

  const raw: Record<string, string> = {};
  for (const key of ['name', 'version', 'category', 'layer', 'tier', 'domain', 'pack', 'risk']) {
    const v = scalarField(fm, key);
    if (v) raw[key] = v;
  }

  return {
    name,
    version: scalarField(fm, 'version'),
    description,
    triggers,
    tier: parseTier(scalarField(fm, 'tier')),
    domain: scalarField(fm, 'domain') || scalarField(fm, 'category'),
    pack: scalarField(fm, 'pack'),
    lang: langList.length ? langList.map((l) => l.toLowerCase()) : [],
    mutex,
    priority: priorityRaw ? Number(priorityRaw) || undefined : undefined,
    maxInjectChars: maxInjRaw ? Number(maxInjRaw) || undefined : undefined,
    injectMode: parseInjectMode(scalarField(fm, 'inject_mode') || scalarField(fm, 'injectMode')),
    persona: parseBool(scalarField(fm, 'persona')),
    risk: (() => {
      const r = (scalarField(fm, 'risk') || '').toLowerCase();
      if (['low', 'medium', 'high', 'offensive'].includes(r)) return r as ParsedFrontmatter['risk'];
      return undefined;
    })(),
    category: scalarField(fm, 'category'),
    layer: scalarField(fm, 'layer'),
    subskills: extractSubskills(fm),
    raw,
    body,
    hasFrontmatter: has,
  };
}

/** Detect persona tone in body when flag missing */
export function detectPersona(body: string): boolean {
  return /\byou are an?\b/i.test(body) || /\bты\s*[—\-–]\s*/i.test(body) || /\byour role\b/i.test(body);
}
