---
name: autonovel
description: Автономный агент для написания, пересмотра и публикации романов. Автоматизированный pipeline от концепта до PDF/ePub/аудиокниги через 5 слоёв (voice, world, characters, outline, chapters) с механической оценкой качества.
---

---
name: autonovel
description: Автономный агент для написания, пересмотра и публикации романов. Автоматизированный pipeline от концепта до PDF/ePub/аудиокниги через 5 слоёв (voice, world, characters, outline, chapters) с механической оценкой качества.
---

# Автономный романник (autonovel)

Агентская система для автономного написания, пересмотра и публикации романов. 
Инспирирована [karpathy/autoresearch](https://github.com/karpathy/autoresearch) — 
петля modify-evaluate-keep/discard применяется к художественной прозе.

---

## Описание системы

Автономный pipeline для написания полного романа: от семенного концепта до 
печатного PDF, ePub и аудиокниги — всё генерируется агентами ИИ.

**Первый роман:** *The Second Son of the House of Bells* — 19 глав, 79,456 слов.

---

## Слои романа (Layer Stack)

```
  Layer 5:  voice.md          — КАК мы пишем (стиль, тон, словарный запас)
  Layer 4:  world.md          — ЧТО существует (лор, магия, география, история)
  Layer 3:  characters.md     — КТО действует (реестр, арки, отношения)
  Layer 2:  outline.md        — ЧТО ПРОИСХОДИТ (биты, карта предрассказаний)
  Layer 1:  chapters/ch_NN.md — САМ ТЕКСТ (по одной главе на файл)
  Cross-cutting: canon.md     — ЧТО ИСТИННО (база фактов, консистентность)
```

---

## Фаза 1: Foundation (Фундамент)

**Цель:** Достижение `foundation_score > 7.5` и `lore_score > 7.0`

**Правила:**
1. Запускать `python evaluate.py --phase=foundation`
2. Выявлять самый слабый слой/измерение из отчёта оценки
3. Расширить или пересмотреть документ этого слоя
4. При добавлении фактов в `world.md` или `characters.md` — логировать 
   их в `canon.md` как канонические записи
5. `git commit` с описанием изменений
6. Повторная оценка
7. Если оценка улучшилась → сохранить. Если хуже → `git reset --hard HEAD~1`, отбросить
8. Логировать в `results.tsv`

**Приоритеты лора (40% веса в evaluator):**
- **Магическая система:** жёсткие правила, стоимость, ограничения, социальные последствия
- **История:** таймлайн, создающий ПРЕДМЕТНЫЕ НАПРЯЖЕНИЯ, а не декорации
- **География/культура:** уникальные локации, конкретные обычаи и табу
- **Взаимосвязь:** магия влияет на политику, история объясняет фракции, 
  география формирует культуру. Тянешь одну нить — двигается всё
- **Глубина айсберга:** больше имплицировано, чем stated. Упоминания более глубоких систем

**Кросс-слойные проверки:**
- Outline ссылается только на лор из `world.md`
- Арки персонажей согласуются с битами outline
- Способности персонажей соответствуют правилам магии
- Ledger foreshadowing сбалансирован (каждое plant имеет payoff)
- Voice exemplars существуют и не generic
- `canon.md` популирован всеми hard facts из `world.md` и `characters.md`

**Выход:** Когда `foundation_score > 7.5` И `lore_score > 7.0`, 
обновить `state.json` фазу на `"drafting"`.

---

## Фаза 2: First Draft (Первый черновик)

**Правила:**
1. Итерировать главы по порядку outline
2. Для КАЖДОЙ главы: LOOP до `chapter_score > 6.0` или attempts > 5:
   - Загрузить контекст: `voice.md` + `world.md` + `characters.md` 
     + entry главы из outline 
     + последние ~1000 слов предыдущей главы
     + следующая глава из outline (для continuity)
   - Написать `chapters/ch_NN.md`
   - Запустить `python evaluate.py --chapter=NN`
   - Keep/discard на основе score
   - При обнаружении lore gap или inconsistency — логировать debt в `state.json`
   - После оценки проверить `new_canon_entries` в выводе. 
     Добавить любые новые факты в `canon.md`
   - Лог в `results.tsv`
   - `git commit`

**Рост Canon:** Каждая глава устанавливает факты (персонаж раскрывает что-то, 
описывается место, происходит событие). Эти логируются в `canon.md` для 
consistency будущих глав.

**Выход:** После всех глав обновить `state.json` фазу на `"revision"`.

---

## Фаза 3: Revision (Пересмотр)

**Правила:**
```
LOOP FOREVER:
  1. Запустить `python evaluate.py --full`
  2. Выявить самую слабую точку:
     - Глава с lowest score
     - Unresolved foreshadowing thread
     - Consistency violation
     - Voice deviation
     - Pacing problem
     - Pending debt из `state.json`
  3. Решить action:
     a. Revise weak chapter
     b. Fix consistency violation (может затронуть lore + главы)
     c. Strengthen foreshadowing thread (plant + payoff главы)
     d. Refine voice в самом deviant chapter
     e. Adjust pacing (split/merge главы)
     f. Update planning docs для отражения reality
  4. Сделать изменения
  5. `git commit`
  6. Повторная оценка affected scope
  7. Keep/discard
  8. Лог в `results.tsv`
```

### Правила Propagation

Когда слой меняется, проверить downstream:
- `voice.md` changes    → re-evaluate ALL главы для voice adherence
- `world.md` changes    → проверить все главы на lore consistency
- `characters.md` changes → проверить affected главы на dialogue/behavior
- `outline.md` changes  → re-evaluate affected главы для beat coverage
- chapter changes     → проверить foreshadowing ledger, проверить adjacent главы

При обнаружении upstream issues при writing, логировать debt в `state.json`:
```json
{"trigger": "ch_07: magic system needs teleportation rules",
 "affected": ["world.md", "ch_03.md"],
 "status": "pending"}
```

---

## Фаза 4: Review Loop (Финальная шлифовка)

**Правила:**
1. Прочитать полный manuscript через `bash` (cat/chapters)
2. Запустить self-review с dual-persona через встроенную LLM:
   - Literary critic persona
   - Professor of fiction persona
3. Парсить actionable items из review
4. Fix топ issues
5. Повторять до тех пор, пока reviewer не кончит иметь major items

**Prompt для review:**
> "Read the below novel. Review it first as a literary critic and then 
> as a professor of fiction. Give specific, actionable suggestions for 
> any defects you find. Be fair but honest. You don't have to find defects."

**Инструменты:** Использовать текущую модель, настроенную в Kilo (см. `kilo.json` → `model`). 
Никаких внешних API не требуется — всё работает через локально сконфигурированную LLM.

---

## Фаза 5: Export (Экспорт)

**Шаги:**
1. Rebuild docs
2. Typeset в LaTeX (`typeset/novel.tex`, `typeset/build_tex.py`)
3. Generate art (cover + ornaments через `gen_art.py`)
4. Produce audiobook scripts (`gen_audiobook_script.py`)
5. Build ePub (`typeset/epub_*`)
6. Create landing page (`landing/index.html`)

---

## Стратегия Context Window

**Всегда загружено (~8k токенов):**
- `voice.md` (полный)
- `characters.md` (полный)
- `world.md` (summary ключевых правил)
- `outline.md` (полный)
- foreshadowing ledger (полный)

**PER TASK (~20-30k токенов):**
- Target chapter(s)
- Adjacent chapters (prev + next)
- Главы connected по foreshadowing threads

---

## Измерения оценки (Evaluation Dimensions)

**Foundation:**
- world_depth
- character_depth
- outline_completeness
- foreshadowing_balance
- internal_consistency

**Chapter:**
- voice_adherence
- beat_coverage
- character_voice
- plants_seeded
- prose_quality
- continuity

**Full novel:**
- Все вышеуказанное +
- arc_completion
- pacing_curve
- theme_coherence
- foreshadowing_resolution
- overall_engagement

---

## The Stability Trap (КРИТИЧЕСКИ ВАЖНО)

**Проблема:** AI's worst tendency — FAVOURING STABILITY OVER CHANGE. 
Это убивает fiction. Actively fight it at every phase:

**Контрмеры:**
- Characters должны завершать TRULY different от начала
- Позволить bad things оставаться bad. Not everything gets fixed.
- Разрешить irreversible decisions и irreversible loss
- Withhold information от reader. Maintain mystery.
- Create genuine moral ambiguity. "Правильный" choice должен быть unclear
- Vary emotional intensity: quiet/explosive/dread/relief/wonder/horror
- Если choice имеет real cost — это real choice
- Conflicts НЕ должны resolution too quickly или too cleanly
- Resist urge to round off sharp edges into что-то safer

---

## Фонд: Discovery Voice

**Правила:**
1. Прочитать world concept и initial ideas
2. Написать 5 trial passages в разных registers (mythic, spare, warm, cold, whimsical, etc.)
3. Оценить, какой register лучше всего serves THIS story's world и tone
4. Select the best, refine it, написать exemplar и anti-exemplar passages
5. Заполнить `voice.md` Part 2 с discovered voice

**Инсайт Le Guin's:** В fantasy, язык создаёт мир, а не просто описывает его.

---

## Фонд: Character Framework

**Каждый POV character должен быть documented перед drafting:**
- Wound/Want/Need/Lie chain (см. CRAFT.md)
- Three-slider profile (proactivity, likability, competence)
- Arc type (positive, negative, или flat)
- Speech pattern distinct от каждого другого персонажа
- Хотя бы один secret, который reader не узнаёт сразу

---

## Фонд: Plot Framework

**Outline должен демонстрировать:**
- Save the Cat beats примерно на correct percentage marks
- Try-fail cycle types для каждой главы (yes-but / no-and)
- Foreshadowing ledger с каждым plant и planned payoff
- MICE threads идентифицированы и planned to close в reverse order
- Escalating stakes через Act 2

---

## Специфичные правила для автономного письма

1. **Specificity over abstraction:** "a jay" не "a bird". "lupine" не "flowers". 
   "smell of hot iron" не "a metallic scent".

2. **Earn every metaphor:** Metaphors come from character experience. 
   Blacksmith thinks in heat and metal. Sailor in tides.

3. **Show Don't Tell (operational):** 
   - Critical moments (emotional peaks, revelations, climax) должны быть ZERO tell, all show
   - Detectable telling patterns: "[Character] felt [emotion]", "was [emotion]", 
     "seemed [emotion]", trait declarations, relationship declarations

4. **Fiction-specific AI Tells (kill on sight):**
   - "A sense of [emotion]"
   - "Couldn't help but feel"
   - "The weight of [abstract noun]"
   - "The air was thick with [emotion/tension]"
   - "Eyes widened" (как default surprise reaction)
   - "A wave of [emotion] washed over"
   - "A pang of [emotion]"
   - "Heart pounded in [his/her] chest"
   - "[Raven/dark/golden] hair [spilled/cascaded/tumbled]"
   - "Piercing [blue/green] eyes"
   - "A knowing smile"

5. **Sanderson's Three Laws of Magic:**
   - ZEROTH LAW: "Always err on the side of awesome."
   - FIRST LAW: Author's ability to solve conflict with magic is DIRECTLY PROPORTIONAL 
     to how well reader understands it
   - SECOND LAW: Limitations > Powers
   - THIRD LAW: Expand what you have before adding something new

---

## Локальные инструменты (без внешних API)

**Все операции выполняются через встроенные инструменты Kilo:**

| Функция | Инструмент | Описание |
|---------|-----------|----------|
| Writing | Текущая модель Kilo | Генерация текста через настроенную в `kilo.json` модель |
| Evaluation | Текущая модель Kilo + bash scripts | Механическая оценка через python scripts |
| Review | Текущая модель Kilo (dual persona) | Self-review через смену промпта |
| Art | ACE Step skill | Генерация обложек через http://127.0.0.1:7860/ |
| Typeset | LaTeX + python | Локальная сборка PDF/ePub |
| Audiobook | Текущая модель Kilo + TTS | Генерация скриптов для локального TTS |

**Зависимости:**
- Python 3.12+ с `uv` для управления пакетами
- LaTeX (texlive) для typesetting
- ACE Step (локальная генерация изображений)
- Настроенная LLM в `kilo.json` → `model`

---

## Быстрый старт

```bash
# Setup в текущем проекте
mkdir -p autonovel && cd autonovel

# Install dependencies (если есть python scripts)
uv sync 2>/dev/null || true

# Начать с seed concept (или написать свой в seed.txt)
# Запустить foundation phase через Kilo agent
```

Все операции выполняются через Kilo agent с использованием встроенной LLM (heretic-uncensored на localhost:8080). 
Никаких внешних API ключей не требуется.

---

## Исходный код проекта

**FRAMEWORK (reusable, on master):**
- `program.md` — Agent instructions per phase
- `CRAFT.md` — Craft education (plot, character, world, prose)
- `ANTI-SLOP.md` — Word-level AI tell detection
- `ANTI-PATTERNS.md` — Structural AI pattern detection
- `PIPELINE.md` — Full automation specification
- `WORKFLOW.md` — Step-by-step human guide

**TEMPLATES (filled per-novel on a branch):**
- `voice.md` — Guardrails + voice discovery
- `world.md` — World bible
- `characters.md` — Character registry
- `outline.md` — Chapter outline
- `canon.md` — Hard facts database
- `MYSTERY.md` — Central mystery (author-only)
- `state.json` — Pipeline state tracker

---

## Использование навыка

**Чтобы начать новый роман:**

1. Создать ветку `autonovel/<novel-tag>` от master
2. Прочитать все layer files для полного контекста
3. Проверить `state.json` — фаза должна быть `foundation`
4. Начать итерации foundation

**Чтобы продолжить существующий роман:**

1. Проверить `state.json` для текущей фазы
2. Прочитать relevant layer files
3. Выполнить соответствующий инструмент (evaluation, drafting, revision)
4. Логировать все изменения в `results.tsv`
5. Commit с описательным сообщением

---

## Примечания для агента

- **NEVER STOP** во время фазы. Keep looping until interrupted.
- **Simpler is better:** Don't add complexity для marginal gains.
- **Forward progress over perfection:** В Phase 2, 6.0 chapter достаточно.
  Phase 3 — для polish.
- **Log everything:** Every experiment в `results.tsv`.
- **Fight stability:** Actively push toward transformation, cost, и genuine consequence.
- **Все инструменты локальные:** Использовать текущую модель Kilo (из `kilo.json` → `model`), 
  ACE Step для арта, локальные python scripts для evaluation. Никаких внешних API.

---

## История production

**Первый роман:** *The Second Son of the House of Bells*

- **Foundation:** World bible, 8 characters, 24-chapter outline, voice discovery
- **Drafting:** 24 главы, 75,698 слов, sequential с evaluation
- **Revision:** 6 automated cycles + 6 Opus review rounds
- **Structural:** 24 → 19 глав через 4 merges
- **Art:** Linocut cover (Nano Banana 2), 19 woodcut chapter ornaments (vectorized)
- **Audiobook:** 19 глав parsed в 4,179 speaker-attributed segments
- **Final:** 79,456 слов, 6 review rounds, все major items resolved

(End of file - total 390 lines)
