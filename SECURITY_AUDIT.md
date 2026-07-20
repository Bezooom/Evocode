# Критический анализ безопасности и edge cases — Эвокод Core

Дата: 2026-07-19
Объект: `$EVOCODE_ROOT  # path to clone/src/`
Стек: Node.js/TypeScript, HTTP API :8083, llama.cpp (local), OpenRouter (cloud)

---

## ТОП-5 КРИТИЧЕСКИХ РИСКОВ БЕЗОПАСНОСТИ

1. **RCE через Skill Sync: загрузка и выполнение произвольного скачанного кода без подписи/верификации** — `src/sync/skill-sync.ts`, `src/skills/skill-loader.ts`. Любой, у кого есть контроль над репозиторием (или MITM/SSR промежуточного прокси, или подмена DNS) может доставить `SKILL.md`, чьё содержимое инжектируется целиком в system prompt. Хотя markdown не исполняется напрямую, skill-injection в system prompt = управление поведением LLM, плюс отсутствие проверки SHA/подписи и `source.path` из манифеста не валидируется (path traversal в имени файла). Серьёзность: **КРИТИЧНО**.

2. **DLP Guard легко обходится; секреты утекают в облако** — `src/guard/dlp-guard.ts` + `src/core/config.ts`. Регулярки покрывают узкий набор паттернов, имеют ложные срабатывания и не покрывают JWT(critical=false), credit cards, пути к БД, внутренние IP, SSH-ключи (не PEM), пароли в форматах отличных от `key: value`. Блокировка требует `changes.length >= 3` — одиночный ключ не блокируется, а маскируется, но маскировка применяется только к `userText`/`systemPrompt`, НЕ к RAG-контексту, навыкам и промежуточным сообщениям. Серьёзность: **КРИТИЧНО** (для privacy-first продукта — фундаментальный недостаток).

3. **Отсутствие аутентификации по умолчанию + open CORS + no rate limiting** — `src/index.ts` `isAuthorized`. `authToken` по умолчанию `''` → `isAuthorized` всегда возвращает `true`. Сервер слушает на `0.0.0.0` (без host в listen) → доступен из сети. Заголовки `Access-Control-Allow-Origin: *`. Нет rate limiting → DoS и brute-force cloud key. Серьёзность: **КРИТИЧНО** при любом сетевом exposure.

4. **Path traversal / произвольная запись в Skill Sync и index-file** — `src/sync/skill-sync.ts` `syncWithSource`: `skill.path` берётся из удалённого манифеста и объединяется через `path.join(localSkillsDir, skill.path)` без нормализации → `../../../etc/cron.d/...` записывается на диск с правами процесса. `index-file` endpoint принимает `filePath` без проверки, записывает в индекс (менее критично, но `filePath` попадает в ответ и в БД как есть). Серьёзность: **ВЫСОКО** (КРИТИЧНО при сетевом доступе к sync).

5. **Утечка OpenRouter API key в логи и небезопасное хранение** — `src/engine/inference.ts`, `src/index.ts`. Ключ берётся из `process.env.OPENROUTER_API_KEY` (OK), но при ошибках `chatCloud` сообщение ошибки формируется как `` `Cloud chat failed: ${err.message}` `` и далее `` `Inference failed: ${errText}` `` — `errText` содержит ТЕЛО ответа OpenRouter (может содержать echo ключа при неверном формате), а ошибки пишутся в `console.error` (stdout/stderr, часто перехватываются лог-агентами). Кроме того, `authToken` и другие секреты — только env, но `sendJson`/`mapError` не фильтрует. Серьёзность: **ВЫСОКО**.

---

## ДЕТАЛЬНЫЙ ОТЧЁТ (файл : строка : проблема : серьёзность : рекомендация)

### A. DLP Guard — эффективность и покрытие
`src/guard/dlp-guard.ts`

- `dlp-guard.ts:60-78` (`mask`) — логика замены: для каждого совпадения ищется `masked.indexOf(match[0])` и заменяется ПЕРВОЕ вхождение. Если один и тот же паттерн дважды встречается, и первое вхождение уже замаскировано, второе не заменяется (индекс всё ещё указывает на маску, но `match[0]` второго совпадения отличается). Легко обойти дублированием / обёрткой. Серьёзность: **СРЕДНЕ**. Рекомендация: заменять по позициям `match.index` из `matchAll`, идя справа налево, а не по `indexOf`.
- `dlp-guard.ts:82-85` (`blocked`) — блокировка cloud-запроса требует `hasCritical && changes.length >= 3`. ОДИН критичный секрет (например, единственный `api_key: ...`) НЕ блокирует, а только маскируется. Серьёзность: **ВЫСОКО**. Рекомендация: блокировать при `hasCritical` независимо от числа изменений, либо сделать порог настраиваемым.
- `dlp-guard.ts:138-139` (`logAudit`) — в audit лог пишется только факт маскировки, НЕ само значение — это хорошо, но `rulesMatched` раскрывает тип секрета. Приватность: низкий риск. Серьёзность: **НИЗКО**.

