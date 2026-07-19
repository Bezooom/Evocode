# Smoke checklist Эвокод (F1.5)

Проверка happy-path **без** установки полного IDE.

## Prefetch

- [ ] Node ≥ 20, `npm ci` в Evocode
- [ ] Бинарь: `/home/bezoom/ik_llama.cpp/build/bin/llama-server`
- [ ] Модель coder: `.../Qwopus3.6-27B-Coder-MTP-IQ4_XS.gguf` (или другой LIVE profile)

## 1. Local LLM

```bash
/home/bezoom/start_ik_ai_coder.sh
# или: npm run local:stack
curl -s http://127.0.0.1:8080/v1/models | head
```

- [ ] HTTP 200, модель в списке

## 2. Core attach

```bash
cd /home/bezoom/storage/Projects/Evocode
npm run build
PORT=8083 EVOCODE_LLAMA_MODE=attach npm start
```

```bash
curl -s http://127.0.0.1:8083/health | jq .
```

- [ ] `status=ok`
- [ ] `localReady=true` (если llama up)
- [ ] `runtime.mode=attach`

## 3. OpenAI-compat

```bash
curl -s http://127.0.0.1:8083/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"evocode-auto","messages":[{"role":"user","content":"Скажи OK одним словом"}]}' | jq .
```

- [ ] Есть `choices[0].message.content`
- [ ] Нет `[Fallback Chat]`
- [ ] `evocode.route` = local или cloud осмысленно

## 4. DLP (cloud path)

При `privacyMode=always-cloud` или complex prompt + API key:

- [ ] `api_key: sk-...long...` маскируется / block
- [ ] Local path не требует DLP

## 5. Agent extension

```bash
EVOCODE_CORE_URL=http://127.0.0.1:8083/v1 npm run agent:install-provider
npm run agent:rebrand   # если extension/ нет
npm run agent:launch
```

- [ ] Sidebar title «Эвокод»
- [ ] Default model evocode / evocode-auto
- [ ] Ответ в чате от Core (local)

## 6. Stop

```bash
# Core: Ctrl+C
/home/bezoom/stop_ai.sh   # осторожно: гасит llama на 8080
```

## Результат

| Дата | OK? | Заметки |
|------|-----|---------|
| 2026-07-19 | Частично | Пункты 1-3 пройдены успешно. Запуск llama-server 27B прошел штатно на порту 8080. Core attach на порту 8083 ответил со статусом localReady=true. Запрос /v1/chat/completions возвращает чистый JSON с content='OK' и route='local' за 37 сек (после прогрева). |

---

*При провале — не маскировать: логи Core + chat_server.log.*
