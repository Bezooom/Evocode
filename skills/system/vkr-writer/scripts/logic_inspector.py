#!/usr/bin/env python3
"""
Logic Inspector — Analyzes logical flow between paragraphs and sections.
Detects logical gaps, weak transitions, and structural inconsistencies.

Usage:
    python logic_inspector.py chapters/01-theoretical-chapter.md
    python logic_inspector.py chapters/ --report
    python logic_inspector.py chapters/01-theoretical-chapter.md --fix
"""

import os
import sys
import re
import argparse
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime


@dataclass
class LogicIssue:
    """A detected logical issue."""

    severity: str  # "error", "warning", "info"
    section: str
    location: str
    issue_type: str
    description: str
    suggestion: str


@dataclass
class SectionInfo:
    """Information about a document section."""

    heading: str
    level: int
    content: str
    paragraphs: List[str]
    start_line: int
    end_line: int
    prev_section: Optional[str] = None
    next_section: Optional[str] = None


class LogicInspector:
    """Analyzes logical structure and flow of VKR text."""

    # Transition phrases that should connect sections
    EXPECTED_TRANSITIONS = [
        r"таким\s+образом",
        r"следовательно",
        r"вместе\s+с\s+тем",
        r"однако",
        r"наряду\s+с\s+этим",
        r"в\s+отличие\s+от",
        r"по\s+мнению",
        r"согласно",
        r"как\s+показывает",
        r"на\s+основании",
        r"из\s+вышеизложенного",
        r"учёт\s+вышеизложенного",
        r"выше\s+были\s+рассмотрены",
        r"предыдущий\s+раздел",
        r"в\s+предыдущем",
    ]

    # Prohibited transition phrases
    PROHIBITED_TRANSITIONS = [
        r"перейдём\s+к",
        r"далее\s+рассмотрим",
        r"рассмотрим\s+далее",
        r"теперь\s+рассмотрим",
        r"перейдём\s+к\s+следующему",
    ]

    def __init__(self):
        self.issues: List[LogicIssue] = []
        self.sections: List[SectionInfo] = []

    def parse_document(self, text: str) -> List[SectionInfo]:
        """Parse document into sections based on headings."""
        lines = text.split("\n")
        sections = []
        current_section = None
        current_lines = []
        line_num = 0

        for line in lines:
            line_num += 1

            # Match heading patterns
            heading_match = re.match(r"^(#{1,4})\s+(.+)$", line)

            if heading_match:
                # Save previous section
                if current_section:
                    current_section.content = "\n".join(current_lines).strip()
                    current_section.paragraphs = self._split_paragraphs(
                        current_section.content
                    )
                    current_section.end_line = line_num - 1
                    sections.append(current_section)

                current_section = SectionInfo(
                    heading=heading_match.group(2).strip(),
                    level=len(heading_match.group(1)),
                    content="",
                    paragraphs=[],
                    start_line=line_num,
                    end_line=line_num,
                )
                current_lines = []
            elif current_section:
                current_lines.append(line)

        # Save last section
        if current_section:
            current_section.content = "\n".join(current_lines).strip()
            current_section.paragraphs = self._split_paragraphs(current_section.content)
            current_section.end_line = line_num
            sections.append(current_section)

        # Set prev/next links
        for i, section in enumerate(sections):
            section.prev_section = sections[i - 1].heading if i > 0 else None
            section.next_section = (
                sections[i + 1].heading if i < len(sections) - 1 else None
            )

        self.sections = sections
        return sections

    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        return [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    def check_section_flow(self, sections: List[SectionInfo]) -> List[LogicIssue]:
        """Check logical flow between sections."""
        issues = []

        for i, section in enumerate(sections):
            if i == 0:
                continue  # Skip first section

            prev = section.prev_section
            if not prev:
                continue

            content = section.content

            # Check 1: Does the section start with a transition from previous?
            has_transition = False
            first_para = section.paragraphs[0] if section.paragraphs else ""

            for pattern in self.EXPECTED_TRANSITIONS:
                if re.search(pattern, first_para, re.IGNORECASE):
                    has_transition = True
                    break

            if not has_transition and len(first_para) > 100:
                issues.append(
                    LogicIssue(
                        severity="warning",
                        section=section.heading,
                        location=f"beginning of section",
                        issue_type="weak_transition",
                        description=f"Параграф '{section.heading}' не имеет связки с предыдущим разделом",
                        suggestion=f"Добавьте переходный абзац в начало. Например: 'Изложенный материал о {prev} создаёт предпосылки для анализа...'",
                    )
                )

            # Check 2: Does the previous section end with a transition forward?
            if i > 0:
                prev_section = sections[i - 1]
                prev_last_para = (
                    prev_section.paragraphs[-1] if prev_section.paragraphs else ""
                )

                # Check for prohibited phrases
                for pattern in self.PROHIBITED_TRANSITIONS:
                    if re.search(pattern, prev_last_para, re.IGNORECASE):
                        issues.append(
                            LogicIssue(
                                severity="error",
                                section=prev_section.heading,
                                location=f"end (line ~{prev_section.end_line})",
                                issue_type="prohibited_transition",
                                description=f"Обнаружена запрещённая фраза перехода: '{re.search(pattern, prev_last_para, re.IGNORECASE).group()}'",
                                suggestion="Замените на связующий абзац (см. промпт 'Сшиватель логики').",
                            )
                        )

                # Check if last paragraph summarizes and bridges
                if len(prev_last_para) > 200:
                    has_summary = False
                    for pattern in [
                        r"таким\s+образом",
                        r"следовательно",
                        r"итог",
                        r"вывод",
                    ]:
                        if re.search(pattern, prev_last_para, re.IGNORECASE):
                            has_summary = True
                            break

                    if not has_summary:
                        issues.append(
                            LogicIssue(
                                severity="info",
                                section=prev_section.heading,
                                location=f"end (line ~{prev_section.end_line})",
                                issue_type="missing_summary",
                                description=f"Последний абзац '{prev_section.heading}' не содержит итогового предложения",
                                suggestion="Добавьте 1-2 предложения, подводящих итог раздела и намечающих переход к следующей теме.",
                            )
                        )

        return issues

    def check_internal_consistency(
        self, sections: List[SectionInfo]
    ) -> List[LogicIssue]:
        """Check consistency within and between sections."""
        issues = []

        # Collect all goals/objectives mentioned
        goals = []
        for section in sections:
            for para in section.paragraphs:
                # Look for goal references
                goal_match = re.search(
                    r"(задача\s+(?:1|2|3|4|5|6|7)|цель\s+работы)", para, re.IGNORECASE
                )
                if goal_match:
                    goals.append((section.heading, para[:100]))

        # Check 1: Are all tasks addressed?
        for section in sections:
            content = section.content

            # Each practical chapter should reference the objectives
            if (
                "практич" in section.heading.lower()
                or "исслед" in section.heading.lower()
            ):
                if "задача" not in content.lower():
                    issues.append(
                        LogicIssue(
                            severity="warning",
                            section=section.heading,
                            location="entire section",
                            issue_type="missing_goal_reference",
                            description=f"Раздел '{section.heading}' не ссылается на задачи исследования",
                            suggestion="Добавьте ссылки на конкретные задачи ВКР, которые решает данный раздел.",
                        )
                    )

        # Check 2: Logical hierarchy
        for i, section in enumerate(sections):
            if section.level == 1 and i > 0:
                # Check for skipped subsections
                prev_sections = [s for s in sections[:i] if s.level == 2]
                if prev_sections:
                    last_h2 = max(prev_sections, key=lambda s: s.start_line)
                    if section.start_line - last_h2.end_line > 20:
                        issues.append(
                            LogicIssue(
                                severity="info",
                                section=section.heading,
                                location=f"line {section.start_line}",
                                issue_type="large_gap",
                                description=f"Большой пробел ({section.start_line - last_h2.end_line} строк) между подразделом и следующим разделом",
                                suggestion="Проверьте, не пропущен ли подраздел.",
                            )
                        )

        return issues

    def check_paragraph_structure(
        self, sections: List[SectionInfo]
    ) -> List[LogicIssue]:
        """Check paragraph-level structure (TEA-V pattern)."""
        issues = []

        for section in sections:
            if section.level >= 3:
                continue  # Skip sub-subsections

            for i, para in enumerate(section.paragraphs):
                # Check for paragraph with no supporting evidence
                if len(para.split()) > 30 and len(para.split()) < 100:
                    has_evidence = False

                    # Check for evidence markers
                    evidence_patterns = [
                        r"\[\d+\]",  # Citation
                        r"табл\.\s*\d",  # Table reference
                        r"рис\.\s*\d",  # Figure reference
                        r"исследование",  # Research mention
                        r"данные",  # Data mention
                        r"показывает",  # Shows
                        r"подтверждает",  # Confirms
                        r"\d+\s*%",  # Percentage
                        r"\d+\s*-\s*\d+",  # Number range
                    ]

                    for pattern in evidence_patterns:
                        if re.search(pattern, para, re.IGNORECASE):
                            has_evidence = True
                            break

                    if not has_evidence:
                        issues.append(
                            LogicIssue(
                                severity="warning",
                                section=section.heading,
                                location=f"paragraph {i + 1}",
                                issue_type="unsupported_claim",
                                description=f"Абзац в '{section.heading}' содержит утверждение без подтверждений",
                                suggestion="Добавьте ссылку на источник, таблицу, или конкретные данные.",
                            )
                        )

        return issues

    def generate_bridge_paragraph(
        self, prev_section: str, next_section: str, prev_summary: str, next_intro: str
    ) -> str:
        """Generate a bridge paragraph between two sections."""
        # This would use an LLM call in production
        # For now, return a template

        return (
            f"Выше был рассмотрен {prev_section}. "
            f"Анализ показал, что {prev_summary[:100]}... "
            f"Полученные результаты создают основу для изучения "
            f"{next_intro[:100]}..., что и будет предметом дальнейшего анализа."
        )

    def full_analysis(self, text: str) -> Dict:
        """Run full logic analysis on document."""
        sections = self.parse_document(text)
        flow_issues = self.check_section_flow(sections)
        consistency_issues = self.check_internal_consistency(sections)
        paragraph_issues = self.check_paragraph_structure(sections)

        all_issues = flow_issues + consistency_issues + paragraph_issues

        # Sort by severity
        severity_order = {"error": 0, "warning": 1, "info": 2}
        all_issues.sort(key=lambda x: severity_order.get(x.severity, 3))

        self.issues = all_issues

        return {
            "generated_at": datetime.now().isoformat(),
            "sections_count": len(sections),
            "issues_count": len(all_issues),
            "issues_by_severity": {
                "error": len([i for i in all_issues if i.severity == "error"]),
                "warning": len([i for i in all_issues if i.severity == "warning"]),
                "info": len([i for i in all_issues if i.severity == "info"]),
            },
            "issues": [
                {
                    "severity": i.severity,
                    "section": i.section,
                    "location": i.location,
                    "type": i.issue_type,
                    "description": i.description,
                    "suggestion": i.suggestion,
                }
                for i in all_issues
            ],
        }

    def print_report(self, analysis: Dict):
        """Print formatted report."""
        print(f"\n{'=' * 60}")
        print(f"Logic Analysis Report")
        print(f"{'=' * 60}")
        print(f"Sections: {analysis['sections_count']}")
        print(f"Issues: {analysis['issues_count']}")
        print(f"  Errors: {analysis['issues_by_severity']['error']}")
        print(f"  Warnings: {analysis['issues_by_severity']['warning']}")
        print(f"  Info: {analysis['issues_by_severity']['info']}")
        print(f"{'=' * 60}\n")

        for issue in analysis["issues"]:
            icon = {"error": "🔴", "warning": "🟡", "info": "🔵"}[issue["severity"]]
            print(f"{icon} [{issue['severity'].upper()}] {issue['section']}")
            print(f"   {issue['location']}: {issue['description']}")
            print(f"   → {issue['suggestion']}")
            print()


def main():
    parser = argparse.ArgumentParser(description="Logic Inspector for VKR")
    parser.add_argument("path", help="Input file or directory")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--fix", action="store_true", help="Apply auto-fixes")

    args = parser.parse_args()

    inspector = LogicInspector()

    path = Path(args.path)

    if path.is_dir():
        # Analyze all chapters
        all_results = []
        for chapter in sorted(path.glob("*.md")):
            text = chapter.read_text(encoding="utf-8")
            result = inspector.full_analysis(text)
            result["file"] = chapter.name
            all_results.append(result)
            if not args.json:
                inspector.print_report(result)

        if args.json:
            print(json.dumps(all_results, ensure_ascii=False, indent=2))
    elif path.is_file():
        text = path.read_text(encoding="utf-8")
        analysis = inspector.full_analysis(text)

        if args.json:
            print(json.dumps(analysis, ensure_ascii=False, indent=2))
        else:
            inspector.print_report(analysis)
    else:
        print(f"Error: {args.path} not found")
        sys.exit(1)


if __name__ == "__main__":
    main()
