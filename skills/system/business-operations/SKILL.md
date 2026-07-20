---
name: business-operations
domain: general
pack: general
tier: optional
triggers:
  - платежная обработка stripe/paypal
  - продуктивность notion/linear
  - финансовое моделирование
  - hr / compliance gdpr
  - business operations
  - payment processing
  - startup analytics
  - startup-аналитика
  - бизнес-операции
  - документы / ocr
  - documents
  - ocr
description: |
  [RU] Макро-навык для бизнес-операций: инструменты продуктивности, OCR/обработка документов, платёжная обработка, startup-аналитика, HR и compliance, финансовое моделирование. Используй при запросах: "OCR документов", "интеграция Stripe/PayPal", "биллинг-автоматизация", "startup метрики и финмодель", "конкурентный анализ", "GDPR/HR-compliance", "Notion/Linear/Google Workspace".
  [EN] Macro-skill for business operations: productivity tools, OCR/documents, payment processing, startup analytics, HR compliance, financial modeling. Triggers: business operations, documents.
metadata:
  category: business
  triggers:
    - Бизнес-операции
    - Документы / OCR
    - Платёжная обработка (Stripe/PayPal)
    - Startup-аналитика
    - Финансовое моделирование
    - HR / compliance (GDPR)
    - Продуктивность (Notion/Linear)
    - Business operations
    - Documents
    - OCR
    - Payment processing
    - Startup analytics
---

# MACRO-SKILL: BUSINESS-OPERATIONS
This is a superset of the following micro-skills: codex-hermes-agent-main--skills--productivity--ocr-and-documents, codex-hermes-agent-main--optional-skills--productivity--canvas, codex-hermes-agent-main--optional-skills--productivity--memento-flashcards, codex-agents-main--plugins--startup-business-analyst--skills--market-sizing-analysis, codex-hermes-agent-main--optional-skills--productivity--siyuan, codex-agents-main--plugins--payment-processing--skills--paypal-integration, codex-agents-main--plugins--startup-business-analyst--skills--team-composition-analysis, codex-agents-main--plugins--startup-business-analyst--skills--startup-financial-modeling, codex-agents-main--plugins--hr-legal-compliance--skills--employment-contract-templates, codex-agents-main--plugins--startup-business-analyst--skills--startup-metrics-framework, codex-agents-main--plugins--hr-legal-compliance--skills--gdpr-data-handling, codex-hermes-agent-main--skills--productivity--notion, codex-agents-main--plugins--startup-business-analyst--skills--competitive-landscape, codex-hermes-agent-main--skills--productivity--powerpoint, codex-hermes-agent-main--skills--productivity--google-workspace, codex-agents-main--plugins--payment-processing--skills--billing-automation, codex-hermes-agent-main--optional-skills--email--agentmail, codex-agents-main--plugins--payment-processing--skills--stripe-integration, codex-hermes-agent-main--skills--productivity--nano-pdf, codex-hermes-agent-main--skills--email--himalaya, codex-hermes-agent-main--optional-skills--productivity--telephony, codex-hermes-agent-main--skills--productivity--linear

## Component: codex-hermes-agent-main--skills--productivity--ocr-and-documents

---
name: ocr-and-documents
description: Extract text from PDFs and scanned documents. Use web_extract for remote URLs, pymupdf for local text-based PDFs, marker-pdf for OCR/scanned docs. For DOCX use python-docx, for PPTX see the powerpoint skill.
version: 2.3.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [PDF, Documents, Research, Arxiv, Text-Extraction, OCR]
    related_skills: [powerpoint]
---

# PDF & Document Extraction

For DOCX: use `python-docx` (parses actual document structure, far better than OCR).
For PPTX: see the `powerpoint` skill (uses `python-pptx` with full slide/notes support).
This skill covers **PDFs and scanned documents**.

## Step 1: Remote URL Available?

If the document has a URL, **always try `web_extract` first**:

```
web_extract(urls=["https://arxiv.org/pdf/2402.03300"])
web_extract(urls=["https://example.com/report.pdf"])
```

This handles PDF-to-markdown conversion via Firecrawl with no local dependencies.

Only use local extraction when: the file is local, web_extract fails, or you need batch processing.

## Step 2: Choose Local Extractor

| Feature | pymupdf (~25MB) | marker-pdf (~3-5GB) |
|---------|-----------------|---------------------|
| **Text-based PDF** | ✅ | ✅ |
| **Scanned PDF (OCR)** | ❌ | ✅ (90+ languages) |
| **Tables** | ✅ (basic) | ✅ (high accuracy) |
| **Equations / LaTeX** | ❌ | ✅ |
| **Code blocks** | ❌ | ✅ |
| **Forms** | ❌ | ✅ |
| **Headers/footers removal** | ❌ | ✅ |
| **Reading order detection** | ❌ | ✅ |
| **Images extraction** | ✅ (embedded) | ✅ (with context) |
| **Images → text (OCR)** | ❌ | ✅ |
| **EPUB** | ✅ | ✅ |
| **Markdown output** | ✅ (via pymupdf4llm) | ✅ (native, higher quality) |
| **Install size** | ~25MB | ~3-5GB (PyTorch + models) |
| **Speed** | Instant | ~1-14s/page (CPU), ~0.2s/page (GPU) |

**Decision**: Use pymupdf unless you need OCR, equations, forms, or complex layout analysis.

If the user needs marker capabilities but the system lacks ~5GB free disk:
> "This document needs OCR/advanced extraction (marker-pdf), which requires ~5GB for PyTorch and models. Your system has [X]GB free. Options: free up space, provide a URL so I can use web_extract, or I can try pymupdf which works for text-based PDFs but not scanned documents or equations."

---

## pymupdf (lightweight)

```bash
pip install pymupdf pymupdf4llm
```

**Via helper script**:
```bash
python scripts/extract_pymupdf.py document.pdf              # Plain text
python scripts/extract_pymupdf.py document.pdf --markdown    # Markdown
python scripts/extract_pymupdf.py document.pdf --tables      # Tables
python scripts/extract_pymupdf.py document.pdf --images out/ # Extract images
python scripts/extract_pymupdf.py document.pdf --metadata    # Title, author, pages
python scripts/extract_pymupdf.py document.pdf --pages 0-4   # Specific pages
```

**Inline**:
```bash
python3 -c "
import pymupdf
doc = pymupdf.open('document.pdf')
for page in doc:
    print(page.get_text())
"
```

---

## marker-pdf (high-quality OCR)

```bash
# Check disk space first
python scripts/extract_marker.py --check

pip install marker-pdf
```

**Via helper script**:
```bash
python scripts/extract_marker.py document.pdf                # Markdown
python scripts/extract_marker.py document.pdf --json         # JSON with metadata
python scripts/extract_marker.py document.pdf --output_dir out/  # Save images
python scripts/extract_marker.py scanned.pdf                 # Scanned PDF (OCR)
python scripts/extract_marker.py document.pdf --use_llm      # LLM-boosted accuracy
```

**CLI** (installed with marker-pdf):
```bash
marker_single document.pdf --output_dir ./output
marker /path/to/folder --workers 4    # Batch
```

---

## Arxiv Papers

```
# Abstract only (fast)
web_extract(urls=["https://arxiv.org/abs/2402.03300"])

# Full paper
web_extract(urls=["https://arxiv.org/pdf/2402.03300"])

# Search
web_search(query="arxiv GRPO reinforcement learning 2026")
```

## Split, Merge & Search

pymupdf handles these natively — use `execute_code` or inline Python:

```python
# Split: extract pages 1-5 to a new PDF
import pymupdf
doc = pymupdf.open("report.pdf")
new = pymupdf.open()
for i in range(5):
    new.insert_pdf(doc, from_page=i, to_page=i)
new.save("pages_1-5.pdf")
```

```python
# Merge multiple PDFs
import pymupdf
result = pymupdf.open()
for path in ["a.pdf", "b.pdf", "c.pdf"]:
    result.insert_pdf(pymupdf.open(path))
result.save("merged.pdf")
```

```python
# Search for text across all pages
import pymupdf
doc = pymupdf.open("report.pdf")
for i, page in enumerate(doc):
    results = page.search_for("revenue")
    if results:
        print(f"Page {i+1}: {len(results)} match(es)")
        print(page.get_text("text"))
```

No extra dependencies needed — pymupdf covers split, merge, search, and text extraction in one package.

---

## Notes

- `web_extract` is always first choice for URLs
- pymupdf is the safe default — instant, no models, works everywhere
- marker-pdf is for OCR, scanned docs, equations, complex layouts — install only when needed
- Both helper scripts accept `--help` for full usage
- marker-pdf downloads ~2.5GB of models to `~/.cache/huggingface/` on first use
- For Word docs: `pip install python-docx` (better than OCR — parses actual structure)
- For PowerPoint: see the `powerpoint` skill (uses python-pptx)


---
## Component: codex-hermes-agent-main--optional-skills--productivity--canvas

---
name: canvas
description: Canvas LMS integration — fetch enrolled courses and assignments using API token authentication.
version: 1.0.0
author: community
license: MIT
prerequisites:
  env_vars: [CANVAS_API_TOKEN, CANVAS_BASE_URL]
metadata:
  hermes:
    tags: [Canvas, LMS, Education, Courses, Assignments]
---

# Canvas LMS — Course & Assignment Access

Read-only access to Canvas LMS for listing courses and assignments.

## Scripts

- `scripts/canvas_api.py` — Python CLI for Canvas API calls

## Setup

1. Log in to your Canvas instance in a browser
2. Go to **Account → Settings** (click your profile icon, then Settings)
3. Scroll to **Approved Integrations** and click **+ New Access Token**
4. Name the token (e.g., "Hermes Agent"), set an optional expiry, and click **Generate Token**
5. Copy the token and add to `~/.hermes/.env`:

```
CANVAS_API_TOKEN=your_token_here
CANVAS_BASE_URL=https://yourschool.instructure.com
```

The base URL is whatever appears in your browser when you're logged into Canvas (no trailing slash).

## Usage

```bash
CANVAS="python $HERMES_HOME/skills/productivity/canvas/scripts/canvas_api.py"

# List all active courses
$CANVAS list_courses --enrollment-state active

# List all courses (any state)
$CANVAS list_courses

# List assignments for a specific course
$CANVAS list_assignments 12345

# List assignments ordered by due date
$CANVAS list_assignments 12345 --order-by due_at
```

## Output Format

**list_courses** returns:
```json
[{"id": 12345, "name": "Intro to CS", "course_code": "CS101", "workflow_state": "available", "start_at": "...", "end_at": "..."}]
```

**list_assignments** returns:
```json
[{"id": 67890, "name": "Homework 1", "due_at": "2025-02-15T23:59:00Z", "points_possible": 100, "submission_types": ["online_upload"], "html_url": "...", "description": "...", "course_id": 12345}]
```

Note: Assignment descriptions are truncated to 500 characters. The `html_url` field links to the full assignment page in Canvas.

## API Reference (curl)

```bash
# List courses
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses?enrollment_state=active&per_page=10"

# List assignments for a course
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments?per_page=10&order_by=due_at"
```

Canvas uses `Link` headers for pagination. The Python script handles pagination automatically.

## Rules

- This skill is **read-only** — it only fetches data, never modifies courses or assignments
- On first use, verify auth by running `$CANVAS list_courses` — if it fails with 401, guide the user through setup
- Canvas rate-limits to ~700 requests per 10 minutes; check `X-Rate-Limit-Remaining` header if hitting limits

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 401 Unauthorized | Token invalid or expired — regenerate in Canvas Settings |
| 403 Forbidden | Token lacks permission for this course |
| Empty course list | Try `--enrollment-state active` or omit the flag to see all states |
| Wrong institution | Verify `CANVAS_BASE_URL` matches the URL in your browser |
| Timeout errors | Check network connectivity to your Canvas instance |


---
## Component: codex-hermes-agent-main--optional-skills--productivity--memento-flashcards

---
name: memento-flashcards
description: >-
  Spaced-repetition flashcard system. Create cards from facts or text,
  chat with flashcards using free-text answers graded by the agent,
  generate quizzes from YouTube transcripts, review due cards with
  adaptive scheduling, and export/import decks as CSV.
version: 1.0.0
author: Memento AI
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [Education, Flashcards, Spaced Repetition, Learning, Quiz, YouTube]
    requires_toolsets: [terminal]
    category: productivity
---

# Memento Flashcards — Spaced-Repetition Flashcard Skill

## Overview

Memento gives you a local, file-based flashcard system with spaced-repetition scheduling.
Users can chat with their flashcards by answering in free text and having the agent grade the response before scheduling the next review.
Use it whenever the user wants to:

- **Remember a fact** — turn any statement into a Q/A flashcard
- **Study with spaced repetition** — review due cards with adaptive intervals and agent-graded free-text answers
- **Quiz from a YouTube video** — fetch a transcript and generate a 5-question quiz
- **Manage decks** — organise cards into collections, export/import CSV

All card data lives in a single JSON file. No external API keys are required — you (the agent) generate flashcard content and quiz questions directly.

User-facing response style for Memento Flashcards:
- Use plain text only. Do not use Markdown formatting in replies to the user.
- Keep review and quiz feedback brief and neutral. Avoid extra praise, pep, or long explanations.

## When to Use

Use this skill when the user wants to:
- Save facts as flashcards for later review
- Review due cards with spaced repetition
- Generate a quiz from a YouTube video transcript
- Import, export, inspect, or delete flashcard data

Do not use this skill for general Q&A, coding help, or non-memory tasks.

## Quick Reference

| User intent | Action |
|---|---|
| "Remember that X" / "save this as a flashcard" | Generate a Q/A card, call `memento_cards.py add` |
| Sends a fact without mentioning flashcards | Ask "Want me to save this as a Memento flashcard?" — only create if confirmed |
| "Create a flashcard" | Ask for Q, A, collection; call `memento_cards.py add` |
| "Review my cards" | Call `memento_cards.py due`, present cards one-by-one |
| "Quiz me on [YouTube URL]" | Call `youtube_quiz.py fetch VIDEO_ID`, generate 5 questions, call `memento_cards.py add-quiz` |
| "Export my cards" | Call `memento_cards.py export --output PATH` |
| "Import cards from CSV" | Call `memento_cards.py import --file PATH --collection NAME` |
| "Show my stats" | Call `memento_cards.py stats` |
| "Delete a card" | Call `memento_cards.py delete --id ID` |
| "Delete a collection" | Call `memento_cards.py delete-collection --collection NAME` |

## Card Storage

Cards are stored in a JSON file at:

```
~/.hermes/skills/productivity/memento-flashcards/data/cards.json
```

**Never edit this file directly.** Always use `memento_cards.py` subcommands. The script handles atomic writes (write to temp file, then rename) to prevent corruption.

The file is created automatically on first use.

## Procedure

### Creating Cards from Facts

### Activation Rules

Not every factual statement should become a flashcard. Use this three-tier check:

1. **Explicit intent** — the user mentions "memento", "flashcard", "remember this", "save this card", "add a card", or similar phrasing that clearly requests a flashcard → **create the card directly**, no confirmation needed.
2. **Implicit intent** — the user sends a factual statement without mentioning flashcards (e.g. "The speed of light is 299,792 km/s") → **ask first**: "Want me to save this as a Memento flashcard?" Only create the card if the user confirms.
3. **No intent** — the message is a coding task, a question, instructions, normal conversation, or anything that is clearly not a fact to memorize → **do NOT activate this skill at all**. Let other skills or default behavior handle it.

When activation is confirmed (tier 1 directly, tier 2 after confirmation), generate a flashcard:

**Step 1:** Turn the statement into a Q/A pair. Use this format internally:

```
Turn the factual statement into a front-back pair.
Return exactly two lines:
Q: <question text>
A: <answer text>

Statement: "{statement}"
```

Rules:
- The question should test recall of the key fact
- The answer should be concise and direct

**Step 2:** Call the script to store the card:

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py add \
  --question "What year did World War 2 end?" \
  --answer "1945" \
  --collection "History"
```

If the user doesn't specify a collection, use `"General"` as the default.

The script outputs JSON confirming the created card.

### Manual Card Creation

When the user explicitly asks to create a flashcard, ask them for:
1. The question (front of card)
2. The answer (back of card)
3. The collection name (optional — default to `"General"`)

Then call `memento_cards.py add` as above.

### Reviewing Due Cards

When the user wants to review, fetch all due cards:

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py due
```

This returns a JSON array of cards where `next_review_at <= now`. If a collection filter is needed:

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py due --collection "History"
```

**Review flow (free-text grading):**

Here is an example of the EXACT interaction pattern you must follow. The user answers, you grade them, tell them the correct answer, then rate the card.

**Example interaction:**

> **Agent:** What year did the Berlin Wall fall?
>
> **User:** 1991
>
> **Agent:** Not quite. The Berlin Wall fell in 1989. Next review is tomorrow.
> *(agent calls: memento_cards.py rate --id ABC --rating hard --user-answer "1991")*
>
> Next question: Who was the first person to walk on the moon?

**The rules:**

1. Show only the question. Wait for the user to answer.
2. After receiving their answer, compare it to the expected answer and grade it:
   - **correct** → user got the key fact right (even if worded differently)
   - **partial** → right track but missing the core detail
   - **incorrect** → wrong or off-topic
3. **You MUST tell the user the correct answer and how they did.** Keep it short and plain-text. Use this format:
   - correct: "Correct. Answer: {answer}. Next review in 7 days."
   - partial: "Close. Answer: {answer}. {what they missed}. Next review in 3 days."
   - incorrect: "Not quite. Answer: {answer}. Next review tomorrow."
4. Then call the rate command: correct→easy, partial→good, incorrect→hard.
5. Then show the next question.

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py rate \
  --id CARD_ID --rating easy --user-answer "what the user said"
```

**Never skip step 3.** The user must always see the correct answer and feedback before you move on.

If no cards are due, tell the user: "No cards due for review right now. Check back later!"

**Retire override:** At any point the user can say "retire this card" to permanently remove it from reviews. Use `--rating retire` for this.

### Spaced Repetition Algorithm

The rating determines the next review interval:

| Rating | Interval | ease_streak | Status change |
|---|---|---|---|
| **hard** | +1 day | reset to 0 | stays learning |
| **good** | +3 days | reset to 0 | stays learning |
| **easy** | +7 days | +1 | if ease_streak >= 3 → retired |
| **retire** | permanent | reset to 0 | → retired |

- **learning**: card is actively in rotation
- **retired**: card won't appear in reviews (user has mastered it or manually retired it)
- Three consecutive "easy" ratings automatically retire a card

### YouTube Quiz Generation

When the user sends a YouTube URL and wants a quiz:

**Step 1:** Extract the video ID from the URL (e.g. `dQw4w9WgXcQ` from `https://www.youtube.com/watch?v=dQw4w9WgXcQ`).

**Step 2:** Fetch the transcript:

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/youtube_quiz.py fetch VIDEO_ID
```

This returns `{"title": "...", "transcript": "..."}` or an error.

If the script reports `missing_dependency`, tell the user to install it:
```bash
pip install youtube-transcript-api
```

**Step 3:** Generate 5 quiz questions from the transcript. Use these rules:

```
You are creating a 5-question quiz for a podcast episode.
Return ONLY a JSON array with exactly 5 objects.
Each object must contain keys 'question' and 'answer'.

Selection criteria:
- Prioritize important, surprising, or foundational facts.
- Skip filler, obvious details, and facts that require heavy context.
- Never return true/false questions.
- Never ask only for a date.

Question rules:
- Each question must test exactly one discrete fact.
- Use clear, unambiguous wording.
- Prefer What, Who, How many, Which.
- Avoid open-ended Describe or Explain prompts.

Answer rules:
- Each answer must be under 240 characters.
- Lead with the answer itself, not preamble.
- Add only minimal clarifying detail if needed.
```

Use the first 15,000 characters of the transcript as context. Generate the questions yourself (you are the LLM).

**Step 4:** Validate the output is valid JSON with exactly 5 items, each having non-empty `question` and `answer` strings. If validation fails, retry once.

**Step 5:** Store quiz cards:

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py add-quiz \
  --video-id "VIDEO_ID" \
  --questions '[{"question":"...","answer":"..."},...]' \
  --collection "Quiz - Episode Title"
```

The script deduplicates by `video_id` — if cards for that video already exist, it skips creation and reports the existing cards.

**Step 6:** Present questions one-by-one using the same free-text grading flow:
1. Show "Question 1/5: ..." and wait for the user's answer. Never include the answer or any hint about revealing it.
2. Wait for the user to answer in their own words
3. Grade their answer using the grading prompt (see "Reviewing Due Cards" section)
4. **IMPORTANT: You MUST reply to the user with feedback before doing anything else.** Show the grade, the correct answer, and when the card is next due. Do NOT silently skip to the next question. Keep it short and plain-text. Example: "Not quite. Answer: {answer}. Next review tomorrow."
5. **After showing feedback**, call the rate command and then show the next question in the same message:
```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py rate \
  --id CARD_ID --rating easy --user-answer "what the user said"
```
6. Repeat. Every answer MUST receive visible feedback before the next question.

### Export/Import CSV

**Export:**
```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py export \
  --output ~/flashcards.csv
```

Produces a 3-column CSV: `question,answer,collection` (no header row).

**Import:**
```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py import \
  --file ~/flashcards.csv \
  --collection "Imported"
```

Reads a CSV with columns: question, answer, and optionally collection (column 3). If the collection column is missing, uses the `--collection` argument.

### Statistics

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py stats
```

Returns JSON with:
- `total`: total card count
- `learning`: cards in active rotation
- `retired`: mastered cards
- `due_now`: cards due for review right now
- `collections`: breakdown by collection name

## Pitfalls

- **Never edit `cards.json` directly** — always use the script subcommands to avoid corruption
- **Transcript failures** — some YouTube videos have no English transcript or have transcripts disabled; inform the user and suggest another video
- **Optional dependency** — `youtube_quiz.py` needs `youtube-transcript-api`; if missing, tell the user to run `pip install youtube-transcript-api`
- **Large imports** — CSV imports with thousands of rows work fine but the JSON output may be verbose; summarize the result for the user
- **Video ID extraction** — support both `youtube.com/watch?v=ID` and `youtu.be/ID` URL formats

## Verification

Verify the helper scripts directly:

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py stats
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py add --question "Capital of France?" --answer "Paris" --collection "General"
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py due
```

If you are testing from the repo checkout, run:

```bash
pytest tests/skills/test_memento_cards.py tests/skills/test_youtube_quiz.py -q
```

Agent-level verification:
- Start a review and confirm feedback is plain text, brief, and always includes the correct answer before the next card
- Run a YouTube quiz flow and confirm each answer receives visible feedback before the next question


---
## Component: codex-agents-main--plugins--startup-business-analyst--skills--market-sizing-analysis

---
name: market-sizing-analysis
description: Calculate TAM/SAM/SOM for market opportunities using top-down, bottom-up, and value theory methodologies. Use this skill when sizing markets, estimating addressable revenue, validating market opportunity for a new venture, or building investor-ready market analysis for a startup pitch or business plan.
version: 1.0.0
---

# Market Sizing Analysis

Comprehensive market sizing methodologies for calculating Total Addressable Market (TAM), Serviceable Available Market (SAM), and Serviceable Obtainable Market (SOM) for startup opportunities.

## Overview

Market sizing provides the foundation for startup strategy, fundraising, and business planning. Calculate market opportunity using three complementary methodologies: top-down (industry reports), bottom-up (customer segment calculations), and value theory (willingness to pay).

## Core Concepts

### The Three-Tier Market Framework

**TAM (Total Addressable Market)**

- Total revenue opportunity if achieving 100% market share
- Defines the universe of potential customers
- Used for long-term vision and market validation
- Example: All email marketing software revenue globally

**SAM (Serviceable Available Market)**

- Portion of TAM targetable with current product/service
- Accounts for geographic, segment, or capability constraints
- Represents realistic addressable opportunity
- Example: AI-powered email marketing for e-commerce in North America

**SOM (Serviceable Obtainable Market)**

- Realistic market share achievable in 3-5 years
- Accounts for competition, resources, and market dynamics
- Used for financial projections and fundraising
- Example: 2-5% of SAM based on competitive landscape

### When to Use Each Methodology

**Top-Down Analysis**

- Use when established market research exists
- Best for mature, well-defined markets
- Validates market existence and growth
- Starts with industry reports and narrows down

**Bottom-Up Analysis**

- Use when targeting specific customer segments
- Best for new or niche markets
- Most credible for investors
- Builds from customer data and pricing

**Value Theory**

- Use when creating new market categories
- Best for disruptive innovations
- Estimates based on value creation
- Calculates willingness to pay for problem solution

## Three-Methodology Framework

### Methodology 1: Top-Down Analysis

Start with total market size and narrow to addressable segments.

**Process:**

1. Identify total market category from research reports
2. Apply geographic filters (target regions)
3. Apply segment filters (target industries/customers)
4. Calculate competitive positioning adjustments

**Formula:**

```
TAM = Total Market Category Size
SAM = TAM × Geographic % × Segment %
SOM = SAM × Realistic Capture Rate (2-5%)
```

**When to use:** Established markets with available research (e.g., SaaS, fintech, e-commerce)

**Strengths:** Quick, uses credible data, validates market existence

