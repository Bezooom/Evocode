<div align="center">

# 🧬 Эвокод

**Российская privacy-first AI-IDE: VSCodium + agent + локальный Core**

[![Version](https://img.shields.io/badge/version-0.95.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0-brightgreen.svg)](https://nodejs.org/)

</div>

---

## Статус

| | |
|--|--|
| **Версия** | **0.95.0** — Release Candidate 2 |
| **Фаза** | F3 ✅ · Skill Router v2 + dual-model FIM |
| **Срез** | [docs/STATUS.md](docs/STATUS.md) · [plans/ROADMAP.md](plans/ROADMAP.md) · [CHANGELOG](CHANGELOG.md) |
| **SoT для агентов** | [plans/FULL_DEV_ROADMAP.md](plans/FULL_DEV_ROADMAP.md) |

> **v0.95.0 RC2** — pilot-ready AI-IDE: Operator Mode, DLP/auth, Skill Router (M1–M4), dual local models (chat + FIM).  
> Не «сертифицировано»; цель 1.0.0 — после пилотов.

---

## Архитектура

```
Adapters: VSCodium «Эвокод» · Extension Host · shell extension
              │ HTTP+SSE
              ▼
     Agent runtime (Kilo/OpenCode as-is, rebrand UI)
              │ OpenAI-compat
              ▼
     Evocode Core :8083  (DLP · router · skills · RAG · runtime · attach)
              │
     :8080 llama chat · :8082 FIM · :8084 embed · cloud via DLP/proxy
```

Заимствования: [docs/ARCHITECTURE_BORROW.md](docs/ARCHITECTURE_BORROW.md) · third-party: [NOTICE](NOTICE).

---

## Quick start

### Требования

- Node.js ≥ 20
- (опционально) `llama-server` + GGUF **вне** репозитория — пути в `config/profiles.json`
- (для сборки agent) upstream kilo-vscode: `export KILO_SRC=...`

### Core + IDE (dev)

```bash
git clone <repo-url> Evocode && cd Evocode
cp .env.example .env
# отредактируйте config/profiles.json под свои бинарники/модели ($HOME/...)
npm ci && npm run build

# если chat llama уже на :8080:
PORT=8083 EVOCODE_LLAMA_MODE=attach npm start

# branded IDE + auto Core:
npm run evocode
```

```bash
npm run ide:install-desktop   # ярлык Ubuntu «Эвокод»
npm run evocode
```

Профиль IDE: `~/.evocode-ide`.  
**Ctrl+Shift+M** — модели · **Ctrl+L** — чат · product panel — Модели / Агент / Cloud / Навыки / MCP / Программа.  
См. [PRODUCT_SHELL.md](docs/PRODUCT_SHELL.md) · [RUNTIME.md](docs/RUNTIME.md).

### Порты

| Порт | Сервис |
|------|--------|
| 8080 | llama chat |
| 8082 | FIM / autocomplete (лёгкая модель, обычно CPU) |
| **8083** | **Evocode Core** |
| 8084 | embeddings (профиль) |

Профили: [`config/profiles.json`](config/profiles.json) · шаблон: [`config/profiles.example.json`](config/profiles.example.json).  
Пути поддерживают `$HOME`, `${ENV}`, `~`.

### Дистрибутивы

```bash
npm run ide:package-portable
npm run ide:package-deb        # → packages/ide/dist/evocode_0.95.0_amd64.deb
npm run ide:package-appimage   # → Evocode-0.95.0-x86_64.AppImage
```

---

## Документация

| Документ | О чём |
|----------|--------|
| [**FULL_DEV_ROADMAP**](plans/FULL_DEV_ROADMAP.md) | полная карта (source of truth) |
| [STATUS](docs/STATUS.md) | текущий срез |
| [ROADMAP](plans/ROADMAP.md) | фазы F0–F4 |
| [FORK_STRATEGY](plans/FORK_STRATEGY.md) | IDE + agent + Core |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | модули Core |
| [SMOKE](docs/SMOKE.md) | checklist E2E |
| [OPENAPI](specs/OPENAPI.md) | API Core |
| [SECURITY](SECURITY.md) | политика безопасности |
| [CONTRIBUTING](CONTRIBUTING.md) | как собирать и слать PR |
| [skills/NOTICE](skills/NOTICE.md) | происхождение skills |

---

## npm scripts (главные)

```bash
npm test / npm run type-check
npm run evocode                 # product launch
npm run agent:f1                # rebrand + provider
npm run ide:refresh-brand       # rebrand + preinstall + shell + settings
npm run ide:package-portable
npm run local:stack
```

---

## Core modules

| Модуль | Поведение |
|--------|-----------|
| InferenceEngine | attach-first к llama; spawn optional; no silent stubs |
| Smart Router | complexity + tokens + privacyMode; local→cloud |
| DLP Guard | cloud path |
| SkillLoader / Router v2 | system+user, packs, hybrid embeddings |
| VectorIndex | SQLite-vec RAG |
| Runtime API | `/v1/runtime/*` — start/stop/switch профилей |
| OpenAI API | `/v1/chat/completions`, `/v1/models`, FIM |

---

## Roadmap (кратко)

| Фаза | Версия-ориентир | Статус |
|------|-----------------|--------|
| F0 Core | 0.1 | ✅ |
| F1 Agent rebrand | 0.1–0.2 | ✅ |
| F1.5 Smoke + Policy | 0.2–0.3 | ✅ |
| **F2 Product IDE** | **→ 0.5.0** | ✅ |
| **F3 Hardening РФ** | **→ 0.9.0 RC1** | ✅ |
| Skill Router + dual FIM | **→ 0.95.0 RC2** | ✅ |
| F4 Self-evolve | post-1.0 optional | 📋 later |
| Product DoD | **1.0.0** | 📋 |

---

## Лицензия

[MIT](LICENSE). Upstream и skills: [NOTICE](NOTICE).  
Уважайте лицензии VSCodium / Kilocode / OpenCode / отдельных skills при сборках и дистрибуции.

---

**Эвокод 0.95.0 RC2** — Приватность. Dual local LLM (chat + FIM). Skill Router v2. Operator Mode.
