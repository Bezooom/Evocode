# Миграция навыков из kilocode в «Эвокод»

---

## 1. Обзор миграции

### Цель

Перенос существующих навыков из kilocode в «Эвокод» с адаптацией под новый формат SKILL.md.

### Источники навыков

| Источник | Путь | Количество |
|----------|------|------------|
| **Основные** | `~/.config/kilo/skills/` | ~120 |
| **Дополнительные** | `~/.kilo/skills/` | ~150 |
| **Итого** | | **~270** |

### Текущая структура навыка

```
skill-name/
├── SKILL.md           # Основная инструкция
├── REFERENCE.md       # Ссылки (опционально)
├── EXAMPLES.md        # Примеры (опционально)
└── scripts/           # Скрипты (опционально)
    └── helper.js
```

### Целевая структура навыка в «Эвокод»

```
skill-name/
├── SKILL.md           # Основная инструкция (с метаданными)
├── REFERENCE.md       # Ссылки (опционально)
├── EXAMPLES.md        # Примеры (опционально)
├── scripts/           # Скрипты (опционально)
│   └── helper.js
└── manifest.json      # Метаданные (версия, зависимости, breaking)
```

### Метаданные в SKILL.md

```yaml
---
name: skill-name
version: "1.0.0"
source: github.com/evocode/skills
sha: abc123def456
updated: 2026-07-18
breaking: false
dependencies:
  - name: other-skill
    version: ">=1.0.0"
---
```

### Приоритетные навыки

#### Критически важные (MVP) — 7 навыков

| Навык | Назначение |
|--------|------------|
| `agentic-coordination` | Координация агентов |
| `frontend-engineering` | Frontend-разработка |
| `backend-engineering` | Backend-разработка |
| `devops-stack` | CI/CD, деплой |
| `architecture-diagram` | Диаграммы |
| `tdd` | Тестирование |
| `write-a-skill` | Создание навыков |

#### Важные (Phase 1) — 5 навыков

| Навык | Назначение |
|--------|------------|
| `git-guardrails` | Безопасность git |
| `document-converter` | Конвертация документов |
| `scientific-publishing-master` | Научные публикации |
| `aztp-skills` | ГОСТ-документация |
| `software-copyright-materials` | Регистрация ПО |

#### Дополнительные (Phase 2+) — 10+ навыков

| Навык | Назначение |
|--------|------------|
| `seo-master` | SEO |
| `marketing-ideas` | Маркетинг |
| `copywriting` | Копирайтинг |
| `ads` | Рекламные кампании |
| `cold-email` | Холодные письма |
| `data-engineering` | Data Engineering |
| `security-operations` | Безопасность |
| `ai-ml-engineering` | AI/ML |
| `enterprise-ui-architect` | Enterprise UI |
| `frontend-design` | Frontend-дизайн |

### Этапы миграции

| Этап | Срок |
|------|------|
| 1. Инвентаризация | 1 день |
| 2. Адаптация метаданных | 2-3 дня |
| 3. Перенос в системный каталог | 1-2 дня |
| 4. Тестирование | 1-2 дня |
| 5. Документация | 1 день |
| **Итого** | **6-9 дней** |

---

## 2. План действий

### Шаг 1: Копируем навык

```bash
cp -r ~/.config/kilo/skills/agentic-coordination \
      ~/.config/evocode/skills/system/
```

### Шаг 2: Добавляем метаданные в SKILL.md

Открываем SKILL.md и добавляем в начало:

```yaml
---
name: agentic-coordination
version: "1.2.0"
source: github.com/evocode/skills
sha: abc123def456
updated: 2026-07-18
breaking: false
dependencies:
  - name: frontend-engineering
    version: ">=1.0.0"
---
```

### Шаг 3: Создаём manifest.json

```json
{
  "name": "agentic-coordination",
  "version": "1.2.0",
  "source": "github.com/evocode/skills",
  "sha": "abc123def456",
  "updated": "2026-07-18",
  "breaking": false,
  "dependencies": [
    {
      "name": "frontend-engineering",
      "version": ">=1.0.0"
    }
  ]
}
```

### Шаг 4: Проверяем

- [ ] Навык загружается
- [ ] Зависимости удовлетворяются
- [ ] Скрипты работают

### Порядок действий

1. **Создать каталог** `~/.config/evocode/skills/system/`
2. **Перенести критически важные навыки** (7 штук)
3. **Адаптировать метаданные** для каждого навыка
4. **Протестировать загрузку** всех навыков
5. **Перенести важные навыки** (5 штук)
6. **Протестировать** снова
7. **Перенести дополнительные навыки** (10+ штук)
8. **Документировать** результат

