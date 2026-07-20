---
name: evocode-privacy-policy
triggers:
  - evocode privacy policy
  - не отправляй в облако
  - суверенитет данных
  - локальный режим
  - data residency
  - без интернета
  - always-local
  - приватность
  - offline
  - privacy
version: "1.0.0"
description: >-
  [RU] Политика приватности Эвокод: local-first, always-local, DLP на cloud-пути, секреты не в логах.
  [EN] Evocode privacy policy playbook: local-first inference, always-local mode, cloud DLP.
tier: core
domain: general
pack: evocode-core
lang: [ru, en]
priority: 90
persona: false
inject_mode: core_only
max_inject_chars: 2800
---

# Эвокод: политика приватности

## When to use

- Пользователь спрашивает про локальность, offline, утечки, cloud vs local.
- Нужно выбрать privacyMode или объяснить, куда уходит запрос.
- Настройка пилота / корп. периметра.

## When NOT to use

- Обычная задача кодинга без privacy-контекста.
- Юридическая сертификация (мы pilot-ready, не «сертифицировано»).

## Procedure

1. **Default:** предпочитай локальный инференс (llama через Core :8083 → :8080).
2. **always-local:** cloud не вызывать; если задача требует сеть — явно скажи и предложи сменить режим.
3. **auto:** local для простых/средних; cloud только через DLP Guard.
4. **Секреты:** API keys, JWT, PEM, пароли — не повторять в ответе; не писать в файлы логов.
5. **Сеть Core:** по умолчанию `127.0.0.1`; non-local только с Bearer token.
6. **Формулировки:** «pilot-ready / закрытый P0 trust», не «полностью защищена / сертифицирована».

## Constraints

- Не обещать гос. сертификацию или 100% невозможность утечки.
- OpenRouter free models — best-effort, лимиты меняются.
- Skills с `tier: lab` не активировать без явного разрешения.

## Verification

- [ ] Запрос с секретом в cloud-режиме блокируется/маскируется DLP.
- [ ] always-local не бьёт во внешний API.
