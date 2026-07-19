---
name: git-guardrails
description: |
  [RU] Установка хуков для блокировки опасных git-команд (push, reset --hard, clean -f, branch -D и т.п.) до их исполнения. Используй когда пользователь хочет защиту от деструктивных git-операций, добавить safety-хуки или заблокировать опасные команды.
  [EN] Set up hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset.
triggers:
  - защита git
  - git-хуки безопасности
  - блокировать опасный git
  - git safety
  - prevent destructive git
  - block git push
  - block git reset
---

# Setup Git Guardrails

Sets up a PreToolUse hook that intercepts and blocks dangerous git commands before they execute.

## What Gets Blocked

- `git push` (all variants including `--force`)
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git branch -D`
- `git checkout .` / `git restore .`

When blocked, the agent sees a message telling it that it does not have authority to access these commands.

## Steps

### 1. Ask scope

Ask the user: install for **this project only** (`.git-hooks/`) or **all projects** (`~/.git-hooks/`)?

### 2. Create the hook script

Write a bash script that checks the command and blocks if needed:

```bash
#!/bin/bash
# Block dangerous git commands
DANGEROUS=("push" "reset --hard" "clean -f" "clean -fd" "branch -D" "checkout ." "restore .")

for cmd in "${DANGEROUS[@]}"; do
    if echo "$1" | grep -q "git $cmd"; then
        echo "BLOCKED: 'git $cmd' - Agent does not have authority to execute this command."
        exit 1
    fi
done

exit 0
```

### 3. Install the hook

Copy the script to the target location and make it executable:

- **Project**: `.git-hooks/block-dangerous-git.sh`
- **Global**: `~/.git-hooks/block-dangerous-git.sh`

### 4. Add hook to configuration

Add to the appropriate configuration file (depends on the agent/IDE):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "<path-to-script>"
          }
        ]
      }
    ]
  }
}
```

### 5. Verify

Run a quick test:

```bash
echo '{"tool_input":{"command":"git push origin main"}}' | <path-to-script>
```

Should exit with code 2 and print a BLOCKED message to stderr.