**Limitations:** May overestimate for new categories, less granular

### Methodology 2: Bottom-Up Analysis

Build market size from customer segment calculations.

**Process:**

1. Define target customer segments
2. Estimate number of potential customers per segment
3. Determine average revenue per customer
4. Calculate realistic penetration rates

**Formula:**

```
TAM = Σ (Segment Size × Annual Revenue per Customer)
SAM = TAM × (Segments You Can Serve / Total Segments)
SOM = SAM × Realistic Penetration Rate (Year 3-5)
```

**When to use:** B2B, niche markets, specific customer segments

**Strengths:** Most credible for investors, granular, defensible

**Limitations:** Requires detailed customer research, time-intensive

### Methodology 3: Value Theory

Calculate based on value created and willingness to pay.

**Process:**

1. Identify problem being solved
2. Quantify current cost of problem (time, money, inefficiency)
3. Calculate value of solution (savings, gains, efficiency)
4. Estimate willingness to pay (typically 10-30% of value)
5. Multiply by addressable customer base

**Formula:**

```
Value per Customer = Problem Cost × % Solved by Solution
Price per Customer = Value × Willingness to Pay % (10-30%)
TAM = Total Potential Customers × Price per Customer
SAM = TAM × % Meeting Buy Criteria
SOM = SAM × Realistic Adoption Rate
```

**When to use:** New categories, disruptive innovations, unclear existing markets

**Strengths:** Shows value creation, works for new markets

**Limitations:** Requires assumptions, harder to validate

## Step-by-Step Process

### Step 1: Define the Market

Clearly specify what market is being measured.

**Questions to answer:**

- What problem is being solved?
- Who are the target customers?
- What's the product/service category?
- What's the geographic scope?
- What's the time horizon?

**Example:**

- Problem: E-commerce companies struggle with email marketing automation
- Customers: E-commerce stores with >$1M annual revenue
- Category: AI-powered email marketing software
- Geography: North America initially, global expansion
- Horizon: 3-5 year opportunity

### Step 2: Gather Data Sources

Identify credible data for calculations.

**Top-Down Sources:**

- Industry research reports (Gartner, Forrester, IDC)
- Government statistics (Census, BLS, trade associations)
- Public company filings and earnings
- Market research firms (Statista, CB Insights, PitchBook)

**Bottom-Up Sources:**

- Customer interviews and surveys
- Sales data and CRM records
- Industry databases (LinkedIn, ZoomInfo, Crunchbase)
- Competitive intelligence
- Academic research

**Value Theory Sources:**

- Customer problem quantification
- Time/cost studies
- ROI case studies
- Pricing research and willingness-to-pay surveys

### Step 3: Calculate TAM

Apply chosen methodology to determine total market.

**For Top-Down:**

1. Find total category size from research
2. Document data source and year
3. Apply growth rate if needed
4. Validate with multiple sources

**For Bottom-Up:**

1. Count total potential customers
2. Calculate average annual revenue per customer
3. Multiply to get TAM
4. Break down by segment

**For Value Theory:**

1. Quantify total addressable customer base
2. Calculate value per customer
3. Estimate pricing based on value
4. Multiply for TAM

### Step 4: Calculate SAM

Narrow TAM to serviceable addressable market.

**Apply Filters:**

- Geographic constraints (regions you can serve)
- Product limitations (features you currently have)
- Customer requirements (size, industry, use case)
- Distribution channel access
- Regulatory or compliance restrictions

**Formula:**

```
SAM = TAM × (% matching all filters)
```

**Example:**

- TAM: $10B global email marketing
- Geographic filter: 40% (North America)
- Product filter: 30% (e-commerce focus)
- Feature filter: 60% (need AI capabilities)
- SAM = $10B × 0.40 × 0.30 × 0.60 = $720M

### Step 5: Calculate SOM

Determine realistic obtainable market share.

**Consider:**

- Current market share of competitors
- Typical market share for new entrants (2-5%)
- Resources available (funding, team, time)
- Go-to-market effectiveness
- Competitive advantages
- Time to achieve (3-5 years typically)

**Conservative Approach:**

```
SOM (Year 3) = SAM × 2%
SOM (Year 5) = SAM × 5%
```

**Example:**

- SAM: $720M
- Year 3 SOM: $720M × 2% = $14.4M
- Year 5 SOM: $720M × 5% = $36M

### Step 6: Validate and Triangulate

Cross-check using multiple methods.

**Validation Techniques:**

1. Compare top-down and bottom-up results (should be within 30%)
2. Check against public company revenues in space
3. Validate customer count assumptions
4. Sense-check pricing assumptions
5. Review with industry experts
6. Compare to similar market categories

**Red Flags:**

- TAM that's too small (< $1B for VC-backed startups)
- TAM that's too large (unsupported by data)
- SOM that's too aggressive (> 10% in 5 years for new entrant)
- Inconsistency between methodologies (> 50% difference)

## Industry-Specific Considerations

### SaaS Markets

**Key Metrics:**

- Number of potential businesses in target segment
- Average contract value (ACV)
- Typical market penetration rates
- Expansion revenue potential

**TAM Calculation:**

```
TAM = Total Target Companies × Average ACV × (1 + Expansion Rate)
```

### Marketplace Markets

**Key Metrics:**

- Gross Merchandise Value (GMV) of category
- Take rate (% of GMV you capture)
- Total transactions or users

**TAM Calculation:**

```
TAM = Total Category GMV × Expected Take Rate
```

### Consumer Markets

**Key Metrics:**

- Total addressable users/households
- Average revenue per user (ARPU)
- Engagement frequency

**TAM Calculation:**

```
TAM = Total Users × ARPU × Purchase Frequency per Year
```

### B2B Services

**Key Metrics:**

- Number of target companies by size/industry
- Average project value or retainer
- Typical buying frequency

**TAM Calculation:**

```
TAM = Total Target Companies × Average Deal Size × Deals per Year
```

## Presenting Market Sizing

### For Investors

**Structure:**

1. Market definition and problem scope
2. TAM/SAM/SOM with methodology
3. Data sources and assumptions
4. Growth projections and drivers
5. Competitive landscape context

**Key Points:**

- Lead with bottom-up calculation (most credible)
- Show triangulation with top-down
- Explain conservative assumptions
- Link to revenue projections
- Highlight market growth rate

### For Strategy

**Structure:**

1. Addressable customer segments
2. Prioritization by opportunity size
3. Entry strategy by segment
4. Expected penetration timeline
5. Resource requirements

**Key Points:**

- Focus on SAM and SOM
- Show segment-level detail
- Connect to go-to-market plan
- Identify expansion opportunities
- Discuss competitive positioning

## Common Mistakes to Avoid

**Mistake 1: Confusing TAM with SAM**

- Don't claim entire market as addressable
- Apply realistic product/geographic constraints
- Be honest about serviceable market

**Mistake 2: Overly Aggressive SOM**

- New entrants rarely capture > 5% in 5 years
- Account for competition and resources
- Show realistic ramp timeline

**Mistake 3: Using Only Top-Down**

- Investors prefer bottom-up validation
- Top-down alone lacks credibility
- Always triangulate with multiple methods

**Mistake 4: Cherry-Picking Data**

- Use consistent, recent data sources
- Don't mix methodologies inappropriately
- Document all assumptions clearly

**Mistake 5: Ignoring Market Dynamics**

- Account for market growth/decline
- Consider competitive intensity
- Factor in switching costs and barriers


## Quick Start

To perform market sizing analysis:

1. **Define the market** - Problem, customers, category, geography
2. **Choose methodology** - Bottom-up (preferred) or top-down + triangulation
3. **Gather data** - Industry reports, customer data, competitive intelligence
4. **Calculate TAM** - Apply methodology formula
5. **Narrow to SAM** - Apply product, geographic, segment filters
6. **Estimate SOM** - 2-5% realistic capture rate
7. **Validate** - Cross-check with alternative methods
8. **Document** - Show methodology, sources, assumptions
9. **Present** - Structure for audience (investors, strategy, operations)


---
## Component: codex-hermes-agent-main--optional-skills--productivity--siyuan

---
name: siyuan
description: SiYuan Note API for searching, reading, creating, and managing blocks and documents in a self-hosted knowledge base via curl.
version: 1.0.0
author: FEUAZUR
license: MIT
metadata:
  hermes:
    tags: [SiYuan, Notes, Knowledge Base, PKM, API]
    related_skills: [obsidian, notion]
    homepage: https://github.com/siyuan-note/siyuan
prerequisites:
  env_vars: [SIYUAN_TOKEN]
  commands: [curl, jq]
required_environment_variables:
  - name: SIYUAN_TOKEN
    prompt: SiYuan API token
    help: "Settings > About in SiYuan desktop app"
  - name: SIYUAN_URL
    prompt: SiYuan instance URL (default http://127.0.0.1:6806)
    required_for: remote instances
---

# SiYuan Note API

Use the [SiYuan](https://github.com/siyuan-note/siyuan) kernel API via curl to search, read, create, update, and delete blocks and documents in a self-hosted knowledge base. No extra tools needed -- just curl and an API token.

## Prerequisites

1. Install and run SiYuan (desktop or Docker)
2. Get your API token: **Settings > About > API token**
3. Store it in `~/.hermes/.env`:
   ```
   SIYUAN_TOKEN=your_token_here
   SIYUAN_URL=http://127.0.0.1:6806
   ```
   `SIYUAN_URL` defaults to `http://127.0.0.1:6806` if not set.

## API Basics

All SiYuan API calls are **POST with JSON body**. Every request follows this pattern:

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/..." \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

Responses are JSON with this structure:
```json
{"code": 0, "msg": "", "data": { ... }}
```
`code: 0` means success. Any other value is an error -- check `msg` for details.

**ID format:** SiYuan IDs look like `20210808180117-6v0mkxr` (14-digit timestamp + 7 alphanumeric chars).

## Quick Reference

| Operation | Endpoint |
|-----------|----------|
| Full-text search | `/api/search/fullTextSearchBlock` |
| SQL query | `/api/query/sql` |
| Read block | `/api/block/getBlockKramdown` |
| Read children | `/api/block/getChildBlocks` |
| Get path | `/api/filetree/getHPathByID` |
| Get attributes | `/api/attr/getBlockAttrs` |
| List notebooks | `/api/notebook/lsNotebooks` |
| List documents | `/api/filetree/listDocsByPath` |
| Create notebook | `/api/notebook/createNotebook` |
| Create document | `/api/filetree/createDocWithMd` |
| Append block | `/api/block/appendBlock` |
| Update block | `/api/block/updateBlock` |
| Rename document | `/api/filetree/renameDocByID` |
| Set attributes | `/api/attr/setBlockAttrs` |
| Delete block | `/api/block/deleteBlock` |
| Delete document | `/api/filetree/removeDocByID` |
| Export as Markdown | `/api/export/exportMdContent` |

## Common Operations

### Search (Full-Text)

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/search/fullTextSearchBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting notes", "page": 0}' | jq '.data.blocks[:5]'
```

### Search (SQL)

Query the blocks database directly. Only SELECT statements are safe.

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/query/sql" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stmt": "SELECT id, content, type, box FROM blocks WHERE content LIKE '\''%keyword%'\'' AND type='\''p'\'' LIMIT 20"}' | jq '.data'
```

Useful columns: `id`, `parent_id`, `root_id`, `box` (notebook ID), `path`, `content`, `type`, `subtype`, `created`, `updated`.

### Read Block Content

Returns block content in Kramdown (Markdown-like) format.

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/getBlockKramdown" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data.kramdown'
```

### Read Child Blocks

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/getChildBlocks" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data'
```

### Get Human-Readable Path

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/getHPathByID" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data'
```

### Get Block Attributes

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/attr/getBlockAttrs" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data'
```

### List Notebooks

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/notebook/lsNotebooks" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.data.notebooks[] | {id, name, closed}'
```

### List Documents in a Notebook

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/listDocsByPath" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notebook": "NOTEBOOK_ID", "path": "/"}' | jq '.data.files[] | {id, name}'
```

### Create a Document

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/createDocWithMd" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notebook": "NOTEBOOK_ID",
    "path": "/Meeting Notes/2026-03-22",
    "markdown": "# Meeting Notes\n\n- Discussed project timeline\n- Assigned tasks"
  }' | jq '.data'
```

### Create a Notebook

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/notebook/createNotebook" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Notebook"}' | jq '.data.notebook.id'
```

### Append Block to Document

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/appendBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentID": "DOCUMENT_OR_BLOCK_ID",
    "data": "New paragraph added at the end.",
    "dataType": "markdown"
  }' | jq '.data'
```

Also available: `/api/block/prependBlock` (same params, inserts at the beginning) and `/api/block/insertBlock` (uses `previousID` instead of `parentID` to insert after a specific block).

### Update Block Content

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/updateBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "BLOCK_ID",
    "data": "Updated content here.",
    "dataType": "markdown"
  }' | jq '.data'
```

### Rename a Document

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/renameDocByID" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "DOCUMENT_ID", "title": "New Title"}'
```

### Set Block Attributes

Custom attributes must be prefixed with `custom-`:

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/attr/setBlockAttrs" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "BLOCK_ID",
    "attrs": {
      "custom-status": "reviewed",
      "custom-priority": "high"
    }
  }'
```

### Delete a Block

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/deleteBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "BLOCK_ID"}'
```

To delete a whole document: use `/api/filetree/removeDocByID` with `{"id": "DOC_ID"}`.
To delete a notebook: use `/api/notebook/removeNotebook` with `{"notebook": "NOTEBOOK_ID"}`.

### Export Document as Markdown

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/export/exportMdContent" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "DOCUMENT_ID"}' | jq -r '.data.content'
```

## Block Types

Common `type` values in SQL queries:

| Type | Description |
|------|-------------|
| `d` | Document (root block) |
| `p` | Paragraph |
| `h` | Heading |
| `l` | List |
| `i` | List item |
| `c` | Code block |
| `m` | Math block |
| `t` | Table |
| `b` | Blockquote |
| `s` | Super block |
| `html` | HTML block |

## Pitfalls

- **All endpoints are POST** -- even read-only operations. Do not use GET.
- **SQL safety**: only use SELECT queries. INSERT/UPDATE/DELETE/DROP are dangerous and should never be sent.
- **ID validation**: IDs match the pattern `YYYYMMDDHHmmss-xxxxxxx`. Reject anything else.
- **Error responses**: always check `code != 0` in responses before processing `data`.
- **Large documents**: block content and export results can be very large. Use `LIMIT` in SQL and pipe through `jq` to extract only what you need.
- **Notebook IDs**: when working with a specific notebook, get its ID first via `lsNotebooks`.

## Alternative: MCP Server

If you prefer a native integration instead of curl, install the SiYuan MCP server:

```yaml
# In ~/.hermes/config.yaml under mcp_servers:
mcp_servers:
  siyuan:
    command: npx
    args: ["-y", "@porkll/siyuan-mcp"]
    env:
      SIYUAN_TOKEN: "your_token"
      SIYUAN_URL: "http://127.0.0.1:6806"
```


---
## Component: codex-agents-main--plugins--payment-processing--skills--paypal-integration

---
name: paypal-integration
description: Integrate PayPal payment processing with support for express checkout, subscriptions, and refund management. Use when implementing PayPal payments, processing online transactions, or building e-commerce checkout flows.
---

# PayPal Integration

Master PayPal payment integration including Express Checkout, IPN handling, recurring billing, and refund workflows.

## When to Use This Skill

- Integrating PayPal as a payment option
- Implementing express checkout flows
- Setting up recurring billing with PayPal
- Processing refunds and payment disputes
- Handling PayPal webhooks (IPN)
- Supporting international payments
- Implementing PayPal subscriptions

## Core Concepts

### 1. Payment Products

**PayPal Checkout**

- One-time payments
- Express checkout experience
- Guest and PayPal account payments

**PayPal Subscriptions**

- Recurring billing
- Subscription plans
- Automatic renewals

**PayPal Payouts**

- Send money to multiple recipients
- Marketplace and platform payments

### 2. Integration Methods

**Client-Side (JavaScript SDK)**

- Smart Payment Buttons
- Hosted payment flow
- Minimal backend code

**Server-Side (REST API)**

- Full control over payment flow
- Custom checkout UI
- Advanced features

### 3. IPN (Instant Payment Notification)

- Webhook-like payment notifications
- Asynchronous payment updates
- Verification required

## Quick Start

```javascript
// Frontend - PayPal Smart Buttons
<div id="paypal-button-container"></div>

<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD"></script>
<script>
  paypal.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: '25.00'
          }
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        // Payment successful
        console.log('Transaction completed by ' + details.payer.name.given_name);

        // Send to backend for verification
        fetch('/api/paypal/capture', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({orderID: data.orderID})
        });
      });
    }
  }).render('#paypal-button-container');
</script>
```

```python
# Backend - Verify and capture order
from paypalrestsdk import Payment
import paypalrestsdk

paypalrestsdk.configure({
    "mode": "sandbox",  # or "live"
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
})

def capture_paypal_order(order_id):
    """Capture a PayPal order."""
    payment = Payment.find(order_id)

    if payment.execute({"payer_id": payment.payer.payer_info.payer_id}):
        # Payment successful
        return {
            'status': 'success',
            'transaction_id': payment.id,
            'amount': payment.transactions[0].amount.total
        }
    else:
        # Payment failed
        return {
            'status': 'failed',
            'error': payment.error
        }
```

## Express Checkout Implementation

### Server-Side Order Creation

```python
import requests
import json

class PayPalClient:
    def __init__(self, client_id, client_secret, mode='sandbox'):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = 'https://api-m.sandbox.paypal.com' if mode == 'sandbox' else 'https://api-m.paypal.com'
        self.access_token = self.get_access_token()

    def get_access_token(self):
        """Get OAuth access token."""
        url = f"{self.base_url}/v1/oauth2/token"
        headers = {"Accept": "application/json", "Accept-Language": "en_US"}

        response = requests.post(
            url,
            headers=headers,
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret)
        )

        return response.json()['access_token']

    def create_order(self, amount, currency='USD'):
        """Create a PayPal order."""
        url = f"{self.base_url}/v2/checkout/orders"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {
                    "currency_code": currency,
                    "value": str(amount)
                }
            }]
        }

        response = requests.post(url, headers=headers, json=payload)
        return response.json()

    def capture_order(self, order_id):
        """Capture payment for an order."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}/capture"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

        response = requests.post(url, headers=headers)
        return response.json()

    def get_order_details(self, order_id):
        """Get order details."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}"
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        response = requests.get(url, headers=headers)
        return response.json()
```

## IPN (Instant Payment Notification) Handling

### IPN Verification and Processing

```python
from flask import Flask, request
import requests
from urllib.parse import parse_qs

app = Flask(__name__)

@app.route('/ipn', methods=['POST'])
def handle_ipn():
    """Handle PayPal IPN notifications."""
    # Get IPN message
    ipn_data = request.form.to_dict()

    # Verify IPN with PayPal
    if not verify_ipn(ipn_data):
        return 'IPN verification failed', 400

    # Process IPN based on transaction type
    payment_status = ipn_data.get('payment_status')
    txn_type = ipn_data.get('txn_type')

    if payment_status == 'Completed':
        handle_payment_completed(ipn_data)
    elif payment_status == 'Refunded':
        handle_refund(ipn_data)
    elif payment_status == 'Reversed':
        handle_chargeback(ipn_data)

    return 'IPN processed', 200

def verify_ipn(ipn_data):
    """Verify IPN message authenticity."""
    # Add 'cmd' parameter
    verify_data = ipn_data.copy()
    verify_data['cmd'] = '_notify-validate'

    # Send back to PayPal for verification
    paypal_url = 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'  # or production URL

    response = requests.post(paypal_url, data=verify_data)

    return response.text == 'VERIFIED'

def handle_payment_completed(ipn_data):
    """Process completed payment."""
    txn_id = ipn_data.get('txn_id')
    payer_email = ipn_data.get('payer_email')
    mc_gross = ipn_data.get('mc_gross')
    item_name = ipn_data.get('item_name')

    # Check if already processed (prevent duplicates)
    if is_transaction_processed(txn_id):
        return

    # Update database
    # Send confirmation email
    # Fulfill order
    print(f"Payment completed: {txn_id}, Amount: ${mc_gross}")

def handle_refund(ipn_data):
    """Handle refund."""
    parent_txn_id = ipn_data.get('parent_txn_id')
    mc_gross = ipn_data.get('mc_gross')

    # Process refund in your system
    print(f"Refund processed: {parent_txn_id}, Amount: ${mc_gross}")

def handle_chargeback(ipn_data):
    """Handle payment reversal/chargeback."""
    txn_id = ipn_data.get('txn_id')
    reason_code = ipn_data.get('reason_code')

    # Handle chargeback
    print(f"Chargeback: {txn_id}, Reason: {reason_code}")
```

## Subscription/Recurring Billing

### Create Subscription Plan

```python
def create_subscription_plan(name, amount, interval='MONTH'):
    """Create a subscription plan."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v1/billing/plans"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client.access_token}"
    }

    payload = {
        "product_id": "PRODUCT_ID",  # Create product first
        "name": name,
        "billing_cycles": [{
            "frequency": {
                "interval_unit": interval,
                "interval_count": 1
            },
            "tenure_type": "REGULAR",
            "sequence": 1,
            "total_cycles": 0,  # Infinite
            "pricing_scheme": {
                "fixed_price": {
                    "value": str(amount),
                    "currency_code": "USD"
                }
            }
        }],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "setup_fee": {
                "value": "0",
                "currency_code": "USD"
            },
            "setup_fee_failure_action": "CONTINUE",
            "payment_failure_threshold": 3
        }
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()

def create_subscription(plan_id, subscriber_email):
    """Create a subscription for a customer."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v1/billing/subscriptions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client.access_token}"
    }

    payload = {
        "plan_id": plan_id,
        "subscriber": {
            "email_address": subscriber_email
        },
        "application_context": {
            "return_url": "https://yourdomain.com/subscription/success",
            "cancel_url": "https://yourdomain.com/subscription/cancel"
        }
    }

    response = requests.post(url, headers=headers, json=payload)
    subscription = response.json()

    # Get approval URL
    for link in subscription.get('links', []):
        if link['rel'] == 'approve':
            return {
                'subscription_id': subscription['id'],
                'approval_url': link['href']
            }
```

## Refund Workflows

```python
def create_refund(capture_id, amount=None, note=None):
    """Create a refund for a captured payment."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v2/payments/captures/{capture_id}/refund"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client.access_token}"
    }

    payload = {}
    if amount:
        payload["amount"] = {
            "value": str(amount),
            "currency_code": "USD"
        }

    if note:
        payload["note_to_payer"] = note

    response = requests.post(url, headers=headers, json=payload)
    return response.json()

def get_refund_details(refund_id):
    """Get refund details."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v2/payments/refunds/{refund_id}"
    headers = {
        "Authorization": f"Bearer {client.access_token}"
    }

    response = requests.get(url, headers=headers)
    return response.json()
```

## Error Handling

```python
class PayPalError(Exception):
    """Custom PayPal error."""
    pass

def handle_paypal_api_call(api_function):
    """Wrapper for PayPal API calls with error handling."""
    try:
        result = api_function()
        return result
    except requests.exceptions.RequestException as e:
        # Network error
        raise PayPalError(f"Network error: {str(e)}")
    except Exception as e:
        # Other errors
        raise PayPalError(f"PayPal API error: {str(e)}")

# Usage
try:
    order = handle_paypal_api_call(lambda: client.create_order(25.00))
except PayPalError as e:
    # Handle error appropriately
    log_error(e)
```

## Testing

```python
# Use sandbox credentials
SANDBOX_CLIENT_ID = "..."
SANDBOX_SECRET = "..."

# Test accounts
# Create test buyer and seller accounts at developer.paypal.com

def test_payment_flow():
    """Test complete payment flow."""
    client = PayPalClient(SANDBOX_CLIENT_ID, SANDBOX_SECRET, mode='sandbox')

    # Create order
    order = client.create_order(10.00)
    assert 'id' in order

    # Get approval URL
    approval_url = next((link['href'] for link in order['links'] if link['rel'] == 'approve'), None)
    assert approval_url is not None

    # After approval (manual step with test account)
    # Capture order
    # captured = client.capture_order(order['id'])
    # assert captured['status'] == 'COMPLETED'
```


---
## Component: codex-agents-main--plugins--startup-business-analyst--skills--team-composition-analysis

---
name: team-composition-analysis
description: Design optimal team structures, hiring plans, compensation strategies, and equity allocation for early-stage startups from pre-seed through Series A. Use this skill when planning headcount, determining which roles to hire next, setting compensation or equity ranges, designing org structure, or building a hiring budget aligned to funding milestones.
version: 1.0.0
---

# Team Composition Analysis

Design optimal team structures, hiring plans, compensation strategies, and equity allocation for early-stage startups from pre-seed through Series A.

## Overview

Build the right team at the right time with appropriate compensation and equity. Plan role-by-role hiring aligned with revenue milestones, budget constraints, and market benchmarks.

## Team Structure by Stage

### Pre-Seed (0-$500K ARR)

**Team Size: 2-5 people**

**Core Roles:**

- Founders (2-3): Product, engineering, business
- First engineer (if needed)
- Contract roles: Design, marketing

