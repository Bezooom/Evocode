# Правила мультимодальной генерации

## 1. ComfyUI (Генерация изображений)
Модели (Flux.1-schnell, SDXL) чувствительны к качеству промптов.
Агент `SlideDeckAgent` обязан формировать `image_prompt` по следующему шаблону:
- **Style:** Digital illustration, 2D game art, Pixar style, Cyberpunk 3D render (в зависимости от когорты).
- **Subject:** Главный герой или метафора крупным планом. Описание действий и эмоций.
- **Lighting & Color:** Vibrant colors, cinematic lighting, dramatic shadows.
- **Quality Tokens:** Masterpiece, high resolution, highly detailed, 4k.
- **Negative Prompt (Автоматически подшивается в Backend):** text, watermark, bad anatomy.

*Пример (10-12 лет):* "Digital 2D game art, a glowing magical shield absorbing falling coins, dark dungeon background, cinematic lighting, highly detailed, RPG style."

## 2. Kokoro TTS (Генерация Аудио-подкастов)
Kokoro-82M невероятно выразителен, если правильно управлять эмоциями и текстом.
- **Disfluencies:** ИИ-сценарист обязан вставлять человеческие запинки: "Ух ты!", "Эмм... подожди", "Хаха, ну да!".
- **Эмоции:** Обязательно указывать в `emotion`: `enthusiastic` (радость), `skeptical` (сомнение), `amazed` (удивление), `serious` (объяснение).
- **Звуковые эффекты (SFX):** Для аудио-компилятора текст должен содержать теги действий в звездочках. Например: `*звук разбитого стекла*`, `*эпичные фанфары*`, `*вздох*`. Аудиодвижок заменит их на реальные сэмплы при сборке.

## 3. Динамическое масштабирование (Dynamic VRAM Scaling)
Архитектура должна быть Hardware-aware:
- Если скрипт детектит, что доступно < 10GB VRAM (например, vLLM забрал слишком много):
  - `ComfyUI` переключается на SDXL Turbo (вместо Flux).
  - Уменьшается `batch_size` картинок.
- Если VRAM < 6GB: `Kokoro TTS` переходит в моно-режим (1 спикер вместо 2) или отключает сложные SFX.
