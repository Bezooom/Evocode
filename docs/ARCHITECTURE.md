# Архитектура Эвокод

## Обзор

Эвокод — модульная серверная система с архитектурой **privacy-first**, построенная на принципах:

- **Локальность** — весь инференс по умолчанию выполняется на устройстве через llama.cpp
- **Модульность** — каждый компонент изолирован и заменяем
- **Безопасность** — данные не покидают устройство без прохождения DLP-фильтра
- **Offline-ready** — полная функциональность без интернета (кроме облачного маршрута и синхронизации)

Система реализована как standalone HTTP-сервер на Node.js/TypeScript (**порт 8083** по умолчанию; chat llama — 8080).

> **Важно (2026-07-19):** agent loop / MCP / tools **не** реализуются в Core — они живут в **Kilo/OpenCode**.  
> Core = privacy plane. См. [ARCHITECTURE_BORROW.md](./ARCHITECTURE_BORROW.md) и [FORK_STRATEGY](../plans/FORK_STRATEGY.md).

---

## Схема компонентов

```mermaid
graph TB
    subgraph "HTTP Layer"
        Server["🌐 HTTP-сервер<br/>index.ts :8081"]
    end
    
    subgraph "Security Layer"
        DLP["🔒 DLP Guard<br/>4 regex-правила"]
    end
    
    subgraph "Intelligence Layer"
        RAG["🔍 VectorIndex<br/>SQLite-vec, 384-dim"]
        Router["🔄 Smart Router<br/>classify → decide"]
    end
    
    subgraph "Inference Layer"
        Local["🧠 InferenceEngine<br/>llama-server spawn"]
        Cloud["☁️ Cloud Provider<br/>OpenRouter API"]
    end
    
    subgraph "Data Layer"
        DB[(SQLite-vec<br/>.evocode/index.db)]
        Skills[(skills/<br/>system + user)]
        Config["⚙️ Config<br/>defaultConfig"]
    end
    
    subgraph "Sync Layer"
        Sync["📚 SkillSyncEngine<br/>GitHub API"]
    end

    Server --> DLP
    DLP --> RAG
    RAG --> Router
    Router -->|"simple"| Local
    Router -->|"complex"| Cloud
    RAG --> DB
    Sync -->|"MANIFEST.json"| Skills
    Config -.->|"настройки"| Local
    Config -.->|"настройки"| Cloud
    Config -.->|"правила"| DLP
    Config -.->|"пороги"| Router
    Config -.->|"источники"| Sync

    style DLP fill:#EA4335,color:#fff
    style Local fill:#34A853,color:#fff
    style Cloud fill:#4285F4,color:#fff
    style RAG fill:#FBBC04,color:#000
    style Sync fill:#9C27B0,color:#fff
```

---

## Поток данных

### Обработка запроса POST /chat

```mermaid
sequenceDiagram
    participant U as 👤 Пользователь
    participant S as 🌐 HTTP-сервер
    participant D as 🔒 DLP Guard
    participant V as 🔍 VectorIndex
    participant IE as 🧠 InferenceEngine
    participant R as 🔄 Smart Router
    participant L as llama-server
    participant C as ☁️ OpenRouter

    U->>S: POST /chat {"query": "..."}
    
    Note over S,D: Этап 1: Безопасность
    S->>D: processRequest({prompt: query})
    D->>D: Применение 4 regex-правил
    D-->>S: {prompt: masked, changes: [...]}
    
    Note over S,V: Этап 2: RAG-обогащение
    S->>IE: getEmbeddings(maskedQuery)
    IE-->>S: Float32Array[384]
    S->>V: search(embedding, k=3)
    V->>V: KNN по SQLite-vec
    V-->>S: [{filePath, content, score}]
    
    Note over S,R: Этап 3: Маршрутизация
    S->>R: analyzeTask({prompt, systemPrompt + ragContext})
    R->>R: classifyTask() → simple|medium|complex
    R->>R: decide() → local|cloud
    
    alt Решение: local
        R->>IE: chat({prompt, systemPrompt})
        IE->>L: POST /completion
        L-->>IE: {content: "..."}
        IE-->>S: {text, model: "local", latency}
    else Решение: cloud
        R->>IE: chatCloud({prompt, systemPrompt})
        IE->>C: POST /v1/chat/completions
        C-->>IE: {choices: [...]}
        IE-->>S: {text, model: "cloud", latency}
    end
    
    S-->>U: {"answer": "🤖 Эвокод (model): ..."}
```

### Индексация файла POST /index-file

```mermaid
sequenceDiagram
    participant U as 👤 Пользователь
    participant S as 🌐 HTTP-сервер
    participant IE as 🧠 InferenceEngine
    participant V as 🔍 VectorIndex

    U->>S: POST /index-file {"filePath", "content"}
    S->>IE: getEmbeddings(content.substring(0, 1000))
    IE-->>S: Float32Array[384]
    S->>V: insertChunk(filePath, content, embedding)
    V->>V: INSERT INTO chunks + vec_index
    V-->>S: id
    S-->>U: {"success": true, "id": 1}
```