**Focus:** Build and validate product-market fit

### Seed ($500K-$2M ARR)

**Team Size: 5-15 people**

**Key Hires:**

- Engineering lead + 2-3 engineers
- First sales/business development
- Product manager
- Marketing/growth lead

**Focus:** Scale product and prove repeatable sales

### Series A ($2M-$10M ARR)

**Team Size: 15-50 people**

**Department Build-Out:**

- Engineering (40%): 6-20 people
- Sales & Marketing (30%): 5-15 people
- Customer Success (10%): 2-5 people
- G&A (10%): 2-5 people
- Product (10%): 2-5 people

**Focus:** Scale revenue and build repeatable processes

## Role-by-Role Planning

### Engineering Team

**Pre-Seed:**

- Founders write code
- 0-1 contract developers

**Seed:**

- Engineering Lead (first $150K-$180K)
- 2-3 Full-Stack Engineers ($120K-$150K)
- 1 Frontend or Backend Specialist ($130K-$160K)

**Series A:**

- VP Engineering ($180K-$250K + equity)
- 2-3 Senior Engineers ($150K-$180K)
- 3-5 Mid-Level Engineers ($120K-$150K)
- 1-2 Junior Engineers ($90K-$120K)
- 1 DevOps/Infrastructure ($140K-$170K)

### Sales & Marketing

**Pre-Seed:**

- Founders do sales
- Contract marketing help

**Seed:**

- First Sales Hire / Head of Sales ($120K-$150K + commission)
- Marketing/Growth Lead ($100K-$140K)
- SDR or BDR (if B2B) ($50K-$70K + commission)

**Series A:**

- VP Sales ($150K-$200K + commission + equity)
- 3-5 Account Executives ($80K-$120K + commission)
- 2-3 SDRs/BDRs ($50K-$70K + commission)
- Marketing Manager ($90K-$130K)
- Content/Demand Gen ($70K-$100K)

### Product Team

**Pre-Seed:**

- Founder as product lead

**Seed:**

- First Product Manager ($120K-$150K)
- Contract designer

**Series A:**

- Head of Product ($150K-$180K)
- 1-2 Product Managers ($120K-$150K)
- Product Designer ($100K-$140K)
- UX Researcher (optional) ($90K-$130K)

### Customer Success

**Pre-Seed:**

- Founders handle support

**Seed:**

- First CS hire (optional) ($60K-$90K)

**Series A:**

- CS Manager ($100K-$130K)
- 2-4 CS Representatives ($60K-$90K)
- Support Engineer (technical) ($80K-$120K)

### G&A (General & Administrative)

**Pre-Seed:**

- Contractors (accounting, legal)

**Seed:**

- Operations/Office Manager ($70K-$100K)
- Contract CFO

**Series A:**

- CFO or Finance Lead ($150K-$200K)
- Recruiter ($80K-$120K)
- Office Manager / EA ($60K-$90K)

## Compensation Strategy

### Base Salary Benchmarks (US, 2024)

**Engineering:**

- Junior: $90K-$120K
- Mid-Level: $120K-$150K
- Senior: $150K-$180K
- Staff/Principal: $180K-$220K
- Engineering Manager: $160K-$200K
- VP Engineering: $180K-$250K

**Sales:**

- SDR/BDR: $50K-$70K base + $50K-$70K commission
- Account Executive: $80K-$120K base + $80K-$120K commission
- Sales Manager: $120K-$160K base + $80K-$120K commission
- VP Sales: $150K-$200K base + $150K-$200K commission

**Product:**

- Product Manager: $120K-$150K
- Senior PM: $150K-$180K
- Head of Product: $150K-$180K
- VP Product: $180K-$220K

**Marketing:**

- Marketing Manager: $90K-$130K
- Content/Demand Gen: $70K-$100K
- Head of Marketing: $130K-$170K
- VP Marketing: $150K-$200K

**Customer Success:**

- CS Representative: $60K-$90K
- CS Manager: $100K-$130K
- VP Customer Success: $140K-$180K

### Total Compensation Formula

```
Total Comp = Base Salary × 1.30 (benefits & taxes) + Equity Value
```

**Fully-Loaded Cost:**

- Base salary
- Payroll taxes (7.65% FICA)
- Benefits (health insurance, 401k): $10K-$15K per employee
- Other (workspace, equipment, software): $5K-$10K per employee

**Rule of Thumb:** Multiply base salary by 1.3-1.4 for fully-loaded cost

### Geographic Adjustments

**San Francisco / New York:** +20-30% above benchmarks
**Seattle / Boston / Los Angeles:** +10-20%
**Austin / Denver / Chicago:** +0-10%
**Remote / Other US Cities:** -10-20%
**International:** Varies widely by country

## Equity Allocation

### Equity by Role and Stage

**Founders:**

- First founder: 40-60%
- Second founder: 20-40%
- Third founder: 10-20%
- Vesting: 4 years with 1-year cliff

**Early Employees (Pre-Seed):**

- First engineer: 0.5-2.0%
- First 5 employees: 0.25-1.0% each

**Seed Stage Hires:**

- VP/Head level: 0.5-1.5%
- Senior IC: 0.1-0.5%
- Mid-level: 0.05-0.25%
- Junior: 0.01-0.1%

**Series A Hires:**

- C-level (CTO, CFO): 1.0-3.0%
- VP level: 0.3-1.0%
- Director level: 0.1-0.5%
- Senior IC: 0.05-0.2%
- Mid-level: 0.01-0.1%
- Junior: 0.005-0.05%

### Equity Pool Sizing

**Option Pool by Round:**

- Pre-Seed: 10-15% reserved
- Seed: 10-15% top-up
- Series A: 10-15% top-up
- Series B+: 5-10% per round

**Pre-Funding Dilution:**
Investors often require option pool creation before investment, diluting founders.

**Example:**

```
Pre-money: $10M
Investors want 15% option pool post-money

Calculation:
Post-money: $15M ($10M + $5M investment)
Option pool: $2.25M (15% × $15M)
Founders diluted by pool creation before new money
```

## Organizational Design

### Reporting Structure

**Pre-Seed:**

```
Founders (flat structure)
├── Contractors
└── First hires (report to founders)
```

**Seed:**

```
CEO
├── Engineering Lead (2-4 engineers)
├── Sales/Growth Lead (1-2 reps)
├── Product Manager
└── Operations
```

**Series A:**

```
CEO
├── CTO / VP Engineering (6-20 people)
│   ├── Engineering Manager(s)
│   └── Individual Contributors
├── VP Sales (5-15 people)
│   ├── Sales Manager
│   ├── Account Executives
│   └── SDRs
├── Head of Product (2-5 people)
│   ├── Product Managers
│   └── Designers
├── Head of Customer Success (2-5 people)
└── CFO / Finance Lead (2-5 people)
    ├── Recruiter
    └── Operations
```

### Span of Control

**Manager Ratios:**

- First-line managers: 4-8 direct reports
- Directors: 3-5 direct reports (managers)
- VPs: 3-5 direct reports (directors)
- CEO: 5-8 direct reports (executive team)

## Full-Time vs. Contract

### Use Full-Time for:

- Core product development
- Sales (revenue-generating roles)
- Mission-critical operations
- Institutional knowledge roles

### Use Contractors for:

- Specialized short-term needs (legal, accounting)
- Variable workload (design, marketing campaigns)
- Skills outside core competency
- Testing role before FTE hire
- Geographic expansion before permanent presence

### Cost Comparison

**Full-Time:**

- Lower hourly cost
- Benefits and overhead
- Long-term commitment
- Cultural fit matters

**Contract:**

- Higher hourly rate ($75-$200/hour vs. $40-$100/hour FTE equivalent)
- No benefits or overhead
- Flexible engagement
- Easier to scale up/down

## Hiring Velocity

### Realistic Timeline

**Role Opening to Hire:**

- Junior: 6-8 weeks
- Mid-Level: 8-12 weeks
- Senior: 12-16 weeks
- Executive: 16-24 weeks

**Time to Productivity:**

- Junior: 4-6 months
- Mid-Level: 2-4 months
- Senior: 1-3 months
- Executive: 3-6 months

### Planning Buffer

Always add 2-3 months buffer to hiring plans.

**Example:**
If need engineer by July 1:

- Start recruiting: April 1 (12 weeks)
- Productivity: September 1 (2 months ramp)

## Budget Planning

### Compensation as % of Revenue

**Early Stage (Seed):**

- Total comp: 120-150% of revenue (burning cash to grow)
- Engineering: 50-60%
- Sales: 30-40%
- Other: 20-30%

**Growth Stage (Series A):**

- Total comp: 70-100% of revenue
- Engineering: 35-45%
- Sales: 25-35%
- Other: 20-30%

### Headcount Budget Formula

```
Total Comp Budget = Σ (Role Count × Fully-Loaded Cost × % of Year)

Example:
3 Engineers × $202K × 100% = $606K
2 AEs × $230K × 75% (mid-year start) = $345K
1 PM × $162K × 100% = $162K
Total: $1.1M
```


## Quick Start

To plan team composition:

1. **Identify stage** - Pre-seed, seed, or Series A
2. **Define roles** - What functions are needed now
3. **Prioritize hires** - Critical path for business goals
4. **Set compensation** - Base salary + equity by level
5. **Plan timeline** - Account for recruiting and ramp time
6. **Calculate budget** - Fully-loaded cost × headcount
7. **Design org chart** - Reporting structure and span of control
8. **Allocate equity** - Fair allocation that preserves pool


---
## Component: codex-agents-main--plugins--startup-business-analyst--skills--startup-financial-modeling

---
name: startup-financial-modeling
description: Build comprehensive 3-5 year financial models with revenue projections, cost structures, cash flow analysis, and scenario planning for early-stage startups. Use this skill when creating financial projections, calculating burn rate or runway, modeling fundraising scenarios, or preparing investor-ready financials for a seed or Series A raise.
version: 1.0.0
---

# Startup Financial Modeling

Build comprehensive 3-5 year financial models with revenue projections, cost structures, cash flow analysis, and scenario planning for early-stage startups.

## Overview

Financial modeling provides the quantitative foundation for startup strategy, fundraising, and operational planning. Create realistic projections using cohort-based revenue modeling, detailed cost structures, and scenario analysis to support decision-making and investor presentations.

## Core Components

### Revenue Model

**Cohort-Based Projections:**
Build revenue from customer acquisition and retention by cohort.

**Formula:**

```
MRR = Σ (Cohort Size × Retention Rate × ARPU)
ARR = MRR × 12
```

**Key Inputs:**

- Monthly new customer acquisitions
- Customer retention rates by month
- Average revenue per user (ARPU)
- Pricing and packaging assumptions
- Expansion revenue (upsells, cross-sells)

### Cost Structure

**Operating Expenses Categories:**

1. **Cost of Goods Sold (COGS)**
   - Hosting and infrastructure
   - Payment processing fees
   - Customer support (variable portion)
   - Third-party services per customer

2. **Sales & Marketing (S&M)**
   - Customer acquisition cost (CAC)
   - Marketing programs and advertising
   - Sales team compensation
   - Marketing tools and software

3. **Research & Development (R&D)**
   - Engineering team compensation
   - Product management
   - Design and UX
   - Development tools and infrastructure

4. **General & Administrative (G&A)**
   - Executive team
   - Finance, legal, HR
   - Office and facilities
   - Insurance and compliance

### Cash Flow Analysis

**Components:**

- Beginning cash balance
- Cash inflows (revenue, fundraising)
- Cash outflows (operating expenses, CapEx)
- Ending cash balance
- Monthly burn rate
- Runway (months of cash remaining)

**Formula:**

```
Runway = Current Cash Balance / Monthly Burn Rate
Monthly Burn = Monthly Revenue - Monthly Expenses
```

### Headcount Planning

**Role-Based Hiring Plan:**
Track headcount by department and role.

**Key Metrics:**

- Fully-loaded cost per employee
- Revenue per employee
- Headcount by department (% of total)

**Typical Ratios (Early-Stage SaaS):**

- Engineering: 40-50%
- Sales & Marketing: 25-35%
- G&A: 10-15%
- Customer Success: 5-10%

## Financial Model Structure

### Three-Scenario Framework

**Conservative Scenario (P10):**

- Slower customer acquisition
- Lower pricing or conversion
- Higher churn rates
- Extended sales cycles
- Used for cash management

**Base Scenario (P50):**

- Most likely outcomes
- Realistic assumptions
- Primary planning scenario
- Used for board reporting

**Optimistic Scenario (P90):**

- Faster growth
- Better unit economics
- Lower churn
- Used for upside planning

### Time Horizon

**Detailed Projections: 3 Years**

- Monthly detail for Year 1
- Monthly detail for Year 2
- Quarterly detail for Year 3

**High-Level Projections: Years 4-5**

- Annual projections
- Key metrics only
- Support long-term planning

## Step-by-Step Process

### Step 1: Define Business Model

Clarify revenue model and pricing.

**SaaS Model:**

- Subscription pricing tiers
- Annual vs. monthly contracts
- Free trial or freemium approach
- Expansion revenue strategy

**Marketplace Model:**

- GMV projections
- Take rate (% of transactions)
- Buyer and seller economics
- Transaction frequency

**Transactional Model:**

- Transaction volume
- Revenue per transaction
- Frequency and seasonality

### Step 2: Build Revenue Projections

Use cohort-based methodology for accuracy.

**Monthly Customer Acquisition:**
Define new customers acquired each month.

**Retention Curve:**
Model customer retention over time.

**Typical SaaS Retention:**

- Month 1: 100%
- Month 3: 90%
- Month 6: 85%
- Month 12: 75%
- Month 24: 70%

**Revenue Calculation:**
For each cohort, calculate retained customers × ARPU for each month.

### Step 3: Model Cost Structure

Break down costs by category and behavior.

**Fixed vs. Variable:**

- Fixed: Salaries, software, rent
- Variable: Hosting, payment processing, support

**Scaling Assumptions:**

- COGS as % of revenue
- S&M as % of revenue (CAC payback)
- R&D growth rate
- G&A as % of total expenses

### Step 4: Create Hiring Plan

Model headcount growth by role and department.

**Inputs:**

- Starting headcount
- Hiring velocity by role
- Fully-loaded compensation by role
- Benefits and taxes (typically 1.3-1.4x salary)

**Example:**

```
Engineer: $150K salary × 1.35 = $202K fully-loaded
Sales Rep: $100K OTE × 1.30 = $130K fully-loaded
```

### Step 5: Project Cash Flow

Calculate monthly cash position and runway.

**Monthly Cash Flow:**

```
Beginning Cash
+ Revenue Collected (consider payment terms)
- Operating Expenses Paid
- CapEx
= Ending Cash
```

**Runway Calculation:**

```
If Ending Cash < 0:
  Funding Need = Negative Cash Balance
  Runway = 0
Else:
  Runway = Ending Cash / Average Monthly Burn
```

### Step 6: Calculate Key Metrics

Track metrics that matter for stage.

**Revenue Metrics:**

- MRR / ARR
- Growth rate (MoM, YoY)
- Revenue by segment or cohort

**Unit Economics:**

- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- CAC Payback Period
- LTV / CAC Ratio

**Efficiency Metrics:**

- Burn multiple (Net Burn / Net New ARR)
- Magic number (Net New ARR / S&M Spend)
- Rule of 40 (Growth % + Profit Margin %)

**Cash Metrics:**

- Monthly burn rate
- Runway (months)
- Cash efficiency

### Step 7: Scenario Analysis

Create three scenarios with different assumptions.

**Variable Assumptions:**

- Customer acquisition rate (±30%)
- Churn rate (±20%)
- Average contract value (±15%)
- CAC (±25%)

**Fixed Assumptions:**

- Pricing structure
- Core operating expenses
- Hiring plan (adjust timing, not roles)

## Business Model Templates

### SaaS Financial Model

**Revenue Drivers:**

- New MRR (customers × ARPU)
- Expansion MRR (upsells)
- Contraction MRR (downgrades)
- Churned MRR (lost customers)

**Key Ratios:**

- Gross margin: 75-85%
- S&M as % revenue: 40-60% (early stage)
- CAC payback: < 12 months
- Net retention: 100-120%

**Example Projection:**

```
Year 1: $500K ARR, 50 customers, $100K MRR by Dec
Year 2: $2.5M ARR, 200 customers, $208K MRR by Dec
Year 3: $8M ARR, 600 customers, $667K MRR by Dec
```

### Marketplace Financial Model

**Revenue Drivers:**

- GMV (Gross Merchandise Value)
- Take rate (% of GMV)
- Net revenue = GMV × Take rate

**Key Ratios:**

- Take rate: 10-30% depending on category
- CAC for buyers vs. sellers
- Contribution margin: 60-70%

**Example Projection:**

```
Year 1: $5M GMV, 15% take rate = $750K revenue
Year 2: $20M GMV, 15% take rate = $3M revenue
Year 3: $60M GMV, 15% take rate = $9M revenue
```

### E-Commerce Financial Model

**Revenue Drivers:**

- Traffic (visitors)
- Conversion rate
- Average order value (AOV)
- Purchase frequency

**Key Ratios:**

- Gross margin: 40-60%
- Contribution margin: 20-35%
- CAC payback: 3-6 months

### Services / Agency Financial Model

**Revenue Drivers:**

- Billable hours or projects
- Hourly rate or project fee
- Utilization rate
- Team capacity

**Key Ratios:**

- Gross margin: 50-70%
- Utilization: 70-85%
- Revenue per employee

## Fundraising Integration

### Funding Scenario Modeling

**Pre-Money Valuation:**
Based on metrics and comparables.

**Dilution:**

```
Post-Money = Pre-Money + Investment
Dilution % = Investment / Post-Money
```

**Use of Funds:**
Allocate funding to extend runway and achieve milestones.

**Example:**

```
Raise: $5M at $20M pre-money
Post-Money: $25M
Dilution: 20%

Use of Funds:
- Product Development: $2M (40%)
- Sales & Marketing: $2M (40%)
- G&A and Operations: $0.5M (10%)
- Working Capital: $0.5M (10%)
```

### Milestone-Based Planning

**Identify Key Milestones:**

- Product launch
- First $1M ARR
- Break-even on CAC
- Series A fundraise

**Funding Amount:**
Ensure runway to achieve next milestone + 6 months buffer.

## Common Pitfalls

**Pitfall 1: Overly Optimistic Revenue**

- New startups rarely hit aggressive projections
- Use conservative customer acquisition assumptions
- Model realistic churn rates

**Pitfall 2: Underestimating Costs**

- Add 20% buffer to expense estimates
- Include fully-loaded compensation
- Account for software and tools

**Pitfall 3: Ignoring Cash Flow Timing**

- Revenue ≠ cash (payment terms)
- Expenses paid before revenue collected
- Model cash conversion carefully

**Pitfall 4: Static Headcount**

- Hiring takes time (3-6 months to fill roles)
- Ramp time for productivity (3-6 months)
- Account for attrition (10-15% annually)

**Pitfall 5: Not Scenario Planning**

- Single scenario is never accurate
- Always model conservative case
- Plan for what you'll do if base case fails

## Model Validation

**Sanity Checks:**

- [ ] Revenue growth rate is achievable (3x in Year 2, 2x in Year 3)
- [ ] Unit economics are realistic (LTV/CAC > 3, payback < 18 months)
- [ ] Burn multiple is reasonable (< 2.0 in Year 2-3)
- [ ] Headcount scales with revenue (revenue per employee growing)
- [ ] Gross margin is appropriate for business model
- [ ] S&M spending aligns with CAC and growth targets

**Benchmark Against Peers:**
Compare key metrics to similar companies at similar stage.

**Investor Feedback:**
Share model with advisors or investors for feedback on assumptions.


## Quick Start

To create a startup financial model:

1. **Define business model** - Revenue drivers and pricing
2. **Project revenue** - Cohort-based with retention
3. **Model costs** - COGS, S&M, R&D, G&A by month
4. **Plan headcount** - Hiring by role and department
5. **Calculate cash flow** - Revenue - expenses = burn/runway
6. **Compute metrics** - CAC, LTV, burn multiple, runway
7. **Create scenarios** - Conservative, base, optimistic
8. **Validate assumptions** - Sanity check and benchmark
9. **Integrate fundraising** - Model funding rounds and milestones


---
## Component: codex-agents-main--plugins--hr-legal-compliance--skills--employment-contract-templates

---
name: employment-contract-templates
description: Create employment contracts, offer letters, and HR policy documents following legal best practices. Use when drafting employment agreements, creating HR policies, or standardizing employment documentation.
---

# Employment Contract Templates

Templates and patterns for creating legally sound employment documentation including contracts, offer letters, and HR policies.

## When to Use This Skill

- Drafting employment contracts
- Creating offer letters
- Writing employee handbooks
- Developing HR policies
- Standardizing employment documentation
- Onboarding documentation

## Core Concepts

### 1. Employment Document Types

| Document                | Purpose                 | When Used     |
| ----------------------- | ----------------------- | ------------- |
| **Offer Letter**        | Initial job offer       | Pre-hire      |
| **Employment Contract** | Formal agreement        | Hire          |
| **Employee Handbook**   | Policies & procedures   | Onboarding    |
| **NDA**                 | Confidentiality         | Before access |
| **Non-Compete**         | Competition restriction | Hire/Exit     |

### 2. Key Legal Considerations

```
Employment Relationship:
├── At-Will vs. Contract
├── Employee vs. Contractor
├── Full-Time vs. Part-Time
├── Exempt vs. Non-Exempt
└── Jurisdiction-Specific Requirements
```

**DISCLAIMER: These templates are for informational purposes only and do not constitute legal advice. Consult with qualified legal counsel before using any employment documents.**

## Templates

### Template 1: Offer Letter

```markdown
# EMPLOYMENT OFFER LETTER

[Company Letterhead]

Date: [DATE]

[Candidate Name]
[Address]
[City, State ZIP]

Dear [Candidate Name],

We are pleased to extend an offer of employment for the position of [JOB TITLE]
at [COMPANY NAME]. We believe your skills and experience will be valuable
additions to our team.

## Position Details

**Title:** [Job Title]
**Department:** [Department]
**Reports To:** [Manager Name/Title]
**Location:** [Office Location / Remote]
**Start Date:** [Proposed Start Date]
**Employment Type:** [Full-Time/Part-Time], [Exempt/Non-Exempt]

## Compensation

**Base Salary:** $[AMOUNT] per [year/hour], paid [bi-weekly/semi-monthly/monthly]
**Bonus:** [Eligible for annual bonus of up to X% based on company and individual
performance / Not applicable]
**Equity:** [X shares of stock options vesting over 4 years with 1-year cliff /
Not applicable]

## Benefits

You will be eligible for our standard benefits package, including:

- Health insurance (medical, dental, vision) effective [date]
- 401(k) with [X]% company match
- [x] days paid time off per year
- [x] paid holidays
- [Other benefits]

Full details will be provided during onboarding.

## Contingencies

This offer is contingent upon:

- Successful completion of background check
- Verification of your right to work in [Country]
- Execution of required employment documents including:
  - Confidentiality Agreement
  - [Non-Compete Agreement, if applicable]
  - [IP Assignment Agreement]

## At-Will Employment

Please note that employment with [Company Name] is at-will. This means that
either you or the Company may terminate the employment relationship at any time,
with or without cause or notice. This offer letter does not constitute a
contract of employment for any specific period.

## Acceptance

To accept this offer, please sign below and return by [DEADLINE DATE]. This
offer will expire if not accepted by that date.

We are excited about the possibility of you joining our team. If you have any
questions, please contact [HR Contact] at [email/phone].

Sincerely,

---

[Hiring Manager Name]
[Title]
[Company Name]

---

## ACCEPTANCE

I accept this offer of employment and agree to the terms stated above.

Signature: ************\_************

Printed Name: ************\_************

Date: ************\_************

Anticipated Start Date: ************\_************
```

### Template 2: Employment Agreement (Contract Position)

