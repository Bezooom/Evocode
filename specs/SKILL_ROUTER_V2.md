# RFC: Skill Router v2 + контракт frontmatter

| Поле | Значение |
|------|----------|
| **ID** | EVOCODE-RFC-SKILL-ROUTER-V2 |
| **Статус** | **M1–M4 Implemented** (2026-07-20) |
| **Продукт** | Эвокод ≥ 0.9.0-rc1 → 1.0.1 / 1.1 |
| **Дата** | 2026-07-20 |
| **Авторы** | product + Core |
| **Связано** | `src/skills/skill-loader.ts`, `src/sync/skill-sync.ts`, `specs/skill_sync_engine.md`, `docs/STATUS.md` |
| **Не цель** | Переписать agent runtime (Kilo/OpenCode); второй MCP host |

---

## 0. Резюме (executive)

Сейчас на диске **~870 `SKILL.md` (~103 MB)** — сильный актив.  
Runtime (`SkillLoader.buildInjection`) **не раскрывает** актив:

1. Парсит `triggers: [...]` top-level; реальные skills кладут триггеры в `metadata.triggers` / YAML-list → **матчинг ≈ по словам description**.
2. В prompt целиком льётся `content` (лимит **12 000** символов, top‑3) — macro-skills **200–450 KB** не влезают / режутся бессмысленно.
3. **~214 persona** («You are Elite…») конфликтуют при multi-inject; **роль продукта** (privacy / Operator / RU) не отделена.
4. **~490 fractal `sub-skills/`** не индексируются — агенту говорят «прочитай файл», Core inject этого не обеспечивает.
5. **RU-запросы** промахиваются (корпус ~97% EN-ish).
6. Offensive/lab skills рядом с core → риск ложного activate.

**Skill Router v2** делает skills **конкурентным преимуществом**: точный выбор 1–2 playbook’ов + короткий core + опциональный tool-read sub-modules, одна policy-роль, tier-пакеты, измеримый hit-rate.

---

## 1. Проблема (as-is)

### 1.1. Pipeline сегодня

```
user query
   → skillLoader.buildInjection(query)   # score triggers/desc words, top 3
   → concat full SKILL.md into system
   → (+ RAG code) → router local|cloud → inference
```

Файл: `src/skills/skill-loader.ts`  
Конфиг: `skills.maxInjectChars = 12_000`.

### 1.2. Наблюдаемые симптомы (зафиксированы аудитом 2026-07-20)

| Симптом | Пример / метрика |
|---------|------------------|
| Triggers не работают | `metadata.triggers` игнорируется; top-level `triggers` ~40/870 |
| Ложный hit | «код ревью PR» → `unity-development` |
| Miss RU | «создай презентацию» → 0 skills (есть pptx/slides) |
| Token waste | inject full body; mega-files 100× лимита |
| Role war | 2–3 «You are…» в одном system |
| Dead depth | 490 sub-skills dirs, 0 nested SKILL.md в inject graph |
| Dup names | brand-guidelines ×3, docx/pptx official vs community |
| Empty user layer | `skills/user` = 0 |

### 1.3. Цели v2 (DoD)

| # | Цель | Метрика |
|---|------|---------|
| G1 | Precision@1 на golden set ≥ 70% | 30 queries (RU+EN, dev+operator) |
| G2 | Mean inject size ≤ 6 KB (chars) | p95 ≤ 10 KB |
| G3 | 0 persona-конфликтов в default policy | max 1 active persona skill |
| G4 | Sub-skill reachable | core inject + explicit paths for tool-read |
| G5 | Backward compatible | старые SKILL.md грузятся (degraded), не падают |
| G6 | Security tiers | lab/banned не auto-activate без flag |

Non-goals v2.0: полный rewrite корпуса; ML-router на GPU; marketplace UI.

---

## 2. Принципы дизайна

1. **Skill ≠ Role.**  
   - **Role/Policy** — один system-контракт продукта (Эвокод: privacy, RU, Operator|Dev).  
   - **Skill** — процедурный playbook на задачу, без «ты теперь навсегда Elite X».

