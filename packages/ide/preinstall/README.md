# preinstall — F2.3 evocode-agent

Preinstall path for the rebranded agent so the IDE opens with sidebar **«Эвокод»**
without `code --extensionDevelopmentPath=…`.

## Commands

```bash
# Stage + install into ~/.evocode-ide/extensions (and existing editor dirs)
npm run ide:preinstall-agent

# Verify
npm run ide:verify-preinstall

# Stage only (no user install)
node packages/ide/scripts/preinstall-agent.mjs --stage

# Materialize files (for packaging; ~400MB with bin)
node packages/ide/scripts/preinstall-agent.mjs --copy

# Custom extensions dir
node packages/ide/scripts/preinstall-agent.mjs --target ~/.vscode/extensions
```

## Layout

| Path | Role |
|------|------|
| `evocode-agent/` | Staged package (package.json + dist/assets/bin) |
| `manifest.json` | Generated id/version metadata |
| `settings.default.json` | Core provider defaults |
| `product-extensions.fragment.json` | Recommendations fragment for product packaging |
| `install-record.json` | Last install paths (local, gitignored) |

## Install targets

1. **`~/.evocode-ide/extensions/`** — always (matches `dataFolderName` in product brand)
2. **`~/.vscode-oss/extensions/`**, **`~/.vscode/extensions/`** — if that editor’s data dir already exists
3. **`packages/ide/vscodium/vscode/extensions/evocode-agent`** — system extension hook when `prepare_vscode` has created the tree

## Smoke without full IDE binary

```bash
npm run ide:preinstall-agent
# ensure Core + provider
PORT=8083 npm start   # other terminal
EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:install-provider

code --extensions-dir "$HOME/.evocode-ide/extensions" /path/to/workspace
# or codium with same flag
```

Expect activity bar entry **«Эвокод»** and default model `evocode/evocode-auto`.

## VSCodium full build

After `prepare_vscode.sh` (creates `vscodium/vscode/`):

```bash
npm run ide:preinstall-agent
# hooks → vscodium/vscode/extensions/evocode-agent
```

Then build VSCodium as usual — agent ships as a system extension.

## Prerequisites

- `npm run agent:rebrand` (or `agent:f1`) — branded `packages/agent-extension/extension/`
- Built upstream: `packages/kilo-vscode/dist/extension.js` (via symlink)
