# Стратегия продукта: форк VS Code + Kilocode → «Эвокод»

**Статус:** утверждённый продуктовый путь  
**Дата:** 2026-07-19 (обновлено: runtime attach, F1 tooling, borrow architecture)  
**Цель:** реальная AI-IDE для РФ (privacy-first), а не только HTTP-backend.

**Связанные документы:** [ROADMAP](./ROADMAP.md) · [ARCHITECTURE_BORROW](../docs/ARCHITECTURE_BORROW.md) · [STATUS](../docs/STATUS.md)

---

## 1. Что означает «форк» на практике

| Вариант | Суть | Вердикт для Эвокод |
|---------|------|-------------------|
| **A. Hard-fork `microsoft/vscode`** | Полный Electron-форк, свой `product.json`, свой marketplace | Долгосрочно возможно; поддержка upstream = отдельная команда |
| **B. Branded shell на VSCodium/Code-OSS** | Сборка OSS VS Code с брендом «Эвокод», без telemetry Microsoft, preinstall extension | **Основной путь v1** |
| **C. Только extension** | Расширение в stock VS Code | Не «свой редактор», но полезный промежуточный шаг |

**Выбор v1:** **B + форк `kilo-vscode` + Evocode Core**.

Почему не «с нуля свой Electron»:

- У вас уже есть **Kilocode monorepo** (`/home/bezoom/kilocode`, 8.4 G) — agent loop, MCP, autocomplete, indexing, OpenRouter/OpenAI-compatible providers.
- У вас уже есть **рабочая конфигурация kilo** (`~/.config/kilo`: 148 skills, agents, MCP).
- Cursor/Windsurf — hard-fork; Kilo/Continue/Cline — extension. Эвокод берёт **сильную agent-часть Kilo** и **оболочку VSCodium**, плюс **свой privacy-backend**.

Hard-fork Microsoft VS Code (полный `product.json` + свои патчи workbench) — **фаза 2**, когда branded VSCodium + extension уже стабильны.

---

## 2. Целевая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│  Adapters: VSCodium «Эвокод» · Extension Host · ACP later   │
│  preinstalled: evocode-agent (fork kilo-vscode / OpenCode)  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + SSE (agent runtime)
┌───────────────────────────▼─────────────────────────────────┐
│  Kilo CLI serve = OpenCode runtime (НЕ переписываем)        │
│  tools · MCP · sessions · permissions · skills              │
└───────────────────────────┬─────────────────────────────────┘
                            │ OpenAI-compat → Core :8083/v1
┌───────────────────────────▼─────────────────────────────────┐
│  Evocode Core — privacy plane                               │
│  attach llama · router · DLP · skill sync · RAG             │
└───────────────────────────┬─────────────────────────────────┘
                            │
         :8080 chat   :8082 FIM   :8084 embed   OpenRouter+DLP
