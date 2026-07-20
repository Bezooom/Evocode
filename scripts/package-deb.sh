#!/usr/bin/env bash
# F2.5: Build Debian package (.deb) from rebranded VSCodium portable tree
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDE_DIST="${ROOT}/packages/ide/dist"
PORTABLE_DIR="${IDE_DIST}/evocode-ide"
DEB_BUILD_DIR="${IDE_DIST}/deb-build"
VERSION="0.95.0"
DEB_PACKAGE_DIR="${DEB_BUILD_DIR}/evocode_${VERSION}_amd64"

echo "=== Сборка deb-пакета Эвокод ==="

if [[ ! -d "${PORTABLE_DIR}" ]]; then
  echo "ERROR: Портативная сборка не найдена в ${PORTABLE_DIR}"
  echo "Сначала запустите: npm run ide:package-portable"
  exit 1
fi

# Clean previous build dirs
rm -rf "${DEB_BUILD_DIR}"
mkdir -p "${DEB_PACKAGE_DIR}/DEBIAN"
mkdir -p "${DEB_PACKAGE_DIR}/usr/bin"
mkdir -p "${DEB_PACKAGE_DIR}/usr/share/evocode"
mkdir -p "${DEB_PACKAGE_DIR}/usr/share/applications"
mkdir -p "${DEB_PACKAGE_DIR}/usr/share/icons/hicolor/256x256/apps"

mkdir -p "${DEB_PACKAGE_DIR}/usr/share/pixmaps"

echo "→ Копирование файлов приложения..."
cp -R "${PORTABLE_DIR}"/* "${DEB_PACKAGE_DIR}/usr/share/evocode/"

echo "→ Копирование файлов Core сервера..."
mkdir -p "${DEB_PACKAGE_DIR}/usr/share/evocode/core"
cp -R "${ROOT}/dist" "${DEB_PACKAGE_DIR}/usr/share/evocode/core/"
cp -R "${ROOT}/skills" "${DEB_PACKAGE_DIR}/usr/share/evocode/core/"
cp "${ROOT}/package.json" "${DEB_PACKAGE_DIR}/usr/share/evocode/core/"
cp -R "${ROOT}/node_modules" "${DEB_PACKAGE_DIR}/usr/share/evocode/core/"

echo "→ Создание исполняемого файла /usr/bin/evocode..."
# Isolated profile + agent env (never stock ~/.config/Code or ~/.config/kilo)
cat > "${DEB_PACKAGE_DIR}/usr/bin/evocode" <<'EOF'
#!/usr/bin/env bash
# Эвокод (system package) — branded VSCodium + isolated profile
set -euo pipefail
export EVOCODE_CONFIG_DIR="${EVOCODE_CONFIG_DIR:-${KILO_CONFIG_DIR:-$HOME/.config/evocode/agent}}"
export EVOCODE_DATA_DIR="${EVOCODE_DATA_DIR:-${KILO_DATA_DIR:-$HOME/.local/share/evocode}}"
export KILO_CONFIG_DIR="${KILO_CONFIG_DIR:-$EVOCODE_CONFIG_DIR}"
export KILO_DATA_DIR="${KILO_DATA_DIR:-$EVOCODE_DATA_DIR}"
export EVOCODE_USER_DATA_DIR="${EVOCODE_USER_DATA_DIR:-$HOME/.evocode-ide}"
export EVOCODE_EXTENSIONS_DIR="${EVOCODE_EXTENSIONS_DIR:-$EVOCODE_USER_DATA_DIR/extensions}"
mkdir -p "$EVOCODE_USER_DATA_DIR" "$EVOCODE_EXTENSIONS_DIR" "$EVOCODE_CONFIG_DIR" "$EVOCODE_DATA_DIR"
# --flag=value form: Electron must not treat the next token as a path value
exec /usr/share/evocode/bin/evocode \
  --user-data-dir="$EVOCODE_USER_DATA_DIR" \
  --extensions-dir="$EVOCODE_EXTENSIONS_DIR" \
  --disable-workspace-trust \
  "$@"
EOF
chmod +x "${DEB_PACKAGE_DIR}/usr/bin/evocode"

echo "→ Создание ярлыка evocode.desktop..."
cat > "${DEB_PACKAGE_DIR}/usr/share/applications/evocode.desktop" <<EOF
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
Actions=new-window;

[Desktop Action new-window]
Name=Новое окно
Exec=evocode
EOF

echo "→ Копирование иконки приложения..."
ICON_SRC="${ROOT}/packages/agent-extension/brand/icons/evocode-icon-256.png"
if [[ -f "${ICON_SRC}" ]]; then
  cp "${ICON_SRC}" "${DEB_PACKAGE_DIR}/usr/share/icons/hicolor/256x256/apps/evocode.png"
  cp "${ICON_SRC}" "${DEB_PACKAGE_DIR}/usr/share/pixmaps/evocode.png"
else
  echo "WARNING: Иконка ${ICON_SRC} не найдена"
fi

echo "→ Создание файла управления (control)..."
# Get size in KB
SIZE_KB=$(du -s "${DEB_PACKAGE_DIR}/usr" | cut -f1)

cat > "${DEB_PACKAGE_DIR}/DEBIAN/control" <<EOF
Package: evocode
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: amd64
Installed-Size: ${SIZE_KB}
Depends: libnss3, libatk1.0-0, libatk-bridge2.0-0, libcups2, libdrm2, libgtk-3-0, libgbm1, libasound2
Maintainer: bezoom <bezoom@evocode.ru>
Description: Evocode AI IDE
 Evocode is a privacy-first AI-IDE based on VSCodium.
 Built-in agent, local LLM router, and DLP guard.
EOF

echo "→ Сборка deb-пакета..."
dpkg-deb --build "${DEB_PACKAGE_DIR}" "${IDE_DIST}/evocode_${VERSION}_amd64.deb"

echo "→ Очистка временных файлов сборщика..."
rm -rf "${DEB_BUILD_DIR}"

echo ""
echo "=== Готово! ==="
echo "Пакет собран: ${IDE_DIST}/evocode_${VERSION}_amd64.deb"
echo "Установка: sudo dpkg -i packages/ide/dist/evocode_${VERSION}_amd64.deb"
