---
name: request-refactor-plan
description: Create a detailed refactor plan with tiny commits via user interview, then file it as a GitHub issue. Use when user wants to plan a refactor, create a refactoring RFC, or break a refactor into safe incremental steps.
---

# Request Refactor Plan

Create a detailed refactor plan with tiny commits via user interview, then file it as a GitHub issue.

## Process

1. Ask the user for a long, detailed description of the problem and any potential ideas for solutions.

2. Explore the repo to verify their assertions and understand the current state of the codebase.

3. Ask whether they have considered other options, and present other options.

4. Interview the user about the implementation. Be extremely detailed and thorough.

5. Hammer out the exact scope: what to change and what to leave alone.

6. Check for test coverage of the affected area. Ask the user about testing plans if coverage is insufficient.

7. Break the implementation into tiny commits. Martin Fowler's advice: "make each refactoring step as small as possible, so that you can always see the program working."

8. Create a GitHub issue with the refactor plan.

<refactor-plan-template>

## Problem Statement

The problem that the developer is facing.

## Solution

The solution to the problem.

## Commits

A LONG, detailed implementation plan. Break the implementation into the tiniest commits possible. Each commit should leave the codebase in a working state.

## Decision Document

A list of implementation decisions:

- Modules built/modified
- Interfaces modified
- Technical clarifications
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets.

## Testing Decisions

- What makes a good test (only test external behavior)
- Which modules will be tested
- Prior art for tests

## Out of Scope

A description of things out of scope for this refactor.

## Further Notes (optional)

Any further notes about the refactor.

</refactor-plan-template>
