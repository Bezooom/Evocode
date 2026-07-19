---
name: zoom-out
description: |
  [RU] Попросить агента отзумиться и дать более широкий контекст или взгляд высокого уровня. Используй когда незнаком с участком кода или нужно понять, как он вписывается в общую картину.
  [EN] Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.
triggers:
  - zoom out
  - отзумь
  - высокий уровень
  - широкий контекст
  - общая картина
  - bigger picture
  - higher-level perspective
---

# Zoom Out

When the agent is stuck in details, push them to step back and see the forest for the trees.

## When to Use

- Agent is diving into implementation details before understanding the problem
- User is asking about a specific piece and needs context
- Agent is over-engineering a solution
- Codebase exploration reveals confusing patterns
- User says "wait, zoom out" or "step back" or "what's the big picture?"

## How to Zoom Out

1. **Restate the problem at the highest level**
2. **Identify the key abstractions** (not the code paths)
3. **Show the architecture** (not the details)
4. **List the options** (not just the best one)
5. **Return to details only when necessary**

## Patterns

- "Before we get into the weeds, what's the problem we're solving?"
- "What's the highest-level way to think about this?"
- "What are the main trade-offs?"
- "What would a diagram of this look like?"
