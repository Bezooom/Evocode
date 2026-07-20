import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  cosineSimilarity,
  hashEmbed,
  skillEmbedText,
  SkillEmbeddingStore,
} from '../../src/skills/skill-embeddings';
import { SkillLoader } from '../../src/skills/skill-loader';
import { defaultConfig } from '../../src/core/config';

describe('hashEmbed / cosine', () => {
  it('similar texts have higher cosine than unrelated', () => {
    const a = hashEmbed('angular forms signal validation form');
    const b = hashEmbed('angular signal forms component validation');
    const c = hashEmbed('kubernetes helm chart deploy cluster');
    const simAb = cosineSimilarity(a, b);
    const simAc = cosineSimilarity(a, c);
    expect(simAb).toBeGreaterThan(simAc);
    expect(simAb).toBeGreaterThan(0.15);
  });

  it('skillEmbedText includes name and triggers', () => {
    const t = skillEmbedText({
      name: 'evocode-operator-docs',
      description: 'operator preview',
      triggers: ['режим оператора', 'html preview'],
      domain: 'docs',
      pack: 'evocode-core',
    });
    expect(t).toContain('evocode operator docs');
    expect(t).toContain('режим оператора');
  });
});

describe('SkillEmbeddingStore + hybrid route', () => {
  let tmp: string;
  let dbPath: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-emb-'));
    dbPath = path.join(tmp, 'emb.db');
    const write = (name: string, body: string) => {
      const dir = path.join(tmp, 'system', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), body);
    };
    write(
      'angular-forms',
      `---
name: angular-forms
description: Signal forms Angular validation
triggers:
  - angular forms
  - signal forms
pack: dev-frontend
domain: frontend
---
# Angular Forms
`
    );
    write(
      'kubernetes-architect',
      `---
name: kubernetes-architect
description: Kubernetes cluster design helm
triggers:
  - kubernetes
  - helm chart
pack: devops
domain: devops
---
# K8s
`
    );
    write(
      'unrelated-cooking',
      `---
name: unrelated-cooking
description: Cooking recipes pasta
triggers:
  - pasta recipe
pack: general
domain: general
---
# Cooking
`
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('store sync + search returns related skill', async () => {
    const store = new SkillEmbeddingStore(dbPath);
    const loader = new SkillLoader({
      skills: {
        ...defaultConfig.skills,
        systemPath: path.join(tmp, 'system'),
        userPath: path.join(tmp, 'user'),
        useEmbeddings: true,
        embeddingsDbPath: dbPath,
        embedBackend: 'hash',
        indexPath: path.join(tmp, 'idx.json'),
        enabledPacks: [],
      },
    } as any);
    const skills = loader.listDetailed(true);
    const stats = await store.sync(skills, hashEmbed);
    expect(stats.upserted).toBeGreaterThanOrEqual(3);
    const hits = store.search(hashEmbed('angular signal forms validation'), 5);
    expect(hits[0].name).toBe('angular-forms');
    store.close();
  });

  it('hybrid route prefers angular over cooking for forms query', async () => {
    const loader = new SkillLoader({
      skills: {
        ...defaultConfig.skills,
        systemPath: path.join(tmp, 'system'),
        userPath: path.join(tmp, 'user'),
        useEmbeddings: true,
        embeddingsDbPath: dbPath,
        embedBackend: 'hash',
        embedWeight: 50,
        embedMinCosine: 0.12,
        minScore: 10,
        maxSkills: 2,
        indexPath: path.join(tmp, 'idx2.json'),
        enabledPacks: [],
      },
    } as any);
    await loader.ensureEmbeddings(hashEmbed, { force: true });
    const r = await loader.routeAsync('help with angular signal forms validation', {
      embedFn: hashEmbed,
    });
    const names = r.selected.map((s) => s.skill.name);
    expect(names).toContain('angular-forms');
    expect(names).not.toContain('unrelated-cooking');
    expect(r.selected.some((s) => s.reasons.some((x) => x.startsWith('embed')))).toBe(true);
  });
});
