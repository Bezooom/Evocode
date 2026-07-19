---
name: autoresearch-implementation
description: "Universal implementation + review workflow: understand requirements → analyze code → implement → self-check → submit for review → iterate on feedback. Works with any agent/model."
---

# AutoResearch Implementation & Review Workflow

## When to Apply

- Implementing features or fixing bugs based on issue/PRD description
- Reviewing code and providing structured feedback with scoring
- Iterative improvement based on review feedback
- Any task requiring quality gates before submission

## Role: Implementer

### Phase 1: Understand Requirements

1. Read full issue/task description
2. Identify core objective and acceptance criteria
3. List assumptions; flag ambiguities
4. Map affected code modules

### Phase 2: Analyze Codebase

1. **Search** relevant files (Glob/Grep equivalent)
2. **Read** existing architecture and patterns
3. **Identify** files requiring modification
4. **Assess** scope and blast radius

### Phase 3: Implement

1. Write functional implementation
2. Write unit tests for core logic
3. Ensure test coverage of edge cases
4. Run tests to validate

### Phase 4: Self-Check (MANDATORY before submission)

Run project-appropriate checks. Fix ALL failures before submitting.

**MUST pass** (all required):
- [ ] Code compiles / type-checks
- [ ] Lint has no NEW errors
- [ ] Related tests pass

**SHOULD pass** (note failures in report):
- [ ] New code has test coverage
- [ ] Test coverage ≥ 70%
- [ ] Public APIs have documentation

**Self-Check Loop**:
```
Run checks → Failures found → Analyze → Fix → Run checks again
Repeat until all MUST checks pass
```

**Forbidden**:
- Submitting with known compilation errors
- Skipping self-check
- Commenting out failing tests
- Adding TODO/FIXME without reporting

### Phase 5: Submit Report

Output structured implementation report:
```markdown
## Implementation Report

### Issue: #[number] — [title]
### Iteration: [N]

---

### Changes Made
- [File1]: [what + why]
- [File2]: [what + why]

### Self-Check Results
- Build: [PASS/FAIL]
- Lint: [PASS/FAIL]
- Tests: [PASS/FAIL]

### Notes
[Any issues, assumptions, trade-offs]
```

## Role: Reviewer

### Step 1: Get Context

1. Read issue/task description
2. Review implementer's report
3. Check iteration history
4. Review previous feedback (if any)

### Step 2: Read Code

1. Read all modified files
2. Read test files
3. Check code structure and patterns

### Step 3: Evaluate Dimensions

**Correctness (35%)** — Does it solve the problem correctly?
- Matches requirements?
- Handles edge cases?
- Error handling complete?
- No logic errors?

**Test Quality (25%)** — Are tests adequate?
- Core logic covered?
- Edge cases tested?
- Error paths tested?
- Stable (no sleep/random)?
- *Exemption*: Shell scripts, configs, Dockerfiles → default 100

**Code Quality (20%)** — Is code clean?
- Clear naming?
- Follows project conventions?
- No magic numbers?
- No duplication?
- Single responsibility?

**Security (10%)** — Any vulnerabilities?
- SQL injection?
- XSS?
- Secrets hardcoded?
- Input validation?
- Auth checks?

**Performance (10%)** — Any obvious issues?
- Unnecessary allocations?
- Missing caching?
- Proper concurrency?

### Step 4: Calculate Score

```
Total = Correctness×0.35 + Tests×0.25 + Quality×0.20 + Security×0.10 + Performance×0.10

Per dimension scoring:
  No issues: 100
  Minor suggestions: 90
  Minor problems: 70
  Serious issues: 40
  Fatal issues: 10
```

### Step 5: Output Report

```markdown
## Review Report

### Issue: #[number] — [title]
### Iteration: [N]
### Reviewer: [agent_name]

---

### Score: [X]/100

### Summary
[One-line assessment]

---

### Critical Issues (Must Fix)

#### Problem 1: [Title]
**Location**: `file:line`
**Description**: [what + why it matters]
**Current**:
```code
[current code]
```
**Fix**:
```code
[suggested fix]
```

---

### Suggested Improvements (Optional)

- [Improvement 1]
- [Improvement 2]

---

### Conclusion
- [ ] PASS — Meets quality threshold
- [ ] Needs Revision — Has fixable issues
- [ ] Blocked — Major design problem

### Next Actions
[Specific instructions for implementer]
```

## Feedback Loop

When revision needed:
1. Implementer reads reviewer's report
2. Fixes all critical issues
3. Runs self-check again
4. Submits updated report
5. Next agent reviews (rotation)

## Learnings Accumulation

After each iteration, document:
```markdown
## Learnings

- **Pattern**: [Discoverable pattern or convention]
- **Pitfall**: [Issue encountered and solution]
- **Tip**: [Useful insight for future iterations]
```

Update directory `CLAUDE.md` with reusable knowledge:
- Module conventions
- Cross-file dependencies
- Project-specific patterns
- Architecture decisions
- Common pitfalls

## UI Task Extra Checks

For UI-type tasks:
- Page renders without errors
- Interactive elements functional
- No console errors / white screens
- Browser screenshot verification
