# CodeGraph — Граф-базированный анализатор кода

CodeGraph — это инструмент для индексации кодовой базы и создания семантической поисковой системы. Он преобразует код в граф знаний с векторными эмбеддингами, который AI-агенты могут использовать для глубокого понимания архитектуры, зависимостей и связей.

## Расположение кода

```
/home/bezoom/storage/Projects/Skills/New/codegraph-rust-main/
```

## Установка на Ubuntu

### 1. Установить SurrealDB (база данных):
```bash
/home/bezoom/storage/Projects/Skills/New/codegraph-rust-main/install-surrealdb-ubuntu.sh
```

### 2. Установить CodeGraph:
```bash
# Быстрая установка (минимальные фичи)
/home/bezoom/storage/Projects/Skills/New/codegraph-rust-main/install-codegraph-local-speed-ubuntu.sh

# Полная установка (все фичи)
/home/bezoom/storage/Projects/Skills/New/codegraph-rust-main/install-codegraph-full-features-ubuntu.sh
```

## Архитектура

### Основной pipeline:
```
Your Code → Build Context → AST + FastML → LSP Resolution → Enrichment → Graph + Embeddings
```

### Компоненты:
- **codegraph-core** — ядро, графовая модель
- **codegraph-parser** — парсеры для языков (tree-sitter)
- **codegraph-vector** — векторные эмбеддинги
- **codegraph-ai** — AI-агенты (Rig, ReAct, LATS)
- **codegraph-mcp-server** — MCP сервер для AI-клиентов
- **codegraph-mcp-tools** — agentic-инструменты
- **codegraph-mcp-rig** — Rig-агент
- **codegraph-mcp-autoagents** — AutoAgents-агент
- **codegraph-mcp-daemon** — демон авто-индексации
- **codegraph-graph** — графовая операционная система
- **codegraph-zerocopy** — zero-copy сериализация

## Agentic-инструменты

4 консолидированных инструмента для AI-агентов:

| Инструмент | Назначение |
|------------|------------|
| `agentic_context` | Поиск кода, сбор контекста, ответы на вопросы |
| `agentic_impact` | Анализ влияния изменений (зависимости, цепочки вызовов) |
| `agentic_architecture` | Общая архитектура, API-поверхности |
| `agentic_quality` | Оценка качества — сложность, связность, приоритеты рефакторинга |

## Индексация

### Команды:
```bash
# Индексация проекта
codegraph index /path/to/project -r -l rust,typescript,python

# Индексация с принудительным обновлением
codegraph index . --force

# Индексация с конкретным tier (fast/balanced/full)
codegraph index . --index-tier balanced

# Daemon mode (авто-индексация)
codegraph daemon start . --foreground
```

### Tiers индексации:
- **fast** — AST + core edges (быстро, низкое хранение)
- **balanced** — LSP + docs + module linking (сбалансировано)
- **full** — все анализаторы + dataflow + architecture (максимальная точность)

## Запуск MCP-сервера

### STDIO mode (для Claude Code, Cursor):
```bash
codegraph start stdio --watch
```

### HTTP mode (SSE streaming):
```bash
codegraph start http --host 127.0.0.1 --port 3000
```

## Конфигурация

### ~/.codegraph/config.toml:
```toml
[embedding]
provider = "ollama"
model = "qwen3-embedding:0.6b"
dimension = 1024

[llm]
provider = "anthropic"
model = "claude-sonnet-4"

[database.surrealdb]
connection = "ws://localhost:3004"
namespace = "ouroboros"
database = "codegraph"
```

### .env файл для проекта:
```
CODEGRAPH_SURREALDB_URL=ws://localhost:3004
CODEGRAPH_SURREALDB_NAMESPACE=ouroboros
CODEGRAPH_SURREALDB_DATABASE=codegraph
CODEGRAPH_EMBEDDING_PROVIDER=ollama
CODEGRAPH_LLM_PROVIDER=ollama
```

## Интеграция с AI-клиентами

### MCP config:
```json
{
  "mcpServers": {
    "codegraph": {
      "command": "codegraph",
      "args": ["start", "stdio", "--watch"]
    }
  }
}
```

## Поддерживаемые языки

Rust, Python, TypeScript, JavaScript, Go, Java, C++, C, Swift, Kotlin, C#, Ruby, PHP, Dart

## Embedding providers

- **Local:** Ollama, LM Studio, ONNX Runtime, Candle
- **Cloud:** OpenAI, Jina AI

## LLM providers (для agentic reasoning)

- **Local:** Ollama, LM Studio
- **Cloud:** Anthropic Claude, OpenAI, xAI Grok, OpenAI-compatible

## Agent architectures

```bash
# Rig (recommended, best performance with thinking models)
CODEGRAPH_AGENT_ARCHITECTURE=rig codegraph start stdio

# ReAct (traditional)
codegraph start stdio

# LATS (complex analysis)
CODEGRAPH_AGENT_ARCHITECTURE=lats codegraph start stdio
```

## Контекст-оверфлоу защита

```bash
CODEGRAPH_CONTEXT_WINDOW=128000
```

## Schema

```bash
cd schema && ./apply-schema.sh
```

## Быстрые команды

```bash
# Проверить, запущен ли SurrealDB
curl -s http://localhost:3004/health

# Проверить версию CodeGraph
codegraph --version

# Индексировать текущую директорию
codegraph index . --force

# Запустить MCP
codegraph start stdio
```
