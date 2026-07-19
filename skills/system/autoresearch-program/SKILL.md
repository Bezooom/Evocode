---
name: autoresearch-program
description: "Universal code standards, quality gates, language-specific check commands, and CLAUDE.md accumulation rules. Model-agnostic implementation rules."
---

# AutoResearch Program — Code Standards & Quality Gates

## When to Apply

- Setting implementation rules for any project
- Defining quality gates before PR/merge
- Language-specific code standards
- Cross-iteration knowledge accumulation

## Permission Boundaries

**Agent CAN**:
- Modify source code files
- Create new test files
- Modify existing tests
- Log in `.autoresearch/workflows/`
- Run build/lint/test commands
- Create local git branches
- Make local git commits

**Agent CANNOT**:
- Modify dependency files (unless issue requires)
- Modify `.github/` directory
- Modify Makefile / CMakeLists.txt / build.gradle
- Modify Dockerfile / docker-compose.yml
- Modify CI/CD config files
- Delete existing files
- Push to remote
- Close GitHub issues
- Create GitHub PRs
- Modify `.autoresearch/` rule files
- Run `git --force`

## Universal Code Standards

**All languages**:
1. Follow existing project style
2. Keep functions short, single responsibility
3. Meaningful names, avoid abbreviations
4. Proper error handling and logging
5. No hardcoded configuration values

## Language-Specific Standards

### Go
```
- Follow Effective Go
- Use gofmt / goimports
- Result<T, E> for errors
- Public APIs documented
```
**Commands**: `go build ./...`, `go vet ./...`, `golangci-lint run ./...`, `go test ./...`

### Python
```
- Follow PEP 8
- Use type hints
- pytest for tests
```
**Commands**: `mypy .` or `pyright .`, `ruff check .`, `flake8 .`, `pytest`, `pytest --cov`

### TypeScript/JavaScript
```
- ESLint + Prettier
- Strict mode
- TypeScript preferred
- Functional components + Hooks
- Stable list keys (no array index)
- Lazy loading for images
```
**Commands**: `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .`, `npm test`, `npm run build`

### Rust
```
- Rust API Guidelines
- rustfmt + clippy
- Result<T, E> over panic
- Prefer references over clones
- Document public APIs (///)
```
**Commands**: `cargo check`, `cargo clippy`, `cargo fmt --check`, `cargo test`

### Frontend (React/Vue/Svelte)
```
- Single responsibility components
- TypeScript interfaces for props
- Functional components + Hooks/Composition API
- Framework-native state management
- CSS Modules / Scoped CSS / Tailwind
- Event handlers: handle + action naming
- Lazy load static resources
```
**Commands**: `npm run build`, `npx eslint .`, `npm test` (or vitest/jest)

### Shell
```
- Syntax valid
- Exit code 0 on success
```
**Commands**: `bash -n script.sh`, `shellcheck script.sh`

## Testing Standards

**Requirements**:
- All new features need tests
- Target coverage: ≥ 70%
- Use project's test framework
- Clear test function names

**Exemptions**: Shell scripts, configs, Dockerfiles, CI/CD, docs → note "unit tests not applicable"

**Forbidden in tests**:
- Fixed sleep (use async/channel sync)
- External services (use mocks)
- Global state modification
- Skipping failing tests

## Quality Gate Commands Reference

**Always prefer project's own commands** (Makefile, package.json scripts, CI config):

```bash
# Check for standardized commands
cat Makefile          # make lint, make test
cat package.json      # npm scripts
cat Cargo.toml        # cargo commands
cat tox.ini / pyproject.toml  # Python config

# Check CI config for actual commands
cat .github/workflows/*.yml
```

## Code Behavior Guidelines

**Think before coding**:
- State assumptions explicitly
- List alternatives if uncertain
- Propose simpler solutions
- Point out ambiguities

**Simplicity first**:
- Minimal code for requirements
- No speculative design
- No unsolicited "flexibility"
- Under 200 lines → reconsider if over 50 suffice

**Precise changes**:
- Only modify what's needed
- Clean up your own mess
- Match existing style
- Note orphaned code, don't delete

**Goal-driven execution**:
- Define verifiable success criteria
- Multi-step tasks: state plan + verification
- Final step: run complete self-check

**Safety checks**:
- No SQL/command injection
- No path traversal
- No hardcoded secrets
- No unsafe deserialization
- Input validation complete
- Errors don't leak sensitive data

## CLAUDE.md Accumulation Rules

**After completing work in a directory**:

1. If reusable pattern found → update/create `CLAUDE.md`
2. Append new knowledge (don't overwrite)
3. Create file if none exists
4. Only write reusable knowledge

**Write to CLAUDE.md**:
- Module API conventions
- Cross-file dependencies
- Project-specific patterns
- Architecture decisions
- Common pitfalls

**Don't write to CLAUDE.md**:
- Temporary debug info
- Issue-specific context
- One-time workarounds
- Secrets
- Unrelated comments

**CLAUDE.md Format**:
```markdown
# [Directory Name]

## Architecture Conventions
- [Convention 1]
- [Convention 2]

## Dependencies
- [Dependency notes]

## Notes
- [Common pitfalls]
```

## Exception Handling

When blocked, output structured report:
```markdown
## Block Report

### Issue: #[number]
### Block Reason: [description]
### Attempted Solutions: [list]
### Suggested Action: [recommendation]
```
