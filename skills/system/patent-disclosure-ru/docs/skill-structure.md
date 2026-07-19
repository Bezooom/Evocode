# Структура репозитория навыка

## Принципы дизайна

- **`SKILL.md`**: вход и оркестровка; детали — в **`prompts/`**, загружаются **`Read`** во время выполнения; избегание слишком длинных файлов.
- **`tools/`**: опциональные скрипты, отделены от оркестровки. Word/PPT → текст для сканирования — `docx_to_md.py` / `pptx_to_md.py`; приоритетный поиск — `fips_epub_search.py` (один шаг; для сохранения HTML или парсинга — `fips_epub_crawler.py` / `fips_epub_parse.py`, см. `prior_art_search.md`).
- **`outputs/`**: весь каталог в `.gitignore`; примеры — **`examples/`**.
- **`examples/`**: примеры **материалов** (например `knowledge/`); результат — в `outputs/`.

## Каталог

| Путь | Описание |
|------|----------|
| `SKILL.md` | Условия активации, отображение инструментов, порядок шагов, индекс `prompts/` |
| `prompts/` | Пошаговые шаблоны (ввод, сканирование, патентные решения, проверка, предпросмотр, генерация, самопроверка, итерация) |
| `prompts/template_reference.md` | Детали разделов заявки и примеры mermaid |
| `tools/` | `mermaid_render.py`, `md_to_docx.py`, `docx_to_md.py`, `pptx_to_md.py`, `fips_epub_search.py`, `fips_epub_crawler.py`, `fips_epub_parse.py`; mermaid требует Node; поиск ФИПС — Playwright, см. `tools/README.md` |
| `examples/example_batch_job_scheduler/` | Пример: только **`knowledge/`** — вымышленные материалы (патентные решения/заявка генерируются в `outputs/`) |
| `docs/PRD.md` | Сводка процесса и ограничений |
| `docs/skill-structure.md` | Эта структура |
| `docs/результат-*.jpg` | Скриншоты "Результаты" в README |

## Переменная окружения `CLAUDE_SKILL_DIR`

В Claude Code, OpenClaw и других средах — корень навыка (каталог с `SKILL.md`). В Cursor — корень репозитория; `${CLAUDE_SKILL_DIR}/prompts/...` эквивалентно `./prompts/...`.

## Рекомендации по пути финальной доставки

Рекомендуется каждый раз:

`outputs/{идентификатор_проекта}/`

Можно скопировать структуру `examples/example_batch_job_scheduler/knowledge/` в свой каталог проекта (или `outputs/{идентификатор_проекта}/knowledge/`) и заменить материалами.

**Логирование доставки**: все финальные версии заявки (включая **первичную Шаг 7 и итерации**) — имя **`{название_изобретения}_{YYYYMMDDHHmmss}.md`** и同名 **`.docx`** (см. **`prompts/disclosure_builder.md` §7.3 пункт 5**), старые версии сохраняются в том же каталоге. При итерации — **`Лог_итераций_заявки.md`** (**`tools/iteration_dialog_log.py`** или вручную). Процесс — **`prompts/iteration_context.md`**.
