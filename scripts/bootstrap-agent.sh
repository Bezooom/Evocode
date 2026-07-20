#!/usr/bin/env bash
# Link / vendor kilo-vscode as Evocode agent extension base
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="${ROOT}/packages/agent-extension"
KILO_DEFAULT="/home/bezoom/kilocode/packages/kilo-vscode"
KILO_SRC="${KILO_SRC:-$KILO_DEFAULT}"

mkdir -p "${ROOT}/packages"

echo "=== Эвокод: bootstrap agent (kilo-vscode fork base) ==="

if [[ ! -d "${KILO_SRC}" ]]; then
  echo "ERROR: kilo-vscode not found at ${KILO_SRC}"
  echo "Set KILO_SRC=/path/to/kilocode/packages/kilo-vscode"
  exit 1
fi

mkdir -p "${PKG}"

# Marker + rebrand notes (we do not copy 8GB monorepo — symlink sources)
if [[ ! -e "${PKG}/upstream" ]]; then
  ln -sfn "${KILO_SRC}" "${PKG}/upstream"
  echo "Linked upstream -> ${KILO_SRC}"
fi

cat > "${PKG}/REBRAND.md" <<EOF
# Evocode Agent Extension (fork of kilo-vscode)

## Upstream
- Path: \`${KILO_SRC}\`
- Symlink: \`packages/agent-extension/upstream\`

## Rebrand checklist
1. \`package.json\`: name \`evocode-agent\`, displayName «Эвокод», publisher \`evocode\`
2. Default OpenAI-compatible base URL: \`http://127.0.0.1:8083/v1\`
3. Model id: \`evocode-auto\` (router inside Core)
4. Skills paths: \`~/.config/evocode/skills\` (+ import from \`~/.config/kilo/skills\`)
5. Icons / colors per \`specs/DESIGN_SYSTEM.md\`
6. Disable Kilo cloud account requirement for local-only mode

## Dev launch (from kilocode monorepo)
\`\`\`bash
cd /home/bezoom/kilocode
bun run extension
# or packages/kilo-vscode script/launch.ts
\`\`\`

## Wire Core
\`\`\`bash
cd ${ROOT}
npm run build && npm start
# Extension provider baseURL = http://127.0.0.1:8083/v1
\`\`\`
EOF

# Default provider snippet for users
mkdir -p "${PKG}/config"
cat > "${PKG}/config/evocode-provider.example.json" <<'EOF'
{
  "evocode.provider": {
    "type": "openai-compatible",
    "baseUrl": "http://127.0.0.1:8083/v1",
    "apiKey": "evocode-local",
    "model": "evocode-auto",
    "name": "Эвокод (local+router)"
  },
  "evocode.skills.paths": [
    "~/.config/evocode/skills/system",
    "~/.config/evocode/skills/user"
  ]
}
EOF

echo "Wrote ${PKG}/REBRAND.md and provider example"
echo ""
echo "Next (F1):"
echo "  npm run agent:rebrand"
echo "  npm run agent:install-provider"
echo "  npm run agent:launch"
echo "Or all-in-one: npm run agent:f1"
echo "Done. Agent base is ready for rebrand work."
