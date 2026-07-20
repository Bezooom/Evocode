# Авторство навыков Эвокод (Skill Router v2)

Краткое руководство для авторов `SKILL.md`. Полный контракт: [`specs/SKILL_ROUTER_V2.md`](../specs/SKILL_ROUTER_V2.md).

## Где лежат навыки

| Путь | Назначение |
|------|------------|
| `skills/system/<name>/SKILL.md` | Системные (sync / seed) |
| `skills/user/<name>/SKILL.md` | Пользовательские **оверрайды** (не затираются sync) |
| Seed pack `evocode-*` | Product core: privacy, operator, local LLM, DLP, authoring |

User с тем же `name` **перекрывает** system.

## Минимальный шаблон

```yaml
---
name: my-skill
version: "1.0.0"
description: >
  [RU] Одна–три фразы, когда применять.
  [EN] When to apply.
tier: optional          # core | optional | lab | banned
domain: backend         # frontend|backend|devops|security|docs|agent|…
pack: dev-backend       # см. packs в UI / PACK_CATALOG
lang: [ru, en]
persona: false
inject_mode: core_only  # core_only | core_plus_toc | summary_only
priority: 50            # 0–100
triggers:
  - my multi word phrase
  - моя фраза
  - keyword
---

# Заголовок

## When to use
## When NOT to use
## Procedure
## Constraints
## Verification
```

## Правила Router v2

1. **Triggers** — фразы (лучше multi-word), RU+EN. Не полагайтесь на «все слова description».
2. **Core ≤ ~4 KB** — детали в `sub-skills/*.md`, в core только пути.
3. **Persona** — не пишите «You are an Elite…» без `persona: true` (и не злоупотребляйте).
4. **Lab** — offensive/attack skills: path heuristics + `tier: lab`; auto off без «Lab» в UI.
5. **Mega-files** (>12 KB) автоматически `summary_only`.
6. Проверка: вкладка **Навыки → Проверить route** или:

```bash
curl -s http://127.0.0.1:8083/v1/skills/route \
  -H 'Content-Type: application/json' \
  -d '{"query":"моя фраза","mode":"dev"}' | jq .
```

Переиндексация после правок на диске:

```bash
curl -s -X POST http://127.0.0.1:8083/v1/skills/reindex
```

## Packs (UI)

В **Настройки → Навыки** можно включать/выключать packs и lab.  
`tier: core` (в т.ч. `evocode-*`) участвует в route даже если pack снят (product guarantees).

## Seed skills `evocode-core`

| name | Зачем |
|------|--------|
| `evocode-privacy-policy` | local-first, always-local, pilot-ready wording |
| `evocode-operator-docs` | HTML/MD preview, режим оператора |
| `evocode-local-llm` | порты, profiles, runtime |
| `evocode-dlp-privacy` | DLP mask/block, audit |
| `evocode-skills-authoring` | этот процесс |

## Антипаттерны

- 400 KB macro dump в один SKILL.md  
- Только EN triggers в RU-продукте  
- Дубли `name` (community vs official) без канона  
- Offensive skills без `lab`  
- «Always apply this skill forever»  

## M3: hygiene корпуса

```bash
npm run skills:m3:report           # отчёт → .evocode/skills-m3-report.md
npm run skills:m3:codemod          # dry-run: top-level triggers + pack/tier/domain
npm run skills:m3:codemod:write    # применить codemod
npm run skills:m3:quarantine       # dry-run дубликатов
npm run skills:m3:quarantine:write # в skills/.archive/dupes/
```

Дубликаты: канон `*-official` / `evocode-*` / короткий path; community/nested → archive.

## M4: hybrid embeddings

Router смешивает lexical score + cosine по embeddings (`name+description+triggers`).

```bash
# rebuild vectors (hash backend by default)
curl -s -X POST http://127.0.0.1:8083/v1/skills/reindex -H 'Content-Type: application/json' -d '{"forceEmbed":true}'

# dry-run shows reasons embed:0.42
curl -s http://127.0.0.1:8083/v1/skills/route -H 'Content-Type: application/json' \
  -d '{"query":"angular signal forms"}' | jq '.selected'
```

| Env | Default | Meaning |
|-----|---------|---------|
| `EVOCODE_SKILLS_EMBED` | `true` | hybrid on/off |
| `EVOCODE_SKILLS_EMBED_BACKEND` | `hash` | `hash` offline · `inference` nomic/llama |
| `EVOCODE_SKILLS_EMBED_WEIGHT` | `40` | max score from cosine |

DB: `.evocode/skills-embeddings.db` (sqlite-vec).

## См. также

- RFC: `specs/SKILL_ROUTER_V2.md`  
- Sync: `specs/skill_sync_engine.md`  
- Примеры (legacy): `docs/examples_SKILL.md`  
