#!/usr/bin/env python3
"""
Добавить запись в лог итераций заявки: время (локальное + UTC), сводка пользователя, имя доставки, выдержка сводки.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_LOG = "Лог_итераций_заявки.md"

FILE_HEADER = """# Лог итераций заявки

> Добавляется `iteration_dialog_log.py` или Agent по `prompts/iteration_context.md`; каждая запись содержит **время** и пояснение. Не удаляйте существующие записи.

"""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Append one revision dialog entry to case-dir log markdown"
    )
    parser.add_argument(
        "--case-dir",
        type=Path,
        required=True,
        help="Каталог проекта (на том же уровне, что и .md заявки, или родитель, должен существовать)",
    )
    parser.add_argument(
        "--kind",
        choices=("merge", "correct"),
        required=True,
        help="merge=слияние; correct=исправление",
    )
    parser.add_argument(
        "--user",
        default="",
        help="Сводка пояснения пользователя (рекомендуется 1–8 предложений)",
    )
    parser.add_argument(
        "--summary",
        default="",
        help="Короткая выдержка сводки слияния/исправления (может быть согласована с архивом в диалоге)",
    )
    parser.add_argument(
        "--artifacts",
        default="",
        help="Имя файлов доставки этого этапа, разделённые запятыми, например: название_изобретения_20260512103000.md,название_изобретения_20260512103000.docx",
    )
    parser.add_argument(
        "--log-name",
        default=DEFAULT_LOG,
        help=f"日志文件名（默认：{DEFAULT_LOG}）",
    )
    args = parser.parse_args()

    case_dir = args.case_dir.expanduser().resolve()
    if not case_dir.is_dir():
        f"ERROR: Каталог не существует или не является каталогом: {case_dir}", file=sys.stderr)
        return 2

    log_path = case_dir / args.log_name
    now_local = datetime.now().astimezone()
    now_utc = datetime.now(timezone.utc)
    kind_zh = "Слияние" if args.kind == "merge" else "Исправление"

    user_block = (args.user or "").strip() or "（не передано --user, Agent должен добавить пояснение пользователя вручную）"
    summary_block = (args.summary or "").strip() or "—"
    art = (args.artifacts or "").strip()
    if art:
        art_lines = "\n".join(f"- `{x.strip()}`" for x in art.split(",") if x.strip())
    else:
        art_lines = "—"

    entry = f"""## {now_local.strftime("%Y-%m-%d %H:%M:%S")}（本地） · {now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")}（UTC）

**类型**：{kind_zh}

**用户说明摘要**：

{user_block}

**本轮交付文件**：

{art_lines}

**Сводка слияния/исправления**:

{summary_block}

---

"""

    if log_path.exists():
        prev = log_path.read_text(encoding="utf-8")
        if prev and not prev.endswith("\n"):
            prev += "\n"
        log_path.write_text(prev + "\n" + entry, encoding="utf-8")
    else:
        log_path.write_text(FILE_HEADER + "\n" + entry, encoding="utf-8")

    print(f"LOG_FILE={log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
