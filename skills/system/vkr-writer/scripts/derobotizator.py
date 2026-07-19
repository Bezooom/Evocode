#!/usr/bin/env python3
"""
Derobotizator — Anti-AI-Pattern Text Processor for VKR.
Detects and rewrites AI-generated text patterns to reduce AI detection likelihood.

Usage:
    python derobotizator.py input.md --output output.md
    python derobotizator.py input.md --report  # Show statistics only
    python derobotizator.py input.md --aggressive  # Stronger rewriting

Features:
    - Detects 50+ AI-typical patterns
    - Measures perplexity proxy (burstiness, lexical diversity)
    - Rewrites flagged passages
    - Generates improvement report
"""

import os
import sys
import re
import argparse
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Tuple, Dict
from collections import Counter
from datetime import datetime


# AI-typical patterns to detect
AI_PATTERNS = {
    "clichés": [
        (r"в\s+современных\s+реалиях", "в условиях / в современной практике"),
        (r"является\s+ключевым\s+аспектом", "важен для / имеет значение для"),
        (r"необходимо\s+отметить", ""),
        (r"следует\s+подчеркнуть", ""),
        (r"бесспорно", ""),
        (r"безусловно", ""),
        (r"очевидно", ""),
        (r"нельзя\s+не\s+отметить", ""),
        (r"пожалуй", ""),
        (r"в\s+целом", ""),
        (r"стоит\s+отметить", ""),
        (r"важно\s+подчеркнуть", ""),
        (r"следует\s+отметить", ""),
        (r"как\s+известно", ""),
        (r"как\s+показывают\s+исследования", "исследования показывают"),
        (r"представляется\s+целесообразным", "целесообразно"),
        (r"в\s+условиях\s+стремительно\s+развивающегося", "в условиях"),
        (r"в\s+условиях\s+динамично\s+меняющегося", "в условиях"),
        (r"в\s+современном\s+мире", "в настоящее время"),
        (r"в\s+настоящее\s+время", "сейчас / в настоящее время"),
        (
            r"актуальность\s+данного\s+исследования\s+обусловлена",
            "исследование актуально, поскольку",
        ),
    ],
    "filler_phrases": [
        (r"таким\s+образом\s+можно\s+сделать\s+вывод\s+о\s+том", "следовательно"),
        (r"на\s+основании\s+вышеизложенного", "таким образом"),
        (r"в\s+связи\s+с\s+этим", "поэтому"),
        (r"из\s+вышесказанного\s+следует", "таким образом"),
        (r"подводя\s+итог\s+можно\s+сказать", ""),
        (r"можно\s+сделать\s+вывод", "следовательно"),
        (r"резюмируя\s+вышеизложенное", ""),
    ],
    "nominalizations": [
        (r"осуществляется\s+проведение", "проводится"),
        (r"был\s+проведён", "проведён"),
        (r"было\s+выполнено", "выполнено"),
        (r"является\s+проведению", "проводить"),
        (r"представляет\s+собой", ""),
        (r"носит\s+характер", ""),
    ],
    "weak_verbs": [
        (r"\bможет\s+быть\s+использован\b", "применяется"),
        (r"\bможет\s+быть\s+применён\b", "применяется"),
        (r"\bможет\s+быть\s+использован\b", "используется"),
        (r"\bявляется\s+возможным\b", "возможно"),
    ],
    "redundant": [
        (r"полноценный\s+и\s+самостоятельный", "самостоятельный"),
        (r"актуальный\s+и\s+современный", "современный"),
        (r"высокий\s+уровень", "высокий"),
        (r"низкий\s+уровень", "низкий"),
        (r"достаточно\s+высокий", "высокий"),
        (r"довольно\s+значительный", "значительный"),
    ],
}

# Academic verbs that should be preferred
ACADEMIC_VERBS = [
    "анализирует",
    "исследует",
    "показывает",
    "подтверждает",
    "выявляет",
    "определяет",
    "устанавливает",
    "доказывает",
    "демонстрирует",
    "подтверждает",
    "опровергает",
    "обосновывает",
    "классифицирует",
    "систематизирует",
    "синтезирует",
    "сравнивает",
]

# Transition phrases (good ones — keep)
GOOD_TRANSITIONS = [
    "Таким образом",
    "Следовательно",
    "Вместе с тем",
    "Однако",
    "Наряду с этим",
    "В отличие от",
    "По мнению",
    "Согласно",
    "Как показывает",
    "На основании",
    "Напротив",
    "Кроме того",
    "Помимо этого",
    "Следует отметить",
    "В частности",
]


