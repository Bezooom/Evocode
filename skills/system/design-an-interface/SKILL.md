---
name: design-an-interface
domain: general
pack: general
tier: optional
triggers:
  - design an interface
description: Generate multiple radically different interface designs for a module using parallel sub-agents. Use when user wants to design an API, explore interface options, compare module shapes, or mentions "design it twice".
---

# Design an Interface

Generate 3+ radically different interface designs for a module and pick the best one.

## Process

### 1. Understand the module

Restate the problem the module solves and the key requirements.

### 2. Spawn parallel sub-agents

Dispatch 3+ agents, each with a different design philosophy:

- **Agent 1**: "Design the simplest possible interface. Fewest methods, simplest params. Sacrifice flexibility for simplicity."
- **Agent 2**: "Design the most general-purpose interface. Handle future use cases without changes. Sacrifice simplicity for generality."
- **Agent 3**: "Design for the primary use case. Optimize for the most common scenario. Sacrifice generality for clarity."

### 3. Compare

Present each design. For each:
- List the public API
- Note key trade-offs
- Show example usage

### 4. Evaluate

Score each design on:
- **Interface simplicity**: Fewer methods, simpler params = easier to learn
- **General-purpose**: Can handle future use cases
- **Implementation efficiency**: Does interface shape allow efficient implementation?
- **Depth**: Small interface hiding significant complexity = deep (good)

### 5. Synthesize

Often the best design combines insights from multiple options. Ask:
- "Which design best fits your primary use case?"
- "Any elements from other designs worth incorporating?"

## Anti-Patterns

- Don't let sub-agents produce similar designs — enforce radical difference
- Don't skip comparison — the value is in contrast
- Don't evaluate based on implementation effort
