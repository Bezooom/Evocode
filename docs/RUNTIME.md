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

## Thinking models & «The operation was aborted»

Некоторые GGUF (ornith и др.) отдают токены в `reasoning_content`, а `content` пустой, пока не кончится «думание».  
Агент (Kilo lineage) ждёт `delta.content` → idle/timeout → **`UnknownError: The operation was aborted`**.

Mitigations (Core 0.95+):

1. **`--reasoning-budget 512`** в профилях chat (`coder`, `chat-buun`) — лимит thinking, затем идёт answer.  
2. **`EVOCODE_FOLD_REASONING=true`** (default) — Core копирует reasoning → `content`, если content пустой (stream + non-stream).  
3. У агента/запросов не ставить слишком маленький `max_tokens` (thinking съедает бюджет).  
4. Ошибки abort мапятся в `type: aborted` с подсказкой (не голый UnknownError).

Проверка:

```bash
curl -s localhost:8083/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"model":"evocode-auto","messages":[{"role":"user","content":"Say OK"}],"max_tokens":64}' | jq '.choices[0].message'
```

## Hardware recommendations (→ 1.0)

```bash
curl -s localhost:8083/v1/hardware | jq .
```

См. [plans/HARDWARE_PROFILES.md](../plans/HARDWARE_PROFILES.md): tier, CPU threads для FIM/embed, VRAM policy.

## Порты (не путать с OOM)

| Порт | Кто | Конфликт? |
|------|-----|-----------|
| 8080 | **один** chat-профиль (`coder` / `chat-buun` / …) | да — только один |
| 8082 | FIM `fim-small` | нет с chat |
| 8083 | Evocode Core | нет |
| 8084 | embed `embed-nomic` | нет с chat |

Сообщение «pid запущен, порт не отвечает» чаще значит **процесс упал** (VRAM OOM), а не «порт занят».  
Лог: `.evocode/logs/<profile>.log` — ищите `cudaMalloc failed` / `out of memory`.

**35B на RTX 3090 24GB:** веса ~20 GB + большой KV — **весь GPU под chat**.  
- ✅ `chat-buun`: ctx **262k**, turbo KV — при **свободной** VRAM (fim/embed на CPU)  
- ✅ `coder` (ik `--fit`) — альтернатива с авто-подгонкой  
- ✅ FIM (`fim-small`) + embed (`embed-nomic`): **только CPU** (`-ngl 0`) — не делят VRAM с chat  
- ❌ embed/fim с `-ngl 99` параллельно 35B → OOM на KV, порт «не отвечает»

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

## External Agent Memory Bank (Внешняя память агента)

Внешняя память хранится в `.evocode/memory/` и автоматически подмешивается в системный промпт при любых переключениях моделей (локальные ik/buun ↔ облачные OpenRouter/Claude):

- `GET /v1/memory` — статус и содержимое файлов памяти (`projectbrief.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`).
- `POST /v1/memory` — синхронизация или обновление файлов памяти.

```bash
curl -s localhost:8083/v1/memory | jq .
```

## Самообучение маленькой модели (In-Context Adapter & Dataset Collector)

Служба `DatasetCollector` с маскированием DLP собирает удачные решения в `.evocode/learning/dataset/train_pairs.jsonl`. На их основе создаётся лёгкий адаптивный слой в системном промпте без необходимости переобучения весов GGUF.

- `GET /v1/learning/dataset` — статистика собранного датасета и путь к скрипту экспорта LoRA (`scripts/export-lora-dataset.sh`).

```bash
curl -s localhost:8083/v1/learning/dataset | jq .
```

## Git Skill Crawler & Конвертер Cursor Rules

Служба `GitSkillCrawler` сканирует внешние репозитории (`VoltAgent/awesome-agent-skills`, `PatrickJS/awesome-cursorrules` и др.) и автоматически преобразует файлы правил `.cursorrules` / `.mdc` в готовые навыки Evocode (`SKILL.md`).

- `POST /v1/skills/crawl` — парсинг и конвертация внешнего правила в файл `SKILL.md`.

```bash
curl -s -X POST localhost:8083/v1/skills/crawl \
  -H 'Content-Type: application/json' \
  -d '{"ruleName":"nextjs.mdc","rawContent":"---\ndescription: Next.js rules\n---\nUse server components","repoName":"awesome-cursorrules"}'
```

## Типичный happy-path

1. `npm run build && npm run evocode`
2. Ctrl+Shift+M → **coder** (chat) + **fim-small** (FIM) → Запустить
3. Ctrl+L → чат агента → Core → local :8080; autocomplete → :8082

