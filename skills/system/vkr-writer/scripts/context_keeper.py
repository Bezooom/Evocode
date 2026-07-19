#!/usr/bin/env python3
"""
Context Keeper — Manages VKR project state and enforces consistency
with Object, Subject, Goal, and Tasks throughout the writing process.

Usage:
    python context_keeper.py init --degree bachelor --topic "Topic name"
    python context_keeper.py show
    python context_keeper.py validate chapters/02-chapter.md
    python context_keeper.py update --goal "New goal"
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
from datetime import datetime


@dataclass
class VKRContext:
    """Core VKR project context that must be maintained."""
    degree: str = ""  # "bachelor" or "master"
    specialty_code: str = ""
    specialty_name: str = ""
    topic: str = ""
    topic_assignment: str = ""
    object: str = ""  # Объект исследования
    subject: str = ""  # Предмет исследования
    goal: str = ""  # Цель работы
    tasks: List[str] = field(default_factory=list)  # Задачи (5-7)
    methods: List[str] = field(default_factory=list)  # Методы
    scientific novelty: List[str] = field(default_factory=list)  # Научная новизна
    theoretical_significance: str = ""
    practical_significance: str = ""
    deadline: str = ""
    supervisor: str = ""
    created_at: str = ""
    updated_at: str = ""

    def save(self, path: Path):
        """Save context to JSON file."""
        data = asdict(self)
        data["updated_at"] = datetime.now().isoformat()
        (path / "context.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    @classmethod
    def load(cls, path: Path) -> 'VKRContext':
        """Load context from JSON file."""
        ctx_path = path / "context.json"
        if not ctx_path.exists():
            raise FileNotFoundError(f"Context not found at {ctx_path}")

        data = json.loads(ctx_path.read_text(encoding="utf-8"))
        context = cls()
        for key, value in data.items():
            if hasattr(context, key):
                setattr(context, key, value)
        return context


class ContextKeeper:
    """Manages and validates VKR context consistency."""

    def __init__(self, project_dir: str = "."):
        self.project_dir = Path(project_dir)
        self.context = self._load_or_create_context()

    def _load_or_create_context(self) -> VKRContext:
        """Load existing context or create empty."""
        try:
            return VKRContext.load(self.project_dir)
        except FileNotFoundError:
            return VKRContext()

    def init(self, **kwargs) -> VKRContext:
        """Initialize context with provided values."""
        for key, value in kwargs.items():
            if hasattr(self.context, key):
                setattr(self.context, key, value)

        if not self.context.created_at:
            self.context.created_at = datetime.now().isoformat()

        self.context.updated_at = datetime.now().isoformat()
        self.context.save(self.project_dir)
        return self.context

    def update(self, **kwargs) -> VKRContext:
        """Update specific context fields."""
        for key, value in kwargs.items():
            if hasattr(self.context, key):
                setattr(self.context, key, value)

        self.context.updated_at = datetime.now().isoformat()
        self.context.save(self.project_dir)
        return self.context

    def validate_chapter(self, chapter_file: str) -> Dict:
        """
        Validate that a chapter aligns with the project context.

        Returns validation results with issues found.
        """
        chapter_path = Path(chapter_file)
        if not chapter_path.exists():
            return {"error": f"File not found: {chapter_file}"}

        text = chapter_path.read_text(encoding="utf-8")
        issues = []
        warnings = []

        # Check 1: Does the chapter reference the goal?
        if self.context.goal:
            goal_keywords = self._extract_keywords(self.context.goal)
            goal_match_count = sum(1 for kw in goal_keywords if kw.lower() in text.lower())

            if goal_match_count == 0:
                issues.append({
                    "type": "goal_drift",
                    "severity": "error",
                    "description": f"Глава не содержит ключевых слов из цели исследования",
                    "suggestion": f"Цель: {self.context.goal}. Добавьте связь с целью.",
                })

        # Check 2: Does the chapter address its corresponding task?
        tasks = self.context.tasks
        if tasks:
            # Map chapters to tasks (simplified heuristic)
            chapter_num = self._detect_chapter_number(chapter_file)
            if chapter_num and chapter_num <= len(tasks):
                corresponding_task = tasks[chapter_num - 1]
                task_keywords = self._extract_keywords(corresponding_task)
                task_match_count = sum(1 for kw in task_keywords if kw.lower() in text.lower())

                if task_match_count < 2:
                    warnings.append({
                        "type": "task_alignment",
                        "severity": "warning",
                        "description": f"Глава слабо связана с задачей {chapter_num}",
                        "suggestion": f"Задача {chapter_num}: {corresponding_task}. Добавьте больше соответствующих элементов.",
                    })

        # Check 3: Does the chapter reference the object/subject?
        if self.context.object:
            if "объект" not in text.lower() and "объект" not in self.context.object.lower():
                pass  # Not every chapter needs to mention object

        # Check 4: Method consistency
        if self.context.methods:
            text_methods = self._extract_mentioned_methods(text)
            expected_methods = [m.lower() for m in self.context.methods]
            missing_methods = [m for m in expected_methods if m not in text_methods]

            if missing_methods:
                warnings.append({
                    "type": "method_consistency",
                    "severity": "info",
                    "description": f"Методы в главе не соответствуют заявленным: {missing_methods}",
                    "suggestion": f"Заявленные методы: {self.context.methods}",
                })

        # Check 5: Number of citations
        citation_count = len([m for m in text.lower().split() if m.startswith('[') and m.endswith(']')])
        if citation_count < 3 and len(text.split()) > 500:
            warnings.append({
                "type": "low_citations",
                "severity": "warning",
                "description": f"Мало ссылок на источники ({citation_count} для {len(text.split())} слов)",
                "suggestion": "Добавьте минимум 3-5 ссылок на источники.",
            })

        return {
            "file": chapter_file,
            "context_topic": self.context.topic,
            "context_goal": self.context.goal,
            "issues": issues,
            "warnings": warnings,
            "citation_count": citation_count,
            "word_count": len(text.split()),
            "is_consistent": len(issues) == 0,
        }

    def get_prompt_context(self) -> str:
        """Generate context string for inclusion in LLM prompts."""
        lines = [
            "# ВКР Контекст — НЕ ИЗМЕНЯТЬ",
            f"Уровень: {self.context.degree}",
            f"Тема: {self.context.topic}",
            f"Объект: {self.context.object}",
            f"Предмет: {self.context.subject}",
            f"Цель: {self.context.goal}",
            "",
            "Задачи:",
        ]

        for i, task in enumerate(self.context.tasks, 1):
            lines.append(f"  {i}. {task}")

        if self.context.methods:
            lines.append("")
            lines.append("Методы:")
            for method in self.context.methods:
                lines.append(f"  - {method}")

        lines.append("")
        lines.append("# ВАЖНО: Весь текст должен быть согласован с объектом, предметом и целью выше.")
        lines.append("# Если генерация уходит в сторону — вернитесь к задачам.")

        return "\n".join(lines)

    def show_status(self) -> str:
        """Show current project status."""
        status = {
            "created": self.context.created_at,
            "updated": self.context.updated_at,
            "degree": self.context.degree,
            "topic": self.context.topic,
            "object": self.context.object,
            "subject": self.context.subject,
            "goal": self.context.goal,
            "tasks": len(self.context.tasks),
            "methods": len(self.context.methods),
        }
        return json.dumps(status, ensure_ascii=False, indent=2)

    def _extract_keywords(self, text: str, min_length: int = 3) -> List[str]:
        """Extract meaningful keywords from text."""
        stop_words = {
            'и', 'в', 'не', 'на', 'с', 'по', 'для', 'от', 'о', 'из',
            'к', 'у', 'а', 'но', 'или', 'что', 'как', 'это', 'при',
            'быть', 'have', 'has', 'had', 'the', 'a', 'an', 'is', 'are',
        }
        words = re.findall(r'[а-яёa-z]{3,}', text.lower())
        return list(set(w for w in words if w not in stop_words))

    def _detect_chapter_number(self, filename: str) -> Optional[int]:
        """Try to detect chapter number from filename."""
        import re
        match = re.search(r'(\d+)', filename)
        return int(match.group(1)) if match else None

    def _extract_mentioned_methods(self, text: str) -> List[str]:
        """Extract methods mentioned in text."""
        method_patterns = {
            'анализ': r'анализ',
            'синтез': r'синтез',
            'сравнение': r'сравнен',
            'классификация': r'классификац',
            'наблюдение': r'наблюден',
            'эксперимент': r'эксперимент',
            'опрос': r'опрос',
            'анкетирование': r'анкетировани',
            'интервью': r'интервью',
            'статистический': r'статистик',
            'корреляционный': r'корреляц',
            'регрессия': r'регресси',
        }
        return [name for name, pattern in method_patterns.items()
                if re.search(pattern, text, re.IGNORECASE)]


import re

def main():
    parser = argparse.ArgumentParser(description="VKR Context Keeper")
    subparsers = parser.add_subparsers(dest="command")

    # init
    init_p = subparsers.add_parser("init", help="Initialize context")
    init_p.add_argument("--degree", choices=["bachelor", "master"])
    init_p.add_argument("--topic", help="Research topic")
    init_p.add_argument("--object", help="Research object")
    init_p.add_argument("--subject", help="Research subject")
    init_p.add_argument("--goal", help="Research goal")
    init_p.add_argument("--tasks", help="Comma-separated tasks")
    init_p.add_argument("--methods", help="Comma-separated methods")
    init_p.add_argument("--project-dir", default=".")

    # show
    subparsers.add_parser("show", help="Show context")
    subparsers.add_argument("--project-dir", default=".")

    # validate
    validate_p = subparsers.add_parser("validate", help="Validate chapter")
    validate_p.add_argument("chapter", help="Chapter file")
    validate_p.add_argument("--project-dir", default=".")

    # update
    update_p = subparsers.add_parser("update", help="Update context")
    update_p.add_argument("--goal", help="New goal")
    update_p.add_argument("--tasks", help="New tasks (comma-separated)")
    update_p.add_argument("--project-dir", default=".")

    # prompt
    subparsers.add_parser("prompt", help="Show context for prompts")
    subparsers.add_argument("--project-dir", default=".")

    args = parser.parse_args()

    keeper = ContextKeeper(project_dir=args.project_dir)

    if args.command == "init":
        kwargs = {}
        for field in ["degree", "topic", "object", "subject", "goal"]:
            if getattr(args, field):
                kwargs[field] = getattr(args, field)

        if args.tasks:
            kwargs["tasks"] = [t.strip() for t in args.tasks.split(",")]
        if args.methods:
            kwargs["methods"] = [m.strip() for m in args.methods.split(",")]

        context = keeper.init(**kwargs)
        print("Context initialized:")
        print(keeper.show_status())

    elif args.command == "show":
        print(keeper.show_status())

    elif args.command == "validate":
        result = keeper.validate_chapter(args.chapter)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == "update":
        kwargs = {}
        if args.goal:
            kwargs["goal"] = args.goal
        if args.tasks:
            kwargs["tasks"] = [t.strip() for t in args.tasks.split(",")]
        keeper.update(**kwargs)
        print("Context updated:")
        print(keeper.show_status())

    elif args.command == "prompt":
        print(keeper.get_prompt_context())

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
