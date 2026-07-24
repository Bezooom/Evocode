# Статус проекта Эвокод

**Срез:** 2026-07-24  
**Версия продукта:** **1.0.1**  
**Текущая фаза:** 🚀 **1.0.x Production** — hardware stack + полные multi-OS релизы  
**Базовый milestone:** v1.0.0 Production → **v1.0.1** maintenance

---

## Одной фразой

**Эвокод 1.0.1** — privacy-first AI-IDE: branded VSCodium с **встроенными** evocode-agent + evocode-shell + Core, Operator Mode, External Memory Bank, dual-model inference, **зонд железа** и рекомендация/скачивание стека моделей, full packaging (portable / deb / AppImage / win / mac).

---

## Версионирование

| Версия | Смысл | Статус |
|--------|--------|--------|
| **0.1.x** | Core + agent tooling (F0–F1) | ✅ |
| **0.5.0** | Product IDE F2 | ✅ |
| **0.9.0** | F3 hardening, Operator Mode (RC1) | ✅ |
| **0.95.0** | Skill Router v2 M1–M4 + dual-model FIM (RC2) | ✅ |
| **0.96.0** | External Memory Bank + Self-Adapter + Git Crawler (RC3) | ✅ |
| **1.0.0** | Production Release | ✅ |
| **1.0.1** | Hardware stack + full product OS releases | ✅ **текущий** |

---

## Запуск и порты

```bash
# chat llama on :8080 (your launcher)
npm run build && npm run evocode    # IDE + Core :8083; FIM :8082 auto
```

| Порт | Сервис |
|------|--------|
| **8080** | llama chat (coder / 35B GPU) |
| **8082** | FIM / autocomplete (fim-small, CPU) |
| **8083** | Evocode Core |
| 8084 | nomic embeddings (optional) |

**Железо:** `GET /v1/hardware` · UI **Настройки → Железо** · [plans/HARDWARE_PROFILES.md](../plans/HARDWARE_PROFILES.md).

**Упаковка:** [docs/PACKAGING.md](PACKAGING.md) · `npm run ide:package-all`.

Дистрибутивы 1.0.1:  
`packages/ide/dist/releases/evocode-{linux-x64,win32-x64,darwin-x64,darwin-arm64}-1.0.1.*`  
плюс `evocode_1.0.1_amd64.deb`, `Evocode-1.0.1-x86_64.AppImage` (после `ide:package-deb` / `ide:package-appimage`).

---

## Готовность слоёв

| Слой | % | Факт |
|------|---|------|
| Evocode Core | **98%** | OpenAI API, DLP, runtime, skills, hardware stack + model download |
| Local LLM dual | **95%** | chat + fim + embed; stack apply → profiles.local.json |
| Skill system | **95%** | Router v2 + M3/M4 + Git Crawler |
| Product shell / UI | **96%** | Midnight Fusion, Operator, FIM, **вкладка Железо** |
| Packaging | **95%** | full product multi-OS (agent+shell+Core), deb/AppImage |
| Enterprise F3 | 95% | P0 trust closed |
| F4 self-evolve | **50%** | DatasetCollector + Self-Adapter + Git Crawler |

---

## Что есть / residual (1.0.1)

| ✅ Есть | ❌ / residual |
|---------|----------------|
| Full product releases (not plain VSCodium) | Code signing / auto-update channel |
| Hardware probe + recommended dual-model stack | ROCm / Apple Metal detect |
| Catalog GGUF download (consent-only) | First-run wizard auto-open «Железо» |
| Prefer installed GGUF (e.g. Ornith) over catalog | Auto-start all profiles after apply+download |
| Dual-model chat GPU + FIM CPU | Agent autocomplete must use `evocode-fim` |
| External Memory Bank + Self-Adapter + Git Crawler | Full LoRA train still external script |
| deb/AppImage/portable scripts | Not certified for special OS marks |

---

## Команды проверки

```bash
npm run build && npm run test:unit
npm run test:smoke
npm run ide:productize:check
curl -s localhost:8083/v1/hardware | jq '.tier,.stack.chat.profileId'
```
