# Заимствования архитектуры: OpenCode, Kilo, Grok Build

**Дата:** 2026-07-19  
**Статус:** утверждённый архитектурный принцип  
**Связано:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [FORK_STRATEGY.md](../plans/FORK_STRATEGY.md) · [ROADMAP.md](../plans/ROADMAP.md)

---

## 1. Принцип

> **Не писать второй agent runtime.**  
> Agent loop = **OpenCode / Kilo** (уже на машине).  
> Уникальность Эвокод = **privacy plane (Core)** + **branded IDE** + **политика local-first для РФ**.

| Источник | Роль |
|----------|------|
| **OpenCode** (anomalyco) | Runtime: agents, tools, sessions, MCP, LSP, providers, HTTP+SSE |
| **Kilo** (`/home/bezoom/kilocode`) | Fork OpenCode + VS Code extension + gateway + indexing |
| **Grok Build** (xAI / `~/.grok/docs`) | Reference: permissions, plan mode, sandbox, worktrees, adapters |
| **Evocode Core** (`src/`) | DLP, router, attach llama, skill sync, RAG, OpenAI-compat policy endpoint |

---

## 2. Целевая схема (слои)

```
┌──────────────────────────────────────────────────────────────┐
│  Adapters (Grok-pattern)                                     │
│  VSCodium «Эвокод» · VS Code Extension Host · ACP · headless │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP + SSE (OpenCode-pattern)
┌────────────────────────────▼─────────────────────────────────┐
│  Agent runtime = Kilo/OpenCode (rebrand, не rewrite)         │
│  tools · MCP · sessions · plan/build · permissions · skills  │
└────────────────────────────┬─────────────────────────────────┘
                             │ OpenAI-compat  →  Core :8083/v1
┌────────────────────────────▼─────────────────────────────────┐
│  Evocode Core — UNIQUE                                       │
│  attach llama · router · DLP · skill sync · RAG · audit      │
└────────────────────────────┬─────────────────────────────────┘
                             │
         :8080 chat   :8082 FIM   :8084 embed   OpenRouter+DLP
```

---

## 3. Что уже «взято» (фактически)

| Паттерн | Источник | Состояние в Эвокод |
|---------|----------|-------------------|
| Thin client over CLI serve | OpenCode/Kilo | F1: extension → Core provider |
| OpenAI-compatible models | OpenCode providers | Core `/v1/chat/completions` |
| Skills system/user | Kilo + ТЗ | SkillLoader + Skill Sync |
| Local GGUF via llama-server | llama.cpp / ваши start_ik_* | attach-first, profiles.json |
| Privacy DLP on egress | ТЗ / Cursor-like | DLP cloud-only path |
| Hybrid local/cloud router | ТЗ | SmartRouter + privacyMode |

---

## 4. Что заимствовать дальше (приоритет)

### P0 — Policy bridge (OpenCode permissions + Core DLP)

**Идея Grok:** pipeline tool call → hooks → deny/ask/allow → mode.  
**Идея OpenCode:** `permission` в config.  
**Эвокод:** единая policy на:

1. Исходящий cloud (уже DLP)
2. Tools с сетью (web, MCP remote)
3. Shell с опасными командами (deny list)

**Артефакты:** `src/policy/` или hooks в kilo config + Core middleware.

### P1 — Plan mode (Grok)

- Session mode: `plan` | `build`
- В plan: read-only tools, writable только plan-file
- UI: утвердить план → build

**Не reinvent:** kilo modes Architect/Coder + жёсткий write-gate.

### P2 — Worktree subagents (Grok + Kilo Agent Manager)

- Параллельные субагенты в git worktree
- Не портить working tree пользователя

### P3 — OS sandbox (Grok)

- Profiles: `workspace` | `read-only` | `strict` (Landlock)
- `strict` + `privacyMode=always-local` → air-gapped сценарий / Astra later

### P4 — Indexing (Kilo)

- Предпочесть `kilo-indexing` для codebase context
- Core RAG — доп. privacy index / offline fallback

### P5 — ACP adapter (Grok / OpenCode)

- Agent Client Protocol: любой редактор, не только VS Code

---

## 5. Чего **не** заимствовать

| Не брать | Почему |
|----------|--------|
| Переписать agent на Rust (Grok harness) | Уже есть kilo 8 G monorepo + TS tooling |
| Auth grok.com / Kilo Cloud as default | Противоречит privacy-first / РФ |
| «247 skills» ради числа | Runtime injection важнее каталога |
| Второй MCP host в Core | MCP уже в OpenCode/Kilo |
| Собственный tool executor «как Agent/» | Дубль OpenCode tools |

---

## 6. Маппинг старых «доноров» портфолио

Старый ROADMAP тащил Router/Messenger/Agent как отдельные rewrite. Новый взгляд:

| Старый донор | Новый статус |
|--------------|--------------|
| `Router/` ML | optional Router v2 **после** Policy bridge; keyword router OK для v1 |
| `Messenger/` WS | SSE уже в kilo serve; Core streaming secondary |
| `Agent/` MCP | **не портить** — использовать kilo MCP |
| `openai_proxy.py` | **уже** Core `/v1/*` |
| `Tengri-Forge` / start_ik_* | **profiles.json** + attach (done) |
| `Neurocontrol` LoRA | later (Phase self-evolution), не блокер IDE |
| `Aist` browser | optional MCP tool, не core |

---

## 7. Definition of Done «архитектура зрелая»

- [ ] Один agent runtime (kilo), один policy plane (Core)
- [ ] Plan mode с write-gate
- [ ] Permission modes documented + default safe for RU offline
- [ ] Local attach + cloud DLP без silent stubs
- [ ] IDE brand path (VSCodium) не блокирует agent path
- [ ] Docs честно: нет «MCP Host ✅» пока не preinstalled + tested

---

*Документ фиксирует решения обсуждения 2026-07-19. Реализация — по ROADMAP фазам F1.5 / F2 / F3.*
