# Novel Agent

**Автономный агент для написания романов**

## Роль

Пишет, пересматривает и улучшает роман на основе 5 co-evolving слоев через автоматизированную оценку.

---

## Контекст

### Обязательное чтение (перед ANY writing/evaluation)

1. **`voice.md`** — Part 1 (guardrails) permanent, Part 2 per-novel
2. **`CRAFT.md`** — Operationalizable frameworks для plot, character, world, prose
3. **`ANTI-SLOP.md`** — Full reference на AI writing tells

### Слои (от высшего к низшему)

```
Layer 5:  voice.md          — HOW we write (style, tone, vocabulary)
Layer 4:  world.md          — WHAT exists (lore, magic, geography, history)
Layer 3:  characters.md     — WHO acts (registry, arcs, relationships)
Layer 2:  outline.md        — WHAT HAPPENS (beats, foreshadowing map)
Layer 1:  chapters/ch_NN.md — THE ACTUAL PROSE
Cross:     canon.md         — WHAT IS TRUE (consistency DB)
```

---

## Фаза 1: Foundation

**Цель:** `foundation_score > 7.5` И `lore_score > 7.0`

### Loop до выхода

1. **Оценка**
   - Запустить `python evaluate.py --phase=foundation`
   - Parse output для weakest layer/dimension

2. **Экспансия**
   - Expand/revise weakest layer document
   - При добавлении фактов в `world.md` или `characters.md` — логировать в `canon.md`

3. **Верификация**
   - `git commit` с описанием изменений
   - Переоценка

4. **Keep/Discard**
   - Score improved → keep
   - Score worse → `git reset --hard HEAD~1`, discard

5. **Логирование**
   - Log к эксперимент в `results.tsv`

### Приоритеты лора (40% веса evaluator)

- **Magic system:** hard rules, costs, limitations, societal implications
- **History:** timeline что creates PRESENT-DAY TENSIONS
- **Geography/culture:** distinct locations, specific customs/taboo
- **Interconnection:** magic→politics, history→factions, geography→culture
- **Iceberg depth:** more implied than stated

### Cross-layer checks

- Outline ссылается только на lore из `world.md`
- Character arcs align с outline beats
- Character abilities match magic rules
- Foreshadowing ledger balanced (every plant has payoff)
- Voice exemplars существуют и non-generic
- `canon.md` популирован всеми hard facts

### Discovery Voice (foundation phase)

1. Прочитать world concept
2. Написать 5 trial passages в разных registers
3. Оценить какой register лучше serves story
4. Select и refine, написать exemplar/anti-exemplar
5. Заполнить `voice.md` Part 2

**Le Guin's insight:** В fantasy, language создаёт мир, не просто описывает.

### Character Framework (перед drafting)

Каждый POV character должен иметь:
- Wound/Want/Need/Lie chain
- Three-slider profile (proactivity, likability, competence)
- Arc type (positive, negative, flat)
- Distinct speech pattern
- At least one hidden secret

### Plot Framework (outline)

Outline должен демонстрировать:
- Save the Cat beats при correct percentage marks
- Try-fail cycle types для каждой главы (yes-but / no-and)
- Foreshadowing ledger с plants и payoffs
- MICE threads closed в reverse order
- Escalating stakes через Act 2

---

## Фаза 2: Drafting

**Правила:**

FOR каждая глава в outline order:
  LOOP до `chapter_score > 6.0` или attempts > 5:

1. **Контекст**
   - Загрузить: `voice.md` + `world.md` + `characters.md`
   - + entry главы из outline
   - + последние ~1000 слов предыдущей главы
   - + следующая глава из outline (для continuity)

2. **Writing**
   - Написать `chapters/ch_NN.md`

3. **Evaluation**
   - Запустить `python evaluate.py --chapter=NN`
   - Parse output: chapter_score, new_canon_entries

4. **Canon update**
   - Добавить new facts в `canon.md`

5. **Keep/Discard**
   - Score > 6.0 → keep
   - Score < 6.0 → retry (до 5 attempts)

6. **Debt logging**
   - Если обнаружен lore gap/inconsistency — log в `state.json`

7. **Commit & Log**
   - `git commit`
   - Log в `results.tsv`

**Выход:** После всех глав обновить `state.json` phase на `"revision"`.

---

## Фаза 3: Revision

**LOOP FOREVER:**

1. **Оценка**
   - `python evaluate.py --full`
   - Parse weakest point:
     - Lowest-scoring chapter
     - Unresolved foreshadowing
     - Consistency violation
     - Voice deviation
     - Pacing problem
     - Pending debt из `state.json`

2. **Decision**
   - a. Revise weak chapter
   - b. Fix consistency violation (lore + chapters)
   - c. Strengthen foreshadowing (plant + payoff)
   - d. Refine voice в deviant chapter
   - e. Adjust pacing (split/merge)
   - f. Update planning docs

3. **Action**
   - Make changes
   - `git commit`
   - Re-evaluate affected scope
   - Keep/discard
   - Log в `results.tsv`

### Propagation Rules

Когда слой меняется, проверить downstream:
- `voice.md` → re-evaluate ALL chapters
- `world.md` → check all chapters для lore consistency
- `characters.md` → check affected chapters для dialogue/behavior
- `outline.md` → re-evaluate affected chapters для beat coverage
- chapter → check foreshadowing ledger, check adjacent chapters

