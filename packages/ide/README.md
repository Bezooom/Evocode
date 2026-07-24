# packages/ide — branded shell «Эвокод»

Источник: **VSCodium** (Code-OSS без Microsoft telemetry/branding).

## Быстрый старт

```bash
# clone VSCodium + apply brand (F2.1 + F2.2)
npm run bootstrap:ide

# или по отдельности:
npm run ide:apply-brand   # product.evocode.json → vscodium/product.json
npm run ide:check-brand   # verify nameShort=Эвокод, applicationName=evocode

# Demo product surface (recommended)
npm run evocode                       # shell UI + agent + Core

# F2.3 pieces only
npm run agent:rebrand
npm run ide:preinstall-agent
npm run ide:prepare-shell
```

## Файлы

| Путь | Назначение |
|------|------------|
| `product.evocode.json` | **Source of truth** brand identity (только brand-ключи) |
| `scripts/apply-product-brand.mjs` | F2.2 merge: base ⟕ brand, empty collections не затирают base |
| `scripts/preinstall-agent.mjs` | F2.3 stage + install `evocode-agent` |
| `preinstall/` | staged agent + manifest (см. [preinstall/README](./preinstall/README.md)) |
| `vscodium/` | shallow clone (в `.gitignore`, не коммитить) |
| `vscodium/product.json` | VSCodium base + Эвокод overlay (после `ide:apply-brand`) |

## Identity (F2.2 acceptance)

| Key | Value |
|-----|--------|
| `nameShort` | `Эвокод` |
| `nameLong` | `Эвокод — AI IDE` |
| `applicationName` | `evocode` |
| `dataFolderName` | `.evocode-ide` |
| `urlProtocol` | `evocode` |
| `linuxIconName` | `evocode` |
| `darwinBundleIdentifier` | `ru.evocode.app` |

## Как устроен merge

1. Берётся upstream `vscodium/product.json` (extension API proposals, kinds, …).
2. Поверх накладывается `product.evocode.json`.
3. **Пустые** `[]` / `{}` из brand **не** затирают непустые поля base  
   (раньше shallow overwrite уничтожал `extensionEnabledApiProposals`).
4. Если proposals уже стёрты, скрипт делает `git checkout HEAD -- product.json` и мержит заново.

При сборке VSCodium (`prepare_vscode.sh`) root `product.json` мержится в `vscode/product.json`  
(`jq '.[0] * .[1]'`), поэтому brand-поля попадают в итоговый бинарник.

## Сборка / релизы

Полный продукт (не plain VSCodium):

```bash
npm run ide:package-portable   # packages/ide/dist/evocode-ide
npm run ide:package-all        # multi-OS → dist/releases/
npm run ide:productize:check
```

См. [docs/PACKAGING.md](../../docs/PACKAGING.md).

Сборка VSCodium from source — по [документации VSCodium](https://github.com/VSCodium/vscodium).  
После `prepare_vscode` / build — preinstall extension из `packages/agent-extension` (F2.3).

## Почему не microsoft/vscode напрямую

- marketplace/telemetry Microsoft
- VSCodium уже решает «чистый OSS + Open VSX»
- быстрее до брендированного бинарника

Hard-fork Microsoft — см. `plans/FORK_STRATEGY.md`.
