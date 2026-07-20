---
name: evocode-dlp-privacy
triggers:
  - evocode dlp privacy
  - blockoncritical
  - маскировка
  - audit.log
  - dlp guard
  - password
  - секреты
  - api key
  - api_key
  - секрет
  - утечка
  - redact
  - dlp
  - jwt
  - pem
version: "1.0.0"
description: >-
  [RU] DLP Guard: маскировка и блокировка секретов на cloud-пути, audit.log.
  [EN] DLP Guard: mask/block secrets on cloud path, audit trail.
tier: core
domain: security
pack: evocode-core
lang: [ru, en]
priority: 88
persona: false
inject_mode: core_only
max_inject_chars: 2800
---

# Эвокод: DLP Guard

## When to use

- Секреты в промпте/истории, cloud-отправка, audit, «почему заблокировали запрос».
- Настройка `blockOnCritical`, правила маскировки.

## When NOT to use

- Общий security review приложения (другие security skills).
- Offensive/lab навыки — не смешивать.

## Procedure

1. DLP применяется на **cloud path** (и OpenAI-compatible `/v1/chat/completions` при route=cloud).
2. **Mask:** все вхождения match, не только первое.
3. **Block:** при `blockOnCritical` и critical hit → `DLPBlockedError` / HTTP 403, в cloud не уходит.
4. **История messages** тоже маскируется/учитывается в block.
5. **Audit:** `.evocode/audit.log` (права 0600) — метаданные, не сырые секреты.
6. JWT / API keys помечены critical в default config.

## Constraints

- Local-only запросы не требуют DLP для egress, но не печатай секреты в ответе.
- Не обходить DLP «перефразировав» ключ в cloud.
- Lab/offensive skills не активировать вместе с советами по exfil.

## Verification

- [ ] Запрос с `api_key: ...` в cloud → mask или block.
- [ ] Запись в audit без полного секрета.
