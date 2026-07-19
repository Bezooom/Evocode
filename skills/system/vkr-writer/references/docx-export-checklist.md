# DOCX-export checklist (vkr-writer)

Чек-лист для финальной валидации `.docx`-файла ВКР перед сдачей. Составлен на основе 6 категорий дефектов, найденных в `vkr-final-v8.docx` (см. `docx-issues-report.md`).

Каждому пункту соответствует python-docx проверка, реализованная в `scripts/docx_linter.py`. Критичные пункты (C) блокируют сборку, warnings (W) — только предупреждают.

---

## 1. Первая страница (C)

**Требование:** на первой странице — титульник, а не пустой лист.

**Проверка:**

```python
first_p = doc.paragraphs[0]
has_leading_break = any(
    br.get(qn('w:type')) == 'page'
    for run in first_p.runs
    for br in run._element.iter(qn('w:br'))
)
assert not has_leading_break, "Первый абзац содержит page break"
assert first_p.text.strip(), "Первый абзац пустой"
```

---

## 2. Markdown-артефакты в тексте (C)

**Требование:** в финальном DOCX не должно быть остатков markdown.

**Проверка (regex по всем параграфам + ячейкам таблиц):**

```python
import re
BAD_PATTERNS = {
    'md_heading':   re.compile(r'^#{1,6}\s'),
    'md_bold':      re.compile(r'\*\*[^*\s][^*]*\*\*'),
    'md_italic':    re.compile(r'(?<!\*)\*[^*\s][^*\n]*\*(?!\*)'),
    'md_hr':        re.compile(r'^-{3,}\s*$'),
    'md_bullet':    re.compile(r'^\s*[-*]\s+\w'),
    'md_image':     re.compile(r'!\[[^\]]*\]\([^)]+\)'),
    'md_link':      re.compile(r'(?<!!)\[[^\]]+\]\([^)]+\)'),
}
```

Допустимо 0 попаданий по каждому паттерну во всём документе (включая ячейки таблиц).

---

## 3. Стили абзацев (C)

**Требование:** заголовки должны иметь стили с `outline_level`, не `Normal`.

**Проверка:**

```python
normal_count = sum(1 for p in doc.paragraphs if p.style.name == 'Normal')
total = len(doc.paragraphs)
assert normal_count / total < 0.9, f"{normal_count}/{total} абзацев со стилем Normal"

# Проверить, что заголовки глав имеют правильный стиль
for p in doc.paragraphs:
    text = p.text.strip().upper()
    if text.startswith(('ВВЕДЕНИЕ', 'ГЛАВА', 'ЗАКЛЮЧЕНИЕ', 'СПИСОК', 'ПРИЛОЖЕНИ')):
        assert p.style.name in ('Heading 1', 'VKR-H1'), \
            f"Заголовок {text[:30]!r} имеет стиль {p.style.name}"
```

---

## 4. Таблицы: границы и ширина (C)

**Требование:** у каждой таблицы заданы все 6 границ и ширина 100%.

**Проверка:**

```python
W_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
for i, t in enumerate(doc.tables):
    tblPr = t._element.find(W_NS + 'tblPr')
    assert tblPr is not None, f"Таблица {i}: нет tblPr"
    borders = tblPr.find(W_NS + 'tblBorders')
    assert borders is not None, f"Таблица {i}: нет tblBorders (невидимая!)"
    required = {'top', 'left', 'bottom', 'right', 'insideH', 'insideV'}
    present = {b.tag.split('}')[-1] for b in borders}
    assert required <= present, f"Таблица {i}: отсутствуют границы {required - present}"
    tblW = tblPr.find(W_NS + 'tblW')
    assert tblW is not None, f"Таблица {i}: не задана ширина"
    # ширина type=auto допустима, но предпочтительно pct=5000
```

---

## 5. Дубликаты подписей (C)

**Требование:** не должно быть двух подряд идущих идентичных подписей `Таблица N — …` или `Рисунок N — …`.

**Проверка:**

