import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillLoader } from '../../src/skills/skill-loader';

describe('SkillLoader', () => {
  let tmp: string;
  let loader: SkillLoader;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evocode-skills-'));
    const sys = path.join(tmp, 'system', 'tdd');
    const user = path.join(tmp, 'user', 'tdd');
    fs.mkdirSync(sys, { recursive: true });
    fs.mkdirSync(user, { recursive: true });
    fs.writeFileSync(
      path.join(sys, 'SKILL.md'),
      '---\nname: tdd\ndescription: Test driven development\n---\n# System TDD\n'
    );
    fs.writeFileSync(
      path.join(user, 'SKILL.md'),
      '---\nname: tdd\ndescription: User override TDD\n---\n# User TDD\n'
    );
    fs.mkdirSync(path.join(tmp, 'system', 'other'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, 'system', 'other', 'SKILL.md'),
      '---\nname: other-skill\ndescription: something else\n---\n# Other\n'
    );

    loader = new SkillLoader({
      skills: {
        systemPath: path.join(tmp, 'system'),
        userPath: path.join(tmp, 'user'),
        backupPath: path.join(tmp, 'backup'),
        archivePath: path.join(tmp, 'archive'),
        maxInjectChars: 50_000,
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

  it('inject выбирает релевантные навыки', () => {
    const { text, skills } = loader.buildInjection('помоги с tdd и тестами');
    expect(skills.some((s) => s.name === 'tdd')).toBe(true);
    expect(text).toContain('Активные навыки');
  });
});
