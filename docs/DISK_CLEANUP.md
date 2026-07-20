# Диск: что держать, что можно снести (llama / модели)

**Корень `/` — ~18 G свободно (96%).** Модели и форки лежат на `$HOME` → корень.  
Storage (`$HOME/storage`) — 147 G free, туда GGUF **не копировали**.

Эвокод **не копирует** модели: только абсолютные пути в `config/profiles.json`.

---

## Карта «нужно для Эвокод»

| Что | Путь | ~размер | Зачем |
|-----|------|---------|--------|
| **KEEP** ik_llama | `~/ik_llama.cpp` | 2.1 G | `start_ik_*`, coder/chat |
| **KEEP** buun | `~/buun-llama-cpp` | 1.3 G | turbo KV, embeddings binary |
| **KEEP** models dir | `~/llama.cpp/models` | 92 G | все GGUF |
| **KEEP** Coder 27B | `.../Qwopus3.6-27B-Coder-MTP-IQ4_XS.gguf` | 15 G | IDE default |
| **KEEP** ornith Q4_K | `.../ornith-1.0-35b-Q4_K.gguf` | 20 G | тяжёлый chat |
| **KEEP** nomic embed | `.../nomic-embed-*.gguf` | 81 M | RAG |
| **KEEP optional** AgentWorld | `.../Qwen-AgentWorld-35B-*.gguf` | 20 G | если пользуешься |
| **KEEP optional** FIM | Neurocontrol `Qwen1.5B-...3.5B.gguf` | 2 G | autocomplete |
| **KEEP** скрипты | `~/start_ik_*.sh`, `start_ai4`, `stop_ai`, watchdog | мало | runtime |

---

## Можно удалить с высокой уверенностью (~3.8 G)

Ни один актуальный `start_ik_*` / `start_ai4` / embed на них **не ссылается**:

| Каталог | ~ | Почему safe-ish |
|---------|---|-----------------|
| `~/beellama.cpp` | 1.3 G | Нет в start_*.sh |
| `~/llama-cpp-turboquant-cuda` | 1.3 G | Старый (апр); buun — актуальный turbo |
| `~/llama.cpp-tq3` | 1.2 G | Только `start_ai5` → модель **TQ3 отсутствует** |

```bash
# СНАЧАЛА dry-run
./scripts/disk-audit-llama.sh

# Потом, если согласен, ПО ОДНОМУ:
# rm -rf $HOME/beellama.cpp
# rm -rf $HOME/llama-cpp-turboquant-cuda
# rm -rf $HOME/llama.cpp-tq3
```

Не удалять `~/llama.cpp` целиком — там **`models/` на 92 G**.  
Если убрать fork-исходники, оставь `models/`:

```bash
# Опционально позже: исходники llama.cpp без models (осторожно)
# mv ~/llama.cpp/models $HOME/storage/gguf-models
# ln -s $HOME/storage/gguf-models ~/llama.cpp/models
```

(перенос на storage = место на `/`, **не копия** если `mv`).

---

## Дубликаты моделей (главный выигрыш)

| Файл | ~ | Рекомендация |
|------|---|--------------|
| `ornith-1.0-35b-Q4_K.gguf` | 20 G | **KEEP** (start_ik_ai4) |
| `ornith-1.0-35b-Q4_K_M.gguf` | 20 G | **кандидат** — почти дубль; если Q4_K ок → можно **+20 G** |
| `Qwopus3.6-35B-A3B-v1-MTP-IQ4_XS.gguf` | 19 G | KEEP если MTP 35B нужен; иначе удалить после выбора «один 35B» |
| `Qwen-AgentWorld-35B-...` | 20 G | KEEP или выкинуть, если всегда ornith |
| `Qwopus3.6-27B-Coder-...` | 15 G | **KEEP** для IDE |

**Стратегия «один chat + coder + embed»:**  
Coder 15G + ornith Q4_K 20G + nomic = **~35 G моделей**, можно освободить **~40–55 G** убрав второй ornith + лишний 35B + AgentWorld (если не нужны).

Сломанный 0-байт:  
`$HOME/…/Axis/models/Qwen2.5-14B-Instruct-Q4_K_M.gguf` — можно удалить (0 B).

---

## Ollama (~40 G) — отдельное решение

`~/.ollama` ≈ **40 G** на том же корне.

```bash
ollama list   # есть ли модели, которыми пользуешься?
# если пусто / не нужно:
# systemctl --user stop ollama 2>/dev/null; rm -rf ~/.ollama
```

Не удаляй, если Comfy/другие тулзы тянут ollama.

---

## Мёртвые скрипты — удалены (2026-07-19)

Удалены: `start_ai.sh`, `start_ai2–5.sh`, `start_ai_optimized.sh`, `start_ik_ai_27b.sh`.  
Ollama (`~/.ollama`, deepseek-70b) — удалена.

**Живые:** `start_ik_ai_coder.sh`, `start_ik_ai2/3/4.sh`, `start_ik_ai.sh`, `start_embeddings.sh`, `stop_ai.sh`, `llama_watchdog.sh`.

---

## Порты (чтобы не стрелять себе в ногу)

| Порт | Кто |
|------|-----|
| 8080 | chat llama-server |
| 8081 | **legacy** start_embeddings — **конфликт** со старым Core |
| 8082 | FIM (optional) |
| **8083** | **Evocode Core** (сейчас) |
| **8084** | embed nomic (Evocode stack) |

---

## Рекомендуемый порядок освобождения `/`

1. `./scripts/disk-audit-llama.sh`  
2. Удалить 3 fork-дерева (~3.8 G) — низкий риск  
3. Решить: один ornith → удалить `*_Q4_K_M` (~20 G)  
4. Решить: нужен ли второй/третий 35B  
5. `ollama list` → возможно ~40 G  
6. Опционально: `mv models → storage` + symlink  

**Я ничего не удаляю без твоего явного «удали X, Y».**

---

## Как жить с Эвокод без копий

```bash
# 1) chat как раньше
$HOME/start_ik_ai_coder.sh
# или
./scripts/start-local-stack.sh   # profile=coder

# 2) Core attach
cd /path/to/Evocode
PORT=8083 EVOCODE_LLAMA_MODE=attach npm start

# 3) agent → Core :8083
EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:install-provider
```
