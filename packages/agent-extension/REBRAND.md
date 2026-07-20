# Evocode Agent Extension (fork of kilo-vscode)

## Upstream
- Path: `$HOME/kilocode/packages/kilo-vscode`
- Symlink: `packages/agent-extension/upstream`

## Rebrand checklist
1. `package.json`: name `evocode-agent`, displayName «Эвокод», publisher `evocode`
2. Default OpenAI-compatible base URL: `http://127.0.0.1:8081/v1`
3. Model id: `evocode-auto` (router inside Core)
4. Skills paths: `~/.config/evocode/skills` (+ import from `~/.config/kilo/skills`)
5. Icons / colors per `specs/DESIGN_SYSTEM.md`
6. Disable Kilo cloud account requirement for local-only mode

## Dev launch (from kilocode monorepo)
```bash
cd $HOME/kilocode
bun run extension
# or packages/kilo-vscode script/launch.ts
```

## Wire Core
```bash
cd /path/to/Evocode
npm run build && npm start
# Extension provider baseURL = http://127.0.0.1:8081/v1
```
