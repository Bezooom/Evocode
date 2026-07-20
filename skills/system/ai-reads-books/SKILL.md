---
name: ai-reads-books
domain: general
pack: general
tier: optional
triggers:
  - ai reads books
description: Use AI to read books page-by-page and extract knowledge. Best for studying PDF books with AI-powered analysis, interval summaries, and persistent knowledge bases. Use when user wants to read books with AI, extract knowledge from PDFs, or create book summaries.
---

# AI Reads Books: Page-by-Page PDF Knowledge Extractor

Automated PDF book analysis that reads page-by-page, extracts knowledge points, and generates progressive summaries.

## Features

- 📚 Automated PDF book analysis and knowledge extraction
- 🤖 AI-powered content understanding and summarization
- 📊 Interval-based progress summaries
- 💾 Persistent knowledge base storage
- 📝 Markdown-formatted summaries
- 🎨 Color-coded terminal output
- 🔄 Resume capability with existing knowledge base
- ⚙️ Configurable analysis intervals and test modes
- 🚫 Smart content filtering (skips TOC, index pages, etc.)
- 📂 Organized directory structure for outputs

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure `read_books.py`:**
   ```python
   # Place your PDF file in the project root
   PDF_NAME = "your-book.pdf"
   ANALYSIS_INTERVAL = 10  # Generate summary every N pages
   MODEL = "anthropic/claude-3.5-sonnet"  # Model for processing
   ANALYSIS_MODEL = "openai/gpt-4"  # Model for analysis
   TEST_PAGES = None  # Process entire book
   ```

3. **Run:**
   ```bash
   python read_books.py
   ```

## Output

- `book_analysis/knowledge_bases/` — JSON files with extracted knowledge
- `book_analysis/summaries/` — Markdown interval and final summaries
- `book_analysis/pdfs/` — Copy of analyzed PDF

## Configuration

| Constant | Purpose | Default |
|----------|---------|---------|
| `PDF_NAME` | PDF filename to analyze | - |
| `ANALYSIS_INTERVAL` | Pages between interval summaries | `None` (skip) |
| `MODEL` | Model for processing pages | `anthropic/claude-3.5-sonnet` |
| `ANALYSIS_MODEL` | Model for generating analyses | `openai/gpt-4` |
| `TEST_PAGES` | Pages to process (None = all) | `None` |

## Classes

### `PageContent`
Pydantic model for page analysis:
- `has_content` — Boolean indicating if page has relevant content
- `knowledge` — List of knowledge points extracted

### `load_or_create_knowledge_base()`
Loads existing knowledge base from JSON or creates empty dict.

### `save_knowledge_base(knowledge_base)`
Saves knowledge base to JSON file.

### `process_page(client, page_text, current_knowledge, page_num)`
Processes a single PDF page:
- Sends page text to OpenAI API
- Updates knowledge base
- Saves updated knowledge base

### `load_existing_knowledge()`
Loads existing knowledge from JSON or returns empty list.

## Use Cases

- **Study books** — Extract key concepts from technical books
- **Research papers** — Read and summarize research
- **Technical documentation** — Process API docs, manuals
- **Learning** — Build knowledge base from books
- **Content creation** — Generate summaries for writing

## Tips

- Use smaller `ANALYSIS_INTERVAL` for more detailed summaries
- Set `TEST_PAGES` for quick testing
- Resume capability means you can interrupt and continue
- Smart filtering skips TOC, index, and blank pages
- Knowledge base persists between runs