```markdown
# EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of [DATE]
("Effective Date") by and between:

**Employer:** [COMPANY LEGAL NAME], a [State] [corporation/LLC]
with principal offices at [Address] ("Company")

**Employee:** [EMPLOYEE NAME], an individual residing at [Address] ("Employee")

## 1. EMPLOYMENT

1.1 **Position.** The Company agrees to employ Employee as [JOB TITLE],
reporting to [Manager Title]. Employee accepts such employment subject to
the terms of this Agreement.

1.2 **Duties.** Employee shall perform duties consistent with their position,
including but not limited to:

- [Primary duty 1]
- [Primary duty 2]
- [Primary duty 3]
- Other duties as reasonably assigned

  1.3 **Best Efforts.** Employee agrees to devote their full business time,
  attention, and best efforts to the Company's business during employment.

  1.4 **Location.** Employee's primary work location shall be [Location/Remote].
  [Travel requirements, if any.]

## 2. TERM

2.1 **Employment Period.** This Agreement shall commence on [START DATE] and
continue until terminated as provided herein.

2.2 **At-Will Employment.** [FOR AT-WILL STATES] Notwithstanding anything
herein, employment is at-will and may be terminated by either party at any
time, with or without cause or notice.

[OR FOR FIXED TERM:]
2.2 **Fixed Term.** This Agreement is for a fixed term of [X] months/years,
ending on [END DATE], unless terminated earlier as provided herein or extended
by mutual written agreement.

## 3. COMPENSATION

3.1 **Base Salary.** Employee shall receive a base salary of $[AMOUNT] per year,
payable in accordance with the Company's standard payroll practices, subject to
applicable withholdings.

3.2 **Bonus.** Employee may be eligible for an annual discretionary bonus of up
to [X]% of base salary, based on [criteria]. Bonus payments are at Company's
sole discretion and require active employment at payment date.

3.3 **Equity.** [If applicable] Subject to Board approval and the Company's
equity incentive plan, Employee shall be granted [X shares/options] under the
terms of a separate Stock Option Agreement.

3.4 **Benefits.** Employee shall be entitled to participate in benefit plans
offered to similarly situated employees, subject to plan terms and eligibility
requirements.

3.5 **Expenses.** Company shall reimburse Employee for reasonable business
expenses incurred in accordance with Company policy.

## 4. CONFIDENTIALITY

4.1 **Confidential Information.** Employee acknowledges access to confidential
and proprietary information including: trade secrets, business plans, customer
lists, financial data, technical information, and other non-public information
("Confidential Information").

4.2 **Non-Disclosure.** During and after employment, Employee shall not
disclose, use, or permit use of any Confidential Information except as required
for their duties or with prior written consent.

4.3 **Return of Materials.** Upon termination, Employee shall immediately return
all Company property and Confidential Information in any form.

4.4 **Survival.** Confidentiality obligations survive termination indefinitely
for trade secrets and for [3] years for other Confidential Information.

## 5. INTELLECTUAL PROPERTY

5.1 **Work Product.** All inventions, discoveries, works, and developments
created by Employee during employment, relating to Company's business, or using
Company resources ("Work Product") shall be Company's sole property.

5.2 **Assignment.** Employee hereby assigns to Company all rights in Work
Product, including all intellectual property rights.

5.3 **Assistance.** Employee agrees to execute documents and take actions
necessary to perfect Company's rights in Work Product.

5.4 **Prior Inventions.** Attached as Exhibit A is a list of any prior
inventions that Employee wishes to exclude from this Agreement.

## 6. NON-COMPETITION AND NON-SOLICITATION

[NOTE: Enforceability varies by jurisdiction. Consult local counsel.]

6.1 **Non-Competition.** During employment and for [12] months after
termination, Employee shall not, directly or indirectly, engage in any business
competitive with Company's business within [Geographic Area].

6.2 **Non-Solicitation of Customers.** During employment and for [12] months
after termination, Employee shall not solicit any customer of the Company for
competing products or services.

6.3 **Non-Solicitation of Employees.** During employment and for [12] months
after termination, Employee shall not recruit or solicit any Company employee
to leave Company employment.

## 7. TERMINATION

7.1 **By Company for Cause.** Company may terminate immediately for Cause,
defined as:
(a) Material breach of this Agreement
(b) Conviction of a felony
(c) Fraud, dishonesty, or gross misconduct
(d) Failure to perform duties after written notice and cure period

7.2 **By Company Without Cause.** Company may terminate without Cause upon
[30] days written notice.

7.3 **By Employee.** Employee may terminate upon [30] days written notice.

7.4 **Severance.** [If applicable] Upon termination without Cause, Employee
shall receive [X] weeks base salary as severance, contingent upon execution
of a release agreement.

7.5 **Effect of Termination.** Upon termination:

- All compensation earned through termination date shall be paid
- Unvested equity shall be forfeited
- Benefits terminate per plan terms
- Sections 4, 5, 6, 8, and 9 survive termination

## 8. GENERAL PROVISIONS

8.1 **Entire Agreement.** This Agreement constitutes the entire agreement and
supersedes all prior negotiations, representations, and agreements.

8.2 **Amendments.** This Agreement may be amended only by written agreement
signed by both parties.

8.3 **Governing Law.** This Agreement shall be governed by the laws of [State],
without regard to conflicts of law principles.

8.4 **Dispute Resolution.** [Arbitration clause or jurisdiction selection]

8.5 **Severability.** If any provision is unenforceable, it shall be modified
to the minimum extent necessary, and remaining provisions shall remain in effect.

8.6 **Notices.** Notices shall be in writing and delivered to addresses above.

8.7 **Assignment.** Employee may not assign this Agreement. Company may assign
to a successor.

8.8 **Waiver.** Failure to enforce any provision shall not constitute waiver.

## 9. ACKNOWLEDGMENTS

Employee acknowledges:

- Having read and understood this Agreement
- Having opportunity to consult with counsel
- Agreeing to all terms voluntarily

---

IN WITNESS WHEREOF, the parties have executed this Agreement as of the
Effective Date.

**[COMPANY NAME]**

By: ************\_************
Name: [Authorized Signatory]
Title: [Title]
Date: ************\_************

**EMPLOYEE**

Signature: ************\_************
Name: [Employee Name]
Date: ************\_************

---

## EXHIBIT A: PRIOR INVENTIONS

[Employee to list any prior inventions, if any, or write "None"]

---
```

### Template 3: Employee Handbook Policy Section

```markdown
# EMPLOYEE HANDBOOK - POLICY SECTION

## EMPLOYMENT POLICIES

### Equal Employment Opportunity

[Company Name] is an equal opportunity employer. We do not discriminate based on
race, color, religion, sex, sexual orientation, gender identity, national
origin, age, disability, veteran status, or any other protected characteristic.

This policy applies to all employment practices including:

- Recruitment and hiring
- Compensation and benefits
- Training and development
- Promotions and transfers
- Termination

### Anti-Harassment Policy

[Company Name] is committed to providing a workplace free from harassment.
Harassment based on any protected characteristic is strictly prohibited.

**Prohibited Conduct Includes:**

- Unwelcome sexual advances or requests for sexual favors
- Offensive comments, jokes, or slurs
- Physical conduct such as assault or unwanted touching
- Visual conduct such as displaying offensive images
- Threatening, intimidating, or hostile acts

**Reporting Procedure:**

1. Report to your manager, HR, or any member of leadership
2. Reports may be made verbally or in writing
3. Anonymous reports are accepted via [hotline/email]

**Investigation:**
All reports will be promptly investigated. Retaliation against anyone who
reports harassment is strictly prohibited and will result in disciplinary
action up to termination.

### Work Hours and Attendance

**Standard Hours:** [8:00 AM - 5:00 PM, Monday through Friday]
**Core Hours:** [10:00 AM - 3:00 PM] - Employees expected to be available
**Flexible Work:** [Policy on remote work, flexible scheduling]

**Attendance Expectations:**

- Notify your manager as soon as possible if you will be absent
- Excessive unexcused absences may result in disciplinary action
- [x] unexcused absences in [Y] days considered excessive

### Paid Time Off (PTO)

**PTO Accrual:**
| Years of Service | Annual PTO Days |
|------------------|-----------------|
| 0-2 years | 15 days |
| 3-5 years | 20 days |
| 6+ years | 25 days |

**PTO Guidelines:**

- PTO accrues per pay period
- Maximum accrual: [X] days (use it or lose it after)
- Request PTO at least [2] weeks in advance
- Manager approval required
- PTO may not be taken during [blackout periods]

### Sick Leave

- [x] days sick leave per year
- May be used for personal illness or family member care
- Doctor's note required for absences exceeding [3] days

### Holidays

The following paid holidays are observed:

- New Year's Day
- Martin Luther King Jr. Day
- Presidents Day
- Memorial Day
- Independence Day
- Labor Day
- Thanksgiving Day
- Day after Thanksgiving
- Christmas Day
- [Floating holiday]

### Code of Conduct

All employees are expected to:

- Act with integrity and honesty
- Treat colleagues, customers, and partners with respect
- Protect company confidential information
- Avoid conflicts of interest
- Comply with all laws and regulations
- Report any violations of this code

**Violations may result in disciplinary action up to and including termination.**

### Technology and Communication

**Acceptable Use:**

- Company technology is for business purposes
- Limited personal use is permitted if it doesn't interfere with work
- No illegal activities or viewing inappropriate content

**Monitoring:**

- Company reserves the right to monitor company systems
- Employees should have no expectation of privacy on company devices

**Security:**

- Use strong passwords and enable 2FA
- Report security incidents immediately
- Lock devices when unattended

### Social Media Policy

**Personal Social Media:**

- Clearly state opinions are your own, not the company's
- Do not share confidential company information
- Be respectful and professional

**Company Social Media:**

- Only authorized personnel may post on behalf of the company
- Follow brand guidelines
- Escalate negative comments to [Marketing/PR]

---

## ACKNOWLEDGMENT

I acknowledge that I have received a copy of the Employee Handbook and
understand that:

1. I am responsible for reading and understanding its contents
2. The handbook does not create a contract of employment
3. Policies may be changed at any time at the company's discretion
4. Employment is at-will [if applicable]

I agree to abide by the policies and procedures outlined in this handbook.

Employee Signature: ************\_************

Employee Name (Print): ************\_************

Date: ************\_************
```

## Best Practices

### Do's

- **Consult legal counsel** - Employment law varies by jurisdiction
- **Keep copies signed** - Document all agreements
- **Update regularly** - Laws and policies change
- **Be clear and specific** - Avoid ambiguity
- **Train managers** - On policies and procedures

### Don'ts

- **Don't use generic templates** - Customize for your jurisdiction
- **Don't make promises** - That could create implied contracts
- **Don't discriminate** - In language or application
- **Don't forget at-will language** - Where applicable
- **Don't skip review** - Have legal counsel review all documents


---
## Component: codex-agents-main--plugins--startup-business-analyst--skills--startup-metrics-framework

---
name: startup-metrics-framework
description: Track, calculate, and optimize key performance metrics for SaaS, marketplace, consumer, and B2B startups from seed through Series A, including unit economics, growth efficiency, and cash management. Use this skill when defining a metrics framework, calculating CAC/LTV/burn multiple, benchmarking business health, or preparing metrics dashboards for investors or board reporting.
version: 1.0.0
---

# Startup Metrics Framework

Comprehensive guide to tracking, calculating, and optimizing key performance metrics for different startup business models from seed through Series A.

## Overview

Track the right metrics at the right stage. Focus on unit economics, growth efficiency, and cash management metrics that matter for fundraising and operational excellence.

## Universal Startup Metrics

### Revenue Metrics

**MRR (Monthly Recurring Revenue)**

```
MRR = Σ (Active Subscriptions × Monthly Price)
```

**ARR (Annual Recurring Revenue)**

```
ARR = MRR × 12
```

**Growth Rate**

```
MoM Growth = (This Month MRR - Last Month MRR) / Last Month MRR
YoY Growth = (This Year ARR - Last Year ARR) / Last Year ARR
```

**Target Benchmarks:**

- Seed stage: 15-20% MoM growth
- Series A: 10-15% MoM growth, 3-5x YoY
- Series B+: 100%+ YoY (Rule of 40)

### Unit Economics

**CAC (Customer Acquisition Cost)**

```
CAC = Total S&M Spend / New Customers Acquired
```

Include: Sales salaries, marketing spend, tools, overhead

**LTV (Lifetime Value)**

```
LTV = ARPU × Gross Margin% × (1 / Churn Rate)
```

Simplified:

```
LTV = ARPU × Average Customer Lifetime × Gross Margin%
```

**LTV:CAC Ratio**

```
LTV:CAC = LTV / CAC
```

**Benchmarks:**

- LTV:CAC > 3.0 = Healthy
- LTV:CAC 1.0-3.0 = Needs improvement
- LTV:CAC < 1.0 = Unsustainable

**CAC Payback Period**

```
CAC Payback = CAC / (ARPU × Gross Margin%)
```

**Benchmarks:**

- < 12 months = Excellent
- 12-18 months = Good
- > 24 months = Concerning

### Cash Efficiency Metrics

**Burn Rate**

```
Monthly Burn = Monthly Revenue - Monthly Expenses
```

Negative burn = losing money (typical early-stage)

**Runway**

```
Runway (months) = Cash Balance / Monthly Burn Rate
```

**Target:** Always maintain 12-18 months runway

**Burn Multiple**

```
Burn Multiple = Net Burn / Net New ARR
```

**Benchmarks:**

- < 1.0 = Exceptional efficiency
- 1.0-1.5 = Good
- 1.5-2.0 = Acceptable
- > 2.0 = Inefficient

Lower is better (spending less to generate ARR)

## SaaS Metrics

### Revenue Composition

**New MRR**
New customers × ARPU

**Expansion MRR**
Upsells and cross-sells from existing customers

**Contraction MRR**
Downgrades from existing customers

**Churned MRR**
Lost customers

**Net New MRR Formula:**

```
Net New MRR = New MRR + Expansion MRR - Contraction MRR - Churned MRR
```

### Retention Metrics

**Logo Retention**

```
Logo Retention = (Customers End - New Customers) / Customers Start
```

**Dollar Retention (NDR - Net Dollar Retention)**

```
NDR = (ARR Start + Expansion - Contraction - Churn) / ARR Start
```

**Benchmarks:**

- NDR > 120% = Best-in-class
- NDR 100-120% = Good
- NDR < 100% = Needs work

**Gross Retention**

```
Gross Retention = (ARR Start - Churn - Contraction) / ARR Start
```

**Benchmarks:**

- > 90% = Excellent
- 85-90% = Good
- < 85% = Concerning

### SaaS-Specific Metrics

**Magic Number**

```
Magic Number = Net New ARR (quarter) / S&M Spend (prior quarter)
```

**Benchmarks:**

- > 0.75 = Efficient, ready to scale
- 0.5-0.75 = Moderate efficiency
- < 0.5 = Inefficient, don't scale yet

**Rule of 40**

```
Rule of 40 = Revenue Growth Rate% + Profit Margin%
```

**Benchmarks:**

- > 40% = Excellent
- 20-40% = Acceptable
- < 20% = Needs improvement

**Example:**
50% growth + (10%) margin = 40% ✓

**Quick Ratio**

```
Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
```

**Benchmarks:**

- > 4.0 = Healthy growth
- 2.0-4.0 = Moderate
- < 2.0 = Churn problem

## Marketplace Metrics

### GMV (Gross Merchandise Value)

**Total Transaction Volume:**

```
GMV = Σ (Transaction Value)
```

**Growth Rate:**

```
GMV Growth Rate = (Current Period GMV - Prior Period GMV) / Prior Period GMV
```

**Target:** 20%+ MoM early-stage

### Take Rate

```
Take Rate = Net Revenue / GMV
```

**Typical Ranges:**

- Payment processors: 2-3%
- E-commerce marketplaces: 10-20%
- Service marketplaces: 15-25%
- High-value B2B: 5-15%

### Marketplace Liquidity

**Time to Transaction**
How long from listing to sale/match?

**Fill Rate**
% of requests that result in transaction

**Repeat Rate**
% of users who transact multiple times

**Benchmarks:**

- Fill rate > 80% = Strong liquidity
- Repeat rate > 60% = Strong retention

### Marketplace Balance

**Supply/Demand Ratio:**
Track relative growth of supply and demand sides.

**Warning Signs:**

- Too much supply: Low fill rates, frustrated suppliers
- Too much demand: Long wait times, frustrated customers

**Goal:** Balanced growth (1:1 ratio ideal, but varies by model)

## Consumer/Mobile Metrics

### Engagement Metrics

**DAU (Daily Active Users)**
Unique users active each day

**MAU (Monthly Active Users)**
Unique users active each month

**DAU/MAU Ratio**

```
DAU/MAU = DAU / MAU
```

**Benchmarks:**

- > 50% = Exceptional (daily habit)
- 20-50% = Good
- < 20% = Weak engagement

**Session Frequency**
Average sessions per user per day/week

**Session Duration**
Average time spent per session

### Retention Curves

**Day 1 Retention:** % users who return next day
**Day 7 Retention:** % users active 7 days after signup
**Day 30 Retention:** % users active 30 days after signup

**Benchmarks (Day 30):**

- > 40% = Excellent
- 25-40% = Good
- < 25% = Weak

**Retention Curve Shape:**

- Flattening curve = good (users becoming habitual)
- Steep decline = poor product-market fit

### Viral Coefficient (K-Factor)

```
K-Factor = Invites per User × Invite Conversion Rate
```

**Example:**
10 invites/user × 20% conversion = 2.0 K-factor

**Benchmarks:**

- K > 1.0 = Viral growth
- K = 0.5-1.0 = Strong referrals
- K < 0.5 = Weak virality

## B2B Metrics

### Sales Efficiency

**Win Rate**

```
Win Rate = Deals Won / Total Opportunities
```

**Target:** 20-30% for new sales team, 30-40% mature

**Sales Cycle Length**
Average days from opportunity to close

**Shorter is better:**

- SMB: 30-60 days
- Mid-market: 60-120 days
- Enterprise: 120-270 days

**Average Contract Value (ACV)**

```
ACV = Total Contract Value / Contract Length (years)
```

### Pipeline Metrics

**Pipeline Coverage**

```
Pipeline Coverage = Total Pipeline Value / Quota
```

**Target:** 3-5x coverage (3-5x pipeline needed to hit quota)

**Conversion Rates by Stage:**

- Lead → Opportunity: 10-20%
- Opportunity → Demo: 50-70%
- Demo → Proposal: 30-50%
- Proposal → Close: 20-40%

## Metrics by Stage

### Pre-Seed (Product-Market Fit)

**Focus Metrics:**

1. Active users growth
2. User retention (Day 7, Day 30)
3. Core engagement (sessions, features used)
4. Qualitative feedback (NPS, interviews)

**Don't worry about:**

- Revenue (may be zero)
- CAC (not optimizing yet)
- Unit economics

### Seed ($500K-$2M ARR)

**Focus Metrics:**

1. MRR growth rate (15-20% MoM)
2. CAC and LTV (establish baseline)
3. Gross retention (> 85%)
4. Core product engagement

**Start tracking:**

- Sales efficiency
- Burn rate and runway

### Series A ($2M-$10M ARR)

**Focus Metrics:**

1. ARR growth (3-5x YoY)
2. Unit economics (LTV:CAC > 3, payback < 18 months)
3. Net dollar retention (> 100%)
4. Burn multiple (< 2.0)
5. Magic number (> 0.5)

**Mature tracking:**

- Rule of 40
- Sales efficiency
- Pipeline coverage

## Metric Tracking Best Practices

### Data Infrastructure

**Requirements:**

- Single source of truth (analytics platform)
- Real-time or daily updates
- Automated calculations
- Historical tracking

**Tools:**

- Mixpanel, Amplitude (product analytics)
- ChartMogul, Baremetrics (SaaS metrics)
- Looker, Tableau (BI dashboards)

### Reporting Cadence

**Daily:**

- MRR, active users
- Sign-ups, conversions

**Weekly:**

- Growth rates
- Retention cohorts
- Sales pipeline

**Monthly:**

- Full metric suite
- Board reporting
- Investor updates

**Quarterly:**

- Trend analysis
- Benchmarking
- Strategy review

### Common Mistakes

**Mistake 1: Vanity Metrics**
Don't focus on:

- Total users (without retention)
- Page views (without engagement)
- Downloads (without activation)

Focus on actionable metrics tied to value.

**Mistake 2: Too Many Metrics**
Track 5-7 core metrics intensely, not 50 loosely.

**Mistake 3: Ignoring Unit Economics**
CAC and LTV are critical even at seed stage.

**Mistake 4: Not Segmenting**
Break down metrics by customer segment, channel, cohort.

**Mistake 5: Gaming Metrics**
Optimize for real business outcomes, not dashboard numbers.

## Investor Metrics

### What VCs Want to See

**Seed Round:**

- MRR growth rate
- User retention
- Early unit economics
- Product engagement

**Series A:**

- ARR and growth rate
- CAC payback < 18 months
- LTV:CAC > 3.0
- Net dollar retention > 100%
- Burn multiple < 2.0

**Series B+:**

- Rule of 40 > 40%
- Efficient growth (magic number)
- Path to profitability
- Market leadership metrics

### Metric Presentation

**Dashboard Format:**

```
Current MRR: $250K (↑ 18% MoM)
ARR: $3.0M (↑ 280% YoY)
CAC: $1,200 | LTV: $4,800 | LTV:CAC = 4.0x
NDR: 112% | Logo Retention: 92%
Burn: $180K/mo | Runway: 18 months
```

**Include:**

- Current value
- Growth rate or trend
- Context (target, benchmark)


## Quick Start

To implement startup metrics framework:

1. **Identify business model** - SaaS, marketplace, consumer, B2B
2. **Choose 5-7 core metrics** - Based on stage and model
3. **Establish tracking** - Set up analytics and dashboards
4. **Calculate unit economics** - CAC, LTV, payback
5. **Set targets** - Use benchmarks for goals
6. **Review regularly** - Weekly for core metrics
7. **Share with team** - Align on goals and progress
8. **Update investors** - Monthly/quarterly reporting


---
## Component: codex-agents-main--plugins--hr-legal-compliance--skills--gdpr-data-handling

---
name: gdpr-data-handling
description: Implement GDPR-compliant data handling with consent management, data subject rights, and privacy by design. Use when building systems that process EU personal data, implementing privacy controls, or conducting GDPR compliance reviews.
---

# GDPR Data Handling

Practical implementation guide for GDPR-compliant data processing, consent management, and privacy controls.

## When to Use This Skill

- Building systems that process EU personal data
- Implementing consent management
- Handling data subject requests (DSRs)
- Conducting GDPR compliance reviews
- Designing privacy-first architectures
- Creating data processing agreements

## Core Concepts

### 1. Personal Data Categories

| Category               | Examples                    | Protection Level   |
| ---------------------- | --------------------------- | ------------------ |
| **Basic**              | Name, email, phone          | Standard           |
| **Sensitive (Art. 9)** | Health, religion, ethnicity | Explicit consent   |
| **Criminal (Art. 10)** | Convictions, offenses       | Official authority |
| **Children's**         | Under 16 data               | Parental consent   |

### 2. Legal Bases for Processing

```
Article 6 - Lawful Bases:
├── Consent: Freely given, specific, informed
├── Contract: Necessary for contract performance
├── Legal Obligation: Required by law
├── Vital Interests: Protecting someone's life
├── Public Interest: Official functions
└── Legitimate Interest: Balanced against rights
```

### 3. Data Subject Rights

```
Right to Access (Art. 15)      ─┐
Right to Rectification (Art. 16) │
Right to Erasure (Art. 17)       │ Must respond
Right to Restrict (Art. 18)      │ within 1 month
Right to Portability (Art. 20)   │
Right to Object (Art. 21)       ─┘
```

## Implementation Patterns

### Pattern 1: Consent Management

```javascript
// Consent data model
const consentSchema = {
  userId: String,
  consents: [
    {
      purpose: String, // 'marketing', 'analytics', etc.
      granted: Boolean,
      timestamp: Date,
      source: String, // 'web_form', 'api', etc.
      version: String, // Privacy policy version
      ipAddress: String, // For proof
      userAgent: String, // For proof
    },
  ],
  auditLog: [
    {
      action: String, // 'granted', 'withdrawn', 'updated'
      purpose: String,
      timestamp: Date,
      source: String,
    },
  ],
};

// Consent service
class ConsentManager {
  async recordConsent(userId, purpose, granted, metadata) {
    const consent = {
      purpose,
      granted,
      timestamp: new Date(),
      source: metadata.source,
      version: await this.getCurrentPolicyVersion(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    };

    // Store consent
    await this.db.consents.updateOne(
      { userId },
      {
        $push: {
          consents: consent,
          auditLog: {
            action: granted ? "granted" : "withdrawn",
            purpose,
            timestamp: consent.timestamp,
            source: metadata.source,
          },
        },
      },
      { upsert: true },
    );

    // Emit event for downstream systems
    await this.eventBus.emit("consent.changed", {
      userId,
      purpose,
      granted,
      timestamp: consent.timestamp,
    });
  }

  async hasConsent(userId, purpose) {
    const record = await this.db.consents.findOne({ userId });
    if (!record) return false;

    const latestConsent = record.consents
      .filter((c) => c.purpose === purpose)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return latestConsent?.granted === true;
  }

  async getConsentHistory(userId) {
    const record = await this.db.consents.findOne({ userId });
    return record?.auditLog || [];
  }
}
```

```html
<!-- GDPR-compliant consent UI -->
<div class="consent-banner" role="dialog" aria-labelledby="consent-title">
  <h2 id="consent-title">Cookie Preferences</h2>

  <p>
    We use cookies to improve your experience. Select your preferences below.
  </p>

  <form id="consent-form">
    <!-- Necessary - always on, no consent needed -->
    <div class="consent-category">
      <input type="checkbox" id="necessary" checked disabled />
      <label for="necessary">
        <strong>Necessary</strong>
        <span>Required for the website to function. Cannot be disabled.</span>
      </label>
    </div>

    <!-- Analytics - requires consent -->
    <div class="consent-category">
      <input type="checkbox" id="analytics" name="analytics" />
      <label for="analytics">
        <strong>Analytics</strong>
        <span>Help us understand how you use our site.</span>
      </label>
    </div>

    <!-- Marketing - requires consent -->
    <div class="consent-category">
      <input type="checkbox" id="marketing" name="marketing" />
      <label for="marketing">
        <strong>Marketing</strong>
        <span>Personalized ads based on your interests.</span>
      </label>
    </div>

    <div class="consent-actions">
      <button type="button" id="accept-all">Accept All</button>
      <button type="button" id="reject-all">Reject All</button>
      <button type="submit">Save Preferences</button>
    </div>

    <p class="consent-links">
      <a href="/privacy-policy">Privacy Policy</a> |
      <a href="/cookie-policy">Cookie Policy</a>
    </p>
  </form>
</div>
```

