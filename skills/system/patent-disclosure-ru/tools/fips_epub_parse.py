# -*- coding: utf-8 -*-
"""
Парсинг HTML результатов поиска ФИПС (Роспатент), извлечение из списка публикаций:
название, номер публикации, ссылка, аннотация (если есть).

Совместим с ``fips_epub_crawler.py`` / ``fips_epub_search.py`` (один шаг поиска+парсинг):
после сохранения HTML爬虫ом — парсить отдельным модулем; или import из других скриптов.
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

EPUB_BASE = "https://fips.ru/"


@dataclass
class EpubSearchHit:
    """单条检索命中（字段随页面结构尽力解析，可能为空）。"""

    raw_html: str
    title: str | None = None
    pub_number: str | None = None
    link: str | None = None
    abstract: str | None = None


def _html_fragment_to_plain(html_snippet: str) -> str:
    """从一小段 HTML 抽取可读纯文本（用于摘要等）。"""
    t = re.sub(r"<script[^>]*>.*?</script>", "", html_snippet, flags=re.I | re.DOTALL)
    t = re.sub(r"<style[^>]*>.*?</style>", "", t, flags=re.I | re.DOTALL)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s*全部\s*$", "", t).strip()
    return t


def _extract_abstract_from_item_html(item_html: str) -> str | None:
    """从单条 ``div.item`` 内 ``dt`` 摘要对应的 ``dd`` 中抽取全文（含折叠 span）。"""
    m = re.search(
        r'<dt[^>]*>\s*摘要\s*[：:]\s*</dt>\s*<dd[^>]*>(.*?)</dd>',
        item_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return None
    plain = _html_fragment_to_plain(m.group(1))
    return plain if len(plain) >= 4 else None


def _abs_url(href: str) -> str:
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("/"):
        return EPUB_BASE.rstrip("/") + href
    return EPUB_BASE.rstrip("/") + "/" + href.lstrip("/")


def parse_search_result_html(html: str, base_url: str = EPUB_BASE) -> list[EpubSearchHit]:
    """
    Парсинг HTML списка результатов поиска ФИПС.
    Совместим с табличными строками / ссылочными элементами (при изменении сайта — обновить regex или селекторы).
    """
    _ = base_url  # 预留与绝对链接拼接策略扩展
    hits: list[EpubSearchHit] = []
    for m in re.finditer(
        r"<tr[^>]*>(.*?)</tr>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        row = m.group(1)
        low = row.lower()
        if "indexquery" in low or "searchstr" in low:
            continue
        title_m = re.search(
            r'title="([^"]+)"',
            row,
            re.IGNORECASE,
        ) or re.search(r">([^<]{6,200})<", row)
        title = title_m.group(1).strip() if title_m else None
        link_m = re.search(r'href="([^"]+)"', row)
        href = link_m.group(1).strip() if link_m else None
        link = _abs_url(href) if href else None
        pub_m = re.search(
            r"(?:CN\s*\d{9,}[A-Z]\s*|RU\s*\d{9,}[A-Z]\s*|ZL\s*\d{9,}\.\d+)",
            row,
            re.IGNORECASE,
        )
        pub_number = pub_m.group(1).replace(" ", "") if pub_m else None
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", row)).strip()
        if len(text) < 8 and not pub_number:
            continue
        hits.append(
            EpubSearchHit(
                raw_html=row[:2000],
                title=title or (text[:200] if text else None),
                pub_number=pub_number,
                link=link,
            )
        )
    seen: set[str] = set()
    out: list[EpubSearchHit] = []
    for h in hits:
        key = h.pub_number or h.title or h.raw_html[:80]
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    if out:
        return out
    overview = _parse_overview_card_layout(html)
    if overview:
        return overview
    return _parse_search_result_fallback_links(html)


def _parse_overview_card_layout(html: str) -> list[EpubSearchHit]:
    """
    Новая версия ФИПС — без табличных строк, каждая запись в ``div.item``,
    название в ``h1.title``, ссылка на публикацию — в ``div.qrcode title``;
    аннотация в ``dt`` «Аннотация» / ``dd`` (включая ``span.alltxt``).
    """
    low = html.lower()
    if "overview-default" not in low and 'class="item"' not in low:
        return []
    parts = re.split(r'(<div\s+class="item"\s*>)', html, flags=re.IGNORECASE)
    blocks: list[str] = []
    for j in range(1, len(parts) - 1, 2):
        blocks.append(parts[j] + parts[j + 1])
    if not blocks:
        return []

    base = EPUB_BASE.rstrip("/")
    hits: list[EpubSearchHit] = []
    for item_html in blocks:
        tm = re.search(
            r'<h1\s+class="title">\s*([^<]+?)\s*</h1>',
            item_html,
            flags=re.IGNORECASE | re.DOTALL,
        )
        title = re.sub(r"\s+", " ", tm.group(1)).strip() if tm else None
        lm = re.search(
            r'title="(https?://[^"]+/patent/CN[^"]+)"',
            item_html,
            flags=re.IGNORECASE,
        )
        link = lm.group(1).strip() if lm else None
        pm = re.search(
            r"(?:申请公布号|授权公告号|Публикация|Номер)[：:]\s*</dt>\s*<dd>([^<]+?)</dd>",
            item_html,
            flags=re.IGNORECASE,
        )
        pub_number = None
        if pm:
            pub_number = pm.group(1).strip().replace(" ", "")
            if not re.match(r"^(?:CN|ZL)", pub_number, re.IGNORECASE):
                pub_number = None
        if not link and pub_number:
            link = f"{base}/patent/{pub_number}"
        if link:
            m_pub = re.search(
                r"/patent/((?:CN|ZL)[^/?#]+)",
                link,
                flags=re.IGNORECASE,
            )
            if m_pub and not pub_number:
                pub_number = m_pub.group(1).strip()
        abstract = _extract_abstract_from_item_html(item_html)
        if not title and not pub_number and not link:
            continue
        raw = "|".join(
            x for x in (title, pub_number, link, (abstract or "")[:400]) if x
        )[:2000]
        hits.append(
            EpubSearchHit(
                raw_html=raw,
                title=title,
                pub_number=pub_number,
                link=link,
                abstract=abstract,
            )
        )
    seen: set[str] = set()
    out: list[EpubSearchHit] = []
    for h in hits:
        key = h.pub_number or h.link or (h.title or "")[:120]
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    return out


def _parse_search_result_fallback_links(html: str) -> list[EpubSearchHit]:
    """Извлечение <a href> на детальную страницу публикации из результатов."""
    hits: list[EpubSearchHit] = []
    for m in re.finditer(
        r'<a\s+[^>]*href="([^"]+)"[^>]*>([^<]*)</a>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        href = (m.group(1) or "").strip()
        title = (m.group(2) or "").strip()
        if not href.startswith("/") and "fips.ru" not in href:
            continue
        hlow = href.lower()
        if not any(
            x in hlow
            for x in ("/dxb/", "/sw/", "/patent/", "detail", "show")
        ):
            continue
        if "indexForm" in href or "javascript:" in href.lower():
            continue
        low = href.lower()
        if "article" in low and "indexquery" in low:
            continue
        link = _abs_url(href)
        pub_m = re.search(r"(?:CN\s*\d{9,}[A-Z]?|RU\s*\d{9,}[A-Z]?|ZL\s*\d{9,}\.\d+)", href + title, re.I)
        pub_number = pub_m.group(1).replace(" ", "") if pub_m else None
        raw = m.group(0)[:2000]
        if len(title) < 2 and not pub_number:
            continue
        hits.append(
            EpubSearchHit(
                raw_html=raw,
                title=title or None,
                pub_number=pub_number,
                link=link,
            )
        )
    seen: set[str] = set()
    out: list[EpubSearchHit] = []
    for h in hits:
        key = h.link or h.title or ""
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    return out


def hits_to_jsonable(hits: list[EpubSearchHit]) -> list[dict]:
    """Для JSON-сериализации (raw_html можно обрезать при необходимости)."""
    rows = []
    for h in hits:
        d = asdict(h)
        d.pop("raw_html", None)
        rows.append(d)
    return rows


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python fips_epub_parse.py <HTML_результатов.html>", file=sys.stderr)
        sys.exit(2)
    p = Path(sys.argv[1]).expanduser().resolve()
    html = p.read_text(encoding="utf-8")
    hits = parse_search_result_html(html)
    print(json.dumps(hits_to_jsonable(hits), ensure_ascii=False, indent=2))