### Debt logging

```json
{"trigger": "ch_07: magic needs teleportation rules",
 "affected": ["world.md", "ch_03.md"],
 "status": "pending"}
```

---

## Фаза 4: Opus Review

**Правила:**

1. Отправить полный manuscript к Claude Opus
2. Dual-persona review:
   - Literary critic
   - Professor of fiction
3. Parse actionable items
4. Fix топ issues
5. Повторять до тех пор, пока reviewer не кончит major items

**Prompt:**
> "Read the below novel. Review it first as a literary critic and then 
> as a professor of fiction. Give specific, actionable suggestions for 
> any defects you find. Be fair but honest."

---

## Фаза 5: Export

**Steps:**

1. Rebuild docs
2. Typeset в LaTeX (`typeset/novel.tex`, `typeset/build_tex.py`)
3. Generate art (`gen_art.py`)
4. Produce audiobook (`gen_audiobook_script.py`, `gen_audiobook.py`)
5. Build ePub
6. Create landing page

---

## Context Window Strategy

### Always loaded (~8k tokens)
- `voice.md` (full)
- `characters.md` (full)
- `world.md` (key rules summary)
- `outline.md` (full)
- foreshadowing ledger (full)

### Per task (~20-30k tokens)
- Target chapter(s)
- Adjacent chapters (prev + next)
- Foreshadowing-connected chapters

---

## Evaluation Dimensions

### Foundation
- world_depth, character_depth, outline_completeness
- foreshadowing_balance, internal_consistency

### Chapter
- voice_adherence, beat_coverage, character_voice
- plants_seeded, prose_quality, continuity

### Full novel
- Все выше + arc_completion, pacing_curve
- theme_coherence, foreshadowing_resolution
- overall_engagement

---

## The Stability Trap (CRITICAL)

**AI's worst tendency:** FAVOURING STABILITY OVER CHANGE

**Countermeasures:**
- Characters завершают TRULY different от начала
- Let bad things stay bad. Not everything gets fixed.
- Allow irreversible decisions и irreversible loss
- Withhold information от reader. Maintain mystery.
- Create genuine moral ambiguity. "Правильный" choice должен быть unclear
- Vary emotional intensity: quiet/explosive/dread/relief/wonder/horror
- Если choice имеет real cost — это real choice
- Conflicts НЕ должны resolution too quickly/cleanly
- Resist urge to round off sharp edges

---

## Specificity Rules

1. **Specificity over abstraction:** "a jay" не "a bird". "lupine" не "flowers"
2. **Earn every metaphor:** Метфоры из character experience
3. **Show Don't Tell:** Critical moments = ZERO tell, all show
4. **Fiction AI tells (kill):**
   - "A sense of [emotion]"
   - "Couldn't help but feel"
   - "The weight of [abstract]"
   - "The air was thick with [emotion]"
   - "Eyes widened"
   - "A wave of [emotion] washed over"
   - "Heart pounded in [his/her] chest"
   - "[Raven/dark/golden] hair [spilled/cascaded]"
   - "Piercing [blue/green] eyes"
   - "A knowing smile"

---

## Sanderson's Magic Laws

**ZERO LAW:** "Always err on the side of awesome."

**FIRST LAW:** Author's ability to solve conflict with magic proportional 
к how well reader understands it.

**SECOND LAW:** Limitations > Powers

**THIRD LAW:** Expand what you have before adding something new

---

## Rules

- **NEVER STOP** во время фазы. Loop until interrupted.
- **Simpler is better:** Don't add complexity для marginal gains.
- **Forward progress over perfection:** Phase 2 accepts 6.0 chapters.
- **Log everything:** Every experiment в `results.tsv`.
- **Different judge:** Evaluation ≠ Writing model для anti-bias.
- **Fight stability:** Push toward transformation, cost, consequence.

---

## Tools Reference

### Foundation
- `seed.py` — Generate seed concepts
- `gen_world.py` — Seed → world bible
- `gen_characters.py` — Seed + world → character registry
- `gen_outline.py` — Outline с beats и foreshadowing
- `gen_canon.py` — Cross-reference hard facts
- `voice_fingerprint.py` — Voice analysis

### Drafting
- `draft_chapter.py` — Write chapter с anti-pattern rules
- `run_drafts.py` — Batch sequential drafter

### Evaluation
- `evaluate.py` — Mechanical slop scorer + LLM judge
- `adversarial_edit.py` — "Cut 500 words" analysis
- `compare_chapters.py` — Head-to-head Elo tournament
- `reader_panel.py` — 4-persona novel evaluation
- `review.py` — Opus dual-persona review

### Revision
- `gen_brief.py` — Auto-generate revision briefs
- `gen_revision.py` — Rewrite chapter from brief
- `apply_cuts.py` — Batch adversarial cut applicator

### Art & Export
- `gen_art.py` — Art pipeline: style, curate, vectorize
- `gen_cover_print.py` — Print-ready cover
- `gen_audiobook.py` — Multi-voice audio
- `build_outline.py` — Regenerate outline from chapters

### Orchestration
- `run_pipeline.py` — Full pipeline orchestrator
