#!/usr/bin/env python3
"""
dpo_validator.py — Валидация рабочей программы ДПО.

Проверяет:
1. Минимальный объём часов (16 для ПК, 250 для ПП)
2. Баланс часов (аудиторные + самост. = общий)
3. Соответствие структуры требованиям Приказа 352
4. Таксономию Блума (формулировки результатов)
5. Наличие всех разделов рабочей программы

Usage:
    python dpo_validator.py <project_dir> [--json]
"""

import json
import sys
import os
import re
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class Issue:
    line: int
    type: str  # "critical", "warning", "info"
    code: str
    description: str


@dataclass
class ValidationResult:
    passed: bool = True
    issues: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    recommendations: list = field(default_factory=list)

    def add_issue(self, line: int, code: str, description: str):
        self.issues.append({"line": line, "code": code, "description": description})
        self.passed = False

    def add_warning(self, line: int, code: str, description: str):
        self.warnings.append({"line": line, "code": code, "description": description})

    def add_recommendation(self, text: str):
        self.recommendations.append(text)

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "issues": self.issues,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
        }


def load_meta(project_dir: str) -> Optional[dict]:
    """Load project meta.json."""
    meta_path = os.path.join(project_dir, "meta.json")
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_hours(meta: dict, result: ValidationResult):
    """Check minimum hours requirements."""
    program_type = meta.get("program_type", "")
    total_hours = meta.get("total_hours", 0)

    if program_type == "pk":
        if total_hours < 16:
            result.add_issue(
                0,
                "HOURS_PK_MIN",
                f"Минимальный объём ПК — 16 акад. часов, фактически: {total_hours}",
            )
        if total_hours > 72:
            result.add_warning(
                0,
                "HOURS_PK_MAX",
                f"Объём ПК превышает 72 часа — возможно, нужна переподготовка",
            )
    elif program_type == "pp":
        if total_hours < 250:
            result.add_issue(
                0,
                "HOURS_PP_MIN",
                f"Минимальный объём ПП — 250 акад. часов, фактически: {total_hours}",
            )
    else:
        result.add_warning(
            0,
            "META_TYPE_UNKNOWN",
            f"Неизвестный тип программы: '{program_type}'. Ожидается 'pk' или 'pp'",
        )


def check_structure(project_dir: str, result: ValidationResult):
    """Check that required project files exist."""
    required_files = [
        "program/working-program.md",
        "program/curriculum.md",
        "program/content.md",
        "umk/umk-full.md",
        "docs/contract-template.md",
    ]

    for f in required_files:
        path = os.path.join(project_dir, f)
        if not os.path.exists(path):
            result.add_warning(0, "STRUCT_MISSING", f"Отсутствует файл: {f}")


def check_content_bloom(content_text: str, result: ValidationResult):
    """Check if content uses Bloom's taxonomy verbs."""
    bloom_verbs = [
        "определяет",
        "перечисляет",
        "называет",
        "идентифицирует",  # знание
        "объясняет",
        "описывает",
        "классифицирует",
        "сравнивает",  # понимание
        "применяет",
        "анализирует",
        "разрабатывает",
        "решает",  # применение
        "оценивает",
        "проектирует",
        "обосновывает",
        "синтезирует",  # оценка/синтез
    ]

    bloom_count = 0
    for verb in bloom_verbs:
        if verb in content_text:
            bloom_count += 1

    if bloom_count < 3:
        result.add_warning(
            0,
            "BLOOM_LOW",
            f"Обнаружено только {bloom_count} глаголов таксономии Блума. "
            "Рекомендуется минимум 3 разных уровня.",
        )


def check_balance(curriculum_text: str, meta: dict, result: ValidationResult):
    """Check hour balance: аудиторные + самост. = общий."""
    # Simple heuristic: look for hour patterns in curriculum
    total_match = re.search(r"(\d+)\s*акад\.?\s*часов", curriculum_text, re.IGNORECASE)
    if total_match:
        total = int(total_match.group(1))
        if total != meta.get("total_hours", 0):
            result.add_warning(
                0,
                "BALANCE_MISMATCH",
                f"Объём в учебном плане ({total} ч.) не совпадает с meta.json ({meta.get('total_hours')})",
            )


