# API Reference — Evocode Core

**Base URL (local):** `http://127.0.0.1:8083`  
**Версия:** 1.0.1  
**Обновлено:** 2026-07-24 (hardware stack + packaging)

Core — privacy plane. Agent (Kilo/OpenCode) ходит сюда как на OpenAI-compatible provider.

---

## Endpoints

### `GET /v1/hardware`

Зонд железа + рекомендация dual-model стека + наличие GGUF в `modelsDir`.

```json
{
  "ok": true,
  "tier": "beast",
  "cpu": { "model": "…", "logicalCores": 36 },
  "memory": { "totalMb": 65536, "freeMb": 40000 },
  "gpus": [{ "index": 0, "name": "RTX 3090", "vramMb": 24576 }],
  "ports": { "8080": "free", "8082": "busy", "8083": "busy", "8084": "free" },
  "recommendations": {
    "chatClass": "30–35B Q4 on GPU…",
    "chatCtxHint": 65536,
    "cpuThreads": 16,
    "secondaryOnCpu": true,
    "suggestedProfiles": ["coder", "fim-small", "embed-nomic"],
    "notes": [],
    "tunables": []
  },
  "stack": {
    "tier": "beast",
    "chat": { "profileId": "coder", "present": true, "catalogId": "…" },
    "fim": { "profileId": "fim-small", "present": false, "catalogId": "qwen25-coder-1.5b-q4" },
    "embed": { "profileId": "embed-nomic", "present": true },
    "missing": ["qwen25-coder-1.5b-q4"],
    "totalDownloadGb": 1.1
  },
  "catalog": [],
  "modelsDir": "/home/…/llama.cpp/models"
}
```

### `POST /v1/hardware/apply`

Пишет merge в `config/profiles.local.json`.

```json
{ "downloadMissing": false, "modelsDir": null }
```

Ответ: `{ "ok": true, "path": "…/profiles.local.json", "defaults": {…}, "profilesWritten": [], "stack": {…}, "downloads": [] }`.

### `GET /v1/models/catalog` · `POST /v1/models/download` · `GET /v1/models/downloads`

Каталог GGUF и загрузка **только по явному запросу** (`{ "id": "nomic-embed-q4" }`).  
Отмена: `POST /v1/models/download/cancel` `{ "id" }`.  
Статус: `GET /v1/models/download/:id`.

---

### `GET /health`

```json
{
  "status": "ok",
  "version": "0.5.0",
  "product": "evocode-core",
  "localReady": true,
  "skills": 8,
  "runtime": {
    "mode": "attach",
    "chatProfile": { "port": 8080, "model": "...", "exists": { "binary": true, "model": true } },
    "localReady": true
  }
}
```

---

### `GET /v1/runtime` · `GET /v1/runtime/status`

Статус local llama runtime (профили ik_llama / buun).

```json
{
  "core": "ok",
  "localReady": false,
  "activeChatProfile": null,
  "profiles": [
    {
      "id": "coder",
      "label": "Чат: Qwopus… (ik_llama)",
      "role": "chat",
      "fork": "ik_llama",
      "port": 8080,
      "online": false,
      "ready": { "binary": true, "model": true }
    }
  ],
  "forks": {
    "ik_llama": "ik_llama — основной chat/agent",
    "buun": "buun — turbo KV / embeddings"
  },
  "message": "Локальная модель не запущена — выберите профиль…"
}
```

### `GET /v1/runtime/profiles`

Список профилей + forks + modelsDir.

### `POST /v1/runtime/start`

```json
{ "profile": "coder", "force": false }
```

Поднимает `llama-server` (binary или startScript из `config/profiles.json`).  
Ответ 200 — online; 202 — процесс стартовал, порт ещё греется.

### `POST /v1/runtime/stop`

```json
{ "profile": "coder" }
```
или `{ "all": true }`.

### `POST /v1/runtime/switch`

Как start с `force: true` (смена GGUF на том же порту).

---

### `GET /v1/models`

Список моделей для OpenAI SDK / Kilo.

```json
{
  "object": "list",
  "data": [
    { "id": "evocode-local", "object": "model", "owned_by": "evocode" },
    { "id": "evocode-auto", "object": "model", "owned_by": "evocode" }
  ]
}
```

- `evocode-auto` — Smart Router (local ↔ cloud)
- `evocode-local` — предпочтительно local

---

### `POST /v1/chat/completions`

