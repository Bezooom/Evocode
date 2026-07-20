---
name: autoresearch-issue-selector
domain: research
pack: science
tier: optional
triggers:
  - autoresearch issue selector
description: "GitHub issue prioritization and complexity estimation: filtering, scoring, complexity assessment, resource allocation for batch processing."
---

# AutoResearch Issue Selector — Prioritization & Complexity Estimation

## When to Apply

- Batch processing multiple GitHub issues
- Deciding which issue to tackle next
- Estimating effort and resource allocation
- Ranking issues by priority for automated queue

## Exclusion Rules

**Exclude issues with these labels**:
- `wontfix` — Confirmed not fixing
- `duplicate` — Redundant issue
- `invalid` — Not actionable
- `blocked` — Waiting on other conditions
- `needs discussion` — Requires human discussion
- `on hold` — Paused
- `external` — External dependency

**Exclude by content**:
- Title contains `[WIP]` or `[DRAFT]`
- Body contains `DO NOT IMPLEMENT`
- Older than 6 months with no comments
- Has linked PR
- Empty title or body

## Priority Scoring

### Base Score
Every issue starts with base score: `15`

### Label Weights

| Priority Label | Weight |
|----------------|--------|
| `priority: critical`, `priority: p0`, `urgent` | `100` |
| `priority: high`, `priority: p1` | `50` |
| `priority: medium`, `priority: p2` | `20` |
| `priority: low`, `priority: p3` | `10` |
| `enhancement` | `5` |

### Type Weights

| Type Label | Weight |
|------------|--------|
| `bug`, `fix` | `30` |
| `feature`, `enhancement` | `20` |
| `refactor`, `tech debt` | `10` |
| `test`, `testing` | `5` |
| `documentation`, `docs` | `3` |

### Time Factors

| Condition | Bonus |
|-----------|-------|
| New issue (< 7 days old) | `+10` |
| Stale issue (> 30 days untouched) | `+15` |
| Recently updated (commented < 3 days) | `+5` |

### Score Calculation

```
Total Score = Base(15)
            + Max Priority Label Weight
            + Max Type Label Weight
            + Time Bonuses

Example:
Issue #42: labels=[bug, priority: high], created=5d ago, updated=2d ago
Score = 15 + 50 + 30 + 10 + 5 = 110
```

## Complexity Estimation

### Simple
**Signals**: Title contains "fix", "typo", "update"; body < 100 words; single file expected
**Resources**: `max_iterations: 3`, `time_budget: 10m`

### Medium
**Signals**: Title contains "add", "implement", "refactor"; body 100-500 words; 2-3 modules; needs tests
**Resources**: `max_iterations: 5`, `time_budget: 30m`

### Complex
**Signals**: Title contains "redesign", "migrate", "architecture"; body > 500 words; multiple modules; design decisions needed
**Resources**: `max_iterations: 5`, `time_budget: 60m`, `requires_human_approval: true`

### Estimation Process

1. Analyze issue title and body
2. Identify keywords and signals
3. Assess code scope impact
4. Determine if design decisions required
5. Assign complexity level and resource budget

## Issue Validation

**Required**:
- [ ] Non-empty title
- [ ] Non-empty description body

**Recommended**:
- [ ] Reproduction steps (bugs)
- [ ] Expected behavior
- [ ] Actual behavior
- [ ] Environment info

**Low Quality Handling**:
1. Try to infer core request
2. If reasonable, proceed with processing
3. If unclear, mark as `needs-context`
4. Log the issue in workflow

## Batch Processing Strategy

### Single Issue
1. Validate issue exists
2. Check exclusion rules
3. Estimate complexity
4. Start processing

### Batch Queue
1. Fetch all open issues
2. Apply exclusion filters
3. Calculate priority scores
4. Sort descending by score
5. Process highest first
6. Re-evaluate list after each completion

### Parallel Processing
- Only for fully independent issues
- Risk of resource contention
- Default: sequential processing

## Quality Gates for Issues

**High Quality**:
- Clear, complete description
- Reproduction steps included
- Expected results defined
- Appropriate labels present

**Low Quality**:
- Vague description
- Missing key information
- Unverifiable claims
- Inappropriate labels

## Output Format

When selecting/estimating issues:

```markdown
## Issue Analysis

### Issue #[number] — [title]
- **Priority Score**: [score]
- **Complexity**: [simple|medium|complex]
- **Labels**: [labels]
- **Age**: [X days]
- **Last Activity**: [X days ago]

### Resource Allocation
- Max iterations: [N]
- Time budget: [Xm]
- Human approval needed: [yes/no]

### Recommendation
[Proceed / Skip / Needs context]
```
