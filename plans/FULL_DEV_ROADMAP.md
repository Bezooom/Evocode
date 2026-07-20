# Эвокод — полная дорожная карта разработки (для агентов)

| Поле | Значение |
|------|----------|
| **Документ** | `plans/FULL_DEV_ROADMAP.md` |
| **Версия документа** | 3.1 |
| **Версия продукта** | **0.9.0** |
| **Дата** | 2026-07-20 |
| **Аудитория** | любой AI-агент / разработчик, впервые в репо |
| **Статус** | **единственный source of truth** по плану работ |
| **Язык** | русский (код/идентификаторы — как в репо) |

### Как агенту читать этот файл

1. Прочитай **§0–§3** (цель, запреты, текущее состояние) — обязательно.
2. F3 закрыта (milestone → v0.9.0). Текущий фокус — сбор фидбека по визуальному режиму и переход к F4/v1.0.
3. F2 & F3 **DONE**: branded portable/deb/AppImage, product shell, Midnight Fusion UI, DLP Guard, Smart free routing, Operator Mode.
4. После работы обнови **§12 Changelog** и статусы; при milestone — `package.json` version.
5. Не копируй GGUF; не пиши второй agent/MCP host; не используй Microsoft `code` как default.

### Связанные документы (детали, не дублировать слепо)

| Файл | Зачем |
|------|--------|
| `README.md` | quick start |
| `docs/STATUS.md` | краткий срез |
| `docs/ARCHITECTURE.md` | модули Core и планируемая архитектура |
| `docs/SMOKE.md` | checklist E2E |
| `docs/DISK_CLEANUP.md` | диск / keep paths |
| `docs/TZ.md` | полное ТЗ (aspirational) |
| `plans/MIGRATION_PLAN.md` | подробный план интеграции кросс-проектных компонентов |
| `plans/ROADMAP.md` | краткая версия фаз развития |
| `specs/OPENAPI.md` | HTTP API Core |
| `config/profiles.json` | llama profiles |
| `packages/agent-extension/README.md` | F1 agent |

При конфликте: **этот файл > MIGRATION_PLAN.md > ROADMAP.md > README**.

---

## §0. Продукт одной фразой

**Эвокод** — privacy-first AI-среда разработки для РФ:

```
VSCodium (brand «Эвокод»)
  + agent extension (rebrand kilo-vscode)
      + agent runtime = Kilo CLI = fork OpenCode  ← НЕ переписывать
  + Evocode Core (:8083)                           ← privacy plane
      + local llama-server (:8080) attach          ← БЕЗ копий GGUF
```

**Уникальность:** local-first LLM + DLP + router + skill sync + русский branded IDE.  
**Не уникальность:** agent loop / MCP / tools — это уже OpenCode/Kilo.

---

## §1. Жёсткие правила (NON-NEGOTIABLE)

### Делать

1. Agent runtime = **Kilo/OpenCode** (`/home/bezoom/kilocode`), UI rebrand в `packages/agent-extension`.
2. Core = **policy + local inference orchestration** (`src/`), порт **8083**.
3. GGUF и бинарники llama — **только абсолютные пути** (`config/profiles.json`), zero-copy.
4. DLP — **только cloud path**; local не слать в сеть.
5. Ошибки inference — **явные** (HTTP 503 / InferenceError), без silent stub-ответов «успех».
6. Тесты: `npm test` + `npx tsc --noEmit` после изменений Core.
7. Документация и UI-строки — на русском где пользователь видит.

### Не делать

| Запрет | Почему |
|--------|--------|
| Писать второй MCP host / tool executor в Core | Уже в OpenCode/Kilo |
| `cp` / дублировать GGUF в Evocode | Диск `/` был 96%; models ~90G |
| Клонировать весь microsoft/vscode без bootstrap | VSCodium path в F2 |
| Переписывать agent на Rust (Grok Build harness) | Только **паттерны** |
| Ставить default Core на 8080/8081 | 8080=chat, 8081=legacy embed |
| Включать в COMPARISON «уже умеем MCP/Astra» | Честный scope |
| Удалять `~/ik_llama.cpp`, `~/buun-llama-cpp`, `~/llama.cpp/models` | keep runtime |
| `rm -rf` без явного запроса пользователя | safety |

### Порты (запомнить)

| Порт | Сервис |
|------|--------|
| **8080** | llama-server chat (start_ik_*) |
| **8082** | FIM optional |
| **8083** | **Evocode Core** (default `PORT`) |
| **8084** | nomic embeddings (Evocode profile) |

