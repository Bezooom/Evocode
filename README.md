<div align="center">

# 🧬 Эвокод

**Российская privacy-first AI-IDE: VSCodium + Kilo/OpenCode agent + локальный Core**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0-brightgreen.svg)](https://nodejs.org/)

</div>

---

## Статус (честно)

| Слой | Состояние |
|------|-----------|
| **Продукт** | VSCodium + fork kilo-vscode + Evocode Core — [стратегия](plans/FORK_STRATEGY.md) |
| **Agent runtime** | **Не пишем свой** — Kilo/OpenCode ([borrow](docs/ARCHITECTURE_BORROW.md)) |
| **Evocode Core** | Router, DLP, skills, RAG, OpenAI `/v1/*`, attach llama — port **8083** |
| **F1 agent rebrand** | Tooling готов (`npm run agent:f1`); smoke E2E — F1.5 |
| **IDE shell** | Bootstrap VSCodium; дистрибутив — F2 |
| **Срез** | [docs/STATUS.md](docs/STATUS.md) · [plans/ROADMAP.md](plans/ROADMAP.md) |

> Не позиционируем v0.1 как «уже лучше Cursor». Сейчас — **фундамент + путь к IDE**.

---

## Архитектура

```
Adapters: VSCodium · Extension Host · ACP later
              │ HTTP+SSE
              ▼
     Kilo/OpenCode (tools, MCP, sessions)  ← as-is, rebrand UI
              │ OpenAI-compat
              ▼
     Evocode Core :8083  (DLP · router · skills · RAG · attach)
              │
     :8080 llama chat · :8084 embed · OpenRouter+DLP
```

Заимствования OpenCode / Grok Build: **[docs/ARCHITECTURE_BORROW.md](docs/ARCHITECTURE_BORROW.md)**.

---

## Quick start — demo AI-IDE

Один вход (простой UI + Kilo agent + Core), см. [docs/DEMO.md](docs/DEMO.md):

```bash
# optional: local llama
/home/bezoom/start_ik_ai_coder.sh

cd /home/bezoom/storage/Projects/Evocode
npm ci && npm run build
npm run evocode          # = npm run demo
```

```bash
npm run ide:install-desktop   # ярлык Ubuntu «Эвокод» (не VS Code)
npm run evocode
```

Профиль `~/.evocode-ide`. При старте — **Настройки программы** (модели + агент + Core).  
**Ctrl+Shift+M** — настройки · **Ctrl+L** — чат агента.  
См. [PRODUCT_SHELL.md](docs/PRODUCT_SHELL.md) · [RUNTIME.md](docs/RUNTIME.md).

### Только Core (без UI)

```bash
/home/bezoom/start_ik_ai_coder.sh
cp -n .env.example .env
PORT=8083 EVOCODE_LLAMA_MODE=attach npm start
curl -s localhost:8083/health | jq .
```

### Dev Extension Host (старый путь F1)

```bash
EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:f1
npm run agent:launch
```

### Порты

| Порт | Сервис |
|------|--------|
| 8080 | llama chat |
| **8083** | **Evocode Core** |
| 8084 | embeddings (профиль) |

Профили (абсолютные пути к моделям): [`config/profiles.json`](config/profiles.json).

---

## Документация

| Документ | О чём |
|----------|--------|
| [**FULL_DEV_ROADMAP**](plans/FULL_DEV_ROADMAP.md) | **полная карта для агентов (source of truth)** |
| [MIGRATION_PLAN](plans/MIGRATION_PLAN.md) | детальный план интеграции кросс-проектных компонентов |
| [STATUS](docs/STATUS.md) | текущий срез |
| [ROADMAP](plans/ROADMAP.md) | краткие фазы F0–F4 |
| [FORK_STRATEGY](plans/FORK_STRATEGY.md) | IDE + kilo + Core |
| [ARCHITECTURE_BORROW](docs/ARCHITECTURE_BORROW.md) | OpenCode / Grok — что брать |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | модули Core |
| [SMOKE](docs/SMOKE.md) | checklist E2E |
| [DISK_CLEANUP](docs/DISK_CLEANUP.md) | диск / keep |
| [TZ](docs/TZ.md) | полное ТЗ |
| [OPENAPI](specs/OPENAPI.md) | API reference |

---

## npm scripts

```bash
npm test
npm run type-check
npm run agent:f1          # rebrand + install provider
npm run agent:launch
npm run local:stack       # start_ik_* wrapper
npm run disk:audit
npm run bootstrap:ide
npm run migrate:kilo
```

---

## Core modules

| Модуль | Поведение |
|--------|-----------|
| InferenceEngine | **attach-first** к llama; spawn optional; no silent stubs |
| Smart Router | complexity + tokens + privacyMode; local→cloud fallback |
| DLP Guard | **cloud path only** |
| SkillLoader / Sync | system+user, GitHub MANIFEST |
| VectorIndex | SQLite-vec RAG |
| OpenAI API | `/v1/chat/completions`, `/v1/models` for Kilo |

---

## Roadmap (кратко)

| Фаза | Статус |
|------|--------|
| F0 Core | ✅ |
| F1 Agent rebrand tooling | ✅ |
| **F1.5 Smoke + Policy bridge** | ⚡ next |
| F2 VSCodium IDE | 📋 |
| F3 Sandbox / audit / Astra smoke | 📋 |
| F4 LoRA / self-evolve | later |

---

## Лицензия

[MIT](LICENSE). Уважать MIT VSCodium / Kilocode / OpenCode при сборках.

---

**Эвокод** — Приватность. OpenCode-class agent. Локальный мозг (Core).
