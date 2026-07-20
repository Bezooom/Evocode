# Примеры SKILL.md для Эвокод

> **Актуально для Router v2:** канон frontmatter и authoring —  
> [`docs/SKILL_AUTHORING.md`](./SKILL_AUTHORING.md) · [`specs/SKILL_ROUTER_V2.md`](../specs/SKILL_ROUTER_V2.md).  
> Seed pack: `skills/system/evocode-*/SKILL.md`.

## 1. Базовый навык (agentic-coordination)

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
  - name: backend-engineering
    version: ">=1.0.0"
---

# Agentic Coordination

Макро-навык для координации агентов, автономных AI-агентов, разработки субагентов, TDD, код-ревью и паттернов командной работы.

## Когда использовать

- Координация агентов, автономные агенты
- Разработка субагентов, ревью кода
- TDD, параллельная отладка, делегирование задач

## Инструкции

1. Классифицировать запрос по типам: координация, субагенты, TDD, код-ревью.
2. Загрузить соответствующий навык через `skill` инструмент.
3. Делегировать работу специализированному субагенту.
4. Агрегировать результат и сообщить пользователю.

## Ограничения

- Не выполняет работу субагента сам — всегда делегирует через `task`.
- Лимит вывода: адаптирует под сложность (до 8000 токенов для сложных задач).
```

## 2. Навык с оверрайдами (frontend-engineering)

```yaml
---
name: frontend-engineering
version: "2.0.1"
source: github.com/evocode/skills
sha: def456ghi789
updated: 2026-07-18
breaking: true
dependencies:
  - name: react-bits
    version: ">=1.5.0"
  - name: tailwind-design-system
    version: ">=1.0.0"
---

# Frontend Engineering

Макро-навык для фронтенд-разработки: React, Next.js, Angular, Vue, мобильная разработка (React Native), UI-компоненты, доступность (accessibility), дизайн-системы.

## Когда использовать

- Создание компонентов, страниц на React/Next.js/Angular
- Мобильные приложения, адаптивная вёрстка
- Tailwind дизайн-система, view transitions
- Миграция React/Angular

## Инструкции

1. Определить тип задачи (компонент, страница, миграция).
2. Загрузить специализированный навык (angular-master, react-bits).
3. Сгенерировать код с учётом design-системы.
4. Провести код-ревью и тестирование.

## Изменения в v2.0

- Добавлена поддержка Angular v21+ (Signal Forms API).
- Убран устаревший формат `@Input()` без signals.
- Изменён формат SKILL.md (добавлены `dependencies`).

## Ограничения

- Не использует Angular v19 и ниже без явного указания.
- Для TypeScript < 5.0 требуется навык `typescript-compat`.
```

## 3. Навык с зависимостями (datamol)

```yaml
---
name: datamol
version: "1.3.0"
source: github.com/evocode/skills
sha: ghi789jkl012
updated: 2026-07-18
breaking: false
dependencies:
  - name: rdkit
    version: ">=2023.0.0"
---

# Datamol

Pythonic wrapper around RDKit with simplified interface and sensible defaults.

## Когда использовать

- Стандартные задачи drug discovery: SMILES parsing, standardization, descriptors
- Fingerprints, clustering, 3D conformers, parallel processing
- Возвращает native rdkit.Chem.Mol objects

## Инструкции

1. Проверить зависимости (rdkit >= 2023.0.0).
2. Импортировать datamol.
3. Использовать simplified interface для стандартных задач.
4. Для advanced control использовать rdkit напрямую.

## Примеры

```python
import datamol as dm

# Парсинг SMILES
mol = dm.to_mol("CCO")

# Расчёт дескрипторов
desc = dm.desc(mol)

# Clustering
clusters = dm.cluster(mol_list)
```

## Ограничения

- Не поддерживает кастомные параметры RDKit (для этого использовать rdkit напрямую).
- Максимальный размер молекулы: 10 000 атомов.
```

## 4. Пользовательский оверрайд (custom-skill)

```yaml
---
name: custom-skill
version: "1.0.0"
source: user/evocode
sha: jkl012mno345
updated: 2026-07-18
breaking: false
dependencies: []
---

# Custom Skill

Пользовательский навык с оверрайдами. Создаётся в `~/.config/evocode/skills/user/`.

## Инструкции

1. Загружается поверх системного навыка с тем же `name`.
2. Не перезаписывается при автообновлениях.
3. Может содержать пользовательские изменения.

## Пример использования

Создайте файл:
```
~/.config/evocode/skills/user/custom-skill/SKILL.md
```

Содержимое:
```yaml
---
name: custom-skill
version: "1.0.0"
source: user/evocode
---
# Custom Skill
...
```

## Преимущества

- Защита от перезаписи при автообновлениях.
- Возможность кастомизации без изменения системных файлов.
- Простое управление через файловую систему.
```

## 5. Навык с breaking changes

```yaml
---
name: breaking-skill
version: "2.0.0"
source: github.com/evocode/skills
sha: mno345pqr678
updated: 2026-07-18
breaking: true
dependencies:
  - name: old-dependency
    version: ">=1.0.0"
---

# Breaking Skill

Навык с breaking changes в версии 2.0.

## Изменения в v2.0

- Убран устаревший параметр `legacy_mode`.
- Изменён формат входных данных.
- Добавлена поддержка новых форматов.

## Миграция

1. Обновите SKILL.md до версии 2.0.
2. Замените `legacy_mode: true` на `mode: "v2"`.
3. Проверьте формат входных данных.

## Инструкции

1. Проверить версию навыка (должна быть >= 2.0.0).
2. Использовать новый формат входных данных.
3. Для обратной совместимости использовать `mode: "legacy"`.

## Ограничения

- Не работает с legacy-форматом без явного указания `mode: "legacy"`.
- Требует зависимости `old-dependency >= 1.0.0`.
```

---

*Конец примеров SKILL.md*