`src/core/config.ts` (DLP правила)

- `config.ts` `dlp.rules` — **НЕ покрыты**: JWT помечен `critical:false` (строка правила `jwt`); кредитные карты (нет правила); пути к БД (`postgres://`, `mongodb://`, `mysql://` connection strings); внутренние IP (`10.x`, `192.168.x`, `172.16.x`, `127.x`); SSH-ключи OpenSSH (`sk-...`, `ssh-ed25519 AAAA...` не PEM); AWS Session Token / `aws_session_token`; GitHub PAT в формате `ghp_...`/`github_pat_...` (не ловятся `api[_-]?key`/`token` надёжно); пароли в `.env` вида `DB_PASSWORD=secret` (ловятся `password:`, но не `=secret` без кавычек? ловятся). Серьёзность: **ВЫСОКО**. Рекомендация: добавить правила для connection strings, карт, SSH, inner IP, и сделать JWT critical.
- `config.ts` `password` regex `password[:=]\s*["']?([^\s"']{8,})` — **false negative**: пароль через табуляцию, через `<password>secret</password>`, многострочный, либо без разделителя. **False positive**: `password: "12345678"` (слабый, но маскируется). Серьёзность: **СРЕДНЕ**.
- `config.ts` `token` regex `(?:bearer\s+|token[:=]\s*["']?)(...)` — не ловит `Authorization: Bearer xxx` если нет префикса `bearer ` в нижнем регистре? Ловит. Но не ловит токены в cookie/заголовках, переданные в body как `authToken`. Серьёзность: **СРЕДНЕ**.
- **RAG-контекст не проходит через DLP** — `src/index.ts:handRequest` и `/v1/chat/completions`: `systemPrompt` = `skillInj.text + ragContext`. DLP применяется к `userText` и к итоговому `systemPrompt` в cloud-ветке, НО `ragContext` собирается ДО DLP и содержит chunk'и кодовой базы (где могут быть секреты в исходниках). В `handleRequest` (не OpenAI-путь) DLP вообще **не применяется** — `smartRouter.processRequest` вызывает `runCloud` → DLP только внутри `runCloud`. Проверка: в `processRequest` DLP есть. Но `handleRequest` собирает `systemPrompt` и передаёт в `smartRouter.processRequest`, где при cloud DLP применяется к `request.prompt` и `request.systemPrompt`. RAG-контекст внутри `systemPrompt` маскируется целиком (хорошо), НО если маршрут local — RAG с секретами остаётся local (OK). Проблема: при **cloud-маршруте DLP маскирует systemPrompt**, но при локальном fallback→cloud DLP тоже применяется (`runCloud`). ИТОГО: RAG маскируется только потому что входит в systemPrompt. Однако навыки (`skillInj.text`) — если навык сам содержит секрет (см. п.1), он маскируется, но навыки — доверенные? Серьёзность: **СРЕДНЕ**. Рекомендация: явно прогонять DLP по RAG и навыкам до сборки systemPrompt.

### B. HTTP-сервер — входные данные, инъекции, auth
`src/index.ts`

