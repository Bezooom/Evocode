/**
 * Skill corpus hygiene helpers (M3 / Skill Router v2).
 * Pure-ish functions for scan, dedup, frontmatter codemod.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_PATH_RE =
  /(attack|exploit|pentest|red-team|redteam|active-directory-attacks|password-spray|c2-|malware|weaponiz|lateral-movement|privilege-escalation|kerberoast|mimikatz|metasploit|payload-gen|phishing-kit)/i;

const PACK_RULES = [
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

function inferPackDomain(name, filePath = '') {
  const hay = `${name} ${filePath}`.toLowerCase();
  for (const rule of PACK_RULES) {
    if (rule.re.test(hay)) return { pack: rule.pack, domain: rule.domain };
  }
  return { pack: 'general', domain: 'general' };
}

function inferTier(name, filePath, explicit) {
  if (explicit) return explicit;
  if (LAB_PATH_RE.test(filePath) || LAB_PATH_RE.test(name)) return 'lab';
  if (name.startsWith('evocode-')) return 'core';
  return 'optional';
}

function splitFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { fm: '', body: content, has: false };
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { fm: '', body: content, has: false };
  const fm = content.slice(4, end).replace(/^\n/, '');
  let body = content.slice(end + 4);
  if (body.startsWith('\n')) body = body.slice(1);
  return { fm, body, has: true };
}

function unquote(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function normalizeTrigger(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s/+._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Collect all triggers from FM (top-level + metadata nested). */
function extractAllTriggers(fm) {
  const triggers = new Set();
  const lines = fm.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inline = line.match(/^\s*triggers:\s*\[([^\]]*)\]\s*$/i);
    if (inline) {
      for (const p of inline[1].split(',')) {
        const n = normalizeTrigger(unquote(p));
        if (n) triggers.add(n);
      }
      continue;
    }
    if (!/^\s*triggers:\s*$/i.test(line)) continue;
    const baseIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^\s*$/.test(l)) continue;
      const indent = (l.match(/^(\s*)/) || ['', ''])[1].length;
      const item = l.match(/^\s*-\s+(.+)$/);
      if (item && indent > baseIndent) {
        const n = normalizeTrigger(unquote(item[1]));
        if (n) triggers.add(n);
      } else if (indent <= baseIndent) break;
    }
  }
  return [...triggers];
}

function scalarField(fm, field) {
  const m = fm.match(new RegExp(`^${field}:\\s*(.+)$`, 'im'));
  if (!m) return undefined;
  let v = m[1].trim();
  if (v === '|' || v === '>' || v === '>-' || v === '|-') {
    const lines = fm.split(/\r?\n/);
    const idx = lines.findIndex((l) => new RegExp(`^${field}:\\s*`).test(l));
    if (idx === -1) return undefined;
    const collected = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\S/.test(line) && !line.startsWith(' ')) break;
      if (/^\s*$/.test(line)) continue;
      collected.push(line.replace(/^\s+/, ''));
    }
    return collected.join(' ').replace(/\s+/g, ' ').trim();
  }
  return unquote(v);
}

function hasTopLevelTriggersList(fm) {
  // top-level only: line starts without deep indent (0-1 spaces) before triggers
  return /^(triggers:\s*(\[[^\]]*\]|\s*$))/m.test(fm);
}

function walkSkillFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (current) => {
    let entries;
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
      } else if (entry.name === 'SKILL.md') {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

function rankCanonicalPath(p) {
  let s = 0;
  if (p.includes(`${path.sep}evocode-`)) s += 50;
  if (p.includes('-official')) s += 20;
  if (p.includes('-community')) s -= 20;
  if (p.includes(`${path.sep}skills${path.sep}skills${path.sep}`)) s -= 10;
  // fewer path segments preferred
  s -= p.split(path.sep).length;
  // prefer shorter names dirs
  s -= Math.floor(p.length / 50);
  return s;
}

/**
 * Inject or merge top-level triggers: YAML list after name (or at start of FM).
 */
function ensureTopLevelTriggers(fm, triggers) {
  const uniq = [...new Set(triggers.map(normalizeTrigger).filter(Boolean))].sort(
    (a, b) => b.length - a.length || a.localeCompare(b)
  );
  if (!uniq.length) return { fm, changed: false };

  const existing = extractAllTriggers(fm).map(normalizeTrigger).filter(Boolean).sort(
    (a, b) => b.length - a.length || a.localeCompare(b)
  );
  const sameSet =
    existing.length === uniq.length && existing.every((t, i) => t === uniq[i]);
  // already has top-level triggers block with same set
  if (sameSet && /^triggers:\s*$/m.test(fm)) {
    return { fm, changed: false };
  }

  const block = ['triggers:', ...uniq.map((t) => `  - ${t}`)].join('\n');

  const lines = fm.split(/\r?\n/);
  const out = [];
  let skipList = false;
  let skipBase = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipList) {
      const indent = (line.match(/^(\s*)/) || ['', ''])[1].length;
      if (/^\s*$/.test(line)) continue;
      if (indent > skipBase && (/^\s*-/.test(line) || indent > skipBase)) continue;
      skipList = false;
    }
    // only strip TOP-LEVEL triggers (indent 0)
    if (/^triggers:\s*\[/.test(line)) continue;
    if (/^triggers:\s*$/.test(line)) {
      skipList = true;
      skipBase = 0;
      continue;
    }
    out.push(line);
  }

  let newFm = out.join('\n').replace(/\n{3,}/g, '\n\n');
  if (/^name:\s*/m.test(newFm)) {
    newFm = newFm.replace(/^(name:\s*.+)$/m, `$1\n${block}`);
  } else {
    newFm = `${block}\n${newFm}`;
  }
  newFm = newFm.trimEnd() + '\n';
  const changed = newFm.trim() !== fm.trim();
  return { fm: newFm, changed };
}

function ensurePackTags(fm, { pack, domain, tier }) {
  let changed = false;
  let next = fm;
  const ensure = (field, value) => {
    if (!value) return;
    if (new RegExp(`^${field}:\\s*`, 'im').test(next)) return;
    next = next.replace(/^(name:\s*.+)$/m, `$1\n${field}: ${value}`);
    if (!new RegExp(`^${field}:\\s*`, 'im').test(next)) {
      next = `${field}: ${value}\n${next}`;
    }
    changed = true;
  };
  ensure('tier', tier);
  ensure('pack', pack);
  ensure('domain', domain);
  return { fm: next, changed };
}

function rebuildSkillFile(content, { triggers, pack, domain, tier, doTriggers, doTags, fallbackName }) {
  const { fm, body, has } = splitFrontmatter(content);
  if (!has) {
    // synthesize minimal FM
    const name = (fallbackName || 'unknown').replace(/[^a-zA-Z0-9._-]+/g, '-');
    let newFm = `name: ${name}\n`;
    if (doTriggers && triggers?.length) {
      newFm += ['triggers:', ...triggers.map((t) => `  - ${t}`)].join('\n') + '\n';
    }
    if (doTags) {
      if (tier) newFm += `tier: ${tier}\n`;
      if (pack) newFm += `pack: ${pack}\n`;
      if (domain) newFm += `domain: ${domain}\n`;
    }
    return {
      content: `---\n${newFm}---\n${body}`,
      changed: true,
      reasons: ['added_frontmatter'],
    };
  }

  let nextFm = fm;
  const reasons = [];
  const allTrig = extractAllTriggers(fm);
  const merged = [...new Set([...(triggers || []), ...allTrig])];

  if (doTriggers) {
    const nameSlug = (scalarField(fm, 'name') || '').replace(/-/g, ' ');
    if (nameSlug) merged.push(normalizeTrigger(nameSlug));
    const r = ensureTopLevelTriggers(nextFm, merged);
    if (r.changed || !hasTopLevelTriggersList(fm)) {
      nextFm = r.fm;
      reasons.push('top_level_triggers');
    }
  }
  if (doTags) {
    const r = ensurePackTags(nextFm, { pack, domain, tier });
    if (r.changed) {
      nextFm = r.fm;
      reasons.push('pack_tags');
    }
  }

  const newContent = `---\n${nextFm.trim()}\n---\n${body.startsWith('\n') ? body : body}`;
  // normalize ending
  const normalized = newContent.replace(/\n+$/, '\n');
  const changed = normalized !== content.replace(/\n+$/, '\n');
  return { content: normalized, changed, reasons };
}

