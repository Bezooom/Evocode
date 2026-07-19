# CHANGELOG (EdTech-Combine 2.0 Skill)

## [2.1.0] - 2026-06-04
### Added
- **Multi-Stage Critic:** Разделение оценки на Pedagogical, Engagement, Accessibility и Technical Critic (`evaluation/critic_criteria.md`).
- **Age Profiles:** Возрастные профили вынесены в отдельные файлы для лучшей модульности (`resources/age-profiles/`).
- **Pedagogical Frameworks:** Добавлен Universal Design for Learning (UDL), выделены Bloom, ADDIE, TRIZ (`resources/pedagogical-frameworks/core.md`).
- **Hardware-Aware Scaling:** Инструкции по динамическому масштабированию VRAM в зависимости от загрузки GPU (`resources/architecture.md`).
- **Pydantic Extensions:** Добавлены схемы `CourseManifest`, `LessonBlock` (с `engagement_type` и `bloom_level`), `ParentReport`.
- **GraphRAG Updates:** Внедрена поддержка Community Summaries для Hierarchical Retrieval.
- **Output Contract:** В `SKILL.md` добавлен жесткий контракт вывода (JSON + PPTX + MP3 + Reports).
- **Fallback Logic:** Добавлено умное поведение при отсутствии данных о возрасте.

### Changed
- Переписан `SKILL.md` для максимальной селективности и понятности.
- Убраны монолитные файлы в пользу Progressive Disclosure.