---

## §2. Архитектура (слои)

```
┌─────────────────────────────────────────────────────────────┐
│ ADAPTERS                                                     │
│  VSCodium «Эвокод» (F2) · VS Code Extension Host (F1) · ACP │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + SSE
┌───────────────────────────▼─────────────────────────────────┐
│ AGENT RUNTIME = Kilo serve (OpenCode fork)                   │
│  packages: opencode, kilo-vscode, kilo-indexing, MCP, tools  │
│  Path on disk: /home/bezoom/kilocode                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ OpenAI-compatible
                            │ baseURL http://127.0.0.1:8083/v1
┌───────────────────────────▼─────────────────────────────────┐
│ EVOCODE CORE (this repo: src/)                               │
│  DLP · SmartRouter · SkillLoader/Sync · RAG · Inference      │
└───────────────────────────┬─────────────────────────────────┘
                            │
         local :8080 chat · :8084 embed · OpenRouter (via DLP)
```

### Заимствования (кратко)

| Источник | Брать | Не брать |
|----------|-------|----------|
| **OpenCode/Kilo** | serve, tools, MCP, SSE, providers, skills | rewrite |
| **Grok Build** | permissions pipeline, plan mode, sandbox, worktrees | Rust runtime, grok.com auth |
| **Portfolio** (Router, Neurocontrol…) | optional later only | MCP from Agent/ as rewrite |

Детали: `docs/ARCHITECTURE_BORROW.md`.

---

## §3. Текущее состояние (as-of 2026-07-20, product **v0.5.0**)

### 3.0. Версионирование продукта

| Версия | Milestone | Статус |
|--------|-----------|--------|
| 0.1.x | F0–F1 Core + agent tooling | ✅ |
| 0.2–0.4 | F1.5 + mid-F2 shell | ✅ (промежуточные) |
| **0.5.0** | **F2 Product IDE** (brand, UI, packaging) | ✅ **released** |
| 0.6–0.9 | F3 Hardening (trust, РФ, polish) | ⚡ next minors |
| **1.0.0** | F3 DoD / daily-use + pilot corp | 📋 target |

### 3.1. Репозиторий

```
Evocode/                          # /home/bezoom/storage/Projects/Evocode
├── src/                          # Core TypeScript (appVersion 0.5.0)
│   ├── index.ts                  # HTTP :8083, /v1/*, /chat, /health, runtime
│   ├── core/config.ts
│   ├── engine/ · router/ · guard/ · skills/ · sync/ · indexer/
├── config/profiles.json
├── packages/
│   ├── agent-extension/          # rebrand + brand CSS (Midnight Fusion)
│   └── ide/                      # shell extension, packaging, portable dist
│       ├── shell/extension/      # product-panel, models, chrome
│       └── dist/                 # evocode-ide, .deb, AppImage (gitignored)
├── skills/system|user/
├── tests/unit/                   # 32 tests (7 suites)
├── docs/ · plans/ · specs/ · scripts/
└── package.json                  # version 0.5.0
```

### 3.2. Фазы — статус (правда 2026-07-20)

| ID | Название | Статус |
|----|----------|--------|
| F0 | Core foundation | ✅ DONE |
| F1 | Agent rebrand tooling | ✅ DONE |
| F1.5 | Smoke + Policy bridge | ✅ DONE |
| **F2** | **Product IDE (native UX + packaging)** | ✅ DONE → **v0.5.0** |
| **F3** | **Hardening РФ / enterprise** | ⚡ **CURRENT** |
| F4 | Self-evolution (optional) | 📋 LATER (после 1.0) |

### 3.3. Вне репозитория (машина dev, bezoom)

| Путь | Назначение | KEEP? |
|------|------------|-------|
| `/home/bezoom/kilocode` | Kilo monorepo (agent) | YES |
| `/home/bezoom/ik_llama.cpp` | llama-server binary | YES |
| `/home/bezoom/buun-llama-cpp` | turbo/embed binary | YES |
| `/home/bezoom/llama.cpp/models` | GGUF weights | YES |
| `/home/bezoom/start_ik_ai_coder.sh` (+ ai2/3/4, embeddings, stop_ai) | LIVE launchers | YES |
| `~/.config/kilo` | kilo.json, skills | YES (provider evocode) |

**Удалено ранее (не восстанавливать без запроса):** beellama, turboquant-cuda, llama.cpp-tq3, ornith Q4_K_M, dead start_ai*, `~/.ollama`.

### 3.4. Команды (готовые)