2. **Short core, deep on demand.**  
   В prompt — ≤ N символов core. Fractal modules — через **read_file / skill tool**, не dump.

3. **Router first, corpus second.**  
   50 well-routed skills > 870 poorly routed.

4. **Explicit > implicit.**  
   `/skill name`, pin в UI, pack enable — сильнее auto.

5. **User > system > sync remote.**  
   Уже так по name; расширить на priority/tier.

6. **Fail closed on risk.**  
   `tier: lab|banned` не в auto без `EVOCODE_SKILLS_ALLOW_LAB=1`.

7. **Измеримость.**  
   Каждый inject пишет audit: query hash, skill ids, scores, chars.

---

## 3. Архитектура v2

```
                    ┌──────────────────────────┐
                    │  Product Role / Policy   │
                    │  (always, not a skill)   │
                    └────────────┬─────────────┘
                                 │
     query / mode / pins ───────►│
                                 ▼
                    ┌──────────────────────────┐
                    │     Skill Index          │
                    │  .evocode/skills-index   │
                    │  (rebuild on sync/boot)  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │     Skill Router v2      │
                    │  explicit → BM25/alias   │
                    │  → embed (optional)      │
                    │  → mutex / tier filter   │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        inject core        list paths         telemetry
        (system prompt)    for agent tools    audit.log
```

### 3.1. Модули (код)

| Модуль | Путь (предложение) | Ответственность |
|--------|--------------------|-----------------|
| `SkillFrontmatter` | `src/skills/frontmatter.ts` | Парс YAML всех диалектов → канон |
| `SkillIndex` | `src/skills/skill-index.ts` | Scan disk → index JSON + memory |
| `SkillRouter` | `src/skills/skill-router.ts` | Ranking, mutex, packs |
| `SkillInjector` | `src/skills/skill-injector.ts` | Сборка prompt-блока + budget |
| `SkillLoader` | `src/skills/skill-loader.ts` | Facade (совместимость API) |
| Config | `src/core/config.ts` | limits, packs, lab flag |

`buildInjection` остаётся публичным API; внутри — v2.

### 3.2. Когда строить index

- Startup Core (async, non-blocking health).  
- После `POST /v1/skills/sync` / invalidate.  
- `POST /v1/skills/reindex` (новое).  
- Файл: `.evocode/skills-index.json` (+ optional `.jsonl` для debug).

---

## 4. Канонический frontmatter (v2 contract)

### 4.1. Минимальный профиль (обязателен для «core quality»)

```yaml
---
name: angular-forms                    # kebab-case, unique in catalog
version: "1.2.0"                       # semver string
description: >-                        # 1–3 sentences; RU+EN optional blocks
  [RU] Signal Forms в Angular v21+…
  [EN] Build signal-based forms…
tier: core                             # core | optional | lab | banned
domain: frontend                       # taxonomy, see §4.4
lang: [ru, en]                         # content languages
triggers:                              # CANONICAL list (router primary)
  - angular forms
  - signal forms
  - angular форма
  - валидация формы angular
mutex: []                              # skill names that cannot co-activate
priority: 50                           # 0–100; higher wins ties
max_inject_chars: 4000                 # hard cap for THIS skill core
inject_mode: core_only                 # core_only | core_plus_toc | summary_only
persona: false                         # if true: at most one persona skill per turn
dependencies: []                       # soft; not auto-injected in v2.0
---
```

### 4.2. Расширенный профиль (optional)

```yaml
---
# ...minimal fields...
pack: dev-frontend                     # skill pack id
risk: low                              # low | medium | high | offensive
always_apply: false                    # reserved; only product policy may be always
models: []                             # hint only (opus/sonnet) — ignore in Core v2
source:
  repository: https://github.com/...
  path: skills/angular-forms
  license: MIT
subskills:                             # explicit index for tool-read
  - path: sub-skills/validation.md
    title: Validation schemas
    triggers: [validators, schema]
references:
  - path: references/form-patterns.md
compatibility:
  evocode: ">=0.9.0"
---
```

