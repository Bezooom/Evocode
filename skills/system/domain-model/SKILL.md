---
name: domain-model
description: |
  [RU] Сессия "grilling" плана против существующей domain-модели проекта: уточнение терминологии, обновление CONTEXT.md и ADR прямо по ходу кристаллизации решений. Используй когда пользователь хочет стресс-тест плана против языка и зафиксированных решений проекта.
  [EN] Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.
triggers:
  - стресс-тест плана
  - domain модель
  - проверить против CONTEXT
  - ADR обновить
  - domain model
  - CONTEXT.md
  - ADR
disable-model-invocation: true
---

# Domain Model

Push your plan against the project's domain model. The goal is to make sure your plan uses the right language, respects the right boundaries, and doesn't contradict existing decisions.

## Process

### 1. Read the domain model

Start by reading:
- `CONTEXT.md` (or `README.md`) — project overview
- `UBIQUITOUS_LANGUAGE.md` — domain glossary
- `docs/adr/` — architecture decisions
- Any other domain-specific files

### 2. Present your plan in domain language

Restate the user's plan using the project's domain terms, not your own.

### 3. Grilling

Ask about each decision:

- **Terminology**: "You said 'user' — does that mean the same thing as 'customer' in CONTEXT.md?"
- **Boundaries**: "Does this cross the payment domain boundary?"
- **Consistency**: "This contradicts ADR-003. Want to keep the old decision or update it?"
- **Completeness**: "What about the edge case where X? Did we cover that?"

### 4. Update documentation

As decisions crystallize, update:
- `CONTEXT.md` — if the domain model changed
- `UBIQUITOUS_LANGUAGE.md` — if terminology changed
- `docs/adr/` — new ADRs for significant decisions

### 5. Summary

Present a summary of all decisions and documentation updates.

## Tips

- Be opinionated. Don't present options — present recommendations.
- Reference specific documents by name: "This aligns with ADR-007 about X."
- Don't let the user hand-wave through decisions. Push on each one.
- If the user disagrees with your recommendation, update the docs, don't just note the disagreement.
