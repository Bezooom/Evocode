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

🔍 _[Открыть интерактивную схему архитектуры в высоком разрешении](../VISUAL/architecture.html)_

---

## Схема компонентов

```mermaid
flowchart TD
    accTitle: Evocode Components Schema
    accDescr: Visual map of Evocode Core components and database interfaces with optimized large text for readability.

    classDef default font-size:16px,font-family:'JetBrains Mono',monospace,stroke-width:1.5px,padding:8px;
    classDef server fill:#1e1e2e,stroke:#cdd6f4,color:#cdd6f4;
    classDef dlp fill:#881327,stroke:#fb7185,color:#fff;
    classDef intel fill:#11111b,stroke:#89b4fa,stroke-width:2px,color:#cdd6f4;
    classDef local fill:#064e3b,stroke:#34d399,color:#fff;
    classDef cloud fill:#78350f,stroke:#fbbf24,color:#fff;
    classDef db fill:#4c1d95,stroke:#a78bfa,color:#fff;

    Server["🌐 HTTP-сервер<br/>index.ts :8083"]:::server --> DLP["🔒 DLP Guard<br/>6 regex-правил"]:::dlp
    DLP --> RAG["🔍 VectorIndex<br/>SQLite-vec, 384-dim"]:::intel
    RAG --> Router["🔄 Smart Router<br/>classify → decide"]:::intel
    
    Router -->|"Локальный completion"| Local["🧠 InferenceEngine<br/>llama-server spawn"]:::local
    Router -->|"Облачный completions"| Cloud["☁️ Cloud Provider<br/>OpenRouter API"]:::cloud
    
    RAG --> DB[("SQLite-vec<br/>.evocode/index.db")]:::db
    Sync["📚 SkillSyncEngine<br/>GitHub API"]:::intel -->|"MANIFEST.json"| Skills[("skills/<br/>system + user")]:::db

    Server --> HW["🖥️ Hardware / Catalog<br/>probe + stack"]:::intel
    Server --> Mem["💾 Memory Bank<br/>context memory"]:::intel
    Server --> Lrn["📈 Self-Adapter<br/>dataset collector"]:::intel
    
    HW --> Downloader["📥 Model Downloader<br/>HF GGUF download"]:::local
    
    Config["⚙️ Config<br/>defaultConfig"]:::intel -.->|"настройки"| Local
    Config -.->|"настройки"| Cloud
    Config -.->|"правила"| DLP
    Config -.->|"пороги"| Router
    Config -.->|"источники"| Sync
```

---

## Поток данных

### Обработка запроса POST /chat

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Пользователь
    participant S as 🌐 HTTP-сервер :8083
    participant D as 🔒 DLP Guard
    participant V as 🔍 VectorIndex (RAG)
    participant R as 🔄 Smart Router
    participant IE as 🧠 InferenceEngine
    participant L as llama-server
    participant C as ☁️ OpenRouter

    U->>S: POST /chat {"query": "..."}
    
    Note over S,D: Этап 1: Безопасность
    S->>D: processRequest({prompt: query})
    D->>D: Применение 6 regex-правил
    D-->>S: {prompt: masked, changes: [...]}
    
    Note over S,V: Этап 2: RAG-обогащение
    S->>IE: getEmbeddings(maskedQuery)
    IE-->>S: Float32Array[384]
    S->>V: search(embedding, k=3)
    V->>V: KNN по SQLite-vec
    V-->>S: [{filePath, content, score}]
    
    Note over S,R: Этап 3: Маршрутизация
    S->>R: analyzeTask({prompt, systemPrompt + RAG})
    R->>R: classifyTask() → simple|medium|complex
    R->>R: decide() → local|cloud
    
    alt Решение: local
        R->>IE: chat({prompt, systemPrompt})
        IE->>L: POST /completion
        L-->>IE: {content: "..."}
        IE-->>S: {text, model: "local"}
    else Решение: cloud
        R->>IE: chatCloud({prompt, systemPrompt})
        IE->>C: POST /v1/chat/completions
        C-->>IE: {choices: [...]}
        IE-->>S: {text, model: "cloud"}
    end
    
    S-->>U: {"answer": "🤖 Эвокод (model): ..."}
