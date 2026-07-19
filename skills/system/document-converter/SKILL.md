---
name: document-converter
description: Универсальный конвертер документов в Markdown. Объединяет markitdown (Microsoft AutoGen) с существующими инструментами (mammoth, python-pptx, PyMuPDF) для максимального качества конвертации. Поддерживает PDF, DOCX, PPTX, Excel, изображения с OCR, аудио с транскрипцией, видео, YouTube.
version: "1.0.0"
user-invocable: true
argument-hint: "[Необязательно: путь к документу]"
allowed-tools: Read, Write, Edit, Bash
---

# Document Converter — Универсальный конвертер документов

Конвертация любых документов в Markdown с сохранением структуры, изображений и метаданных.

## Возможности

### Поддерживаемые форматы

| Формат | Метод | Особенности |
|--------|-------|-------------|
| **PDF** | PyMuPDF → markitdown | Извлечение текста и изображений, лучше для научных статей |
| **DOCX** | mammoth → markitdown | Сохранение структуры документа, извлечение изображений |
| **PPTX** | python-pptx → markitdown | Извлечение слайдов, изображений и заметок докладчика |
| **Excel** | markitdown | Конвертация таблиц в Markdown |
| **Images** | markitdown | OCR для извлечения текста из изображений |
| **Audio** | markitdown | Транскрипция аудио в текст |
| **Video** | markitdown | Извлечение метаданных и субтитров |
| **YouTube** | markitdown | Извлечение транскриптов YouTube видео |
| **HTML** | markitdown | Конвертация веб-страниц |
| **CSV/JSON/XML** | markitdown | Конвертация структурированных данных |
| **ZIP** | markitdown | Обработка архивов |
| **EPub** | markitdown | Конвертация электронных книг |

### Стратегия fallback

Для каждого формата используется цепочка обработчиков:

1. **PDF:**
   - Попытка 1: PyMuPDF (из paper2ppt-ru) — лучше для научных статей
   - Fallback: markitdown — универсальный

2. **DOCX:**
   - Попытка 1: mammoth (из patent-disclosure-ru) — сохраняет структуру
   - Fallback: markitdown — универсальный

3. **PPTX:**
   - Попытка 1: python-pptx (из patent-disclosure-ru) — извлекает заметки
   - Fallback: markitdown — универсальный

4. **Остальные форматы:**
   - markitdown (новые возможности)

## Использование

### Базовое использование

```bash
# Конвертация PDF
python tools/unified_converter.py --input document.pdf --output output.md

# Конвертация DOCX
python tools/unified_converter.py --input document.docx --output output.md

# Конвертация PPTX с указанием директории для изображений
python tools/unified_converter.py --input presentation.pptx --output output.md --media-dir images/

# Конвертация аудио с транскрипцией
python tools/unified_converter.py --input audio.mp3 --output transcript.md --format audio

# Конвертация изображения с OCR
python tools/unified_converter.py --input scan.jpg --output text.md --format image

# Конвертация YouTube видео
python tools/unified_converter.py --input "https://youtube.com/watch?v=..." --output transcript.md --format youtube
```

### Batch конвертация

```bash
# Конвертация всех PDF в директории
bash tools/batch_convert.sh --input-dir documents/ --output-dir markdown/ --format pdf

# Конвертация всех DOCX
bash tools/batch_convert.sh --input-dir documents/ --output-dir markdown/ --format docx
```

### Из Python

```python
from pathlib import Path
from tools.unified_converter import UnifiedConverter

# Создать конвертер
converter = UnifiedConverter(
    input_file=Path("document.pdf"),
    output_file=Path("output.md"),
    media_dir=Path("images/")  # опционально
)

# Конвертировать
result = converter.convert(format_hint="pdf")  # format_hint опционально

# Сохранить
converter.save(result)

# Результат содержит:
# - result.markdown: текст в Markdown
# - result.media_files: список извлечённых медиа-файлов
# - result.method: использованный метод ("PyMuPDF", "mammoth", "python-pptx", "markitdown")
```

## Интеграция с существующими навыками

### patent-disclosure-ru

Заменить `tools/docx_to_md.py` и `tools/pptx_to_md.py`:

```bash
# Старый способ
python tools/docx_to_md.py --input design.docx --output outputs/case/design.md

# Новый способ (совместимый)
python ~/.config/kilo/skills/document-converter/tools/unified_converter.py \
    --input design.docx --output outputs/case/design.md
```

Обновить `prompts/project_scan.md`:
```markdown
## Office документы (Word / PPT) → текст для сканирования

Использовать unified_converter.py:
- DOCX: `python ~/.config/kilo/skills/document-converter/tools/unified_converter.py --input file.docx --output file.md`
- PPTX: `python ~/.config/kilo/skills/document-converter/tools/unified_converter.py --input file.pptx --output file.md`
```

### paper2ppt-ru

Заменить PyMuPDF вызовы на unified_converter:

```python
# Старый способ
import fitz
doc = fitz.open("paper.pdf")
# ... обработка

# Новый способ
from document_converter.tools.unified_converter import UnifiedConverter
converter = UnifiedConverter(Path("paper.pdf"), Path("paper.md"))
result = converter.convert()
```

