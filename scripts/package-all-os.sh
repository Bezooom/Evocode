#!/usr/bin/env bash
# package-all-os.sh — релизы Эвокод под Linux / Windows / macOS
# VSCodium portable → productize (agent + shell + Core) → archives in releases/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/packages/ide/dist"
RELEASES="${OUT}/releases"
DL="${TMPDIR:-/tmp}/evocode-codium-all-dl"
VERSION="$(node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo "1.0.0")"
# FORCE=1 — пересобрать даже если архив уже есть
FORCE="${FORCE:-0}"

mkdir -p "$OUT" "$RELEASES" "$DL"
cd "$DL"

echo "=== Сборка релизов Эвокод v${VERSION} для всех ОС ==="
echo "    (полный продукт: IDE + agent + shell + Core, не plain VSCodium)"

# Убедиться, что Core собран и agent rebranded
if [[ ! -f "${ROOT}/dist/index.js" ]]; then
  echo "→ npm run build…"
  (cd "$ROOT" && npm run build)
fi
if [[ ! -f "${ROOT}/packages/agent-extension/extension/dist/extension.js" ]]; then
  echo "→ npm run agent:rebrand…"
  (cd "$ROOT" && npm run agent:rebrand)
fi

is_product_archive() {
  local archive="$1"
  local ext="$2"
  local listing
  if [[ "${ext}" == "tar.gz" ]]; then
    listing="$(tar -tzf "${archive}" 2>/dev/null || true)"
  else
    listing="$(unzip -l "${archive}" 2>/dev/null || true)"
  fi
  echo "${listing}" | grep -q 'EVOCODE-PRODUCT.txt' || return 1
  echo "${listing}" | grep -q 'extensions/evocode-agent' || return 1
  echo "${listing}" | grep -q 'core/dist/index.js' || return 1
  return 0
}

package_platform() {
  local platform="$1"      # e.g. linux-x64, win32-x64, darwin-x64, darwin-arm64
  local ext="$2"           # tar.gz or zip
  local pattern="$3"       # gh download pattern
  local package_name="evocode-${platform}-${VERSION}.${ext}"
  local dest_archive="${RELEASES}/${package_name}"
  local extra_flags=()

  if [[ -f "${dest_archive}" && "${FORCE}" != "1" ]]; then
    if is_product_archive "${dest_archive}" "${ext}"; then
      echo "→ Релиз для ${platform} уже полный: ${dest_archive}. Пропуск (FORCE=1 чтобы пересобрать)."
      return 0
    fi
    echo "→ Архив ${package_name} найден, но это не полный продукт (plain VSCodium / partial). Пересборка…"
    rm -f "${dest_archive}"
  elif [[ -f "${dest_archive}" && "${FORCE}" == "1" ]]; then
    echo "→ FORCE=1: пересборка ${package_name}"
    rm -f "${dest_archive}"
  fi

  echo ""
  echo "--- Сборка: ${platform} (${ext}) ---"

  # 1. Скачиваем upstream VSCodium
  if ! ls ${pattern} 1>/dev/null 2>&1; then
    echo "→ Скачивание VSCodium для ${platform}…"
    gh release download --repo VSCodium/vscodium --pattern "${pattern}" --clobber
  fi
  local archive
  archive=$(ls -1 ${pattern} | head -1)
  echo "→ Используется архив: ${archive}"

  # 2. Распаковываем
  local extract_dir="${DL}/extract_${platform}"
  rm -rf "${extract_dir}"
  mkdir -p "${extract_dir}"

  echo "→ Распаковка…"
  if [[ "${ext}" == "tar.gz" ]]; then
    tar -xzf "${archive}" -C "${extract_dir}"
  else
    unzip -q "${archive}" -d "${extract_dir}"
  fi

  # 3. Полный productize: brand + agent + shell + Core
  # node_modules только для linux-x64 (нативные модули с хоста Linux)
  if [[ "${platform}" != "linux-x64" ]]; then
    extra_flags+=(--no-node-modules)
  fi
  echo "→ Productize (Эвокод agent/shell/Core)…"
  node "${ROOT}/packages/ide/scripts/productize-portable-tree.mjs" "${extract_dir}" "${extra_flags[@]+"${extra_flags[@]}"}"

  # 4. Проверка
  node "${ROOT}/packages/ide/scripts/productize-portable-tree.mjs" "${extract_dir}" --check

  # 5. Запаковываем
  echo "→ Создание финального архива ${package_name}…"
  rm -f "${dest_archive}"

  cd "${extract_dir}"
  if [[ "${ext}" == "tar.gz" ]]; then
    tar -czf "${dest_archive}" .
  else
    zip -q -r "${dest_archive}" .
  fi
  cd "$DL"

  rm -rf "${extract_dir}"
  echo "✅ Готово: ${dest_archive} ($(du -h "${dest_archive}" | cut -f1))"
}

# Сборка для всех платформ
package_platform "linux-x64" "tar.gz" "VSCodium-linux-x64-*.tar.gz"
package_platform "win32-x64" "zip" "VSCodium-win32-x64-*.zip"
package_platform "darwin-x64" "zip" "VSCodium-darwin-x64-*.zip"
package_platform "darwin-arm64" "zip" "VSCodium-darwin-arm64-*.zip"

echo ""
ls -lh "${RELEASES}"

echo ""
echo "=== Все релизы в ${RELEASES} ==="
LINUX_ARC="${RELEASES}/evocode-linux-x64-${VERSION}.tar.gz"
if [[ -f "${LINUX_ARC}" ]]; then
  echo "→ Маркеры продукта в linux-архиве:"
  tar -tzf "${LINUX_ARC}" | grep -E 'EVOCODE-PRODUCT|extensions/evocode-agent/package.json|extensions/evocode-shell/package.json|core/dist/index.js' || {
    echo "WARNING: linux-архив без маркеров полного продукта"
    exit 1
  }
fi