```bash
cd /home/bezoom/storage/Projects/Evocode

npm ci && npm run build && npm test && npx tsc --noEmit

# Local LLM
/home/bezoom/start_ik_ai_coder.sh          # or: npm run local:stack

# Core
PORT=8083 EVOCODE_LLAMA_MODE=attach npm start

# Agent F1
EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:f1
npm run agent:launch

# Audit
npm run disk:audit
```

### 3.5. Известные gaps (после v0.5.0)

**Закрыто в F2 / v0.5:**

- [x] Branded portable `bin/evocode` + deb + AppImage scripts
- [x] Product panel (Модели · Агент · Cloud · Навыки · MCP · Программа)
- [x] Runtime `/v1/runtime/*` + models UI
- [x] Marketplace stripped; Microsoft `code` blocked in launcher
- [x] Midnight Fusion UI, layout AI-IDE, de-Kilo string pass
- [x] First-run wizard + SMOKE-IDE script
- [x] Isolated agent config `~/.config/evocode/agent/evocode.json`

**Открыто (F3 / → 0.6–1.0):**

- [ ] DLP: enforce `blocked` on OpenAI `/v1/chat/completions` path
- [ ] Skill Sync: path traversal, SHA verify, redirect/SSRF hardening
- [ ] Core default bind localhost + documented authToken for non-local
- [ ] Local fonts in webview (no Google Fonts CDN)
- [ ] DESIGN_SYSTEM.md = Midnight Fusion tokens (сейчас в спеке старый blue)
- [ ] Residual Kilo/React under the hood (skin ≠ full rewrite — OK by design)
- [ ] Splash/installer polish residual; signed packages
- [ ] РФ cloud (Yandex/Giga) + CA Минцифры
- [ ] F4 LoRA — не начинать

Детали security: `CRITICAL_ANALYSIS.md`.

---

## §4. Definition of Done продукта

### v0.5.0 (достигнут)

1. Запуск **Эвокод** (portable / deb / AppImage / `npm run evocode`), не Microsoft Code.
2. Чат агента + local LLM через Core :8083.
3. Единый product settings UI; brand «Эвокод».
4. `npm test` green; Core health с `version: 0.5.0`.

### v1.0.0 (горизонт, F3 DoD)

1. Все пункты v0.5 + trust: DLP block path, Skill Sync safe, auth/bind defaults.
2. Offline `privacyMode=always-local` без падений; cloud через proxy+audit.
3. Документированный pilot corp path (Astra smoke).
4. Cold-start: deb → first chat за один сценарий SMOKE.
5. Windows — nice-to-have.

---

## §5. Фазы — детальные задачи

---

### F0 — Core foundation ✅ DONE

**Цель:** privacy plane HTTP API.

| ID | Задача | Статус | Артефакты |
|----|--------|--------|-----------|
| F0.1 | HTTP server health/chat/index | ✅ | `src/index.ts` |
| F0.2 | OpenAI `/v1/chat/completions`, `/v1/models` | ✅ | same |
| F0.3 | InferenceEngine local+cloud fail-loud | ✅ | `src/engine/inference.ts` |
| F0.4 | DLP cloud-only | ✅ | `src/guard/dlp-guard.ts` |
| F0.5 | SmartRouter tokens+complexity | ✅ | `src/router/smart-router.ts` |
| F0.6 | SkillLoader + Sync | ✅ | `src/skills/*`, `src/sync/*` |
| F0.7 | VectorIndex RAG | ✅ | `src/indexer/vector-index.ts` |
| F0.8 | Unit tests + LICENSE + gitignore | ✅ | `tests/`, `LICENSE` |
| F0.9 | Attach-first + profiles.json | ✅ | `config/profiles.json`, `profiles.ts` |
| F0.10 | Core port 8083 | ✅ | `index.ts`, `.env.example` |

**DoD F0:** `npm test` green; `tsc` clean; health returns JSON.

---

### F1 — Agent rebrand tooling ✅ DONE (tooling)

**Цель:** extension identity «Эвокод» + default provider → Core.

| ID | Задача | Статус | Артефакты / команды |
|----|--------|--------|---------------------|
| F1.1 | Symlink kilo-vscode upstream | ✅ | `packages/agent-extension/upstream` |
| F1.2 | apply-rebrand.mjs | ✅ | `extension/package.json` generated |
| F1.3 | Defaults providerID=evocode modelID=evocode-auto | ✅ | overrides.json |
| F1.4 | install-provider → ~/.config/kilo | ✅ | `agent:install-provider` |
| F1.5 | agent:launch Extension Host | ✅ | `scripts/launch-extension.sh` |
| F1.6 | verify-f1.mjs | ✅ | `agent:verify` |
| F1.7 | Live smoke chat in Extension Host | ⚡ → F1.5 | `docs/SMOKE.md` |

