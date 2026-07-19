#!/usr/bin/env bash
# Совместимость: npm run evocode → product launcher
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export EVOCODE_ROOT="$ROOT"
exec bash "${ROOT}/scripts/evocode-app.sh" "$@"
