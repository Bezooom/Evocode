# API Reference — Evocode Core

**Base URL (local):** `http://127.0.0.1:8083`  
**Версия:** 0.5.0  
**Обновлено:** 2026-07-20

Core — privacy plane. Agent (Kilo/OpenCode) ходит сюда как на OpenAI-compatible provider.

---

## Endpoints

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
