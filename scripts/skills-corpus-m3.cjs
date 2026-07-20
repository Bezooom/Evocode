#!/usr/bin/env node
/**
 * M3 Skill corpus hygiene CLI (Router v2).
 *
 *   node scripts/skills-corpus-m3.cjs report
 *   node scripts/skills-corpus-m3.cjs codemod [--write]
 *   node scripts/skills-corpus-m3.cjs quarantine-dups [--write]
 *   node scripts/skills-corpus-m3.cjs all [--write] [--quarantine]
 */
const fs = require('fs');
const path = require('path');
const {
  buildReport,
  extractAllTriggers,
  findDuplicates,
  inferPackDomain,
  inferTier,
  rebuildSkillFile,
  scanCorpus,
  scalarField,
  splitFrontmatter,
} = require('./lib/skills-corpus.cjs');

const ROOT = process.env.EVOCODE_ROOT || path.resolve(__dirname, '..');
const SYSTEM = path.join(ROOT, 'skills', 'system');
const USER = path.join(ROOT, 'skills', 'user');
const ARCHIVE_DUPES = path.join(ROOT, 'skills', '.archive', 'dupes');
const REPORT_DIR = path.join(ROOT, '.evocode');

function parseArgs() {
  const a = process.argv.slice(2);
  const cmd = a.find((x) => !x.startsWith('-')) || 'report';
  const limitIdx = a.indexOf('--limit');
  return {
    cmd,
    write: a.includes('--write'),
    quarantine: a.includes('--quarantine'),
    json: a.includes('--json'),
    limit: limitIdx >= 0 ? Number(a[limitIdx + 1]) || 0 : 0,
  };
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true, mode: 0o700 });
}

function writeReport(report) {
  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, 'skills-m3-report.json');
  const mdPath = path.join(REPORT_DIR, 'skills-m3-report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  const md = [
    `# Skills corpus M3 report`,
    ``,
    `Generated: ${report.generatedAt}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Count | ${report.count} |`,
    `| Size median / p90 / max | ${report.size.median} / ${report.size.p90} / ${report.size.max} |`,
    `| Mega (>12k) | ${report.size.megaOver12k} |`,
    `| Missing any triggers | ${report.triggers.missingAny} |`,
    `| Missing top-level triggers | ${report.triggers.missingTopLevel} |`,
    `| Duplicate names | ${report.duplicates.length} |`,
    ``,
    `## By pack`,
    ``,
    ...Object.entries(report.byPack)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- **${k}**: ${v}`),
    ``,
    `## By tier`,
    ``,
    ...Object.entries(report.byTier).map(([k, v]) => `- **${k}**: ${v}`),
    ``,
    `## Largest`,
    ``,
    ...report.largest.map((s) => `- ${s.chars} \`${s.name}\` — \`${path.relative(ROOT, s.path)}\``),
    ``,
    `## Duplicates (keep → drop)`,
    ``,
    ...report.duplicates.slice(0, 40).map(
      (d) =>
        `- **${d.name}** keep \`${path.relative(ROOT, d.keep)}\` drop ${d.drop
          .map((x) => `\`${path.relative(ROOT, x)}\``)
          .join(', ')}`
    ),
    report.duplicates.length > 40 ? `\n… +${report.duplicates.length - 40} more\n` : '',
    ``,
  ].join('\n');
  fs.writeFileSync(mdPath, md, { mode: 0o600 });
  return { jsonPath, mdPath };
}

function cmdReport(opts) {
  const skills = scanCorpus(SYSTEM, USER);
  const report = { generatedAt: new Date().toISOString(), root: ROOT, ...buildReport(skills) };
  const paths = writeReport(report);
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Skills: ${report.count}`);
    console.log(
      `Size median=${report.size.median} p90=${report.size.p90} max=${report.size.max} mega=${report.size.megaOver12k}`
    );
    console.log(
      `Triggers missingAny=${report.triggers.missingAny} missingTopLevel=${report.triggers.missingTopLevel}`
    );
    console.log(`Duplicates: ${report.duplicates.length}`);
    console.log(`Report → ${paths.mdPath}`);
  }
  return report;
}