### Pattern 2: Data Subject Access Request (DSAR)

```python
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class DSARHandler:
    """Handle Data Subject Access Requests."""

    RESPONSE_DEADLINE_DAYS = 30
    EXTENSION_ALLOWED_DAYS = 60  # For complex requests

    def __init__(self, data_sources: List['DataSource']):
        self.data_sources = data_sources

    async def submit_request(
        self,
        request_type: str,  # 'access', 'erasure', 'rectification', 'portability'
        user_id: str,
        verified: bool,
        details: Optional[Dict] = None
    ) -> str:
        """Submit a new DSAR."""
        request = {
            'id': self.generate_request_id(),
            'type': request_type,
            'user_id': user_id,
            'status': 'pending_verification' if not verified else 'processing',
            'submitted_at': datetime.utcnow(),
            'deadline': datetime.utcnow() + timedelta(days=self.RESPONSE_DEADLINE_DAYS),
            'details': details or {},
            'audit_log': [{
                'action': 'submitted',
                'timestamp': datetime.utcnow(),
                'details': 'Request received'
            }]
        }

        await self.db.dsar_requests.insert_one(request)
        await self.notify_dpo(request)

        return request['id']

    async def process_access_request(self, request_id: str) -> Dict:
        """Process a data access request."""
        request = await self.get_request(request_id)

        if request['type'] != 'access':
            raise ValueError("Not an access request")

        # Collect data from all sources
        user_data = {}
        for source in self.data_sources:
            try:
                data = await source.get_user_data(request['user_id'])
                user_data[source.name] = data
            except Exception as e:
                user_data[source.name] = {'error': str(e)}

        # Format response
        response = {
            'request_id': request_id,
            'generated_at': datetime.utcnow().isoformat(),
            'data_categories': list(user_data.keys()),
            'data': user_data,
            'retention_info': await self.get_retention_info(),
            'processing_purposes': await self.get_processing_purposes(),
            'third_party_recipients': await self.get_recipients()
        }

        # Update request status
        await self.update_request(request_id, 'completed', response)

        return response

    async def process_erasure_request(self, request_id: str) -> Dict:
        """Process a right to erasure request."""
        request = await self.get_request(request_id)

        if request['type'] != 'erasure':
            raise ValueError("Not an erasure request")

        results = {}
        exceptions = []

        for source in self.data_sources:
            try:
                # Check for legal exceptions
                can_delete, reason = await source.can_delete(request['user_id'])

                if can_delete:
                    await source.delete_user_data(request['user_id'])
                    results[source.name] = 'deleted'
                else:
                    exceptions.append({
                        'source': source.name,
                        'reason': reason  # e.g., 'legal retention requirement'
                    })
                    results[source.name] = f'retained: {reason}'
            except Exception as e:
                results[source.name] = f'error: {str(e)}'

        response = {
            'request_id': request_id,
            'completed_at': datetime.utcnow().isoformat(),
            'results': results,
            'exceptions': exceptions
        }

        await self.update_request(request_id, 'completed', response)

        return response

    async def process_portability_request(self, request_id: str) -> bytes:
        """Generate portable data export."""
        request = await self.get_request(request_id)
        user_data = await self.process_access_request(request_id)

        # Convert to machine-readable format (JSON)
        portable_data = {
            'export_date': datetime.utcnow().isoformat(),
            'format_version': '1.0',
            'data': user_data['data']
        }

        return json.dumps(portable_data, indent=2, default=str).encode()
```

### Pattern 3: Data Retention

```python
from datetime import datetime, timedelta
from enum import Enum

class RetentionBasis(Enum):
    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    LEGITIMATE_INTEREST = "legitimate_interest"

class DataRetentionPolicy:
    """Define and enforce data retention policies."""

    POLICIES = {
        'user_account': {
            'retention_period_days': 365 * 3,  # 3 years after last activity
            'basis': RetentionBasis.CONTRACT,
            'trigger': 'last_activity_date',
            'archive_before_delete': True
        },
        'transaction_records': {
            'retention_period_days': 365 * 7,  # 7 years for tax
            'basis': RetentionBasis.LEGAL_OBLIGATION,
            'trigger': 'transaction_date',
            'archive_before_delete': True,
            'legal_reference': 'Tax regulations require 7 year retention'
        },
        'marketing_consent': {
            'retention_period_days': 365 * 2,  # 2 years
            'basis': RetentionBasis.CONSENT,
            'trigger': 'consent_date',
            'archive_before_delete': False
        },
        'support_tickets': {
            'retention_period_days': 365 * 2,
            'basis': RetentionBasis.LEGITIMATE_INTEREST,
            'trigger': 'ticket_closed_date',
            'archive_before_delete': True
        },
        'analytics_data': {
            'retention_period_days': 365,  # 1 year
            'basis': RetentionBasis.CONSENT,
            'trigger': 'collection_date',
            'archive_before_delete': False,
            'anonymize_instead': True
        }
    }

    async def apply_retention_policies(self):
        """Run retention policy enforcement."""
        for data_type, policy in self.POLICIES.items():
            cutoff_date = datetime.utcnow() - timedelta(
                days=policy['retention_period_days']
            )

            if policy.get('anonymize_instead'):
                await self.anonymize_old_data(data_type, cutoff_date)
            else:
                if policy.get('archive_before_delete'):
                    await self.archive_data(data_type, cutoff_date)
                await self.delete_old_data(data_type, cutoff_date)

            await self.log_retention_action(data_type, cutoff_date)

    async def anonymize_old_data(self, data_type: str, before_date: datetime):
        """Anonymize data instead of deleting."""
        # Example: Replace identifying fields with hashes
        if data_type == 'analytics_data':
            await self.db.analytics.update_many(
                {'collection_date': {'$lt': before_date}},
                {'$set': {
                    'user_id': None,
                    'ip_address': None,
                    'device_id': None,
                    'anonymized': True,
                    'anonymized_date': datetime.utcnow()
                }}
            )
```

### Pattern 4: Privacy by Design

```python
class PrivacyFirstDataModel:
    """Example of privacy-by-design data model."""

    # Separate PII from behavioral data
    user_profile_schema = {
        'user_id': str,  # UUID, not sequential
        'email_hash': str,  # Hashed for lookups
        'created_at': datetime,
        # Minimal data collection
        'preferences': {
            'language': str,
            'timezone': str
        }
    }

    # Encrypted at rest
    user_pii_schema = {
        'user_id': str,
        'email': str,  # Encrypted
        'name': str,   # Encrypted
        'phone': str,  # Encrypted (optional)
        'address': dict,  # Encrypted (optional)
        'encryption_key_id': str
    }

    # Pseudonymized behavioral data
    analytics_schema = {
        'session_id': str,  # Not linked to user_id
        'pseudonym_id': str,  # Rotating pseudonym
        'events': list,
        'device_category': str,  # Generalized, not specific
        'country': str,  # Not city-level
    }

class DataMinimization:
    """Implement data minimization principles."""

    @staticmethod
    def collect_only_needed(form_data: dict, purpose: str) -> dict:
        """Filter form data to only fields needed for purpose."""
        REQUIRED_FIELDS = {
            'account_creation': ['email', 'password'],
            'newsletter': ['email'],
            'purchase': ['email', 'name', 'address', 'payment'],
            'support': ['email', 'message']
        }

        allowed = REQUIRED_FIELDS.get(purpose, [])
        return {k: v for k, v in form_data.items() if k in allowed}

    @staticmethod
    def generalize_location(ip_address: str) -> str:
        """Generalize IP to country level only."""
        import geoip2.database
        reader = geoip2.database.Reader('GeoLite2-Country.mmdb')
        try:
            response = reader.country(ip_address)
            return response.country.iso_code
        except:
            return 'UNKNOWN'
```

### Pattern 5: Breach Notification

```python
from datetime import datetime
from enum import Enum

class BreachSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BreachNotificationHandler:
    """Handle GDPR breach notification requirements."""

    AUTHORITY_NOTIFICATION_HOURS = 72
    AFFECTED_NOTIFICATION_REQUIRED_SEVERITY = BreachSeverity.HIGH

    async def report_breach(
        self,
        description: str,
        data_types: List[str],
        affected_count: int,
        severity: BreachSeverity
    ) -> dict:
        """Report and handle a data breach."""
        breach = {
            'id': self.generate_breach_id(),
            'reported_at': datetime.utcnow(),
            'description': description,
            'data_types_affected': data_types,
            'affected_individuals_count': affected_count,
            'severity': severity.value,
            'status': 'investigating',
            'timeline': [{
                'event': 'breach_reported',
                'timestamp': datetime.utcnow(),
                'details': description
            }]
        }

        await self.db.breaches.insert_one(breach)

        # Immediate notifications
        await self.notify_dpo(breach)
        await self.notify_security_team(breach)

        # Authority notification required within 72 hours
        if self.requires_authority_notification(severity, data_types):
            breach['authority_notification_deadline'] = (
                datetime.utcnow() + timedelta(hours=self.AUTHORITY_NOTIFICATION_HOURS)
            )
            await self.schedule_authority_notification(breach)

        # Affected individuals notification
        if severity.value in [BreachSeverity.HIGH.value, BreachSeverity.CRITICAL.value]:
            await self.schedule_individual_notifications(breach)

        return breach

    def requires_authority_notification(
        self,
        severity: BreachSeverity,
        data_types: List[str]
    ) -> bool:
        """Determine if supervisory authority must be notified."""
        # Always notify for sensitive data
        sensitive_types = ['health', 'financial', 'credentials', 'biometric']
        if any(t in sensitive_types for t in data_types):
            return True

        # Notify for medium+ severity
        return severity in [BreachSeverity.MEDIUM, BreachSeverity.HIGH, BreachSeverity.CRITICAL]

    async def generate_authority_report(self, breach_id: str) -> dict:
        """Generate report for supervisory authority."""
        breach = await self.get_breach(breach_id)

        return {
            'organization': {
                'name': self.config.org_name,
                'contact': self.config.dpo_contact,
                'registration': self.config.registration_number
            },
            'breach': {
                'nature': breach['description'],
                'categories_affected': breach['data_types_affected'],
                'approximate_number_affected': breach['affected_individuals_count'],
                'likely_consequences': self.assess_consequences(breach),
                'measures_taken': await self.get_remediation_measures(breach_id),
                'measures_proposed': await self.get_proposed_measures(breach_id)
            },
            'timeline': breach['timeline'],
            'submitted_at': datetime.utcnow().isoformat()
        }
```

## Compliance Checklist

```markdown
## GDPR Implementation Checklist

### Legal Basis

- [ ] Documented legal basis for each processing activity
- [ ] Consent mechanisms meet GDPR requirements
- [ ] Legitimate interest assessments completed

### Transparency

- [ ] Privacy policy is clear and accessible
- [ ] Processing purposes clearly stated
- [ ] Data retention periods documented

### Data Subject Rights

- [ ] Access request process implemented
- [ ] Erasure request process implemented
- [ ] Portability export available
- [ ] Rectification process available
- [ ] Response within 30-day deadline

### Security

- [ ] Encryption at rest implemented
- [ ] Encryption in transit (TLS)
- [ ] Access controls in place
- [ ] Audit logging enabled

### Breach Response

- [ ] Breach detection mechanisms
- [ ] 72-hour notification process
- [ ] Breach documentation system

### Documentation

- [ ] Records of processing activities (Art. 30)
- [ ] Data protection impact assessments
- [ ] Data processing agreements with vendors
```

## Best Practices

### Do's

- **Minimize data collection** - Only collect what's needed
- **Document everything** - Processing activities, legal bases
- **Encrypt PII** - At rest and in transit
- **Implement access controls** - Need-to-know basis
- **Regular audits** - Verify compliance continuously

### Don'ts

- **Don't pre-check consent boxes** - Must be opt-in
- **Don't bundle consent** - Separate purposes separately
- **Don't retain indefinitely** - Define and enforce retention
- **Don't ignore DSARs** - 30-day response required
- **Don't transfer without safeguards** - SCCs or adequacy decisions


---
## Component: codex-hermes-agent-main--skills--productivity--notion

---
name: notion
description: Notion API for creating and managing pages, databases, and blocks via curl. Search, create, update, and query Notion workspaces directly from the terminal.
version: 1.0.0
author: community
license: MIT
metadata:
  hermes:
    tags: [Notion, Productivity, Notes, Database, API]
    homepage: https://developers.notion.com
prerequisites:
  env_vars: [NOTION_API_KEY]
---

# Notion API

Use the Notion API via curl to create, read, update pages, databases (data sources), and blocks. No extra tools needed — just curl and a Notion API key.

## Prerequisites

1. Create an integration at https://notion.so/my-integrations
2. Copy the API key (starts with `ntn_` or `secret_`)
3. Store it in `~/.hermes/.env`:
   ```
   NOTION_API_KEY=ntn_your_key_here
   ```
4. **Important:** Share target pages/databases with your integration in Notion (click "..." → "Connect to" → your integration name)

## API Basics

All requests use this pattern:

```bash
curl -s -X GET "https://api.notion.com/v1/..." \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json"
```

The `Notion-Version` header is required. This skill uses `2025-09-03` (latest). In this version, databases are called "data sources" in the API.

## Common Operations

### Search

```bash
curl -s -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"query": "page title"}'
```

### Get Page

```bash
curl -s "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### Get Page Content (blocks)

```bash
curl -s "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### Create Page in a Database

```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "xxx"},
    "properties": {
      "Name": {"title": [{"text": {"content": "New Item"}}]},
      "Status": {"select": {"name": "Todo"}}
    }
  }'
```

### Query a Database

```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/{data_source_id}/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Status", "select": {"equals": "Active"}},
    "sorts": [{"property": "Date", "direction": "descending"}]
  }'
```

### Create a Database

```bash
curl -s -X POST "https://api.notion.com/v1/data_sources" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "xxx"},
    "title": [{"text": {"content": "My Database"}}],
    "properties": {
      "Name": {"title": {}},
      "Status": {"select": {"options": [{"name": "Todo"}, {"name": "Done"}]}},
      "Date": {"date": {}}
    }
  }'
```

### Update Page Properties

```bash
curl -s -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Status": {"select": {"name": "Done"}}}}'
```

### Add Content to a Page

```bash
curl -s -X PATCH "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": "Hello from Hermes!"}}]}}
    ]
  }'
```

## Property Types

Common property formats for database items:

- **Title:** `{"title": [{"text": {"content": "..."}}]}`
- **Rich text:** `{"rich_text": [{"text": {"content": "..."}}]}`
- **Select:** `{"select": {"name": "Option"}}`
- **Multi-select:** `{"multi_select": [{"name": "A"}, {"name": "B"}]}`
- **Date:** `{"date": {"start": "2026-01-15", "end": "2026-01-16"}}`
- **Checkbox:** `{"checkbox": true}`
- **Number:** `{"number": 42}`
- **URL:** `{"url": "https://..."}`
- **Email:** `{"email": "user@example.com"}`
- **Relation:** `{"relation": [{"id": "page_id"}]}`

## Key Differences in API Version 2025-09-03

- **Databases → Data Sources:** Use `/data_sources/` endpoints for queries and retrieval
- **Two IDs:** Each database has both a `database_id` and a `data_source_id`
  - Use `database_id` when creating pages (`parent: {"database_id": "..."}`)
  - Use `data_source_id` when querying (`POST /v1/data_sources/{id}/query`)
- **Search results:** Databases return as `"object": "data_source"` with their `data_source_id`

## Notes

- Page/database IDs are UUIDs (with or without dashes)
- Rate limit: ~3 requests/second average
- The API cannot set database view filters — that's UI-only
- Use `is_inline: true` when creating data sources to embed them in pages
- Add `-s` flag to curl to suppress progress bars (cleaner output for Hermes)
- Pipe output through `jq` for readable JSON: `... | jq '.results[0].properties'`


---
## Component: codex-agents-main--plugins--startup-business-analyst--skills--competitive-landscape

---
name: competitive-landscape
description: Analyze competition, identify differentiation opportunities, and develop winning market positioning strategies using Porter's Five Forces, Blue Ocean Strategy, and positioning maps. Use this skill when evaluating competitors, assessing market positioning, identifying sustainable competitive advantages, or preparing competitive strategy analysis for a startup or investor pitch.
version: 1.0.0
---

# Competitive Landscape Analysis

Comprehensive frameworks for analyzing competition, identifying differentiation opportunities, and developing winning market positioning strategies.

## Overview