## Установка

### Базовая установка

```bash
cd ~/.config/kilo/skills/document-converter
pip install -r requirements.txt
```

### Расширенная установка (с OCR и видео)

```bash
# Установить tesseract для OCR
sudo apt-get install tesseract-ocr tesseract-ocr-rus  # Linux
brew install tesseract  # macOS

# Установить ffmpeg для видео
sudo apt-get install ffmpeg  # Linux
brew install ffmpeg  # macOS

# Установить дополнительные зависимости
pip install pytesseract ffmpeg-python
```

## Примеры

### Пример 1: Конвертация научной статьи (PDF)

```bash
python tools/unified_converter.py \
    --input paper.pdf \
    --output paper.md \
    --media-dir paper_figures/
```

**Результат:**
- `paper.md` — текст статьи в Markdown
- `paper_figures/` — извлечённые изображения
- Метод: PyMuPDF (лучше для научных статей)

### Пример 2: Конвертация технического документа (DOCX)

```bash
python tools/unified_converter.py \
    --input specification.docx \
    --output specification.md
```

**Результат:**
- `specification.md` — документ в Markdown
- `specification_media/` — извлечённые изображения
- Метод: mammoth (сохраняет структуру)

### Пример 3: Конвертация презентации (PPTX)

```bash
python tools/unified_converter.py \
    --input presentation.pptx \
    --output presentation.md
```

**Результат:**
- `presentation.md` — слайды в Markdown
- `presentation_media/` — изображения со слайдов
- Заметки докладчика включены
- Метод: python-pptx

### Пример 4: Транскрипция аудио

```bash
python tools/unified_converter.py \
    --input interview.mp3 \
    --output interview.md \
    --format audio
```

**Результат:**
- `interview.md` — транскрипт аудио
- Метод: markitdown (Speech Recognition)

### Пример 5: OCR изображения

```bash
python tools/unified_converter.py \
    --input scan.jpg \
    --output scan.md \
    --format image
```

**Результат:**
- `scan.md` — распознанный текст
- Метод: markitdown (OCR)

### Пример 6: YouTube транскрипт

```bash
python tools/unified_converter.py \
    --input "https://youtube.com/watch?v=dQw4w9WgXcQ" \
    --output video.md \
    --format youtube
```

**Результат:**
- `video.md` — транскрипт видео
- Метод: markitdown (YouTube API)

## Преимущества перед отдельными инструментами

### Было (3 отдельных скрипта)

```bash
# PDF
python paper2ppt-ru/tools/pdf_extract.py ...

# DOCX
python patent-disclosure-ru/tools/docx_to_md.py ...

# PPTX
python patent-disclosure-ru/tools/pptx_to_md.py ...
```

### Стало (1 универсальный инструмент)

```bash
# Любой формат
python document-converter/tools/unified_converter.py --input file.* --output output.md
```

### Новые возможности

- ✅ Excel → Markdown
- ✅ Images → Markdown (OCR)
- ✅ Audio → Markdown (транскрипция)
- ✅ Video → Markdown
- ✅ YouTube → Markdown
- ✅ HTML → Markdown
- ✅ EPub → Markdown
- ✅ ZIP → Markdown (обработка архивов)

### Сохранены все преимущества

- ✅ PyMuPDF для научных статей (из paper2ppt-ru)
- ✅ mammoth для структуры документов (из patent-disclosure-ru)
- ✅ python-pptx для заметок докладчика (из patent-disclosure-ru)
- ✅ Извлечение изображений
- ✅ Относительные пути
- ✅ Метаданные

## Troubleshooting

### Ошибка: "markitdown не установлен"

```bash
pip install markitdown
```

### Ошибка: "mammoth не установлен"

```bash
pip install mammoth
```

### Ошибка: "PyMuPDF не установлен"

```bash
pip install PyMuPDF
```

### OCR не работает

```bash
# Установить tesseract
sudo apt-get install tesseract-ocr tesseract-ocr-rus
pip install pytesseract
```

### Транскрипция аудио не работает

```bash
# Установить зависимости для Speech Recognition
pip install SpeechRecognition pydub
sudo apt-get install ffmpeg
```

## Changelog

### [1.0.0] - 2026-05-12

#### Added
- Универсальный конвертер unified_converter.py
- Поддержка 12+ форматов
- Стратегия fallback для PDF, DOCX, PPTX
- Интеграция с markitdown
- Сохранение всех функций из docx_to_md.py, pptx_to_md.py, PyMuPDF
- Batch конвертация
- Python API

#### Changed
- Объединены 3 отдельных инструмента в 1 универсальный

#### Deprecated
- patent-disclosure-ru/tools/docx_to_md.py (используйте unified_converter)
- patent-disclosure-ru/tools/pptx_to_md.py (используйте unified_converter)

## Лицензия

MIT License

## Авторы

- Основано на markitdown (Microsoft AutoGen)
- Интеграция с существующими инструментами Kilo Code
- Адаптация для российских стандартов
