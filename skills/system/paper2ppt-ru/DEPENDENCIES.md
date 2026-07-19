# Зависимости для paper2ppt-ru

## Python зависимости

### Основные библиотеки

```bash
# Установка основных зависимостей
pip install python-pptx PyMuPDF requests pillow matplotlib
```

**Описание:**
- `python-pptx` — создание и редактирование PPTX файлов
- `PyMuPDF` (fitz) — извлечение текста и изображений из PDF
- `requests` — загрузка статей по DOI/URL
- `pillow` — обработка изображений
- `matplotlib` — создание графиков и формул

### Опциональные библиотеки

```bash
# Для автоматической загрузки статей
pip install arxiv biopython scholarly

# Для конвертации PDF в изображения (если PyMuPDF не справляется)
pip install pdf2image

# Для работы с LaTeX формулами
pip install sympy

# Для анализа текста
pip install nltk spacy

# Для работы с таблицами
pip install pandas openpyxl
```

### requirements.txt

```txt
# Основные зависимости
python-pptx>=0.6.21
PyMuPDF>=1.23.0
requests>=2.31.0
pillow>=10.0.0
matplotlib>=3.7.0

# Опциональные зависимости
arxiv>=2.0.0
biopython>=1.81
scholarly>=1.7.11
pdf2image>=1.16.3
sympy>=1.12
nltk>=3.8.1
spacy>=3.7.0
pandas>=2.0.0
openpyxl>=3.1.0
```

### Установка всех зависимостей

```bash
# Из requirements.txt
pip install -r requirements.txt

# Или напрямую
pip install python-pptx PyMuPDF requests pillow matplotlib arxiv biopython scholarly pdf2image sympy nltk spacy pandas openpyxl
```

---

## Системные зависимости

### Linux (Ubuntu/Debian)

```bash
# Для pdf2image
sudo apt-get install poppler-utils

# Для работы с изображениями
sudo apt-get install libjpeg-dev libpng-dev

# Для LaTeX (если нужна поддержка формул)
sudo apt-get install texlive texlive-latex-extra texlive-fonts-recommended dvipng cm-super
```

### macOS

```bash
# Через Homebrew
brew install poppler

# Для LaTeX
brew install --cask mactex
```

### Windows

```bash
# Установка poppler для pdf2image
# Скачать с: https://github.com/oschwartz10612/poppler-windows/releases/
# Добавить в PATH

# Для LaTeX
# Скачать MiKTeX: https://miktex.org/download
```

---

## Проверка установки

### Скрипт проверки зависимостей

```python
#!/usr/bin/env python3
"""
Проверка установленных зависимостей для paper2ppt-ru
"""

import sys

def check_dependency(module_name, package_name=None):
    """Проверить установку модуля"""
    if package_name is None:
        package_name = module_name
    
    try:
        __import__(module_name)
        print(f"✅ {package_name}: установлен")
        return True
    except ImportError:
        print(f"❌ {package_name}: НЕ установлен")
        return False

def main():
    print("="*60)
    print("ПРОВЕРКА ЗАВИСИМОСТЕЙ ДЛЯ PAPER2PPT-RU")
    print("="*60 + "\n")
    
    # Основные зависимости
    print("Основные зависимости:")
    required = [
        ("pptx", "python-pptx"),
        ("fitz", "PyMuPDF"),
        ("requests", "requests"),
        ("PIL", "pillow"),
        ("matplotlib", "matplotlib"),
    ]
    
    required_ok = all(check_dependency(mod, pkg) for mod, pkg in required)
    print()
    
    # Опциональные зависимости
    print("Опциональные зависимости:")
    optional = [
        ("arxiv", "arxiv"),
        ("Bio", "biopython"),
        ("scholarly", "scholarly"),
        ("pdf2image", "pdf2image"),
        ("sympy", "sympy"),
        ("nltk", "nltk"),
        ("spacy", "spacy"),
        ("pandas", "pandas"),
        ("openpyxl", "openpyxl"),
    ]
    
    for mod, pkg in optional:
        check_dependency(mod, pkg)
    print()
    
    # Проверка версий
    print("Версии основных библиотек:")
    try:
        import pptx
        print(f"  python-pptx: {pptx.__version__}")
    except:
        pass
    
    try:
        import fitz
        print(f"  PyMuPDF: {fitz.version[0]}")
    except:
        pass
    
    try:
        import requests
        print(f"  requests: {requests.__version__}")
    except:
        pass
    
    try:
        import PIL
        print(f"  pillow: {PIL.__version__}")
    except:
        pass
    
    try:
        import matplotlib
        print(f"  matplotlib: {matplotlib.__version__}")
    except:
        pass
    
    print()
    
    # Итог
    print("="*60)
    if required_ok:
        print("✅ Все основные зависимости установлены")
        print("Навык paper2ppt-ru готов к использованию!")
    else:
        print("❌ Не все основные зависимости установлены")
        print("Установите недостающие пакеты:")
        print("  pip install python-pptx PyMuPDF requests pillow matplotlib")
    print("="*60)

if __name__ == "__main__":
    main()
```

