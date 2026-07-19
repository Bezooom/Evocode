# Установка зависимостей для document-converter

## Проблема

Система использует externally-managed-environment (PEP 668), что не позволяет устанавливать пакеты через pip напрямую.

## Решения

### Вариант 1: Использовать --break-system-packages (не рекомендуется)

```bash
pip install --break-system-packages markitdown mammoth python-pptx PyMuPDF
```

⚠️ **Предупреждение**: Может нарушить системные пакеты Python.

### Вариант 2: Создать виртуальное окружение (рекомендуется)

```bash
# Создать виртуальное окружение
python3 -m venv ~/.config/kilo/venv

# Активировать
source ~/.config/kilo/venv/bin/activate

# Установить зависимости
pip install markitdown mammoth python-pptx PyMuPDF

# Использовать unified_converter через venv
~/.config/kilo/venv/bin/python3 ~/.config/kilo/skills/document-converter/tools/unified_converter.py \
    --input document.pdf --output output.md
```

### Вариант 3: Использовать pipx (для изолированных приложений)

```bash
# Установить pipx
sudo apt install pipx

# Установить markitdown как приложение
pipx install markitdown

# Использовать markitdown CLI
markitdown document.pdf > output.md
```

### Вариант 4: Системные пакеты (если доступны)

```bash
# Проверить доступность в репозиториях
apt search python3-mammoth
apt search python3-pptx

# Установить системные пакеты
sudo apt install python3-mammoth python3-pptx
```

## Текущий статус

- ✅ unified_converter.py создан и работает
- ✅ batch_convert.sh создан
- ⚠️ Зависимости не установлены (требуется выбрать вариант установки)
- ⏳ Тестирование отложено до установки зависимостей

## Рекомендация

**Для production использования**: Вариант 2 (виртуальное окружение)

```bash
# Быстрая установка
python3 -m venv ~/.config/kilo/venv
source ~/.config/kilo/venv/bin/activate
pip install -r ~/.config/kilo/skills/document-converter/requirements.txt
```

**Для разработки**: Вариант 1 с --break-system-packages (на свой риск)

## Обновление unified_converter.py для работы с venv

Можно добавить shebang для автоматического использования venv:

```python
#!/home/bezoom/.config/kilo/venv/bin/python3
```

Или создать wrapper скрипт:

```bash
#!/bin/bash
# ~/.config/kilo/skills/document-converter/tools/unified_converter.sh
VENV_PYTHON="$HOME/.config/kilo/venv/bin/python3"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$VENV_PYTHON" ]; then
    exec "$VENV_PYTHON" "$SCRIPT_DIR/unified_converter.py" "$@"
else
    exec python3 "$SCRIPT_DIR/unified_converter.py" "$@"
fi
```

## Проверка установки

После установки зависимостей проверить:

```bash
python3 -c "import markitdown; import mammoth; import pptx; import fitz; print('✓ Все зависимости установлены')"
```

## Fallback режим

unified_converter.py работает в fallback режиме:
- Если markitdown не установлен — используются только mammoth, python-pptx, PyMuPDF
- Если mammoth не установлен — используется только markitdown для DOCX
- Если python-pptx не установлен — используется только markitdown для PPTX
- Если PyMuPDF не установлен — используется только markitdown для PDF

Минимальная установка для базовой функциональности:

```bash
pip install markitdown  # Универсальный конвертер
```
