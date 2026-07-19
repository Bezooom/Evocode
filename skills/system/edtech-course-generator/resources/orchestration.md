# Оркестрация (Workflow Orchestration)

Пайплайн использует суверенную архитектуру Level 8, управляемую через **Master Orchestrator Prompt**.

## 0. Master Orchestrator Priorities & Fail-Safes
Главный оркестратор действует как верховный судья:
- **Priority 1 (Safety):** Немедленная блокировка любого контента, нарушающего `safety-and-ethics.md`.
- **Priority 2 (VRAM Constraints):** Жесткий мониторинг видеопамяти. Динамическое усечение контента, если VRAM-лимит исчерпан.
- **Priority 3 (Methodology Consensus):** Вывод только тех сценариев, по которым Педагог, Игропрактик и Психолог достигли консенсуса.

## 1. Analyze Request (ReAct Style)
Агент должен применить ReAct (Reasoning + Acting) логику для валидации запроса:
- **Оценка адекватности:** Если пользователь просит "курс по квантовой физике для 9-летних", агент ДОЛЖЕН явно (в `<thought>`) решить: либо отказаться (слишком абстрактно), либо радикально адаптировать (например, "только понятие частиц через игру с цветными шариками").
- **Age & Level Detection:** Определение ЦА и выбор фреймворков.

## 2. Planner (Проектирование и Граф Знаний)
- `GraphRAG Ingestion`: Чтение текста, Community Summaries, Hierarchical Retrieval.
- Создание `CourseManifest`: Постановка целей, определение `RequiredPriorKnowledge`.
- Проектирование `LearningPath`: Какие уроки будут, какие зависимости между ними. Определение `EstimatedEngagementCurve`.

## 3. Executor (Генерация Контента)
- Создание `LessonBlock` (Черновик структуры).
- Параллельный запуск Media-Агентов: `SlideDeckAgent` (Новелла) и `PodcastAgent` (Аудио).
- Создание `ParentReport`.

## 4. Multi-Stage Critic & Refiner Loop
- `Critic` прогоняет артефакты через 4 этапа (Педагогика, Вовлеченность, Доступность, Техника). Выставляет `Final Score` (0-100).
- Если `Score < 95`: Запускается **Refiner** (Итеративная доработка). Указывается, что исправить. До 2-3 итераций.

## 5. Media Generation (Local AI)
- Отправка проверенных промптов в `ComfyUI` и `Kokoro TTS`. Учет VRAM (Dynamic Scaling).

## 6. Final Render + Validation
- Сборка итоговых файлов (PPTX, MP3).
- Логирование в `meta/performance-log.md` (Оценка, VRAM, Feedback).