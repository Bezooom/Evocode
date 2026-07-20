---
name: scaffold-exercises
domain: general
pack: general
tier: optional
triggers:
  - scaffold упражнения
  - scaffold exercises
  - stub для exercises
  - создать exercises
  - учебные задания
  - course section
  - exercise stubs
description: |
  [RU] Создание exercise-структуры каталогов (sections, problems, solutions, explainers), проходящей линтинг. Используй когда пользователь хочет заскаффолдить упражнения, создать stub-и для exercises или настроить новую секцию курса.
  [EN] Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises, create exercise stubs, or set up a new course section.
---

# Scaffold Exercises

Create exercise directory structures that pass linting, then commit with `git commit`.

## Directory naming

- **Sections**: `XX-section-name/` inside `exercises/` (e.g., `01-retrieval-skill-building`)
- **Exercises**: `XX.YY-exercise-name/` inside a section (e.g., `01.03-retrieval-with-bm25`)
- Section number = `XX`, exercise number = `XX.YY`
- Names are dash-case (lowercase, hyphens)

## Exercise variants

Each exercise needs at least one of these subfolders:

- `problem/` - student workspace with TODOs
- `solution/` - reference implementation
- `explainer/` - conceptual material, no TODOs

## Required files

Each subfolder needs a `readme.md` that:

- Is **not empty** (must have real content)
- Has no broken links

## Workflow

1. **Parse the plan** - extract section names, exercise names, and variant types
2. **Create directories** - `mkdir -p` for each path
3. **Create stub readmes** - one `readme.md` per variant folder with a title
4. **Run lint** - validate
5. **Fix any errors** - iterate until lint passes

## Lint rules summary

- Each exercise has subfolders (`problem/`, `solution/`, `explainer/`)
- At least one of `problem/`, `explainer/`, or `explainer.1/` exists
- `readme.md` exists and is non-empty in the primary subfolder
- No `.gitkeep` files
- No broken links in readmes
- `main.ts` required per subfolder unless it's readme-only

## Moving/renaming exercises

1. Use `git mv` (not `mv`) to rename directories — preserves git history
2. Update the numeric prefix to maintain order
3. Re-run lint after moves