**DoD F1 tooling:** `npm run agent:verify` pass; package name `evocode-agent`, publisher `evocode`.

**Не входит в F1:** rename всех command ID, иконки, VSIX marketplace publish.

---

### F1.5 — Smoke E2E + Policy bridge ✅ DONE

**Цель:** один надёжный happy-path + задел security.

#### F1.5.A — Smoke E2E

| ID | Задача | Acceptance | Files / cmds |
|----|--------|------------|--------------|
| F1.5.A1 | Прогнать `docs/SMOKE.md` end-to-end | Все checkbox; таблица «Результат» заполнена | `docs/SMOKE.md` |
| F1.5.A2 | curl `/v1/chat/completions` при live llama | content non-empty; no `[Fallback` | Core + llama |
| F1.5.A3 | health `localReady=true` when llama up | JSON field true | |
| F1.5.A4 | Extension sidebar «Эвокод» отвечает | manual note in SMOKE | `agent:launch` |
| F1.5.A5 | Зафиксировать known failures | issue list in STATUS or SMOKE | |

#### F1.5.B — Policy bridge

| ID | Задача | Acceptance | Notes |
|----|--------|------------|-------|
| F1.5.B1 | Design doc `docs/POLICY_BRIDGE.md` | modes: default / always-local / strict | Grok+OpenCode patterns |
| F1.5.B2 | Core middleware: enforce privacyMode on route | always-local never hits cloud | `smart-router` + tests |
| F1.5.B3 | DLP unit tests expanded | JWT/PEM/password cases | `tests/unit/dlp-guard.test.ts` |
| F1.5.B4 | Document kilo permission deny for network tools when always-local | snippet in POLICY_BRIDGE | config example, not full kilo fork |

#### F1.5.C — Embed + dual model prep

| ID | Задача | Acceptance |
|----|--------|------------|
| F1.5.C1 | Script or profile spawn nomic on **8084** only | does not use 8081 |
| F1.5.C2 | Core getEmbeddings prefers embed profile URL | profiles already; verify |
| F1.5.C3 | Optional FIM profile 8082 documented | profiles.json fim-small |

#### F1.5.D — Hygiene

| ID | Задача | Acceptance |
|----|--------|------------|
| F1.5.D1 | Align OPENAPI/SMOKE/STATUS after smoke | no 8081 as Core |
| F1.5.D2 | `npm run migrate:kilo` dry-run documented | skills paths |
| F1.5.D3 | Integration test mock llama HTTP (optional) | if time |

#### F1.5.E — Кросс-проектные оптимизации ядра

| ID | Задача | Источник | Acceptance |
|----|--------|----------|------------|
| F1.5.E1 | Параметры запуска llama-server (батчинг, KV-кэш) | `Tengri-Forge/` | Прописаны в `InferenceEngine.startLocalServer()` |
| F1.5.E2 | OpenAI-совместимый эндпоинт `/v1/chat/completions` | `openai_proxy.py` | Интегрирован в `src/index.ts`, принимает запросы от внешних SDK |
| F1.5.E3 | WebSocket Server для стриминга токенов | `Messenger/` | Добавлен в Core, чат отдает чанки токенов в реальном времени |

**DoD F1.5:**

- [x] SMOKE.md fully checked at least once on this machine
- [x] POLICY_BRIDGE.md exists
- [x] always-local cannot call OpenRouter (test)
- [x] OpenAI-совместимый API роут возвращает непустой ответ
- [x] WebSocket стриминг работает (проверено вручную)
- [x] agent:verify still green
- [x] FULL_DEV_ROADMAP §12 updated; F1.5 status → ✅

**Out of scope F1.5:** VSCodium build, LoRA fine-tuning, ML Smart Router v2, full command rename.

---

### F2 — Branded IDE (VSCodium) ✅ DONE → product **v0.5.0**

**Зависимость:** F1.5 DoD.  
**Цель:** бинарник/запуск «Эвокод» с preinstalled agent.

