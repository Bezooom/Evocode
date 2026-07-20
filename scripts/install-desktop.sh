#!/usr/bin/env bash
# Ярлык «Эвокод» → VSCodium flatpak / codium (не Microsoft code)
set -euo pipefail

ROOT="${EVOCODE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/256x256/apps"
BIN_DIR="${HOME}/.local/bin"
LAUNCHER_APP="${ROOT}/scripts/evocode-app.sh"
LAUNCHER_CLI="${ROOT}/scripts/evocode-cli.sh"
ICON_SRC="${ROOT}/packages/agent-extension/brand/icons/evocode-icon-256.png"
ICON_DST="${ICON_DIR}/evocode.png"
DESKTOP="${APP_DIR}/evocode.desktop"

mkdir -p "${APP_DIR}" "${ICON_DIR}" "${BIN_DIR}"
chmod +x "${LAUNCHER_APP}" "${LAUNCHER_CLI}" 2>/dev/null || true

# PATH-first wrapper: `evocode` in terminal ≠ Microsoft code, ≠ bare deb without monorepo
ln -sfn "${LAUNCHER_CLI}" "${BIN_DIR}/evocode"
# Ensure not shadowed only by /usr/bin — ~/.local/bin is first on this machine
echo "  PATH launcher: ${BIN_DIR}/evocode → ${LAUNCHER_CLI}"

if [[ -f "${ICON_SRC}" ]]; then
  cp -f "${ICON_SRC}" "${ICON_DST}"
  mkdir -p "$HOME/.icons"
  cp -f "${ICON_SRC}" "$HOME/.icons/evocode.png"
fi

# User desktop overrides /usr/share/applications (system deb) for this user
cat > "${DESKTOP}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Эвокод
GenericName=AI IDE
Comment=Эвокод — monorepo launcher (Core + agent + shell). Не Visual Studio Code.
Exec=${LAUNCHER_APP} %F
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
Exec=${LAUNCHER_APP}
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
echo "  desktop: ${DESKTOP}"
echo "  cli:     ${BIN_DIR}/evocode"
echo "  icon:    ${ICON_DST}"
echo "  full:    ${LAUNCHER_APP}"
echo ""
echo "Не путать:"
echo "  • Эвокод     → этот ярлык / команда evocode / npm run evocode"
echo "  • VS Code    → code  (/usr/share/code) + Kilo marketplace"
echo "  • deb bare   → /usr/bin/evocode без monorepo (если PATH без ~/.local/bin)"
if command -v evocode >/dev/null 2>&1; then
  echo "  which evocode → $(command -v evocode)"
fi
