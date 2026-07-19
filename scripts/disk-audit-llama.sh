#!/usr/bin/env bash
# Аудит места: llama-форки, модели, ollama. НИЧЕГО НЕ УДАЛЯЕТ.
set -euo pipefail

echo "=== Диски ==="
df -h / /home/bezoom/storage 2>/dev/null | tail -n +1
echo

echo "=== Форки (~) ==="
for d in llama.cpp llama.cpp-tq3 llama-cpp-turboquant-cuda buun-llama-cpp beellama.cpp ik_llama.cpp; do
  p="/home/bezoom/$d"
  if [[ -d "$p" ]]; then
    printf '%-36s ' "$d"
    du -sh "$p" 2>/dev/null | cut -f1
  fi
done
echo

echo "=== Модели (GGUF > 100M) ==="
find /home/bezoom/llama.cpp/models -maxdepth 1 -name '*.gguf' -size +100M -printf '%s %p\n' 2>/dev/null \
  | awk '{printf "%.1fG  %s\n", $1/1024/1024/1024, $2}' | sort -hr
echo

echo "=== Ollama ==="
du -sh /home/bezoom/.ollama 2>/dev/null || echo none
echo

echo "=== Кто на что ссылается (скрипты start_*) ==="
grep -hE 'LLAMA_BIN=|MODEL_FILE=' /home/bezoom/start_ai*.sh /home/bezoom/start_ik*.sh /home/bezoom/start_embeddings.sh 2>/dev/null \
  | sort -u
echo

echo "=== Кандидаты на удаление (см. docs/DISK_CLEANUP.md) ==="
echo "SAFE (не в keep-профилях, ~3.8G forks):"
echo "  beellama.cpp, llama-cpp-turboquant-cuda, llama.cpp-tq3"
echo "DUPLICATE model (~20G): ornith-1.0-35b-Q4_K_M.gguf если оставляете Q4_K"
echo "MISSING refs (файла нет — скрипты мёртвые): huihui*, Qwopus*Q5*, TQ3_4S"
echo "REVIEW ollama (~40G): du -sh ~/.ollama; ollama list"
echo
echo "Dry-run удаления форков (только echo):"
for d in beellama.cpp llama-cpp-turboquant-cuda llama.cpp-tq3; do
  p="/home/bezoom/$d"
  if [[ -d "$p" ]]; then
    echo "  would remove: $p ($(du -sh "$p" | cut -f1))"
  fi
done
