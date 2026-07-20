# packages/agent-extension — Эвокод Agent (F1)

Форк-слой над **kilo-vscode**: rebrand «Эвокод» + default provider → **Evocode Core**.

## Как устроено

| Путь | Назначение |
|------|------------|
| `upstream` | symlink → `$HOME/kilocode/packages/kilo-vscode` |
| `rebrand/overrides.json` | identity + defaults |
| `config/evocode.agent.json` | provider `evocode` → Core `:8083/v1` → `~/.config/evocode/agent/evocode.json` |
| `config/settings.vscode.json` | VS Code defaults |
| `extension/` | **сгенерированный** workspace (package.json + symlinks) |
| `scripts/apply-rebrand.mjs` | сборка `extension/` |
| `scripts/install-provider.mjs` | запись в `~/.config/evocode/agent/evocode.json` (+ shadow kilo.json) + auth |
| `scripts/launch-extension.sh` | Extension Development Host |

Command IDs в F1 остаются `kilo-code.*` (стабильность API). Меняются displayName, publisher, titles, **defaults модели**.

## Быстрый старт (лицо «Эвокод»)

```bash
cd /path/to/Evocode
PORT=8083 npm start          # Core
npm run agent:rebrand        # иконки + тексты + package.json
npm run agent:install-provider
npm run agent:launch         # без welcome VS Code, свой workspace
```

Чистый UI (если залипли старые layout/welcome):

```bash
EVOCODE_CLEAN_UI=1 npm run agent:launch
```

Что делает rebrand:
- **Иконки** `brand/icons/` (буква «Э») → activity bar + marketplace icon
- **Тексты** welcome «Kilo Code is an AI…» → про Эвокод (патч `dist/webview.js`)
- **Workspace** без «Welcome to VS Code», secondary sidebar (встроенный Chat) скрыт
- **Заголовок окна:** `Эвокод — …`

В окне: activity **«Эвокод»**, модель **evocode/evocode-auto**.

## Provider wiring

```
Agent (kilo serve)  --OpenAI compat-->  Evocode Core :8081/v1
                                              │
                                    local llama / cloud+DLP
```

`~/.config/evocode/agent/evocode.json` (после install-provider):

```json
{
  "model": "evocode/evocode-auto",
  "enabled_providers": ["evocode"],
  "disabled_providers": ["kilo"],
  "provider": {
    "evocode": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Эвокод Core",
      "options": {
        "baseURL": "http://127.0.0.1:8081/v1",
        "apiKey": "evocode-local"
      }
    }
  }
}
```

Переопределить URL: `EVOCODE_CORE_URL=http://127.0.0.1:8081/v1 npm run agent:install-provider`.

## Сборка upstream dist

Если `extension/dist` пуст:

```bash
cd $HOME/kilocode
bun run --cwd packages/kilo-vscode compile
# или script/local-bin.ts для bin/kilo
```

## F1 → F2

- Полный rename command IDs `kilo-code.*` → `evocode.*` (optional F2.6)
- Свои иконки / nls
- **Preinstall в IDE (F2.3 ✅):** `npm run ide:preinstall-agent` → `~/.evocode-ide/extensions`
  - smoke: `code --extensions-dir ~/.evocode-ide/extensions .`
  - docs: `packages/ide/preinstall/README.md`
- Отключение Kilo cloud account gate в UI
