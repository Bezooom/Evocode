import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillLoader } from '../../src/skills/skill-loader';
import { parseSkillDocument, normalizeTrigger } from '../../src/skills/frontmatter';
import { defaultConfig } from '../../src/core/config';

describe('frontmatter parse', () => {
  it('parses metadata.triggers YAML list', () => {
    const doc = `---
name: demo-skill
description: Demo skill for forms
metadata:
  triggers:
    - angular forms
    - signal forms
    - angular форма
---
# Body
Hello
`;
    const p = parseSkillDocument(doc, 'demo-skill');
    expect(p.name).toBe('demo-skill');
    expect(p.triggers.some((t) => t.includes('angular forms'))).toBe(true);
    expect(p.triggers.some((t) => t.includes('angular'))).toBe(true);
    expect(normalizeTrigger('Ёлка')).toBe('елка');
  });

  it('parses inline triggers array', () => {
    const doc = `---
name: caveman
triggers: [caveman, be brief, меньше токенов]
---
# x
`;
    const p = parseSkillDocument(doc, 'caveman');
    expect(p.triggers).toEqual(expect.arrayContaining(['caveman', 'be brief', 'меньше токенов']));
  });
});

describe('SkillRouter v2 (fixture corpus)', () => {
  let tmp: string;
  let loader: SkillLoader;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evocode-router-'));
    const write = (name: string, content: string) => {
      const dir = path.join(tmp, 'system', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
    };

    write(
      'angular-forms',
      `---
name: angular-forms
description: Signal forms for Angular
metadata:
  triggers:
    - angular forms
    - angular форма
    - signal forms
tier: optional
pack: dev-frontend
domain: frontend
---
# Angular Forms
Use signal forms.
`
    );
    write(
      'unity-development',
      `---
name: unity-development
description: Unity game engine development and code review of C# scripts for games
triggers: [unity, game engine, csharp game]
---
# Unity
`
    );
    write(
      'code-reviewer',
      `---
name: code-reviewer
description: Elite code review expert for pull requests
metadata:
  triggers:
    - code review
    - код ревью
    - pull request
---
# Code Reviewer
You are an elite code review expert.
`
    );
    write(
      'pptx',
      `---
name: pptx
description: Create PowerPoint presentations
triggers: [pptx, presentation, презентация, slides]
pack: docs
domain: docs
---
# PPTX
`
    );
    write(
      'active-directory-attacks',
      `---
name: active-directory-attacks
description: AD attack techniques
---
# Attacks
`
    );
    write(
      'tdd',
      `---
name: tdd
description: Test driven development
triggers: [tdd, test driven]
---
# System TDD
`
    );
    fs.mkdirSync(path.join(tmp, 'user', 'tdd'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, 'user', 'tdd', 'SKILL.md'),
      `---
name: tdd
description: User override TDD
triggers: [tdd, test driven]
---
# User TDD
`
    );

    loader = new SkillLoader({
      skills: {
        systemPath: path.join(tmp, 'system'),
        userPath: path.join(tmp, 'user'),
        backupPath: path.join(tmp, 'backup'),
        archivePath: path.join(tmp, 'archive'),
        maxInjectChars: 50_000,
        maxSkills: 2,
        maxSkillCoreChars: 4000,
        enableLab: false,
        enabledPacks: [],
        routerVersion: 'v2',
        minScore: 15,
        indexPath: path.join(tmp, 'skills-index.json'),
      },
    } as any);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('user override перекрывает system', () => {
    const all = loader.loadAll();
    const tdd = all.find((s) => s.name === 'tdd');
    expect(tdd?.source).toBe('user');
    expect(tdd?.content).toContain('User TDD');
  });

  it('inject выбирает angular-forms по RU/EN triggers', () => {
    const { skills, text } = loader.buildInjection('почини angular форма signal forms');
    expect(skills.some((s) => s.name === 'angular-forms')).toBe(true);
    expect(text).toContain('Активные навыки');
  });

  it('code review не уходит в unity', () => {
    const route = loader.route('код ревью pull request code review');
    const names = route.selected.map((s) => s.skill.name);
    expect(names).toContain('code-reviewer');
    expect(names).not.toContain('unity-development');
  });

  it('presentation matches pptx', () => {
    const route = loader.route('создай презентацию pptx');
    expect(route.selected.some((s) => s.skill.name === 'pptx')).toBe(true);
  });

  it('lab skills filtered by default', () => {
    const route = loader.route('active directory attacks pentest');
    expect(route.selected.every((s) => s.skill.name !== 'active-directory-attacks')).toBe(true);
  });

  it('explicit skill bypasses weak query', () => {
    const route = loader.route('zzz', { explicitSkills: ['pptx'] });
    expect(route.selected.some((s) => s.skill.name === 'pptx')).toBe(true);
  });

  it('persona cap: only one persona skill', () => {
    const dir = path.join(tmp, 'system', 'security-auditor');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      `---
name: security-auditor
description: security audit owasp
triggers: [security, owasp, audit]
persona: true
---
# Sec
You are an elite security architect.
`
    );
    loader.invalidate();
    const route = loader.route('security audit owasp code review', { maxSkills: 3 });
    const personas = route.selected.filter((s) => s.skill.persona);
    expect(personas.length).toBeLessThanOrEqual(1);
  });

  it('budget truncates mega skill', () => {
    const big = path.join(tmp, 'system', 'backend-engineering');
    fs.mkdirSync(big, { recursive: true });
    fs.writeFileSync(
      path.join(big, 'SKILL.md'),
      `---
name: backend-engineering
description: backend engineering apis
triggers: [backend engineering, api design]
---
# Backend
${'line of backend guidance\n'.repeat(5000)}
`
    );
    const small = new SkillLoader({
      skills: {
        systemPath: path.join(tmp, 'system'),
        userPath: path.join(tmp, 'user'),
        backupPath: path.join(tmp, 'backup'),
        archivePath: path.join(tmp, 'archive'),
        maxInjectChars: 3000,
        maxSkills: 1,
        maxSkillCoreChars: 800,
        enableLab: false,
        enabledPacks: [],
        routerVersion: 'v2',
        minScore: 10,
        indexPath: path.join(tmp, 'idx2.json'),
      },
    } as any);
    const { text, skills } = small.buildInjection('backend engineering api design');
    expect(skills.some((s) => s.name === 'backend-engineering')).toBe(true);
    expect(text.length).toBeLessThanOrEqual(3200);
  });
});

