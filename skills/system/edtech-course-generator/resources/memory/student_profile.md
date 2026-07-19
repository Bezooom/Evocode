# Student Profile (Long-Term Memory)

Этот документ описывает структуру долгосрочного профиля ученика или класса. `edtech-course-generator` использует эти данные для глубокой персонализации каждого нового генерируемого курса.

## 1. Схема профиля (Student/Class Profile)
```json
{
  "profile_id": "student_or_class_id",
  "age_cohort": "10-12 лет",
  "preferred_modalities": ["visual", "interactive"],
  "engagement_history": {
    "high_attention_mechanics": ["Boss Battles", "Secret Codes"],
    "low_attention_mechanics": ["Long Stories", "Ice Breakers"]
  },
  "knowledge_graph": {
    "mastered_concepts": ["Доходы", "Расходы", "Основы бюджета"],
    "struggling_concepts": ["Сложный процент", "Инвестиционные риски"]
  },
  "historical_critic_scores": [98, 92, 85],
  "psychological_traits": {
    "frustration_tolerance": "medium", 
    "growth_mindset_level": "high"
  }
}
```

## 2. Использование (Memory Continuity)
- **Перед генерацией CourseManifest:** Агент считывает `mastered_concepts`, чтобы не повторять уже пройденный материал, а строить новые знания на его базе (Scaffolding).
- **При выборе Gamification:** Агент заменяет механики из `low_attention_mechanics` на `high_attention_mechanics`.
- **Micro-Adaptation:** Если `frustration_tolerance` низкая, агент снижает штрафы (Fail States) в Boss Battles и увеличивает поддерживающий фидбек.