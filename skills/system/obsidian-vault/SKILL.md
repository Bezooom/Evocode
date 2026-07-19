---
name: obsidian-vault
description: Search, create, and manage notes in the Obsidian vault with wikilinks and index notes. Use when user wants to find, create, or organize notes in Obsidian. Also supports obsidian-llm-wiki (olw) pipeline — generating and managing wiki articles from raw notes using a local LLM.
---

# Obsidian Vault

## Vault location

`/mnt/d/Obsidian Vault/AI Research/`

Mostly flat at root level.

## Naming conventions

- **Index notes**: aggregate related topics (e.g., `Ralph Wiggum Index.md`, `Skills Index.md`)
- **Title case** for all note names
- No folders for organization — use links and index notes instead

## Linking

- Use Obsidian `[[wikilinks]]` syntax: `[[Note Title]]`
- Notes link to dependencies/related notes at the bottom
- Index notes are just lists of `[[wikilinks]]`

## Workflows

### Search for notes

```bash
# Search by filename
find "/mnt/d/Obsidian Vault/AI Research/" -name "*.md" | grep -i "keyword"

# Search by content
grep -rl "keyword" "/mnt/d/Obsidian Vault/AI Research/" --include="*.md"
```

### Create a new note

1. Use **Title Case** for filename
2. Write content as a unit of learning
3. Add `[[wikilinks]]` to related notes at the bottom
4. If part of a numbered sequence, use the hierarchical numbering scheme

### Find related notes

Search for `[[Note Title]]` across the vault:

```bash
grep -rl "\\[\\[Note Title\\]\\]" "/mnt/d/Obsidian Vault/AI Research/"
```

### Find index notes

```bash
find "/mnt/d/Obsidian Vault/AI Research/" -name "*Index*"
```

---

## obsidian-llm-wiki (olw) — LLM Wiki Pipeline

Project: https://github.com/kytmanov/obsidian-llm-wiki-local

**Turn raw notes into a self-improving, interlinked wiki powered by a local LLM.**

### Architecture

Three-stage pipeline: `raw/*.md` → **ingest** (fast model → AnalysisResult) → **compile** (heavy model → SingleArticle drafts) → **approve** (publish to `wiki/`)

```
raw/note.md
    │
    ▼ olw ingest  (or olw run)
    Fast LLM (3B–8B) — analysis, concept extraction
    • Reads note
    • Extracts concept names
    • Preserves explicitly evidenced named references as knowledge item candidates
    • Writes quality score + summary to state.db
    • Creates wiki/sources/Note.md (source summary page)
    │
    ▼ olw compile
    Heavy LLM (7B–14B)
    • For each concept: gathers all source notes that mention it
    • Injects rejection feedback from previous reviews into the prompt
    • Writes a wiki article with [[wikilinks]] to related concepts
    • Adds quality annotations if confidence is low or sources are sparse
    • Lands in wiki/.drafts/ for review
    │
    ▼ olw review  (or olw approve)
    • Interactive numbered menu — approve / reject / diff / edit
    • Rejection feedback stored and injected into next compile
    • On approve: annotations stripped, article published to wiki/
    • Updates wiki/index.md (navigation layer)
    • Git commits the change
```

**No vector databases, no embeddings.** `wiki/index.md` acts as the routing layer for `olw query`.

### LLM Provider

Uses **llama.cpp** (`llama-server`) instead of Ollama:

```bash
# Server config
LLAMA_BIN="/home/bezoom/buun-llama-cpp/build/bin/llama-server"
MODELS_DIR="/home/bezoom/llama.cpp/models"
MODEL_FILE="Qwopus3.6-35B-A3B-v1-Q4_K_M.gguf"

# Model settings
--alias qwen36
-ngl 99
--ctx-size 262144
--cache-type-k turbo4
--cache-type-v turbo4
-fa on
--parallel 1
--port 8080
--host 0.0.0.0
-t 8
--batch-size 2048
--ubatch-size 256
--n-predict 16384
--timeout 600
--no-warmup

# PID file
PID_FILE="/home/bezoom/.llama_pid"
```

API endpoint: `http://localhost:8080/v1`

### Vault structure

```
my-wiki/
├── raw/                        ← YOUR NOTES (never modified by olw)
│   ├── quantum-computing.md
│   └── ml-fundamentals.md
├── wiki/
│   ├── Quantum Computing.md    ← concept articles (flat, one per concept)
│   ├── Machine Learning.md
│   ├── sources/                ← auto-generated source summaries
│   ├── queries/                ← saved Q&A answers (olw query --save)
│   ├── synthesis/              ← saved synthesis articles (olw query --synthesize)
│   ├── .drafts/                ← pending human review
│   ├── index.md                ← auto-generated navigation + routing layer
│   └── log.md                  ← append-only operation history
├── vault-schema.md             ← LLM context: conventions for this vault
├── wiki.toml                   ← configuration
└── .olw/
    ├── compare/                ← compare reports + optional preview vault artifacts
    ├── state.db                ← SQLite: notes, concepts, articles, items, rejections, stubs
    └── pipeline.lock           ← advisory lock
```

