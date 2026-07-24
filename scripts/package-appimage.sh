#!/usr/bin/env bash
# F2.5: Build AppImage from rebranded VSCodium portable tree
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDE_DIST="${ROOT}/packages/ide/dist"
PORTABLE_DIR="${IDE_DIST}/evocode-ide"
APPDIR="${IDE_DIST}/AppDir"
VERSION="$(node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo "1.0.1")"

echo "=== Сборка AppImage Эвокод ==="

if [[ ! -d "${PORTABLE_DIR}" ]]; then
  echo "ERROR: Портативная сборка не найдена в ${PORTABLE_DIR}"
  echo "Сначала запустите: npm run ide:package-portable"
  exit 1
fi

# Clean previous build dirs
rm -rf "${APPDIR}"
mkdir -p "${APPDIR}/usr/bin"
mkdir -p "${APPDIR}/usr/share/applications"
mkdir -p "${APPDIR}/usr/share/icons/hicolor/256x256/apps"

echo "→ Копирование файлов приложения..."
# Copy portable tree to usr/share/evocode inside AppDir
mkdir -p "${APPDIR}/usr/share/evocode"
cp -R "${PORTABLE_DIR}"/* "${APPDIR}/usr/share/evocode/"

echo "→ Копирование файлов Core сервера..."
mkdir -p "${APPDIR}/usr/share/evocode/core"
cp -R "${ROOT}/dist" "${APPDIR}/usr/share/evocode/core/"
cp -R "${ROOT}/skills" "${APPDIR}/usr/share/evocode/core/"
cp "${ROOT}/package.json" "${APPDIR}/usr/share/evocode/core/"
cp -R "${ROOT}/node_modules" "${APPDIR}/usr/share/evocode/core/"

echo "→ Создание AppRun..."
cat > "${APPDIR}/AppRun" <<'EOF'
#!/usr/bin/env bash
# AppRun для AppImage Эвокод — isolated profile
set -euo pipefail
HERE="$(dirname "$(readlink -f "${0}")")"
export PATH="${HERE}/usr/bin:${PATH}"
export EVOCODE_CONFIG_DIR="${EVOCODE_CONFIG_DIR:-${KILO_CONFIG_DIR:-$HOME/.config/evocode/agent}}"
export EVOCODE_DATA_DIR="${EVOCODE_DATA_DIR:-${KILO_DATA_DIR:-$HOME/.local/share/evocode}}"
export KILO_CONFIG_DIR="${KILO_CONFIG_DIR:-$EVOCODE_CONFIG_DIR}"
export KILO_DATA_DIR="${KILO_DATA_DIR:-$EVOCODE_DATA_DIR}"
export EVOCODE_USER_DATA_DIR="${EVOCODE_USER_DATA_DIR:-$HOME/.evocode-ide}"
export EVOCODE_EXTENSIONS_DIR="${EVOCODE_EXTENSIONS_DIR:-$EVOCODE_USER_DATA_DIR/extensions}"
mkdir -p "$EVOCODE_USER_DATA_DIR" "$EVOCODE_EXTENSIONS_DIR" "$EVOCODE_CONFIG_DIR" "$EVOCODE_DATA_DIR"
exec "${HERE}/usr/share/evocode/bin/evocode" \
  --user-data-dir "$EVOCODE_USER_DATA_DIR" \
  --extensions-dir "$EVOCODE_EXTENSIONS_DIR" \
  --disable-workspace-trust \
  "$@"
EOF
chmod +x "${APPDIR}/AppRun"

echo "→ Создание исполняемого файла usr/bin/evocode..."
# Relative path — absolute /usr/share breaks inside AppImage
cat > "${APPDIR}/usr/bin/evocode" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(dirname "$(readlink -f "${0}")")"
export EVOCODE_CONFIG_DIR="${EVOCODE_CONFIG_DIR:-${KILO_CONFIG_DIR:-$HOME/.config/evocode/agent}}"
export EVOCODE_DATA_DIR="${EVOCODE_DATA_DIR:-${KILO_DATA_DIR:-$HOME/.local/share/evocode}}"
export KILO_CONFIG_DIR="${KILO_CONFIG_DIR:-$EVOCODE_CONFIG_DIR}"
export KILO_DATA_DIR="${KILO_DATA_DIR:-$EVOCODE_DATA_DIR}"
export EVOCODE_USER_DATA_DIR="${EVOCODE_USER_DATA_DIR:-$HOME/.evocode-ide}"
export EVOCODE_EXTENSIONS_DIR="${EVOCODE_EXTENSIONS_DIR:-$EVOCODE_USER_DATA_DIR/extensions}"
mkdir -p "$EVOCODE_USER_DATA_DIR" "$EVOCODE_EXTENSIONS_DIR" "$EVOCODE_CONFIG_DIR" "$EVOCODE_DATA_DIR"
exec "${HERE}/../share/evocode/bin/evocode" \
  --user-data-dir "$EVOCODE_USER_DATA_DIR" \
  --extensions-dir "$EVOCODE_EXTENSIONS_DIR" \
  --disable-workspace-trust \
  "$@"
EOF
chmod +x "${APPDIR}/usr/bin/evocode"

echo "→ Создание ярлыка evocode.desktop..."
cat > "${APPDIR}/evocode.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Эвокод
GenericName=AI IDE
Comment=Эвокод — privacy-first AI-IDE на VSCodium (без Microsoft)
Exec=evocode %F
Icon=evocode
Terminal=false
Categories=Development;IDE;TextEditor;
Keywords=evocode;эвокод;ai;ide;vscodium;llm;
StartupNotify=true
StartupWMClass=Evocode
MimeType=text/plain;inode/directory;
EOF
cp "${APPDIR}/evocode.desktop" "${APPDIR}/usr/share/applications/"

echo "→ Копирование иконки приложения..."
ICON_SRC="${ROOT}/packages/agent-extension/brand/icons/evocode-icon-256.png"
if [[ -f "${ICON_SRC}" ]]; then
  cp "${ICON_SRC}" "${APPDIR}/evocode.png"
  cp "${ICON_SRC}" "${APPDIR}/usr/share/icons/hicolor/256x256/apps/evocode.png"
else
  echo "WARNING: Иконка ${ICON_SRC} не найдена"
fi

# Try to download appimagetool if not available
APPIMAGETOOL="${ROOT}/packages/ide/dist/appimagetool-x86_64.AppImage"
if ! command -v appimagetool >/dev/null 2>&1; then
  if [[ ! -x "${APPIMAGETOOL}" ]]; then
    echo "→ Скачивание appimagetool..."
    wget -q -O "${APPIMAGETOOL}" "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" || true
    if [[ -f "${APPIMAGETOOL}" ]]; then
      chmod +x "${APPIMAGETOOL}"
    fi
  fi
fi

echo "→ Сборка AppImage..."
export ARCH="${ARCH:-$(uname -m)}"
if command -v appimagetool >/dev/null 2>&1; then
  appimagetool "${APPDIR}" "${IDE_DIST}/Evocode-${VERSION}-x86_64.AppImage"
elif [[ -x "${APPIMAGETOOL}" ]]; then
  # running appimagetool inside docker or host might require --appimage-extract-and-run
  "${APPIMAGETOOL}" --appimage-extract-and-run "${APPDIR}" "${IDE_DIST}/Evocode-${VERSION}-x86_64.AppImage"
else
  echo "WARNING: appimagetool не найден и не удалось скачать."
  echo "Папка AppDir готова в ${APPDIR}"
  echo "Вы можете собрать её вручную: appimagetool ${APPDIR}"
fi

# Clean temp directories
rm -rf "${APPDIR}"

if [[ -f "${IDE_DIST}/Evocode-${VERSION}-x86_64.AppImage" ]]; then
  echo ""
  echo "=== Готово! ==="
  echo "AppImage собран: ${IDE_DIST}/Evocode-${VERSION}-x86_64.AppImage"
fi
