#!/usr/bin/env bash
# F2.5 pragmatic: download VSCodium portable → rebrand → packages/ide/dist/evocode-ide
# Full compile still: npm run ide:build-codium (needs libsecret-dev etc.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/packages/ide/dist"
DL="${TMPDIR:-/tmp}/evocode-codium-dl"
mkdir -p "$OUT" "$DL"
cd "$DL"

echo "=== Эвокод portable package (VSCodium rebrand) ==="

if ! ls VSCodium-linux-x64-*.tar.gz 1>/dev/null 2>&1; then
  echo "→ download latest VSCodium linux x64…"
  gh release download --repo VSCodium/vscodium --pattern 'VSCodium-linux-x64-*.tar.gz' --clobber
fi
TAR=$(ls -1 VSCodium-linux-x64-*.tar.gz | head -1)
echo "→ extract $TAR"
rm -rf "$OUT/evocode-ide" "$OUT/_extract"
mkdir -p "$OUT/_extract"
tar -xzf "$TAR" -C "$OUT/_extract"
mv "$OUT/_extract" "$OUT/evocode-ide"

echo "→ rebrand…"
node "${ROOT}/packages/ide/scripts/rebrand-portable-codium.mjs" "$OUT/evocode-ide"

# optional: pre-seed extensions into portable? keep using ~/.evocode-ide

echo ""
echo "OK: ${OUT}/evocode-ide/bin/evocode"
"${OUT}/evocode-ide/bin/evocode" --version | head -3
echo ""
echo "Launch: npm run evocode"
echo "Or:     ${OUT}/evocode-ide/bin/evocode --user-data-dir \$HOME/.evocode-ide"
