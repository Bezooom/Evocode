# document-converter

Универсальный конвертер документов в Markdown для Kilo Code.

## Быстрый старт

```bash
# Установить зависимости
cd ~/.config/kilo/skills/document-converter
pip install -r requirements.txt

# Конвертировать документ
python tools/unified_converter.py --input document.pdf --output output.md
```

## Возможности

- ✅ **PDF** → Markdown (PyMuPDF + markitdown)
- ✅ **DOCX** → Markdown (mammoth + markitdown)
- ✅ **PPTX** → Markdown (python-pptx + markitdown)
- ✅ **Excel** → Markdown (markitdown)
- ✅ **Images** → Markdown с OCR (markitdown)
- ✅ **Audio** → Markdown с транскрипцией (markitdown)
- ✅ **Video** → Markdown (markitdown)
- ✅ **YouTube** → Markdown (markitdown)
- ✅ **HTML, CSV, JSON, XML, ZIP, EPub** (markitdown)

## Стратегия fallback

Для максимального качества используется цепочка обработчиков:

| Формат | Метод 1 | Метод 2 (fallback) |
|--------|---------|-------------------|
| PDF | PyMuPDF (научные статьи) | markitdown |
| DOCX | mammoth (структура) | markitdown |
| PPTX | python-pptx (заметки) | markitdown |
| Остальные | markitdown | - |

## Использование

### Базовое

```bash
# PDF
python tools/unified_converter.py --input paper.pdf --output paper.md

# DOCX
python tools/unified_converter.py --input doc.docx --output doc.md

# PPTX
python tools/unified_converter.py --input slides.pptx --output slides.md

# Audio с транскрипцией
python tools/unified_converter.py --input audio.mp3 --output transcript.md --format audio

# Image с OCR
python tools/unified_converter.py --input scan.jpg --output text.md --format image
```

### Пакетная конвертация

```bash
# Все PDF в директории
bash tools/batch_convert.sh --input-dir documents/ --output-dir markdown/ --format pdf

# Все поддерживаемые форматы
bash tools/batch_convert.sh --input-dir documents/ --output-dir markdown/
```

### Из Python

```python
from pathlib import Path
from tools.unified_converter import UnifiedConverter

converter = UnifiedConverter(
    input_file=Path("document.pdf"),
    output_file=Path("output.md")
)
result = converter.convert()
converter.save(result)

print(f"Метод: {result.method}")
print(f"Медиа: {len(result.media_files)}")
```

## Интеграция

### patent-disclosure-ru

Заменяет `docx_to_md.py` и `pptx_to_md.py`:

```bash
# Вместо
python tools/docx_to_md.py --input file.docx --output file.md

# Используйте
python ~/.config/kilo/skills/document-converter/tools/unified_converter.py \
    --input file.docx --output file.md
```

### paper2ppt-ru

Заменяет PyMuPDF для PDF:

```python
from document_converter.tools.unified_converter import UnifiedConverter
converter = UnifiedConverter(Path("paper.pdf"), Path("paper.md"))
result = converter.convert()
```

## Установка

### Минимальная

```bash
pip install markitdown mammoth python-pptx PyMuPDF
```

### Полная (с OCR и аудио)

```bash
# Tesseract для OCR
sudo apt-get install tesseract-ocr tesseract-ocr-rus

# ffmpeg для аудио/видео
sudo apt-get install ffmpeg

# Python зависимости
pip install -r requirements.txt
pip install pytesseract ffmpeg-python
```

## Примеры

См. `examples/EXAMPLES.md` для 22 детальных примеров использования.

## Документация

- `SKILL.md` — полная документация навыка
- `examples/EXAMPLES.md` — примеры использования
- `tools/unified_converter.py` — основной скрипт
- `tools/batch_convert.sh` — пакетная конвертация

## Changelog

### [1.0.0] - 2026-05-12

- Первый релиз
- Объединение markitdown + существующие инструменты
- Поддержка 12+ форматов
- Стратегия fallback
- Интеграция с patent-disclosure-ru и paper2ppt-ru

## Лицензия

MIT License
