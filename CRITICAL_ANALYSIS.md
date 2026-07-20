# Критический анализ состояния системы Эвокод

**Дата:** 2026-07-19 · **Версия Core:** 0.1.0 · **Фаза:** F2 (Product IDE)
**Аналитик:** оркестратор (проверка кода выполнена лично + 2 субагента)

---

## 0. Методология и достоверность

Анализ базируется на трёх источниках:
1. Личная вычитка ключевых модулей (`src/index.ts`, `src/guard/dlp-guard.ts`, `src/router/smart-router.ts`, `src/skills/skill-loader.ts`, `src/sync/skill-sync.ts`, `src/core/config.ts`).
2. Запуск `tsc --noEmit` (EXIT 0 — код компилируется) и `jest` (31 тест, 7 suites, всё PASS).
3. Отчёты субагентов `code-reviewer` и `code-skeptic`.

**Важная оговорка о достоверности.** Отчёт `code-reviewer` (`CODE_REVIEW_REPORT.md`) содержит **существенную долю ложных находок** (галлюцинаций):
- Утверждение «код не собирается из-за `data.choices?.[0]`» — **ЛОЖЬ**: `tsc` проходит чисто, `?.` — валидный TS-синтаксис.
- Утверждение «`skillLoader.invalidate()` не существует» — **ЛОЖЬ**: метод есть (`skill-loader.ts:159`).
- Утверждение «`if (sysIndex !== -1)` крашит» — **ЛОЖЬ**: условие корректно.
- Утверждение «`trimmed` — опечатка» — **ЛОЖЬ**: это локальная переменная цикла.

Поэтому в итоговый анализ включены ТОЛЬКО находки, **лично верифицированные** мной в коде или совпадающие с проверенным мной `security-audit`. Отчёт `code-skeptic` (`SECURITY_AUDIT.md`) по Skill Sync / SSRF / path traversal **подтверждается** прямым чтением кода.

---

## 1. Что система ИЗ СЕБЯ ПРЕДСТАВЛЯЕТ (реальность vs ТЗ)

Эвокод — это **не самостоятельная IDE**, а сборка из трёх заимствованных слоёв:
- **Editor:** VSCodium (flatpak/портативный билд), ребрендинг Kilo — `packages/ide`, `packages/agent-extension`.
- **Agent runtime:** Kilo/OpenCode as-is (tools, MCP, sessions) — в Core НЕ реализуется.
- **Evocode Core:** Node.js/TS HTTP-сервер (порт 8083) = privacy-plane. Модули: InferenceEngine, DLP Guard, Smart Router, Skill Sync, VectorIndex (RAG), OpenAI-compat API.

Это **честная и рабочая** архитектура (см. STATUS.md), но она **фундаментально отличается от ТЗ-ЭК-001**, который описывает «вкомпилированный llama.cpp в Electron», «двухмодельный FIM+Chat режим», «нативный MCP Host в Core». Эти пункты ТЗ **не выполнены** — реализован attach к внешнему llama-server.

### Расхождения ТЗ ↔ реальность

| ТЗ | Реальность | Статус |
|----|-----------|--------|
| FR-01 Вкомпилированный llama.cpp + FIM/Chat дуал | Attach к внешнему llama-server; FIM есть, но дуал-режим не гарантирован | ❌ частично |
| FR-03 SOCKS5/Keychain-хранение ключа | Только `HTTP_PROXY` env; ключ в `config.cloud.apiKey` (в памяти/конфиге) | ❌ |
| FR-05 diff по content-hash, soft-delete `removed`, archive | Сравнение полным содержимым; статус `removed` НЕ обрабатывается (только new/changed) | ⚠️ |
| FR-06 ONNX-эмбеддинги локально | llama.cpp `/v1/embeddings`; `search(..., 3)` хардкод k=3 | ⚠️ |
| FR-07 DLP блокирует критические утечки | Маскирует, но блокировка требует ≥3 совпадений; не применяется на `/chat` | ❌ |
| FR-08 Нативный MCP Host в Core | MCP живёт в Kilo, в Core отсутствует | ✅ по плану |