function scanCorpus(systemPath, userPath = '') {
  const files = [
    ...walkSkillFiles(systemPath).map((p) => ({ path: p, source: 'system' })),
    ...(userPath ? walkSkillFiles(userPath).map((p) => ({ path: p, source: 'user' })) : []),
  ];

  const skills = [];
  for (const f of files) {
    let content;
    try {
      content = fs.readFileSync(f.path, 'utf-8');
    } catch {
      continue;
    }
    const { fm, has } = splitFrontmatter(content);
    const fallback = path.basename(path.dirname(f.path));
    const name = (scalarField(fm, 'name') || fallback).trim();
    const triggers = extractAllTriggers(fm);
    const { pack: ipack, domain: idomain } = inferPackDomain(name, f.path);
    const tier =
      inferTier(name, f.path, scalarField(fm, 'tier')?.toLowerCase()) || 'optional';
    skills.push({
      path: f.path,
      source: f.source,
      name,
      chars: content.length,
      hasFrontmatter: has,
      triggers,
      triggerCount: triggers.length,
      hasTopLevelTriggers: hasTopLevelTriggersList(fm),
      pack: scalarField(fm, 'pack') || ipack,
      domain: scalarField(fm, 'domain') || idomain,
      tier: scalarField(fm, 'tier')?.toLowerCase() || tier,
      inferredPack: ipack,
      inferredDomain: idomain,
      inferredTier: inferTier(name, f.path),
      contentHash: crypto.createHash('sha256').update(content).digest('hex').slice(0, 12),
      rank: rankCanonicalPath(f.path) + (f.source === 'user' ? 100 : 0),
    });
  }
  return skills;
}

function findDuplicates(skills) {
  const byName = new Map();
  for (const s of skills) {
    if (!byName.has(s.name)) byName.set(s.name, []);
    byName.get(s.name).push(s);
  }
  const dups = [];
  for (const [name, list] of byName) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => b.rank - a.rank);
    dups.push({
      name,
      keep: sorted[0],
      drop: sorted.slice(1),
    });
  }
  return dups.sort((a, b) => b.drop.length - a.drop.length);
}

function buildReport(skills) {
  const sizes = skills.map((s) => s.chars).sort((a, b) => a - b);
  const p = (q) => sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * q))] || 0;
  const byPack = {};
  const byTier = {};
  let missingTriggers = 0;
  let missingTopLevel = 0;
  let mega = 0;
  for (const s of skills) {
    byPack[s.pack] = (byPack[s.pack] || 0) + 1;
    byTier[s.tier] = (byTier[s.tier] || 0) + 1;
    if (s.triggerCount === 0) missingTriggers++;
    if (!s.hasTopLevelTriggers) missingTopLevel++;
    if (s.chars > 12000) mega++;
  }
  const dups = findDuplicates(skills);
  return {
    count: skills.length,
    size: {
      min: sizes[0] || 0,
      median: p(0.5),
      p90: p(0.9),
      max: sizes[sizes.length - 1] || 0,
      sum: sizes.reduce((a, b) => a + b, 0),
      megaOver12k: mega,
    },
    triggers: {
      missingAny: missingTriggers,
      missingTopLevel,
      withTriggers: skills.length - missingTriggers,
    },
    byPack,
    byTier,
    duplicates: dups.map((d) => ({
      name: d.name,
      keep: d.keep.path,
      drop: d.drop.map((x) => x.path),
    })),
    largest: [...skills]
      .sort((a, b) => b.chars - a.chars)
      .slice(0, 15)
      .map((s) => ({ name: s.name, chars: s.chars, path: s.path })),
  };
}

module.exports = {
  inferPackDomain,
  inferTier,
  splitFrontmatter,
  normalizeTrigger,
  extractAllTriggers,
  scalarField,
  hasTopLevelTriggersList,
  walkSkillFiles,
  rankCanonicalPath,
  ensureTopLevelTriggers,
  ensurePackTags,
  rebuildSkillFile,
  scanCorpus,
  findDuplicates,
  buildReport,
  LAB_PATH_RE,
  PACK_RULES,
};
