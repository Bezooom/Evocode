# Runtime: local LLM из Эвокод (P0)

Запуск **ik_llama** / **buun** моделей прямо из UI, без ручного `start_ik_*.sh`.

## Какой форк за что

| Форк | Бинарь | Профили | Зачем |
|------|--------|---------|--------|
| **ik_llama.cpp** | `~/ik_llama.cpp/build/bin/llama-server` | `coder`, `chat-ornith`, `chat-agentworld`, `fim-small` | **Основной chat/agent**: `--fit`, MTP, KV q4 |
| **buun-llama-cpp** | `~/buun-llama-cpp/build/bin/llama-server` | `chat-buun`, `embed-nomic` | turbo KV, embeddings |
| GGUF | `~/llama.cpp/models/*.gguf` | — | **не копируем**, только пути |

Конфиг: [`config/profiles.json`](../config/profiles.json).

## API Core (:8083)

```bash
curl -s localhost:8083/v1/runtime | jq .
curl -s -X POST localhost:8083/v1/runtime/start \
  -H 'Content-Type: application/json' \
  -d '{"profile":"coder"}' | jq .
curl -s -X POST localhost:8083/v1/runtime/stop \
  -H 'Content-Type: application/json' \
  -d '{"profile":"coder"}' | jq .
```

| Метод | Путь | Действие |
|-------|------|----------|
| GET | `/v1/runtime` | статус + все профили |
| GET | `/v1/runtime/profiles` | список |
| POST | `/v1/runtime/start` | `{ "profile": "coder" }` |
| POST | `/v1/runtime/stop` | `{ "profile" }` или `{ "all": true }` |
| POST | `/v1/runtime/switch` | смена профиля (force restart) |

Логи spawn: `.evocode/logs/<profile>.log`  
Состояние: `.evocode/runtime-state.json`

## UI

```bash
npm run evocode
```

- **Activity bar** — иконка стопки **«Модели»** (отдельная боковая панель)
- Status bar **«Эвокод · …»** → клик = панель Модели
- **Ctrl+Shift+M** — фокус на Модели
- Автозапуск **coder (ik_llama)** если LLM offline (`evocode.shell.autoStartDefaultModel`, default **true**)
- Welcome: кнопки Модели / Агент

Отключить автозапуск LLM: settings → `evocode.shell.autoStartDefaultModel: false`.

## Русский UI

Профиль `~/.evocode-ide`:

- `User/locale.json` → `"locale": "ru"`
- language pack `MS-CEINTL.vscode-language-pack-ru` (ставится `ide:prepare-shell`)
- shell commands и runtime messages — на русском
- agent webview — частично (патч строк); полный nls — later

## ATSInfer / paper offload

Не интегрировано: нет публичного drop-in в ik/buun.  
Оптимизация «здесь и сейчас» = ваши профили ik (`--fit`) + buun turbo.

## Dual-model: chat + FIM (Neurocontrol)

| Роль | Профиль | Порт | Модель |
|------|---------|------|--------|
| **Chat / agent** | `coder` | **8080** | ~35B GPU |
| **FIM / autocomplete** | `fim-small` | **8082** | Neurocontrol Qwen ~2G, **CPU** (`-ngl 0`) |
| Embed (opt) | `embed-nomic` | 8084 | nomic |

- Core: `LLAMA_FIM_ENABLED=true` (default), model id **`evocode-fim`**
- API autocomplete: `POST /v1/completions` (и `/v1/fim`) → лёгкая модель
- UI: Модели → toggle FIM + «Запустить fim-small»
- Shell: `evocode.shell.autoStartFimModel` (default **true**), через ~8 с после coder

```bash
# вручную
curl -s -X POST localhost:8083/v1/runtime/start -d '{"profile":"fim-small"}'
curl -s localhost:8083/health | jq '{localReady, fimReady, fim}'
curl -s localhost:8083/v1/completions -H 'Content-Type: application/json' \
  -d '{"model":"evocode-fim","prompt":"def hello():\n    ","max_tokens":32}'
```

Agent settings: `autocomplete.model = evocode-fim`, provider `evocode`.

## Типичный happy-path

1. `npm run build && npm run evocode`
2. Ctrl+Shift+M → **coder** (chat) + **fim-small** (FIM) → Запустить
3. Ctrl+L → чат агента → Core → local :8080; autocomplete → :8082
