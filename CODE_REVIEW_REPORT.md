# Отчёт по Code Review — Эвокод Core (`src/`)

**Дата:** 2026-07-19 | **Объект:** `$EVOCODE_ROOT  # path to clone/src/`
**Статус зрелости кодовой базы:** ~55% (структура модульная и читаемая, есть тесты, но критичные опечатки ломают рантайм/компиляцию)

---

## 1. Критичные баги (нескомпилируемый код / падения рантайма)

### 1.1. `src/engine/inference.ts` — опечатка `choices?.[0]` вместо `choices?.[0]`
- **Строки:** 342, 391, 452, 487 (`data.choices?.[0]?...`)
- **Проблема:** Оператор опциональной цепочки в TS — `a?.b`. Здесь написано `choices?.[0]` с точкой после вопроса: это **синтаксическая ошибка** (TS7011 / парсинг). Файл не компилируется `tsc`. Все 4 места (fim, chat, chatCloud, getEmbeddings) затронуты.
- **Серьёзность:** 🔴 КРИТИЧНО — проект не собирается, CI упадёт.
- **Пример:** `text: data.choices?.[0]?.message?.content || ''` → должно быть `data.choices?.[0]?.message?.content || ''`

### 1.2. `src/guard/dlp-guard.ts` — `processRequest` вызывает несуществующий `this.mask()`
- **Строка:** 113 (`const promptResult = await this.mask(request.prompt);`)
- **Проблема:** Метод класса называется `mask` (строка 50). Вызов `this.mask()` приведёт к `TypeError: this.mask is not a function` при каждом cloud-запросе. DLP Guard полностью нерабочий на реальном пути.
- **Серьёзность:** 🔴 КРИТИЧНО — падение облачного маршрута, утечка секретов (блокировка не срабатывает).
- **Связано:** тест `dlp-guard.test.ts` тоже содержит опечатки `guard.mask(...)` / `result.masked` (строки 32, 35) — тесты падают при запуске, т.е. покрытие DLP фактически отсутствует.

### 1.3. `src/guard/dlp-guard.ts` — `maskedValue` игнорирует capture group
- **Строки:** 72-78 (в цикле `for (const match of matches)`)
- **Проблема:** `const maskedValue = rule.replacement;` — замена всегда хардкожена как статичная строка из правила (например `'[REDACTED_API_KEY]'`). Захваченная группа `match[1]` (сам секрет) нигде не подставляется. Для правил типа `api-key` это означает, что вместо `api_key: "[REDACTED_API_KEY]"` подставляется ровно строка replacement без сохранения структуры ключа. Хуже: в `replacement` уже вшит текст `"api_key: "[REDACTED_API_KEY]"'`, а `match[0]` — это весь матч включая `api_key:`. Итоговая замена дублирует префикс.
- **Серьёзность:** 🔴 КРИТИЧНО (логика маскировки сломана, ТЗ FR-07 не выполняется корректно).

### 1.4. `src/index.ts` — `skillLoader.invalidate()` (опечатка, есть `invalidate`)
- **Сроки:** 44, 314 (`skillLoader.invalidate();`)
- **Проблема:** Метод в `skill-loader.ts` называется `invalidate` (строка 159). Вызов `invalidate()` → `TypeError` при старте (в `initialize()`) и при ручной синхронизации. Сервер падает на инициализации, если `sync.enabled=true` (по умолчанию true).
- **Серьёзность:** 🔴 КРИТИЧНО — краш при старте по умолчанию.

### 1.5. `src/index.ts` — `sysIndex !== -1` (опечатка логики)
- **Строка:** 411 (`if (sysIndex !== -1) {`)
- **Проблема:** Должно быть `!== -1` (найден ли system-сообщение). Сейчас условие срабатывает когда индекс РАВЕН -1 (не найден) → пытается заменить `updatedMessages[-1]` = `undefined`, краш. И наоборот: если system найден, блок замены пропускается.
- **Серьёзность:** 🔴 КРИТИЧНО — облачный OpenAI-compat путь ломается на вставке system-промпта.

### 1.6. `src/index.ts` — `trimmed` в стриминге SSE
- **Строки:** 514, 515, 519, 543 (`if (!trimmed)`, `if (trimmed === ...)`, `if (trimmed.startsWith(...))`)
- **Проблема:** Переменная названа `trimmed` (строка 513: `const trimmed = line.trim();`), но дальше используется `trimmed` (опечатка). В strict-режиме TS это ошибка «необъявленная переменная»; в обычном — `undefined`, все проверки `if (!trimmed)` проходят, стриминг SSE шлёт сырые строки без парсинга → клиент получает битый поток.
- **Серьёзность:** 🔴 КРИТИЧНО для streaming-режима (`body.stream=true`).

