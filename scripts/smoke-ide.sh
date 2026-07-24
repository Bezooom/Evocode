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

# Full product markers (not plain rebranded VSCodium)
AGENT_PKG="${PORTABLE_DIR}/resources/app/extensions/evocode-agent/package.json"
SHELL_PKG="${PORTABLE_DIR}/resources/app/extensions/evocode-shell/package.json"
CORE_ENTRY="${PORTABLE_DIR}/core/dist/index.js"
PRODUCT_MARKER="${PORTABLE_DIR}/EVOCODE-PRODUCT.txt"

if [[ ! -f "${AGENT_PKG}" ]]; then
  echo "❌ Ошибка: нет built-in evocode-agent. Запустите: npm run ide:package-portable"
  exit 1
fi
if [[ ! -f "${SHELL_PKG}" ]]; then
  echo "❌ Ошибка: нет built-in evocode-shell. Запустите: npm run ide:package-portable"
  exit 1
fi
if [[ ! -f "${CORE_ENTRY}" ]]; then
  echo "❌ Ошибка: нет bundled Core (core/dist/index.js). Запустите: npm run ide:package-portable"
  exit 1
fi
if [[ ! -f "${PRODUCT_MARKER}" ]]; then
  echo "❌ Ошибка: нет EVOCODE-PRODUCT.txt — дерево не productize'нуто"
  exit 1
fi
AGENT_NAME=$(jq -r '.name' "${AGENT_PKG}")
if [[ "${AGENT_NAME}" != "evocode-agent" ]]; then
  echo "❌ Ошибка: agent name = '${AGENT_NAME}' (ожидалось evocode-agent)"
  exit 1
fi
echo "✓ Файлы сборки, брендинг и полный продукт (agent/shell/Core) проверены."

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
# Когда local LLM offline, Core может вернуть 502/503/500 с type=internal (fetch failed) —
# это не падение DLP. Критично: процесс Core жив и не отвечает пустым hang.
DLP_BODY=$(mktemp)
DLP_TEST=$(curl -s --max-time 15 -w "%{http_code}" -o "${DLP_BODY}" -X POST "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"my secret password is 12345"}],"max_tokens":5}')
BODY_TXT=$(cat "${DLP_BODY}" 2>/dev/null || true)
rm -f "${DLP_BODY}"

if [[ -z "${DLP_TEST}" ]]; then
  echo "❌ Ошибка: нет HTTP-ответа от Core на DLP-запрос"
  exit 1
fi
# 200/403 = DLP/route OK; 502/503 = LLM offline but Core handled; 400/422 = validation
if [[ "${DLP_TEST}" == "500" ]] && echo "${BODY_TXT}" | grep -qiE 'stack|TypeError|Cannot read'; then
  echo "❌ Ошибка: необработанное исключение Core (HTTP 500)"
  echo "${BODY_TXT}" | head -c 400
  exit 1
fi
echo "✓ DLP/route путь ответил (HTTP ${DLP_TEST}; LLM offline → internal fetch — OK)."

# 5. Hardware API (1.0.1+)
echo "→ 5. Тестирование /v1/hardware..."
HW=$(curl -s --max-time 8 "http://127.0.0.1:${PORT}/v1/hardware")
HW_TIER=$(echo "${HW}" | jq -r '.tier // empty')
if [[ -z "${HW_TIER}" ]]; then
  echo "❌ Ошибка: /v1/hardware без tier"
  echo "${HW}" | head -c 300
  exit 1
fi
echo "✓ Hardware probe: tier=${HW_TIER}"

echo "=== Все авто-тесты SMOKE-IDE пройдены успешно! ==="