### 4.3. Тело SKILL.md (структура content)

Рекомендуемый каркас **core** (цель 1.5–4 KB):

```markdown
# <Title>

## When to use
## When NOT to use
## Procedure (steps)
## Constraints
## Sub-skills (paths only — do not inline large text)
## Verification
```

**Запрещено в core (lint warning):**

- Повторяющийся «You are an elite…» без `persona: true`.  
- Полные копии чужих skills.  
- > `max_inject_chars` полезной нагрузки (router обрежет + warning).

**Macro-skills (legacy mega-files):**  
`inject_mode: summary_only` + авто-summary (first H1 + When to use + list of `##` headings) до cap; полный файл — только tool-read.

### 4.4. Taxonomy `domain` (стартовый словарь)

| domain | Примеры |
|--------|---------|
| `frontend` | angular, react, css, a11y |
| `backend` | api, db, node |
| `devops` | k8s, ci, docker |
| `security` | audit, threat, owasp |
| `data` | etl, pandas, viz |
| `agent` | orchestration, multi-agent |
| `docs` | markdown, pptx, operator-publish |
| `business` | hr, sales, seo |
| `research` | science, latex |
| `general` | fallback |

Packs (enable/disable в config):

| pack | tier default | Назначение |
|------|--------------|------------|
| `evocode-core` | core | privacy, operator, RU product |
| `dev-frontend` | optional | web UI |
| `dev-backend` | optional | APIs |
| `security` | optional | audits (no offensive) |
| `security-lab` | lab | offensive / AD attacks |
| `seo-growth` | optional | seo-* cluster |
| `web3` | optional | solidity… |
| `science` | optional | viz, papers |

Default enabled packs (product 1.0 proposal):  
`evocode-core`, `dev-frontend`, `dev-backend`, `security` (non-lab), `docs`.  
Остальное — opt-in.

### 4.5. Совместимость со старыми форматами (adapter)

| Legacy | Mapping |
|--------|---------|
| `metadata.triggers: [..]` / YAML list | → `triggers` |
| `triggers: [a, b]` one-line | → `triggers` |
| `metadata.category` | → `domain` (map table) |
| `layer: master-skill` | → `inject_mode: core_plus_toc`, `priority: 60` |
| `version: 4.1.0-fractal` | normalize semver-ish string |
| нет triggers | synthetic: name tokens + **не** все слова description; только keywords из description через stopword filter + min length 5 + max 12 tokens |
| size > 12_000 | force `summary_only` at index time |
| name collision | prefer `skills/user` > path without `-community` > higher `priority` > lexical path |

---

## 5. Skill Router — алгоритм

### 5.1. Входы

```ts
interface RouteRequest {
  query: string;
  mode?: 'dev' | 'operator' | 'auto';  // product mode
  explicitSkills?: string[];         // /skill, UI pin
  disabledPacks?: string[];
  allowLab?: boolean;
  maxSkills?: number;                // default 2 (было 3)
  maxInjectChars?: number;           // default 8000 (ужесточить с 12k)
}
```

### 5.2. Этапы ranking

```
1. Filter catalog
   - pack enabled
   - tier != banned
   - tier != lab unless allowLab
   - domain filter by mode (operator → prefer docs/business/general)

2. Explicit skills
   - if explicitSkills non-empty → those first (validated)

3. Score candidates (hybrid)
   score = 0
   + 100 * exact name match (slug)
   + 40  * trigger phrase match (longest wins; score += len(trigger))
   + 25  * alias/RU synonym hit
   + 15  * BM25(description) normalized
   + 10  * domain boost if mode-aligned
   + priority / 10
   - 20  * if persona && already have persona
   - 30  * mutex conflict with higher-ranked
   + (optional v2.1) 20 * cosine(embed(query), embed(desc))

4. Sort desc; take maxSkills (default 2)

5. Mutex resolve
   - drop lower score on mutex pair
   - at most one persona: true

6. Budget inject
   - for each skill in order:
       payload = buildPayload(skill)  // core / toc / summary
       if total + payload > maxInjectChars: skip or truncate summary
```

