---
name: evocode-skills-authoring
triggers:
  - evocode skills authoring
  - authoring skill
  - написать навык
  - создать навык
  - формат навыка
  - skill router
  - frontmatter
  - skill.md
  - triggers
version: "1.0.0"
description: >-
  [RU] Как писать SKILL.md для Эвокод Router v2: frontmatter, triggers, tier, packs.
  [EN] Authoring SKILL.md for Evocode Skill Router v2.
tier: core
domain: agent
pack: evocode-core
lang: [ru, en]
priority: 75
persona: false
inject_mode: core_only
max_inject_chars: 3500
---

# Эвокод: авторство навыков (Router v2)

## When to use

- Создание/правка `SKILL.md`, triggers, packs, tier.
- Почему навык не активируется.

## When NOT to use

- Просто «сделай feature» без skill-системы.

## Procedure

1. Читай контракт: `specs/SKILL_ROUTER_V2.md` + `docs/SKILL_AUTHORING.md`.
2. **Обязательные поля:** `name`, `description`, `triggers` (список фраз RU+EN), `tier`, `pack`.
3. **Core body ≤ 4KB:** When to use / NOT / Procedure / Constraints / Verification.
4. **Не** писать «You are an Elite…» без `persona: true` (и только если нужен).
5. Fractal: детали в `sub-skills/*.md`, в core — только paths.
6. Проверка: `POST /v1/skills/route` с тестовым query; `POST /v1/skills/reindex`.
7. User overrides: `skills/user/<name>/SKILL.md` перекрывает system.

## Minimal template

```yaml
---
name: my-skill
version: "1.0.0"
description: >
  [RU] …
  [EN] …
tier: optional
pack: dev-backend
domain: backend
triggers:
  - my phrase
  - моя фраза
persona: false
---
# Title
## When to use
## When NOT to use
## Procedure
## Constraints
```

## Constraints

- `tier: lab` — offensive; не в default packs.
- Дубли `name` — user wins; иначе path heuristics.
- Mega-files (>12KB) → auto `summary_only`.

## Verification

- [ ] Dry-run route выбирает skill по trigger phrase.
- [ ] Inject chars разумны (< 4k core).