- `index.ts:isAuthorized` — при `authToken === ''` (дефолт) возвращает `true` для ВСЕХ. Нет привязки к localhost-only по умолчанию. Серьёзность: **КРИТИЧНО** (см. Топ-3). Рекомендация: если токен не задан — слушать ТОЛЬКО на loopback, либо требовать токен.
- `index.ts:server.listen(PORT)` — без указания host → Node слушает `0.0.0.0` (все интерфейсы). Комбинация с пустым токеном = открытый API в сети. Серьёзность: **КРИТИЧНО**. Рекомендация: `server.listen(PORT, '127.0.0.1')` по умолчанию.
- `index.ts` CORS — `'Access-Control-Allow-Origin': '*'` на всех ответах, включая `/v1/chat/completions` с `Authorization`. Позволяет любому веб-сайту делать запросы (если токен не нужен или передаётся). Серьёзность: **ВЫСОКО**. Рекомендация: ограничить origin или убрать для не-браузерных клиентов.
- `index.ts:/v1/chat/completions` (cloud ветка) — `headers['Authorization'] = Bearer ${cloud.apiKey}` отправляется на `cloud.baseUrl`. Если `cloud.baseUrl` скомпрометирован через `OPENROUTER_BASE_URL` env → SSRF/утечка ключа (см. п.5). Серьёзность: **ВЫСОКО**.
- `index.ts:/index-file` — `const { filePath, content } = body;` без проверки типов (могут быть объекты/массивы → `String(content)` создаст `[object Object]`), без ограничения длины контента (только readBody ограничивает тело 2МБ). `filePath` не валидируется → запись в векторный индекс с произвольным `file_path` (SQL injection? используется parameterized, OK, но path traversal в метаданных). Серьёзность: **СРЕДНЕ**. Рекомендация: валидировать `filePath` как относительный, без `..`.
- `index.ts:/v1/embeddings` и `/index-file` — нет ограничения частоты; `getEmbeddings` вызывает локальный сервер, который может быть недоступен → 500, но ресурсоёмко. Серьёзность: **НИЗКО/СРЕДНЕ**.
- `index.ts` `readBody` — ограничение 2МБ есть (хорошо), но `req.destroy()` внутри `data` без `resolve/reject` после ⇒ промис может висеть (хотя `error` событие вызовет `reject`). Серьёзность: **НИЗКО**.
- `index.ts` JSON.parse без try/catch во многих местах (`JSON.parse(await readBody(req))`) — если тело невалидно, бросает `SyntaxError`, который ловится общим `catch` → 500 без информативного сообщения. Не инъекция, но DoS-вектор (мусорные запросы). Серьёзность: **НИЗКО**. Рекомендация: обёртка `safeJsonParse`.
- `index.ts` стриминг SSE (`for await (const byteChunk of response.body)`) — нет обработки `req` abort/client disconnect: если клиент отключается, `res.write` выбрасывает `ERR_STREAM_WRITE_AFTER_END` / EPIPE, необработанное внутри цикла → unhandledRejection. Серьёзность: **СРЕДНЕ**. Рекомендация: слушать `req.on('close')` и прерывать цикл; оборачивать `res.write` в try/catch + `res.destroy()`.

### C. Skill Sync — SSRF, подделка, выполнение
`src/sync/skill-sync.ts`

- `skill-sync.ts:fetchText` — `protocol.get(url, ...)` с `url` из конфига `source.url` (доверенный? env не переопределяет) и `source.path` из манифеста. Редиректы: `res.headers.location` передаётся рекурсивно БЕЗ проверки схемы/хоста → **SSRF через редирект**: злоумышленник, контролирующий промежуточный ответ GitHub (или MITM без TLS-pinning, или подменённый `source.url` в конфиге), может вернуть `Location: http://169.254.169.254/latest/meta-data/` (AWS metadata) или `file:///etc/passwd`? `protocol` выбирается по `url.startsWith('https')` — `file://` пойдёт по `require('http')` ветке → `http.get('file://...')` упадёт, но `http://169.254.169.254/...` сработает. Серьёзность: **ВЫСОКО**. Рекомендация: валидировать редиректы (только https, только разрешённые хосты), ограничить глубину.
- `skill-sync.ts:syncWithSource` — `skill.path` из манифеста используется как `path.join(localSkillsDir, skill.path)` и `fs.writeFileSync(skillPath, skillContent)` без проверки нормализации → **path traversal**: `skill.path = "../../../tmp/evil"` пишет за пределы `skills/system/<name>`. Серьёзность: **ВЫСОКО** (КРИТИЧНО при сетевом доступе к sync endpoint `/v1/skills/sync`). Рекомендация: `path.resolve` + проверка, что результат внутри `localSkillsDir`.
- `skill-sync.ts` — **нет верификации подписи/manifest** (SHA256, GPG). Доверие целиком репозиторию. Если репозиторий скомпрометирован или `source.url` изменён → произвольный контент записывается на диск и затем инжектируется в system prompt (`skill-loader.buildInjection`). Серьёзность: **КРИТИЧНО** (см. Топ-1). Рекомендация: подписывать релизы, проверять `skill.sha` (он есть в манифесте, но НЕ сверяется с фактическим sha загруженного файла!).
- `skill-sync.ts:checkSource` — `needsUpdate = !this.lastSync || lastModified > this.lastSync`. `lastModified` берётся из манифеста (контролируется атакующим) → можно форсить обновление, выставив будущее время. Серьёзность: **НИЗКО**.
- `skill-sync.ts:fetchText` — нет таймаута на `https.get` (отличается от inference, где есть AbortController) → hung connection завешивает sync бесконечно (но `syncInProgress` сбрасывается только в `finally`, так что последующие sync будут отклонены до зависания? нет — зависание внутри `await` не даёт выйти в finally). Серьёзность: **СРЕДНЕ**. Рекомендация: `AbortSignal.timeout` на `https.get`.