### 5.3. Trigger matching (важно)

- Нормализация: lower case, ё→е, punctuation strip, collapse spaces.  
- Match = **substring phrase** (не bag-of-words description).  
- Multi-word triggers score higher (len).  
- Stopwords (EN+RU) не извлекаются в synthetic triggers:  
  `the, and, for, with, this, that, skill, using, when, для, при, или, …`

### 5.4. Payload builders

| `inject_mode` | Payload |
|---------------|---------|
| `core_only` | frontmatter stripped body, capped |
| `core_plus_toc` | body + bullet list of `subskills[].path` |
| `summary_only` | title + description + first 40 lines / headings + «Full skill path: …» |

Всегда префикс блока:

```markdown
## Skill: {name} (tier={tier}, source={system|user})
<!-- score={n}; do not adopt permanent persona unless persona=true -->
```

### 5.5. Product Role block (не skill)

Всегда (до skills), короткий fixed prompt (~1–2 KB):

- Идентичность: ассистент Эвокод.  
- Privacy: local-first; secrets; DLP.  
- Mode: Operator (docs preview) vs Dev.  
- Язык ответа: RU default.  
- Skills: «следуй активным навыкам; при необходимости читай sub-skill path».  
- **Не** менять identity на «Elite X» навсегда.

### 5.6. Default limits (config proposal)

```ts
skills: {
  // existing paths...
  maxInjectChars: 8_000,       // was 12_000
  maxSkills: 2,                // was 3
  maxSkillCoreChars: 4_000,
  enableLab: false,
  enabledPacks: ['evocode-core', 'dev-frontend', 'dev-backend', 'security', 'docs'],
  router: {
    useEmbeddings: false,      // v2.1
    minScore: 15,
    goldenTests: true,
  },
}
```

---

## 6. API / UX

### 6.1. Core HTTP

| Endpoint | Назначение |
|----------|------------|
| `GET /v1/skills` | list from **index** (name, desc, tier, pack, triggers sample) |
| `GET /v1/skills/:name` | meta + core preview |
| `POST /v1/skills/route` | body `{ query, mode }` → `{ skills, scores, injectChars }` dry-run |
| `POST /v1/skills/reindex` | rebuild index |
| `POST /v1/skills/sync` | existing + reindex |
| chat/completions path | uses Router v2 inject |

### 6.2. Product panel

- Вкладка «Навыки»: pack toggles, tier badge, last route debug.  
- «Почему активирован» (score breakdown) — trust + debug.  
- Pin skill for session.  
- Warning on mega-skill summary_only.

### 6.3. Agent-facing

- Explicit: user/agent may pass skill names in metadata later (`x-evocode-skills`).  
- Tool convention (Kilo): if skill lists `subskills`, agent **should** read path before deep work (document in product role).

---

## 7. Миграция корпуса (не блокирует router)

### Phase A — router only (no mass edit)

- Adapter frontmatter; index; new scoring.  
- Auto `summary_only` for large files.  
- Lab filter by path heuristics: `*attack*`, `active-directory-attacks`, etc. until tagged.

### Phase B — seed `evocode-core` pack (hand-written, high quality)

Минимум 8–15 skills:

| name | Назначение |
|------|------------|
| `evocode-policy` | product role companion (optional; or pure config) |
| `evocode-operator-docs` | HTML/MD operator workflows |
| `evocode-local-llm` | local inference, profiles |
| `evocode-dlp-privacy` | secrets, cloud path |
| `evocode-skills-authoring` | how to write SKILL.md v2 |
| … | org-specific |

Класть в `skills/user` или `skills/system/evocode-*` с `tier: core`, `lang: [ru, en]`, богатые RU triggers.

### Phase C — corpus hygiene (batch scripts) ✅ M3 DONE 2026-07-20

