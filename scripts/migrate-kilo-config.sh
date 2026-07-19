#!/usr/bin/env bash
# Import ~/.config/kilo → ~/.config/evocode
set -euo pipefail

SRC="${KILO_CONFIG:-$HOME/.config/kilo}"
DST="${EVOCODE_CONFIG:-$HOME/.config/evocode}"

echo "=== Миграция конфигурации Kilo → Эвокод ==="
echo "From: ${SRC}"
echo "To:   ${DST}"

if [[ ! -d "${SRC}" ]]; then
  echo "Источник не найден: ${SRC}"
  exit 1
fi

mkdir -p "${DST}/skills/system" "${DST}/skills/user" "${DST}/agent" "${DST}/mcp" "${DST}/models"

# Skills
if [[ -d "${SRC}/skills" ]]; then
  rsync -a --ignore-existing "${SRC}/skills/" "${DST}/skills/user/" || \
    cp -a "${SRC}/skills/." "${DST}/skills/user/" 2>/dev/null || true
  echo "Skills → ${DST}/skills/user"
fi

# Agents / prompts
if [[ -d "${SRC}/agent" ]]; then
  rsync -a "${SRC}/agent/" "${DST}/agent/" || cp -a "${SRC}/agent/." "${DST}/agent/"
  echo "Agents → ${DST}/agent"
fi

# MCP
if [[ -d "${SRC}/mcp" ]]; then
  rsync -a "${SRC}/mcp/" "${DST}/mcp/" || cp -a "${SRC}/mcp/." "${DST}/mcp/"
  echo "MCP → ${DST}/mcp"
fi

# kilo.json → evocode.json (light transform)
if [[ -f "${SRC}/kilo.json" ]]; then
  cp "${SRC}/kilo.json" "${DST}/kilo-import.json"
  cat > "${DST}/config.json" <<EOF
{
  "importedFrom": "kilo",
  "importedAt": "$(date -Iseconds)",
  "coreBaseUrl": "http://127.0.0.1:8083/v1",
  "privacyMode": "auto",
  "notes": "Отредактируйте model/provider: используйте evocode-auto через Core"
}
EOF
  echo "Wrote ${DST}/config.json (kilo.json saved as kilo-import.json)"
fi

# Local share data (auth.json only)
SHARE_SRC="$HOME/.local/share/kilo"
SHARE_DST="$HOME/.local/share/evocode"
if [[ -f "${SHARE_SRC}/auth.json" ]]; then
  mkdir -p "${SHARE_DST}"
  cp "${SHARE_SRC}/auth.json" "${SHARE_DST}/auth.json"
  echo "Auth/Local share (auth.json) → ${SHARE_DST}"
fi

echo "Готово. Подключите Core: npm start в репозитории Evocode"
