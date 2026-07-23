#!/usr/bin/env bash
# package-all-os.sh - Сборка релизов Эвокод под все ОС (Linux, Windows, macOS x64/arm64)
# Скачивает VSCodium portable -> ре брендирует -> пакует обратно в releases/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/packages/ide/dist"
RELEASES="${OUT}/releases"
DL="${TMPDIR:-/tmp}/evocode-codium-all-dl"

mkdir -p "$OUT" "$RELEASES" "$DL"
cd "$DL"

VERSION="1.0.0"

echo "=== Сборка релизов Эвокод v${VERSION} для всех ОС ==="

# Функция для сборки конкретной платформы
package_platform() {
  local platform="$1"      # e.g. linux-x64, win32-x64, darwin-x64, darwin-arm64
  local ext="$2"           # tar.gz or zip
  local pattern="$3"       # gh download pattern
  local package_name="evocode-${platform}-${VERSION}.${ext}"
  local dest_archive="${RELEASES}/${package_name}"

  if [ -f "${dest_archive}" ]; then
    echo "→ Релиз для ${platform} уже существует: ${dest_archive}. Пропуск."
    return 0
  fi

  echo ""
  echo "--- Сборка: ${platform} (${ext}) ---"

  # 1. Скачиваем
  if ! ls ${pattern} 1>/dev/null 2>&1; then
    echo "→ Скачивание VSCodium для ${platform}..."
    gh release download --repo VSCodium/vscodium --pattern "${pattern}" --clobber
  fi
  local archive
  archive=$(ls -1 ${pattern} | head -1)
  echo "→ Используется архив: ${archive}"

  # 2. Распаковываем
  local extract_dir="${DL}/extract_${platform}"
  rm -rf "${extract_dir}"
  mkdir -p "${extract_dir}"

  echo "→ Распаковка..."
  if [ "${ext}" = "tar.gz" ]; then
    tar -xzf "${archive}" -C "${extract_dir}"
  else
    unzip -q "${archive}" -d "${extract_dir}"
  fi

  # 3. Ребрендинг
  echo "→ Применение брендинга Эвокод..."
  node "${ROOT}/packages/ide/scripts/rebrand-portable-codium.mjs" "${extract_dir}"

  # 4. Запаковываем обратно
  echo "→ Создание финального архива ${package_name}..."
  local dest_archive="${RELEASES}/${package_name}"
  rm -f "${dest_archive}"

  cd "${extract_dir}"
  if [ "${ext}" = "tar.gz" ]; then
    tar -czf "${dest_archive}" *
  else
    zip -q -r "${dest_archive}" *
  fi
  cd "$DL"

  # Очистка
  rm -rf "${extract_dir}"
  echo "✅ Готово: ${dest_archive}"
}

# Сборка для всех платформ
package_platform "linux-x64" "tar.gz" "VSCodium-linux-x64-*.tar.gz"
package_platform "win32-x64" "zip" "VSCodium-win32-x64-*.zip"
package_platform "darwin-x64" "zip" "VSCodium-darwin-x64-*.zip"
package_platform "darwin-arm64" "zip" "VSCodium-darwin-arm64-*.zip"

echo ""
# Вывод списка собранных файлов
ls -lh "${RELEASES}"

echo ""
echo "=== Все релизы успешно собраны в ${RELEASES} ==="
