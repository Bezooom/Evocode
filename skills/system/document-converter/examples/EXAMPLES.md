# Примеры использования document-converter

## Базовые примеры

### 1. Конвертация PDF (научная статья)

```bash
python tools/unified_converter.py \
    --input ~/Documents/paper.pdf \
    --output ~/Documents/paper.md \
    --media-dir ~/Documents/paper_figures/
```

**Что происходит:**
- Используется PyMuPDF (лучше для научных статей)
- Извлекается текст и изображения
- Изображения сохраняются в `paper_figures/`
- Создаётся `paper.md` с относительными ссылками на изображения

### 2. Конвертация DOCX (технический документ)

```bash
python tools/unified_converter.py \
    --input ~/Documents/specification.docx \
    --output ~/Documents/specification.md
```

**Что происходит:**
- Используется mammoth (сохраняет структуру)
- Извлекаются изображения в `specification_media/`
- Сохраняется форматирование (заголовки, списки, таблицы)

### 3. Конвертация PPTX (презентация)

```bash
python tools/unified_converter.py \
    --input ~/Documents/presentation.pptx \
    --output ~/Documents/presentation.md
```

**Что происходит:**
- Используется python-pptx
- Извлекаются слайды, изображения и **заметки докладчика**
- Каждый слайд становится разделом в Markdown

### 4. Транскрипция аудио

```bash
python tools/unified_converter.py \
    --input ~/Audio/interview.mp3 \
    --output ~/Documents/interview.md \
    --format audio
```

**Что происходит:**
- Используется markitdown с Speech Recognition
- Аудио транскрибируется в текст
- Создаётся текстовый документ

### 5. OCR изображения

```bash
python tools/unified_converter.py \
    --input ~/Pictures/scan.jpg \
    --output ~/Documents/scan.md \
    --format image
```

**Что происходит:**
- Используется markitdown с OCR (tesseract)
- Текст распознаётся из изображения
- Создаётся текстовый документ

### 6. YouTube транскрипт

```bash
python tools/unified_converter.py \
    --input "https://youtube.com/watch?v=dQw4w9WgXcQ" \
    --output ~/Documents/video.md \
    --format youtube
```

**Что происходит:**
- Используется markitdown с YouTube API
- Извлекается транскрипт видео
- Создаётся текстовый документ

## Пакетная конвертация

### 7. Конвертация всех PDF в директории

```bash
bash tools/batch_convert.sh \
    --input-dir ~/Documents/papers/ \
    --output-dir ~/Documents/markdown/ \
    --format pdf
```

**Что происходит:**
- Рекурсивно обрабатываются все PDF файлы
- Сохраняется структура директорий
- Создаётся отчёт о конвертации

### 8. Конвертация всех DOCX

```bash
bash tools/batch_convert.sh \
    --input-dir ~/Documents/specs/ \
    --output-dir ~/Documents/markdown/ \
    --format docx \
    --verbose
```

**Что происходит:**
- Обрабатываются все DOCX файлы
- Подробный вывод прогресса
- Статистика успешных/неудачных конвертаций

### 9. Конвертация всех поддерживаемых форматов

```bash
bash tools/batch_convert.sh \
    --input-dir ~/Documents/mixed/ \
    --output-dir ~/Documents/markdown/
```

**Что происходит:**
- Обрабатываются PDF, DOCX, PPTX, Excel, изображения, аудио, видео
- Автоматическое определение формата
- Единая выходная директория

## Интеграция с patent-disclosure-ru

### 10. Замена docx_to_md.py

**Старый способ:**
```bash
python ~/.config/kilo/skills/patent-disclosure-ru/tools/docx_to_md.py \
    --input design.docx \
    --output outputs/case/design.md
```

**Новый способ (совместимый):**
```bash
python ~/.config/kilo/skills/document-converter/tools/unified_converter.py \
    --input design.docx \
    --output outputs/case/design.md
```

### 11. Замена pptx_to_md.py

**Старый способ:**
```bash
python ~/.config/kilo/skills/patent-disclosure-ru/tools/pptx_to_md.py \
    --input review.pptx \
    --output outputs/case/review.md
```

**Новый способ (совместимый):**
```bash
python ~/.config/kilo/skills/document-converter/tools/unified_converter.py \
    --input review.pptx \
    --output outputs/case/review.md
```

## Интеграция с paper2ppt-ru

### 12. Конвертация научной статьи для презентации

```bash
# Шаг 1: Конвертировать PDF в Markdown
python ~/.config/kilo/skills/document-converter/tools/unified_converter.py \
    --input paper.pdf \
    --output paper.md \
    --media-dir paper_figures/

# Шаг 2: Использовать paper2ppt-ru для создания презентации
# (paper2ppt-ru теперь может читать paper.md и paper_figures/)
```

## Использование из Python

### 13. Простая конвертация

```python
from pathlib import Path
import sys
sys.path.append('~/.config/evocode/skills/…)
from unified_converter import UnifiedConverter

# Конвертировать PDF
converter = UnifiedConverter(
    input_file=Path("document.pdf"),
    output_file=Path("output.md")
)
result = converter.convert()
converter.save(result)

print(f"Метод: {result.method}")
print(f"Медиа-файлов: {len(result.media_files)}")
```

