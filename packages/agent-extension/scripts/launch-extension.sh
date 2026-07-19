#!/usr/bin/env bash
# Launch VS Code / Cursor as Эвокод Extension Host (branded workspace)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
EXT="${ROOT}/packages/agent-extension/extension"
WS="${ROOT}/packages/agent-extension/config/evocode.code-workspace"
CORE_URL="${EVOCODE_CORE_URL:-http://127.0.0.1:8083/v1}"

if [[ ! -f "${EXT}/package.json" ]]; then
  echo "Rebrand missing — running apply-rebrand..."
  node "${ROOT}/packages/agent-extension/scripts/apply-rebrand.mjs"
fi

if [[ ! -f "${EXT}/dist/extension.js" && ! -e "${EXT}/dist/extension.js" ]]; then
  echo "ERROR: dist/extension.js missing. Build kilo-vscode or re-run agent:rebrand."
  exit 1
fi

EDITOR_BIN="${VSCODE_EXEC_PATH:-}"
if [[ -z "${EDITOR_BIN}" ]]; then
  if command -v code >/dev/null 2>&1; then
    EDITOR_BIN="code"
  elif command -v cursor >/dev/null 2>&1; then
    EDITOR_BIN="cursor"
  else
    echo "Neither code nor cursor in PATH"
    exit 1
  fi
fi

if ! curl -sf "${CORE_URL%/v1}/health" >/dev/null 2>&1; then
  echo "⚠️  Core не на ${CORE_URL%/v1} — запустите: PORT=8083 npm start"
fi

# Fresh UI: optional wipe extension host storage for this profile
if [[ "${EVOCODE_CLEAN_UI:-0}" == "1" ]]; then
  echo "EVOCODE_CLEAN_UI=1 — userDataDir temp clean session"
  USER_DATA=$(mktemp -d /tmp/evocode-vscode-XXXX)
else
  USER_DATA="${ROOT}/.evocode-ide-userdata"
  mkdir -p "$USER_DATA"
fi

echo "=== Эвокод Agent Host ==="
echo "Editor:    $EDITOR_BIN"
echo "Extension: $EXT"
echo "Workspace: $WS"
echo "UserData:  $USER_DATA"
echo "Core:      $CORE_URL"

# --disable-extensions: only our extension (no Copilot Chat side panel from other exts)
# workspace file: no welcome page, hidden secondary sidebar
exec "${EDITOR_BIN}" \
  --extensionDevelopmentPath="${EXT}" \
  --disable-extensions \
  --user-data-dir="${USER_DATA}" \
  --skip-welcome \
  --skip-release-notes \
  "${WS}"