```python
import re
CAPTION_RE = re.compile(r'^\**?(Таблица|Рисунок)\s+[\dА-Я]')
def canon(text):
    return re.sub(r'[*\s]+', ' ', text).strip().lower()

prev = None
for i, p in enumerate(doc.paragraphs):
    t = p.text.strip()
    if CAPTION_RE.match(t):
        c = canon(t)
        if prev and c == prev[1]:
            raise AssertionError(
                f"Дубликат подписи: para[{prev[0]}] и para[{i}]: {t[:60]!r}"
            )
        prev = (i, c)
    else:
        prev = None
```

---

## 6. Красная строка body-текста (W)

**Требование:** у body-абзацев first_line_indent = 1,25 см; у заголовков/ячеек/captions/библио — 0.

**Проверка:**

```python
body_count = 0
body_with_indent = 0
for p in doc.paragraphs:
    if p.style.name in ('Normal', 'VKR-Body') and len(p.text) > 80:
        body_count += 1
        if p.paragraph_format.first_line_indent:
            body_with_indent += 1
if body_count > 0:
    ratio = body_with_indent / body_count
    if ratio < 0.8:
        print(f"WARNING: только {ratio:.0%} body-абзацев имеют красную строку")
```

---

## 7. Pagination перед ключевыми разделами (W)

**Требование:** перед `ГЛАВА N`, `ВВЕДЕНИЕ`, `ЗАКЛЮЧЕНИЕ`, `СПИСОК ИСТОЧНИКОВ`, `ПРИЛОЖЕНИЕ X` должен быть page break (через `pageBreakBefore` стиля или явный `<w:br>`).

**Проверка:**

```python
W_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
CHAPTER_PREFIXES = ('ВВЕДЕНИЕ', 'ГЛАВА', 'ЗАКЛЮЧЕНИЕ', 'СПИСОК', 'ПРИЛОЖЕНИЕ')

def has_break_before(p_idx, paragraphs):
    p = paragraphs[p_idx]
    # pageBreakBefore в стиле или в pPr
    pPr = p._element.find(W_NS + 'pPr')
    if pPr is not None and pPr.find(W_NS + 'pageBreakBefore') is not None:
        return True
    # break в самом абзаце
    if any(br.get(W_NS+'type') == 'page'
           for r in p.runs for br in r._element.iter(W_NS+'br')):
        return True
    # break в предыдущем абзаце
    if p_idx > 0:
        prev = paragraphs[p_idx - 1]
        if any(br.get(W_NS+'type') == 'page'
               for r in prev.runs for br in r._element.iter(W_NS+'br')):
            return True
    return False

for i, p in enumerate(doc.paragraphs):
    up = p.text.strip().upper()
    if any(up.startswith(pref) for pref in CHAPTER_PREFIXES):
        if not has_break_before(i, doc.paragraphs):
            print(f"WARNING: нет page break перед para[{i}]: {p.text[:50]!r}")
```

---

## 8. Ячейки таблиц: first_line_indent = 0 (C)

**Требование:** красная строка не должна «просачиваться» в ячейки.

**Проверка:**

```python
for ti, t in enumerate(doc.tables):
    for ri, row in enumerate(t.rows):
        for ci, cell in enumerate(row.cells):
            for p in cell.paragraphs:
                fli = p.paragraph_format.first_line_indent
                if fli and fli.cm > 0.1:
                    raise AssertionError(
                        f"Таблица {ti}[{ri},{ci}]: "
                        f"first_line_indent={fli.cm:.2f}cm (должно быть 0)"
                    )
```

---

## 9. Библиография: висячий отступ (W)

**Требование:** каждая запись списка литературы имеет `left_indent` > 0 и `first_line_indent` < 0 (висячая строка).

**Проверка:**

```python
import re
BIBLIO_RE = re.compile(r'^\d+\.\s+[А-ЯA-Z]')
# найти секцию «СПИСОК ИСТОЧНИКОВ» и проверить записи после неё
in_biblio = False
for p in doc.paragraphs:
    up = p.text.strip().upper()
    if up.startswith('СПИСОК'):
        in_biblio = True
        continue
    if up.startswith('ПРИЛОЖЕНИ'):
        in_biblio = False
    if in_biblio and BIBLIO_RE.match(p.text.strip()):
        pf = p.paragraph_format
        if not pf.left_indent or not pf.first_line_indent \
                or pf.first_line_indent.cm >= 0:
            print(f"WARNING: bibliography entry без hanging indent: "
                  f"{p.text[:40]!r}")
```

