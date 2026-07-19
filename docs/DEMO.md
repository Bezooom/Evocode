# Demo slice: Эвокод как AI-IDE (не rename)

**Критерий успеха:** один запуск → простой UI → агент с полным Kilo runtime → Core local.

```bash
# 1) (рекомендуется) local llama
/home/bezoom/start_ik_ai_coder.sh

# 2) всё остальное
cd /home/bezoom/storage/Projects/Evocode
npm run build          # один раз
npm run evocode        # = npm run demo
```

## Что должно произойти

1. Поднимется **Core** на `:8083` (или уже работающий).
2. В `~/.evocode-ide` — compact UI + **locale=ru** (+ language pack при сети).
3. Extensions:
   - `evocode-shell` — Core, **activity bar «Модели»**, auto-start coder, status bar
   - `evocode-agent` — полный agent + **RU webview** (i18n patch)
4. Provider `evocode` → `http://127.0.0.1:8083/v1`
5. Agent `Ctrl+L`; модели — **иконка стопки** слева или Ctrl+Shift+M
6. Если LLM offline — shell сам дергает `/v1/runtime/start` profile=coder

## Если нет иконки / всё ещё Kilo

```bash
# полный refresh brand + profile
npm run ide:refresh-brand
# полностью закройте окна code/cursor, затем:
npm run evocode
```

| Симптом | Действие |
|---------|----------|
| Нет «Э» на activity bar | `ide:refresh-brand`; activity bar = **side** (default), не top |
| Всё ещё тексты Kilo | refresh-brand патчит webview (1345+ замен); перезапуск окна |
| Core off в status bar | Output → «Эвокод»; `PORT=8083 npm start` |
| localReady=false | `start_ik_ai_coder.sh` (llama :8080) |
| Нет sidebar | `Ctrl+L` или Command Palette → «Эвокод: Фокус на агенте» |
| Старый UI | профиль `~/.evocode-ide` — не ваш обычный VS Code |

## Чем это отличается от F2.2/F2.3 plumbing

| Было | Demo slice |
|------|------------|
| product.json rename | живой launch |
| preinstall path only | shell UI + agent always-on |
| `agent:launch` Extension Host | `--user-data-dir` product profile |

## Дальше (если demo ок)

- F2.4 wizard в UI (модели, skills import)
- webview skin агента (цвета Эвокод)
- F2.5 бинарник VSCodium
