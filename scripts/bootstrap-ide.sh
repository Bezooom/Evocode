#!/usr/bin/env bash
# Bootstrap branded IDE shell (VSCodium) for Эвокод
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDE_DIR="${ROOT}/packages/ide"
VSCODIUM_DIR="${IDE_DIR}/vscodium"
PRODUCT_BRAND="${IDE_DIR}/product.evocode.json"
BRANCH="${VSCODIUM_BRANCH:-master}"

mkdir -p "${IDE_DIR}"

echo "=== Эвокод: bootstrap IDE (VSCodium) ==="
echo "Target: ${VSCODIUM_DIR}"
echo "Disk note: clone is large — using storage path under Evocode/packages"

if [[ -d "${VSCODIUM_DIR}/.git" ]]; then
  echo "VSCodium already cloned. Fetching..."
  git -C "${VSCODIUM_DIR}" fetch --depth 1 origin "${BRANCH}" || true
else
  echo "Shallow clone VSCodium..."
  git clone --depth 1 --branch "${BRANCH}" \
    https://github.com/VSCodium/vscodium.git \
    "${VSCODIUM_DIR}"
fi

if [[ ! -f "${PRODUCT_BRAND}" ]]; then
  echo "ERROR: brand file missing: ${PRODUCT_BRAND}"
  exit 1
fi

echo "Brand source of truth: ${PRODUCT_BRAND}"

# F2.2 — merge brand into VSCodium product.json (preserves API proposals)
node "${IDE_DIR}/scripts/apply-product-brand.mjs"
node "${IDE_DIR}/scripts/apply-product-brand.mjs" --check

echo ""
echo "Next steps:"
echo "  1) npm run ide:apply-brand          # re-apply after git checkout of vscodium"
echo "  2) npm run ide:check-brand          # verify identity"
echo "  3) npm run ide:preinstall-agent     # F2.3 stage+install evocode-agent"
echo "  4) npm run ide:verify-preinstall"
echo "  5) cd packages/ide/vscodium && follow VSCodium build docs"
echo "  6) Point agent default provider to http://127.0.0.1:8083/v1"
echo ""
echo "See plans/FORK_STRATEGY.md · plans/FULL_DEV_ROADMAP.md § F2"
