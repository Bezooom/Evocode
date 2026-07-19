#!/usr/bin/env bash
# Поднять chat (и опц. embed) БЕЗ копий — обёртка над твоими start_*.sh
set -euo pipefail

PROFILE="${EVOCODE_CHAT_PROFILE:-coder}"
START_EMBED="${EVOCODE_START_EMBED:-0}"

case "$PROFILE" in
  coder)           SCRIPT=/home/bezoom/start_ik_ai_coder.sh ;;
  chat-ornith)     SCRIPT=/home/bezoom/start_ik_ai4.sh ;;
  chat-agentworld) SCRIPT=/home/bezoom/start_ik_ai3.sh ;;
  chat-qwopus35)   SCRIPT=/home/bezoom/start_ik_ai2.sh ;;
  *)
    echo "Unknown profile: $PROFILE (coder|chat-ornith|chat-agentworld|chat-qwopus35)"
    exit 1
    ;;
esac

if [[ ! -f "$SCRIPT" ]]; then
  echo "Script missing: $SCRIPT"
  exit 1
fi

echo "=== Chat profile: $PROFILE ==="
echo "Script: $SCRIPT"
bash "$SCRIPT" &
sleep 3

if [[ "$START_EMBED" == "1" ]]; then
  echo "=== Embed nomic on :8084 (не 8081) ==="
  # inline — не трогаем start_embeddings.sh (там 8081)
  BIN=/home/bezoom/buun-llama-cpp/build/bin/llama-server
  MODEL=/home/bezoom/llama.cpp/models/nomic-embed-text-v1.5.Q4_K_M.gguf
  fuser -k 8084/tcp 2>/dev/null || true
  sleep 1
  nohup env GGML_TURBO_DECODE_NATIVE=1 "$BIN" \
    -m "$MODEL" --alias nomic-embed -ngl 99 --embedding \
    --port 8084 --host 127.0.0.1 -t 8 -c 8192 \
    --parallel 2 --batch-size 4096 --ubatch-size 4096 \
    < /dev/null > /tmp/evocode-embed.log 2>&1 &
  echo $! > /tmp/evocode-embed.pid
  echo "embed PID $(cat /tmp/evocode-embed.pid) log /tmp/evocode-embed.log"
fi

echo "Далее: cd Evocode && PORT=8083 npm start"
echo "Agent:  EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:install-provider"