### Key commands

| Command | Description |
|---------|-------------|
| `olw setup` | Interactive setup wizard: pick provider, models, vault |
| `olw init PATH` | Create vault structure and git repo |
| `olw init PATH --existing` | Adopt an existing Obsidian vault |
| `olw doctor` | Check provider connectivity, models, vault structure |
| `olw run` | Full pipeline: ingest → compile → lint → [approve] |
| `olw run --auto-approve` | Full pipeline, publish without review |
| `olw ingest --all` | Analyze all raw notes |
| `olw ingest FILE` | Analyze one note |
| `olw compile` | Generate wiki articles → `.drafts/` |
| `olw compile --retry-failed` | Retry previously failed notes |
| `olw review` | Interactive draft review (approve / reject / diff) |
| `olw approve --all` | Publish all drafts without review |
| `olw approve FILE` | Publish one draft |
| `olw reject FILE` | Discard a draft (prompts for feedback) |
| `olw reject FILE --feedback "..."` | Discard with feedback for next compile |
| `olw reject --all` | Discard all drafts (prompts once for shared feedback) |
| `olw unblock "Concept"` | Re-enable a concept blocked after 5 rejections |
| `olw status` | Show pipeline state and pending drafts |
| `olw status --failed` | List failed notes with error messages |
| `olw query "question"` | Answer from your wiki |
| `olw query "..." --save` | Answer and save to `wiki/queries/` |
| `olw query "..." --synthesize` | Answer and save a synthesis article to `wiki/synthesis/` |
| `olw lint` | Health check: orphans, broken links, stale articles |
| `olw maintain --fix` | Repair broken alias links, create stubs, normalize alias wikilinks |
| `olw maintain --dry-run` | Report issues without making changes |
| `olw items audit` | Show preserved non-concept knowledge item candidates |
| `olw watch` | File watcher — auto-pipeline on new notes |
| `olw undo` | Revert last `[olw]` git commit |
| `olw clean` | Clear state DB + wiki/, keep raw/ notes |

All commands accept `--vault PATH` or the env var `OLW_VAULT`.

### Configuration (`wiki.toml`)

```toml
[models]
fast  = "qwen36"      # extraction, analysis, query routing
heavy = "qwen36"      # article generation, Q&A answers

# ── llama.cpp (llama-server) ─────────────────────────────────────────────────
[llama_cpp]
url = "http://localhost:8080/v1"
timeout = 600
fast_ctx = 262144     # context window for fast model (tokens)
heavy_ctx = 262144    # context window for heavy model (tokens)

[pipeline]
auto_approve = false
auto_commit = true
auto_maintain = false
max_concepts_per_source = 8
watch_debounce = 3.0
# language = "en"     # ISO 639-1 output language; autodetects from notes if unset
# inline_source_citations = false
```

### Provider-flexible

Supports Ollama, LM Studio, vLLM, llama.cpp, and cloud providers (Groq, Together AI, etc.). For llama.cpp specifically, configure the `[llama_cpp]` section in `wiki.toml`.

### Key concepts

- **Ingest** — fast model analyzes raw notes, extracts concepts, creates source summary pages
- **Compile** — heavy model writes wiki articles per concept, lands in `.drafts/`
- **Review** — approve or reject drafts with feedback
- **Reject feedback loop** — rejected drafts store feedback; next compile includes it in the prompt
- **Auto-block** — after 5 rejections without approval, concept is auto-blocked until manually unblocked
- **Manual-edit protection** — hand-edited articles are detected via SHA256 content hash and won't be overwritten
- **Knowledge item candidates** — LLM-proposed named references kept in ledger when evidence is weak
- **Compare** — `olw compare --heavy-model MODEL` previews a model switch in isolated vaults
- **Query synthesis** — `olw query "..." --synthesize` saves reusable Q&A articles with source citations

### Model recommendations

| Role | llama.cpp | Cloud |
|------|-----------|-------|
| Fast (analysis + routing) | `qwen36`, `llama3.2:3b` | `llama-3.1-8b-instant` (Groq), `mistral-7b` |
| Heavy (article writing) | `qwen36`, `qwen2.5:14b` | `llama-3.3-70b` (Groq), `mistral-large` |
| Single model (everything) | `qwen36`, `llama3.1:8b` | any 7B+ |

### Obsidian tips

- **Graph view** — concept pages link to source pages and each other via `[[wikilinks]]`
- **Draft review** — drafts live in `wiki/.drafts/` and may not appear in Obsidian's default graph filters
- **Dataview** — query by `status: published`, `confidence: > 0.7`, `tags: [physics]`, etc.
- **Backlinks** — every concept page shows which source pages mention it
- **Source citations** — when inline citations are enabled, `[S1](#Sources)` links to source pages
