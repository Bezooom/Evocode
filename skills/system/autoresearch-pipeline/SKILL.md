---
name: autoresearch-pipeline
domain: research
pack: science
tier: optional
triggers:
  - autoresearch pipeline
description: "Universal multi-agent auto-dev pipeline: Issue → Task Planning → Iterative Implementation → Quality Gates (Build/Lint/Test + Scoring) → PR/Merge. Model-agnostic, language-agnostic."
---

# AutoResearch Pipeline — Universal Multi-Agent Auto-Dev Pipeline

## When to Apply

- GitHub Issue needs implementation with full quality assurance
- Automated feature development / bug fix with multi-agent review
- Iterative code improvement with objective quality gates
- Batch processing of multiple issues with priority ranking

## Core Pipeline

```
Issue → Task Planning (tasks.json) → Iterative Implementation → Quality Gates → PR/Merge
                            ↓                              ↓
                      Archive old workflows        Score ≥ threshold?
                            ↓                      ┌──────┴──────┐
                     Continue mode               PASS        FAIL
                            ↓                      ┌──────┴──────┐
                   Resume state               PR → Merge    Next iteration
```

## Pipeline Phases

### Phase 1: Issue Intake & Planning

1. **Fetch Issue** — Get full context from GitHub issue (title, body, labels, comments)
2. **Validate** — Check for exclusion labels (`wontfix`, `duplicate`, `invalid`, `blocked`)
3. **Plan Subtasks** — Decompose into structured `tasks.json`:
   ```json
   {
     "subtasks": [
       {
         "id": 1,
         "title": "Description",
         "type": "feature|bug|refactor|test|ui",
         "priority": "critical|high|medium|low",
         "acceptance_criteria": ["Criterion 1", "Criterion 2"],
         "files_affected": ["path/to/file"]
       }
     ],
     "complexity": "simple|medium|complex",
     "max_iterations": 3|5|5,
     "time_budget": "10m|30m|60m"
   }
   ```

### Phase 2: Iterative Implementation

**Iteration 1** — First agent performs initial implementation
**Iteration 2+** — Agents rotate for review + fix cycle

**Agent Rotation Formula**: `current_agent = agents_list[(iteration - 1) % agents_count]`

**Context Overflow Handling**:
- Detect context window overflow
- Save progress to `progress.md`
- Hand off to next agent with full state

### Phase 3: Quality Gates (Per Iteration)

**Hard Gates** (must pass):
1. `build` — Compile/build check
2. `lint` — Lint/static analysis
3. `test` — Test suite execution

**Soft Gates** (LLM scoring):
- Correctness: 35% weight
- Test Quality: 25% weight
- Code Quality: 20% weight
- Security: 10% weight
- Performance: 10% weight
- **Threshold**: Score ≥ 85/100 to pass

**Pre-Submission Checklist** (before quality gates):
- [ ] Code compiles / type-checks
- [ ] Lint has no new errors
- [ ] Related tests pass
- [ ] New code has test coverage
- [ ] No hardcoded secrets
- [ ] Error handling complete

### Phase 4: Output & Cleanup

**On Pass** (score ≥ threshold):
- Create Git branch
- Commit changes
- Create GitHub PR
- Merge PR
- Comment on Issue
- Close Issue

**On Fail**:
- Feed feedback to next agent iteration
- Continue rotation until threshold or max iterations

**On Max Iterations**:
- Archive current workflow
- Report final state
- Optionally create PR with notes

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `project_path` | `.` | Target project directory |
| `agents` | `default` | Agent list for rotation |
| `passing_score` | `85` | Minimum score to pass |
| `max_iterations` | `42` | Maximum iteration count |
| `max_consecutive_failures` | `3` | Stop on consecutive failures |
| `max_retries` | `5` | Retry attempts per agent call |

## Language Detection & Check Commands

Automatically detect project language and run appropriate checks:

| Language | Build | Lint | Test |
|----------|-------|------|------|
| Go | `go build ./...` | `golangci-lint run ./...` | `go test ./...` |
| Python | `python -m py_compile` | `ruff check .` | `pytest` |
| TypeScript | `npx tsc --noEmit` | `npx eslint .` | `npm test` |
| Rust | `cargo check` | `cargo clippy` | `cargo test` |
| Shell | `bash -n script.sh` | `shellcheck script.sh` | Manual verification |
| Frontend | `npm run build` | `npx eslint .` | `npm test` |

**Priority**: Use project's own commands (Makefile, package.json scripts, CI config) when available.

## Memory & Progress Tracking

**Progress File** (`progress.md`):
```markdown
# Progress - Issue #N

## Iteration N
- Agent: [agent_name]
- Score: [score]/100
- Status: [pass|fail|blocked]
- Changes: [summary]
- Learnings: [key insights]

## Codebase Patterns
- [Reusable patterns discovered]

## Common Pitfalls
- [Known issues and solutions]
```

**CLAUDE.md Accumulation** (project auto-evolution):
- After completing work in a directory, update/create `CLAUDE.md`
- Append reusable knowledge (not temporary debug info)
- Format: Architecture conventions, dependency notes, common pitfalls

## Archive Strategy

Old workflows archived to: `archive/YYYY-MM-DD-issue-N/`
- Prevents directory clutter
- Enables historical review
- Supports suffix deduplication

## Continue Mode

Resume from interruption:
- Restore iteration count, scores, consecutive failures
- Restore subtask status from `tasks.json`
- Continue from last agent in rotation
