---
name: evocode-local-llm
triggers:
  - evocode local llm
  - локальная модель
  - запусти модель
  - coder profile
  - llama-server
  - localready
  - порт 8080
  - порт 8083
  - local llm
  - инференс
  - runtime
  - llama
  - gguf
  - vram
version: "1.0.0"
description: >-
  [RU] Локальный LLM: профили llama, порты 8080/8083/8084, attach-first, runtime API.
  [EN] Local LLM wiring: profiles, ports, attach-first, runtime start/stop.
tier: core
domain: general
pack: evocode-core
lang: [ru, en]
priority: 80
persona: false
inject_mode: core_only
max_inject_chars: 3000
---

# Эвокод: локальный LLM

## When to use

- Запуск/остановка локальной модели, OOM, порты, `localReady=false`.
- Выбор профиля (coder / embed), attach vs spawn.
- Диагностика «модель не отвечает».

## When NOT to use

- Настройка OpenRouter / cloud keys (см. cloud tab + privacy skill).
- Общий code review без runtime-контекста.

## Procedure

1. **Порты:** `8080` chat llama · `8083` Evocode Core · `8084` embeddings (optional).
2. **Режим:** `EVOCODE_LLAMA_MODE=attach` (по умолчанию) — не убивать чужой llama.
3. **Профили:** `config/profiles.json` — абсолютные пути к binary/GGUF, без копий в repo.
4. **UI:** вкладка «Модели» / `Ctrl+Shift+M` · API `/v1/runtime/*`.
5. **Ошибки:** fail-loud (503), без silent stub-ответов «успех».
6. **Виртуальные model id** (`evocode/*`, `evocode-auto`) Core мапит на реальную local/cloud model.

## Constraints

- Не копировать GGUF в дерево Evocode.
- Не слушать Core на 0.0.0.0 без authToken в проде.
- GPU/VRAM — ответственность оператора хоста; one-click download моделей не обещать.

## Verification

- [ ] `GET /health` → `localReady: true` при живом llama.
- [ ] Chat completion через Core возвращает non-empty content.
