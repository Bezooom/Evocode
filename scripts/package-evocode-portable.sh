#!/usr/bin/env bash
# F2.5: download VSCodium portable → full Эвокод product → packages/ide/dist/evocode-ide
# Full compile still: npm run ide:build-codium (needs libsecret-dev etc.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/packages/ide/dist"
DL="${TMPDIR:-/tmp}/evocode-codium-dl"
mkdir -p "$OUT" "$DL"
cd "$DL"

echo "=== Эвокод portable package (full product: brand + agent + shell + Core) ==="

if [[ ! -f "${ROOT}/dist/index.js" ]]; then
  echo "→ npm run build…"
  (cd "$ROOT" && npm run build)
fi
if [[ ! -f "${ROOT}/packages/agent-extension/extension/dist/extension.js" ]]; then
  echo "→ npm run agent:rebrand…"
  (cd "$ROOT" && npm run agent:rebrand)
fi

if ! ls VSCodium-linux-x64-*.tar.gz 1>/dev/null 2>&1; then
  echo "→ download latest VSCodium linux x64…"
  gh release download --repo VSCodium/vscodium --pattern 'VSCodium-linux-x64-*.tar.gz' --clobber
fi
TAR=$(ls -1 VSCodium-linux-x64-*.tar.gz | head -1)
echo "→ extract $TAR"
rm -rf "$OUT/evocode-ide" "$OUT/_extract"
mkdir -p "$OUT/_extract"
tar -xzf "$TAR" -C "$OUT/_extract"
# VSCodium tarballs extract files at top level of the archive
mv "$OUT/_extract" "$OUT/evocode-ide"

echo "→ productize (rebrand + agent + shell + Core)…"
node "${ROOT}/packages/ide/scripts/productize-portable-tree.mjs" "$OUT/evocode-ide"
node "${ROOT}/packages/ide/scripts/productize-portable-tree.mjs" "$OUT/evocode-ide" --check

echo ""
echo "OK: ${OUT}/evocode-ide"
echo "    launcher: ${OUT}/evocode-ide/bin/evocode"
echo "    product:  ${OUT}/evocode-ide/EVOCODE-PRODUCT.txt"
if [[ -x "${OUT}/evocode-ide/bin/evocode" ]]; then
  "${OUT}/evocode-ide/bin/codium" --version 2>/dev/null | head -3 || true
fi
echo ""
echo "Launch: npm run evocode"
echo "Or:     ${OUT}/evocode-ide/bin/evocode"