OpenAI-compatible. Основной вход для Kilo agent.

**Request:**

```json
{
  "model": "evocode-auto",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "max_tokens": 2048,
  "temperature": 0.7,
  "stream": false
}
```

**Response 200:**

```json
{
  "id": "chatcmpl-evocode-...",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 },
  "evocode": {
    "route": "local",
    "reason": "simple + малый контекст",
    "source": "local",
    "skills": ["tdd"],
    "dlpChanges": 0,
    "latency": 120
  }
}
```

**Ошибки:**

| HTTP | type | Когда |
|------|------|--------|
| 403 | `dlp_blocked` | cloud + критичные секреты |
| 503 | `local_unavailable` / `cloud_unavailable` | нет llama / нет API key |
| 400 | `invalid_request` | нет user message |

При `stream: true` — SSE chunks (упрощённо, один data + `[DONE]`).

---

### Dual-model FIM / autocomplete

| | Chat | FIM |
|--|------|-----|
| Порт llama | **8080** | **8082** |
| Профиль | `coder` | `fim-small` (Neurocontrol ~2G, CPU) |
| Model id | `evocode-auto` | **`evocode-fim`** |
| API | `POST /v1/chat/completions` | **`POST /v1/completions`** · `/v1/fim` |

```bash
curl -s localhost:8083/v1/completions -H 'Content-Type: application/json' \
  -d '{"model":"evocode-fim","prompt":"def foo():\n    ","max_tokens":48}'
```

`GET /health` → `fimEnabled`, `fimReady`, `fim: { port, modelId, … }`.  
Env: `LLAMA_FIM_ENABLED=true` (default), `LLAMA_FIM_PORT=8082`.

---

### Skill Router v2

#### `GET /v1/skills`

Список навыков из индекса (meta, без полного body).

#### `POST /v1/skills/route`

Dry-run маршрутизации (без inference):

```json
{ "query": "solidity smart contract audit", "mode": "dev", "maxSkills": 2 }
```

Ответ: `selected[]` (name, score, reasons, pack, tier), `injectChars`, `rejected[]`, `textPreview`.

#### `POST /v1/skills/reindex`

Пересканировать `skills/system` + `skills/user`, обновить lexical index + **skill embeddings** (M4).

```json
{ "forceEmbed": false }
```

Ответ: `{ count, embeddings: { upserted, skipped, errors }, useEmbeddings, embedBackend }`.

#### `POST /v1/skills/route`

Hybrid dry-run (lexical + embeddings). Response includes `hybrid`, `embedBackend`, reasons like `embed:0.42`.

#### `POST /v1/skills/sync`

Синхронизация remote + invalidate index (как раньше).

Конфиг env:

| Var | Default |
|-----|---------|
| `EVOCODE_SKILL_ROUTER` | `v2` |
| `EVOCODE_SKILLS_EMBED` | `true` |
| `EVOCODE_SKILLS_EMBED_BACKEND` | `hash` \| `inference` |
| `EVOCODE_SKILLS_EMBED_WEIGHT` | `40` |
| `EVOCODE_SKILLS_EMBED_DB` | `.evocode/skills-embeddings.db` |
| `EVOCODE_SKILLS_MAX` / `MAX_INJECT` / `ALLOW_LAB` / `PACKS` | см. config |

---

### `POST /chat`

Упрощённый API (не OpenAI).

```json
{ "query": "напиши функцию" }
```

→ `{ "answer": "...", "route", "source", "skills", ... }`

---

### `POST /index-file`

```json
{ "filePath": "src/a.ts", "content": "..." }
```

→ `{ "success": true, "id": 1 }`  
Требует embeddings (local llama или embed-сервер :8084).

---

### `POST /v1/embeddings`

OpenAI-compatible embeddings (прокси на llama embed endpoint).

---

## Cloud (исходящий)

При route=`cloud` Core вызывает:

```
POST {OPENROUTER_BASE_URL}/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
```

Промпт предварительно проходит **DLP Guard**.  
Прямой доступ агента к OpenRouter **не** должен обходить Core (policy: enabled_providers=`evocode`).

---

## Порты (стек)

| Порт | Сервис |
|------|--------|
| 8080 | llama-server chat |
| 8082 | FIM (optional) |
| **8083** | **Evocode Core** |
| 8084 | nomic embeddings |

---

## Auth

В dev Core без auth (localhost).  
F3: token / mTLS для multi-user.
