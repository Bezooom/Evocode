import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillLoader } from '../../src/skills/skill-loader';
import { defaultConfig } from '../../src/core/config';

const SEED = [
  'evocode-privacy-policy',
  'evocode-operator-docs',
  'evocode-local-llm',
  'evocode-dlp-privacy',
  'evocode-skills-authoring',
];

describe('M2 seed pack evocode-core', () => {
  const systemPath = path.join(process.cwd(), 'skills', 'system');

  it('seed SKILL.md files exist', () => {
    for (const name of SEED) {
      const p = path.join(systemPath, name, 'SKILL.md');
      expect(fs.existsSync(p)).toBe(true);
    }
  });

  it('routes RU operator / privacy / dlp queries to seed skills', () => {
    const loader = new SkillLoader({
      skills: {
        ...defaultConfig.skills,
        systemPath,
        userPath: path.join(process.cwd(), 'skills', 'user'),
        routerVersion: 'v2',
        enableLab: false,
        enabledPacks: ['evocode-core'],
        minScore: 15,
        maxSkills: 2,
        indexPath: path.join(os.tmpdir(), `m2-seed-${Date.now()}.json`),
      },
    } as any);

    const cases: Array<[string, string]> = [
      ['режим оператора предпросмотр html документ', 'evocode-operator-docs'],
      ['always-local приватность offline', 'evocode-privacy-policy'],
      ['dlp guard маскировка api key', 'evocode-dlp-privacy'],
      ['запусти локальную модель llama runtime', 'evocode-local-llm'],
      ['написать навык SKILL.md frontmatter triggers', 'evocode-skills-authoring'],
    ];

    for (const [q, expectName] of cases) {
      const r = loader.route(q);
      const names = r.selected.map((s) => s.skill.name);
      expect(names).toContain(expectName);
    }
  });

  it('applyConfig updates enableLab', () => {
    const loader = new SkillLoader({
      skills: {
        ...defaultConfig.skills,
        systemPath,
        userPath: path.join(process.cwd(), 'skills', 'user'),
        enableLab: false,
        indexPath: path.join(os.tmpdir(), `m2-lab-${Date.now()}.json`),
      },
    } as any);
    loader.applyConfig({
      skills: { ...defaultConfig.skills, systemPath, enableLab: true },
    } as any);
    // smoke: no throw + reindex works
    expect(loader.reindex().count).toBeGreaterThan(10);
  });
});
