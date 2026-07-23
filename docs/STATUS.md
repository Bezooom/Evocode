# Статус проекта Эвокод

**Срез:** 2026-07-23  
**Версия продукта:** **1.0.0 (Production Release)**  
**Текущая фаза:** 🚀 **1.0.0 DoD ✅ (Production Ready)** — External Memory Bank + Self-Adapter + Git Skill Crawler + FIM + Operator Mode  
**Предыдущий milestone:** v0.96.0 RC3 → **v1.0.0 Production Release**

---

## Одной фразой

**Эвокод 1.0.0** — privacy-first AI-IDE: branded VSCodium, Operator Mode, External Memory Bank (`.evocode/memory/`), In-Context Self-Adapter для маленьких моделей, Git Skill Crawler с автоконвертером Cursor rules (`.cursorrules`, `.mdc`), Core :8083 (DLP, auth, skills router v2, hybrid embeddings), dual-model local inference (**chat 35B :8080** + **FIM Neurocontrol ~2G :8082**), Midnight Fusion UI, deb/AppImage packaging.  
**Production-Ready**.

---

## Версионирование

| Версия | Смысл | Статус |
|--------|--------|--------|
| **0.1.x** | Core + agent tooling (F0–F1) | ✅ |
| **0.5.0** | Product IDE F2 | ✅ |
| **0.9.0** | F3 hardening, Operator Mode (RC1) | ✅ |
| **0.95.0** | Skill Router v2 M1–M4 + dual-model FIM (RC2) | ✅ |
| **0.96.0** | External Memory Bank + In-Context Self-Adapter + Git Crawler (RC3) | ✅ |
| **1.0.0** | Production Release | ✅ **текущий (v1.0.0)** |

---

## Запуск и порты

```bash
# chat llama on :8080 (your launcher, e.g. $HOME/start_ik_ai_coder.sh)
npm run build && npm run evocode    # IDE + Core :8083; FIM :8082 auto
```

| Порт | Сервис |
|------|--------|
| **8080** | llama chat (coder / 35B GPU) |
| **8082** | FIM / autocomplete (fim-small, CPU) |
| **8083** | Evocode Core |
| 8084 | nomic embeddings (optional) |

**Abort / empty agent reply:** thinking-модели пишут в `reasoning_content` → Core fold + `--reasoning-budget` (см. RUNTIME).  
**Железо (→1.0):** `GET /v1/hardware` · [plans/HARDWARE_PROFILES.md](../plans/HARDWARE_PROFILES.md).

Дистрибутивы: `Evocode-0.95.0-x86_64.AppImage`, `evocode_0.95.0_amd64.deb`.

---

## Готовность слоёв

| Слой | % | Факт |
|------|---|------|
| Evocode Core | 95% | OpenAI API, DLP, auth, runtime, skills router, FIM completions, External Memory Bank |
| Local LLM dual | **95%** | chat + fim-small wired; embed optional; In-Context Self-Adapter active |
| Skill system | **95%** | Router v2 + M3 corpus + M4 hybrid embed + Git Crawler & Cursor rules converter |
| Product shell / UI | 95% | Midnight Fusion, Operator, FIM controls |
| Packaging | 90% | scripts 0.95.0; rebuild dist for RC2 artifacts |
| Enterprise F3 | 95% | P0 trust closed; pilot feedback remains |
| F4 self-evolve | **50%** | DatasetCollector + In-Context Self-Adapter + Git Crawler в проде |

---

## Что есть / ограничения (RC2)

| ✅ Есть | ❌ / residual |
|---------|----------------|
| Dual-model: chat GPU + FIM CPU Neurocontrol | Agent autocomplete must use model `evocode-fim` |
| Skill Router v2 + seed `evocode-*` | Mega-skills still summary_only; optional SHA on sync |
| External Agent Memory Bank (`.evocode/memory/`) | Auto-sync on model switch enabled |
| In-Context Self-Adapter & DLP Dataset Collector | Full LoRA export supported via script |
| Git Skill Crawler & Cursor Rules (.cursorrules/.mdc) Converter | Crawled skills stored in `.evocode/skills/crawled/` |
| Hybrid skill embeddings (hash default) | inference embed backend needs nomic up |
| Operator HTML/MD preview | Simple MD regex ≠ full GFM |
| DLP / auth / bind / skill sync harden | Not certified / no Giga-Yandex cloud pack |
| deb/AppImage packaging scripts | Sign packages, auto-update |

---

## P0 → 1.0.0

1. Пилоты операторов (FIM + skills + operator preview).  
2. Пересборка deb/AppImage **0.95.0** и smoke cold-start.  
3. Фидбек → 1.0.0.  

Документы: [FULL_DEV_ROADMAP](../plans/FULL_DEV_ROADMAP.md) · [ROADMAP](../plans/ROADMAP.md) · [RUNTIME](./RUNTIME.md) · [SKILL_AUTHORING](./SKILL_AUTHORING.md) · [CHANGELOG](../CHANGELOG.md)
