# Статус проекта Эвокод

**Срез:** 2026-07-19 (post critical review)  
**Версия Core:** 0.1.0  
**Текущая фаза:** **F2 Product IDE** (не F3)

---

## Одной фразой

Стек **живой** (Core + local runtime + agent + VSCodium launcher), но это ещё **не** цельный продукт «Эвокод IDE» — agent = rebrand Kilo, editor = flatpak VSCodium, не свой binary.

---

## Запуск

```bash
# VSCodium (без Microsoft code)
cd /home/bezoom/storage/Projects/Evocode
npm run build
npm run evocode
```

| Порт | Сервис |
|------|--------|
| 8080 | llama chat (ik) |
| **8083** | **Evocode Core** |
| 8084 | embeddings |

---

## Готовность (честно)

| Слой | % | Факт |
|------|---|------|
| Стратегия / ТЗ | 85% | цель ясна; docs были впереди факта |
| Evocode Core | 65% | API+DLP+router+skills+`/v1/runtime` |
| Local LLM wiring | 70% | profiles + UI start/stop |
| Agent (Kilo features) | 65% | runtime as-is; native chrome partial |
| Product shell | 50% | panel + toolbar; dual UI shrinking |
| Branded IDE binary | 55% | portable `packages/ide/dist/evocode-ide` (VSCodium rebrand); full compile optional |
| Enterprise F3 | 0% | **не начинать** |
| Git history | ⚡ | baseline commit |

---

## Что есть / чего нет

| ✅ Есть | ❌ Нет / слабо |
|---------|----------------|
| Core + tests | Свой `evocode` binary / splash |
| Runtime models UI | Полный de-Kilo webview |
| Launcher → VSCodium flatpak | Daily-driver polish |
| Marketplace вырезан из package | Command IDs still `kilo-code.*` |
| Chat default on (shell) | First-run wizard |
| Product settings panel | F3 proxy/audit |

---

## Документы

| Файл | Роль |
|------|------|
| [FULL_DEV_ROADMAP](../plans/FULL_DEV_ROADMAP.md) | **SoT для агентов** |
| [ROADMAP](../plans/ROADMAP.md) | краткие фазы |
| [PRODUCT_SHELL](./PRODUCT_SHELL.md) | launcher / UX |
| [RUNTIME](./RUNTIME.md) | local LLM API |
