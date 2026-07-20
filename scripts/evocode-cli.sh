#!/usr/bin/env bash
# Эвокод — CLI entry (~/.local/bin/evocode)
set -euo pipefail

export EVOCODE_CONFIG_DIR="${EVOCODE_CONFIG_DIR:-${KILO_CONFIG_DIR:-$HOME/.config/evocode/agent}}"
export EVOCODE_DATA_DIR="${EVOCODE_DATA_DIR:-${KILO_DATA_DIR:-$HOME/.local/share/evocode}}"
export KILO_CONFIG_DIR="${KILO_CONFIG_DIR:-$EVOCODE_CONFIG_DIR}"
export KILO_DATA_DIR="${KILO_DATA_DIR:-$EVOCODE_DATA_DIR}"
export EVOCODE_USER_DATA_DIR="${EVOCODE_USER_DATA_DIR:-$HOME/.evocode-ide}"
export EVOCODE_EXTENSIONS_DIR="${EVOCODE_EXTENSIONS_DIR:-$EVOCODE_USER_DATA_DIR/extensions}"
export EVOCODE_CORE_URL="${EVOCODE_CORE_URL:-http://127.0.0.1:8083/v1}"

mkdir -p "$EVOCODE_USER_DATA_DIR" "$EVOCODE_EXTENSIONS_DIR" "$EVOCODE_CONFIG_DIR" "$EVOCODE_DATA_DIR"

ROOT="${EVOCODE_ROOT:-}"
if [[ -z "$ROOT" || ! -f "$ROOT/dist/index.js" ]]; then
  for cand in \
    "$HOME/storage/Projects/Evocode" \
    "/home/bezoom/storage/Projects/Evocode" \
    "$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]:-$0}")")/.." 2>/dev/null && pwd)"; do
    if [[ -f "${cand}/dist/index.js" ]]; then ROOT="$cand"; break; fi
  done
fi

if [[ -n "${ROOT:-}" && -f "$ROOT/dist/index.js" ]]; then
  export EVOCODE_ROOT="$ROOT"
  (cd "$ROOT" && EVOCODE_CORE_URL="$EVOCODE_CORE_URL" npm run agent:install-provider >/dev/null 2>&1) || true
  # Always use --max-time: hung Core must not block IDE launch forever
  if ! curl -sf --max-time 2 "http://127.0.0.1:8083/health" >/dev/null 2>&1; then
    mkdir -p "$ROOT/.evocode"
    # Kill zombie Core if port half-open / process wedged
    if command -v fuser >/dev/null 2>&1; then
      fuser -k 8083/tcp >/dev/null 2>&1 || true
      sleep 0.5
    fi
    nohup env PORT=8083 EVOCODE_LLAMA_MODE="${EVOCODE_LLAMA_MODE:-attach}" \
      EVOCODE_SKILLS_EMBED="${EVOCODE_SKILLS_EMBED:-true}" \
      node "$ROOT/dist/index.js" >>"$ROOT/.evocode/core-demo.log" 2>&1 &
    echo $! >"$ROOT/.evocode/core-demo.pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      curl -sf --max-time 1 "http://127.0.0.1:8083/health" >/dev/null 2>&1 && break
      sleep 0.4
    done
  fi
fi

EDITOR_BIN=""
for cand in \
  /usr/share/evocode/bin/evocode \
  "${ROOT:-}/packages/ide/dist/evocode-ide/bin/evocode" \
  "$HOME/storage/Projects/Evocode/packages/ide/dist/evocode-ide/bin/evocode"; do
  if [[ -n "$cand" && -x "$cand" ]]; then EDITOR_BIN="$cand"; break; fi
done

if [[ -z "$EDITOR_BIN" ]]; then
  echo "Эвокод: IDE не найден. sudo dpkg -i packages/ide/dist/evocode_*.deb" >&2
  exit 1
fi

echo "→ editor: $EDITOR_BIN"
exec "$EDITOR_BIN" \
  --user-data-dir "$EVOCODE_USER_DATA_DIR" \
  --extensions-dir "$EVOCODE_EXTENSIONS_DIR" \
  --disable-workspace-trust \
  "$@"
