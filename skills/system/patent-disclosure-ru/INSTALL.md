# Инструкция по установке

Навык следует структуре [AgentSkills](https://agentskills.io): корень репозитория — корень навыка, содержит `SKILL.md`.

## Claude Code

Установка в **корне git-репозитория**:

```bash
mkdir -p .claude/skills
git clone <URL_репозитория> .claude/skills/patent-disclosure-skill
```

или локальное копирование в `.claude/skills/patent-disclosure-skill`.

Время выполнения обычно устанавливает **`CLAUDE_SKILL_DIR`** — корень навыка; `${CLAUDE_SKILL_DIR}/prompts/...` в `SKILL.md` указывает на этот путь.

## Cursor

Cursor поддерживает соглашение [Agent Skills](https://www.cursor.com/docs/context/skills): каждый навык — **подкаталог** с корневым `SKILL.md` (поле `name` должно совпадать с именем каталога, здесь `patent-disclosure-skill`). Можно разместить **полный репозиторий** в одном из следующих путей, перезапустить Cursor и проверить обнаружение в **Settings → Rules**; также можно использовать Agent через `/` и выбрать название навыка.

### Глобально (все проекты)

| Система | Рекомендуемый путь |
|---------|-------------------|
| Windows | `%USERPROFILE%\.cursor\skills\patent-disclosure-skill\` |
| macOS / Linux | `~/.cursor/skills/patent-disclosure-skill/` |

Пример:

```bash
mkdir -p ~/.cursor/skills
git clone <URL_репозитория> ~/.cursor/skills/patent-disclosure-skill
```

Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills"
git clone <URL_репозитория> "$env:USERPROFILE\.cursor\skills\patent-disclosure-skill"
```

### Локально (один проект)

Поместить навык в:

`<Корень_проекта>/.cursor/skills/patent-disclosure-skill/`

(также требует полного дерева файлов, и **`SKILL.md` name: patent-disclosure-skill** совпадает с именем каталога.)

## Опциональные зависимости

Если используется только Markdown-процесс заявки — Python не требуется.

Для **`tools/md_to_docx.py`** (Markdown → Word), **`tools/docx_to_md.py`** (Word → Markdown + изображения), **`tools/pptx_to_md.py`** (PPT → Markdown + изображения):

```bash
pip install -r requirements.txt
```

Финальная доставка заявки — **`.md` + `.docx`**, и mermaid-диаграммы (разделы **3.2** и **3.4**) — через **`tools/mermaid_render.py`** в PNG. mermaid — Node.js: в **`tools/`** выполнить **`npm install`** (включая **`puppeteer`**); если `mmdc` не находит Chrome — выполнить **`npx puppeteer browsers install chrome-headless-shell`**. См. **`tools/README.md`**.

## Опционально: проверка новизны в ФИПС (Шаг 5 — приоритетный путь)

Для **`tools/fips_epub_search.py`** (один шаг, рекомендуется) или **`tools/fips_epub_crawler.py`** / **`tools/fips_epub_parse.py`** ([fips.ru](https://fips.ru/), см. `prompts/prior_art_search.md`):

```bash
pip install -r tools/requirements-fips.txt
python -m playwright install chromium
```

**Windows терминал**: `fips_epub_search.py` / `fips_epub_crawler.py` уже пытаются **UTF-8** (через `reconfigure`). Если всё ещё кракозябры — выполнить **`chcp 65001`** или установить переменную **`PYTHONUTF8=1`**, чтобы скопировать строку **`EPUB_HITS_JSON:`** без ошибок.

Независимо от основного `requirements.txt`; без установки — Шаг 5 по умолчанию использует **WebSearch**.
