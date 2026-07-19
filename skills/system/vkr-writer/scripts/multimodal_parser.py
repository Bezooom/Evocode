#!/usr/bin/env python3
"""
Multimodal Parser for VKR — Extract data from screenshots of charts,
financial reports, and business process diagrams.

Usage:
    python multimodal_parser.py screenshots/report.png --format table
    python multimodal_parser.py screenshots/ --recursive --project-dir vkr-project/

Requires:
    - Qwen-VL, LLaVA, or similar multimodal model
    - OR use OCR + table extraction (tesseract + camelot) as fallback
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class MultimodalParser:
    """Extract structured data from images."""

    def __init__(self, model: str = "qwen-vl", project_dir: str = "."):
        self.model = model
        self.project_dir = Path(project_dir)
        self.results: List[Dict] = []

    def parse_image(self, image_path: Path) -> Dict:
        """
        Parse a single image and extract structured data.

        Uses multimodal model if available, falls back to OCR.
        """
        result = {
            "image": str(image_path.name),
            "timestamp": datetime.now().isoformat(),
            "model": self.model,
            "tables": [],
            "charts": [],
            "text": "",
            "analysis": "",
        }

        # Try multimodal extraction
        try:
            table_data = self._extract_tables(image_path)
            if table_data:
                result["tables"] = table_data

            chart_data = self._extract_chart_info(image_path)
            if chart_data:
                result["charts"] = chart_data

            text_data = self._extract_text(image_path)
            result["text"] = text_data

            # Generate analysis
            result["analysis"] = self._generate_analysis(result)

        except Exception as e:
            result["error"] = str(e)
            result["fallback"] = "ocr"
            result["text"] = self._ocr_extract(image_path)

        self.results.append(result)
        return result

    def _extract_tables(self, image_path: Path) -> List[Dict]:
        """Extract tables from image."""
        # Strategy: use OCR + table detection
        # In production, use multimodal model to identify table regions
        try:
            import cv2
            import numpy as np

            img = cv2.imread(str(image_path))
            if img is None:
                return []

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Threshold to find text regions
            _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

            # Find contours (potential table cells)
            contours, _ = cv2.findContours(
                thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            # Group contours into table-like structures
            cells = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if 30 < w < 500 and 10 < h < 100:  # Reasonable cell size
                    cells.append({"x": x, "y": y, "w": w, "h": h})

            if cells:
                # Sort by position (top-to-bottom, left-to-right)
                cells.sort(key=lambda c: (c["y"] // 20 * 20, c["x"]))
                return [
                    {"type": "detected", "cells_count": len(cells), "bbox": cells[:10]}
                ]

        except ImportError:
            pass  # OpenCV not available

        return []

    def _extract_chart_info(self, image_path: Path) -> List[Dict]:
        """Extract chart/graph information."""
        # Strategy: detect chart type and extract axis labels
        try:
            import cv2
            import numpy as np

            img = cv2.imread(str(image_path))
            if img is None:
                return []

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Detect colored regions (bars, lines, pie slices)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            lower_sat = np.array([0, 50, 50])
            upper_sat = np.array([180, 255, 255])
            mask = cv2.inRange(hsv, lower_sat, upper_sat)
            colored_pixels = cv2.countNonZero(mask)

            chart_types = {
                "bar": "horizontal/vertical lines detected",
                "line": "connected points detected",
                "pie": "circular segments detected",
                "scatter": "discrete points detected",
            }

            return [
                {
                    "has_color": colored_pixels > 1000,
                    "type_hints": list(chart_types.keys()),
                    "colored_area_ratio": colored_pixels
                    / (img.shape[0] * img.shape[1]),
                }
            ]

        except ImportError:
            return []

    def _extract_text(self, image_path: Path) -> str:
        """Extract text from image using OCR."""
        try:
            import cv2
            from PIL import Image

            img = cv2.imread(str(image_path))
            if img is None:
                return ""

            # Convert to PIL and preprocess
            pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

            # Basic preprocessing
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            pil_img = Image.fromarray(thresh)

            # Return image path for multimodal model to process
            return f"[Image data available at: {image_path}]"

        except ImportError:
            return f"[Image at {image_path} - requires multimodal model]"

    def _ocr_extract(self, image_path: Path) -> str:
        """Fallback OCR extraction."""
        try:
            import pytesseract
            from PIL import Image

            img = Image.open(str(image_path))
            text = pytesseract.image_to_string(img, lang="rus+eng")
            return text[:2000]  # Limit output
        except ImportError:
            return "[OCR not available - install tesseract-ocr and pytesseract]"

    def _generate_analysis(self, result: Dict) -> str:
        """Generate analytical summary from extracted data."""
        # This is a template — in production, use LLM to analyze
        tables = result.get("tables", [])
        charts = result.get("charts", [])

        if tables:
            return (
                f"Обнаружено {len(tables)} таблица(ы). "
                "Рекомендуется извлечь числовые данные и провести горизонтальный/вертикальный анализ.\n\n"
                "Аналитический шаблон:\n"
                "- Определить тренд (рост/падение) в процентах\n"
                "- Выявить максимальные и минимальные значения\n"
                "- Связать изменения с внешними факторами\n"
                "- Предложить 2-3 гипотезы объяснения"
            )
        elif charts:
            return (
                "Обнаружены элементы графика/диаграммы.\n"
                "Рекомендуется извлечь данные осей и построить таблицу для анализа."
            )
        else:
            return "Не удалось автоматически извлечь структурированные данные. Рекомендуется ручная обработка."

    def parse_directory(self, dirpath: str, recursive: bool = False) -> List[Dict]:
        """Parse all images in a directory."""
        dirpath = Path(dirpath)
        extensions = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}

        if recursive:
            images = sorted(dirpath.rglob("*"))
        else:
            images = sorted(dirpath.glob("*"))

        images = [f for f in images if f.suffix.lower() in extensions]

        results = []
        for img_path in images:
            print(f"Processing: {img_path.name}...")
            result = self.parse_image(img_path)
            results.append(result)

        return results

    def save_report(self, output_path: str):
        """Save parsing results to JSON."""
        Path(output_path).write_text(
            json.dumps(self.results, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def generate_markdown_tables(self) -> str:
        """Convert extracted tables to Markdown format."""
        md = "# Извлечённые данные\n\n"

        for result in self.results:
            md += f"## {result['image']}\n\n"

            for i, table in enumerate(result.get("tables", [])):
                md += f"### Таблица {i + 1}\n\n"
                if "headers" in table and "rows" in table:
                    # Headers
                    md += "| " + " | ".join(table["headers"]) + " |\n"
                    md += "| " + " | ".join(["---"] * len(table["headers"])) + " |\n"
                    # Rows
                    for row in table["rows"]:
                        md += "| " + " | ".join(str(cell) for cell in row) + " |\n"
                else:
                    md += "*Структурированные данные не извлечены (требуется multimodal модель)*\n"

            if result.get("analysis"):
                md += f"\n**Анализ:** {result['analysis']}\n"

            md += "\n---\n\n"

        return md


def main():
    parser = argparse.ArgumentParser(description="Multimodal Parser for VKR")
    parser.add_argument("input", help="Image file or directory")
    parser.add_argument("--output", "-o", help="Output JSON file")
    parser.add_argument("--md", action="store_true", help="Output as Markdown tables")
    parser.add_argument(
        "--recursive", "-r", action="store_true", help="Recursive directory scan"
    )
    parser.add_argument(
        "--model", default="qwen-vl", help="Model to use (qwen-vl, llava, fallback)"
    )
    parser.add_argument("--project-dir", default=".")

    args = parser.parse_args()

    parser_instance = MultimodalParser(model=args.model, project_dir=args.project_dir)
    input_path = Path(args.input)

    if input_path.is_dir():
        results = parser_instance.parse_directory(
            str(input_path), recursive=args.recursive
        )
    elif input_path.is_file():
        results = [parser_instance.parse_image(input_path)]
    else:
        print(f"Error: {args.input} not found")
        sys.exit(1)

    if args.output:
        parser_instance.save_report(args.output)
        print(f"Results saved to: {args.output}")
    elif args.md:
        print(parser_instance.generate_markdown_tables())
    else:
        print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