describe('SkillRouter golden (real corpus if present)', () => {
  const systemPath = path.join(process.cwd(), 'skills', 'system');
  const goldenPath = path.join(process.cwd(), 'tests', 'fixtures', 'skills', 'golden-routes.json');
  const hasCorpus = fs.existsSync(systemPath) && fs.existsSync(goldenPath);

  (hasCorpus ? it : it.skip)(
    'precision@1 >= 60% on golden set',
    () => {
      const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8')) as Array<{
        id: string;
        query: string;
        expectAnyOf: string[];
        reject?: string[];
        allowEmpty?: boolean;
      }>;

      const loader = new SkillLoader({
        skills: {
          ...defaultConfig.skills,
          systemPath,
          userPath: path.join(process.cwd(), 'skills', 'user'),
          routerVersion: 'v2',
          maxSkills: 2,
          minScore: 15,
          enableLab: false,
          enabledPacks: [],
          indexPath: path.join(os.tmpdir(), `evocode-golden-idx-${Date.now()}.json`),
        },
      } as any);

      let hits = 0;
      let total = 0;
      const failures: string[] = [];

      for (const g of golden) {
        const route = loader.route(g.query);
        const names = route.selected.map((s) => s.skill.name);
        if (g.allowEmpty && g.expectAnyOf.length === 0) {
          total++;
          if (names.length === 0 || (route.selected[0]?.score ?? 0) < 40) hits++;
          else failures.push(`${g.id}: expected empty-ish got ${names.join(',')}`);
          continue;
        }
        total++;
        const ok = g.expectAnyOf.some((e) =>
          names.some((n) => n === e || n.startsWith(e) || n.includes(e))
        );
        const bad = (g.reject || []).some((r) => names.includes(r));
        if (ok && !bad) hits++;
        else
          failures.push(
            `${g.id}: got [${names.join(', ')}] scores=${route.selected.map((s) => s.score).join(',')}`
          );
      }

      const precision = hits / total;
      if (precision < 0.6) {
        throw new Error(`precision@1 ${precision.toFixed(2)} < 0.6\n${failures.join('\n')}`);
      }
      expect(precision).toBeGreaterThanOrEqual(0.6);
    },
    120_000
  );
});
