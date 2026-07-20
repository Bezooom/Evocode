# Статус проекта Эвокод

**Срез:** 2026-07-20  
**Версия продукта:** **0.9.0 (Release Candidate 1)**  
**Текущая фаза:** ⚡ **F3 Hardening РФ / enterprise — Завершена**  
**Предыдущий milestone:** F2 Product IDE & F3 Hardening — закрыты (→ v0.9.0)

---

## Одной фразой

**Эвокод 0.9.0** — рабочая privacy-first AI-IDE: брендированный VSCodium («Эвокод») с изолированной визуальной средой для операторов (предпросмотр HTML/MD по умолчанию), защищенным локальным Core на `:8083` (DLP, авторизация, лимиты, безопасный импорт навыков), Midnight Fusion интерфейсом, умным роутером бесплатных моделей OpenRouter (`openrouter-auto`) и готовыми дистрибутивами deb + AppImage.

Это **релиз-кандидат (Release Candidate 1)** перед выходом стабильной версии 1.0.0. Система готова к пилотным испытаниям с закрытыми P0 уязвимостями.

---

## Версионирование (до 1.0)

| Версия | Смысл | Статус |
|--------|--------|--------|
| **0.1.x** | Core + agent tooling (F0–F1) | ✅ пройдено |
| **0.5.0** | Product IDE: brand, shell UI, packaging, Midnight Fusion | ✅ пройдено |
| **0.9.0** | F3 hardening: DLP/trust, proxy, auth, SSRF-защита, Operator Mode | ✅ **текущий релиз (RC1)** |
| **1.0.0** | Daily-use + pilot corp DoD ( smoke стабилен) | 📋 цель |

Схема: `MAJOR.MINOR.PATCH` pre-1.0 — **minor = продуктовый milestone**, не «ещё сырой 0.x ради 0.x».

---

## Запуск и порты

```bash
# Локальный LLM (Qwen / coder)
/home/bezoom/start_ik_ai_coder.sh

# Брендированная IDE (автостарт Core :8083)
npm run evocode
# или: npm run agent:launch
```

| Порт | Сервис | Статус |
|------|--------|--------|
| 8080 | llama-server (ik) | ✅ GPU path |
| **8083** | **Evocode Core** | ✅ |
| 8084 | nomic embeddings | 📋 optional |

Дистрибутивы (после `ide:package-*`):  
`packages/ide/dist/Evocode-0.9.0-x86_64.AppImage`, `evocode_0.9.0_amd64.deb`, portable `evocode-ide/`.  

---

## Готовность слоёв (честно)

| Слой | % | Факт |
|------|---|------|
| Стратегия / ТЗ | 95% | Спеки готовы; требования ТЗ (локальный инференс, DLP, визуальная изоляция) выполнены |
| Evocode Core | 95% | OpenAI API, SSE, роутер, безопасный импорт навыков, Bearer-авторизация, Rate Limiter |
| Local LLM wiring | 95% | Интеграция с локальным llama-server по умолчанию |
| Agent (Kilo features) | 90% | Ребрендинг интерфейса, замена текстовых маркеров, изолированный конфиг `evocode.json` |
| Product shell / UI | **95%** | Midnight Fusion, Activity Bar, значок настроек, кастомный редактор HTML/Markdown |
| Branded IDE + packaging | **95%** | Сборка дистрибутивов deb/AppImage v0.9.0, интеграция в меню приложений ОС |
| Enterprise F3 (Hardening) | **95%** | DLP Guard, Skill Sync (SHA/traversal/SSRF), local fonts, rate-limit, auth, аудит-логи |
| F4 self-evolve | 0% | Вне рамок текущих релизов |

---

## Что есть / чего нет

| ✅ Есть (v0.9.0 RC1) | ❌ Нет / Ограничения (не сертифицировано) |
|----------------------|-----------------------------------------|
| Брендированный IDE + shell с визуальным режимом оператора (без просмотра сырого кода) | Полный парсер GFM для Markdown (используется простой regex-рендерер) |
| DLP Guard: блокировка утечек в истории чата, replace-all маскирование ключей | Проверка SHA для навыков опциональна (если SHA не указан в манифесте, файл копируется) |
| Skill Sync: защита от SSRF-перенаправлений и Path Traversal выхода за пределы директории | Изменчивость бесплатных лимитов OpenRouter (best-effort роутер без жестких гарантий) |
| Сетевая защита: привязка к localhost, Bearer-авторизация, IP Rate Limiter | Государственная сертификация безопасности (система pilot-ready, не сертифицирована) |
| 100% Offline-режим работы без CDN-шрифтов | Поддержка облаков Яндекс/Giga, автообновления, подпись пакетов |
| Сборки deb/AppImage 0.9.0 + smoke-тесты | Автоматическое развёртывание локального бэкенда GPU-инференса |

---

## Документы

| Файл | Роль |
|------|------|
| [FULL_DEV_ROADMAP](../plans/FULL_DEV_ROADMAP.md) | **SoT для агентов** |
| [ROADMAP](../plans/ROADMAP.md) | Краткие фазы + очередь |
| [PRODUCT_SHELL](./PRODUCT_SHELL.md) | Chrome IDE, hotkeys |
| [POLICY_BRIDGE](./POLICY_BRIDGE.md) | Локальность / privacy modes |
| [CRITICAL_ANALYSIS](../CRITICAL_ANALYSIS.md) | Известный security debt |

---

## Следующий фокус (P0)

1. Проведение пилотных испытаний с участием операторов.
2. Сбор обратной связи по визуальному режиму отображения документов.
3. Финализация и подготовка стабильного релиза **1.0.0**.
