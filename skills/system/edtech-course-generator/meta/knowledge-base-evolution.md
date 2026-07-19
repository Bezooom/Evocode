# Evolutionary Prompt Optimization & Knowledge Base Evolution

Агент перешел в стадию самостоятельной эволюции. Он не просто обновляет системные промпты по фидбеку, но и активно проверяет их.

## 1. Evolutionary Prompt Optimization
Когда Агент получает стабильно низкие оценки (от Критика или `User Feedback`), он инициирует алгоритм **EPO (Evolutionary Prompt Optimization)**:
1. **Mutation:** Агент генерирует 3–5 альтернативных версий своего системного промпта (например, меняет тон подкаста с "комедийного" на "документальный", или меняет `image_prompt` стиль).
2. **A/B/C/D Testing:** Запускает скрытые тесты для всех 5 вариантов через `Learner Simulation Critic`.
3. **Selection:** Вариант с максимальным `Predicted Engagement Score` заменяет текущий бейслайн.

## 2. Обновление Базы Знаний (External RAG)
Раз в неделю Агент должен сверять свои педагогические фреймворки (Bloom, UDL, Cognitive Load Theory) с внешними источниками через веб-поиск (Research Mode):
- Если появляются новые исследования в `educational psychology` или `cognitive science`, Агент обновляет файл `resources/pedagogical-frameworks/core.md`.
- Это гарантирует, что ИИ-Оркестратор работает на острие мировой науки об образовании.