| ID | Задача | Источник | Acceptance |
|----|--------|----------|------------|
| F2.1 | VSCodium clone | ✅ | `packages/ide/vscodium` |
| F2.2 | product.evocode.json brand | ✅ | `ide:apply-brand` |
| F2.3 | Preinstall agent + shell | ✅ | extensions in `~/.evocode-ide` |
| F2.3b | Runtime API + models UI | ✅ | `/v1/runtime/*` |
| F2.3c | Native chrome (no marketplace; sidebar=new+history) | ✅ | apply-rebrand nativeChrome |
| F2.3d | **Единые настройки** (product panel = all settings) | ✅ | settings/profile → panel; chat default |
| F2.3e | Kill residual Kilo logos in assets | ✅ | overwrite kilo-*.svg/png |
| F2.4 | First-run wizard | ✅ | llama detect / skills |
| **F2.5** | **Branded portable IDE** | ✅ + deb | `ide:package-portable` → `dist/evocode-ide` (full compile still optional) |
| F2.6 | Rename command IDs | ✅ | after UX stable |
| F2.7 | Splash/About icons fully Evocode | ✅ | needs F2.5 |
| F2.8 | SMOKE-IDE E2E | ✅ | one script |
| F2.9 | Skills tree | ✅ | bulk in skills/system |

**DoD F2:**  
1) launch **Эвокод** (not MS Code);  
2) chat opens + local model path clear;  
3) **one** settings UI (models+agent+core);  
4) no Kilo marketplace/brand;  
5) preferably own binary name/icon in OS chrome.

**Do not (completed phase):** second MCP host; full microsoft/vscode hard-fork.

---

### F3 — Hardening (РФ / корп) ✅ CLOSED (product v0.9.0)

**Зависимость:** F2 / v0.5.0 DONE.  
**Фокус:** trust + enterprise path; UI polish residual secondary.

| ID | Задача | Source pattern | Acceptance |
|----|--------|----------------|------------|
| F3.1 | HTTP/SOCKS5 proxy for cloud | ✅ env proxy & ProxyAgent | env proxy works |
| F3.2 | Audit log cloud+DLP events | ✅ .evocode/audit.log | append-only file/DB |
| F3.3 | OS sandbox profile for kilo child | ✅ bubblewrap (bwrap) | workspace/strict docs+flag |
| F3.4 | Worktree-isolated subagents | Grok + Kilo AM | optional parallel safe |
| F3.5 | Prefer kilo-indexing for codebase | ✅ | Core RAG secondary |
| F3.6 | ACP adapter research/spike | ✅ | docs/ACP_ADAPTER.md |
| F3.7 | Astra Linux install smoke | ✅ docs | docs/ASTRA_LINUX.md |
| F3.8 | Core auth token for non-localhost | ✅ Bearer token | HTTP 401 for non-local |
| F3.9 | MCP settings CRUD | ✅ | isolated `evocode.json` mcp |
| F3.10 | Headless веб-сёрфинг | `Aist/` | optional |
| **F3.T1** | DLP `blocked` on OpenAI path | CRITICAL_ANALYSIS | unit + no leak when blocked |
| **F3.T2** | Skill Sync path/SHA/SSRF | CRITICAL_ANALYSIS | no `..` write; verify sha |
| **F3.T3** | Listen localhost-first + rate limit | security | default safe bind |
| F3.U1 | Local webview fonts | privacy | no Google CDN |
| F3.U2 | DESIGN_SYSTEM = Midnight Fusion | design | tokens match CSS |
| F3.U3 | Package artifacts named 0.9.0 | release | deb/AppImage rebuild |
| F3.U4 | Cold-start SMOKE (deb→chat) | QA | checklist green |

**DoD F3 / v0.9.0:** offline always-local + proxy + audit + trust P0 closed; visual Operator Mode; pilot corp path documented.

---

### F4 — Self-evolution (OPTIONAL / LATER)

**Только после F2.** Не начинать «для красоты roadmap».

| ID | Задача | Source | Note |
|----|--------|--------|------|
| F4.1 | LoRA job spawn (Python/Neurocontrol) | Neurocontrol | Фоновое дообучение мини-модели в `/home/bezoom/storage/Projects/Neurocontrol` |
| F4.2 | User coding style profile | ЭдТех-Комбайн | Персонализация стиля из `/home/bezoom/storage/Projects/ЭдТех-Комбайн` |
| F4.3 | Prompt feedback loop | Archon | Self-improvement loop из `/home/bezoom/storage/Projects/Archon` |
| F4.4 | ML Smart Router v2 | Router/ | TF-IDF МЛ-классификатор из `/home/bezoom/storage/Projects/Router` |

---

## §6. Порядок работ для агента (playbook)

### Если задача «продолжи Эвокод» без уточнения

