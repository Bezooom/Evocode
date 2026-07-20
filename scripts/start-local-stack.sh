#!/usr/bin/env bash
# Start chat (and optional embed) without copying GGUF — wrappers around your start_*.sh
set -euo pipefail

PROFILE="${EVOCODE_CHAT_PROFILE:-coder}"
START_EMBED="${EVOCODE_START_EMBED:-0}"
HOME="${HOME:-$(eval echo ~)}"

case "$PROFILE" in
  coder)           SCRIPT="${EVOCODE_START_CHAT:-$HOME/start_ik_ai_coder.sh}" ;;
  chat-ornith)     SCRIPT="${EVOCODE_START_CHAT:-$HOME/start_ik_ai4.sh}" ;;
  chat-agentworld) SCRIPT="${EVOCODE_START_CHAT:-$HOME/start_ik_ai3.sh}" ;;
  chat-qwopus35)   SCRIPT="${EVOCODE_START_CHAT:-$HOME/start_ik_ai2.sh}" ;;
  *)
    echo "Unknown profile: $PROFILE (coder|chat-ornith|chat-agentworld|chat-qwopus35)"
    echo "Or set EVOCODE_START_CHAT=/path/to/start.sh"
    exit 1
    ;;
esac

if [[ ! -f "$SCRIPT" ]]; then
  echo "Script missing: $SCRIPT"
  echo "Create a launcher or set EVOCODE_START_CHAT. See config/profiles.example.json"
  exit 1
fi

echo "=== Chat profile: $PROFILE ==="
echo "Script: $SCRIPT"
bash "$SCRIPT" &
sleep 3

if [[ "$START_EMBED" == "1" ]]; then
  echo "=== Embed nomic on :8084 ==="
  BIN="${LLAMA_EMBED_BINARY:-$HOME/buun-llama-cpp/build/bin/llama-server}"
  MODEL="${LLAMA_EMBED_MODEL:-$HOME/llama.cpp/models/nomic-embed-text-v1.5.Q4_K_M.gguf}"
  if [[ ! -x "$BIN" && ! -f "$BIN" ]]; then
    echo "Embed binary missing: $BIN (set LLAMA_EMBED_BINARY)"
    exit 1
  fi
  if [[ ! -f "$MODEL" ]]; then
    echo "Embed model missing: $MODEL (set LLAMA_EMBED_MODEL)"
    exit 1
  fi
  fuser -k 8084/tcp 2>/dev/null || true
  sleep 1
  nohup env GGML_TURBO_DECODE_NATIVE=1 "$BIN" \
    -m "$MODEL" --alias nomic-embed -ngl 0 --embedding \
    --port 8084 --host 127.0.0.1 -t 8 -c 8192 \
    --parallel 2 --batch-size 512 --ubatch-size 512 \
    < /dev/null > /tmp/evocode-embed.log 2>&1 &
  echo $! > /tmp/evocode-embed.pid
  echo "embed PID $(cat /tmp/evocode-embed.pid) log /tmp/evocode-embed.log"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Next: cd $ROOT && PORT=8083 npm start"
echo "Agent: EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:install-provider"
