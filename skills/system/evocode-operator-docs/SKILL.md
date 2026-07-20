---
name: evocode-operator-docs
triggers:
  - evocode operator docs
  - не показывай код
  - markdown preview
  - режим оператора
  - visual document
  - без разметки
  - предпросмотр
  - html preview
  - документы
  - документ
  - оператор
  - operator
  - preview
  - отчет
version: "1.0.0"
description: >-
  [RU] Режим оператора: работа с HTML/MD как с документами (preview), без правки сырой разметки по умолчанию.
  [EN] Operator mode: HTML/Markdown as documents via preview, avoid raw markup edits by default.
tier: core
domain: docs
pack: evocode-core
lang: [ru, en]
priority: 85
persona: false
inject_mode: core_only
max_inject_chars: 3200
---

# Эвокод: режим оператора (документы)

## When to use

- Пользователь — оператор, не разработчик: отчёты, HTML-страницы, MD-инструкции.
- Нужен preview / «открой как документ».
- Правки содержания без погружения в сырой HTML/MD (по возможности).

## When NOT to use

- Явный запрос «покажи исходник», «edit raw HTML», рефакторинг фронтенда.
- Задачи чистого кодинга (React/API) — другие skills.

## Procedure

1. **Открытие:** в Эвокод `*.html` / `*.md` по умолчанию — Custom Preview (webview), не raw editor.
2. **Правки содержания:** меняй смысл/текст/структуру; сохраняй валидность HTML/MD.
3. **Для HTML:** учитывай `<base href>` для локальных CSS/картинок; не тяни внешние CDN без нужды.
4. **Для MD:** простой рендерер (не полный GFM) — избегай экзотических расширений.
5. **Исходник:** только по явной просьбе («открой как код», «покажи разметку»).
6. **Язык UI/ответов:** русский, если пользователь пишет по-русски.

## Constraints

- Не заставляй оператора править CSS/JS без запроса.
- Не ломай относительные пути к assets.
- Privacy: локальные документы не уводить в cloud без нужды (см. `evocode-privacy-policy`).

## Verification

- [ ] Документ читается в preview.
- [ ] После правки preview остаётся консистентным.
- [ ] Raw-режим только по запросу.
