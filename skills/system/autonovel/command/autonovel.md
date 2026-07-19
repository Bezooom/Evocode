# autonovel

**Запуск автономного романника**

## Описание

Запускает полный pipeline для написания романа от seed concept до finished product.

## Использование

```bash
# Полная сборка с нуля
uv run python run_pipeline.py --from-scratch

# Запуск с конкретной фазы
uv run python run_pipeline.py --phase=foundation

# Оценка текущего состояния
uv run python evaluate.py --phase=foundation

# Написание главы
uv run python draft_chapter.py --chapter=01

# Пересмотр главы
uv run python gen_revision.py --chapter=05

# Генерация обложки
uv run python gen_cover_print.py

# Генерация аудиокниги
uv run python gen_audiobook.py
```

## Фазы

1. **Foundation** — построение мира, персонажей, outline, voice
2. **Drafting** — написание глав по порядку
3. **Revision** — автоматические циклы пересмотра
4. **Export** — typeset, art, audiobook, landing page

## Контекст

Система использует 5 co-evolving слоев:
- voice.md — КАК мы пишем
- world.md — ЧТО существует  
- characters.md — КТО действует
- outline.md — ЧТО ПРОИСХОДИТ
- chapters/* — САМ ТЕКСТ
- canon.md — ЧТО ИСТИННО

## API Keys

Требуется:
- ANTHROPIC_API_KEY — для writing/evaluation/review
- FAL_KEY — для cover art
- ELEVENLABS_API_KEY — для audiobook

Копируйте `.env.example` в `.env` и заполните ключи.
