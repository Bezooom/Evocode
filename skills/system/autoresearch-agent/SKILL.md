---
name: autoresearch-agent
description: "Unified implementation/review agent workflow: abstracts tool calls, self-check, feedback loop, and cross-iteration learning. Works with any LLM/model."
---

# AutoResearch Agent — Unified Implementation & Review Agent

## When to Apply

- Acting as code implementer (creating/changing code)
- Acting as code reviewer (evaluating + scoring)
- Iterative improvement on feedback
- Cross-iteration knowledge accumulation

## Agent Modes

### Mode: Implementer

**Workflow**:

1. **Understand** — Read issue/task, identify acceptance criteria
2. **Analyze** — Search codebase, read relevant files, plan changes
3. **Implement** — Write code + tests
4. **Self-Check** — Run build/lint/test, fix failures
5. **Report** — Submit structured implementation report

**Tool Agnostic Patterns**:
- File search → `search_codebase(pattern)` or `glob(pattern)`
- File read → `read_file(path)`
- File write → `write_file(path, content)` or `edit_file(path, changes)`
- Command run → `run_command(cmd)` or `exec(command)`
- Git operations → `git_branch()`, `git_commit()`, `git_diff()`

**Self-Check Commands** (use project's own commands when available):

```bash
# Detect project type first
# Go → go.mod, Python → requirements.txt/pyproject.toml
# Node → package.json, Rust → Cargo.toml
```

### Mode: Reviewer

**Workflow**:

1. **Context** — Read issue, implementer report, iteration history
2. **Read Code** — All modified files + tests
3. **Evaluate** — Score across 5 dimensions
4. **Report** — Structured review with specific fixes

**Evaluation Dimensions**:

| Dimension | Weight | Score: None | Score: Minor | Score: Major | Score: Fatal |
|-----------|--------|-------------|--------------|--------------|--------------|
| Correctness | 35% | 100 | 90 | 70 | 40/10 |
| Test Quality | 25% | 100 | 90 | 70 | 40/10 |
| Code Quality | 20% | 100 | 90 | 70 | 40/10 |
| Security | 10% | 100 | 90 | 70 | 40/10 |
| Performance | 10% | 100 | 90 | 70 | 40/10 |

**Score Calculation**:
```
Total = Σ(Dimension_Score × Weight)
Threshold: ≥ 85 to pass
```

## Self-Check Checklist

**MUST pass before submission**:
```
[ ] Code compiles / type-checks
[ ] Lint has no NEW errors
[ ] Related tests pass
```

**SHOULD pass** (note if failed):
```
[ ] New code has test coverage
[ ] Test coverage ≥ 70%
[ ] Public APIs documented
```

**Self-Check Loop**:
```
Run checks → Failures? → Fix → Run checks again → All pass?
  ↓ Yes                          ↓ No
Submit for review
```

**Forbidden**:
- Submitting with known errors
- Skipping self-check
- Commenting out failing tests
- Adding TODO/FIXME without reporting

## Feedback Loop

**When revision needed**:
1. Read reviewer's report
2. Fix all critical issues
3. Run self-check
4. Submit updated implementation

**When passing**:
- Proceed to PR/merge workflow
- Accumulate learnings

## Cross-Iteration Learning

**Always output Learnings section**:
```markdown
## Learnings

- **Pattern**: [Reusable pattern discovered]
- **Pitfall**: [Issue + solution]
- **Experience**: [Insight for future iterations]
```

**Update CLAUDE.md** after completing work:
1. Review directories you modified
2. Add reusable knowledge (not temporary info)
3. Append to existing CLAUDE.md, don't overwrite
4. Create new CLAUDE.md if none exists

**Good content for CLAUDE.md**:
- Module conventions
- Cross-file dependencies
- Project-specific patterns
- Architecture decisions
- Common pitfalls

**Bad content**:
- Temporary debug info
- Issue-specific context
- One-time workarounds
- Secrets/tokens

## Output Formats

### Implementation Report

```markdown
## Implementation Report

### Issue: #[number] — [title]
### Iteration: [N]

---

### Changes
- `[file]`: [what + why]

### Self-Check
- Build: PASS/FAIL
- Lint: PASS/FAIL
- Tests: PASS/FAIL

### Notes
[Any trade-offs, assumptions]
```

### Review Report

```markdown
## Review Report

### Issue: #[number] — [title]
### Iteration: [N]
### Score: [X]/100

---

### Summary
[One-line assessment]

---

### Critical Issues
#### [Problem Title]
**Location**: `file:line`
**Issue**: [description]
**Fix**: [suggested code]

---

### Suggested Improvements
- [Improvement]

---

### Conclusion
[ ] PASS — Meets threshold
[ ] Needs Revision
[ ] Blocked

### Next Actions
[Specific instructions]
```

## UI Task Extra Checks

For UI-type tasks:
- Page renders correctly
- Interactive elements functional
- No console errors
- Browser screenshot verification
