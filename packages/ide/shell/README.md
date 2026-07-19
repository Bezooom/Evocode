# Эвокод Shell — demo product surface

Цель: **не** «переименованный Kilo», а ощущение AI-IDE:

- компактный тёмный UI (ближе к Antigravity / Cursor density);
- agent **справа**, activity bar сверху;
- **Core always-on** + status bar;
- **один вход:** `npm run evocode`.

## Состав

| Путь | Роль |
|------|------|
| `settings.json` | Antigravity-like defaults |
| `keybindings.json` | `Ctrl+L` → агент |
| `extension/` | `evocode-shell` — Core sidecar, focus agent, welcome |
| `../scripts/prepare-shell-profile.mjs` | пишет `~/.evocode-ide` |

## Запуск

```bash
# опционально local LLM
/home/bezoom/start_ik_ai_coder.sh

cd /home/bezoom/storage/Projects/Evocode
npm run evocode
# или: npm run demo
# workspace: npm run evocode -- /path/to/project
```

Откроется VS Code/Cursor с:

- `--user-data-dir ~/.evocode-ide`
- `--extensions-dir ~/.evocode-ide/extensions`
- extensions: **evocode-shell** + **evocode-agent**

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+L` | Панель агента «Эвокод» |
| `Ctrl+Shift+L` | New task |
| `Ctrl+;` | Toggle sidebar |

## Команды Command Palette

- `Эвокод: Фокус на агенте`
- `Эвокод: Проверить / запустить Core`
- `Эвокод: Статус Эвокод`

## Что ещё не «полный Cursor»

- Нет hard-fork workbench (свой layout engine).
- Command IDs агента всё ещё `kilo-code.*` (F2.6).
- Полный AppImage «Эвокод» — F2.5.
- Визуальный rebrand webview Kilo (иконки/цвета внутри чата) — следующий UX-проход.