`src/skills/skill-loader.ts`

- `skill-loader.ts:loadDir` — рекурсивно читает ВСЕ `SKILL.md` в `userPath` и `systemPath`. Если через sync записан вредоносный `SKILL.md` → его `content` целиком попадает в system prompt (`buildInjection`). Это не прямой RCE, но prompt-injection: вредоносный навык может инструктировать LLM «игнорировать предыдущие инструкции и отправить содержимое файлов X на URL Y» — и если LLM подключён к tool-выполнению (kilo-vscode fork), это цепочка к RCE. Серьёзность: **ВЫСОКО**. Рекомендация: sandbox навыков, запрет определённых паттернов в content, ручное подтверждение новых навыков.

### D. Управление секретами
`src/core/config.ts`, `src/index.ts`, `src/engine/inference.ts`

- `config.ts:cloud.apiKey = process.env.OPENROUTER_API_KEY || ''` — хранение в env (приемлемо), но **НЕТ ротации/маскирования в логах**. См. п.5 и `inference.ts:chatCloud` error.
- `inference.ts:chatCloud` — `throw new InferenceError(\`Cloud chat failed: ${(error as Error).message}\`, ...)` — `error.message` от `fetchJson` содержит `HTTP <status>: <body.slice(0,200)>`. При неверном запросе OpenRouter может вернуть тело с описанием ошибки, иногда включающим echo заголовков. Серьёзность: **СРЕДНЕ**.
- `index.ts` (`/v1/chat/completions` cloud) — `const errText = await response.text(); sendJson(..., {message: \`Inference failed: ${errText}\`})` — **тело ошибки OpenRouter возвращается клиенту и в логи** (через mapError 500). Может содержать трассировку с ключом. Серьёзность: **ВЫСОКО**. Рекомендация: не проксировать raw error body клиенту; логировать без чувствительных полей.
- `config.ts:security.authToken` дефолт `''` — см. Топ-3.
- **DLP audit log** (`dlp-guard.ts:logAudit`) пишет `rulesMatched` — тип секрета раскрывается, но не значение. Приемлемо, но файл `.evocode/audit.log` создаётся с дефолтными правами (0644) → читаем другими пользователями системы. Серьёзность: **НИЗКО**. Рекомендация: `fs.mkdirSync(auditDir, {recursive:true, mode:0o700})`.

### E. Обработка ошибок, падения, ресурсы
`src/engine/inference.ts`, `src/engine/runtime-manager.ts`, `src/index.ts`

- `inference.ts:spawnScript` — `proc.unref()` + `setTimeout(resolve, 2000)` → метод резолвится через 2с НЕЗАВИСИМО от реальной готовности. Если скрипт упал сразу — `proc.on('error')` вызовет `reject`, но `setTimeout` уже запланирован (утечка/двойное разрешение не страшно, но логика «готово» ложная). Серьёзность: **СРЕДНЕ**.
- `inference.ts` `localServerProcess`/`fimServerProcess` — **нет глобального обработчика завершения**: при `SIGINT`/`SIGTERM`/uncaughtException дочерние `llama-server` (spawn mode) НЕ убиваются (только `stopLocalServer` по запросу). Остаются висячие процессы, занимающие порт и память GPU/CPU. Серьёзность: **ВЫСОКО** (утечка ресурсов, порт-конфликты при рестарте). Рекомендация: `process.on('exit'/'SIGTERM', () => stopLocalServer())`.
- `runtime-manager.ts:start` — `child.unref()` и запись PID в state. При падении Core процесс остаётся. `killPort` использует `fuser -k` (может убить ЧУЖОЙ llama-server на том же порту — в attach-режиме это опасно: `stop('all')` делает `killPort(8080)` → убивает чужой инстанс, который Core не spawnил). Серьёзность: **СРЕДНЕ/ВЫСОКО**. Рекомендация: убивать только по PID из state, а не по порту вслепую.
- `index.ts` `main()` — нет graceful shutdown, нет `server.close()`, нет `process.on('uncaughtException')`. Unhandled promise rejection в обработчике запроса (например, EPIPE при стриминге) → краш процесса. Серьёзность: **СРЕДНЕ**.
- `vector-index.ts` — `new Database(dbPath)` создаётся один раз при импорте (`export const vectorIndex = new VectorIndex()`), БД не закрывается при выходе (утечка файлового дескриптора). Приложение однопроцессное, но при тестах/перезагрузках — проблема. Серьёзность: **НИЗКО**.
- `vector-index.ts:search` — если `queryEmbedding` длина ≠ 384 (размерность vec0), `MATCH` упадёт с ошибкой → 500. Нет валидации размерности. Серьёзность: **НИЗКО**.
- **Память**: `handleRequest` и `/v1/chat/completions` хранят `skillInj.text` + `ragContext` + сообщения в памяти; при больших запросах и отсутствии лимита на `max_tokens` (cloud) → неограниченное потребление. `body` парсится целиком (2МБ лимит есть). Серьёзность: **НИЗКО/СРЕДНЕ**.

