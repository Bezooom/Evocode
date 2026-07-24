# Упаковка и релизы Эвокод

**Версия:** см. `package.json`  
**Цель:** дистрибутив = **полный продукт** (IDE brand + agent + shell + Core), а не plain VSCodium.

---

## Артефакты

| Команда | Результат |
|---------|-----------|
| `npm run ide:package-portable` | `packages/ide/dist/evocode-ide/` (Linux portable) |
| `npm run ide:package-all` | `packages/ide/dist/releases/evocode-{linux-x64,win32-x64,darwin-x64,darwin-arm64}-VERSION.*` |
| `npm run ide:package-deb` | `packages/ide/dist/evocode_VERSION_amd64.deb` (нужен portable) |
| `npm run ide:package-appimage` | `packages/ide/dist/Evocode-VERSION-x86_64.AppImage` |

Версия берётся из `package.json` (скрипты deb/AppImage/all-os).

### Содержимое полного portable

```
evocode-ide/   (или корень zip/tar)
  EVOCODE-PRODUCT.txt
  bin/evocode                 # isolated profile + EVOCODE_ROOT
  core/                       # dist + skills + package.json [+ node_modules на Linux]
  resources/app/
    product.json              # nameShort=Эвокод
    extensions/evocode-agent/
    extensions/evocode-shell/
```

Проверка:

```bash
npm run ide:productize:check
# или
tar -tzf packages/ide/dist/releases/evocode-linux-x64-*.tar.gz | grep -E 'EVOCODE-PRODUCT|evocode-agent|core/dist/index'
```

---

## Pipeline

```
VSCodium upstream archive
        │
        ▼
 rebrand-portable-codium.mjs     # brand, icons, binary names
        │
        ▼
 productize-portable-tree.mjs    # agent + shell + Core + launchers
        │
        ├── ide:package-portable → dist/evocode-ide
        ├── ide:package-all      → dist/releases/*
        ├── ide:package-deb      → .deb (from portable + core)
        └── ide:package-appimage → AppImage
```

### Принудительная пересборка multi-OS

```bash
FORCE=1 TMPDIR=/path/with/space npm run ide:package-all
```

Неполные архивы (без `EVOCODE-PRODUCT.txt` / agent / core) пересобираются автоматически.

### Кросс-ОС node_modules

- **linux-x64:** в `core/` копируются host `node_modules` (native addons).
- **win/mac:** только `dist` + `skills` + `package.json`; на целевой машине:  
  `cd core && npm ci --omit=dev`  
  (Core sidecar стартует через system `node`, см. shell extension).

---

## Prerequisites

```bash
npm ci && npm run build
npm run agent:rebrand          # packages/agent-extension/extension/dist
# gh auth login               # для download VSCodium
```

Опционально: `gh` CLI для `gh release download --repo VSCodium/vscodium`.

---

## Smoke

```bash
npm run test:smoke             # brand + agent + shell + Core + health/DLP
```

---

## Установка (кратко)

**Linux tar.gz**

```bash
tar -xzf evocode-linux-x64-VERSION.tar.gz -C ~/Evocode
~/Evocode/bin/evocode
```

**deb**

```bash
sudo dpkg -i packages/ide/dist/evocode_VERSION_amd64.deb
sudo apt-get install -f   # если нужно
evocode
```

**Windows:** распаковать zip → `Evocode.exe` или `evocode.cmd`.  
**macOS:** распаковать → `Evocode.app`; CLI: `Contents/MacOS/evocode-cli`.

---

## Связанные файлы

| Путь | Роль |
|------|------|
| `scripts/package-all-os.sh` | multi-OS archives |
| `scripts/package-evocode-portable.sh` | Linux portable |
| `packages/ide/scripts/productize-portable-tree.mjs` | full product inject |
| `packages/ide/scripts/rebrand-portable-codium.mjs` | brand only |
| `packages/ide/dist/README.md` | layout notes |
| [HARDWARE_PROFILES.md](../plans/HARDWARE_PROFILES.md) | model stack / download API |