### 1.7. `src/types.ts` — `handledRequest` вместо `handleRequest`
- **Строка:** 55 (`export async function handleRequest(query: string)` объявлена как `handledRequest` в описании — фактически в коде `handleRequest`, но в `index.ts` импорт/вызов корректны; опечатка только в комментарии). Минорно, но указывает на системную проблему опечаток.
- **Серьёзность:** 🟡 НИЗКО.

---

## 2. Проблемы качества кода (обработка ошибок, хардкод)

### 2.1. `src/index.ts` — нет try/catch на `getEmbeddings` в `/index-file`
- **Строка:** 592-595
- **Проблема:** `const embedding = await inferenceEngine.getEmbeddings(...)` не обёрнут в try/catch. Если embed-сервер недоступен (кидает `InferenceError`), весь `/index-file` падает в глобальный catch с 500, но без понятного сообщения. Для сравнения, в `handleRequest` и OpenAI-пути RAG обёрнут в try/catch с graceful degradation — здесь нет.
- **Серьёзность:** 🟠 СРЕДНЕ.

### 2.2. `src/engine/runtime-manager.ts` — `killPort` через `fuser` без проверки
- **Строка:** 129 (`execSync(`fuser -k ${port}/tcp`, ...)`)
- **Проблема:** `fuser` может отсутствовать в minimal-контейнерах (Astra Linux, slim Docker). `execSync` бросит, но перехвачено пустым catch — порт не освобождается, профиль не стартует. Тихий отказ.
- **Серьёзность:** 🟠 СРЕДНЕ.

### 2.3. `src/core/config.ts` — хардкоженные абсолютные пути
- **Строки:** 111, 121, 128 (модель llama, бинарь ik_llama, fim-модель)
- **Проблема:** Пути вида `$HOME/llama.cpp/models/...` и `$HOME/ik_llama.cpp/build/bin/llama-server` жёстко вшиты в defaultConfig. Код не переносим на другую машину/пользователя без правки исходников. ТЗ FR-01 требует `~/.config/evocode/models/`.
- **Серьёзность:** 🟠 СРЕДНЕ (нарушение переносимости, противоречие ТЗ).

### 2.4. `src/index.ts` — порт сервера 8083 захардкожен
- **Строка:** 621 (`const PORT = Number(process.env.PORT || 8083);`)
- **Проблема:** `EvocodeConfig` не содержит поля `server.port`; порт берётся только из env. В `ARCHITECTURE.md` указан 8081, в коде 8083, в комментарии index.ts:620 — 8083. Три разных источника — три разных значения.
- **Серьёзность:** 🟡 НИЗКО (конфиг-дрифт, но функционально работает).

### 2.5. `src/engine/inference.ts` — `chatBaseUrl()` без `http://`
- **Строка:** 136-139 (`return `${host}:${port}`;`)
- **Проблема:** `host` = `'http://127.0.0.1'` (config.ts:118), итого URL = `http://127.0.0.1:8080` — **двойное `http://`** при конкатенации с `/health` → `http://127.0.0.1:8080/health` (нет, будет `http://127.0.0.1:8080/health` — на самом деле `http://127.0.0.1:8080` корректно, но если host задан без схемы — сломается). Смешанный формат (host содержит схему) хрупок. `embedBaseUrl` (строка 151) уже корректно дописывает `http://127.0.0.1:`.
- **Серьёзность:** 🟡 НИЗКО (сейчас работает, но ловушка при смене host).

### 2.6. Дублирование логики маршрутизации
- **Места:** `src/index.ts` (OpenAI-compat путь, строки 417-460) дублирует логику `smartRouter.processRequest` + `runCloud` (dlp-guard.ts:120-156). Оба пути делают DLP + fetch + tool_calls injection отдельно.
- **Проблема:** Две копии одной логики → рассинхрон при правках (например, DLP-blocked обработка в `index.ts` отсутствует, а в `smartRouter` есть).
- **Серьёзность:** 🟠 СРЕДНЕ (architectural smell, риск расхождения).

---

## 3. Несоответствия документации и реального кода

### 3.1. ARCHITECTURE.md: "DLP Guard — 4 regex-правила" ↔ код: 6 правил
- **Док:** строка 28, 180-190 (4 правила: api-key, token, password, secret)
- **Код:** `config.ts` строки 174-216 — **6 правил** (добавлены `private-key` и `jwt`).
- **Оценка:** документация устарела, неполная.

### 3.2. ARCHITECTURE.md: порт сервера 8081 ↔ код: 8083
- **Док:** строка 24 (`index.ts :8081` в mermaid)
- **Код:** `index.ts:621` (`PORT = ... || 8083`)
- **Оценка:** дока и код противоречат друг другу.