```

### Индексация файла POST /index-file

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Пользователь
    participant S as 🌐 HTTP-сервер :8083
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
2. Последовательно применяет 6 regex-правил
3. Возвращает маскированный текст + список изменений

**Правила:**

| # | Имя | Паттерн | Что маскирует |
|---|-----|---------|---------------|
| 1 | `api-key` | `api[_-]?key[:=]\s*["']?([a-zA-Z0-9_-]{20,})` | API-ключи (≥20 символов) |
| 2 | `token` | `token[:=]\s*["']?([a-zA-Z0-9_-]{20,})` | Токены авторизации |
| 3 | `password` | `password[:=]\s*["']?([^\s"']{8,})` | Пароли (≥8 символов) |
| 4 | `secret` | `secret[:=]\s*["']?([^\s"']{10,})` | Секреты (≥10 символов) |
| 5 | `private-key` | `-----BEGIN [A-Z ]+ PRIVATE KEY-----` | Закрытые ключи (RSA/GPG) |
| 6 | `jwt` | `eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}` | JWT-токены |

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
flowchart TD
    accTitle: Skill Sync Engine Workflow
    accDescr: Dynamic flow of GitHub skill sync check, comparing local signatures and updating repository with backup options.

    classDef default font-size:16px,font-family:'JetBrains Mono',monospace,stroke-width:1.5px,padding:8px;
    classDef startEnd fill:#1e1e2e,stroke:#cdd6f4,color:#cdd6f4;
    classDef branch fill:#78350f,stroke:#fbbf24,color:#fff;
    classDef process fill:#11111b,stroke:#89b4fa,color:#cdd6f4;
    classDef action fill:#064e3b,stroke:#34d399,color:#fff;

    A["💾 GitHub API sources"]:::startEnd -->|"GET MANIFEST.json"| B["Парсинг манифеста"]:::process
    B --> C{"Навык существует?"}:::branch
    
    C -->|"Нет"| D["📥 Скачать + создать"]:::action
    C -->|"Да"| E{"SHA совпадает?"}:::branch
    
    E -->|"Нет"| F["🔄 Скачать + обновить"]:::action
    E -->|"Да"| G["✅ Без изменений"]:::startEnd
    
    D --> H["Записать в skills/system/"]:::process
    F --> H
    H --> I["Бэкап в skills/.backup/"]:::process
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

### 7. RuntimeManager (`src/engine/runtime-manager.ts`)

Управляет запущенными инстансами и процессами локальных моделей.

**Функции:**
- Запуск и остановка инстансов `llama-server` для чата (порт 8080), FIM (порт 8082) и эмбеддингов (порт 8084).
- Автоматический запуск моделей по умолчанию при старте системы.
- Контроль состояния инференса и горячее переключение профилей (`/v1/runtime/switch`).

---

### 8. ModelDownloader (`src/engine/model-downloader.ts`)

Фоновый асинхронный загрузчик GGUF-моделей.

**Функции:**
- Загрузка моделей напрямую с Hugging Face (через URL-разрешение).
- Сканирование и верификация файлов в локальной папке `modelsDir`.
- Поддержка отслеживания прогресса скачивания (`/v1/models/downloads`) и прерывания процесса.
- Запуск загрузки только после явного согласия пользователя.

---

### 9. MemoryBank (`src/memory/memory-bank.ts`)

Реализация внешней независимой памяти агента (External Agent Memory Bank).

**Функции:**
- Сохранение контекста текущих задач и технических решений в `.evocode/memory/`.
- Автоматическое подмешивание состояния памяти в системный промпт при смене локальных и облачных моделей.
- API для синхронизации и обновления состояния памяти (`GET / POST /v1/memory`).

---

### 10. DatasetCollector & InContextAdapter (`src/learning/`)

Модули динамического самообучения маленьких моделей.

**Компоненты:**
- `DatasetCollector`: Сбор пар «промпт-ответ» успешных решений и FIM-завершений с маскированием через DLP Guard.
- `InContextAdapter`: Формирование динамического адаптивного слоя в системном промпте для адаптации локальной модели к стилю написания кода.
- Экспорт датасета для полноценного внешнего LoRA-обучения (`scripts/export-lora-dataset.sh`).

---

### 11. GitCrawler (`src/sync/git-crawler.ts`)

Служба автоматического сбора и импорта внешних правил.

**Функции:**
- Периодическое сканирование репозиториев правил (например, awesome-cursorrules).
- Автоматическое преобразование правил `.cursorrules` и `.mdc` в формат навыков `SKILL.md` с сохранением в `skills/user/crawled/`.

---

### 12. Hardware & Model catalog (`src/core/hardware.ts`, `src/core/model-catalog.ts`)

Зондирование ресурсов и выдача рекомендаций по стеку.

**Функции:**
- Определение доступного железа (количество логических ядер CPU, объем RAM, графические карты и видеопамять VRAM).
- Назначение категории производительности (minimal, dev, workstation, beast).
- Подбор оптимального dual-model стека (chat + FIM) и выдача рекомендаций (`/v1/hardware`).
- Автоматическая запись настроек в `profiles.local.json` при вызове `apply`.

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
flowchart LR
    accTitle: Threat Model Zone Division
    accDescr: Divides local trusted zones from external untrusted zones via DLP Guard.

    classDef default font-size:16px,font-family:'JetBrains Mono',monospace,stroke-width:1.5px,padding:8px;
    classDef safe fill:#064e3b,stroke:#34d399,color:#fff;
    classDef unsafe fill:#881327,stroke:#fb7185,color:#fff;
    classDef dlp fill:#78350f,stroke:#fbbf24,color:#fff;

    subgraph Trusted["🟢 Доверенная зона (Локальная)"]
        Local[Локальная модель]:::safe
        DB[(RAG-база)]:::safe
        Skills[(Навыки)]:::safe
    end
    
    subgraph Untrusted["🔴 Внешняя зона"]
        Cloud[OpenRouter]:::unsafe
        GitHub[GitHub API]:::unsafe
    end
    
    DLP{🔒 DLP Guard}:::dlp
    
    Local -.->|"данные остаются на ПК"| Local
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
flowchart TD
    accTitle: Planned Modules Architecture Roadmap
    accDescr: Vertical block schema showing planned phases F0, F1.5, external components, and F3 modules.

    classDef default font-size:16px,font-family:'JetBrains Mono',monospace,stroke-width:1.5px,padding:8px;
    classDef done fill:#064e3b,stroke:#34d399,color:#fff;
    classDef next fill:#0d47a1,stroke:#1565c0,color:#fff;
    classDef external fill:#1e1e2e,stroke:#cdd6f4,color:#cdd6f4;
    classDef future fill:#4c1d95,stroke:#a78bfa,color:#fff;

    subgraph Done["F0 Core (Выполнено)"]
        IE[InferenceEngine attach]:::done
        DLP[DLP Guard]:::done
        SR[Smart Router]:::done
        SS[Skill Sync + Loader]:::done
        VI[VectorIndex]:::done
        OAI[OpenAI-compat API]:::done
    end
    
    subgraph Next["F1.5 (В разработке)"]
        POL[Policy Bridge]:::next
        PLAN[Plan mode gate]:::next
        EMB[Embed :8084]:::next
    end
    
    subgraph Ext["Встроенный рантайм (Kilo/OpenCode)"]
        MCP[MCP Host]:::external
        TE[Tools / Terminal]:::external
        SSE[HTTP + SSE sessions]:::external
        IDX[kilo-indexing]:::external
    end
    
    subgraph Future["F3+ (Будущее)"]
        SBX[OS Sandbox]:::future
        WT[Worktree subagents]:::future
        FT[LoRA later]:::future
    end
    
    IE --> OAI
    DLP --> POL
    SR --> POL
    POL --> PLAN
    MCP -.->|используется as-is| TE
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

*Последнее обновление: 2026-07-24*
