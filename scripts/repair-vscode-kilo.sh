#!/usr/bin/env bash
# Восстановить обычный VS Code + Kilo после случайной порчи Evocode-скриптами
set -euo pipefail

echo "=== Repair: VS Code + Kilo isolation ==="

# 1) Remove Evocode extension from Microsoft VS Code
rm -rf "${HOME}/.vscode/extensions/evocode.evocode-agent-"* 2>/dev/null || true
rm -rf "${HOME}/.vscode/extensions/evocode.evocode-shell-"* 2>/dev/null || true

python3 - <<'PY'
import json
from pathlib import Path
p = Path.home()/".vscode"/"extensions"/"extensions.json"
if p.exists():
    try:
        data = json.loads(p.read_text())
    except Exception:
        data = []
    if isinstance(data, list):
        new = [e for e in data if "evocode" not in str(e).lower()]
        p.write_text(json.dumps(new) + "\n")
        print(f"extensions.json: {len(data)} → {len(new)}")
obs = Path.home()/".vscode"/"extensions"/".obsolete"
if obs.exists():
    try:
        o = json.loads(obs.read_text())
        for k in list(o):
            if "evocode" in k.lower():
                del o[k]
        obs.write_text(json.dumps(o))
        print("cleaned .obsolete")
    except Exception:
        pass
print("removed evocode from ~/.vscode/extensions")
PY

# 2) Restore kilo.json from newest bak if current has evocode as default model
KILO_JSON="${HOME}/.config/kilo/kilo.json"
if [[ -f "$KILO_JSON" ]] && grep -q 'evocode/evocode-auto' "$KILO_JSON" 2>/dev/null; then
  BAK=$(ls -1t "${HOME}/.config/kilo/kilo.json.bak-"* 2>/dev/null | head -1 || true)
  if [[ -n "${BAK}" && -f "${BAK}" ]]; then
    cp -a "$KILO_JSON" "${KILO_JSON}.evocode-broken-$(date +%Y%m%d%H%M%S)"
    cp -a "$BAK" "$KILO_JSON"
    echo "restored kilo.json from $BAK"
  else
    echo "WARN: kilo.json still has evocode but no bak found"
  fi
else
  echo "kilo.json looks OK (or missing)"
fi

# 3) Remove only auth.evocode
python3 - <<'PY'
import json
from pathlib import Path
p = Path.home()/".local"/"share"/"kilo"/"auth.json"
if p.exists():
    d = json.loads(p.read_text())
    if "evocode" in d:
        del d["evocode"]
        p.write_text(json.dumps(d, indent=2) + "\n")
        print("removed auth.evocode")
    else:
        print("no auth.evocode")
PY

# 4) Move stray overlay out of kilo config
if [[ -f "${HOME}/.config/kilo/evocode-provider.json" ]]; then
  mkdir -p "${HOME}/.config/evocode"
  mv "${HOME}/.config/kilo/evocode-provider.json" "${HOME}/.config/evocode/"
  echo "moved evocode-provider.json → ~/.config/evocode/"
fi

# 5) Revert monorepo sources if present
if [[ -d /home/bezoom/kilocode/.git ]]; then
  git -C /home/bezoom/kilocode checkout -- \
    packages/kilo-vscode/src/extension.ts \
    packages/kilo-vscode/script/build.ts 2>/dev/null || true
  echo "reverted kilocode monorepo Evocode patches (if any)"
fi

echo ""
echo "Done. Reload VS Code window (Developer: Reload Window)."
echo "Evocode lives only in ~/.evocode-ide + ~/.config/evocode + npm run evocode"
echo "Do NOT run preinstall into ~/.vscode anymore."
