#!/usr/bin/env bash
# Render high-resolution PNG icons from the new SVG logo design
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICONS_DIR="${ROOT}/packages/agent-extension/brand/icons"

echo "=== Rendering PNG icons from new SVG logo ==="

# Convert to 128x128
rsvg-convert -w 128 -h 128 -f png -o "${ICONS_DIR}/evocode-icon-128.png" "${ICONS_DIR}/evocode-app.svg"
echo "✓ evocode-icon-128.png rendered"

# Convert to 256x256
rsvg-convert -w 256 -h 256 -f png -o "${ICONS_DIR}/evocode-icon-256.png" "${ICONS_DIR}/evocode-app.svg"
rsvg-convert -w 256 -h 256 -f png -o "${ICONS_DIR}/kilo-dark.png" "${ICONS_DIR}/evocode-app.svg"
rsvg-convert -w 256 -h 256 -f png -o "${ICONS_DIR}/kilo-light.png" "${ICONS_DIR}/evocode-app.svg"
rsvg-convert -w 256 -h 256 -f png -o "${ICONS_DIR}/logo-outline-black.png" "${ICONS_DIR}/evocode-app.svg"
rsvg-convert -w 256 -h 256 -f png -o "${ICONS_DIR}/evocode-activity-light.png" "${ICONS_DIR}/evocode-app.svg"
rsvg-convert -w 256 -h 256 -f png -o "${ICONS_DIR}/evocode-activity-dark.png" "${ICONS_DIR}/evocode-app.svg"
echo "✓ 256x256 icons rendered"

# Convert to 512x512
rsvg-convert -w 512 -h 512 -f png -o "${ICONS_DIR}/evocode-icon-512.png" "${ICONS_DIR}/evocode-app.svg"
echo "✓ evocode-icon-512.png rendered"

echo "=== All PNG icons updated successfully ==="