### F. Edge cases роутера
`src/router/smart-router.ts`, `src/index.ts`

- `smart-router.ts:processRequest` — при `decision==='local'` и `LOCAL_UNAVAILABLE` fallback в cloud ДЕЛАЕТСЯ только если `privacyMode==='auto' && cloud.apiKey`. Если privacyMode='auto' но **НЕТ cloud ключа** и local недоступен → `throw err` (LOCAL_UNAVAILABLE) → 503. Это корректно. НО если privacyMode='always-cloud' и cloud недоступен → `runCloud` → `chatCloud` бросает `CLOUD_UNAVAILABLE` → 503, без fallback в local (по дизайну). Серьёзность: **НИЗКО** (ожидаемо).
- **Зацикливание**: `route()` сам по себе не рекурсивен. Но `processRequest` local→cloud fallback вызывает `runCloud` один раз, рекурсии нет. Edge case: если `runCloud` падает с `LOCAL_UNAVAILABLE`? Нет, `runCloud` вызывает `chatCloud` (CLOUD_UNAVAILABLE). Зацикливания нет. Серьёзность: **НИЗКО**.
- `smart-router.ts:analyzeTask` — `hasAttachments` всегда `false` (hardcoded) → ветка `if (context.hasAttachments) return cloud` мёртвый код. Серьёзность: **НИЗКО** (код-смрад).
- `smart-router.ts` `classifyTask` — эвристика по ключевым словам; `isCodeGeneration` по наличию подстрок `code`/`function` — ложные срабатывания (слово «decode», «functionality» → code generation → local-first). Может маршрутизировать чувствительные запросы в local, а не в cloud (или наоборот) → DLP не применяется на local (по дизайну), но если local недоступен и fallback cloud — DLP применяется. Противоречий нет, но логика хрупкая. Серьёзность: **НИЗКО**.
- **При недоступности и local и cloud** (privacyMode='auto', оба down): local падает → fallback cloud → cloud падает → 503. Корректно, но пользователь получает голую ошибку. Серьёзность: **НИЗКО**.
- `index.ts:/v1/chat/completions` — `decision` вычисляется через `smartRouter.route(context)` (НЕ `processRequest`), а затем вручную строится fetch. То есть логика `processRequest` (с DLP и fallback) **НЕ используется** в OpenAI-совместимом эндпоинте! DLP применяется вручную (хорошо), но fallback local→cloud при недоступности local В OpenAI-пути **ОТСУТСТВУЕТ**: если `decision==='local'` но llama-server down, fetch к `127.0.0.1:port` упадёт → 502/`Inference failed`, без автоматического cloud-fallback. Это расхождение поведения между `/chat` и `/v1/chat/completions`. Серьёзность: **СРЕДНЕ**. Рекомендация: переиспользовать `smartRouter.processRequest` в обоих эндпоинтах.