### 14. Конвертация с обработкой ошибок

```python
from pathlib import Path
import sys
sys.path.append('~/.config/evocode/skills/…)
from unified_converter import UnifiedConverter

def convert_document(input_path, output_path):
    try:
        converter = UnifiedConverter(
            input_file=Path(input_path),
            output_file=Path(output_path)
        )
        result = converter.convert()
        converter.save(result)
        return True, result.method
    except Exception as e:
        print(f"Ошибка: {e}")
        return False, str(e)

# Использование
success, method = convert_document("document.pdf", "output.md")
if success:
    print(f"✓ Успешно конвертировано методом: {method}")
else:
    print(f"✗ Ошибка: {method}")
```

### 15. Пакетная конвертация из Python

```python
from pathlib import Path
import sys
sys.path.append('~/.config/evocode/skills/…)
from unified_converter import UnifiedConverter

def batch_convert(input_dir, output_dir, extensions=['.pdf', '.docx', '.pptx']):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    results = {'success': 0, 'failed': 0}
    
    for ext in extensions:
        for file in input_path.rglob(f'*{ext}'):
            relative = file.relative_to(input_path)
            output_file = output_path / relative.with_suffix('.md')
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            try:
                converter = UnifiedConverter(file, output_file)
                result = converter.convert()
                converter.save(result)
                results['success'] += 1
            except Exception as e:
                print(f"Ошибка при конвертации {file}: {e}")
                results['failed'] += 1
    
    return results

# Использование
results = batch_convert(
    input_dir="~/Documents/papers",
    output_dir="~/Documents/markdown"
)
print(f"Успешно: {results['success']}, Ошибок: {results['failed']}")
```

## Расширенные примеры

### 16. Конвертация с указанием метода

```python
from pathlib import Path
import sys
sys.path.append('~/.config/evocode/skills/…)
from unified_converter import UnifiedConverter

# Принудительно использовать markitdown (пропустить PyMuPDF)
converter = UnifiedConverter(
    input_file=Path("document.pdf"),
    output_file=Path("output.md")
)

# Использовать markitdown напрямую
result = converter._convert_with_markitdown()
converter.save(result)
```

### 17. Извлечение только изображений

```python
from pathlib import Path
import sys
sys.path.append('~/.config/evocode/skills/…)
from unified_converter import UnifiedConverter

converter = UnifiedConverter(
    input_file=Path("document.pdf"),
    output_file=Path("output.md"),
    media_dir=Path("images/")
)

result = converter.convert()

# Получить список извлечённых изображений
for img in result.media_files:
    print(f"Извлечено: {img}")
```

### 18. Конвертация с кастомной обработкой

```python
from pathlib import Path
import sys
sys.path.append('~/.config/evocode/skills/…)
from unified_converter import UnifiedConverter

converter = UnifiedConverter(
    input_file=Path("document.pdf"),
    output_file=Path("output.md")
)

result = converter.convert()

# Постобработка Markdown
markdown = result.markdown

# Добавить метаданные
markdown = f"""---
title: {converter.input_file.stem}
date: 2026-05-12
converted_with: {result.method}
---

{markdown}
"""

# Сохранить с метаданными
converter.output_file.write_text(markdown, encoding='utf-8')
```

## Troubleshooting примеры

### 19. Проверка доступности зависимостей

```python
import sys

# Проверить markitdown
try:
    import markitdown
    print("✓ markitdown установлен")
except ImportError:
    print("✗ markitdown не установлен: pip install markitdown")

# Проверить mammoth
try:
    import mammoth
    print("✓ mammoth установлен")
except ImportError:
    print("✗ mammoth не установлен: pip install mammoth")

# Проверить python-pptx
try:
    from pptx import Presentation
    print("✓ python-pptx установлен")
except ImportError:
    print("✗ python-pptx не установлен: pip install python-pptx")

# Проверить PyMuPDF
try:
    import fitz
    print("✓ PyMuPDF установлен")
except ImportError:
    print("✗ PyMuPDF не установлен: pip install PyMuPDF")
```

### 20. Тестирование конвертации

```bash
# Создать тестовый файл
echo "# Test Document" > test.md
echo "This is a test." >> test.md

# Конвертировать обратно (если поддерживается)
python tools/unified_converter.py --input test.md --output test_converted.md

# Сравнить
diff test.md test_converted.md
```

## Производительность

### 21. Измерение времени конвертации

```bash
time python tools/unified_converter.py \
    --input large_document.pdf \
    --output output.md
```

### 22. Параллельная конвертация

```bash
# Конвертировать несколько файлов параллельно
for file in *.pdf; do
    python tools/unified_converter.py --input "$file" --output "${file%.pdf}.md" &
done
wait
```

## Итоговая статистика

После выполнения всех примеров вы сможете:
- ✅ Конвертировать 12+ форматов документов
- ✅ Использовать оптимальный метод для каждого формата
- ✅ Извлекать изображения и медиа
- ✅ Транскрибировать аудио и видео
- ✅ Распознавать текст с изображений (OCR)
- ✅ Пакетно обрабатывать директории
- ✅ Интегрировать с существующими навыками
- ✅ Использовать из Python скриптов