Understand competitive dynamics using proven frameworks (Porter's Five Forces, Blue Ocean Strategy, positioning maps) to identify opportunities and craft defensible competitive advantages.

## Porter's Five Forces

Analyze industry attractiveness and competitive intensity.

### Force 1: Threat of New Entrants

**Barriers to Entry:**

- Capital requirements
- Economies of scale
- Switching costs
- Brand loyalty
- Regulatory barriers
- Access to distribution
- Network effects

**High Threat:** Low barriers, easy to enter (e.g., simple SaaS tools)
**Low Threat:** High barriers (e.g., regulated industries, hardware)

**Analysis Questions:**

- How easy is it for new competitors to enter?
- What would it cost to launch a competing product?
- Are there network effects or switching costs protecting incumbents?

### Force 2: Bargaining Power of Suppliers

**Supplier Power Factors:**

- Supplier concentration
- Availability of substitutes
- Importance to supplier
- Switching costs
- Forward integration threat

**High Power:** Few suppliers, critical inputs (e.g., cloud infrastructure providers)
**Low Power:** Many alternatives, commoditized (e.g., generic services)

**Analysis Questions:**

- Who are our critical suppliers?
- Could they raise prices or reduce quality?
- Can we switch suppliers easily?

### Force 3: Bargaining Power of Buyers

**Buyer Power Factors:**

- Buyer concentration
- Volume purchased
- Product differentiation
- Price sensitivity
- Backward integration threat

**High Power:** Few large customers, standardized products (e.g., enterprise deals)
**Low Power:** Many small customers, differentiated product (e.g., consumer subscriptions)

**Analysis Questions:**

- Can customers easily switch to competitors?
- Do few customers generate most revenue?
- How price-sensitive are buyers?

### Force 4: Threat of Substitutes

**Substitute Considerations:**

- Alternative solutions
- Price-performance tradeoff
- Switching costs
- Buyer propensity to substitute

**High Threat:** Many alternatives, low switching cost (e.g., productivity software)
**Low Threat:** Unique solution, high switching cost (e.g., ERP systems)

**Analysis Questions:**

- What alternative ways can customers solve this problem?
- How do substitutes compare on price and performance?
- What's the cost to switch to a substitute?

### Force 5: Competitive Rivalry

**Rivalry Intensity Factors:**

- Number of competitors
- Industry growth rate
- Product differentiation
- Exit barriers
- Strategic stakes

**High Rivalry:** Many competitors, slow growth, commoditized (e.g., email marketing)
**Low Rivalry:** Few competitors, fast growth, differentiated (e.g., emerging AI tools)

**Analysis Questions:**

- How many direct competitors exist?
- Is the market growing or stagnant?
- How differentiated are offerings?
- Are competitors competing on price or value?

### Forces Analysis Summary

Create a scorecard:

| Force          | Intensity (1-5) | Impact | Key Factors                       |
| -------------- | --------------- | ------ | --------------------------------- |
| New Entrants   | 3               | Medium | Low barriers but network effects  |
| Supplier Power | 2               | Low    | Many cloud providers              |
| Buyer Power    | 4               | High   | Enterprise customers concentrated |
| Substitutes    | 3               | Medium | Manual processes alternative      |
| Rivalry        | 4               | High   | 10+ direct competitors            |

**Overall Assessment:** Moderate industry attractiveness with high rivalry and buyer power

## Blue Ocean Strategy

Identify uncontested market space through value innovation.

### Four Actions Framework

**Eliminate:**
What factors can be eliminated that the industry takes for granted?

**Reduce:**
What factors can be reduced well below industry standard?

**Raise:**
What factors can be raised well above industry standard?

**Create:**
What factors can be created that the industry never offered?

### Strategy Canvas

Map your offering vs. competitors on key factors.

**Example: Budget Hotels**

```
High |                    ★ Traditional Hotels
     |          ★ Budget Hotels (new)
     |
Low  |___________________________________
     Price  Luxury  Convenience  Cleanliness

Budget Hotel Strategy:
- Eliminate: Luxury amenities, room service
- Reduce: Lobby size, staff
- Raise: Cleanliness, online booking
- Create: Self-service kiosks, mobile app
```

### Value Innovation

Find the sweet spot: Lower cost + higher value

**Steps:**

1. Map industry competing factors
2. Identify factors to eliminate/reduce (cost savings)
3. Identify factors to raise/create (differentiation)
4. Validate that combination creates new market space

## Competitive Positioning

### Positioning Map

Plot competitors on 2-3 key dimensions.

**Example Dimensions:**

- Price vs. Features
- Complexity vs. Ease of Use
- Enterprise vs. SMB Focus
- Self-Service vs. High-Touch
- Generalist vs. Specialist

**How to Create:**

1. Choose 2 dimensions most important to customers
2. Plot all competitors
3. Identify gaps (white space)
4. Validate gap represents real customer need

**Example:**

```
High Price
    |
    |  ★ Enterprise A      ★ Enterprise B
    |
    |          ● Our Position (gap)
    |
    |  ★ Competitor C      ★ Competitor D
    |
Low Price |____________________________________________
        Simple                           Complex
```

### Differentiation Strategy

**How to Differentiate:**

1. **Product Differentiation**
   - Unique features
   - Superior performance
   - Better design/UX
   - Integration ecosystem

2. **Service Differentiation**
   - Customer support quality
   - Onboarding experience
   - Response time
   - Success programs

3. **Brand Differentiation**
   - Trust and reputation
   - Thought leadership
   - Community
   - Values alignment

4. **Price Differentiation**
   - Premium positioning
   - Value positioning
   - Transparent pricing
   - Flexible packaging

### Positioning Statement Framework

```
For [target customer]
Who [statement of need or opportunity]
Our product is [product category]
That [statement of key benefit]
Unlike [primary competitive alternative]
Our product [statement of primary differentiation]
```

**Example:**

```
For e-commerce companies
Who struggle with email marketing automation
Our product is an AI-powered email platform
That increases conversion rates by 40%
Unlike Klaviyo and Mailchimp
Our product uses AI to personalize at scale
```

## Competitive Intelligence

### Information Gathering

**Public Sources:**

- Company websites and blogs
- Press releases and news
- Job postings (hint at strategy)
- Customer reviews (G2, Capterra)
- Social media and forums
- Glassdoor (employee insights)
- SEC filings (public companies)
- Patent filings

**Direct Research:**

- Customer interviews
- Win/loss analysis
- Sales team feedback
- Product demos and trials
- Conference attendance

### Competitor Profile Template

For each key competitor, document:

**Company Overview:**

- Founded, HQ, funding, size
- Leadership team
- Company stage and trajectory

**Product:**

- Core features
- Target customers
- Pricing and packaging
- Technology stack
- Recent launches

**Go-to-Market:**

- Sales model (self-serve, sales-led)
- Marketing strategy
- Distribution channels
- Partnerships

**Strengths:**

- What they do better than anyone
- Key competitive advantages
- Market position

**Weaknesses:**

- Gaps in product
- Customer complaints
- Operational challenges

**Strategy:**

- Stated direction
- Inferred priorities
- Likely next moves

## Competitive Pricing Analysis

### Price Positioning

**Premium (Top 25%):**

- Superior product/service
- Strong brand
- High-touch sales
- Enterprise focus

**Mid-Market (Middle 50%):**

- Balanced value
- Standard features
- Mixed sales model
- Broad market

**Value (Bottom 25%):**

- Basic functionality
- Self-service
- Cost leadership
- High volume, low margin

### Pricing Comparison Matrix

| Competitor   | Entry Price | Mid Tier | Enterprise | Model        |
| ------------ | ----------- | -------- | ---------- | ------------ |
| Competitor A | $29/mo      | $99/mo   | Custom     | Subscription |
| Competitor B | $49/mo      | $199/mo  | $499/mo    | Subscription |
| Us           | $39/mo      | $129/mo  | Custom     | Subscription |

**Analysis:**

- Are we priced competitively?
- What does our pricing signal?
- Are there gaps in our packaging?

## Go-to-Market Strategy

### Market Entry Strategies

**Direct Competition:**

- Head-to-head against established players
- Requires differentiation and resources
- Example: Better features at lower price

**Niche Focus:**

- Target underserved segment
- Become specialist vs. generalist
- Example: "Salesforce for real estate"

**Disruptive Innovation:**

- Target non-consumers or low end
- Improve over time to move upmarket
- Example: Freemium model disrupting enterprise

**Platform Play:**

- Build ecosystem and network effects
- Aggregate complementary services
- Example: Marketplace or API platform

### Beachhead Market

**Characteristics of Good Beachhead:**

- Specific, reachable segment
- Acute pain you solve well
- Limited competition
- Willing to pay
- Can lead to expansion

**Example:**
Instead of "project management software", target "project management for construction teams"

## Competitive Advantage

### Sustainable Advantages

**Network Effects:**

- Value increases with users
- Example: Slack, marketplaces

**Switching Costs:**

- High cost to change
- Example: CRM systems with data

**Economies of Scale:**

- Unit costs decrease with volume
- Example: Cloud infrastructure

**Brand:**

- Trust and reputation
- Example: Security software

**Proprietary Technology:**

- Patents or trade secrets
- Example: Algorithms, data

**Regulatory:**

- Licenses or approvals
- Example: Fintech, healthcare

### Testing Your Advantage

Ask:

- Can competitors copy this in < 2 years?
- Does this matter to customers?
- Do we execute this better than anyone?
- Is this advantage durable?

If "no" to any, it's not a sustainable advantage.

## Competitive Monitoring

### What to Track

**Product Changes:**

- New features
- Pricing changes
- Packaging adjustments

**Market Signals:**

- Funding announcements
- Key hires (especially leadership)
- Customer wins/losses
- Partnerships

**Performance Metrics:**

- Revenue (if public or disclosed)
- Customer count
- Growth rate
- Market share estimates

### Monitoring Cadence

**Weekly:**

- Product release notes
- News mentions

**Monthly:**

- Win/loss analysis review
- Positioning map updates

**Quarterly:**

- Deep competitive review
- Strategy adjustment

**Annually:**

- Major strategy reassessment
- Market trends analysis


## Quick Start

To analyze competitive landscape:

1. **Identify competitors** - Direct, indirect, and future threats
2. **Apply Porter's Five Forces** - Assess industry attractiveness
3. **Create positioning map** - Visualize competitive space
4. **Profile top 3-5 competitors** - Deep dive on key rivals
5. **Identify differentiation** - What makes you unique
6. **Analyze pricing** - Where do you fit?
7. **Assess advantages** - What's defensible?
8. **Develop strategy** - How to win


---
## Component: codex-hermes-agent-main--skills--productivity--powerpoint

---
name: powerpoint
description: "Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions \"deck,\" \"slides,\" \"presentation,\" or references a .pptx filename, regardless of what they plan to do with the content afterward. If a .pptx file needs to be opened, created, or touched, use this skill."
license: Proprietary. LICENSE.txt has complete terms
---

# Powerpoint Skill

## Quick Reference

| Task | Guide |
|------|-------|
| Read/analyze content | `python -m markitdown presentation.pptx` |
| Edit or create from template | Read [editing.md](editing.md) |
| Create from scratch | Read [pptxgenjs.md](pptxgenjs.md) |

---

## Reading Content

```bash
# Text extraction
python -m markitdown presentation.pptx

# Visual overview
python scripts/thumbnail.py presentation.pptx

# Raw XML
python scripts/office/unpack.py presentation.pptx unpacked/
```

---

## Editing Workflow

**Read [editing.md](editing.md) for full details.**

1. Analyze template with `thumbnail.py`
2. Unpack → manipulate slides → edit content → clean → pack

---

## Creating from Scratch

**Read [pptxgenjs.md](pptxgenjs.md) for full details.**

Use when no template or reference presentation is available.

---

## Design Ideas

**Don't create boring slides.** Plain bullets on a white background won't impress anyone. Consider ideas from this list for each slide.

### Before Starting

- **Pick a bold, content-informed color palette**: The palette should feel designed for THIS topic. If swapping your colors into a completely different presentation would still "work," you haven't made specific enough choices.
- **Dominance over equality**: One color should dominate (60-70% visual weight), with 1-2 supporting tones and one sharp accent. Never give all colors equal weight.
- **Dark/light contrast**: Dark backgrounds for title + conclusion slides, light for content ("sandwich" structure). Or commit to dark throughout for a premium feel.
- **Commit to a visual motif**: Pick ONE distinctive element and repeat it — rounded image frames, icons in colored circles, thick single-side borders. Carry it across every slide.

### Color Palettes

Choose colors that match your topic — don't default to generic blue. Use these palettes as inspiration:

| Theme | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| **Midnight Executive** | `1E2761` (navy) | `CADCFC` (ice blue) | `FFFFFF` (white) |
| **Forest & Moss** | `2C5F2D` (forest) | `97BC62` (moss) | `F5F5F5` (cream) |
| **Coral Energy** | `F96167` (coral) | `F9E795` (gold) | `2F3C7E` (navy) |
| **Warm Terracotta** | `B85042` (terracotta) | `E7E8D1` (sand) | `A7BEAE` (sage) |
| **Ocean Gradient** | `065A82` (deep blue) | `1C7293` (teal) | `21295C` (midnight) |
| **Charcoal Minimal** | `36454F` (charcoal) | `F2F2F2` (off-white) | `212121` (black) |
| **Teal Trust** | `028090` (teal) | `00A896` (seafoam) | `02C39A` (mint) |
| **Berry & Cream** | `6D2E46` (berry) | `A26769` (dusty rose) | `ECE2D0` (cream) |
| **Sage Calm** | `84B59F` (sage) | `69A297` (eucalyptus) | `50808E` (slate) |
| **Cherry Bold** | `990011` (cherry) | `FCF6F5` (off-white) | `2F3C7E` (navy) |

### For Each Slide

**Every slide needs a visual element** — image, chart, icon, or shape. Text-only slides are forgettable.

**Layout options:**
- Two-column (text left, illustration on right)
- Icon + text rows (icon in colored circle, bold header, description below)
- 2x2 or 2x3 grid (image on one side, grid of content blocks on other)
- Half-bleed image (full left or right side) with content overlay

**Data display:**
- Large stat callouts (big numbers 60-72pt with small labels below)
- Comparison columns (before/after, pros/cons, side-by-side options)
- Timeline or process flow (numbered steps, arrows)

**Visual polish:**
- Icons in small colored circles next to section headers
- Italic accent text for key stats or taglines

### Typography

**Choose an interesting font pairing** — don't default to Arial. Pick a header font with personality and pair it with a clean body font.

| Header Font | Body Font |
|-------------|-----------|
| Georgia | Calibri |
| Arial Black | Arial |
| Calibri | Calibri Light |
| Cambria | Calibri |
| Trebuchet MS | Calibri |
| Impact | Arial |
| Palatino | Garamond |
| Consolas | Calibri |

| Element | Size |
|---------|------|
| Slide title | 36-44pt bold |
| Section header | 20-24pt bold |
| Body text | 14-16pt |
| Captions | 10-12pt muted |

### Spacing

- 0.5" minimum margins
- 0.3-0.5" between content blocks
- Leave breathing room—don't fill every inch

### Avoid (Common Mistakes)

- **Don't repeat the same layout** — vary columns, cards, and callouts across slides
- **Don't center body text** — left-align paragraphs and lists; center only titles
- **Don't skimp on size contrast** — titles need 36pt+ to stand out from 14-16pt body
- **Don't default to blue** — pick colors that reflect the specific topic
- **Don't mix spacing randomly** — choose 0.3" or 0.5" gaps and use consistently
- **Don't style one slide and leave the rest plain** — commit fully or keep it simple throughout
- **Don't create text-only slides** — add images, icons, charts, or visual elements; avoid plain title + bullets
- **Don't forget text box padding** — when aligning lines or shapes with text edges, set `margin: 0` on the text box or offset the shape to account for padding
- **Don't use low-contrast elements** — icons AND text need strong contrast against the background; avoid light text on light backgrounds or dark text on dark backgrounds
- **NEVER use accent lines under titles** — these are a hallmark of AI-generated slides; use whitespace or background color instead

---

## QA (Required)

**Assume there are problems. Your job is to find them.**

Your first render is almost never correct. Approach QA as a bug hunt, not a confirmation step. If you found zero issues on first inspection, you weren't looking hard enough.

### Content QA

```bash
python -m markitdown output.pptx
```

Check for missing content, typos, wrong order.

**When using templates, check for leftover placeholder text:**

```bash
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide).*layout"
```

If grep returns results, fix them before declaring success.

### Visual QA

**⚠️ USE SUBAGENTS** — even for 2-3 slides. You've been staring at the code and will see what you expect, not what's there. Subagents have fresh eyes.

Convert slides to images (see [Converting to Images](#converting-to-images)), then use this prompt:

```
Visually inspect these slides. Assume there are issues — find them.

Look for:
- Overlapping elements (text through shapes, lines through words, stacked elements)
- Text overflow or cut off at edges/box boundaries
- Decorative lines positioned for single-line text but title wrapped to two lines
- Source citations or footers colliding with content above
- Elements too close (< 0.3" gaps) or cards/sections nearly touching
- Uneven gaps (large empty area in one place, cramped in another)
- Insufficient margin from slide edges (< 0.5")
- Columns or similar elements not aligned consistently
- Low-contrast text (e.g., light gray text on cream-colored background)
- Low-contrast icons (e.g., dark icons on dark backgrounds without a contrasting circle)
- Text boxes too narrow causing excessive wrapping
- Leftover placeholder content

For each slide, list issues or areas of concern, even if minor.

Read and analyze these images:
1. /path/to/slide-01.jpg (Expected: [brief description])
2. /path/to/slide-02.jpg (Expected: [brief description])

Report ALL issues found, including minor ones.
```

### Verification Loop

1. Generate slides → Convert to images → Inspect
2. **List issues found** (if none found, look again more critically)
3. Fix issues
4. **Re-verify affected slides** — one fix often creates another problem
5. Repeat until a full pass reveals no new issues

**Do not declare success until you've completed at least one fix-and-verify cycle.**

---

## Converting to Images

Convert presentations to individual slide images for visual inspection:

```bash
python scripts/office/soffice.py --headless --convert-to pdf output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

This creates `slide-01.jpg`, `slide-02.jpg`, etc.

To re-render specific slides after fixes:

```bash
pdftoppm -jpeg -r 150 -f N -l N output.pdf slide-fixed
```

---

## Dependencies

- `pip install "markitdown[pptx]"` - text extraction
- `pip install Pillow` - thumbnail grids
- `npm install -g pptxgenjs` - creating from scratch
- LibreOffice (`soffice`) - PDF conversion (auto-configured for sandboxed environments via `scripts/office/soffice.py`)
- Poppler (`pdftoppm`) - PDF to images


---
## Component: codex-hermes-agent-main--skills--productivity--google-workspace

---
name: google-workspace
description: Gmail, Calendar, Drive, Contacts, Sheets, and Docs integration via Python. Uses OAuth2 with automatic token refresh. No external binaries needed — runs entirely with Google's Python client libraries in the Hermes venv.
version: 1.0.0
author: Nous Research
license: MIT
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials (downloaded from Google Cloud Console)
metadata:
  hermes:
    tags: [Google, Gmail, Calendar, Drive, Sheets, Docs, Contacts, Email, OAuth]
    homepage: https://github.com/NousResearch/hermes-agent
    related_skills: [himalaya]
---

# Google Workspace

Gmail, Calendar, Drive, Contacts, Sheets, and Docs — all through Python scripts in this skill. No external binaries to install.

## References

- `references/gmail-search-syntax.md` — Gmail search operators (is:unread, from:, newer_than:, etc.)

## Scripts

- `scripts/setup.py` — OAuth2 setup (run once to authorize)
- `scripts/google_api.py` — API wrapper CLI (agent uses this for all operations)

## First-Time Setup

The setup is fully non-interactive — you drive it step by step so it works
on CLI, Telegram, Discord, or any platform.

Define a shorthand first:

```bash
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
GWORKSPACE_SKILL_DIR="$HERMES_HOME/skills/productivity/google-workspace"
PYTHON_BIN="${HERMES_PYTHON:-python3}"
if [ -x "$HERMES_HOME/hermes-agent/venv/bin/python" ]; then
  PYTHON_BIN="$HERMES_HOME/hermes-agent/venv/bin/python"
fi
GSETUP="$PYTHON_BIN $GWORKSPACE_SKILL_DIR/scripts/setup.py"
```

### Step 0: Check if already set up

```bash
$GSETUP --check
```

If it prints `AUTHENTICATED`, skip to Usage — setup is already done.

### Step 1: Triage — ask the user what they need

Before starting OAuth setup, ask the user TWO questions:

**Question 1: "What Google services do you need? Just email, or also
Calendar/Drive/Sheets/Docs?"**

- **Email only** → They don't need this skill at all. Use the `himalaya` skill
  instead — it works with a Gmail App Password (Settings → Security → App
  Passwords) and takes 2 minutes to set up. No Google Cloud project needed.
  Load the himalaya skill and follow its setup instructions.

- **Calendar, Drive, Sheets, Docs (or email + these)** → Continue with this
  skill's OAuth setup below.

**Question 2: "Does your Google account use Advanced Protection (hardware
security keys required to sign in)? If you're not sure, you probably don't
— it's something you would have explicitly enrolled in."**

- **No / Not sure** → Normal setup. Continue below.
- **Yes** → Their Workspace admin must add the OAuth client ID to the org's
  allowed apps list before Step 4 will work. Let them know upfront.

### Step 2: Create OAuth credentials (one-time, ~5 minutes)

Tell the user:

> You need a Google Cloud OAuth client. This is a one-time setup:
>
> 1. Go to https://console.cloud.google.com/apis/credentials
> 2. Create a project (or use an existing one)
> 3. Click "Enable APIs" and enable: Gmail API, Google Calendar API,
>    Google Drive API, Google Sheets API, Google Docs API, People API
> 4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
> 5. Application type: "Desktop app" → Create
> 6. Click "Download JSON" and tell me the file path

Once they provide the path:

```bash
$GSETUP --client-secret /path/to/client_secret.json
```

### Step 3: Get authorization URL

```bash
$GSETUP --auth-url
```

This prints a URL. **Send the URL to the user** and tell them:

> Open this link in your browser, sign in with your Google account, and
> authorize access. After authorizing, you'll be redirected to a page that
> may show an error — that's expected. Copy the ENTIRE URL from your
> browser's address bar and paste it back to me.

### Step 4: Exchange the code

The user will paste back either a URL like `http://localhost:1/?code=4/0A...&scope=...`
or just the code string. Either works. The `--auth-url` step stores a temporary
pending OAuth session locally so `--auth-code` can complete the PKCE exchange
later, even on headless systems:

```bash
$GSETUP --auth-code "THE_URL_OR_CODE_THE_USER_PASTED"
```

### Step 5: Verify

```bash
$GSETUP --check
```

Should print `AUTHENTICATED`. Setup is complete — token refreshes automatically from now on.

### Notes

- Token is stored at `google_token.json` under the active profile's `HERMES_HOME` and auto-refreshes.
- Pending OAuth session state/verifier are stored temporarily at `google_oauth_pending.json` under the active profile's `HERMES_HOME` until exchange completes.
- Hermes now refuses to overwrite a full Google Workspace token with a narrower re-auth token missing Gmail scopes, so one profile's partial consent cannot silently break email actions later.
- To revoke: `$GSETUP --revoke`

## Usage

All commands go through the API script. Set `GAPI` as a shorthand:

```bash
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
GWORKSPACE_SKILL_DIR="$HERMES_HOME/skills/productivity/google-workspace"
PYTHON_BIN="${HERMES_PYTHON:-python3}"
if [ -x "$HERMES_HOME/hermes-agent/venv/bin/python" ]; then
  PYTHON_BIN="$HERMES_HOME/hermes-agent/venv/bin/python"
fi
GAPI="$PYTHON_BIN $GWORKSPACE_SKILL_DIR/scripts/google_api.py"
```

### Gmail

```bash
# Search (returns JSON array with id, from, subject, date, snippet)
$GAPI gmail search "is:unread" --max 10
$GAPI gmail search "from:boss@company.com newer_than:1d"
$GAPI gmail search "has:attachment filename:pdf newer_than:7d"

# Read full message (returns JSON with body text)
$GAPI gmail get MESSAGE_ID

# Send
$GAPI gmail send --to user@example.com --subject "Hello" --body "Message text"
$GAPI gmail send --to user@example.com --subject "Report" --body "<h1>Q4</h1><p>Details...</p>" --html

# Reply (automatically threads and sets In-Reply-To)
$GAPI gmail reply MESSAGE_ID --body "Thanks, that works for me."

# Labels
$GAPI gmail labels
$GAPI gmail modify MESSAGE_ID --add-labels LABEL_ID
$GAPI gmail modify MESSAGE_ID --remove-labels UNREAD
```

### Calendar

```bash
# List events (defaults to next 7 days)
$GAPI calendar list
$GAPI calendar list --start 2026-03-01T00:00:00Z --end 2026-03-07T23:59:59Z

# Create event (ISO 8601 with timezone required)
$GAPI calendar create --summary "Team Standup" --start 2026-03-01T10:00:00-06:00 --end 2026-03-01T10:30:00-06:00
$GAPI calendar create --summary "Lunch" --start 2026-03-01T12:00:00Z --end 2026-03-01T13:00:00Z --location "Cafe"
$GAPI calendar create --summary "Review" --start 2026-03-01T14:00:00Z --end 2026-03-01T15:00:00Z --attendees "alice@co.com,bob@co.com"

# Delete event
$GAPI calendar delete EVENT_ID
```

### Drive

```bash
$GAPI drive search "quarterly report" --max 10
$GAPI drive search "mimeType='application/pdf'" --raw-query --max 5
```

### Contacts

```bash
$GAPI contacts list --max 20
```

### Sheets

```bash
# Read
$GAPI sheets get SHEET_ID "Sheet1!A1:D10"

# Write
$GAPI sheets update SHEET_ID "Sheet1!A1:B2" --values '[["Name","Score"],["Alice","95"]]'

# Append rows
$GAPI sheets append SHEET_ID "Sheet1!A:C" --values '[["new","row","data"]]'
```

### Docs

```bash
$GAPI docs get DOC_ID
```

## Output Format

All commands return JSON. Parse with `jq` or read directly. Key fields:

- **Gmail search**: `[{id, threadId, from, to, subject, date, snippet, labels}]`
- **Gmail get**: `{id, threadId, from, to, subject, date, labels, body}`
- **Gmail send/reply**: `{status: "sent", id, threadId}`
- **Calendar list**: `[{id, summary, start, end, location, description, htmlLink}]`
- **Calendar create**: `{status: "created", id, summary, htmlLink}`
- **Drive search**: `[{id, name, mimeType, modifiedTime, webViewLink}]`
- **Contacts list**: `[{name, emails: [...], phones: [...]}]`
- **Sheets get**: `[[cell, cell, ...], ...]`

## Rules

1. **Never send email or create/delete events without confirming with the user first.** Show the draft content and ask for approval.
2. **Check auth before first use** — run `setup.py --check`. If it fails, guide the user through setup.
3. **Use the Gmail search syntax reference** for complex queries — load it with `skill_view("google-workspace", file_path="references/gmail-search-syntax.md")`.
4. **Calendar times must include timezone** — always use ISO 8601 with offset (e.g., `2026-03-01T10:00:00-06:00`) or UTC (`Z`).
5. **Respect rate limits** — avoid rapid-fire sequential API calls. Batch reads when possible.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `NOT_AUTHENTICATED` | Run setup Steps 2-5 above |
| `REFRESH_FAILED` | Token revoked or expired — redo Steps 3-5 |
| `HttpError 403: Insufficient Permission` | Missing API scope — `$GSETUP --revoke` then redo Steps 3-5 |
| `HttpError 403: Access Not Configured` | API not enabled — user needs to enable it in Google Cloud Console |
| `ModuleNotFoundError` | Run `$GSETUP --install-deps` |
| Advanced Protection blocks auth | Workspace admin must allowlist the OAuth client ID |

## Revoking Access

```bash
$GSETUP --revoke
```


---
## Component: codex-agents-main--plugins--payment-processing--skills--billing-automation

---
name: billing-automation
description: Build automated billing systems for recurring payments, invoicing, subscription lifecycle, and dunning management. Use when implementing subscription billing, automating invoicing, or managing recurring payment systems.
---

# Billing Automation

Master automated billing systems including recurring billing, invoice generation, dunning management, proration, and tax calculation.

## When to Use This Skill

- Implementing SaaS subscription billing
- Automating invoice generation and delivery
- Managing failed payment recovery (dunning)
- Calculating prorated charges for plan changes
- Handling sales tax, VAT, and GST
- Processing usage-based billing
- Managing billing cycles and renewals

## Core Concepts

### 1. Billing Cycles

**Common Intervals:**

- Monthly (most common for SaaS)
- Annual (discounted long-term)
- Quarterly
- Weekly
- Custom (usage-based, per-seat)

### 2. Subscription States

```
trial → active → past_due → canceled
              → paused → resumed
```

### 3. Dunning Management

Automated process to recover failed payments through:

- Retry schedules
- Customer notifications
- Grace periods
- Account restrictions

### 4. Proration

Adjusting charges when:

- Upgrading/downgrading mid-cycle
- Adding/removing seats
- Changing billing frequency

## Quick Start

```python
from billing import BillingEngine, Subscription

# Initialize billing engine
billing = BillingEngine()

# Create subscription
subscription = billing.create_subscription(
    customer_id="cus_123",
    plan_id="plan_pro_monthly",
    billing_cycle_anchor=datetime.now(),
    trial_days=14
)

# Process billing cycle
billing.process_billing_cycle(subscription.id)
```

## Subscription Lifecycle Management

```python
from datetime import datetime, timedelta
from enum import Enum

class SubscriptionStatus(Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    PAUSED = "paused"

class Subscription:
    def __init__(self, customer_id, plan, billing_cycle_day=None):
        self.id = generate_id()
        self.customer_id = customer_id
        self.plan = plan
        self.status = SubscriptionStatus.TRIAL
        self.current_period_start = datetime.now()
        self.current_period_end = self.current_period_start + timedelta(days=plan.trial_days or 30)
        self.billing_cycle_day = billing_cycle_day or self.current_period_start.day
        self.trial_end = datetime.now() + timedelta(days=plan.trial_days) if plan.trial_days else None

    def start_trial(self, trial_days):
        """Start trial period."""
        self.status = SubscriptionStatus.TRIAL
        self.trial_end = datetime.now() + timedelta(days=trial_days)
        self.current_period_end = self.trial_end

    def activate(self):
        """Activate subscription after trial or immediately."""
        self.status = SubscriptionStatus.ACTIVE
        self.current_period_start = datetime.now()
        self.current_period_end = self.calculate_next_billing_date()

    def mark_past_due(self):
        """Mark subscription as past due after failed payment."""
        self.status = SubscriptionStatus.PAST_DUE
        # Trigger dunning workflow

    def cancel(self, at_period_end=True):
        """Cancel subscription."""
        if at_period_end:
            self.cancel_at_period_end = True
            # Will cancel when current period ends
        else:
            self.status = SubscriptionStatus.CANCELED
            self.canceled_at = datetime.now()

    def calculate_next_billing_date(self):
        """Calculate next billing date based on interval."""
        if self.plan.interval == 'month':
            return self.current_period_start + timedelta(days=30)
        elif self.plan.interval == 'year':
            return self.current_period_start + timedelta(days=365)
        elif self.plan.interval == 'week':
            return self.current_period_start + timedelta(days=7)
```

## Billing Cycle Processing

```python
class BillingEngine:
    def process_billing_cycle(self, subscription_id):
        """Process billing for a subscription."""
        subscription = self.get_subscription(subscription_id)

        # Check if billing is due
        if datetime.now() < subscription.current_period_end:
            return

        # Generate invoice
        invoice = self.generate_invoice(subscription)

        # Attempt payment
        payment_result = self.charge_customer(
            subscription.customer_id,
            invoice.total
        )

        if payment_result.success:
            # Payment successful
            invoice.mark_paid()
            subscription.advance_billing_period()
            self.send_invoice(invoice)
        else:
            # Payment failed
            subscription.mark_past_due()
            self.start_dunning_process(subscription, invoice)

    def generate_invoice(self, subscription):
        """Generate invoice for billing period."""
        invoice = Invoice(
            customer_id=subscription.customer_id,
            subscription_id=subscription.id,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end
        )

        # Add subscription line item
        invoice.add_line_item(
            description=subscription.plan.name,
            amount=subscription.plan.amount,
            quantity=subscription.quantity or 1
        )

        # Add usage-based charges if applicable
        if subscription.has_usage_billing:
            usage_charges = self.calculate_usage_charges(subscription)
            invoice.add_line_item(
                description="Usage charges",
                amount=usage_charges
            )

        # Calculate tax
        tax = self.calculate_tax(invoice.subtotal, subscription.customer)
        invoice.tax = tax

        invoice.finalize()
        return invoice

    def charge_customer(self, customer_id, amount):
        """Charge customer using saved payment method."""
        customer = self.get_customer(customer_id)

        try:
            # Charge using payment processor
            charge = stripe.Charge.create(
                customer=customer.stripe_id,
                amount=int(amount * 100),  # Convert to cents
                currency='usd'
            )

            return PaymentResult(success=True, transaction_id=charge.id)
        except stripe.error.CardError as e:
            return PaymentResult(success=False, error=str(e))
```

## Dunning Management

```python
class DunningManager:
    """Manage failed payment recovery."""

    def __init__(self):
        self.retry_schedule = [
            {'days': 3, 'email_template': 'payment_failed_first'},
            {'days': 7, 'email_template': 'payment_failed_reminder'},
            {'days': 14, 'email_template': 'payment_failed_final'}
        ]

    def start_dunning_process(self, subscription, invoice):
        """Start dunning process for failed payment."""
        dunning_attempt = DunningAttempt(
            subscription_id=subscription.id,
            invoice_id=invoice.id,
            attempt_number=1,
            next_retry=datetime.now() + timedelta(days=3)
        )

        # Send initial failure notification
        self.send_dunning_email(subscription, 'payment_failed_first')

        # Schedule retries
        self.schedule_retries(dunning_attempt)

    def retry_payment(self, dunning_attempt):
        """Retry failed payment."""
        subscription = self.get_subscription(dunning_attempt.subscription_id)
        invoice = self.get_invoice(dunning_attempt.invoice_id)

        # Attempt payment again
        result = self.charge_customer(subscription.customer_id, invoice.total)

        if result.success:
            # Payment succeeded
            invoice.mark_paid()
            subscription.status = SubscriptionStatus.ACTIVE
            self.send_dunning_email(subscription, 'payment_recovered')
            dunning_attempt.mark_resolved()
        else:
            # Still failing
            dunning_attempt.attempt_number += 1

            if dunning_attempt.attempt_number < len(self.retry_schedule):
                # Schedule next retry
                next_retry_config = self.retry_schedule[dunning_attempt.attempt_number]
                dunning_attempt.next_retry = datetime.now() + timedelta(days=next_retry_config['days'])
                self.send_dunning_email(subscription, next_retry_config['email_template'])
            else:
                # Exhausted retries, cancel subscription
                subscription.cancel(at_period_end=False)
                self.send_dunning_email(subscription, 'subscription_canceled')

    def send_dunning_email(self, subscription, template):
        """Send dunning notification to customer."""
        customer = self.get_customer(subscription.customer_id)

        email_content = self.render_template(template, {
            'customer_name': customer.name,
            'amount_due': subscription.plan.amount,
            'update_payment_url': f"https://app.example.com/billing"
        })

        send_email(
            to=customer.email,
            subject=email_content['subject'],
            body=email_content['body']
        )
```

## Proration

```python
class ProrationCalculator:
    """Calculate prorated charges for plan changes."""

    @staticmethod
    def calculate_proration(old_plan, new_plan, period_start, period_end, change_date):
        """Calculate proration for plan change."""
        # Days in current period
        total_days = (period_end - period_start).days

        # Days used on old plan
        days_used = (change_date - period_start).days

        # Days remaining on new plan
        days_remaining = (period_end - change_date).days

        # Calculate prorated amounts
        unused_amount = (old_plan.amount / total_days) * days_remaining
        new_plan_amount = (new_plan.amount / total_days) * days_remaining

        # Net charge/credit
        proration = new_plan_amount - unused_amount

        return {
            'old_plan_credit': -unused_amount,
            'new_plan_charge': new_plan_amount,
            'net_proration': proration,
            'days_used': days_used,
            'days_remaining': days_remaining
        }

    @staticmethod
    def calculate_seat_proration(current_seats, new_seats, price_per_seat, period_start, period_end, change_date):
        """Calculate proration for seat changes."""
        total_days = (period_end - period_start).days
        days_remaining = (period_end - change_date).days

        # Additional seats charge
        additional_seats = new_seats - current_seats
        prorated_amount = (additional_seats * price_per_seat / total_days) * days_remaining

        return {
            'additional_seats': additional_seats,
            'prorated_charge': max(0, prorated_amount),  # No refund for removing seats mid-cycle
            'effective_date': change_date
        }
```

## Tax Calculation

```python
class TaxCalculator:
    """Calculate sales tax, VAT, GST."""

    def __init__(self):
        # Tax rates by region
        self.tax_rates = {
            'US_CA': 0.0725,  # California sales tax
            'US_NY': 0.04,    # New York sales tax
            'GB': 0.20,       # UK VAT
            'DE': 0.19,       # Germany VAT
            'FR': 0.20,       # France VAT
            'AU': 0.10,       # Australia GST
        }

    def calculate_tax(self, amount, customer):
        """Calculate applicable tax."""
        # Determine tax jurisdiction
        jurisdiction = self.get_tax_jurisdiction(customer)

        if not jurisdiction:
            return 0

        # Get tax rate
        tax_rate = self.tax_rates.get(jurisdiction, 0)

        # Calculate tax
        tax = amount * tax_rate

        return {
            'tax_amount': tax,
            'tax_rate': tax_rate,
            'jurisdiction': jurisdiction,
            'tax_type': self.get_tax_type(jurisdiction)
        }

    def get_tax_jurisdiction(self, customer):
        """Determine tax jurisdiction based on customer location."""
        if customer.country == 'US':
            # US: Tax based on customer state
            return f"US_{customer.state}"
        elif customer.country in ['GB', 'DE', 'FR']:
            # EU: VAT
            return customer.country
        elif customer.country == 'AU':
            # Australia: GST
            return 'AU'
        else:
            return None

    def get_tax_type(self, jurisdiction):
        """Get type of tax for jurisdiction."""
        if jurisdiction.startswith('US_'):
            return 'Sales Tax'
        elif jurisdiction in ['GB', 'DE', 'FR']:
            return 'VAT'
        elif jurisdiction == 'AU':
            return 'GST'
        return 'Tax'

    def validate_vat_number(self, vat_number, country):
        """Validate EU VAT number."""
        # Use VIES API for validation
        # Returns True if valid, False otherwise
        pass
```

## Invoice Generation

```python
class Invoice:
    def __init__(self, customer_id, subscription_id=None):
        self.id = generate_invoice_number()
        self.customer_id = customer_id
        self.subscription_id = subscription_id
        self.status = 'draft'
        self.line_items = []
        self.subtotal = 0
        self.tax = 0
        self.total = 0
        self.created_at = datetime.now()

    def add_line_item(self, description, amount, quantity=1):
        """Add line item to invoice."""
        line_item = {
            'description': description,
            'unit_amount': amount,
            'quantity': quantity,
            'total': amount * quantity
        }
        self.line_items.append(line_item)
        self.subtotal += line_item['total']

    def finalize(self):
        """Finalize invoice and calculate total."""
        self.total = self.subtotal + self.tax
        self.status = 'open'
        self.finalized_at = datetime.now()

    def mark_paid(self):
        """Mark invoice as paid."""
        self.status = 'paid'
        self.paid_at = datetime.now()

    def to_pdf(self):
        """Generate PDF invoice."""
        from reportlab.pdfgen import canvas

        # Generate PDF
        # Include: company info, customer info, line items, tax, total
        pass

    def to_html(self):
        """Generate HTML invoice."""
        template = """
        <!DOCTYPE html>
        <html>
        <head><title>Invoice #{invoice_number}</title></head>
        <body>
            <h1>Invoice #{invoice_number}</h1>
            <p>Date: {date}</p>
            <h2>Bill To:</h2>
            <p>{customer_name}<br>{customer_address}</p>
            <table>
                <tr><th>Description</th><th>Quantity</th><th>Amount</th></tr>
                {line_items}
            </table>
            <p>Subtotal: ${subtotal}</p>
            <p>Tax: ${tax}</p>
            <h3>Total: ${total}</h3>
        </body>
        </html>
        """

        return template.format(
            invoice_number=self.id,
            date=self.created_at.strftime('%Y-%m-%d'),
            customer_name=self.customer.name,
            customer_address=self.customer.address,
            line_items=self.render_line_items(),
            subtotal=self.subtotal,
            tax=self.tax,
            total=self.total
        )
```

## Usage-Based Billing

```python
class UsageBillingEngine:
    """Track and bill for usage."""

    def track_usage(self, customer_id, metric, quantity):
        """Track usage event."""
        UsageRecord.create(
            customer_id=customer_id,
            metric=metric,
            quantity=quantity,
            timestamp=datetime.now()
        )

    def calculate_usage_charges(self, subscription, period_start, period_end):
        """Calculate charges for usage in billing period."""
        usage_records = UsageRecord.get_for_period(
            subscription.customer_id,
            period_start,
            period_end
        )

        total_usage = sum(record.quantity for record in usage_records)

        # Tiered pricing
        if subscription.plan.pricing_model == 'tiered':
            charge = self.calculate_tiered_pricing(total_usage, subscription.plan.tiers)
        # Per-unit pricing
        elif subscription.plan.pricing_model == 'per_unit':
            charge = total_usage * subscription.plan.unit_price
        # Volume pricing
        elif subscription.plan.pricing_model == 'volume':
            charge = self.calculate_volume_pricing(total_usage, subscription.plan.tiers)

        return charge

    def calculate_tiered_pricing(self, total_usage, tiers):
        """Calculate cost using tiered pricing."""
        charge = 0
        remaining = total_usage

        for tier in sorted(tiers, key=lambda x: x['up_to']):
            tier_usage = min(remaining, tier['up_to'] - tier['from'])
            charge += tier_usage * tier['unit_price']
            remaining -= tier_usage

            if remaining <= 0:
                break

        return charge
```


---
## Component: codex-hermes-agent-main--optional-skills--email--agentmail

---
name: agentmail
description: Give the agent its own dedicated email inbox via AgentMail. Send, receive, and manage email autonomously using agent-owned email addresses (e.g. hermes-agent@agentmail.to).
version: 1.0.0
metadata:
  hermes:
    tags: [email, communication, agentmail, mcp]
    category: email
---

# AgentMail — Agent-Owned Email Inboxes

## Requirements

- **AgentMail API key** (required) — sign up at https://console.agentmail.to (free tier: 3 inboxes, 3,000 emails/month; paid plans from $20/mo)
- Node.js 18+ (for the MCP server)

## When to Use
Use this skill when you need to:
- Give the agent its own dedicated email address
- Send emails autonomously on behalf of the agent
- Receive and read incoming emails
- Manage email threads and conversations
- Sign up for services or authenticate via email
- Communicate with other agents or humans via email

This is NOT for reading the user's personal email (use himalaya or Gmail for that).
AgentMail gives the agent its own identity and inbox.

## Setup

### 1. Get an API Key
- Go to https://console.agentmail.to
- Create an account and generate an API key (starts with `am_`)

### 2. Configure MCP Server
Add to `~/.hermes/config.yaml` (paste your actual key — MCP env vars are not expanded from .env):
```yaml
mcp_servers:
  agentmail:
    command: "npx"
    args: ["-y", "agentmail-mcp"]
    env:
      AGENTMAIL_API_KEY: "am_your_key_here"
```

### 3. Restart Hermes
```bash
hermes
```
All 11 AgentMail tools are now available automatically.

## Available Tools (via MCP)

| Tool | Description |
|------|-------------|
| `list_inboxes` | List all agent inboxes |
| `get_inbox` | Get details of a specific inbox |
| `create_inbox` | Create a new inbox (gets a real email address) |
| `delete_inbox` | Delete an inbox |
| `list_threads` | List email threads in an inbox |
| `get_thread` | Get a specific email thread |
| `send_message` | Send a new email |
| `reply_to_message` | Reply to an existing email |
| `forward_message` | Forward an email |
| `update_message` | Update message labels/status |
| `get_attachment` | Download an email attachment |

## Procedure

### Create an inbox and send an email
1. Create a dedicated inbox:
   - Use `create_inbox` with a username (e.g. `hermes-agent`)
   - The agent gets address: `hermes-agent@agentmail.to`
2. Send an email:
   - Use `send_message` with `inbox_id`, `to`, `subject`, `text`
3. Check for replies:
   - Use `list_threads` to see incoming conversations
   - Use `get_thread` to read a specific thread

### Check incoming email
1. Use `list_inboxes` to find your inbox ID
2. Use `list_threads` with the inbox ID to see conversations
3. Use `get_thread` to read a thread and its messages

### Reply to an email
1. Get the thread with `get_thread`
2. Use `reply_to_message` with the message ID and your reply text

## Example Workflows

**Sign up for a service:**
```
1. create_inbox (username: "signup-bot")
2. Use the inbox address to register on the service
3. list_threads to check for verification email
4. get_thread to read the verification code
```

**Agent-to-human outreach:**
```
1. create_inbox (username: "hermes-outreach")
2. send_message (to: user@example.com, subject: "Hello", text: "...")
3. list_threads to check for replies
```

## Pitfalls
- Free tier limited to 3 inboxes and 3,000 emails/month
- Emails come from `@agentmail.to` domain on free tier (custom domains on paid plans)
- Node.js (18+) is required for the MCP server (`npx -y agentmail-mcp`)
- The `mcp` Python package must be installed: `pip install mcp`
- Real-time inbound email (webhooks) requires a public server — use `list_threads` polling via cronjob instead for personal use

## Verification
After setup, test with:
```
hermes --toolsets mcp -q "Create an AgentMail inbox called test-agent and tell me its email address"
```
You should see the new inbox address returned.

## References
- AgentMail docs: https://docs.agentmail.to/
- AgentMail console: https://console.agentmail.to
- AgentMail MCP repo: https://github.com/agentmail-to/agentmail-mcp
- Pricing: https://www.agentmail.to/pricing


---
## Component: codex-agents-main--plugins--payment-processing--skills--stripe-integration

---
name: stripe-integration
description: Implement Stripe payment processing for robust, PCI-compliant payment flows including checkout, subscriptions, and webhooks. Use when integrating Stripe payments, building subscription systems, or implementing secure checkout flows.
---

# Stripe Integration

Master Stripe payment processing integration for robust, PCI-compliant payment flows including checkout, subscriptions, webhooks, and refunds.

## When to Use This Skill

- Implementing payment processing in web/mobile applications
- Setting up subscription billing systems
- Handling one-time payments and recurring charges
- Processing refunds and disputes
- Managing customer payment methods
- Implementing SCA (Strong Customer Authentication) for European payments
- Building marketplace payment flows with Stripe Connect

## Core Concepts

### 1. Payment Flows

**Checkout Sessions**

- Recommended for most integrations
- Supports all UI paths:
  - Stripe-hosted checkout page
  - Embedded checkout form
  - Custom UI with Elements (Payment Element, Express Checkout Element) using `ui_mode='custom'`
- Provides built-in checkout capabilities (line items, discounts, tax, shipping, address collection, saved payment methods, and checkout lifecycle events)
- Lower integration and maintenance burden than Payment Intents

**Payment Intents (Bespoke control)**

- You calculate the final amount with taxes, discounts, subscriptions, and currency conversion yourself.
- More complex implementation and long-term maintenance burden
- Requires Stripe.js for PCI compliance

**Setup Intents (Save Payment Methods)**

- Collect payment method without charging
- Used for subscriptions and future payments
- Requires customer confirmation

### 2. Webhooks

**Critical Events:**

- `payment_intent.succeeded`: Payment completed
- `payment_intent.payment_failed`: Payment failed
- `customer.subscription.updated`: Subscription changed
- `customer.subscription.deleted`: Subscription canceled
- `charge.refunded`: Refund processed
- `invoice.payment_succeeded`: Subscription payment successful

### 3. Subscriptions

**Components:**

- **Product**: What you're selling
- **Price**: How much and how often
- **Subscription**: Customer's recurring payment
- **Invoice**: Generated for each billing cycle

### 4. Customer Management

- Create and manage customer records
- Store multiple payment methods
- Track customer metadata
- Manage billing details

## Quick Start

```python
import stripe

stripe.api_key = "sk_test_..."

# Create a checkout session
session = stripe.checkout.Session.create(
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'product_data': {
                'name': 'Premium Subscription',
            },
            'unit_amount': 2000,  # $20.00
            'recurring': {
                'interval': 'month',
            },
        },
        'quantity': 1,
    }],
    mode='subscription',
    success_url='https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url='https://yourdomain.com/cancel'
)

# Redirect user to session.url
print(session.url)
```

## Payment Implementation Patterns

### Pattern 1: One-Time Payment (Hosted Checkout)

```python
def create_checkout_session(amount, currency='usd'):
    """Create a one-time payment checkout session."""
    try:
        session = stripe.checkout.Session.create(
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': 'Blue T-shirt',
                        'images': ['https://example.com/product.jpg'],
                    },
                    'unit_amount': amount,  # Amount in cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://yourdomain.com/cancel',
            metadata={
                'order_id': 'order_123',
                'user_id': 'user_456'
            }
        )
        return session
    except stripe.error.StripeError as e:
        # Handle error
        print(f"Stripe error: {e.user_message}")
        raise
```

### Pattern 2: Elements with Checkout Sessions

```python
def create_checkout_session_for_elements(amount, currency='usd'):
    """Create a checkout session configured for Payment Element."""
    session = stripe.checkout.Session.create(
        mode='payment',
        ui_mode='custom',
        line_items=[{
            'price_data': {
                'currency': currency,
                'product_data': {'name': 'Blue T-shirt'},
                'unit_amount': amount,
            },
            'quantity': 1,
        }],
        return_url='https://yourdomain.com/complete?session_id={CHECKOUT_SESSION_ID}'
    )
    return session.client_secret  # Send to frontend
```

```javascript
const stripe = Stripe("pk_test_...");
const appearance = { theme: "stripe" };

const checkout = stripe.initCheckout({
  clientSecret,
  elementsOptions: { appearance },
});
const loadActionsResult = await checkout.loadActions();

if (loadActionsResult.type === "success") {
  const { actions } = loadActionsResult;
  const session = actions.getSession();

  const button = document.getElementById("pay-button");
  const checkoutContainer = document.getElementById("checkout-container");
  const emailInput = document.getElementById("email");
  const emailErrors = document.getElementById("email-errors");
  const errors = document.getElementById("confirm-errors");

  // Display a formatted string representing the total amount
  checkoutContainer.append(`Total: ${session.total.total.amount}`);

  // Mount Payment Element
  const paymentElement = checkout.createPaymentElement();
  paymentElement.mount("#payment-element");

  // Store email for submission
  emailInput.addEventListener("blur", () => {
    actions.updateEmail(emailInput.value).then((result) => {
      if (result.error) emailErrors.textContent = result.error.message;
    });
  });

  // Handle form submission
  button.addEventListener("click", () => {
    actions.confirm().then((result) => {
      if (result.type === "error") errors.textContent = result.error.message;
    });
  });
}
```

### Pattern 3: Elements with Payment Intents

Pattern 2 (Elements with Checkout Sessions) is Stripe's recommended approach, but you can also use Payment Intents as an alternative.

```python
def create_payment_intent(amount, currency='usd', customer_id=None):
    """Create a payment intent for bespoke checkout UI with Payment Element."""
    intent = stripe.PaymentIntent.create(
        amount=amount,
        currency=currency,
        customer=customer_id,
        automatic_payment_methods={
            'enabled': True,
        },
        metadata={
            'integration_check': 'accept_a_payment'
        }
    )
    return intent.client_secret  # Send to frontend
```

```javascript
// Mount Payment Element and confirm via Payment Intents
const stripe = Stripe("pk_test_...");
const appearance = { theme: "stripe" };
const elements = stripe.elements({ appearance, clientSecret });

const paymentElement = elements.create("payment");
paymentElement.mount("#payment-element");

document.getElementById("pay-button").addEventListener("click", async () => {
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: "https://yourdomain.com/complete",
    },
  });

  if (error) {
    document.getElementById("errors").textContent = error.message;
  }
});
```

### Pattern 4: Subscription Creation

```python
def create_subscription(customer_id, price_id):
    """Create a subscription for a customer."""
    try:
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent'],
        )

        return {
            'subscription_id': subscription.id,
            'client_secret': subscription.latest_invoice.payment_intent.client_secret
        }
    except stripe.error.StripeError as e:
        print(f"Subscription creation failed: {e}")
        raise
```

### Pattern 5: Customer Portal

```python
def create_customer_portal_session(customer_id):
    """Create a portal session for customers to manage subscriptions."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url='https://yourdomain.com/account',
    )
    return session.url  # Redirect customer here
```

## Webhook Handling

### Secure Webhook Endpoint

```python
from flask import Flask, request
import stripe

app = Flask(__name__)

endpoint_secret = 'whsec_...'

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        # Invalid payload
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return 'Invalid signature', 400

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_successful_payment(payment_intent)
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_failed_payment(payment_intent)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_canceled(subscription)

    return 'Success', 200

def handle_successful_payment(payment_intent):
    """Process successful payment."""
    customer_id = payment_intent.get('customer')
    amount = payment_intent['amount']
    metadata = payment_intent.get('metadata', {})

    # Update your database
    # Send confirmation email
    # Fulfill order
    print(f"Payment succeeded: {payment_intent['id']}")

def handle_failed_payment(payment_intent):
    """Handle failed payment."""
    error = payment_intent.get('last_payment_error', {})
    print(f"Payment failed: {error.get('message')}")
    # Notify customer
    # Update order status

def handle_subscription_canceled(subscription):
    """Handle subscription cancellation."""
    customer_id = subscription['customer']
    # Update user access
    # Send cancellation email
    print(f"Subscription canceled: {subscription['id']}")
```

### Webhook Best Practices

```python
import hashlib
import hmac

def verify_webhook_signature(payload, signature, secret):
    """Manually verify webhook signature."""
    expected_sig = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_sig)

def handle_webhook_idempotently(event_id, handler):
    """Ensure webhook is processed exactly once."""
    # Check if event already processed
    if is_event_processed(event_id):
        return

    # Process event
    try:
        handler()
        mark_event_processed(event_id)
    except Exception as e:
        log_error(e)
        # Stripe will retry failed webhooks
        raise
```

## Customer Management

```python
def create_customer(email, name, payment_method_id=None):
    """Create a Stripe customer."""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        payment_method=payment_method_id,
        invoice_settings={
            'default_payment_method': payment_method_id
        } if payment_method_id else None,
        metadata={
            'user_id': '12345'
        }
    )
    return customer

def attach_payment_method(customer_id, payment_method_id):
    """Attach a payment method to a customer."""
    stripe.PaymentMethod.attach(
        payment_method_id,
        customer=customer_id
    )

    # Set as default
    stripe.Customer.modify(
        customer_id,
        invoice_settings={
            'default_payment_method': payment_method_id
        }
    )

def list_customer_payment_methods(customer_id):
    """List all payment methods for a customer."""
    payment_methods = stripe.PaymentMethod.list(
        customer=customer_id,
        type='card'
    )
    return payment_methods.data
```

## Refund Handling

```python
def create_refund(payment_intent_id, amount=None, reason=None):
    """Create a refund."""
    refund_params = {
        'payment_intent': payment_intent_id
    }

    if amount:
        refund_params['amount'] = amount  # Partial refund

    if reason:
        refund_params['reason'] = reason  # 'duplicate', 'fraudulent', 'requested_by_customer'

    refund = stripe.Refund.create(**refund_params)
    return refund

def handle_dispute(charge_id, evidence):
    """Update dispute with evidence."""
    stripe.Dispute.modify(
        charge_id,
        evidence={
            'customer_name': evidence.get('customer_name'),
            'customer_email_address': evidence.get('customer_email'),
            'shipping_documentation': evidence.get('shipping_proof'),
            'customer_communication': evidence.get('communication'),
        }
    )
```

## Testing

```python
# Use test mode keys
stripe.api_key = "sk_test_..."

# Test card numbers
TEST_CARDS = {
    'success': '4242424242424242',
    'declined': '4000000000000002',
    '3d_secure': '4000002500003155',
    'insufficient_funds': '4000000000009995'
}

def test_payment_flow():
    """Test complete payment flow."""
    # Create test customer
    customer = stripe.Customer.create(
        email="test@example.com"
    )

    # Create payment intent
    intent = stripe.PaymentIntent.create(
        amount=1000,
        automatic_payment_methods={
            'enabled': True
        },
        currency='usd',
        customer=customer.id
    )

    # Confirm with test card
    confirmed = stripe.PaymentIntent.confirm(
        intent.id,
        payment_method='pm_card_visa'  # Test payment method
    )

    assert confirmed.status == 'succeeded'
```


---
## Component: codex-hermes-agent-main--skills--productivity--nano-pdf

---
name: nano-pdf
description: Edit PDFs with natural-language instructions using the nano-pdf CLI. Modify text, fix typos, update titles, and make content changes to specific pages without manual editing.
version: 1.0.0
author: community
license: MIT
metadata:
  hermes:
    tags: [PDF, Documents, Editing, NLP, Productivity]
    homepage: https://pypi.org/project/nano-pdf/
---

# nano-pdf

Edit PDFs using natural-language instructions. Point it at a page and describe what to change.

## Prerequisites

```bash
# Install with uv (recommended — already available in Hermes)
uv pip install nano-pdf

# Or with pip
pip install nano-pdf
```

## Usage

```bash
nano-pdf edit <file.pdf> <page_number> "<instruction>"
```

## Examples

```bash
# Change a title on page 1
nano-pdf edit deck.pdf 1 "Change the title to 'Q3 Results' and fix the typo in the subtitle"

# Update a date on a specific page
nano-pdf edit report.pdf 3 "Update the date from January to February 2026"

# Fix content
nano-pdf edit contract.pdf 2 "Change the client name from 'Acme Corp' to 'Acme Industries'"
```

## Notes

- Page numbers may be 0-based or 1-based depending on version — if the edit hits the wrong page, retry with ±1
- Always verify the output PDF after editing (use `read_file` to check file size, or open it)
- The tool uses an LLM under the hood — requires an API key (check `nano-pdf --help` for config)
- Works well for text changes; complex layout modifications may need a different approach


---
## Component: codex-hermes-agent-main--skills--email--himalaya

---
name: himalaya
description: CLI to manage emails via IMAP/SMTP. Use himalaya to list, read, write, reply, forward, search, and organize emails from the terminal. Supports multiple accounts and message composition with MML (MIME Meta Language).
version: 1.0.0
author: community
license: MIT
metadata:
  hermes:
    tags: [Email, IMAP, SMTP, CLI, Communication]
    homepage: https://github.com/pimalaya/himalaya
prerequisites:
  commands: [himalaya]
---

# Himalaya Email CLI

Himalaya is a CLI email client that lets you manage emails from the terminal using IMAP, SMTP, Notmuch, or Sendmail backends.

## References

- `references/configuration.md` (config file setup + IMAP/SMTP authentication)
- `references/message-composition.md` (MML syntax for composing emails)

## Prerequisites

1. Himalaya CLI installed (`himalaya --version` to verify)
2. A configuration file at `~/.config/himalaya/config.toml`
3. IMAP/SMTP credentials configured (password stored securely)

### Installation

```bash
# Pre-built binary (Linux/macOS — recommended)
curl -sSL https://raw.githubusercontent.com/pimalaya/himalaya/master/install.sh | PREFIX=~/.local sh

# macOS via Homebrew
brew install himalaya

# Or via cargo (any platform with Rust)
cargo install himalaya --locked
```

## Configuration Setup

Run the interactive wizard to set up an account:

```bash
himalaya account configure
```

Or create `~/.config/himalaya/config.toml` manually:

```toml
[accounts.personal]
email = "you@example.com"
display-name = "Your Name"
default = true

backend.type = "imap"
backend.host = "imap.example.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "you@example.com"
backend.auth.type = "password"
backend.auth.cmd = "pass show email/imap"  # or use keyring

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.example.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "you@example.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.cmd = "pass show email/smtp"
```

## Hermes Integration Notes

- **Reading, listing, searching, moving, deleting** all work directly through the terminal tool
- **Composing/replying/forwarding** — piped input (`cat << EOF | himalaya template send`) is recommended for reliability. Interactive `$EDITOR` mode works with `pty=true` + background + process tool, but requires knowing the editor and its commands
- Use `--output json` for structured output that's easier to parse programmatically
- The `himalaya account configure` wizard requires interactive input — use PTY mode: `terminal(command="himalaya account configure", pty=true)`

## Common Operations

### List Folders

```bash
himalaya folder list
```

### List Emails

List emails in INBOX (default):

```bash
himalaya envelope list
```

List emails in a specific folder:

```bash
himalaya envelope list --folder "Sent"
```

List with pagination:

```bash
himalaya envelope list --page 1 --page-size 20
```

### Search Emails

```bash
himalaya envelope list from john@example.com subject meeting
```

### Read an Email

Read email by ID (shows plain text):

```bash
himalaya message read 42
```

Export raw MIME:

```bash
himalaya message export 42 --full
```

### Reply to an Email

To reply non-interactively from Hermes, read the original message, compose a reply, and pipe it:

```bash
# Get the reply template, edit it, and send
himalaya template reply 42 | sed 's/^$/\nYour reply text here\n/' | himalaya template send
```

Or build the reply manually:

```bash
cat << 'EOF' | himalaya template send
From: you@example.com
To: sender@example.com
Subject: Re: Original Subject
In-Reply-To: <original-message-id>

Your reply here.
EOF
```

Reply-all (interactive — needs $EDITOR, use template approach above instead):

```bash
himalaya message reply 42 --all
```

### Forward an Email

```bash
# Get forward template and pipe with modifications
himalaya template forward 42 | sed 's/^To:.*/To: newrecipient@example.com/' | himalaya template send
```

### Write a New Email

**Non-interactive (use this from Hermes)** — pipe the message via stdin:

```bash
cat << 'EOF' | himalaya template send
From: you@example.com
To: recipient@example.com
Subject: Test Message

Hello from Himalaya!
EOF
```

Or with headers flag:

```bash
himalaya message write -H "To:recipient@example.com" -H "Subject:Test" "Message body here"
```

Note: `himalaya message write` without piped input opens `$EDITOR`. This works with `pty=true` + background mode, but piping is simpler and more reliable.

### Move/Copy Emails

Move to folder:

```bash
himalaya message move 42 "Archive"
```

Copy to folder:

```bash
himalaya message copy 42 "Important"
```

### Delete an Email

```bash
himalaya message delete 42
```

### Manage Flags

Add flag:

```bash
himalaya flag add 42 --flag seen
```

Remove flag:

```bash
himalaya flag remove 42 --flag seen
```

## Multiple Accounts

List accounts:

```bash
himalaya account list
```

Use a specific account:

```bash
himalaya --account work envelope list
```

## Attachments

Save attachments from a message:

```bash
himalaya attachment download 42
```

Save to specific directory:

```bash
himalaya attachment download 42 --dir ~/Downloads
```

## Output Formats

Most commands support `--output` for structured output:

```bash
himalaya envelope list --output json
himalaya envelope list --output plain
```

## Debugging

Enable debug logging:

```bash
RUST_LOG=debug himalaya envelope list
```

Full trace with backtrace:

```bash
RUST_LOG=trace RUST_BACKTRACE=1 himalaya envelope list
```

## Tips

- Use `himalaya --help` or `himalaya <command> --help` for detailed usage.
- Message IDs are relative to the current folder; re-list after folder changes.
- For composing rich emails with attachments, use MML syntax (see `references/message-composition.md`).
- Store passwords securely using `pass`, system keyring, or a command that outputs the password.


---
## Component: codex-hermes-agent-main--optional-skills--productivity--telephony

---
name: telephony
description: Give Hermes phone capabilities without core tool changes. Provision and persist a Twilio number, send and receive SMS/MMS, make direct calls, and place AI-driven outbound calls through Bland.ai or Vapi.
version: 1.0.0
author: Nous Research
license: MIT
metadata:
  hermes:
    tags: [telephony, phone, sms, mms, voice, twilio, bland.ai, vapi, calling, texting]
    related_skills: [find-nearby, google-workspace, agentmail]
    category: productivity
---

# Telephony — Numbers, Calls, and Texts without Core Tool Changes

This optional skill gives Hermes practical phone capabilities while keeping telephony out of the core tool list.

It ships with a helper script, `scripts/telephony.py`, that can:
- save provider credentials into `~/.hermes/.env`
- search for and buy a Twilio phone number
- remember that owned number for later sessions
- send SMS / MMS from the owned number
- poll inbound SMS for that number with no webhook server required
- make direct Twilio calls using TwiML `<Say>` or `<Play>`
- import the owned Twilio number into Vapi
- place outbound AI calls through Bland.ai or Vapi

## What this solves

This skill is meant to cover the practical phone tasks users actually want:
- outbound calls
- texting
- owning a reusable agent number
- checking messages that arrive to that number later
- preserving that number and related IDs between sessions
- future-friendly telephony identity for inbound SMS polling and other automations

It does **not** turn Hermes into a real-time inbound phone gateway. Inbound SMS is handled by polling the Twilio REST API. That is enough for many workflows, including notifications and some one-time-code retrieval, without adding core webhook infrastructure.

## Safety rules — mandatory

1. Always confirm before placing a call or sending a text.
2. Never dial emergency numbers.
3. Never use telephony for harassment, spam, impersonation, or anything illegal.
4. Treat third-party phone numbers as sensitive operational data:
   - do not save them to Hermes memory
   - do not include them in skill docs, summaries, or follow-up notes unless the user explicitly wants that
5. It is fine to persist the **agent-owned Twilio number** because that is part of the user's configuration.
6. VoIP numbers are **not guaranteed** to work for all third-party 2FA flows. Use with caution and set user expectations clearly.

## Decision tree — which service to use?

Use this logic instead of hardcoded provider routing:

### 1) "I want Hermes to own a real phone number"
Use **Twilio**.

Why:
- easiest path to buying and keeping a number
- best SMS / MMS support
- simplest inbound SMS polling story
- cleanest future path to inbound webhooks or call handling

Use cases:
- receive texts later
- send deployment alerts / cron notifications
- maintain a reusable phone identity for the agent
- experiment with phone-based auth flows later

### 2) "I only need the easiest outbound AI phone call right now"
Use **Bland.ai**.

Why:
- quickest setup
- one API key
- no need to first buy/import a number yourself

Tradeoff:
- less flexible
- voice quality is decent, but not the best

### 3) "I want the best conversational AI voice quality"
Use **Twilio + Vapi**.

Why:
- Twilio gives you the owned number
- Vapi gives you better conversational AI call quality and more voice/model flexibility

Recommended flow:
1. Buy/save a Twilio number
2. Import it into Vapi
3. Save the returned `VAPI_PHONE_NUMBER_ID`
4. Use `ai-call --provider vapi`

### 4) "I want to call with a custom prerecorded voice message"
Use **Twilio direct call** with a public audio URL.

Why:
- easiest way to play a custom MP3
- pairs well with Hermes `text_to_speech` plus a public file host or tunnel

## Files and persistent state

The skill persists telephony state in two places:

### `~/.hermes/.env`
Used for long-lived provider credentials and owned-number IDs, for example:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_PHONE_NUMBER_SID`
- `BLAND_API_KEY`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `PHONE_PROVIDER` (AI call provider: bland or vapi)

### `~/.hermes/telephony_state.json`
Used for skill-only state that should survive across sessions, for example:
- remembered default Twilio number / SID
- remembered Vapi phone number ID
- last inbound message SID/date for inbox polling checkpoints

This means:
- the next time the skill is loaded, `diagnose` can tell you what number is already configured
- `twilio-inbox --since-last --mark-seen` can continue from the previous checkpoint

## Locate the helper script

After installing this skill, locate the script like this:

```bash
SCRIPT="$(find ~/.hermes/skills -path '*/telephony/scripts/telephony.py' -print -quit)"
```

If `SCRIPT` is empty, the skill is not installed yet.

## Install

This is an official optional skill, so install it from the Skills Hub:

```bash
hermes skills search telephony
hermes skills install official/productivity/telephony
```

## Provider setup

### Twilio — owned number, SMS/MMS, direct calls, inbound SMS polling

Sign up at:
- https://www.twilio.com/try-twilio

Then save credentials into Hermes:

```bash
python3 "$SCRIPT" save-twilio ACXXXXXXXXXXXXXXXXXXXXXXXXXXXX your_auth_token_here
```

Search for available numbers:

```bash
python3 "$SCRIPT" twilio-search --country US --area-code 702 --limit 5
```

Buy and remember a number:

```bash
python3 "$SCRIPT" twilio-buy "+17025551234" --save-env
```

List owned numbers:

```bash
python3 "$SCRIPT" twilio-owned
```

Set one of them as the default later:

```bash
python3 "$SCRIPT" twilio-set-default "+17025551234" --save-env
# or
python3 "$SCRIPT" twilio-set-default PNXXXXXXXXXXXXXXXXXXXXXXXXXXXX --save-env
```

### Bland.ai — easiest outbound AI calling

Sign up at:
- https://app.bland.ai

Save config:

```bash
python3 "$SCRIPT" save-bland your_bland_api_key --voice mason
```

### Vapi — better conversational voice quality

Sign up at:
- https://dashboard.vapi.ai

Save the API key first:

```bash
python3 "$SCRIPT" save-vapi your_vapi_api_key
```

Import your owned Twilio number into Vapi and persist the returned phone number ID:

```bash
python3 "$SCRIPT" vapi-import-twilio --save-env
```

If you already know the Vapi phone number ID, save it directly:

```bash
python3 "$SCRIPT" save-vapi your_vapi_api_key --phone-number-id vapi_phone_number_id_here
```

## Diagnose current state

At any time, inspect what the skill already knows:

```bash
python3 "$SCRIPT" diagnose
```

Use this first when resuming work in a later session.

## Common workflows

### A. Buy an agent number and keep using it later

1. Save Twilio credentials:
```bash
python3 "$SCRIPT" save-twilio AC... auth_token_here
```

2. Search for a number:
```bash
python3 "$SCRIPT" twilio-search --country US --area-code 702 --limit 10
```

3. Buy it and save it into `~/.hermes/.env` + state:
```bash
python3 "$SCRIPT" twilio-buy "+17025551234" --save-env
```

4. Next session, run:
```bash
python3 "$SCRIPT" diagnose
```
This shows the remembered default number and inbox checkpoint state.

### B. Send a text from the agent number

```bash
python3 "$SCRIPT" twilio-send-sms "+15551230000" "Your deployment completed successfully."
```

With media:

```bash
python3 "$SCRIPT" twilio-send-sms "+15551230000" "Here is the chart." --media-url "https://example.com/chart.png"
```

### C. Check inbound texts later with no webhook server

Poll the inbox for the default Twilio number:

```bash
python3 "$SCRIPT" twilio-inbox --limit 20
```

Only show messages that arrived after the last checkpoint, and advance the checkpoint when you're done reading:

```bash
python3 "$SCRIPT" twilio-inbox --since-last --mark-seen
```

This is the main answer to “how do I access messages the number receives next time the skill is loaded?”

### D. Make a direct Twilio call with built-in TTS

```bash
python3 "$SCRIPT" twilio-call "+15551230000" --message "Hello! This is Hermes calling with your status update." --voice Polly.Joanna
```

### E. Call with a prerecorded / custom voice message

This is the main path for reusing Hermes's existing `text_to_speech` support.

Use this when:
- you want the call to use Hermes's configured TTS voice rather than Twilio `<Say>`
- you want a one-way voice delivery (briefing, alert, joke, reminder, status update)
- you do **not** need a live conversational phone call

Generate or host audio separately, then:

```bash
python3 "$SCRIPT" twilio-call "+155****0000" --audio-url "https://example.com/briefing.mp3"
```

Recommended Hermes TTS -> Twilio Play workflow:

1. Generate the audio with Hermes `text_to_speech`.
2. Make the resulting MP3 publicly reachable.
3. Place the Twilio call with `--audio-url`.

Example agent flow:
- Ask Hermes to create the message audio with `text_to_speech`
- If needed, expose the file with a temporary static host / tunnel / object storage URL
- Use `twilio-call --audio-url ...` to deliver it by phone

Good hosting options for the MP3:
- a temporary public object/storage URL
- a short-lived tunnel to a local static file server
- any existing HTTPS URL the phone provider can fetch directly

Important note:
- Hermes TTS is great for prerecorded outbound messages
- Bland/Vapi are better for **live conversational AI calls** because they handle the real-time telephony audio stack themselves
- Hermes STT/TTS alone is not being used here as a full duplex phone conversation engine; that would require a much heavier streaming/webhook integration than this skill is trying to introduce

### F. Navigate a phone tree / IVR with Twilio direct calling

If you need to press digits after the call connects, use `--send-digits`.
Twilio interprets `w` as a short wait.

```bash
python3 "$SCRIPT" twilio-call "+18005551234" --message "Connecting to billing now." --send-digits "ww1w2w3"
```

This is useful for reaching a specific menu branch before handing off to a human or delivering a short status message.

### G. Outbound AI phone call with Bland.ai

```bash
python3 "$SCRIPT" ai-call "+15551230000" "Call the dental office, ask for a cleaning appointment on Tuesday afternoon, and if they do not have Tuesday availability, ask for Wednesday or Thursday instead." --provider bland --voice mason --max-duration 3
```

Check status:

```bash
python3 "$SCRIPT" ai-status <call_id> --provider bland
```

Ask Bland analysis questions after completion:

```bash
python3 "$SCRIPT" ai-status <call_id> --provider bland --analyze "Was the appointment confirmed?,What date and time?,Any special instructions?"
```

### H. Outbound AI phone call with Vapi on your owned number

1. Import your Twilio number into Vapi:
```bash
python3 "$SCRIPT" vapi-import-twilio --save-env
```

2. Place the call:
```bash
python3 "$SCRIPT" ai-call "+15551230000" "You are calling to make a dinner reservation for two at 7:30 PM. If that is unavailable, ask for the nearest time between 6:30 and 8:30 PM." --provider vapi --max-duration 4
```

3. Check result:
```bash
python3 "$SCRIPT" ai-status <call_id> --provider vapi
```

## Suggested agent procedure

When the user asks for a call or text:

1. Determine which path fits the request via the decision tree.
2. Run `diagnose` if configuration state is unclear.
3. Gather the full task details.
4. Confirm with the user before dialing or texting.
5. Use the correct command.
6. Poll for results if needed.
7. Summarize the outcome without persisting third-party numbers to Hermes memory.

## What this skill still does not do

- real-time inbound call answering
- webhook-based live SMS push into the agent loop
- guaranteed support for arbitrary third-party 2FA providers

Those would require more infrastructure than a pure optional skill.

## Pitfalls

- Twilio trial accounts and regional rules can restrict who you can call/text.
- Some services reject VoIP numbers for 2FA.
- `twilio-inbox` polls the REST API; it is not instant push delivery.
- Vapi outbound calling still depends on having a valid imported number.
- Bland is easiest, but not always the best-sounding.
- Do not store arbitrary third-party phone numbers in Hermes memory.

## Verification checklist

After setup, you should be able to do all of the following with just this skill:

1. `diagnose` shows provider readiness and remembered state
2. search and buy a Twilio number
3. persist that number to `~/.hermes/.env`
4. send an SMS from the owned number
5. poll inbound texts for the owned number later
6. place a direct Twilio call
7. place an AI call via Bland or Vapi

## References

- Twilio phone numbers: https://www.twilio.com/docs/phone-numbers/api
- Twilio messaging: https://www.twilio.com/docs/messaging/api/message-resource
- Twilio voice: https://www.twilio.com/docs/voice/api/call-resource
- Vapi docs: https://docs.vapi.ai/
- Bland.ai: https://app.bland.ai/


---
## Component: codex-hermes-agent-main--skills--productivity--linear

---
name: linear
description: Manage Linear issues, projects, and teams via the GraphQL API. Create, update, search, and organize issues. Uses API key auth (no OAuth needed). All operations via curl — no dependencies.
version: 1.0.0
author: Hermes Agent
license: MIT
prerequisites:
  env_vars: [LINEAR_API_KEY]
  commands: [curl]
metadata:
  hermes:
    tags: [Linear, Project Management, Issues, GraphQL, API, Productivity]
---

# Linear — Issue & Project Management

Manage Linear issues, projects, and teams directly via the GraphQL API using `curl`. No MCP server, no OAuth flow, no extra dependencies.

## Setup

1. Get a personal API key from **Linear Settings > API > Personal API keys**
2. Set `LINEAR_API_KEY` in your environment (via `hermes setup` or your env config)

## API Basics

- **Endpoint:** `https://api.linear.app/graphql` (POST)
- **Auth header:** `Authorization: $LINEAR_API_KEY` (no "Bearer" prefix for API keys)
- **All requests are POST** with `Content-Type: application/json`
- **Both UUIDs and short identifiers** (e.g., `ENG-123`) work for `issue(id:)`

Base curl pattern:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name } }"}' | python3 -m json.tool
```

## Workflow States

Linear uses `WorkflowState` objects with a `type` field. **6 state types:**

| Type | Description |
|------|-------------|
| `triage` | Incoming issues needing review |
| `backlog` | Acknowledged but not yet planned |
| `unstarted` | Planned/ready but not started |
| `started` | Actively being worked on |
| `completed` | Done |
| `canceled` | Won't do |

Each team has its own named states (e.g., "In Progress" is type `started`). To change an issue's status, you need the `stateId` (UUID) of the target state — query workflow states first.

**Priority values:** 0 = None, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low

## Common Queries

### Get current user
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name email } }"}' | python3 -m json.tool
```

### List teams
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ teams { nodes { id name key } } }"}' | python3 -m json.tool
```

### List workflow states for a team
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ workflowStates(filter: { team: { key: { eq: \"ENG\" } } }) { nodes { id name type } } }"}' | python3 -m json.tool
```

