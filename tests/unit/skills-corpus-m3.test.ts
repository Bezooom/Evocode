import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require(path.resolve(process.cwd(), 'scripts/lib/skills-corpus.cjs'));

describe('skills-corpus M3 helpers', () => {
  it('extractAllTriggers reads metadata list and inline', () => {
    const fm = `name: demo
metadata:
  triggers:
    - angular forms
    - signal forms
triggers: [legacy, one]
`;
    const t = lib.extractAllTriggers(fm);
    expect(t).toEqual(expect.arrayContaining(['angular forms', 'signal forms', 'legacy', 'one']));
  });

  it('ensureTopLevelTriggers inserts YAML list', () => {
    const fm = `name: demo-skill
description: x
`;
    const { fm: next, changed } = lib.ensureTopLevelTriggers(fm, ['demo skill', 'foo bar']);
    expect(changed).toBe(true);
    expect(next).toMatch(/name: demo-skill\ntriggers:/);
    expect(next).toContain('- demo skill');
  });

  it('rebuildSkillFile adds pack tags and triggers', () => {
    const content = `---
name: angular-forms
description: forms
metadata:
  triggers:
    - angular forms
---
# Body
`;
    const r = lib.rebuildSkillFile(content, {
      triggers: ['angular forms'],
      pack: 'dev-frontend',
      domain: 'frontend',
      tier: 'optional',
      doTriggers: true,
      doTags: true,
    });
    expect(r.changed).toBe(true);
    expect(r.content).toMatch(/^triggers:/m);
    expect(r.content).toMatch(/^pack: dev-frontend/m);
    expect(r.content).toContain('# Body');
  });

  it('findDuplicates keeps higher rank path', () => {
    const skills = [
      {
        name: 'docx',
        path: '/repo/skills/system/docx-community/SKILL.md',
        rank: lib.rankCanonicalPath('/repo/skills/system/docx-community/SKILL.md'),
        source: 'system',
      },
      {
        name: 'docx',
        path: '/repo/skills/system/docx-official/SKILL.md',
        rank: lib.rankCanonicalPath('/repo/skills/system/docx-official/SKILL.md'),
        source: 'system',
      },
    ];
    const dups = lib.findDuplicates(skills);
    expect(dups).toHaveLength(1);
    expect(dups[0].keep.path).toContain('official');
    expect(dups[0].drop[0].path).toContain('community');
  });

  it('codemod preserves body and triggers', () => {
    const content = `---
name: demo-skill
description: Demo
metadata:
  triggers:
    - demo skill
    - hello world
---
# Demo
`;
    const r1 = lib.rebuildSkillFile(content, {
      triggers: lib.extractAllTriggers(lib.splitFrontmatter(content).fm),
      pack: 'general',
      domain: 'general',
      tier: 'optional',
      doTriggers: true,
      doTags: true,
    });
    expect(r1.changed).toBe(true);
    const t = lib.extractAllTriggers(lib.splitFrontmatter(r1.content).fm);
    expect(t).toEqual(expect.arrayContaining(['demo skill', 'hello world']));
    expect(r1.content).toContain('# Demo');
  });

  it('scanCorpus finds temp skills', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm3-scan-'));
    const dir = path.join(tmp, 'foo');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      `---
name: foo-bar
description: Foo
---
# Foo
`
    );
    const skills = lib.scanCorpus(tmp, '');
    expect(skills.length).toBe(1);
    expect(skills[0].name).toBe('foo-bar');
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
