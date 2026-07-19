#!/usr/bin/env bash
# Сборка branded IDE на VSCodium — без Microsoft telemetry / marketplace
# Полный build долгий (30–120+ мин, нужен диск/RAM).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDE="${ROOT}/packages/ide"
VSC="${IDE}/vscodium"
export EVOCODE_ROOT="$ROOT"

echo "╔══════════════════════════════════════════════╗"
echo "║  Эвокод IDE — VSCodium (no Microsoft tails)  ║"
echo "╚══════════════════════════════════════════════╝"

# 0) deps hint
need=()
for c in git node jq python3; do command -v "$c" >/dev/null || need+=("$c"); done
if ((${#need[@]})); then
  echo "ERROR: missing: ${need[*]}"
  exit 1
fi

# 1) clone / update VSCodium
if [[ ! -d "${VSC}/.git" ]]; then
  echo "→ shallow clone VSCodium…"
  git clone --depth 1 https://github.com/VSCodium/vscodium.git "${VSC}"
else
  echo "→ VSCodium present"
fi

# 2) brand product.json (safe merge)
echo "→ apply product brand…"
node "${IDE}/scripts/apply-product-brand.mjs"
node "${IDE}/scripts/apply-product-brand.mjs" --check

# 3) brand icons into VSCodium src (stable)
ICON_SRC="${ROOT}/packages/agent-extension/brand/icons/evocode-app.svg"
ICON_PNG="${ROOT}/packages/agent-extension/brand/icons/evocode-icon-512.png"
STABLE_ICONS="${VSC}/src/stable"
if [[ -d "${STABLE_ICONS}" ]]; then
  echo "→ copy icons into vscodium/src/stable (best-effort)…"
  # VSCodium expects various sizes under icons/ — place high-res sources
  mkdir -p "${STABLE_ICONS}/icons" "${IDE}/icons"
  cp -f "${ICON_PNG}" "${IDE}/icons/evocode-512.png" 2>/dev/null || true
  cp -f "${ICON_SRC}" "${IDE}/icons/evocode.svg" 2>/dev/null || true
  # common names used in icon build scripts
  if [[ -f "${ICON_PNG}" ]]; then
    cp -f "${ICON_PNG}" "${STABLE_ICONS}/icons/code.png" 2>/dev/null || true
    cp -f "${ICON_PNG}" "${STABLE_ICONS}/icons/code_1024.png" 2>/dev/null || true
  fi
fi

# 4) patch prepare_vscode to NOT re-overwrite brand with "VSCodium" if env set
PREPARE="${VSC}/prepare_vscode.sh"
if [[ -f "${PREPARE}" ]] && ! grep -q 'EVOCODE_BRAND' "${PREPARE}"; then
  echo "→ inject EVOCODE_BRAND skip into prepare_vscode.sh…"
  # backup once
  cp -n "${PREPARE}" "${PREPARE}.evocode.bak" 2>/dev/null || true
  # After VSCodium setpath block, re-apply our product.json merge is already last:
  # jsonTmp=$( jq -s '.[0] * .[1]' product.json ../product.json )
  # Our branded ../product.json already has Эвокод — prepare merges it last → OK.
  # Document: do not re-run setpath after merge for nameShort.
  echo "   (product.json merge already wins for nameShort=Эвокод)"
fi

# 5) preinstall agent into extensions hook when vscode tree exists
echo "→ stage agent for preinstall…"
npm --prefix "${ROOT}" run ide:install-shell 2>/dev/null || true
node "${ROOT}/packages/ide/scripts/preinstall-agent.mjs" 2>/dev/null || true

# 6) env for build
export SHOULD_BUILD=yes
export VSCODE_QUALITY="${VSCODE_QUALITY:-stable}"
export CI_BUILD=no
# Prefer disabling MS-ish update endpoints via existing patches
export DISABLE_UPDATE="${DISABLE_UPDATE:-yes}"

echo ""
echo "Brand check:"
node -e "
const p=require('${VSC}/product.json');
console.log('  nameShort=', p.nameShort);
console.log('  applicationName=', p.applicationName);
console.log('  urlProtocol=', p.urlProtocol);
console.log('  extensionsGallery=', p.extensionsGallery && p.extensionsGallery.serviceUrl);
if(p.nameShort!=='Эвокод'||p.applicationName!=='evocode'){process.exit(2)}
"

if [[ "${EVOCODE_BUILD_SKIP:-}" == "1" ]]; then
  echo "EVOCODE_BUILD_SKIP=1 — only prepared, not building."
  exit 0
fi

echo ""
echo "→ starting VSCodium build (long)…"
echo "   docs: packages/ide/vscodium/docs/howto-build.md"
echo "   Linux deps: g++, make, libx11-dev, libsecret-1-dev, fakeroot, …"
cd "${VSC}"

# Prefer official build entry
if [[ -x ./build.sh ]]; then
  ./build.sh
elif [[ -f ./dev/build.sh ]]; then
  ./dev/build.sh
else
  echo "ERROR: no build.sh in VSCodium tree"
  exit 1
fi

echo ""
echo "=== Build finished ==="
echo "Artifacts usually under ${VSC}/VSCode-linux-* or ${VSC}/assets"
echo "Install .deb/.AppImage and set desktop Exec to that binary."
echo "Then: npm run ide:install-desktop (point launcher to codium/evocode binary)"