CLI: `scripts/skills-corpus-m3.cjs` · npm `skills:m3:*`

1. **Report** — size / triggers / packs / dups → `.evocode/skills-m3-report.md`  
2. **Codemod** — top-level `triggers` + `pack`/`domain`/`tier` tags (idempotent)  
3. **Quarantine dups** → `skills/.archive/dupes/` (canonical: official / evocode / rank)  
4. Strip persona / split mega-files — **deferred** (manual / M3.1)

### Phase D — embeddings (v2.1)

- Embed `name + description + triggers` offline (nomic :8084).  
- Store vectors in sqlite-vec skill table.  
- Hybrid rank; keep lexical primary for explainability.

---

## 8. Golden test set (обязательный артефакт)

Файл: `tests/fixtures/skills/golden-routes.json`

```json
[
  {
    "query": "почини баг в angular форме",
    "expectAnyOf": ["angular-forms", "angular-migration"],
    "reject": ["frontend-mobile-security-xss-scan"]
  },
  {
    "query": "код ревью pull request",
    "expectAnyOf": ["code-reviewer", "requesting-code-review", "codex-review"],
    "reject": ["unity-development"]
  },
  {
    "query": "создай презентацию",
    "expectAnyOf": ["pptx", "scientific-slides", "latex-posters"]
  },
  {
    "query": "solidity smart contract audit",
    "expectAnyOf": ["solidity-security"]
  },
  {
    "query": "hello",
    "expectAnyOf": [],
    "allowEmpty": true
  }
]
```

CI: `npm test` → `skill-router.golden.test.ts`  
DoD G1: ≥ 70% expectAnyOf hit; 0 hard reject hits.

---

## 9. Наблюдаемость и audit

Каждый inject (и dry-run route):

```json
{
  "ts": "ISO-8601",
  "queryHash": "sha256...",
  "mode": "dev",
  "selected": [
    { "name": "angular-forms", "score": 88, "chars": 3200, "mode": "core_only" }
  ],
  "rejected": [{ "name": "xss-scan", "reason": "low_score" }],
  "injectChars": 3200,
  "indexVersion": "..."
}
```

Писать в `.evocode/skills-route.log` (mode 0600), без полного query text в cloud audit (hash only; full query local debug flag).

---

## 10. Безопасность

| Риск | Митигация v2 |
|------|----------------|
| Prompt injection via skill body | Skills = trusted local files; sync already hardened; optional HTML strip |
| Offensive skill auto-activate | `tier: lab/banned` + path heuristics + pack off |
| Skill overwrites identity | Product role last-wins or first-wins sticky; persona cap 1 |
| Path traversal in subskills | resolve under skill root only (same as sync) |
| Token DoS | hard caps per skill + global |

---

## 11. План внедрения

### M1 — Router foundation (P0, ~3–5 дней) ✅ DONE 2026-07-20

- [x] `frontmatter.ts` multi-dialect parse  
- [x] `skill-index.ts` + `.evocode/skills-index.json`  
- [x] `skill-router.ts` scoring + mutex + summary_only  
- [x] Wire into `buildInjection` / chat path  
- [x] Config flags + defaults packs  
- [x] Golden tests (15 cases, real corpus precision≥60%)  
- [x] `POST /v1/skills/route` + `POST /v1/skills/reindex`  

**Exit:** G1≥60% provisional ✅ · unit 50 pass · flag `EVOCODE_SKILL_ROUTER=v1|v2`.

### M2 — Product + seed pack (~3 дня) ✅ DONE 2026-07-20

- [x] Panel: route debug, pack toggles, reindex, lab switch  
- [x] `evocode-*` core skills (RU triggers) ×5  
- [x] Lab path heuristics expanded  
- [x] Docs: `docs/SKILL_AUTHORING.md` + examples link  
- [x] `GET/POST /v1/config` skills section · `applyConfig` · user skill v2 template  


### M3 — Corpus codemod ✅ DONE 2026-07-20