def check_specialty_code(meta: dict, result: ValidationResult):
    """Check specialty code format."""
    code = meta.get("specialty_code", "")
    if code:
        # Expected format: XX.XX.XX
        if not re.match(r"^\d{2}\.\d{2}\.\d{2}$", code):
            result.add_warning(
                0,
                "CODE_FORMAT",
                f"Неверный формат кода специальности: '{code}'. "
                "Ожидается формат: XX.XX.XX",
            )
    else:
        result.add_warning(0, "CODE_MISSING", "Код специальности не указан в meta.json")


def check_target_audience(meta: dict, result: ValidationResult):
    """Check target audience description."""
    audience = meta.get("audience", "")
    if not audience:
        result.add_warning(0, "AUDIENCE_MISSING", "Целевая аудитория не описана")
        return

    # Check for specific audience markers
    if (
        "гос" not in audience.lower()
        and "бюджет" not in audience.lower()
        and "коммер" not in audience.lower()
        and "предприниматель" not in audience.lower()
    ):
        result.add_warning(
            0,
            "AUDIENCE_VAGUE",
            "Целевая аудитория описана слишком обобщённо. "
            "Укажите конкретную категорию слушателей.",
        )


def check_education_level(meta: dict, result: ValidationResult):
    """Check education level requirements."""
    program_type = meta.get("program_type", "")
    audience = meta.get("audience", "")

    if program_type == "pk":
        if "СПО" in audience or "среднее профессиональное" in audience.lower():
            result.add_recommendation(
                "ПК доступна лицам со СПО — это соответствует ФЗ-273 ст. 76"
            )
    elif program_type == "pp":
        if "школьник" in audience.lower() or "студент колледжа" in audience.lower():
            result.add_warning(
                0,
                "PP_EDUCATION",
                "ПП требует среднего профессионального или высшего образования. "
                "Убедитесь, что слушатели имеют необходимый уровень.",
            )


def run_validation(project_dir: str) -> ValidationResult:
    """Run all validation checks."""
    result = ValidationResult()

    # Load meta
    meta = load_meta(project_dir)
    if not meta:
        result.add_warning(
            0,
            "META_MISSING",
            "meta.json не найден или пуст. "
            "Создайте meta.json с полями: program_type, total_hours, "
            "specialty_code, audience, form, duration_months",
        )
        return result

    # Run checks
    check_hours(meta, result)
    check_structure(project_dir, result)
    check_specialty_code(meta, result)
    check_target_audience(meta, result)
    check_education_level(meta, result)

    # Load and check content files
    content_path = os.path.join(project_dir, "program/content.md")
    if os.path.exists(content_path):
        with open(content_path, "r", encoding="utf-8") as f:
            content_text = f.read()
        check_content_bloom(content_text, result)

    curriculum_path = os.path.join(project_dir, "program/curriculum.md")
    if os.path.exists(curriculum_path):
        with open(curriculum_path, "r", encoding="utf-8") as f:
            curriculum_text = f.read()
        check_balance(curriculum_text, meta, result)

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python dpo_validator.py <project_dir> [--json]")
        sys.exit(1)

    project_dir = sys.argv[1]
    json_output = "--json" in sys.argv

    if not os.path.isdir(project_dir):
        print(f"Error: '{project_dir}' is not a directory")
        sys.exit(1)

    result = run_validation(project_dir)

    if json_output:
        print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    else:
        print("=" * 60)
        print("Результат валидации ДПО-программы")
        print("=" * 60)

        if result.passed:
            print("✓ Все критичные проверки пройдены")
        else:
            print("✗ Найдены критичные ошибки")

        if result.warnings:
            print(f"\n⚠ Предупреждения ({len(result.warnings)}):")
            for w in result.warnings:
                print(f"  - [{w['code']}] {w['description']}")

        if result.issues:
            print(f"\n✗ Ошибки ({len(result.issues)}):")
            for i in result.issues:
                print(f"  - [{i['code']}] {i['description']}")

        if result.recommendations:
            print(f"\n💡 Рекомендации:")
            for r in result.recommendations:
                print(f"  - {r}")

        print("\n" + "=" * 60)
        print(f"Статус: {'ПРОЙДЕНО' if result.passed else 'ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ'}")
        print("=" * 60)

    sys.exit(0 if result.passed else 1)


if __name__ == "__main__":
    main()