1. Открой этот файл → **§5 F3** (✅ closed).
2. Приоритет: Задачи F3 полностью завершены. Фокус на сборе отзывов пилота и подготовке к 1.0.0.
3. Не начинай F4.
4. Доработки интерфейса или безопасности выполняются на основе обратной связи.

### Если задача «почини X»

1. Найди слой: Core `src/` vs agent-extension vs ide/shell vs external kilo/llama.
2. Не ломай attach-default.
3. Тесты + typecheck.
4. Обнови §12.

### Если задача «добавь MCP / agent tools»

1. **Стоп.** Реализуй в Kilo/OpenCode config / product-panel MCP tab, не новый host в Core.
2. Core только если нужен policy gate на egress.

### Чеклист перед PR / завершением сессии

- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] Нет новых silent stubs
- [ ] Порты не сломаны
- [ ] §12 changelog
- [ ] Чекбоксы фазы обновлены
- [ ] При релизе: version в package.json / config / packaging scripts согласованы

---

## §7. Карта кода Core (куда класть изменения)

| Изменение | Файл |
|-----------|------|
| HTTP routes | `src/index.ts` |
| Config / env | `src/core/config.ts` |
| Llama profiles | `config/profiles.json` + `src/core/profiles.ts` |
| Local/cloud call | `src/engine/inference.ts` |
| Routing decision | `src/router/smart-router.ts` |
| Secrets mask | `src/guard/dlp-guard.ts` |
| Skills inject | `src/skills/skill-loader.ts` |
| GitHub skills | `src/sync/skill-sync.ts` |
| RAG | `src/indexer/vector-index.ts` |
| Policy (new) | `src/policy/*` (create in F1.5) |
| Unit tests | `tests/unit/*.test.ts` |
| Agent rebrand | `packages/agent-extension/**` |
| IDE brand | `packages/ide/**`, `scripts/bootstrap-ide.sh` |

---

## §8. npm scripts (reference)

| Script | Action |
|--------|--------|
| `npm run build` | tsc → dist/ |
| `npm start` | node dist/index.js |
| `npm run dev` | ts-node src/index.ts |
| `npm test` | jest unit |
| `npm run type-check` | tsc --noEmit |
| `npm run agent:f1` | bootstrap+rebrand+provider+verify |
| `npm run agent:rebrand` | regenerate extension/ |
| `npm run agent:install-provider` | ~/.config/kilo + auth |
| `npm run agent:launch` | code --extensionDevelopmentPath |
| `npm run agent:verify` | F1 checks |
| `npm run local:stack` | start_ik_* by profile |
| `npm run disk:audit` | llama disk report |
| `npm run bootstrap:ide` | VSCodium clone |
| `npm run ide:apply-brand` / `ide:check-brand` | F2.2 product identity |
| `npm run ide:preinstall-agent` / `ide:verify-preinstall` | F2.3 agent into extensions dir |
| `npm run bootstrap:agent` | symlink kilo-vscode |
| `npm run migrate:kilo` | ~/.config/kilo → evocode |

---

## §9. Environment variables

| Var | Default | Meaning |
|-----|---------|---------|
| `PORT` | `8083` | Core HTTP |
| `EVOCODE_LLAMA_MODE` | `attach` | attach \| spawn |
| `EVOCODE_CHAT_PROFILE` | `coder` | profiles.json key |
| `EVOCODE_EMBED_PROFILE` | `embed-nomic` | |
| `EVOCODE_MODE` | `strict` | strict \| degraded |
| `EVOCODE_CORE_URL` | `http://127.0.0.1:8083/v1` | agent install-provider |
| `OPENROUTER_API_KEY` | empty | cloud |
| `LLAMA_PORT` / `LLAMA_HOST` / `LLAMA_BINARY` / `LLAMA_MODEL` | see config | overrides |

---

## §10. Риски и митигация

| Риск | Митигация |
|------|-----------|
| Диск `/` снова забит | no GGUF copy; disk:audit; models stay absolute |
| Kilo upstream updates break rebrand | regenerate apply-rebrand; pin kilo commit later |
| 35B OOM on 24GB | default profile **coder 27B**; ornith optional |
| Silent wrong answers | fail-loud policy; smoke forbids Fallback strings |
| Scope creep «форк VS Code с нуля» | F2 = VSCodium brand only |
| Agent reimplements tools in Core | §1 forbidden list |
| start_embeddings :8081 conflict | use 8084 in Evocode stack |

---

## §11. Метрики успеха по фазам