- [x] `scripts/lib/skills-corpus.cjs` + `scripts/skills-corpus-m3.cjs`  
- [x] Report (size, triggers, packs, dups)  
- [x] Codemod: top-level triggers + pack/domain/tier (idempotent)  
- [x] Quarantine dups → `skills/.archive/dupes/`  
- [x] npm scripts `skills:m3:*` · unit tests  

Post-run metrics (system): **864** skills · missing triggers **0** · dups **0** · mega>12k **114**

### M4 — Embeddings hybrid ✅ DONE 2026-07-20

- [x] `src/skills/skill-embeddings.ts` — hashEmbed (offline) + sqlite-vec store  
- [x] Hybrid rank in `skill-router` (`embed:0.xx` / `embed_rescue`)  
- [x] `ensureEmbeddings` / `reindexAll` / `routeAsync` / `buildInjectionAsync`  
- [x] Config: `useEmbeddings`, `embedBackend` hash|inference, `embedWeight`  
- [x] API reindex+route hybrid; startup warm index  
- [x] Unit tests cosine + hybrid route  

Default: **hash backend** (no GPU). Set `EVOCODE_SKILLS_EMBED_BACKEND=inference` for nomic/llama embeddings.

---

## 12. Риски RFC

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Слом matching «привычных» EN-only hits | medium | golden + feature flag `SKILL_ROUTER=v1\|v2` |
| Index slow on 870 skills | low | once at boot; cache file; <2s target |
| Maintain taxonomy manually | medium | heuristics + packs opt-in |
| Authors ignore contract | high | linter script in CI for `skills/user` + evocode-core |

---

## 13. Решение / open questions

| # | Вопрос | Предложение default |
|---|--------|---------------------|
| Q1 | maxSkills 2 или 3? | **2** (меньше role war) |
| Q2 | Persona skills auto? | only if score ≥ 80 and no other persona |
| Q3 | Always-on product skill? | **нет** — product role config text, not skill |
| Q4 | Sync remote skills default pack? | import as `optional`, not `core` |
| Q5 | Operator mode forces domain filter? | **yes**: boost `docs`, demote `web3/seo` |

Требуется product sign-off Q1–Q5 перед M1 merge.

---

## 14. Acceptance (релиз Router v2 в продукте)

- [ ] Feature flag default ON in 1.0 or 0.9.1  
- [ ] Golden ≥ 70%  
- [ ] `npm test` + typecheck green  
- [ ] STATUS/CHANGELOG: «Skill Router v2»  
- [ ] Документ authoring: `docs/examples_SKILL.md` обновлён под §4  
- [ ] Dry-run route в panel или curl documented  

---

## 15. Связь с конкурентным преимуществом

| Без v2 | С v2 |
|--------|------|
| 870 файлов на диске | 870 файлов + **точный activate** |
| Случайный inject | Playbook + sub-skill paths |
| EN bag-of-words | RU aliases + triggers |
| Persona soup | One policy role |
| Склад | **Система навыков** |

Moat формулировка для пилота:

> «Эвокод не просто хранит skills — **маршрутизирует** их: короткий core, глубокие модули по требованию, политика privacy/operator, без утечки лишнего контекста.»

---

## 16. Changelog RFC

| Дата | Изменение |
|------|-----------|
| 2026-07-20 | v0.1 Draft: architecture, frontmatter, router, migration, golden, plan M1–M4 |
| 2026-07-20 | v0.2 M1 implemented: `src/skills/{frontmatter,skill-index,skill-router,types}.ts`, loader facade, API route/reindex, golden fixtures |
| 2026-07-20 | v0.3 M2: seed `evocode-*` pack, product-panel route/packs UI, SKILL_AUTHORING.md, config skills persist |
| 2026-07-20 | v0.4 M3: corpus CLI report/codemod/quarantine; 864 skills, 0 missing triggers, 0 dups |
| 2026-07-20 | v0.5 M4: hybrid skill embeddings (hash/sqlite-vec + optional inference), routeAsync/reindexAll |

---

*Конец EVOCODE-RFC-SKILL-ROUTER-V2*