```

Паттерны OpenCode / Grok Build: [ARCHITECTURE_BORROW.md](../docs/ARCHITECTURE_BORROW.md).

**Роли:**

| Компонент | Источник | Роль |
|-----------|----------|------|
| IDE shell | VSCodium / Code-OSS | Редактор, расширения, терминал, git |
| Agent UI + tools | fork `kilo-vscode` | Чат, modes, MCP UI (OpenCode under the hood) |
| Agent runtime | Kilo `opencode` package | tools, sessions, SSE — **as-is** |
| Indexing | `kilo-indexing` (prefer) + Core RAG | codebase context |
| Privacy brain | **Evocode Core** | local attach, DLP, router, skill sync |
| GGUF / llama | `~/ik_llama`, `~/buun`, `~/llama.cpp/models` | **без копий**, profiles.json |
| User content | `~/.config/kilo` → `~/.config/evocode` | skills, agents, rules |

---

## 3. Что реально возможно (feature matrix)

### Must-have v1 (реально)

| Функция | Как |
|---------|-----|
| Русский брендинг IDE | `product.json`: nameShort=Эвокод, applicationName=evocode |
| AI-agent как в Kilo | fork kilo-vscode → publisher `evocode` |
| Локальный LLM | Core + llama-server; OpenAI-compat для extension |
| Dual-model FIM + Chat | два инстанса/порта или sequential; модели 1.5B + 7–14B |
| Hybrid router local/cloud | Core Smart Router + fallback |
| DLP на cloud | Core, только исходящий cloud path |
| Skill system/user + sync | Core Skill Sync + загрузка в system prompt / kilo skills paths |
| MCP (filesystem, terminal) | уже в Kilo; sandbox-политики — доработка |
| OpenRouter + HTTP/SOCKS proxy | Core cloud client |
| Offline-режим | local only, sync skip |
| Сборка Linux (в т.ч. Astra-like) | VSCodium build pipeline; полная сертификация Astra — later |

### Nice-to-have v1.5

| Функция | Как |
|---------|-----|
| Фоновый RAG workspace | Core indexer + file watcher |
| Streaming SSE/WS | Core + extension client |
| Аудит-лог cloud/DLP | Core |
| Импорт kilo config 1-клик | migration script из `~/.config/kilo` |

### Later / не в v1

| Функция | Почему later |
|---------|--------------|
| LoRA self-training | Сложно, VRAM, отдельный Python pipeline |
| Полный hard-fork + свой marketplace | Тяжёлая поддержка upstream |
| JetBrains native | Отдельный product track (kilo-jetbrains есть) |
| SSO/RBAC multi-user server | Enterprise phase |
| «247 skills из коробки» как маркетинг | Runtime skills важен раньше количества |

---

## 4. Структура monorepo (целевая)

```
Evocode/
├── src/                      # Evocode Core (текущий TS-сервер)  ← privacy brain
├── skills/                   # system + user skills
├── packages/
│   ├── ide/                  # scripts + product.json patches для VSCodium
│   ├── agent-extension/      # git submodule / vendor fork kilo-vscode
│   └── desktop/              # упаковка AppImage/deb/nsis (electron-builder / vscodium)
├── scripts/
│   ├── bootstrap-ide.sh      # clone VSCodium + apply brand
│   ├── bootstrap-agent.sh    # link/copy kilo-vscode as agent-extension
│   ├── migrate-kilo-config.sh
│   └── build.sh
├── plans/FORK_STRATEGY.md    # этот документ
├── docs/
└── tests/
```

**Диск:** полный clone Code-OSS/VSCodium ~несколько GB. Класть в  
`/home/bezoom/storage/Projects/Evocode/packages/ide/vscodium` (на storage, не на root 18 G).

**Не коммитить** дерево VSCodium в git — только patches + scripts; upstream как submodule или shallow clone в bootstrap.

---

## 5. Этапы (сжатый план)

### Phase F0 — Foundation ✅

1. P0 Core: fail-loud, DLP cloud-only, router tokens, skill loader, OpenAI API.
2. Attach-first llama + `config/profiles.json` (пути к GGUF, без копий).
3. Core port **8083**; LICENSE, gitignore, tests.

### Phase F1 — Agent rebrand ✅ tooling

1. `packages/agent-extension` + rebrand → publisher `evocode`, UI «Эвокод».
2. Default provider → `http://127.0.0.1:8083/v1`.
3. `agent:launch` Extension Development Host.
4. Command IDs still `kilo-code.*` until F2.

### Phase F1.5 — Smoke + Policy ⚡ NEXT

1. [SMOKE.md](../docs/SMOKE.md) end-to-end.
2. Policy bridge (OpenCode permissions + Core DLP) — see ARCHITECTURE_BORROW.
3. Plan mode write-gate; embed :8084.
4. `migrate:kilo` smoke.

### Phase F2 — Branded IDE

1. VSCodium + `product.evocode.json`.
2. Preinstall agent + Core sidecar.
3. First-run wizard; Linux AppImage smoke.
4. Optional `evocode.*` command rename.

### Phase F3 — Hardening РФ / корп

1. Proxy, audit log, always-local policy.
2. OS sandbox (Grok-pattern), worktree subagents.
3. kilo-indexing; ACP; Astra smoke (not certification day-1).

---

## 6. Принципы (чтобы не скатиться в paper architecture)

1. **IDE path is non-negotiable** — Core существует ради IDE, не вместо неё.
2. **Reuse Kilo, don't rewrite agents** — agent loop уже есть.
3. **Core = privacy & routing** — то, чего нет «из коробки» у Kilo для РФ.
4. **Честный scope** — не писать в COMPARISON «MCP Host ✅», пока не preinstalled и не tested.
5. **Один happy-path** — открыл Эвокод → локальная модель отвечает → cloud только через DLP.

---

## 7. Локальные источники (уже на машине)

| Путь | Использование |
|------|----------------|
| `/home/bezoom/kilocode` | upstream agent monorepo |
| `/home/bezoom/kilocode/packages/kilo-vscode` | base extension |
| `/home/bezoom/kilocode/packages/kilo-gateway` | OpenAI/OpenRouter providers |
| `/home/bezoom/kilocode/packages/kilo-indexing` | codebase index (optional) |
| `/home/bezoom/.config/kilo` | skills, agents, mcp, kilo.json |
| `/home/bezoom/storage/Projects/Skills` | доп. skill library |
| `/home/bezoom/storage/Projects/Evocode/src` | privacy core |

---

## 8. Definition of Done для «это уже IDE, не протокол»

- [ ] Пользователь запускает **приложение Эвокод** (не `npm start` + curl).
- [ ] Встроенный agent (форк Kilo) чатится через **локальный** Core.
- [ ] Inline/FIM completion от лёгкой модели.
- [ ] Cloud-запрос (если включён) проходит DLP; секреты не уходят.
- [ ] Skills из system/user реально влияют на поведение агента.
- [ ] Сборка Linux без ручной установки 10 сервисов.

---

*Документ задаёт направление. P0 Core + bootstrap — первый исполняемый шаг.*
