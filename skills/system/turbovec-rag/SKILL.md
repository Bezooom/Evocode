---
name: turbovec-rag
description: >
  Локальный векторный поиск на базе алгоритма Google TurboQuant (Rust-библиотека с Python-биндингами).
  Позволяет развернуть сверхэффективную RAG-систему с 4-битной или 2-битной квантизацией векторов на CPU.
  Используй для быстрого локального полнотекстового и гибридного поиска с поддержкой фильтрации (allowlist)
  на этапе выполнения SIMD-инструкций.
---

# TurboQuant Vector Search (turbovec)

Высокоэффективный векторный индекс для CPU (с поддержкой AVX-512BW на x86 и NEON на ARM). Позволяет упаковывать огромные векторные базы в оперативную память (например, 10 млн эмбеддингов 1536-dim занимают всего 4 ГБ вместо 31 ГБ).

## Особенности
*   **Динамический импорт:** Добавление векторов без предварительного этапа обучения (no train step) и перестроения индекса.
*   **Фильтрация на этапе SIMD-поиска:** Встроенная фильтрация по списку разрешенных ID (`allowlist`) на уровне SIMD-ядра для устранения накладных расходов.
*   **Интеграции:** LangChain, LlamaIndex, Haystack, Agno.

## Использование (Python)

### Основной индекс (TurboQuantIndex)
```python
from turbovec import TurboQuantIndex

# Создание 4-битного индекса под эмбеддинги OpenAI (1536 измерений)
index = TurboQuantIndex(dim=1536, bit_width=4)
index.add(vectors)

# Поиск 10 ближайших соседей
scores, indices = index.search(query, k=10)

# Сохранение и загрузка
index.write("my_index.tv")
loaded = TurboQuantIndex.load("my_index.tv")
```

### Индекс со стабильными ID (IdMapIndex)
Для возможности удаления векторов и отслеживания их по собственным `uint64` идентификаторам:
```python
import numpy as np
from turbovec import IdMapIndex

index = IdMapIndex(dim=1536, bit_width=4)
index.add_with_ids(vectors, np.array([1001, 1002, 1003], dtype=np.uint64))

# Поиск
scores, ids = index.search(query, k=10)

# Удаление
index.remove(1002)
```

### Гибридный/Отфильтрованный поиск (Rerank)
Ограничение результатов подмножеством, полученным из другой БД (например, SQL/BM25):
```python
# db_ids - список ID, прошедших фильтрацию по метаданным
allowed = np.array(db_ids, dtype=np.uint64)

# Поиск с allowlist
scores, ids = index.search(query, k=10, allowlist=allowed)
```

## Интеграция в фреймворки RAG
Установите соответствующий пакет:
*   `pip install turbovec[langchain]`
*   `pip install turbovec[llama-index]`
*   `pip install turbovec[haystack]`
*   `pip install turbovec[agno]`