### Запуск проверки

```bash
python check_dependencies.py
```

---

## Версии Python

**Минимальная версия:** Python 3.8+

**Рекомендуемая версия:** Python 3.10+

**Проверка версии:**
```bash
python --version
```

---

## Виртуальное окружение

### Создание виртуального окружения

```bash
# Создать виртуальное окружение
python -m venv paper2ppt_env

# Активировать (Linux/macOS)
source paper2ppt_env/bin/activate

# Активировать (Windows)
paper2ppt_env\Scripts\activate

# Установить зависимости
pip install -r requirements.txt
```

### Деактивация

```bash
deactivate
```

---

## Docker (опционально)

### Dockerfile

```dockerfile
FROM python:3.10-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libjpeg-dev \
    libpng-dev \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    dvipng \
    cm-super \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Рабочая директория
WORKDIR /workspace

# Команда по умолчанию
CMD ["python"]
```

### Сборка и запуск

```bash
# Сборка образа
docker build -t paper2ppt-ru .

# Запуск контейнера
docker run -it -v $(pwd):/workspace paper2ppt-ru

# Использование
python basic_example.py
```

---

## Troubleshooting

### Проблема: PyMuPDF не устанавливается

**Решение:**
```bash
# Попробуйте установить через conda
conda install -c conda-forge pymupdf

# Или используйте wheel файл
pip install --upgrade pip
pip install PyMuPDF
```

### Проблема: pdf2image не работает

**Решение:**
```bash
# Убедитесь, что poppler установлен
# Linux
sudo apt-get install poppler-utils

# macOS
brew install poppler

# Windows: скачайте и добавьте в PATH
# https://github.com/oschwartz10612/poppler-windows/releases/
```

### Проблема: matplotlib не отображает кириллицу

**Решение:**
```python
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# Установить шрифт с поддержкой кириллицы
plt.rcParams['font.family'] = 'DejaVu Sans'

# Или указать конкретный шрифт
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans']
```

### Проблема: Ошибка при работе с LaTeX

**Решение:**
```python
# Отключить LaTeX в matplotlib
import matplotlib
matplotlib.rcParams['text.usetex'] = False

# Или установить полный LaTeX
# Linux: sudo apt-get install texlive-full
# macOS: brew install --cask mactex
```

### Проблема: Недостаточно памяти при обработке больших PDF

**Решение:**
```python
# Обрабатывать PDF постранично
import fitz

doc = fitz.open("large_paper.pdf")
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    # Обработка текста
    del page  # Освободить память
doc.close()
```

---

## Обновление зависимостей

### Проверка устаревших пакетов

```bash
pip list --outdated
```

### Обновление всех пакетов

```bash
pip install --upgrade python-pptx PyMuPDF requests pillow matplotlib
```

### Обновление из requirements.txt

```bash
pip install --upgrade -r requirements.txt
```

---

## Альтернативные библиотеки

### Если python-pptx не подходит

**Альтернативы:**
- `pptx-python` — форк python-pptx с дополнительными возможностями
- `aspose-slides` — коммерческая библиотека с расширенными возможностями

### Если PyMuPDF не подходит

**Альтернативы:**
- `pdfplumber` — альтернатива для извлечения текста
- `PyPDF2` — базовая работа с PDF
- `pdfminer.six` — детальный анализ PDF

---

## Лицензии

**Основные библиотеки:**
- `python-pptx`: MIT License
- `PyMuPDF`: AGPL-3.0 License (коммерческая лицензия доступна)
- `requests`: Apache 2.0 License
- `pillow`: HPND License
- `matplotlib`: PSF License

**Примечание:** PyMuPDF использует AGPL-3.0, что требует открытия исходного кода при коммерческом использовании. Для коммерческих проектов рассмотрите покупку коммерческой лицензии.

---

## Поддержка

**Документация:**
- python-pptx: https://python-pptx.readthedocs.io/
- PyMuPDF: https://pymupdf.readthedocs.io/
- matplotlib: https://matplotlib.org/stable/contents.html

**Сообщество:**
- Stack Overflow: тег `python-pptx`, `pymupdf`
- GitHub Issues: репозитории соответствующих библиотек

---

## Changelog

**v1.0.0 (2026-05-12):**
- Первая версия навыка paper2ppt-ru
- Поддержка Python 3.8+
- Основные зависимости: python-pptx, PyMuPDF, requests, pillow, matplotlib
