#!/usr/bin/env bash
# Disk audit: llama forks, models, ollama. Does NOT delete anything.
set -euo pipefail

HOME="${HOME:-$(eval echo ~)}"
MODELS_DIR="${LLAMA_MODELS_DIR:-$HOME/llama.cpp/models}"

echo "=== Disks ==="
df -h / "$HOME" 2>/dev/null | tail -n +1
echo

echo "=== Forks under \$HOME ==="
for d in llama.cpp llama.cpp-tq3 llama-cpp-turboquant-cuda buun-llama-cpp beellama.cpp ik_llama.cpp; do
  p="$HOME/$d"
  if [[ -d "$p" ]]; then
    printf '%-36s ' "$d"
    du -sh "$p" 2>/dev/null | cut -f1
  fi
done
echo

echo "=== Models (GGUF > 100M) in $MODELS_DIR ==="
if [[ -d "$MODELS_DIR" ]]; then
  find "$MODELS_DIR" -maxdepth 1 -name '*.gguf' -size +100M -printf '%s %p\n' 2>/dev/null \
    | awk '{printf "%.1fG  %s\n", $1/1024/1024/1024, $2}' | sort -hr
else
  echo "(missing $MODELS_DIR — set LLAMA_MODELS_DIR)"
fi
echo

echo "=== Ollama ==="
du -sh "$HOME/.ollama" 2>/dev/null || echo none
echo

echo "=== start_* script refs (LLAMA_BIN / MODEL_FILE) ==="
grep -hE 'LLAMA_BIN=|MODEL_FILE=' "$HOME"/start_ai*.sh "$HOME"/start_ik*.sh "$HOME"/start_embeddings.sh 2>/dev/null \
  | sort -u || echo "(no start_*.sh under \$HOME)"
echo

echo "=== Candidates (see docs/DISK_CLEANUP.md) ==="
echo "SAFE-ish unused forks: beellama.cpp, llama-cpp-turboquant-cuda, llama.cpp-tq3"
echo "REVIEW ollama: du -sh ~/.ollama; ollama list"
echo
echo "Dry-run remove (echo only):"
for d in beellama.cpp llama-cpp-turboquant-cuda llama.cpp-tq3; do
  p="$HOME/$d"
  if [[ -d "$p" ]]; then
    echo "  would remove: $p ($(du -sh "$p" | cut -f1))"
  fi
done
