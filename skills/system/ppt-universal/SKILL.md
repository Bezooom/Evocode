---
name: ppt-universal
domain: general
pack: general
tier: optional
triggers:
  - ppt universal
description: >
  Универсальная система генерации презентаций. Поддерживает два формата выхода:
  (1) HTML-презентация в стиле "электронная журнал + электронные чернила" с WebGL фоном
  и горизонтальным переключением слайдов; (2) Нативный PPTX через SVG-страницы с
  многоагентным конвейером (Strategist → Image_Generator → Executor → Post-processing).
  Использовать при запросах "создать презентацию", "сделать PPT", "слайды", "slides",
  "web presentation", "HTML PPT", "pptx".
---

# PPT Universal — Универсальная Генерация Презентаций

> Системный навык, объединяющий два подхода к созданию презентаций:
> **HTML Web PPT** (magazine-style с WebGL) и **PPTX Native** (SVG pipeline).

---

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
│              (тема / источник / формат)                   │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Step 0 · Кларификация (Clarification)                  │
│  6 вопросов → выбор формата → выбор темы                │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────┬───────────────────────────────────────┐
│  HTML Web PPT   │  PPTX Native (ppt-master)             │
│  (magazine)     │  (multi-role pipeline)                │
├─────────────────┤───────────────────────────────────────┤
│ Step 1          │  Step 1 · Source → Markdown           │
│ · Copy template │  Step 2 · Project Init                │
│ · Select theme  │  Step 3 · Template Option             │
│ · Fill slides   │  Step 4 · Strategist (8 confirm.)     │
│ · Preview       │  Step 5 · Image_Generator (cond.)     │
│                 │  Step 6 · Executor (SVG pages)        │
│                 │  Step 7 · Post-processing → PPTX      │
└─────────────────┴───────────────────────────────────────┘
```

---

## Step 0 · Кларификация (必做)

Перед началом работы задать пользователю до 6 вопросов:

| # | Вопрос | Зачем |
|---|--------|-------|
| 1 | **Аудитория и формат?** (конференция,Internal, demo day, private) | Определяет тон и глубину |
| 2 | **Длительность?** (15 мин ≈ 10 слайдов, 30 мин ≈ 20, 45 мин ≈ 25-30) | Определяет объём |
| 3 | **Есть исходники?** (PDF, DOCX, текст, ссылки, старый PPT) | Определяет путь обработки |
| 4 | **Формат выхода?** HTML (web-презентация) или PPTX (нативный PowerPoint) | Определяет конвейер |
| 5 | **Цветовая тема?** (из 5预设 в references/themes.md) | Определяет визуальный стиль |
| 6 | **Жёсткие требования?** (обязательно включить XX, нельзя YY) | Избегает переделок |

**Выбор формата:**
- **HTML Web PPT** — для онлайн-шеринга, быстрых демо, self-hosted, красивого визуала
- **PPTX Native** — для офлайн-показов, редактирования, корпоративных стандартов, печати

---

## Конвейер 1 · HTML Web PPT (Magazine Style)

### Step 1 · Копирование шаблона

```bash
mkdir -p "<project>/ppt/images"
cp "<SKILL_DIR>/assets/template.html" "<project>/ppt/index.html"
```

### Step 2 · Настройка темы

1. Открыть `references/themes.md`
2. Выбрать одну из 5预设 тем
3. Заменить `:root` блок в `index.html` цветами из выбранной темы

### Step 3 · Заполнение контента

#### 3.0 Pre-flight (必做)
- Прочитать `<style>` в `template.html` — все классы должны быть определены
- Если класс отсутствует — добавить в `<style>`, не inline

#### 3.1 Выбор раскладки
- Открыть `references/layouts.md` — 10预设 раскладок
- Выбрать подходящую, вставить `<section>`, заменить контент

#### 3.2 Тема-ритм
- Каждая страница должна иметь `light` / `dark` / `hero light` / `hero dark`
- Правила:
  - Не более 3 страниц подряд одной темы
  - 8+ страниц → минимум 1 `hero dark` + 1 `hero light`
  - Обязательно чередовать `light` / `dark` для正文
  - Каждый 3-4 слайда — hero page

#### 3.3 Изображения
- Стандартные пропорции: 16:10, 4:3, 3:2, 1:1, 16:9
- В сетках: `height:Nvh`, НЕ `aspect-ratio`
- Пути: `images/01-cover.jpg` и т.д.

### Step 4 · Превью

```bash
open "<project>/ppt/index.html"
```

---

## Конвейер 2 · PPTX Native (ppt-master)

Полный multi-role pipeline. Детали в `references/ppt-master-pipeline.md`.

### Overview Pipeline

```
Source → Step 1 (Convert) → Step 2 (Init) → Step 3 (Template)
  → Step 4 (Strategist ⛔ BLOCKING) → Step 5 (Image_Generator cond.)
  → Step 6 (Executor SVG) → Step 7 (Post-process → PPTX)
