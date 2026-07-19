# Изоляция Эвокод ↔ обычный VS Code / Kilo

## Что сломалось

Скрипты Evocode:

1. Ставили `evocode.evocode-agent` в **`~/.vscode/extensions`**
2. Переписывали **`~/.config/kilo/kilo.json`** (model → evocode, disabled kilo)
3. Патчили monorepo **`kilocode/.../extension.ts`**

Из‑за этого обычный VS Code + Kilo Code «подхватывали» Эвокод.

## Как починить (уже можно)

```bash
cd /home/bezoom/storage/Projects/Evocode
bash scripts/repair-vscode-kilo.sh
# в VS Code: Developer: Reload Window
```

Проверка:

- `ls ~/.vscode/extensions | grep evocode` → пусто  
- `jq .model ~/.config/kilo/kilo.json` → снова ваш omniroute/gemini (или что было в bak)  
- Kilo Code в VS Code — без эвокод-провайдера по умолчанию  

## Правила изоляции (после фикса)

| Зона | Эвокод | Обычный VS Code + Kilo |
|------|--------|-------------------------|
| Extensions | `~/.evocode-ide/extensions` | `~/.vscode/extensions` |
| User data | `~/.evocode-ide` | `~/.config/Code` |
| Agent config | `KILO_CONFIG_DIR=~/.config/evocode/kilo` | `~/.config/kilo` |
| Agent data | `KILO_DATA_DIR=~/.local/share/evocode` | `~/.local/share/kilo` |
| Запуск | `npm run evocode` | `code` + Kilo marketplace |

`install-provider` **по умолчанию не трогает** `~/.config/kilo`.  
Только `EVOCODE_TOUCH_KILO=1` (не использовать без нужды).

`preinstall-agent` **по умолчанию только** `~/.evocode-ide/extensions`.

## Если Kilo всё ещё странный

1. Отключить extension `evocode` если видите в списке  
2. Восстановить `kilo.json` из `kilo.json.bak-*`  
3. Переустановить Kilo Code из marketplace (если monorepo dist кастомный)  
4. `git -C ~/kilocode checkout -- packages/kilo-vscode`  

## Если обычный VS Code называется «Эвокод»

Частая причина: открыта **папка проекта** `Evocode/` с workspace-настройкой  
`window.title = "Эвокод — …"` (раньше писалась rebrand-скриптом в `.vscode/settings.json`).

Это **не** системный rename VS Code — только title bar для этого workspace.

**Исправление:**

1. В репо уже убрано branding из `.vscode/settings.json`  
2. `bash scripts/repair-vscode-kilo.sh`  
3. **Developer: Reload Window** или закрой папку Evocode / открой другую  

Product brand (`window.title` Эвокод) живёт **только** в `~/.evocode-ide` (launcher `npm run evocode`).

**Не путать:**

| Окно | Как запускать | Title |
|------|----------------|-------|
| Visual Studio Code | `code` / иконка Code | Visual Studio Code / имя папки |
| Эвокод | `npm run evocode` / ярлык Эвокод | Эвокод — … |