| Фаза | Метрика |
|------|---------|
| F0 | tests pass; health < 50ms |
| F1 | verify-f1 pass; package brand correct |
| F1.5 | smoke full; always-local no cloud |
| F2 | branded editor launch < 30s cold (target); chat works |
| F3 | offline always-local documented; proxy works |
| F4 | optional quality metrics only if shipped |

---

## §12. Changelog дорожной карты

| Дата | Изменение |
|------|-----------|
| 2026-07-20 | **v3.0 / product 0.5.0:** F2 closed as release; version bump; F3 current with trust P0; see changelog tail |
| 2026-07-19 | v1.0: создан FULL_DEV_ROADMAP; F0/F1 done; F1.5 current; OpenCode/Grok borrow principles |
| 2026-07-19 | Brand face: icons «Э», UI string patch, no VS Code welcome, hide secondary chat |
| 2026-07-19 | v1.1: добавлены кросс-проектные заимствования в фазы F1.5–F4 (Tengri-Forge, Messenger, Agent, Neurocontrol, etc.), обновлена очередь задач |
| 2026-07-19 | v1.2: Фаза F1.5 успешно завершена. Стриминг, OpenAI-прокси, авто-ID tool_calls и always-local роутинг полностью протестированы. Переход к Фазе F2. |
| 2026-07-19 | v1.3: **F2.2 done** — `apply-product-brand.mjs`: safe merge brand→vscodium/product.json (65 API proposals preserved); scripts `ide:apply-brand` / `ide:check-brand`; bootstrap-ide вызывает merge. |
| 2026-07-19 | v1.4: **F2.3 done** — `preinstall-agent.mjs`: stage rebranded agent → `~/.evocode-ide/extensions` (+ vscode if present); VSCodium system-extension hook when `vscode/` exists; `ide:preinstall-agent` / `ide:verify-preinstall`. |
| 2026-07-19 | v1.5: **Demo product surface (option 3)** — `npm run evocode`: Antigravity-like shell profile + `evocode-shell` (Core always-on, focus agent) + full Kilo agent preinstall; docs/DEMO.md. Pivot away from rename-only F2. |
| 2026-07-19 | v1.6: **P0 Runtime** — `GET/POST /v1/runtime/*` (start/stop/switch ik_llama & buun from profiles.json); shell «Модели» Ctrl+Shift+M; RU locale.json + language pack; docs/RUNTIME.md. |
| 2026-07-19 | v1.7: auto-start coder; activity bar «Модели» webview; safe RU i18n webview (quoted+keyPatches, 3.7k); shell 0.1.2. |
| 2026-07-19 | v1.8: **product shell 0.2** — unified panel Модели\|Агент\|Core; Ubuntu .desktop + --class Evocode; kill built-in chat/GitHub auth; open product on startup. |
| 2026-07-19 | v1.9: agent settings surface in product panel; new Э icon; `ide:build-codium` / prepare; launcher prefers codium over Microsoft code. |

---

## §13. Быстрый контекст для «холодного» агента

```
WHO:     Evocode = RU privacy AI IDE  |  product v0.5.0
WHERE:   /home/bezoom/storage/Projects/Evocode
RUNTIME: Core :8083 → llama :8080 (attach); agent = kilo rebrand + shell
NOW:     F3 Hardening (trust P0: DLP block, Skill Sync, bind/auth) — NOT F2, NOT F4
SHIPPED: F2 product IDE, Midnight Fusion UI, portable/deb/AppImage
NEVER:   second agent/MCP host; copy GGUF; Core on 8080; default Microsoft code
READ:    this file + plans/ROADMAP.md + docs/STATUS.md + docs/PRODUCT_SHELL.md
RUN:     npm run build && npm run evocode
TEST:    npm test && npx tsc --noEmit
```

---

## §14. Очередь (P0) — v0.5 → 0.6+

**F2 (закрыто):** settings, portable, de-Kilo UI, first-run, SMOKE-IDE, AppImage/deb.

**Сейчас (F3):**

1. **F3.T1** — DLP `blocked` на OpenAI-path + тесты  
2. **F3.T2** — Skill Sync path traversal / SHA / SSRF  
3. **F3.T3** — localhost bind default + auth docs  
4. **F3.U1–U4** — local fonts, design tokens, package rename 0.5.0, cold-start smoke  
5. Optional: full `ide:build-codium` when libsecret-dev available  

**Blocked:** F4 until F3 DoD / approach to v1.0.

---

## §12. Changelog (хвост)

