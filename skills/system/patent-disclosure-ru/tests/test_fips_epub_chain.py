# -*- coding: utf-8 -*-
"""
Цепочечная проверка: совместимость с инструментами — запуск ``tools/fips_epub_search.py`` (один шаг: парсинг + поиск, **HTML не** сохраняется).

Требуется: pip install -r tools/requirements-fips.txt && python -m playwright install chromium

Выполнить в корне:

  python tests/test_fips_epub_chain.py

Опционально — указать ключевые слова:

  python tests/test_fips_epub_chain.py многоагентная система

Без параметров — используется «поиск» для локальной отладки; **прямой запуск** `fips_epub_search.py` **требует ключевых слов** (без дефолта). Навык требует от Agent: Шаг 5 — **один Bash на термин, самостоятельно объединить JSON** (см. `prior_art_search.md`); этот тест передаёт один раз для отладки.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if argv:
        extra = argv
    else:
        extra = ["поиск"]
    os.environ.setdefault("EPUB_WAF_MAX_WAIT_SEC", "180")

    try:
        import playwright  # noqa: F401
    except ImportError:
        print("Установите: pip install -r tools/requirements-fips.txt", file=sys.stderr)
        return 1

    from fips_epub_search import main as search_main

    return search_main(extra)


if __name__ == "__main__":
    raise SystemExit(main())
