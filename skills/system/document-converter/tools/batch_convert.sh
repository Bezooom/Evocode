#!/usr/bin/env bash
# Пакетная конвертация документов в Markdown
# Использование:
#   bash batch_convert.sh --input-dir documents/ --output-dir markdown/ --format pdf
#   bash batch_convert.sh --input-dir documents/ --output-dir markdown/ --format docx

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Переменные по умолчанию
INPUT_DIR=""
OUTPUT_DIR=""
FORMAT=""
MEDIA_DIR=""
VERBOSE=0

# Функция помощи
usage() {
    cat << EOF
Использование: $0 [OPTIONS]

Пакетная конвертация документов в Markdown.

OPTIONS:
    -i, --input-dir DIR     Входная директория с документами (обязательно)
    -o, --output-dir DIR    Выходная директория для Markdown (обязательно)
    -f, --format FORMAT     Формат файлов (pdf, docx, pptx, excel, image, audio, video)
                            Если не указан, обрабатываются все поддерживаемые форматы
    -m, --media-dir DIR     Базовая директория для медиа-файлов (опционально)
    -v, --verbose           Подробный вывод
    -h, --help              Показать эту справку

ПРИМЕРЫ:
    # Конвертировать все PDF
    $0 --input-dir documents/ --output-dir markdown/ --format pdf

    # Конвертировать все DOCX
    $0 --input-dir documents/ --output-dir markdown/ --format docx

    # Конвертировать все поддерживаемые форматы
    $0 --input-dir documents/ --output-dir markdown/

    # С подробным выводом
    $0 --input-dir documents/ --output-dir markdown/ --format pdf --verbose
EOF
    exit 1
}

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input-dir)
            INPUT_DIR="$2"
            shift 2
            ;;
        -o|--output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -f|--format)
            FORMAT="$2"
            shift 2
            ;;
        -m|--media-dir)
            MEDIA_DIR="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=1
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Ошибка: Неизвестный аргумент: $1${NC}"
            usage
            ;;
    esac
done

# Проверка обязательных аргументов
if [[ -z "$INPUT_DIR" ]]; then
    echo -e "${RED}Ошибка: Не указана входная директория${NC}"
    usage
fi

if [[ -z "$OUTPUT_DIR" ]]; then
    echo -e "${RED}Ошибка: Не указана выходная директория${NC}"
    usage
fi

# Проверка существования входной директории
if [[ ! -d "$INPUT_DIR" ]]; then
    echo -e "${RED}Ошибка: Входная директория не существует: $INPUT_DIR${NC}"
    exit 1
fi

# Создать выходную директорию
mkdir -p "$OUTPUT_DIR"

# Путь к unified_converter.py
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONVERTER="$SCRIPT_DIR/unified_converter.py"

if [[ ! -f "$CONVERTER" ]]; then
    echo -e "${RED}Ошибка: unified_converter.py не найден: $CONVERTER${NC}"
    exit 1
fi

# Определить расширения для обработки
declare -a EXTENSIONS
if [[ -n "$FORMAT" ]]; then
    case "$FORMAT" in
        pdf)
            EXTENSIONS=("pdf")
            ;;
        docx)
            EXTENSIONS=("docx" "doc")
            ;;
        pptx)
            EXTENSIONS=("pptx" "ppt" "ppsx")
            ;;
        excel)
            EXTENSIONS=("xlsx" "xls" "csv")
            ;;
        image)
            EXTENSIONS=("png" "jpg" "jpeg" "gif" "bmp" "tiff" "webp")
            ;;
        audio)
            EXTENSIONS=("mp3" "wav" "m4a" "flac")
            ;;
        video)
            EXTENSIONS=("mp4" "avi" "mov" "mkv")
            ;;
        *)
            echo -e "${RED}Ошибка: Неизвестный формат: $FORMAT${NC}"
            echo "Поддерживаемые форматы: pdf, docx, pptx, excel, image, audio, video"
            exit 1
            ;;
    esac
else
    # Все поддерживаемые расширения
    EXTENSIONS=(
        "pdf"
        "docx" "doc"
        "pptx" "ppt" "ppsx"
        "xlsx" "xls" "csv"
        "png" "jpg" "jpeg" "gif" "bmp" "tiff" "webp"
        "mp3" "wav" "m4a" "flac"
        "mp4" "avi" "mov" "mkv"
    )
fi

# Счётчики
TOTAL=0
SUCCESS=0
FAILED=0

# Функция конвертации одного файла
convert_file() {
    local input_file="$1"
    local relative_path="${input_file#$INPUT_DIR/}"
    local output_file="$OUTPUT_DIR/${relative_path%.*}.md"
    local output_dir="$(dirname "$output_file")"
    
    # Создать выходную директорию
    mkdir -p "$output_dir"
    
    # Определить директорию для медиа
    local media_arg=""
    if [[ -n "$MEDIA_DIR" ]]; then
        local media_subdir="$MEDIA_DIR/${relative_path%.*}_media"
        media_arg="--media-dir $media_subdir"
    fi
    
    # Конвертировать
    if [[ $VERBOSE -eq 1 ]]; then
        echo -e "${YELLOW}Конвертирую: $relative_path${NC}"
    fi
    
    if python3 "$CONVERTER" --input "$input_file" --output "$output_file" $media_arg 2>&1; then
        ((SUCCESS++))
        if [[ $VERBOSE -eq 1 ]]; then
            echo -e "${GREEN}✓ Успешно: $relative_path${NC}"
        fi
    else
        ((FAILED++))
        echo -e "${RED}✗ Ошибка: $relative_path${NC}"
    fi
}

# Найти и конвертировать все файлы
echo -e "${GREEN}Начинаю пакетную конвертацию...${NC}"
echo "Входная директория: $INPUT_DIR"
echo "Выходная директория: $OUTPUT_DIR"
if [[ -n "$FORMAT" ]]; then
    echo "Формат: $FORMAT"
else
    echo "Формат: все поддерживаемые"
fi
echo ""

# Обработать каждое расширение
for ext in "${EXTENSIONS[@]}"; do
    # Найти файлы с этим расширением
    while IFS= read -r -d '' file; do
        ((TOTAL++))
        convert_file "$file"
    done < <(find "$INPUT_DIR" -type f -iname "*.$ext" -print0)
done

# Итоговая статистика
echo ""
echo -e "${GREEN}=== Статистика ===${NC}"
echo "Всего файлов: $TOTAL"
echo -e "${GREEN}Успешно: $SUCCESS${NC}"
if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}Ошибок: $FAILED${NC}"
else
    echo "Ошибок: 0"
fi

if [[ $TOTAL -eq 0 ]]; then
    echo -e "${YELLOW}Предупреждение: Не найдено файлов для конвертации${NC}"
    exit 0
fi

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi

exit 0
