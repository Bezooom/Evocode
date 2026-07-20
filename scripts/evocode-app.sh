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
# Isolate agent config from normal Kilo in VS Code
# Canonical Evocode names; KILO_* kept as aliases for agent runtime
export EVOCODE_CONFIG_DIR="${EVOCODE_CONFIG_DIR:-${KILO_CONFIG_DIR:-$HOME/.config/evocode/agent}}"
export EVOCODE_DATA_DIR="${EVOCODE_DATA_DIR:-${KILO_DATA_DIR:-$HOME/.local/share/evocode}}"
export KILO_CONFIG_DIR="${KILO_CONFIG_DIR:-$EVOCODE_CONFIG_DIR}"
export KILO_DATA_DIR="${KILO_DATA_DIR:-$EVOCODE_DATA_DIR}"

cd "$ROOT"
# ensure isolated provider config (does not touch ~/.config/kilo)
EVOCODE_CORE_URL="$EVOCODE_CORE_URL" npm run agent:install-provider >/dev/null 2>&1 || true

node packages/ide/scripts/install-shell-extension.mjs 2>/dev/null || true
node packages/ide/scripts/apply-product-settings.mjs 2>/dev/null || true

# Install agent if no versioned folder present (version in folder name may change)
if ! compgen -G "${EXT_DIR}/evocode.evocode-agent-*" >/dev/null 2>&1; then
  node packages/ide/scripts/preinstall-agent.mjs --target "${EXT_DIR}" 2>/dev/null || true
fi

if [[ -f "${ROOT}/dist/index.js" ]] && ! curl -sf --max-time 2 "http://127.0.0.1:${CORE_PORT}/health" >/dev/null 2>&1; then
  mkdir -p "${ROOT}/.evocode"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${CORE_PORT}/tcp" >/dev/null 2>&1 || true
    sleep 0.5
  fi
  nohup env PORT="${CORE_PORT}" EVOCODE_LLAMA_MODE="${EVOCODE_LLAMA_MODE}" \
    node "${ROOT}/dist/index.js" >>"${ROOT}/.evocode/core-demo.log" 2>&1 &
  echo $! >"${ROOT}/.evocode/core-demo.pid"
  for _ in 1 2 3 4 5 6 7 8; do
    curl -sf --max-time 1 "http://127.0.0.1:${CORE_PORT}/health" >/dev/null 2>&1 && break
    sleep 0.4
  done
fi

WORKSPACE="${1:-$ROOT}"
FLAGS=(
  --user-data-dir "${PROFILE}"
  --extensions-dir "${EXT_DIR}"
  --disable-workspace-trust
  --new-window
  "${WORKSPACE}"
)

# 1) explicit override
if [[ -n "${VSCODE_EXEC_PATH:-}" && -x "${VSCODE_EXEC_PATH}" ]]; then
  echo "→ editor: ${VSCODE_EXEC_PATH}"
  exec "${VSCODE_EXEC_PATH}" "${FLAGS[@]}"
fi

# 2) Editor binary (not wrappers — avoid recursion with ~/.local/bin/evocode)
# Prefer system package when installed; else monorepo portable / codium tree.
for cand in \
  /usr/share/evocode/bin/evocode \
  "${ROOT}/packages/ide/dist/evocode-ide/bin/evocode" \
  "${ROOT}/packages/ide/dist/evocode-ide/evocode" \
  "${ROOT}/packages/ide/vscodium/VSCode-linux-x64/bin/evocode" \
  "${ROOT}/packages/ide/vscodium/VSCode-linux-x64/bin/codium" \
  "${ROOT}/dist/evocode-ide/bin/evocode"
do
  if [[ -x "${cand}" ]]; then
    echo "→ editor: ${cand} (branded / no Microsoft)"
    exec "${cand}" "${FLAGS[@]}"
  fi
done
if command -v codium >/dev/null 2>&1; then
  # only real codium binary, not our wrappers
  _codium="$(command -v codium)"
  if [[ "${_codium}" != *'/evocode'* ]]; then
    echo "→ editor: ${_codium} (PATH codium)"
    exec "${_codium}" "${FLAGS[@]}"
  fi
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
