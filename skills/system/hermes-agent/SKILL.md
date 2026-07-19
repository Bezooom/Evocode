---
name: hermes-agent
description: |
  Разработка и поддержка Hermes Agent — AI-ассистента для программирования с поддержкой CLI, Telegram, Slack и других платформ.
  Использует Python с SQLite (FTS5), поддерживает инструментыterminal, браузер, web search, code execution.
---

# Skill: Hermes Agent Development

This skill provides guidance for developing and maintaining the Hermes Agent codebase.

## When to Use This Skill

Use this skill when:
- Working with Hermes Agent codebase (Python CLI-ассистент)
- Need to add new tools или изменить существующие
- Настройка интеграций с Telegram, Slack, Discord
- Работа с системой слэш-команд
- Конфигурация модели и провайдеров

## Project Structure

```
hermes-agent/
├── run_agent.py          # AIAgent class — core conversation loop
├── model_tools.py        # Tool orchestration, _discover_tools(), handle_function_call()
├── toolsets.py           # Toolset definitions
├── cli.py                # HermesCLI class — interactive CLI orchestrator
├── hermes_state.py       # SessionDB — SQLite session store (FTS5 search)
├── hermes_cli/           # CLI subcommands and setup
│   ├── main.py           # Entry point — all `hermes` subcommands
│   ├── config.py         # DEFAULT_CONFIG, OPTIONAL_ENV_VARS
│   ├── commands.py       # Slash command definitions
│   ├── callbacks.py      # Terminal callbacks
│   └── skin_engine.py    # CLI visual customization
├── agent/                # Agent internals
│   ├── prompt_builder.py     # System prompt assembly
│   ├── context_compressor.py # Auto context compression
│   └── display.py            # KawaiiSpinner, tool preview
├── tools/                # Tool implementations
│   ├── registry.py       # Central tool registry
│   ├── terminal_tool.py  # Terminal orchestration
│   ├── file_tools.py     # File read/write/search/patch
│   ├── web_tools.py      # Web search/extract
│   ├── browser_tool.py   # Browser automation
│   └── code_execution_tool.py # Code sandbox
├── gateway/              # Messaging platform gateway
│   ├── run.py            # Main loop, slash commands
│   └── platforms/        # Adapters: telegram, discord, slack, whatsapp
└── skills/               # Built-in skills (apple, devops, github, etc.)
```

**User config:** `~/.hermes/config.yaml` (settings), `~/.hermes/.env` (API keys)

## Development Environment

```bash
source venv/bin/activate  # ALWAYS activate before running Python
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `python run_agent.py` | Запуск агента |
| `python cli.py` | Интерактивный CLI |
| `python -m pytest tests/` | Запуск тестов |
| `hermes setup` | Интерактивная настройка |

## Adding New Tools

Requires changes in **3 files**:

**1. Create `tools/your_tool.py`:**
```python
import json, os
from tools.registry import registry

def check_requirements() -> bool:
    return bool(os.getenv("EXAMPLE_API_KEY"))

def example_tool(param: str, task_id: str = None) -> str:
    return json.dumps({"success": True, "data": "..."})

registry.register(
    name="example_tool",
    toolset="example",
    schema={"name": "example_tool", "description": "...", "parameters": {...}},
    handler=example_tool,
    check_requirements=check_requirements,
)
```

**2. Add to toolset в `toolsets.py`:**
```python
{"name": "example", "label": "Example Toolset", ...}
```

**3. Import и register в `model_tools.py`:**
```python
from tools.your_tool import example_tool
```

## Adding Slash Commands

1. Add `CommandDef` to `hermes_cli/commands.py`:
```python
CommandDef("mycommand", "Description", "Session", aliases=("mc",), args_hint="[arg]")
```

2. Add handler in `cli.py`:
```python
elif canonical == "mycommand":
    self._handle_mycommand(cmd_original)
```

3. For gateway: add handler in `gateway/run.py`

## File Dependency Chain

```
tools/registry.py  (no deps — imported by all tool files)
       ↑
tools/*.py  (each calls registry.register() at import time)
       ↑
model_tools.py  (imports tools/registry + triggers tool discovery)
       ↑
run_agent.py, cli.py, batch_runner.py
```