function cmdCodemod(opts) {
  const skills = scanCorpus(SYSTEM, USER);
  let changed = 0;
  let examined = 0;
  const samples = [];
  const list = opts.limit ? skills.slice(0, opts.limit) : skills;

  for (const s of list) {
    examined++;
    let content;
    try {
      content = fs.readFileSync(s.path, 'utf-8');
    } catch {
      continue;
    }
    const { fm } = splitFrontmatter(content);
    const name = s.name;
    const { pack, domain } = inferPackDomain(name, s.path);
    const tier = inferTier(name, s.path, scalarField(fm, 'tier')?.toLowerCase());
    const triggers = extractAllTriggers(fm);
    triggers.push(name.replace(/-/g, ' '));

    const result = rebuildSkillFile(content, {
      triggers,
      pack: s.pack || pack,
      domain: s.domain || domain,
      tier,
      doTriggers: true,
      doTags: true,
      fallbackName: name,
    });

    if (!result.changed) continue;
    changed++;
    if (samples.length < 12) samples.push({ path: path.relative(ROOT, s.path), reasons: result.reasons });
    if (opts.write) fs.writeFileSync(s.path, result.content, 'utf-8');
  }

  console.log(
    `Codemod ${opts.write ? 'APPLIED' : 'DRY-RUN'}: examined=${examined} changed=${changed}`
  );
  for (const s of samples) console.log(`  - ${s.path} [${s.reasons.join(', ')}]`);
  if (!opts.write) console.log('Re-run with --write to apply.');
  return { examined, changed };
}

function cmdQuarantine(opts) {
  const skills = scanCorpus(SYSTEM, USER);
  const dups = findDuplicates(skills.filter((s) => s.source === 'system'));
  const plan = [];
  for (const d of dups) {
    for (const drop of d.drop) {
      if (!drop.path.startsWith(SYSTEM)) continue;
      const rel = path.relative(SYSTEM, path.dirname(drop.path));
      const destDir = path.join(ARCHIVE_DUPES, rel);
      plan.push({
        from: drop.path,
        to: path.join(destDir, 'SKILL.md'),
        name: d.name,
        keep: d.keep.path,
      });
    }
  }
  console.log(
    `Quarantine dups ${opts.write ? 'APPLY' : 'DRY-RUN'}: ${plan.length} paths (${dups.length} names)`
  );
  for (const p of plan.slice(0, 20)) {
    console.log(
      `  ${path.relative(ROOT, p.from)} → ${path.relative(ROOT, p.to)} (keep ${path.relative(ROOT, p.keep)})`
    );
  }
  if (plan.length > 20) console.log(`  … +${plan.length - 20} more`);

  let moved = 0;
  if (opts.write) {
    for (const p of plan) {
      ensureDir(path.dirname(p.to));
      let dest = p.to;
      if (fs.existsSync(dest)) dest = path.join(path.dirname(p.to), `SKILL.${Date.now()}.md`);
      fs.renameSync(p.from, dest);
      let dir = path.dirname(p.from);
      for (let i = 0; i < 4; i++) {
        try {
          if (fs.readdirSync(dir).length === 0 && dir.startsWith(SYSTEM) && dir !== SYSTEM) {
            fs.rmdirSync(dir);
            dir = path.dirname(dir);
          } else break;
        } catch {
          break;
        }
      }
      moved++;
    }
    console.log(`Moved ${moved} → skills/.archive/dupes/`);
  } else console.log('Re-run with --write to move files.');
  return { planned: plan.length, moved };
}

function main() {
  const opts = parseArgs();
  if (!fs.existsSync(SYSTEM)) {
    console.error('skills/system not found', SYSTEM);
    process.exit(1);
  }
  switch (opts.cmd) {
    case 'report':
      cmdReport(opts);
      break;
    case 'codemod':
      cmdCodemod(opts);
      break;
    case 'quarantine-dups':
      cmdQuarantine(opts);
      break;
    case 'all':
      cmdReport(opts);
      cmdCodemod(opts);
      if (opts.quarantine) cmdQuarantine(opts);
      break;
    default:
      console.error('Commands: report | codemod | quarantine-dups | all');
      process.exit(2);
  }
}

main();
