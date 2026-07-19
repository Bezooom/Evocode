from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from enum import Enum

class AgeCohort(str, Enum):
    KIDS_7_10 = "7-10"
    TEENS_11_14 = "11-14"
    TEENS_15_18 = "15-18"

# 1. GraphRAG Ingestion
class Entity(BaseModel):
    name: str = Field(..., description="Название сущности (персонаж, термин, концепция)")
    type: Literal["character", "concept", "term", "location"]
    description: str = Field(..., description="Краткое описание сущности в контексте материала")

class SkillDependencies(BaseModel):
    fgos_competencies: List[str] = Field(..., description="Компетенции по ФГОС (например, метапредметные результаты)")
    century_21_skills: List[str] = Field(..., description="Навыки 21 века (4K: критическое мышление, креативность, коммуникация, координация)")

class CourseVersion(BaseModel):
    version_id: str
    iteration: int
    changelog: str

class CourseManifest(BaseModel):
    title: str = Field(..., description="Название курса")
    version_info: CourseVersion
    metadata: dict = Field(..., description="Метаданные (автор, дата генерации, версия)")
    required_prior_knowledge: List[str] = Field(..., description="Обязательные базовые знания до старта")
    learning_objectives: List[str] = Field(..., description="Ключевые цели обучения (по Блуму)")
    skill_dependencies: SkillDependencies
    post_course_recommendations: List[str] = Field(..., description="Что изучать дальше (следующий шаг)")

class GraphRAGSummary(BaseModel):
    manifest: CourseManifest = Field(..., description="Метаданные и цели курса")
    entities: List[Entity] = Field(..., description="Список извлеченных ключевых сущностей")
    global_summary: str = Field(..., description="Глобальное саммари, объясняющее основную суть курса")
    community_summaries: List[str] = Field(default_factory=list, description="Саммари кластеров знаний (GraphRAG Community Detection)")
    source_quotes: List[str] = Field(default_factory=list, description="Цитаты из текста (Anti-Hallucination)")

class LessonBlock(BaseModel):
    block_id: str
    title: str
    engagement_type: Literal["ice_breaker", "theory", "group_task", "assessment", "reflection"]
    bloom_level: Literal["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"]
    difficulty_micro: int = Field(..., ge=1, le=5, description="Уровень сложности (1-5) внутри урока для тонкой адаптивности")
    cognitive_load_estimate: dict = Field(..., description="Оценка когнитивной нагрузки (Intrinsic, Extraneous, Germane)")
    sensory_hooks: List[str] = Field(default_factory=list, description="Визуальный, аудио или кинестетический хук в начале урока")
    expected_aha_moments: List[str] = Field(default_factory=list, description="Предсказание ключевых моментов озарения (Aha-moments)")
    reflection_prompts: List[str] = Field(default_factory=list, description="Вопросы для Meta-Cognition в конце блока")
    formative_assessment_points: List[str] = Field(default_factory=list, description="Тайминги и механики микро-проверок понимания внутри урока")
    energy_curve: List[int] = Field(..., description="Оценка предполагаемой энергии ученика (учет времени суток/усталости)")
    estimated_time: int = Field(..., description="Тайминг в минутах")
    modalities: List[str] = Field(..., description="Используемые модальности (audio, visual, interactive)")

class ReflectionJournal(BaseModel):
    student_id: str
    lesson_id: str
    expectations: str = Field(..., description="Ожидания до начала урока")
    aha_moments: List[str] = Field(..., description="Что понял (Aha-moments)")
    struggles: List[str] = Field(..., description="Что было сложно и какая стратегия помогла")
    next_steps: str = Field(..., description="Что хочет узнать дальше")

class MicroIntervention(BaseModel):
    trigger_condition: str = Field(..., description="Триггер для вмешательства (например, долгое время ответа, падение вовлеченности)")
    intervention_type: Literal["breathe", "encouragement", "hint", "break", "humor"]
    script: str = Field(..., description="Точный текст или действие ИИ-тьютора для помощи ученику")

class OpenBadge(BaseModel):
    badge_name: str = Field(..., description="Название достижения (Open Badges 2.0)")
    criteria: str = Field(..., description="Строгое описание критериев получения бейджа")
    issuer: str = Field(default="EdTech-Combine", description="Кто выдал бейдж")
    evidence_url: str = Field(..., description="Ссылка на артефакт, подтверждающий навык")

class StudentPortfolio(BaseModel):
    student_id: str
    completed_projects: List[dict] = Field(default_factory=list, description="Список завершенных проектных заданий")
    earned_badges: List[OpenBadge] = Field(default_factory=list, description="Верифицируемые цифровые сертификаты")
    growth_reflection: str = Field(..., description="ИИ-сгенерированное эссе о прогрессе ученика на основе ReflectionJournal")
    cross_course_transfer: List[str] = Field(default_factory=list, description="Как навыки из одних курсов были перенесены в другие (Meta-Learning)")

class DeploymentPackage(BaseModel):
    docker_compose_snippet: str = Field(..., description="Конфиг docker-compose для мгновенного развертывания курса")
    env_template: str = Field(..., description="Шаблон .env переменных")
    run_instructions: str = Field(..., description="Короткая инструкция по запуску курса (1 команда)")
    course_assets_bundle_url: str = Field(..., description="Ссылка на собранный архив с PPTX, MP3, HTML и ресурсами")

class ConceptNode(BaseModel):
    concept_id: str
    mastery_level: float = Field(..., ge=0.0, le=1.0)
    last_reviewed_date: str
    retention_rate: float = Field(..., ge=0.0, le=1.0)
    preferred_learning_style: str