---

## 2. КРИТИЧЕСКИЕ проблемы (верифицированы лично)

### 2.1. [КРИТ] DLP-блокировка не проверяется в OpenAI-пути → утечка секретов
`src/index.ts:441-459` (облачная ветка `/v1/chat/completions`):
```ts
const dlpResult = await dlpGuard.processRequest({ prompt: userText, systemPrompt });
// ...маскировка применяется к сообщениям...
requestBody = { ...body, messages: maskedMessages };
// ❌ dlpResult.blocked НЕ проверяется — заблокированный запрос уходит в облако
```
В отличие от `smart-router.ts:131`, где `if (dlpResult.blocked) throw`, здесь блок игнорируется. Более того, маскировка применяется только к `role: 'user'` / `role: 'system'` сообщениям — секреты в **истории сообщений** (assistant/другие roles) или в `body` мимо messages не маскируются.

### 2.2. [КРИТ] POST /chat вообще не вызывает DLP
`src/index.ts:55-95` (`handleRequest`) строит pipeline skills→RAG→router→inference и **ни разу не обращается к `dlpGuard`**. При `decision === 'cloud'` (через `smartRouter.runCloud`) DLP применяется, но если запрос уходит локально — ок, а если облаком через `handleRequest`→`smartRouter.processRequest`→`runCloud` — применяется. Парадокс: DLP есть в `runCloud`, но **сам `/chat` endpoint не гарантирует его для всех веток** и не блокирует (см. 2.1). Главный риск — промпт с секретом может уйти мимо DLP при нетипичном флоу.

### 2.3. [КРИТ] Skill Sync: path traversal + отсутствие верификации
`src/sync/skill-sync.ts:150-180`:
```ts
const skillPath = path.join(localSkillsDir, skill.path); // skill.path из удалённого манифеста
...
fs.writeFileSync(skillPath, skillContent);               // запись без нормализации
```
- `skill.path` берётся из GitHub-манифеста без `path.normalize` / проверки на `..` → **запись в произвольный путь** (path traversal).
- `skill.sha` из манифеста НЕ сверяется с фактическим содержимым → нет верификации целостности (ТЗ FR-05.6 нарушен).
- Скачанный `SKILL.md` целиком инжектируется в system prompt (`skill-loader.ts:149`) → **prompt-injection** из удалённого источника.
- Нет TLS-pinning / подписи источника.

### 2.4. [ВЫСОК] SSRF через редиректы в fetchText
`src/sync/skill-sync.ts:218-240`: `fetchText` следует `3xx` редиректам рекурсивно без проверки `Location`. Злоумышленник (или скомпрометированный источник) может увести запрос на `http://169.254.169.254/` (metadata cloud) или внутренний сервис.

### 2.5. [ВЫСОК] Блокировка DLP требует ≥3 совпадений
`src/guard/dlp-guard.ts:93`:
```ts
const blocked = this.config.blockOnCritical && hasCritical && changes.length >= 3;
```
Один критический API-ключ в промпте **НЕ блокирует** отправку (только маскируется). А маскировка по `indexOf` заменяет только первое вхождение каждого match — повторяющиеся секреты остаются. JWT помечен `critical: false` (`config.ts:215`) — даже при blockOnCritical не блокирует.

### 2.6. [СРЕД] Открытый API по умолчанию
`src/index.ts`: `authToken=''` → `isAuthorized` всегда true для локальных; `listen(PORT)` без host → `0.0.0.0`; CORS `*`. Нет rate limiting. Если Core слушает на всех интерфейсах в сети РФ — любой может слать запросы (и триггерить облачные вызовы с вашим ключом).

### 2.7. [СРЕД] audit.log создаётся с правами 0644
`src/guard/dlp-guard.ts:139-151`: `fs.mkdirSync` + `fs.appendFileSync` без `mode`. В многопользовательской системе метаданные (правила, факт маскировки) читаемы другими. ТЗ §6 требует отсутствия секретов в логах — соблюдается (пишутся только метаданные), но права слабые.