### Ожидаемый результат

- Все навыки из kilocode в «Эвокод»
- Адаптированные метаданные (версия, зависимости, breaking)
- Возможность автообновления через Skill Sync Engine
- Поддержка оверрайдов (пользовательские изменения не перезаписываются)

---

## 3. Текущий статус

### Перенесённые навыки

| Навык | Источник | Статус |
|-------|----------|--------|
| `agentic-coordination` | `~/.config/kilo/skills/` | ✅ Адаптирован |
| `frontend-engineering` | `~/.config/kilo/skills/` | ✅ Адаптирован |
| `backend-engineering` | `~/.config/kilo/skills/` | ✅ Адаптирован |
| `devops-stack` | `~/.config/kilo/skills/` | ✅ Адаптирован |
| `architecture-diagram` | `~/.config/kilo/skills/` | ✅ Адаптирован |
| `tdd` | `~/.config/kilo/skills/` | ✅ Адаптирован |
| `write-a-skill` | `~/.config/kilo/skills/` | ✅ Адаптирован |

**Итого:** 7 навыков перенесено и адаптировано.

### Адаптированные метаданные

Для каждого навыка добавлены:
- `version` — версия по SemVer
- `sha` — хеш источника
- `updated` — дата последнего обновления
- `breaking` — флаг breaking changes
- `dependencies` — список зависимостей

### Структура перенесённых навыков

```
skills/system/
├── agentic-coordination/
│   ├── SKILL.md
│   └── manifest.json
├── frontend-engineering/
│   ├── SKILL.md
│   └── manifest.json
├── backend-engineering/
│   ├── SKILL.md
│   └── manifest.json
├── devops-stack/
│   ├── SKILL.md
│   └── manifest.json
├── architecture-diagram/
│   ├── SKILL.md
│   └── manifest.json
├── tdd/
│   ├── SKILL.md
│   └── manifest.json
└── write-a-skill/
    ├── SKILL.md
    └── manifest.json
```

### Примеры метаданных

#### agentic-coordination

```json
{
  "name": "agentic-coordination",
  "version": "1.2.0",
  "source": "github.com/evocode/skills",
  "sha": "abc123def456",
  "updated": "2026-07-18",
  "breaking": false,
  "dependencies": [
    {
      "name": "frontend-engineering",
      "version": ">=1.0.0"
    },
    {
      "name": "backend-engineering",
      "version": ">=1.0.0"
    }
  ]
}
```

#### frontend-engineering

```json
{
  "name": "frontend-engineering",
  "version": "2.0.1",
  "source": "github.com/evocode/skills",
  "sha": "def456ghi789",
  "updated": "2026-07-18",
  "breaking": true,
  "dependencies": [
    {
      "name": "react-bits",
      "version": ">=1.5.0"
    },
    {
      "name": "tailwind-design-system",
      "version": ">=1.0.0"
    }
  ]
}
```

### Следующие шаги

#### Phase 1 (недели 1-2)

- [ ] Перенести 5 важных навыков:
  - `git-guardrails`
  - `document-converter`
  - `scientific-publishing-master`
  - `aztp-skills`
  - `software-copyright-materials`

#### Phase 2 (недели 3-4)

- [ ] Перенести 10+ дополнительных навыков:
  - `seo-master`
  - `marketing-ideas`
  - `copywriting`
  - `ads`
  - `cold-email`
  - `data-engineering`
  - `security-operations`
  - `ai-ml-engineering`
  - `enterprise-ui-architect`
  - `frontend-design`

#### Phase 3 (недели 5-8)

- [ ] Перенести оставшиеся ~230 навыков из kilocode
- [ ] Настроить Skill Sync Engine для ежедневной синхронизации
- [ ] Протестировать откат (rollback) обновлений

### Итого

- **Перенесено:** 7 навыков
- **Адаптировано метаданных:** 7 навыков
- **Создано manifest.json:** 7 файлов
- **Осталось перенести:** ~242 навыка

---

## Чек-лист миграции

### До начала

- [ ] Просканировать все навыки
- [ ] Выписать метаданные (версия, зависимости)
- [ ] Определить приоритетные навыки

### Во время миграции

- [ ] Скопировать навыки в системный каталог
- [ ] Добавить метаданные в SKILL.md
- [ ] Создать manifest.json
- [ ] Проверить загрузку навыков
- [ ] Протестировать зависимости

### После миграции

- [ ] Все навыки загружаются корректно
- [ ] Зависимости удовлетворяются
- [ ] Breaking changes обрабатываются
- [ ] Скрипты работают
- [ ] Документация актуальна

---

*Конец документа миграции навыков*
