# Статус проекта Эвокод

**Срез:** 2026-07-20  
**Версия продукта:** **0.95.0 (Release Candidate 2)**  
**Текущая фаза:** ⚡ **Post-F3 RC** — Skill Router + dual-model FIM; пилоты → 1.0.0  
**Предыдущий milestone:** F3 Hardening → v0.9.0 RC1; Skill Router M1–M4 + FIM → **v0.95.0 RC2**

---

## Одной фразой

**Эвокод 0.95.0 RC2** — privacy-first AI-IDE: branded VSCodium, Operator Mode, Core :8083 (DLP, auth, skills router v2, hybrid embeddings), dual-model local inference (**chat 35B :8080** + **FIM Neurocontrol ~2G :8082**), Midnight Fusion UI, deb/AppImage packaging.  
**Pilot-ready** (не сертификация).

---

## Версионирование (до 1.0)

| Версия | Смысл | Статус |
|--------|--------|--------|
| **0.1.x** | Core + agent tooling (F0–F1) | ✅ |
| **0.5.0** | Product IDE F2 | ✅ |
| **0.9.0** | F3 hardening, Operator Mode (RC1) | ✅ |
| **0.95.0** | Skill Router v2 M1–M4 + dual-model FIM | ✅ **текущий (RC2)** |
| **1.0.0** | Daily-use + pilot feedback DoD | 📋 |

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

Дистрибутивы: `Evocode-0.95.0-x86_64.AppImage`, `evocode_0.95.0_amd64.deb`.

---

## Готовность слоёв

| Слой | % | Факт |
|------|---|------|
| Evocode Core | 95% | OpenAI API, DLP, auth, runtime, skills router, FIM completions |
| Local LLM dual | **95%** | chat + fim-small wired; embed optional |
| Skill system | **90%** | Router v2 + M3 corpus + M4 hybrid embed |
| Product shell / UI | 95% | Midnight Fusion, Operator, FIM controls |
| Packaging | 90% | scripts 0.95.0; rebuild dist for RC2 artifacts |
| Enterprise F3 | 95% | P0 trust closed; pilot feedback remains |
| F4 self-evolve | 0% | later |

---

## Что есть / ограничения (RC2)

| ✅ Есть | ❌ / residual |
|---------|----------------|
| Dual-model: chat GPU + FIM CPU Neurocontrol | Agent autocomplete must use model `evocode-fim` |
| Skill Router v2 + seed `evocode-*` | Mega-skills still summary_only; optional SHA on sync |
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
