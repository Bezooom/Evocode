#!/usr/bin/env bash
# Ярлык «Эвокод» → VSCodium flatpak / codium (не Microsoft code)
set -euo pipefail

ROOT="${EVOCODE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/256x256/apps"
LAUNCHER="${ROOT}/scripts/evocode-app.sh"
ICON_SRC="${ROOT}/packages/agent-extension/brand/icons/evocode-icon-256.png"
ICON_DST="${ICON_DIR}/evocode.png"
DESKTOP="${APP_DIR}/evocode.desktop"

mkdir -p "${APP_DIR}" "${ICON_DIR}"
chmod +x "${ROOT}/scripts/evocode-app.sh" 2>/dev/null || true

if [[ -f "${ICON_SRC}" ]]; then
  cp -f "${ICON_SRC}" "${ICON_DST}"
fi

# Hide default Code from being confused — user still has code, but our desktop is separate
cat > "${DESKTOP}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Эвокод
GenericName=AI IDE
Comment=Эвокод — privacy-first AI-IDE на VSCodium (без Microsoft)
Exec=${LAUNCHER} %F
Icon=evocode
Terminal=false
Categories=Development;IDE;TextEditor;
Keywords=evocode;эвокод;ai;ide;vscodium;llm;
StartupNotify=true
StartupWMClass=Evocode
MimeType=text/plain;inode/directory;
Actions=new-window;

[Desktop Action new-window]
Name=Новое окно
Exec=${LAUNCHER}
EOF

chmod +x "${DESKTOP}"

# Optional: hide Microsoft Code from "Open with" confusion for our workspace? skip.

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APP_DIR}" 2>/dev/null || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" 2>/dev/null || true
fi

echo "=== Ярлык Эвокод ==="
echo "  ${DESKTOP}"
echo "  icon: ${ICON_DST}"
echo "  backend: VSCodium (flatpak/codium), НЕ code"
if flatpak info --user com.vscodium.codium >/dev/null 2>&1; then
  echo "  ✓ flatpak com.vscodium.codium установлен"
else
  echo "  ! поставьте: flatpak install --user flathub com.vscodium.codium"
fi
