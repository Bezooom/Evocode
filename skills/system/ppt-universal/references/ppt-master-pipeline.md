# PPTX Pipeline — Детали конвейера

Дополнение к SKILL.md для PPTX Native подхода (ppt-master system).

---

## Pipeline Overview

```
Source → [1] Convert → [2] Init → [3] Template → [4] Strategist ⛔
  → [5] Image_Generator (cond.) → [6] Executor → [7] Post-process
```

---

## Step 1: Source → Markdown

| Source | Command |
|--------|---------|
| PDF | `python3 scripts/source_to_md/pdf_to_md.py <file>` |
| DOCX | `python3 scripts/source_to_md/doc_to_md.py <file>` |
| PPTX | `python3 scripts/source_to_md/ppt_to_md.py <file>` |
| URL | `python3 scripts/source_to_md/web_to_md.py <URL>` |
| Markdown | Read directly |

---

## Step 2: Project Init

```bash
python3 scripts/project_manager.py init <name> --format ppt169
python3 scripts/project_manager.py import-sources <project> <files> --move
```

**Formats:** `ppt169` (16:9), `ppt43` (4:3), `xhs` (RED), `story`

---

## Step 3: Template Option

**Default:** Free design (no template question).

**Enter template flow only if:**
1. User names a template
2. User names a style (McKinsey, Google, etc.)
3. User asks what templates exist

---

## Step 4: Strategist ⛔ BLOCKING

8 Confirmations (user must confirm):

1. Canvas format
2. Page count range
3. Target audience
4. Style objective
5. Color scheme
6. Icon usage
7. Typography plan
8. Image usage approach

**Output:**
- `<project>/design_spec.md` — human-readable
- `<project>/spec_lock.md` — machine-readable execution contract

> **MUST re-read `spec_lock.md` before generating each SVG page.**

---

## Step 5: Image_Generator (Conditional)

**Trigger:** Image approach includes "AI generation".

```bash
python3 scripts/image_gen.py "prompt" --aspect_ratio 16:9 --image_size 1K -o <project>/images
```

On failure: retry once, then mark `Needs-Manual`.

---

## Step 6: Executor

Read executor role:
```
executor-base.md (REQUIRED) + executor-*.md (one style)
```

**Per-page:** Re-read `spec_lock.md` before each SVG.

**Rules:**
- Main-agent only (no sub-agents)
- Sequential page by page (no batching)
- SVG constraints: no `mask`, `class`, `foreignObject`, `textPath`, `@font-face`, `animate*`, `script`, `iframe`

**Quality check:**
```bash
python3 scripts/svg_quality_checker.py <project>
```

---

## Step 7: Post-processing

**3 steps, ONE AT A TIME:**

```bash
# 7.1 Split notes
python3 scripts/total_md_split.py <project>

# 7.2 Finalize SVGs
python3 scripts/finalize_svg.py <project>

# 7.3 Export PPTX
python3 scripts/svg_to_pptx.py <project> -s final
```

**Output:** `exports/<name>_<timestamp>.pptx`

---

## SVG Constraints

**Banned:** `mask`, `<style>`, `class`, external CSS, `<foreignObject>`, `textPath`, `@font-face`, `<animate*>`, `<script>`, `iframe`, `<symbol>`+`<use>`

**rgba alternatives:**
- `rgba()` → `fill-opacity` / `stroke-opacity`
- `<g opacity>` → set on each child
- `<image opacity>` → overlay mask

---

## SVG Quality Checker

Must run against `svg_output/` BEFORE speaker notes.

- `error` → fix on page, re-check
- `warning` → review, fix if easy, acknowledge otherwise

---

## Troubleshooting

See `scripts/docs/faq.md` for known issues.