| Дата | Изменение |
|------|-----------|
| 2026-07-19 | **v2.0 critical reset:** F2 = current (not F3); F2 DoD rewritten; queue = settings unify + git + branded binary; anti-patterns explicit |
| 2026-07-19 | **v2.2 webview de-Kilo:** brand/webview-dekilo.json strips Kilo Code/Gateway/marketplace/icons/URLs from webview bundles |
| 2026-07-19 | **v2.1 F2.5 portable:** download VSCodium tarball + rebrand product.json/icons → `packages/ide/dist/evocode-ide`; launcher prefers `bin/evocode` |
| 2026-07-19 | **v2.3 F2 completed:** built deb packaging script `ide:package-deb`; added `POST /v1/skills/sync` endpoint; integrated full multi-step first-run wizard in shell extension; added automated `SMOKE-IDE` E2E validation script. |
| 2026-07-19 | **v2.4 F2 Complete + F3 Start:** polished interfaces with custom cyberpunk neon styling; renamed command IDs from `kilo-code.*` to `evocode-agent.*`; implemented AppImage packaging in `ide:package-appimage`; fully transitioned to Phase F3. |
| 2026-07-19 | **v2.5 F3 Hardening:** integrated undici ProxyAgent for SOCKS5/HTTP cloud proxies (F3.1); added append-only JSON audit logging to `.evocode/audit.log` (F3.2); added test suites for audit logging. |
| 2026-07-19 | **v2.6 F3 Sandboxing & ACP:** integrated configuration and runtime logic for bubblewrap (`bwrap`) OS sandboxing profile (F3.3); completed ACP design note specification in `docs/ACP_ADAPTER.md` (F3.6). |
| 2026-07-19 | **v2.7 F3 Core Auth:** implemented security.authToken check for non-localhost HTTP requests, returning HTTP 401 Unauthorized for invalid tokens (F3.8); added server unit tests. |
| 2026-07-19 | **v2.8 F3 Kilo Indexing & Astra Linux:** implemented configuration option and routing check for `preferKiloIndexing` to avoid redundant prompt bloating (F3.5); created comprehensive Astra Linux installation guide in `docs/ASTRA_LINUX.md` (F3.7). |
| 2026-07-19 | **v2.9 F3 MCP Management:** settings tab «MCP Серверы» — list/add/delete in isolated agent config. Writes MCP schema: local `{type,command[]}` / remote `{type,url}`; display tolerates legacy `{command,args}`. Apply after agent window reload (F3.9). |
| 2026-07-19 | **v2.10 de-Kilo config paths:** canonical `~/.config/evocode/agent/evocode.json` (was `…/kilo/kilo.json`); env `EVOCODE_CONFIG_DIR` / `EVOCODE_DATA_DIR`; shadow `kilo.json` + `KILO_*` aliases for agent; rebrand patches agent to prefer `evocode.json`; shell settings keys `evocode-agent.*`. |
| 2026-07-20 | **v3.0 product v0.5.0:** version bump 0.1.0→0.5.0 across package/config/packaging; F2 officially closed as release; docs/STATUS+README+ROADMAP aligned; F3 = current with trust P0 (T1–T3) and UX hygiene (U1–U4); version scheme 0.5→0.6–0.9→1.0 documented. |
| 2026-07-20 | **F3 trust P0 (T1–T3) closed:** implemented full completions history DLP masking/blocking (F3.T1), Skill Sync path traversal protection/SHA-256 integrity/SSRF redirect prevention (F3.T2), localhost-first binding/enforced non-local auth token/IP rate limits (F3.T3). Rebuilt and verified all tests pass cleanly. |
| 2026-07-20 | **F3 UX/Offline (F3.U1, F3.U2) closed:** disabled external Google Fonts CDN imports in webviews (offline capability); updated typography design system documentation to match. |
| 2026-07-20 | **F3 Release Hygiene (F3.U3, F3.U4) closed:** rebuilt official installation packages as 0.5.0 artifacts (`.deb` + `.AppImage`); ran and verified E2E smoke tests successfully (zero regressions). |
| 2026-07-20 | **v3.1 product v0.9.0:** version bump 0.5.0→0.9.0 across package/config/packaging; F3 closed as completed release candidate; added Operator visual HTML/MD preview mode (F3.U4); added smart free-model OpenRouter routing (`openrouter-auto`); aligned Activity bar settings icons; updated root CHANGELOG.md; built and validated 0.9.0 packages. |

*Конец FULL_DEV_ROADMAP v3.1 · product 0.9.0.*