---

## Модули

### 1. InferenceEngine (`src/engine/inference.ts`, 316 строк)

Управляет локальным и облачным инференсом.

**Локальный инференс:**
- Запускает `llama-server` через `child_process.spawn` с аргументами из конфига
- Ожидает готовности через polling `/health` endpoint (до 30 сек)
- Graceful shutdown: `SIGTERM` → 5 сек → `SIGKILL`

**Методы:**
| Метод | Описание |
|-------|----------|
| `startLocalServer()` | Запуск llama-server с аргументами `--model`, `--port`, `--n-predict`, `--host` |
| `stopLocalServer()` | Остановка процесса llama-server |
| `fim(request)` | Fill-In-the-Middle — автодополнение кода |
| `chat(request)` | Чат через локальную модель (`/completion`) |
| `chatCloud(request)` | Чат через OpenRouter (`/v1/chat/completions`) |
| `getEmbeddings(text)` | Генерация 384-мерного вектора через `/embedding` |

**Конфигурация:**
```typescript
inference.local.model   = "qwen3.6-35b-q4_k_m.gguf"
inference.local.port    = 8080
inference.local.nPredict = 32768
inference.local.timeout = 900  // секунд
inference.cloud.model   = "anthropic/claude-sonnet-4.2"
```

---

### 2. DLP Guard (`src/guard/dlp-guard.ts`, 126 строк)

Data Loss Prevention — маскирует конфиденциальные данные перед отправкой в облако.

**Pipeline:**
1. Принимает текст запроса
2. Последовательно применяет 4 regex-правила
3. Возвращает маскированный текст + список изменений

**Правила:**

| # | Имя | Паттерн | Что маскирует |
|---|-----|---------|---------------|
| 1 | `api-key` | `api[_-]?key[:=]\s*["']?([a-zA-Z0-9_-]{20,})` | API-ключи (≥20 символов) |
| 2 | `token` | `token[:=]\s*["']?([a-zA-Z0-9_-]{20,})` | Токены авторизации |
| 3 | `password` | `password[:=]\s*["']?([^\s"']{8,})` | Пароли (≥8 символов) |
| 4 | `secret` | `secret[:=]\s*["']?([^\s"']{10,})` | Секреты (≥10 символов) |

**Интерфейс:**
```typescript
interface MaskResult {
  original: string;
  masked: string;
  changes: { rule: string; position: number; }[];
  wasMasked: boolean;
}
```

---

### 3. Smart Router (`src/router/smart-router.ts`, 127 строк)

Классифицирует задачи и принимает решение о маршрутизации.

**Алгоритм:**
1. `classifyTask(prompt)` → анализ ключевых слов → `simple | medium | complex`
2. `decide(context)` → на основе сложности, размера контекста, наличия вложений → `local | cloud`
3. `processRequest(request, context)` → вызов InferenceEngine

**Ключевые слова классификации:**

| Категория | Ключевые слова (рус) | Ключевые слова (eng) |
|-----------|---------------------|---------------------|
| **simple** | исправь, обнови, переименуй, удали, убери, форматируй | fix, update, rename, delete, remove, format |
| **complex** | спроектируй, архитектура, рефакторинг, миграция, ревью | refactor, migrate, design, review, debug, test |

**Правила маршрутизации:**
- `simple` + малый контекст → **local**
- `complex` + большой контекст → **cloud**
- Наличие вложений → **cloud**
- Генерация кода → **local** (privacy)

---

### 4. Skill Sync Engine (`src/sync/skill-sync.ts`, 320 строк)

Автоматическая синхронизация навыков из GitHub-репозиториев.

**Процесс синхронизации:**
```mermaid
flowchart LR
    A[GitHub API] -->|GET MANIFEST.json| B[Парсинг манифеста]
    B --> C{Навык существует?}
    C -->|Нет| D[📥 Скачать + создать]
    C -->|Да| E{SHA совпадает?}
    E -->|Нет| F[🔄 Скачать + обновить]
    E -->|Да| G[✅ Без изменений]
    D & F --> H[Записать в skills/system/]
    H --> I[Бэкап в skills/.backup/]
```

**Методы:**
| Метод | Описание |
|-------|----------|
| `sync()` | Полная синхронизация всех источников → `SyncResult` |
| `checkSource(source)` | Проверка одного источника (GitHub repo) |
| `loadExistingSkills()` | Загрузка текущих навыков с диска |
| `getLog()` | История синхронизаций |

**Транспорт:** `https.get()` → обработка 3xx редиректов → JSON/text парсинг

---

### 5. VectorIndex (`src/indexer/vector-index.ts`, 96 строк)

RAG-индекс на основе SQLite с расширением `sqlite-vec`.

**Параметры:**
- Размерность эмбеддингов: **384**
- Алгоритм поиска: **KNN** (K-Nearest Neighbors)
- Хранилище: `.evocode/index.db`