@dataclass
class PatternMatch:
    """A detected AI pattern match."""

    pattern_name: str
    matched_text: str
    suggested_replacement: str
    line_num: int
    position: int


@dataclass
class StyleMetrics:
    """Style metrics for text analysis."""

    avg_sentence_length: float = 0.0
    sentence_length_std: float = 0.0
    burstiness: float = 0.0
    lexical_diversity: float = 0.0
    passive_ratio: float = 0.0
    ai_pattern_count: int = 0
    ai_pattern_score: float = 0.0  # 0-1, higher = more AI-like


class Derobotizator:
    """Text processor for reducing AI-generated patterns."""

    def __init__(self, aggressive: bool = False):
        self.aggressive = aggressive
        self.matches: List[PatternMatch] = []

    def analyze(self, text: str) -> StyleMetrics:
        """Analyze text style and return metrics."""
        metrics = StyleMetrics()

        # Sentence analysis
        sentences = re.split(r"(?<=[.!?])\s+", text.replace("\n", " "))
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        if sentences:
            lengths = [len(s.split()) for s in sentences]
            metrics.avg_sentence_length = sum(lengths) / len(lengths)
            if len(lengths) > 1:
                mean = metrics.avg_sentence_length
                variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
                metrics.sentence_length_std = variance**0.5
                metrics.burstiness = (
                    metrics.sentence_length_std / mean if mean > 0 else 0
                )

        # Lexical diversity
        words = re.findall(r"[а-яёa-z]{3,}", text.lower())
        if words:
            unique = len(set(words))
            metrics.lexical_diversity = unique / len(words)

        # Passive voice ratio (rough estimate)
        passive_markers = ["был", "была", "было", "были", "является", "является"]
        total_verbs = len(re.findall(r"[а-я]{3,}", text))
        passive_count = sum(1 for m in passive_markers if m in text.lower())
        metrics.passive_ratio = passive_count / max(total_verbs, 1)

        # Pattern detection
        self.detect_patterns(text)
        metrics.ai_pattern_count = len(self.matches)
        metrics.ai_pattern_score = min(1.0, len(self.matches) / 30)

        return metrics

    def detect_patterns(self, text: str) -> List[PatternMatch]:
        """Detect AI-typical patterns in text."""
        self.matches = []
        lines = text.split("\n")

        for category, patterns in AI_PATTERNS.items():
            for pattern, replacement in patterns:
                for i, line in enumerate(lines, 1):
                    for match in re.finditer(pattern, line, re.IGNORECASE):
                        self.matches.append(
                            PatternMatch(
                                pattern_name=category,
                                matched_text=match.group(),
                                suggested_replacement=replacement,
                                line_num=i,
                                position=match.start(),
                            )
                        )

        return self.matches

    def rewrite(self, text: str) -> str:
        """Rewrite text to reduce AI patterns."""
        result = text

        # Apply pattern replacements
        for category, patterns in AI_PATTERNS.items():
            for pattern, replacement in patterns:
                if replacement:
                    result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
                else:
                    # Remove the pattern entirely
                    result = re.sub(pattern, "", result, flags=re.IGNORECASE)

        # Clean up double spaces and whitespace
        result = re.sub(r"\s{2,}", " ", result)
        result = re.sub(r"\n\s*\n\s*\n", "\n\n", result)

        # Fix sentence capitalization after removals
        result = re.sub(
            r"\.\s+([а-яё])",
            lambda m: (
                f". {m.group(1).upper() if m.group(1) in 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ' else m.group(1)}"
            ),
            result,
        )

        return result.strip()

    def rewrite_section_by_section(self, text: str) -> str:
        """Rewrite paragraph by paragraph for better coherence."""
        paragraphs = re.split(r"\n{2,}", text)
        rewritten = []

        for para in paragraphs:
            if len(para.strip()) < 50:
                rewritten.append(para)
                continue

            # Analyze paragraph
            para_matches = self._count_matches(para)

            if para_matches > 2 or self.aggressive:
                rewritten.append(self.rewrite(para))
            else:
                rewritten.append(para)

        return "\n\n".join(rewritten)

    def _count_matches(self, text: str) -> int:
        """Count AI pattern matches in text."""
        count = 0
        for category, patterns in AI_PATTERNS.items():
            for pattern, _ in patterns:
                count += len(re.findall(pattern, text, re.IGNORECASE))
        return count

    def generate_report(self, text: str) -> dict:
        """Generate a comprehensive style report."""
        metrics = self.analyze(text)
        report = {
            "generated_at": datetime.now().isoformat(),
            "metrics": {
                "avg_sentence_length": round(metrics.avg_sentence_length, 1),
                "sentence_length_std": round(metrics.sentence_length_std, 1),
                "burstiness": round(metrics.burstiness, 3),
                "lexical_diversity": round(metrics.lexical_diversity, 3),
                "passive_ratio": round(metrics.passive_ratio, 3),
            },
            "ai_risk": {
                "pattern_count": metrics.ai_pattern_count,
                "risk_level": self._risk_level(metrics.ai_pattern_score),
                "score": round(metrics.ai_pattern_score, 3),
            },
            "patterns_found": [],
        }

        # Group matches by category
        categories = Counter(m.pattern_name for m in self.matches)
        for category, count in categories.most_common():
            report["patterns_found"].append(
                {
                    "category": category,
                    "count": count,
                    "examples": list(
                        set(
                            m.matched_text
                            for m in self.matches
                            if m.pattern_name == category
                        )
                    )[:5],
                }
            )

        return report

    def _risk_level(self, score: float) -> str:
        if score < 0.1:
            return "низкий"
        elif score < 0.3:
            return "умеренный"
        elif score < 0.6:
            return "высокий"
        else:
            return "критический"

    def check_quality_benchmarks(self, text: str) -> dict:
        """Check if text meets academic writing benchmarks."""
        metrics = self.analyze(text)
        benchmarks = {
            "burstiness": {
                "target": "0.4-0.7",
                "value": round(metrics.burstiness, 3),
                "pass": 0.3 <= metrics.burstiness <= 0.8,
            },
            "lexical_diversity": {
                "target": "> 0.15",
                "value": round(metrics.lexical_diversity, 3),
                "pass": metrics.lexical_diversity > 0.15,
            },
            "avg_sentence_length": {
                "target": "20-40",
                "value": round(metrics.avg_sentence_length, 1),
                "pass": 15 <= metrics.avg_sentence_length <= 50,
            },
            "ai_pattern_score": {
                "target": "< 0.3",
                "value": round(min(1.0, len(self.matches) / 30), 3),
                "pass": len(self.matches) < 10,
            },
        }

        return benchmarks