class StudentProfile(BaseModel):
    profile_id: str
    age_cohort: AgeCohort
    preferred_modalities: List[str]
    high_attention_mechanics: List[str]
    motivation_profile: dict = Field(default_factory=dict, description="Intrinsic vs Extrinsic dominance (Self-Determination Theory)")
    long_term_knowledge_graph: List[ConceptNode] = Field(default_factory=list, description="LTKG: граф усвоенных концепций")
    historical_critic_scores: List[int] = Field(default_factory=list)

class WebCourseDeploy(BaseModel):
    html_bundle: str = Field(..., description="HTML/JS код для деплоя на Vercel/Supabase")
    backend_template: str = Field(..., description="Легковесный бэкенд для трекинга прогресса")

class TeacherDashboard(BaseModel):
    dashboard_layout: dict = Field(..., description="Структура UI дашборда для преподавателя")
    student_progress_metrics: List[str] = Field(..., description="Какие метрики отслеживать в реальном времени")
    group_analytics: dict = Field(..., description="Групповая аналитика для всего класса")

class InteractiveWebDemo(BaseModel):
    html_content: str = Field(..., description="Single-file HTML код для быстрого предпросмотра мини-курса")

class EcosystemIntegration(BaseModel):
    lms_api_webhooks: List[dict] = Field(default_factory=list, description="Webhooks для передачи прогресса в школьные LMS")
    parent_bot_scripts: List[dict] = Field(default_factory=list, description="Сообщения для ежедневных микро-апдейтов в Telegram/Discord бота")
    printable_assets_url: str = Field(default_factory=str, description="Ссылка на Printable PDF (worksheets) и AR-маркеры")
    dashboard_layout: dict = Field(..., description="Структура UI дашборда для преподавателя")
    student_progress_metrics: List[str] = Field(..., description="Какие метрики отслеживать в реальном времени")

class LearningPath(BaseModel):
    path_id: str
    course_name: str
    lessons: List[LessonBlock] = Field(..., description="Массив уроков")
    prerequisites_graph: Dict[str, List[str]] = Field(..., description="Словарь зависимостей между block_id (какой урок открывает следующий)")
    estimated_engagement_curve: List[int] = Field(..., description="Массив оценок ожидаемого внимания (0-100) по минутам урока")

class ParentReport(BaseModel):
    course_name: str
    parent_value_proposition: str = Field(..., description="Ценность курса для родителя (почему это не пустая трата времени)")
    skills_acquired: List[str] = Field(..., description="Какие конкретные навыки (hard/soft) ребенок получит")
    home_discussion_topics: List[str] = Field(..., description="Вопросы, которые родитель может задать ребенку после курса для закрепления материала")
    discussion_questions: List[str] = Field(..., description="3–5 открытых вопросов для совместного обсуждения с ребенком за ужином")

# 2. Audio Overview (Podcast)
class DialogueTurn(BaseModel):
    speaker: Literal["Host 1", "Host 2"]
    text: str = Field(..., description="Текст реплики с междометиями и звуковыми эффектами (SFX).")
    emotion: str = Field(..., description="Эмоция для TTS (enthusiastic, skeptical, amazed, thinking)")

class PodcastScript(BaseModel):
    title: str = Field(..., description="Название подкаста (Deep Dive)")
    hosts: List[str] = Field(..., description="Имена ведущих")
    turns: List[DialogueTurn]

# 3. Interactive Slide Deck (Visual Novel)
class LayoutType(str, Enum):
    SPLIT_SCREEN = "split_screen"
    FULL_IMAGE_OVERLAY = "full_image"
    TITLE_SLIDE = "title_slide"

class CharacterLore(BaseModel):
    name: str = Field(..., description="Имя протагониста")
    backstory: str = Field(..., description="Короткая предыстория (легенда) персонажа")
    goal: str = Field(..., description="Главная цель в рамках квеста")

class SlideChoice(BaseModel):
    button_text: str = Field(..., description="Текст на кнопке (вариант выбора)")
    target_slide_id: str = Field(..., description="ID слайда, куда перейдет ученик")

class GroupTask(BaseModel):
    task_description: str = Field(..., description="Описание командной задачи (на 5 минут)")
    team_roles: List[str] = Field(..., description="Роли в команде (например, 'Капитан', 'Аналитик')")
    gamified_element: str = Field(..., description="Игровая механика (например, 'Взлом сейфа')")
    expected_consensus: str = Field(..., description="Какое общее решение должна выработать команда")

class RichSlide(BaseModel):
    slide_id: str = Field(..., description="Уникальный ID слайда")
    layout: LayoutType
    title: str = Field(..., max_length=50)
    text_content: str = Field(..., max_length=200, description="Минимум текста на слайде (15-20 слов)")
    image_prompt: Optional[str] = Field(None, description="Промпт на английском для ComfyUI (Flux/SDXL)")
    teacher_notes: str = Field(..., description="Подсказки для речи спикера за кадром")
    choices: Optional[List[SlideChoice]] = Field(None, description="Сюжетные развилки (интерактивные кнопки)")
    group_task: Optional[GroupTask] = Field(None, description="Командное испытание на этом слайде")

class PresentationSlides(BaseModel):
    presentation_id: str
    theme: str
    character_lore: CharacterLore
    slides: List[RichSlide]

# 4. Critic Agent (Self-Correction)
class ValidationResult(BaseModel):
    is_valid: bool = Field(..., description="Прошел ли контент проверку на галлюцинации и соответствие возрасту")
    feedback: str = Field(..., description="Подробный фидбек для исправления ошибок (если is_valid=False)")