### 2.8. [СРЕД] Висячие child-процессы llama
`runtime-manager.ts`: `this.children` Map — в памяти. После рестарта Core процессы llama не убиваются (только `killPort`). `fuser -k <port>` может убить чужой llama-server в attach-режиме. Нет глобального `SIGTERM`/`exit` handler для graceful shutdown.

### 2.9. [НИЗ] Документация рассинхронизирована
- ARCHITECTURE.md пишет «DLP: 4 regex-правила» — в коде 6.
- ARCHITECTURE.md mermaid: порт сервера 8081, коммент 8081, код 8083 — три значения.
- ARCHITECTURE.md схема БД `embedding BLOB` vs реальная `vec0` virtual table.
- STATUS.md пишет готовность Core 65%, но реальных автотестов критичных модулей (Router, Sync) — 0% рабочего покрытия DLP-processRequest не протестирован.

---

## 3. Что РАБОТАЕТ хорошо

- Код **компилируется** (`tsc --noEmit` EXIT 0), тесты **проходят** (31/31).
- Модульная, читаемая структура `src/` (engine/guard/router/sync/indexer/skills/core).
- Разумный privacy-by-design замысел: DLP только на cloud-пути, local не уходит в сеть.
- Skill override-механизм (user > system) реализован корректно (`skill-loader.ts`).
- Launcher/брендинг/IDE-shell доведены до запускаемого состояния.
- Есть базовая auth-проверка (`isAuthorized`) и CORS-заголовки.

---

## 4. Оценка зрелости

| Слой | Оценка | Комментарий |
|------|--------|-------------|
| Core (сборка/тесты) | 75% | компилируется, 31 тест зелёный |
| DLP / Privacy | **35%** | логика есть, но блокировка сломана, `/chat` мимо DLP |
| Skill Sync | **30%** | path traversal, нет верификации, prompt-injection |
| Security (API) | **40%** | открытый по умолчанию, SSRF |
| Документация | 60% | рассинхрон с кодом |
| Product IDE | 55% | запускается, не daily-driver |

**Общая оценка зрелости Core: ~55-60%.** Это рабочий прототип/фундамент, НЕ готовый продукт. Главный риск — **privacy-обещание ТЗ фактически не выполняется** из-за 2.1–2.5.

---

## 5. Приоритетные действия (что чинить в первую очередь)

1. **P0** — В `index.ts` облачной ветке проверить `dlpResult.blocked` и бросать `DLPBlockedError` (как в `smart-router.ts:131`). Применять DLP ко всем частям запроса, не только user/system.
2. **P0** — Skill Sync: `path.normalize` + проверка, что `skillPath` находится внутри `localSkillsDir` (whitelist prefix). Сверять `sha` из манифеста с `sha256(content)`. Отключить рекурсивные редиректы вне доверенного домена (SSRF).
3. **P0** — DLP: убрать `changes.length >= 3` → блокировать при `hasCritical` (один критический ключ достаточен). Заменять ВСЕ вхождения, а не первое. Пометить JWT `critical: true`.
4. **P1** — API: bind на `127.0.0.1` по умолчанию; требовать `authToken` если не localhost; добавить простейший rate limit.
5. **P1** — Graceful shutdown llama-процессов; запрет `fuser -k` убивать чужие серверы.
6. **P2** — Синхронизировать docs (ARCHITECTURE.md: порт, число правил, схема БД) с кодом. Дописать тесты на `dlpGuard.processRequest` (блокировка) и `skill-sync` (path traversal / offline).
7. **P2** — audit.log с `mode: 0o600`.

---

*Примечание: файлы `CODE_REVIEW_REPORT.md` и `SECURITY_AUDIT.md`, сгенерированные субагентами, содержат доп. детали, но `CODE_REVIEW_REPORT.md` частично недостоверен (см. раздел 0).*
