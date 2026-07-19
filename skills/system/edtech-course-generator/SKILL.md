# Skill: edtech-course-generator

## Название
EdTech Course Generator (ЭдТех-Комбайн 2.0)

## Описание
Трансформирует сухие методические тексты в высококонверсионные детские образовательные продукты (PPTX-квесты, аудио-подкасты). Суверенная ИИ-экосистема (Level 8) работает локально (vLLM, ComfyUI, Kokoro). Применяет GraphRAG для стабильности контекста, симулирует эмоциональное состояние ученика, обновляет собственную базу знаний и генерирует верифицируемые цифровые сертификаты (Open Badges). Идеален для EdTech-сценаристов, методистов и разработчиков платформ.

## Triggers
- "сделай интерактивный курс/квест для детей по теме..."
- "edtech комбайн", "генерация образовательного подкаста"
- "создай программу и презентацию для когорты [возраст]"
- "суверенный edtech агент"

## Fallback-Логика (Умные умолчания)
- Если **возраст (cohort)** не указан: Агент обязан самостоятельно проанализировать тему и определить оптимальную целевую аудиторию (например, "Финансовая грамотность" -> 10-12 лет) и явно сообщить об этом пользователю.
- Если **тема** слишком широкая: Агент обязан сузить её до 1-2 конкретных концептов для соблюдения лимитов внимания.
- Если **VRAM** не хватает: Агент должен предложить отключить SFX в аудио или упростить рендер визуалов (переход на SDXL Turbo).

## School / Classroom Scale Mode (Масштабирование)
Если система генерирует курс для всего класса (группы):
- Агент формирует курс с 3–5 уровнями дифференциации внутри одной группы.
- Создается Teacher Console (Dashboard) с групповой аналитикой.
- Система автоматически формирует малые группы (Peer-to-peer / Collaborative) на основе взаимодополняющих когнитивных профилей (например, Стратег + Исполнитель).

## Output Contract (Гарантированный вывод)
При успешном завершении работы, агент **ОБЯЗАН** предоставить:
1. **CourseManifest** (JSON) — структура курса, цели (Bloom), пререквизиты, Curriculum Alignment (ФГОС/4K).
2. **Interactive Presentation** (JSON/PPTX) — граф слайдов, включая Character Lore, ветвления (Choices) и Group Tasks.
3. **Podcast Script** (JSON/MP3) — сценарий аудио-обзора со звуковыми эффектами и эмоциями.
4. **Parent Report** (Markdown) — краткий отчет о ценности курса для родителя.
5. **Critic Scorecard** (Markdown) — отчет о пройденных Multi-Stage проверках (включая Predicted Engagement Score).
6. **Export & LMS Integration** — генерация структуры, совместимой со SCORM/xAPI для Moodle/Google Classroom, а также Printable PDF (рабочие тетради/worksheets, AR-маркеры для ComfyUI картинок и ключи для преподавателей).
7. **Interactive Web Demo** (HTML/JS) — мини-курс, запускаемый одним кликом (Single-file demo) для мгновенной проверки.
8. **Teacher Console** (JSON) — структура UI дашборда для преподавателя с Group Analytics.
9. **Research Summary** (Markdown) — обоснование выбранных методик со ссылками на Cognitive Science.
10. **Open Badges & Portfolio** (JSON) — верифицируемые цифровые сертификаты (Open Badges 2.0) и эссе ученика о пройденном пути.
11. **Deployment Package** (JSON/YAML) — "одна команда" (docker-compose snippet и инструкции) для мгновенного развертывания готового курса на сервере.

## Workflow (Архитектура Пайплайна)

### Chain-of-Thought (Шаблон рассуждений агента перед стартом)
Каждый запуск начинается с внутреннего рассуждения в тегах `<thought>`:
1. **Analyze Request:** Какая тема? Какая цель? Какой контекст?
2. **Age & Level Detection:** Явно определяю возрастную когорту.
3. **Hardware Check:** Сколько памяти доступно? Какие модели использовать?
4. **Safety Check:** Нет ли в запросе запрещенных или чувствительных тем?

### Priority Order (Строгая последовательность модулей)
1. **Analyze Request & Age Detection** (Всегда сначала определяем ЦА).
2. **Pedagogical Goals (CourseManifest)** (Что дети должны понять?).
3. **GraphRAG Ingestion** (Формирование базы знаний).
4. **Curriculum Planner** (Формирование долгосрочного пути, мостов и зависимостей).
5. **Course Outline Generation** (Структура курса/уроков).
6. **Multi-Stage Critic, Learner Simulation & Self-Reflection** (До 2 итераций).
7. **Media Generation (ComfyUI + Kokoro)**.
8. **Final Render + Validation**.

### Anti-Hallucination Anchors (Стоп-слова и проверки)
- **ЗАПРЕЩЕНО:** "Представь, что ты...", если это нарушает физические законы (например, "электроны влюбляются").
- **ОБЯЗАТЕЛЬНО:** Каждая образовательная концепция должна иметь `source_quote` из исходного текста.
- **ЗАПРЕЩЕНО:** Использовать факты из интернета, отсутствующие в GraphRAG (выдуманные даты, события, которых нет в методичке).

**1. Ingestion (GraphRAG & Community Summaries)**
- Чтение сырого текста -> Извлечение Nodes/Edges -> Community Detection -> Формирование Hierarchical Summary. Обоснование фактов через `source_quotes`.

**2. Pedagogical Design (Methodology & Age Context)**
- Определение когорты: `resources/age-profiles/`.
- Наложение фреймворков (ТРИЗ, Bloom, UDL): `resources/pedagogical-frameworks/`.

**3. Content Generation (Guided Decoding & Modalities)**
- Использование `pydantic_schemas.py` для 100% валидного JSON.
- Рендеринг визуалов и аудио-ремарок: `resources/multimodal/`.

**4. Multi-Stage Critic (Self-Reflection)**
- Запуск 4-этапной проверки (Педагогика, Вовлеченность, Доступность, Техническая валидация): `resources/evaluation/`.
- 1-2 итерации Self-Reflection в случае обнаружения ошибок.

**5. Rendering & Delivery**
- Сборка итоговых файлов (PPTX, MP3) с учетом VRAM лимитов (`resources/architecture.md`).