### List issues (first 20)
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(first: 20) { nodes { identifier title priority state { name type } assignee { name } team { key } url } pageInfo { hasNextPage endCursor } } }"}' | python3 -m json.tool
```

### List my assigned issues
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { assignedIssues(first: 25) { nodes { identifier title state { name type } priority url } } } }"}' | python3 -m json.tool
```

### Get a single issue (by identifier like ENG-123)
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issue(id: \"ENG-123\") { id identifier title description priority state { id name type } assignee { id name } team { key } project { name } labels { nodes { name } } comments { nodes { body user { name } createdAt } } url } }"}' | python3 -m json.tool
```

### Search issues by text
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issueSearch(query: \"bug login\", first: 10) { nodes { identifier title state { name } assignee { name } url } } }"}' | python3 -m json.tool
```

### Filter issues by state type
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(filter: { state: { type: { in: [\"started\"] } } }, first: 20) { nodes { identifier title state { name } assignee { name } } } }"}' | python3 -m json.tool
```

### Filter by team and assignee
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(filter: { team: { key: { eq: \"ENG\" } }, assignee: { email: { eq: \"user@example.com\" } } }, first: 20) { nodes { identifier title state { name } priority } } }"}' | python3 -m json.tool
```

### List projects
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ projects(first: 20) { nodes { id name description progress lead { name } teams { nodes { key } } url } } }"}' | python3 -m json.tool
```

### List team members
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { nodes { id name email active } } }"}' | python3 -m json.tool
```

### List labels
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issueLabels { nodes { id name color } } }"}' | python3 -m json.tool
```

## Common Mutations

### Create an issue
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }",
    "variables": {
      "input": {
        "teamId": "TEAM_UUID",
        "title": "Fix login bug",
        "description": "Users cannot login with SSO",
        "priority": 2
      }
    }
  }' | python3 -m json.tool
```

### Update issue status
First get the target state UUID from the workflow states query above, then:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueUpdate(id: \"ENG-123\", input: { stateId: \"STATE_UUID\" }) { success issue { identifier state { name type } } } }"}' | python3 -m json.tool
```

### Assign an issue
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueUpdate(id: \"ENG-123\", input: { assigneeId: \"USER_UUID\" }) { success issue { identifier assignee { name } } } }"}' | python3 -m json.tool
```

### Set priority
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueUpdate(id: \"ENG-123\", input: { priority: 1 }) { success issue { identifier priority } } }"}' | python3 -m json.tool
```

### Add a comment
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { commentCreate(input: { issueId: \"ISSUE_UUID\", body: \"Investigated. Root cause is X.\" }) { success comment { id body } } }"}' | python3 -m json.tool
```

### Set due date
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueUpdate(id: \"ENG-123\", input: { dueDate: \"2026-04-01\" }) { success issue { identifier dueDate } } }"}' | python3 -m json.tool
```

### Add labels to an issue
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueUpdate(id: \"ENG-123\", input: { labelIds: [\"LABEL_UUID_1\", \"LABEL_UUID_2\"] }) { success issue { identifier labels { nodes { name } } } } }"}' | python3 -m json.tool
```

### Add issue to a project
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueUpdate(id: \"ENG-123\", input: { projectId: \"PROJECT_UUID\" }) { success issue { identifier project { name } } } }"}' | python3 -m json.tool
```

### Create a project
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }",
    "variables": {
      "input": {
        "name": "Q2 Auth Overhaul",
        "description": "Replace legacy auth with OAuth2 and PKCE",
        "teamIds": ["TEAM_UUID"]
      }
    }
  }' | python3 -m json.tool
```

## Pagination

Linear uses Relay-style cursor pagination:

```bash
# First page
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(first: 20) { nodes { identifier title } pageInfo { hasNextPage endCursor } } }"}' | python3 -m json.tool

# Next page — use endCursor from previous response
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(first: 20, after: \"CURSOR_FROM_PREVIOUS\") { nodes { identifier title } pageInfo { hasNextPage endCursor } } }"}' | python3 -m json.tool
```

Default page size: 50. Max: 250. Always use `first: N` to limit results.

## Filtering Reference

Comparators: `eq`, `neq`, `in`, `nin`, `lt`, `lte`, `gt`, `gte`, `contains`, `startsWith`, `containsIgnoreCase`

Combine filters with `or: [...]` for OR logic (default is AND within a filter object).

## Typical Workflow

1. **Query teams** to get team IDs and keys
2. **Query workflow states** for target team to get state UUIDs
3. **List or search issues** to find what needs work
4. **Create issues** with team ID, title, description, priority
5. **Update status** by setting `stateId` to the target workflow state
6. **Add comments** to track progress
7. **Mark complete** by setting `stateId` to the team's "completed" type state

## Rate Limits

- 5,000 requests/hour per API key
- 3,000,000 complexity points/hour
- Use `first: N` to limit results and reduce complexity cost
- Monitor `X-RateLimit-Requests-Remaining` response header

## Important Notes

- Always use `terminal` tool with `curl` for API calls — do NOT use `web_extract` or `browser`
- Always check the `errors` array in GraphQL responses — HTTP 200 can still contain errors
- If `stateId` is omitted when creating issues, Linear defaults to the first backlog state
- The `description` field supports Markdown
- Use `python3 -m json.tool` or `jq` to format JSON responses for readability


---
