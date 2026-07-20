---
name: agent-loop-skill
domain: agent
pack: agent
tier: optional
triggers:
  - agent loop skill
description: Build and run long-running AI agent workflows for Codex, Claude Code, Cursor, and other coding agents with contracts, disk-backed state, role separation, verification traces, restart criteria, subjective scoring, and harness cleanup. Use when a user asks an agent to complete multi-step coding, product, research, content, design, debugging, batch generation, or cross-session tasks that require planning, repeated execution, evidence, or recovery after failures.
---

# Agent Loop Skill

Use this skill to turn an open-ended agent task into a repeatable loop that can run, verify, recover, and finish without relying only on chat context.

Do not use the full loop for trivial one-line answers, simple typo fixes, or single commands with obvious output.

## Quick Start

When the task is non-trivial:

1. Read the user request and local project context.
2. Create `.agent-loop/contract.md`.
3. Create `.agent-loop/progress.md`.
4. Create `.agent-loop/log.md`.
5. Split work into Planner, Generator, and Evaluator roles.
6. Execute the smallest verifiable round.
7. Save evidence in logs, traces, screenshots, command output, or diffs.
8. Fix, restart, or finish based on the contract.
9. Remove or justify temporary harness files before delivery.

## 1. Write The Loop, Not Just The Prompt

Convert the request into a loop before doing the work.

Define:

- the final deliverable
- in-scope work
- out-of-scope work
- acceptance criteria
- validation commands or evidence
- restart criteria
- stop conditions

If chat messages are repeating without progress, stop and write the loop to disk.

## 2. Separate Roles

Use three roles by default:

- Planner: clarify the goal, scope, risks, acceptance criteria, and execution order.
- Generator: implement, edit, generate, or repair only inside the contract.
- Evaluator: test, inspect, read traces, and decide whether acceptance criteria pass.

Add a Referee only when the roles disagree. The Referee arbitrates; it does not expand scope.

## 3. Negotiate The Contract First

Before writing final code or content, write `.agent-loop/contract.md`.

Use this structure:

```text
Goal:
In scope:
Out of scope:
Definition of done:
Acceptance criteria:
Validation commands:
Subjective scoring criteria:
Risk assumptions:
Stop conditions:
Restart conditions:
Final deliverables:
```

Avoid vague criteria. Each item must be checkable through command output, screenshot, trace, log, diff, checklist, or scorecard.

## 4. Write To Disk, Not To Context

For long work, maintain these files:

```text
.agent-loop/contract.md
.agent-loop/progress.md
.agent-loop/log.md
```

Use optional files only when useful:

```text
.agent-loop/state.json
.agent-loop/scorecard.md
.agent-loop/defects.md
.agent-loop/traces/
```

If these files cannot describe the state clearly, split the task.

Append to `.agent-loop/log.md`; do not rewrite history.

## 5. Let The Loop Restart

Restart from the contract when:

- the same acceptance item fails twice
- implementation is turning into patches on patches
- tests pass but the deliverable misses the user goal
- the log shows the contract was forgotten
- continuing is more expensive than a clean retry

Before restarting, append the failure reason and evidence to `.agent-loop/log.md`.

## 6. Score The Subjective

For design, writing, UX, product, architecture, or taste-heavy work, write the scoring criteria before judging the result.

Default dimensions:

| Dimension | Question |
| --- | --- |
| Functionality | Does it solve the real target problem? |
| Simplicity | Does it avoid unnecessary abstraction and scope? |
| Craft | Are details, naming, flow, and edge cases handled well? |
| Originality | Does it show judgment instead of copying a template? |

Score 0-10 and write one sentence of evidence per dimension.

When references exist, compare against at least one strong sample, one weak sample, and the current output.

## 7. Read The Traces

Judge from evidence, not intuition.

Useful traces include:

- test output
- build logs
- console errors
- browser screenshots
- Playwright traces
- API requests and responses
- diffs
- generated artifacts
- user-visible output

If trace evidence conflicts with intuition, trust the trace and create a smaller reproduction.

## 8. Delete The Harness

Before delivery, inspect whether the harness still helps.

Review:

- temporary scripts
- debug logs
- redundant state files
- verification-only code
- stale traces
- overgrown automation

Delete, archive, or justify anything that should not remain in the final project.

## 9. The Bottleneck Always Moves

At the end of each round, update `.agent-loop/progress.md`:

```text
Current bottleneck:
Why this is the bottleneck:
How the next round will verify it is solved:
```

When coding is solved, planning may become the bottleneck. When planning is solved, verification may become the bottleneck. Keep looking for the current constraint.

## Default Completion Standard

Only finish when:

- every contract item passes
- every acceptance criterion has evidence
- `.agent-loop/progress.md` has no unresolved blocker
- `.agent-loop/log.md` explains key decisions and failed attempts
- subjective work has a scorecard or user approval
- temporary harness files are removed or justified
- final deliverables are usable directly

## Suggested Trigger

```text
Use agent-loop-skill for this task. Write the contract first, keep state in .agent-loop, separate Planner/Generator/Evaluator, verify each round with traces, and restart if the same acceptance item fails twice.
```