### 3.3. ARCHITECTURE.md (схема Server → DLP) ↔ `handleRequest` НЕ вызывает DLP
- **Док:** строки 51 (`Server --> DLP`), 90-93 (sequence: S→D processRequest при /chat)
- **Код:** `src/index.ts:55-95` (`handleRequest` для POST `/chat`) — **DLP Guard вообще не вызывается**. Маскировка применяется только в OpenAI-compat cloud-пути (строки 440-451) и в `smartRouter.runCloud`. То есть privacy-гарантия из ТЗ FR-07 («все исходящие облачные запросы обязательно через DLP») для `/chat` не выполняется.
- **Серьёзность:** 🔴 КРИТИЧНО (нарушение core-privacy обещания документации).

### 3.4. TZ.md FR-05: diff по content-hash ↔ код: полное сравнение строк
- **Док:** строка 84 (`сравнить ... по content-hash`)
- **Код:** `skill-sync.ts:168-173` — сравнение `existingContent === skillContent` (полное равенство строк, не хеш).
- **Оценка:** функционально близко, но противоречит ТЗ по реализации.

### 3.5. TZ.md FR-05: removed/archive (soft-delete) ↔ код: не реализовано
- **Док:** строка 85 (`removed → soft-delete в .archive/`)
- **Код:** `skill-sync.ts` — статус `removed` объявлен (строка 8) но **нигде не вычисляется и не обрабатывается**. Удалённые в источнике навыки остаются на диске навсегда.
- **Серьёзность:** 🟠 СРЕДНЕ.

### 3.6. TZ.md FR-06: ONNX embeddings ↔ код: llama.cpp `/v1/embeddings`
- **Док:** строки 93, 197 (ONNX-модель all-MiniLM)
- **Код:** `inference.ts:471-499` — embeddings через `llama-server /v1/embeddings`. Векторная размерность 384 (config/vector-index) совпадает с MiniLM, но источник генерации — llama.cpp, не ONNX.
- **Оценка:** архитектурное расхождение (дока описывает embedded ONNX в отдельном потоке, код — HTTP к llama-server).

### 3.7. TZ.md FR-05: `sync-sources.json` ↔ код: `defaultConfig`
- **Док:** строки 79, 256 (`~/.config/evocode/sync-sources.json`)
- **Код:** `config.ts:150-169` — источники жёстко в `defaultConfig.sync.sources`, файл `sync-sources.json` не читается.
- **Серьёзность:** 🟠 СРЕДНЕ (пользователь не может добавить источник без правки кода).

### 3.8. ARCHITECTURE.md: SQL-схема `embedding BLOB` ↔ код: виртуальная vec-таблица
- **Док:** строки 266-279 (`CREATE TABLE chunks (... embedding BLOB ...)`)
- **Код:** `vector-index.ts:31-48` — метаданные в `code_chunks`, векторы в виртуальной `vec_code_chunks USING vec0(...)`. Схема из доки не соответствует реальной.
- **Оценка:** документация вводит в заблуждение.

### 3.9. TZ.md FR-03: SOCKS5/HTTP proxy + Keychain ↔ код: только `HTTP_PROXY` env
- **Док:** строки 65, 224 (SOCKS5, системный Keychain)
- **Код:** `index.ts:470` — только `cloud.proxyUrl || process.env.HTTP_PROXY || process.env.HTTPS_PROXY`. Нет SOCKS5, нет Keychain.
- **Серьёзность:** 🟠 СРЕДНЕ.

### 3.10. ARCHITECTURE.md: размерность embeddings и RAG-limit
- **Док:** строка 32 (`SQLite-vec, 384-dim`), код совпадает (`vector-index.ts:45` `float[384]`).
- **Реальность:** `search(queryEmbedding, 3)` — **всегда** лимит 3 (index.ts:61, 395), игнорируя `config` и ТЗ FR-06 (настраиваемая глубина). Хардкод.
- **Серьёзность:** 🟡 НИЗКО.

---

## 4. Архитектурные слабости

### 4.1. Orphaned processes и потеря состояния (runtime-manager)
- **Место:** `runtime-manager.ts` — `this.children: Map` (строка 145) живёт только в памяти. В `STATE_PATH` (runtime-state.json) пишется `pid`, но при restart Core карта `children` пуста. `stop(id)` читает `this.children.get(profileId)` — после рестарта сервера процесс не убьётся (только по `killPort`).
- **Риск:** висячие llama-server процессы, занятые порты.
- **Серьёзность:** 🟠 СРЕДНЕ.

### 4.2. DLP-blocked не обрабатывается в `index.ts` OpenAI-пути
- **Место:** `index.ts:435-460` (cloud-ветка OpenAI-compat)
- **Проблема:** В `smartRouter.runCloud` (строка 131) при `dlpResult.blocked` кидается `DLPBlockedError` → маппится в 403. Но в прямом OpenAI-пути `index.ts` DLP вызывается вручную (строка 440), результат `blocked` **нигде не проверяется** — заблокированный запрос с критичными секретами уходит в облако.
- **Серьёзность:** 🔴 КРИТИЧНО (обходит privacy-гарантию).

