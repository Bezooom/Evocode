# -*- coding: utf-8 -*-
"""
ФИПС (Роспатент) — «поиск + парсинг» одним шагом: HTML результатов в памяти, **по умолчанию не** на диск.

Внутренний вызов ``fips_epub_crawler.search_epub_keyword`` (аналогично ``fetch_epub_result_html`` →
``parse_search_result_html``).

**Соглашение вывода** (для стабильного парсинга Agent):

- **stdout**: **одна строка** ``EPUB_HITS_JSON:`` + JSON-массив (UTF-8, включая русские названия и ``abstract``).
- **stderr**: ``EPUB_MERGE:`` / ``EPUB_NOTE:`` / ``EPUB_HINT:`` — **ASCII** для избежания ошибок PowerShell
  при кодировке русского текста. stdout JSON — UTF-8. При старте — ``reconfigure`` UTF-8.

**Разделение поисковых запросов (только пробелы)**: все argv-аргументы делятся по **Python-пробелам** (``str.split()``);
**один запрос = одна проверка**, результаты объединяются по номеру публикации. **Автоматическая токенизация**
длинных фраз **не** выполняется — Agent должен сформировать **семантические поисковые блоки** перед вызовом
(см. ``prompts/prior_art_search.md`` «Поисковые запросы (обязательно до генерации команды)»).
Для **полных фраз с AND** — использовать ``fips_epub_crawler.py``.

Требуется: pip install -r tools/requirements-fips.txt && python -m playwright install chromium

Использование:

  python tools/fips_epub_search.py термин1
  python tools/fips_epub_search.py "фраза  с пробелами"
  python tools/fips_epub_search.py термин1 термин2 термин3

**Обязательно** хотя бы один непустой поисковой запрос; **по умолчанию нет**.

Для сохранения HTML на диск — ``fips_epub_crawler.py``; для парсинга существующего HTML — ``fips_epub_parse.py``.

Переменные окружения: те же, что и в ``fips_epub_crawler.py`` (например ``EPUB_WAF_MAX_WAIT_SEC``, ``PLAYWRIGHT_HEADED``).
"""
from __future__ import annotations

import json
import os
import sys

_MAX_TERMS = 8


def _ensure_utf8_stdio() -> None:
    """在 Windows 等环境下将 stdout/stderr 设为 UTF-8，避免中文 JSON 在终端乱码导致误判检索失败。"""
    for stream in (sys.stdout, sys.stderr):
        try:
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")
        except (OSError, ValueError, TypeError):
            pass


def _terms_from_argv(argv: list[str]) -> list[str]:
    """从所有 argv 片段中按空白拆分（等价 str.split，连续空格视为一次分隔）。"""
    terms: list[str] = []
    for a in argv:
        for part in (a or "").split():
            p = part.strip()
            if p:
                terms.append(p)
    return terms


def _dedupe_hits(hits_lists: list) -> list:
    from fips_epub_parse import EpubSearchHit

    seen: set[str] = set()
    out: list[EpubSearchHit] = []
    for hits in hits_lists:
        for h in hits:
            key = h.pub_number or h.link or (h.title or "")[:120]
            if key in seen:
                continue
            seen.add(key)
            out.append(h)
    return out


def _usage() -> None:
    print("usage: python tools/fips_epub_search.py <term> [more terms...]", file=sys.stderr)
    print(
        "whitespace splits to multiple terms; one Playwright run per term; merge by pub_number.",
        file=sys.stderr,
    )
    print('example: python tools/fips_epub_search.py "многоагентная система квантовое"', file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    _ensure_utf8_stdio()
    argv = argv if argv is not None else sys.argv[1:]
    terms = _terms_from_argv(argv)
    if not terms:
        _usage()
        return 2
    if len(terms) > _MAX_TERMS:
        print(
            "ERROR: too many terms after split (%d > %d); shorten or run in batches."
            % (len(terms), _MAX_TERMS),
            file=sys.stderr,
        )
        return 2

    os.environ.setdefault("EPUB_WAF_MAX_WAIT_SEC", "180")

    try:
        import playwright  # noqa: F401
    except ImportError:
        print(
            "ERROR: pip install -r tools/requirements-fips.txt && python -m playwright install chromium",
            file=sys.stderr,
        )
        return 1

    from fips_epub_crawler import search_epub_keyword
    from fips_epub_parse import hits_to_jsonable

    multi = len(terms) > 1
    last_html = ""
    all_batches: list = []

    try:
        for kw in terms:
            html, hits = search_epub_keyword(kw)
            last_html = html
            all_batches.append(hits)
    except Exception as e:
        print("FIPS_EPUB_ERROR:", e, file=sys.stderr)
        return 1

    if multi:
        hits = _dedupe_hits(all_batches)
        print(
            "EPUB_MERGE: terms=%d merged_hits=%d" % (len(terms), len(hits)),
            file=sys.stderr,
            flush=True,
        )
    else:
        hits = all_batches[0]

    if not hits and last_html and len(last_html) < 20_000:
        if multi:
            print(
                "EPUB_HINT: 0 hits after multi-term run; try broader terms or WebSearch (prior_art_search.md)",
                file=sys.stderr,
                flush=True,
            )
        else:
            print(
                "EPUB_HINT: 0 hits; try more terms (space-separated) or WebSearch",
                file=sys.stderr,
                flush=True,
            )

    print(
        "EPUB_NOTE: html_bytes=%d disk=0" % len(last_html),
        file=sys.stderr,
        flush=True,
    )
    # 仅此一行写入 stdout，供管道/Agent 稳定解析（勿混入多行文本，避免误判未命中）
    print(
        "EPUB_HITS_JSON:",
        json.dumps(hits_to_jsonable(hits), ensure_ascii=False),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
