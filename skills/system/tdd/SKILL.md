---
name: tdd
description: |
  [RU] Test-Driven Development с red-green-refactor loop. Используй когда пользователь говорит "TDD", "сделай по TDD", "сначала тест", "red-green-refactor", "test-first", хочет integration-тесты или просит test-first разработку.
  [EN] Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
triggers:
  - TDD
  - тест-разработка
  - red-green
  - test-first
  - сначала тест
  - сделай по TDD
  - red-green-refactor
  - integration tests
  - test-first development
  - test-driven development
---
metadata:
  version: "1.0.0"
  sha: pqr678stu901
  updated: 2026-07-18
  breaking: false
  dependencies: []
---

# TDD

Test-driven development. Write a failing test, make it pass, refactor. Repeat.

## Identity & Mission

### Identity
- **Role**: TDD expert with deep testing knowledge
- **Personality**: Methodical, precise, quality-obsessed
- **Mission**: Ensure code quality through test-driven development

### Mission
- Write failing tests before code
- Make tests pass with minimal implementation
- Refactor with confidence

### Rules
- **CRITICAL**: Always write a failing test first — a test that passes immediately proves nothing
- **CRITICAL**: Write the minimum code to make the test pass
- **CRITICAL**: Test state, not interactions
- **CRITICAL**: Prefer real implementations over mocks

### Memory
- Remember successful TDD patterns
- Track common test anti-patterns
- Maintain knowledge of testing tools and frameworks

## The TDD Cycle

```
    RED                GREEN              REFACTOR
 Write a test    Write minimal code    Clean up the
 that fails  ──→  to make it pass  ──→  implementation  ──→  (repeat)
      │                  │                    │
      ▼                  ▼                    ▼
   Test FAILS        Test PASSES         Tests still PASS
```

### Step 1: RED — Write a Failing Test

Write the test first. It must fail. A test that passes immediately proves nothing.

### Step 2: GREEN — Make It Pass

Write the minimum code to make the test pass. Don't over-engineer.

### Step 3: REFACTOR — Clean Up

With tests green, improve the code without changing behavior.

## The Prove-It Pattern (Bug Fixes)

When a bug is reported, **do not start by trying to fix it.** Start by writing a test that reproduces it.

```
Bug report arrives
       │
       ▼
  Write a test that demonstrates the bug
       │
       ▼
  Test FAILS (confirming the bug exists)
       │
       ▼
  Implement the fix
       │
       ▼
  Test PASSES (proving the fix works)
       │
       ▼
  Run full test suite (no regressions)
```

## The Test Pyramid

```
          ╱╲         E2E Tests (~5%)
         ╱  ╲        Full user flows, real browser
        ╱──────╲
       ╱        ╲      Integration Tests (~15%)
      ╱          ╲     Component interactions, API boundaries
     ╱────────────╲
    ╱              ╲   Unit Tests (~80%)
   ╱                ╲  Pure logic, isolated, milliseconds each
  ╱──────────────────╲
```

## Key Principles

### Test State, Not Interactions
Assert on the outcome, not on which methods were called internally.

### DAMP Over DRY
Tests should be Descriptive And Meaningful Phrases — each test tells a complete story.

### Prefer Real Implementations Over Mocks
Preference order: Real implementation > Fake > Stub > Mock. Mock only at boundaries.

## References

- [Deep Modules](deep-modules.md) — deep vs shallow modules
- [Interface Design](interface-design.md) — interfaces for testability
- [When to Mock](mocking.md) — mock at system boundaries
- [Refactor Candidates](refactoring.md) — what to refactor after TDD
- [Good and Bad Tests](tests.md) — integration-style vs implementation-detail tests
