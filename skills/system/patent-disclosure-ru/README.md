<div align="center">

# Техническая заявка на изобретение — Skill

> От проектной документации к **готовой технической заявке**: поиск патентных решений, **приоритетный поиск в ФИПС (Роспатент)**, обезличенная генерация и самопроверка.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-mermaid%2Fmmdc-339933.svg)](https://nodejs.org/)
[![AgentSkills](https://img.shields.io/badge/AgentSkills-Standard-green)](https://agentskills.io)

<br>

Есть проектные документы и код, но **патентные решения не выделены**?
Техническая заявка требует **блок-схемы системы**, **блок-схемы процесса** и **Word для патентного поверенного**?
После финальной доставки — **итерации добавления материалов и исправления** с **отслеживанием изменений файлов**?
Поиск в ФИПС (Роспатент) с **стабильным парсингом и точными результатами**?

**Skill организован по AgentSkills, `SKILL.md` + `prompts/` — пошаговый процесс, читаемый и итеративный.**

[Функции](#функции) · [Установка](#установка) · [Использование](#использование) · [Структура](#структура) · [Примеры](#примеры) · [Результаты](#результаты) · [Документация](#документация) · [Подробная установка](INSTALL.md) · [Вход](SKILL.md)

</div>

---

## Функции

| Возможность | Описание |
|-------------|----------|
| Сканирование проекта | Приоритетное чтение документов/кода; `.docx`/`.pptx` — сначала конвертация в Markdown (см. `prompts/project_scan.md`) |
| Поиск патентных решений | Кандидаты и слияние (`patent_points_analyzer.md`) |
| Проверка новизны | **Приоритетно** [ФИПС (Роспатент)](https://fips.ru/): `tools/fips_epub_search.py` для точного поиска; при ошибке — **WebSearch** (Google Scholar / Google Patents). Библиография — в раздел I (см. `prior_art_search.md`) |
| Генерация заявки | Обезличенный шаблон + **mermaid**-диаграммы; `mermaid_render.py` → PNG, **по умолчанию .docx** |
| Именование доставки | Все доставки: **`{название_изобретения}_{YYYYMMDDHHmmss}.md`** и同名 **.docx** (`disclosure_builder.md` §7.3) |
| Самопроверка | Логика и связность, формулы и параметры (`disclosure_self_check.md`, не写入正文) |
| Итерация | **Слияние** / **Исправление** — новые файлы; **`Лог_итераций_заявки.md`** — построчно (см. `iteration_context.md`, `iteration_dialog_log.py`) |

**Конвертация Office**: `.docx`/`.pptx` — сначала `docx_to_md.py`/`pptx_to_md.py` в Markdown, затем сканирование (см. `SKILL.md`).

**Зависимости Python (по файлам)**:
- **Базовые (Office / конвертация заявки)**: корневой [`requirements.txt`](requirements.txt) — `pip install -r requirements.txt`
- **Проверка новизны (ФИПС, опционально)**: [`tools/requirements-fips.txt`](tools/requirements-fips.txt) — `pip install -r tools/requirements-fips.txt`, затем `python -m playwright install chromium`  
  Без установки — Шаг 5 перейдёт на **WebSearch** по умолчанию. См. [INSTALL.md](INSTALL.md), [tools/README.md](tools/README.md).

---

## Установка

### Claude Code

> Разместите каталог в **корне git-репозитория** или в глобальном пути skills, чтобы `SKILL.md` был в корне (см. [INSTALL.md](INSTALL.md)).

```bash
# Пример: установка в skills текущего проекта
mkdir -p .claude/skills
git clone <URL_репозитория> .claude/skills/patent-disclosure-skill
```

### Cursor

Поместите полный репозиторий в путь skills Cursor (см. таблицу в [INSTALL.md](INSTALL.md)), перезапустите и проверьте в **Settings → Rules** обнаружение навыка.

### Зависимости

```bash
# Базовые (конвертация Office, Python-пакеты заявки)
pip install -r requirements.txt
```

```bash
# Опционально: проверка новизны ФИПС
pip install -r tools/requirements-fips.txt
python -m playwright install chromium
```

Для финальных диаграмм нужен **Node.js**; в `tools/` — `npm install` (или `npx mmdc`); см. [tools/README.md](tools/README.md).

---

## Использование

Опишите потребность в natural language, например:

- Поиск патентных решений, патентные решения, **техническая заявка**, проверка новизны, сравнение с предшествующим уровнем техники  
- Косвенные команды (зависит от хост-приложения): `/patent-disclosure-skill`, `/заявка`

Рекомендуется указать **путь к проекту** или **техническую тему** (см. `argument-hint` в `SKILL.md`).  
**Проверка новизны (Шаг 5)** — приоритетно через [ФИПС (Роспатент)](https://fips.ru/), затем по запросу — другие источники; процесс — в `prompts/prior_art_search.md`.  
Для **итераций над готовой заявкой** — не нужно говорить «итерация»; навык распознаёт намерение и использует `merger.md` / `correction_handler.md`; детали в [SKILL.md](SKILL.md).

---

## Структура

Репозиторий следует [AgentSkills](https://agentskills.io), корень — один skill:

```
patent-disclosure-skill/
├── SKILL.md                    # Вход: условия активации, таблица инструментов, шаги и ссылки на prompts
├── prompts/                    # Пошаговые шаблоны (Agent читает и выполняет)
│   ├── intake.md
│   ├── project_scan.md
│   ├── patent_points_analyzer.md
│   ├── prior_art_search.md
│   ├── disclosure_preview.md
│   ├── disclosure_builder.md
│   ├── disclosure_self_check.md
│   ├── iteration_context.md
│   ├── merger.md
│   ├── correction_handler.md
│   └── template_reference.md
├── tools/                      # mermaid_render, md_to_docx, docx_to_md, pptx_to_md; ФИПС fips_epub_* (проверка новизны); iteration_dialog_log и др.
├── docs/                       # PRD, структура репозитория, скриншоты (результат-*.jpg)
├── examples/                   # Примеры материалов (например example_batch_job_scheduler/knowledge/)
├── outputs/                    # Каталог пользователя, по умолчанию .gitignore
├── requirements.txt
├── LICENSE
├── INSTALL.md
└── .gitignore
```

---

## Примеры

Материалы для тренировки — [examples/README.md](examples/README.md) (например `examples/example_batch_job_scheduler/knowledge/`).  
**Фактические** патентные решения, чек-листы, технические заявки — генерируются в **`outputs/{идентификатор_проекта}/`**.

---

## Результаты

**Первичная доставка** (первая финальная версия)

![Первичная доставка: каталог outputs с timestamp-файлами, каталог mermaid-диаграмм и т.д.](docs/результат-первичная.jpg)

**Итерация** (после слияния/исправления — несколько версий + лог)

![Итерация: новые timestamp-файлы и лог итераций](docs/результат-итерация.jpg)

---

## Документация

- [Вход и процесс Agent](SKILL.md) (условия, отображение prompts, таблица инструментов)
- [Подробная установка](INSTALL.md) (Claude Code / Cursor)
- [Диаграммы и скрипты конвертации](tools/README.md) (mermaid/mmdc, Word, проверка новизны ФИПС)
- [Примеры и материалы](examples/README.md)
- [Процесс и каталоги](docs/PRD.md)
- [Структура](docs/skill-structure.md)
- [Детали шаблона заявки](prompts/template_reference.md)

---

<div align="center">

MIT License © [handsomestWei](https://github.com/handsomestWei/)

</div>