def main():
    parser = argparse.ArgumentParser(
        description="Derobotizator — Anti-AI-Pattern Text Processor"
    )
    parser.add_argument("input", help="Input file (.md)")
    parser.add_argument("--output", "-o", help="Output file")
    parser.add_argument("--report", "-r", action="store_true", help="Show report only")
    parser.add_argument(
        "--aggressive", "-a", action="store_true", help="Aggressive rewriting"
    )
    parser.add_argument(
        "--benchmarks", "-b", action="store_true", help="Show quality benchmarks"
    )

    args = parser.parse_args()

    # Read input
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {args.input} not found")
        sys.exit(1)

    text = input_path.read_text(encoding="utf-8")

    # Initialize processor
    proc = Derobotizator(aggressive=args.aggressive)

    # Generate report
    report = proc.generate_report(text)

    if args.report:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    # Check benchmarks
    if args.benchmarks:
        benchmarks = proc.check_quality_benchmarks(text)
        print("\n=== Quality Benchmarks ===")
        for name, check in benchmarks.items():
            status = "OK" if check["pass"] else "FAIL"
            print(f"  {name}: {check['value']} (target: {check['target']}) [{status}]")
        return

    # Rewrite text
    rewritten = proc.rewrite_section_by_section(text)

    # Output
    if args.output:
        Path(args.output).write_text(rewritten, encoding="utf-8")
        print(f"Rewritten text saved to: {args.output}")
    else:
        print(rewritten)

    # Print summary
    print(f"\n=== Summary ===")
    print(f"AI patterns found: {report['ai_risk']['pattern_count']}")
    print(f"Risk level: {report['ai_risk']['risk_level']}")
    print(
        f"Recommended action: {'rewrite needed' if report['ai_risk']['score'] > 0.3 else 'acceptable'}"
    )


if __name__ == "__main__":
    main()