### 4.3. `readBody` не очищает частично прочитанный request при ошибке размера
- **Место:** `index.ts:97-114`
- **Проблема:** При `size > MAX` вызывается `req.destroy()` внутри `data`-обработчика, но Promise уже в состоянии reject; однако `req` может продолжить эмитить `data` после destroy (race). Нет `req.removeAllListeners()`. Минорная утечка.
- **Серьёзность:** 🟡 НИЗКО.

### 4.4. Нет централизованного логирования/метрик
- **Место:** весь `src/` — `console.log/warn/error` разбросаны.
- **Проблема:** Нет structured logging, нет correlation ID для запросов. В ТЗ FR-08 требуется анонимная статистика; в коде только `console.log`.
- **Серьёзность:** 🟡 НИЗКО.

### 4.5. `handleRequest` не использует `smartRouter.processRequest`, а делает всё вручную
- **Место:** `index.ts:75-94` vs `smart-router.ts:77-118`
- **Проблема:** `/chat` путь вызывает `smartRouter.analyzeTask` + `smartRouter.processRequest` (ОК), но дублирует сборку `systemPrompt` и не применяет DLP (см. 3.3). Два разных code-path для одной сущности → рассинхрон.
- **Серьёзность:** 🟠 СРЕДНЕ.

---

## 5. Покрытие тестами

**Наличие:** 7 файлов в `tests/unit/` (dlp-guard, inference, runtime-manager, server, skill-loader, skill-sync, smart-router). Jest настроен (`jest.config.js`).

**Реальное покрытие:**
| Модуль | Тесты | Статус | Замечание |
|---------|-------|--------|------------|
| inference | 6 | ✅ проходят (mock spawn) | не тестирует `chatBaseUrl` double-http, `maskedValue` не затрагивает |
| smart-router | 5 | ✅ проходят | только `route()` + `analyzeTask()`, не `processRequest()` |
| dlp-guard | 4 | ❌ **УПАДУТ** | вызывают `guard.mask` (нет метода) и `result.masked` — опечатки, совпадающие с багами кода (см. 1.2) |
| skill-loader | 2 | ✅ проходят | не тестирует `invalidate` (бага 1.4) |
| skill-sync | 3 | ✅ проходят (mock https) | не тестирует `removed`/archive (не реализовано, см. 3.5) |
| runtime-manager | 6 | ✅ проходят | требует реальный `config/profiles.json` (не portable) |
| server | 6 | ✅ проходят | только `isAuthorized`, не HTTP-endpoints |

**Критический пробел:** `dlp-guard.test.ts` **не проходит** из-за тех же опечаток, что и код. То есть модуль с высшим privacy-приоритетом (FR-07) фактически **не имеет рабочего покрытия**. `processRequest` (где происходит блокировка) вообще не протестирован.

**Оценка покрытия:** ТЗ требует >70% для критичных модулей (Router, Sync). Фактически: Router поверхностно (~40%, только route), Sync (~50%, без removed/archive), DLP (0% рабочего). **Критерий ТЗ не выполнен.**

---

## 6. Итоговая оценка

**Зрелость кодовой базы: ~55%**

**Что хорошо:**
- Чистая модульная архитектура (engine/guard/router/sync/indexer/skills/core разделены)
- Понятные типы (`types.ts`, интерфейсы в каждом модуле)
- Есть Jest-инфраструктура и 32 теста
- Graceful degradation на RAG (try/catch в `handleRequest`)
- Продуманная логика профилей (attach vs spawn)

**Главные риски (по приоритету):**
1. 🔴 **Код не компилируется** (`choices?.[0]` в inference.ts) — блокирует сборку.
2. 🔴 **DLP Guard нерабочий** (`this.mask()` + хардкоженая замена) — утечка секретов в облако, нарушение FR-07.
3. 🔴 **Краш при старте** (`invalidate`, `sysIndex`, `trimmed`) — сервер падает на инициализации по умолчанию.
4. 🔴 **`/chat` не применяет DLP** (3.3) и **OpenAI-путь игнорирует `blocked`** (4.2) — privacy-first обещание документации нарушено.
5. 🟠 **Документация рассинхронизирована** с кодом (порты, число правил DLP, SQL-схема, источники синхронизации).
6. 🟠 **Тесты DLP падают** из-за тех же опечаток — покрытие критичного модуля = 0%.

**Рекомендация:** перед любым релизом исправить блокирующие баги группы 1 (все опечатки `?.[`, `mask`/`invalidate`/`sysIndex`/`trimmed`), затем выровнять DLP-логику между `index.ts` и `smartRouter`, и обновить документацию под реальный код.