---

## 10. Титульник: отдельные абзацы (C)

**Требование:** многострочные фразы титульника должны быть отдельными абзацами, а не одним абзацем с `\n` внутри.

**Проверка:**

```python
# Проверяем первые 15 абзацев (титульник)
for i, p in enumerate(doc.paragraphs[:15]):
    if '\n' in p.text:
        raise AssertionError(
            f"para[{i}] содержит \\n внутри run: {p.text[:60]!r}"
        )
```

---

## 11. Оглавление — как Word-поле (W)

**Требование:** оглавление вставлено как `TOC`-field, не как ручной список.

**Проверка:**

```python
from docx.oxml.ns import qn
has_toc_field = False
for p in doc.paragraphs:
    for elem in p._element.iter(qn('w:instrText')):
        if elem.text and 'TOC' in elem.text.upper():
            has_toc_field = True
            break
if not has_toc_field:
    print("WARNING: нет поля TOC, оглавление собрано вручную")
```

---

## 12. Язык документа — русский (W)

**Требование:** документ должен быть помечен как русский (`w:lang w:val="ru-RU"`) — иначе Word подчёркивает всё красным и ломает переносы.

**Проверка:**

```python
from docx.oxml.ns import qn
styles_el = doc.styles.element
docDefaults = styles_el.find(qn("w:docDefaults"))
ok = False
if docDefaults is not None:
    rpd = docDefaults.find(qn("w:rPrDefault"))
    if rpd is not None:
        rpr = rpd.find(qn("w:rPr"))
        if rpr is not None:
            lang = rpr.find(qn("w:lang"))
            if lang is not None and (lang.get(qn("w:val")) or "").startswith("ru"):
                ok = True
assert ok, "Язык документа по умолчанию не установлен как русский"
```

---

## 13. Шрифт и поля страницы (W)

**Требование:** Times New Roman, body 14 pt, поля L=3 / R=1 / T=2 / B=2 см.

**Проверка:**

```python
from docx.shared import Cm
for sec in doc.sections:
    assert abs(sec.left_margin.cm - 3.0) < 0.1, f"left margin: {sec.left_margin.cm}"
    assert abs(sec.right_margin.cm - 1.0) < 0.2, f"right margin: {sec.right_margin.cm}"
    assert abs(sec.top_margin.cm - 2.0) < 0.1, f"top margin: {sec.top_margin.cm}"
    assert abs(sec.bottom_margin.cm - 2.0) < 0.1, f"bottom margin: {sec.bottom_margin.cm}"

# Шрифт проверяется по стилю Normal + по runs
normal = doc.styles['Normal']
assert normal.font.name == 'Times New Roman'
# 14 pt body проверяется либо в стиле, либо в run'ах (в зависимости от генератора)
```

---

## Быстрый запуск

```bash
python scripts/docx_linter.py <path-to.docx>
```

Exit codes:
- `0` — всё ок;
- `1` — критичные проблемы (пункты C);
- `2` — только предупреждения (пункты W).

Для pre-commit / CI:

```bash
python scripts/docx_linter.py output/vkr-final.docx || exit 1
```

---

## Анти-чек-лист (чего НЕ должно быть в финальном docx)

1. Пустой `paragraph[0]` с `<w:br w:type="page"/>`.
2. `# ЗАГОЛОВОК` как текст параграфа.
3. `**Таблица 1.1 — …**` как текст параграфа.
4. `---` как текст параграфа (был разделителем приложений в md).
5. Два подряд идущих абзаца `Таблица N — …` с идентичным текстом.
6. Таблицы без `<w:tblBorders>`.
7. Ширина таблицы `type="auto"` без колонок.
8. Заголовок титульника типа `"АНО\nВО «ЛАДИРО»"` в одном абзаце.
9. «Рисунок X — Рисунок X» (рекурсивная подпись при отсутствии файла).
10. Список литературы как плоский `Normal` без висячей строки.
11. Приложения с «Таблица 3.13» (сквозная нумерация главы внутри Приложения А).
12. TOC собран руками из `Normal`-абзацев без номеров страниц.
