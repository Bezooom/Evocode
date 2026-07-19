#!/usr/bin/env bash
# Launcher «Эвокод» — VSCodium only (no Microsoft code by default)
set -euo pipefail

ROOT="${EVOCODE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
export EVOCODE_ROOT="$ROOT"
PROFILE="${EVOCODE_USER_DATA_DIR:-$HOME/.evocode-ide}"
EXT_DIR="${EVOCODE_EXTENSIONS_DIR:-$PROFILE/extensions}"
CORE_PORT="${PORT:-8083}"
export EVOCODE_USER_DATA_DIR="$PROFILE"
export EVOCODE_EXTENSIONS_DIR="$EXT_DIR"
export EVOCODE_LLAMA_MODE="${EVOCODE_LLAMA_MODE:-attach}"
export EVOCODE_CORE_URL="${EVOCODE_CORE_URL:-http://127.0.0.1:8083/v1}"

cd "$ROOT"

node packages/ide/scripts/install-shell-extension.mjs 2>/dev/null || true
node packages/ide/scripts/apply-product-settings.mjs 2>/dev/null || true

if [[ ! -e "${EXT_DIR}/evocode.evocode-agent-0.1.0" ]]; then
  node packages/ide/scripts/preinstall-agent.mjs --target "${EXT_DIR}" 2>/dev/null || true
fi

if [[ -f "${ROOT}/dist/index.js" ]] && ! curl -sf "http://127.0.0.1:${CORE_PORT}/health" >/dev/null 2>&1; then
  mkdir -p "${ROOT}/.evocode"
  nohup env PORT="${CORE_PORT}" EVOCODE_LLAMA_MODE="${EVOCODE_LLAMA_MODE}" \
    node "${ROOT}/dist/index.js" >>"${ROOT}/.evocode/core-demo.log" 2>&1 &
  echo $! >"${ROOT}/.evocode/core-demo.pid"
fi

WORKSPACE="${1:-$ROOT}"
FLAGS=(
  --user-data-dir "${PROFILE}"
  --extensions-dir "${EXT_DIR}"
  --class Evocode
  --disable-workspace-trust
  --new-window
  "${WORKSPACE}"
)

# 1) explicit override
if [[ -n "${VSCODE_EXEC_PATH:-}" && -x "${VSCODE_EXEC_PATH}" ]]; then
  echo "→ editor: ${VSCODE_EXEC_PATH}"
  exec "${VSCODE_EXEC_PATH}" "${FLAGS[@]}"
fi

# 2) local branded build
for cand in \
  "${ROOT}/packages/ide/vscodium/VSCode-linux-x64/bin/evocode" \
  "${ROOT}/packages/ide/vscodium/VSCode-linux-x64/bin/codium" \
  "${ROOT}/dist/evocode" \
  "$HOME/.local/bin/evocode" \
  /usr/bin/codium
do
  if [[ -x "${cand}" ]]; then
    echo "→ editor: ${cand} (no Microsoft)"
    exec "${cand}" "${FLAGS[@]}"
  fi
done
if command -v codium >/dev/null 2>&1; then
  echo "→ editor: codium (PATH)"
  exec codium "${FLAGS[@]}"
fi

# 3) Flatpak VSCodium (installed on this machine)
if command -v flatpak >/dev/null 2>&1 && flatpak info --user com.vscodium.codium >/dev/null 2>&1; then
  echo "→ editor: flatpak com.vscodium.codium (no Microsoft)"
  exec flatpak run --user \
    --filesystem=home \
    --share=network \
    com.vscodium.codium \
    "${FLAGS[@]}"
fi

# 4) Microsoft code — only with explicit flag
if [[ "${EVOCODE_ALLOW_CODE:-}" == "1" ]] && command -v code >/dev/null 2>&1; then
  echo "⚠️  EVOCODE_ALLOW_CODE=1 — Microsoft code (временный escape)" >&2
  exec code "${FLAGS[@]}"
fi

cat >&2 <<'EOF'
ERROR: Нет VSCodium.

Microsoft VS Code намеренно отключён — из‑за него док/логотипы = «Code».

Уже можно:
  flatpak install --user flathub com.vscodium.codium
  npm run evocode

Или branded build:
  npm run ide:build-codium

Аварийно (плохо): EVOCODE_ALLOW_CODE=1 npm run evocode
EOF
exit 1