```

### Ключевые правила

- **SERIAL EXECUTION** — шаги строго последовательны
- **BLOCKING = HARD STOP** — шаг 4 ждёт подтверждения пользователя
- **NO SUB-AGENT SVG** — Executor генерирует SVG самостоятельно
- **SPEC_LOCK RE-READ** — перед каждой страницей перечитать `spec_lock.md`
- **Post-processing** — 3 скрипта, каждый отдельно

### Canvas форматы

| Формат | viewBox |
|--------|---------|
| PPT 16:9 | `0 0 1280 720` |
| PPT 4:3 | `0 0 1024 768` |
| Xiaohongshu | `0 0 1242 1660` |
| Story | `0 0 1080 1920` |

---

## Система раскладок ( unified )

Оба конвейера используют единую систему из 10 раскладок (детали в `references/layouts.md`):

| # | Название | Назначение |
|---|----------|-----------|
| 1 | Hero Cover | Обложка |
| 2 | Act Divider | Переход между актами |
| 3 | Big Numbers | Крупные цифры / статистика |
| 4 | Quote + Image | Текст + изображение |
| 5 | Image Grid | Сетка изображений |
| 6 | Pipeline | Воронка / процесс |
| 7 | Hero Question | Вопрос-обертка |
| 8 | Big Quote | Крупная цитата |
| 9 | Before / After | Сравнение |
| 10 | Lead Image + Side Text | Плотный контент с изображением |

---

## Система цветовых тем

5预设 тем (детали в `references/themes.md`):

| Тема | Психология | Подходит для |
|------|-----------|--------------|
| 🖋 墨水经典 | Чистый чёрный + тёплый беж | Универсальная, бизнес |
| 🌊 靛蓝瓷 | Индиго + фарфор | Технологии, наука |
| 🌿 森林墨 | Лесной зелёный + слоновая кость | Экология, культура |
| 🍂 牛皮纸 | Коричневый + беж | Ностальгия, литература |
| 🌙 沙丘 | Угольный + песок | Арт, дизайн |

---

## Компоненты

Доступные компоненты (детали в `references/components.md`):

- **Typography** — 9 уровней шрифтов (serif / sans-serif / monospace)
- **Stat** — карточки цифр
- **Callout** — цитаты и выделения
- **Platform Cards** — карточки платформ
- **Rowline** — табличные строки
- **Pillar** — опорные карточки
- **Figure / Frame-img** — контейнеры изображений
- **Icons** — Lucide (не emoji!)
- **Ghost** — гигантские фоновые символы
- **Highlight** — маркер-эффект

---

## Чек-лист качества

Полный чек-лист в `references/checklist.md`. Ключевые P0:

1. ✅ Все классы определены в `template.html` (HTML PPT) / `spec_lock` (PPTX)
2. ✅ Нет emoji, только Lucide icons
3. ✅ Изображения только `height:Nvh`, не `aspect-ratio` в сетках
4. ✅ Hero и non-hero чередуются
5. ✅ Шрифты: заголовки serif, body sans-serif, metadata monospace
6. ✅ Нет 1-символьных строк в заголовках
7. ✅ `chrome` и `kicker` — разный контент

---

## Resource Map

```
<SKILL_DIR>/
├── SKILL.md                     ← этот файл
├── references/
│   ├── layouts.md               ← 10 раскладок (HTML PPT)
│   ├── themes.md                ← 5 цветовых тем
│   ├── checklist.md             ← чек-лист качества
│   ├── components.md            ← справочник компонентов
│   └── ppt-master-pipeline.md   ← детали PPTX конвейера
└── assets/
    └── template.html            ← HTML шаблон (seed file)
```

## Загрузка ресурсов

1. Прочитать `SKILL.md` (этот файл)
2. Для HTML PPT: прочитать `assets/template.html` `<style>` блок
3. Выбрать раскладку из `references/layouts.md`
4. Выбрать тему из `references/themes.md`
5. Для деталей: `references/components.md`
6. После генерации: `references/checklist.md`
