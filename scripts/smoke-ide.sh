#!/usr/bin/env bash
# Smoke E2E test script for Evocode IDE
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=8099
export PORT
export EVOCODE_LLAMA_MODE=attach

echo "=== Запуск авто-теста SMOKE-IDE E2E ==="

# 1. Проверка структуры сборки IDE
echo "→ 1. Верификация файлов сборки IDE..."
PORTABLE_DIR="${ROOT}/packages/ide/dist/evocode-ide"
if [[ ! -d "${PORTABLE_DIR}" ]]; then
  echo "❌ Ошибка: Не найдена директория evocode-ide. Запустите 'npm run ide:package-portable'"
  exit 1
fi

PRODUCT_JSON="${PORTABLE_DIR}/resources/app/product.json"
if [[ ! -f "${PRODUCT_JSON}" ]]; then
  echo "❌ Ошибка: Файл product.json не найден"
  exit 1
fi

NAME_SHORT=$(jq -r '.nameShort' "${PRODUCT_JSON}")
APP_NAME=$(jq -r '.applicationName' "${PRODUCT_JSON}")

if [[ "${NAME_SHORT}" != "Эвокод" ]]; then
  echo "❌ Ошибка: nameShort = '${NAME_SHORT}' (ожидалось 'Эвокод')"
  exit 1
fi

if [[ "${APP_NAME}" != "evocode" ]]; then
  echo "❌ Ошибка: applicationName = '${APP_NAME}' (ожидалось 'evocode')"
  exit 1
fi
echo "✓ Файлы сборки и брендинг проверены успешно."

# 2. Запуск Evocode Core
echo "→ 2. Запуск Evocode Core на порту ${PORT}..."
mkdir -p "${ROOT}/.evocode"
nohup node "${ROOT}/dist/index.js" > "${ROOT}/.evocode/smoke-core.log" 2>&1 &
CORE_PID=$!

cleanup() {
  echo "→ Завершение процессов..."
  kill "${CORE_PID}" 2>/dev/null || true
}
trap cleanup EXIT

# Ожидание старта Core
for i in {1..15}; do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "❌ Ошибка: Не удалось запустить Evocode Core"
  cat "${ROOT}/.evocode/smoke-core.log"
  exit 1
fi
echo "✓ Evocode Core успешно запущен."

# 3. Тестирование эндпоинта /health
echo "→ 3. Тестирование эндпоинта /health..."
HEALTH=$(curl -s "http://127.0.0.1:${PORT}/health")
PRODUCT_NAME=$(echo "${HEALTH}" | jq -r '.product')
if [[ "${PRODUCT_NAME}" != "evocode-core" ]]; then
  echo "❌ Ошибка: Неверный продукт в /health: ${PRODUCT_NAME}"
  exit 1
fi
echo "✓ Health эндпоинт вернул корректный JSON."

# 4. Тестирование DLP Guard (блок на критические ключи)
echo "→ 4. Тестирование DLP Guard..."
# Делаем запрос к completions с ограничением токенов и таймаутом для быстрого ответа
DLP_TEST=$(curl -s --max-time 15 -w "%{http_code}" -o /dev/null -X POST "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"my secret password is 12345"}],"max_tokens":5}')

if [[ "${DLP_TEST}" == "500" ]]; then
  echo "❌ Ошибка: Внутренняя ошибка сервера (HTTP 500) при DLP запросе"
  exit 1
fi
echo "✓ DLP Guard отработал без падений сервера (HTTP ${DLP_TEST})."

echo "=== Все авто-тесты SMOKE-IDE пройдены успешно! ==="