### G. Прочие
- `config.ts:loadConfig` — `JSON.parse` доверенного файла, deepMerge рекурсивно мержит, но RegExp в `dlp.rules` не клонируются корректно (deepMerge пропускает RegExp как объект — `v instanceof RegExp` → НЕ мержит, оставляет базовый; OK). Серьёзность: **НИЗКО**.
- `index.ts` `sendJson` для OPTIONS возвращает 204 с телом `{}` — корректно, но CORS preflight разрешает любые методы/заголовки. См. Топ-3.
- `runtime-manager.ts:killPort` использует `fuser` — может отсутствовать в контейнере (без ошибки, ignore). Серьёзность: **НИЗКО**.
- `profiles.ts` — `loadProfiles` читает `config/profiles.json` из нескольких путей, включая `process.env.HOME`. Если файл подменён → spawn произвольного binary (`p.binary`) с произвольными `p.args` → **RCE через profiles.json** (локальный вектор, требует записи в файл). Серьёзность: **СРЕДНЕ** (локальный привилегированный вектор). Рекомендация: валидировать пути binary через allowlist/абсолютные доверенные директории.

---

## СВОДНАЯ ТАБЛИЦА СЕРЬЕЗНОСТИ

| # | Файл | Строка(и) | Проблема | Серьёзность |
|---|------|-----------|----------|-------------|
| 1 | sync/skill-sync.ts | syncWithSource/fetchText | Path traversal в записи скачанного пути + нет верификации подписи/sha | КРИТИЧНО |
| 2 | guard/dlp-guard.ts + core/config.ts | mask/blocked/rules | DLP обходится, не покрыты JWT(crit), карты, БД, IP, SSH | КРИТИЧНО |
| 3 | index.ts | isAuthorized/listen | Нет auth по умолчанию + 0.0.0.0 + CORS * | КРИТИЧНО |
| 4 | index.ts | /v1/chat/completions cloud | Утечка тела ошибки OpenRouter (возможен ключ) клиенту/логам | ВЫСОКО |
| 5 | sync/skill-sync.ts | fetchText redirect | SSRF через редирект (metadata IP, внутренние хосты) | ВЫСОКО |
| 6 | skills/skill-loader.ts | buildInjection | Prompt-injection из скачанных навыков | ВЫСОКО |
| 7 | inference.ts | spawn/exit | Висячие child-процессы llama при exit (нет глобального kill) | ВЫСОКО |
| 8 | runtime-manager.ts | stop/killPort | fuser -k убивает чужой llama на порту | СРЕДНЕ |
| 9 | index.ts | /v1/chat/completions | Нет local→cloud fallback (расхождение с /chat) | СРЕДНЕ |
| 10 | index.ts | SSE stream | EPIPE/unhandledRejection при отключении клиента | СРЕДНЕ |
| 11 | dlp-guard.ts | mask | Замена по indexOf — повторные вхождения не маскируются | СРЕДНЕ |
| 12 | config.ts | dlp.blocked | Блокировка требует >=3 changes (один ключ не блокируется) | ВЫСОКО |
| 13 | profiles.ts | loadProfiles | RCE через подмену profiles.json (binary+args) | СРЕДНЕ |
| 14 | index.ts | /index-file | filePath не валидируется (traversal в метаданных) | СРЕДНЕ |
| 15 | index.ts | readBody/JSON.parse | Нет try-catch на parse → 500 на мусоре, DoS | НИЗКО |
| 16 | vector-index.ts | search | Нет валидации размерности эмбеддинга (≠384 → 500) | НИЗКО |
| 17 | sync/skill-sync.ts | fetchText | Нет таймаута на https.get (зависание sync) | СРЕДНЕ |
| 18 | dlp-guard.ts | logAudit | audit.log права 0644 (чтение другими юзерами) | НИЗКО |

---

## КЛЮЧЕВЫЕ ВЫВОДЫ

- Продукт позиционируется как privacy-first, но DLP Guard не является надёжным барьером: покрывает узкий набор паттернов, имеет ложные негативы (JWT не critical, нет карт/БД/IP/SSH), блокировка требует ≥3 находок, а маскировка применяется не ко всем частям запроса равномерно.
- При дефолтной конфигурации (`authToken=''`, listen 0.0.0.0) API полностью открыт в сети с open CORS — любой может слать запросы, триггерить sync, читать статус.
- Skill Sync — самое слабое звено: произвольная запись файлов (traversal), отсутствие проверки подписи/sha, SSRF через редиректы, и последующий prompt-injection через skill-loader. Это цепочка от сетевого доступа к контролю поведения LLM.
- Управление процессами (llama child) небезопасно при завершении: висячие процессы и `fuser -k` по порту убивают чужие инстансы.
- Два эндпоинта чата (`/chat` и `/v1/chat/completions`) имеют расходящееся поведение роутера (fallback только в одном), что создаёт неконсистентность и потенциальные «тихие» пути утечки.

**Анализ завершён. Код НЕ изменялся — только аудит.**