**SQL-схема:**
```sql
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filePath TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL
);

CREATE VIRTUAL TABLE vec_index USING vec0 (
  chunk_id INTEGER REFERENCES chunks(id),
  embedding float[384]
);
```

**Методы:**
| Метод | Описание |
|-------|----------|
| `insertChunk(filePath, content, embedding)` | Добавление чанка в индекс |
| `search(queryEmbedding, k)` | KNN-поиск k ближайших чанков |
| `deleteByFile(filePath)` | Удаление всех чанков файла |

---

### 6. Config (`src/core/config.ts`, 167 строк)

Централизованная конфигурация с типизированными интерфейсами.

**Структура:**
```typescript
EvocodeConfig {
  appName, appVersion, language,
  inference: { local: {...}, cloud: {...} },
  skills: { systemPath, userPath, backupPath, archivePath },
  sync: { enabled, interval, sources: SyncSource[] },
  dlp: { enabled, rules: DLPRule[] },
  router: { enabled, localThreshold, cloudThreshold }
}
```

**Загрузка:** `loadConfig(path)` — JSON-файл → merge с `defaultConfig`

---

## Зависимости

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `typescript` | ^5.0 | Язык разработки |
| `better-sqlite3` | ^11.0 | SQLite для VectorIndex |
| `sqlite-vec` | ^0.1 | Расширение для векторного поиска |
| `jest` | ^29.0 | Unit-тестирование |
| `ts-jest` | ^29.0 | TypeScript поддержка для Jest |

---

## Безопасность

### Модель угроз

```mermaid
graph LR
    subgraph "🟢 Доверенная зона"
        Local[Локальная модель]
        DB[(RAG-база)]
        Skills[(Навыки)]
    end
    
    subgraph "🔴 Внешняя зона"
        Cloud[OpenRouter]
        GitHub[GitHub API]
    end
    
    DLP{🔒 DLP Guard}
    
    Local -.->|"данные остаются"| Local
    DLP -->|"маскированные данные"| Cloud
    GitHub -->|"навыки (read-only)"| Skills
```

**Гарантии:**
1. Локальные запросы **никогда** не отправляются в сеть
2. Облачные запросы проходят через DLP Guard — секреты маскируются
3. Skill Sync — read-only, не отправляет пользовательские данные
4. RAG-база хранится локально в `.evocode/index.db`
5. API-ключ облачного провайдера хранится в переменной окружения

---

## Планируемые модули (актуально)

```mermaid
graph TB
    subgraph "F0 Core done"
        IE[InferenceEngine attach]
        DLP[DLP Guard]
        SR[Smart Router]
        SS[Skill Sync + Loader]
        VI[VectorIndex]
        OAI[OpenAI-compat API]
    end
    
    subgraph "F1.5 next"
        POL[Policy Bridge]
        PLAN[Plan mode gate]
        EMB[Embed :8084]
    end
    
    subgraph "Already in Kilo/OpenCode — do not reimplement"
        MCP[MCP Host]
        TE[Tools / Terminal]
        SSE[HTTP + SSE sessions]
        IDX[kilo-indexing]
    end
    
    subgraph "F3+ optional"
        SBX[OS Sandbox]
        WT[Worktree subagents]
        FT[LoRA later]
    end
    
    IE --> OAI
    DLP --> POL
    SR --> POL
    POL --> PLAN
    MCP -.->|use as-is| TE
```

### Приоритет (не плодить agent)

| Модуль | Источник идеи | Где живёт |
|--------|---------------|-----------|
| OpenAI-compat API | openai_proxy / OpenCode | **Core — done** |
| MCP / tools / agent loop | OpenCode/Kilo | **Kilo — as-is** |
| Policy bridge + DLP modes | Grok permissions | Core + kilo config — F1.5 |
| Plan mode write-gate | Grok plan mode | kilo modes + policy — F1.5/F2 |
| Streaming | kilo SSE | primary; Core chunked secondary |
| Smart Router v2 ML | Router/ | optional after F1.5 |
| OS sandbox | Grok Landlock | F3 |
| Worktree subagents | Grok + Kilo AM | F3 |
| LoRA / self-improve | Neurocontrol / Archon | F4 after usable IDE |

Подробности: [ARCHITECTURE_BORROW.md](./ARCHITECTURE_BORROW.md), [ROADMAP.md](../plans/ROADMAP.md).

---

## Расширяемость

### Добавление нового модуля

1. Создайте файл в `src/<category>/<module-name>.ts`
2. Экспортируйте singleton-экземпляр
3. Импортируйте в `src/index.ts`
4. Добавьте конфигурацию в `EvocodeConfig` (если нужна)

### Формат навыков

Каждый навык — файл `SKILL.md` с YAML-frontmatter:

```yaml
---
name: my-skill
version: "1.0.0"
source: github.com/user/repo
sha: abc123def456
---

# Описание навыка

Инструкции для агента...
```

Подробнее: [examples_SKILL.md](examples_SKILL.md)

---

*Последнее обновление: 2026-07-19*
