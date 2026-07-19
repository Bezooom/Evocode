---
name: ml-intern
description: Use ML Intern to autonomously research, write, and ship ML code using the Hugging Face ecosystem. Best for fine-tuning, model training, dataset work, and ML research. Use when user wants an ML intern, mentions fine-tuning, or needs deep ML code generation.
---

# ML Intern

Autonomous ML intern that researches, writes, and ships ML code using the Hugging Face ecosystem.

## Setup

1. **Install:**
   ```bash
   git clone git@github.com:huggingface/ml-intern.git
   cd ml-intern
   uv sync
   uv tool install -e .
   ```

2. **Configure** — Create `.env` with:
   ```bash
   ANTHROPIC_API_KEY=<key>
   OPENAI_API_KEY=<key>
   HF_TOKEN=<token>
   GITHUB_TOKEN=<token>
   ```

## Usage

### Interactive Mode (chat session)
```bash
ml-intern
```

### Headless Mode (single prompt)
```bash
ml-intern "fine-tune llama on my dataset"
```

### Options
```bash
ml-intern --model anthropic/claude-opus-4-6 "prompt"
ml-intern --model openai/gpt-5.5 "prompt"
ml-intern --max-iterations 100 "prompt"
ml-intern --no-stream "prompt"
```

## Capabilities

- **Deep docs access** — HF documentation, papers, datasets
- **Code search** — GitHub search for HF ecosystem
- **Cloud compute** — Sandbox execution
- **Agentic loop** — Up to 300 iterations with tool use
- **Doom loop detection** — Prevents repeated tool patterns
- **Context management** — Auto-compaction at 170k tokens
- **Session upload** — Saves sessions to HF

## Tools Used

- HF docs & research
- HF repos, datasets, jobs, papers
- GitHub code search
- Sandbox & local tools
- Planning tools
- MCP server tools

## Workflow

1. **Receive** user input
2. **Route** to appropriate handler
3. **Agentic loop:**
   - LLM call with tool specs
   - Parse tool calls
   - Check approval (jobs, sandbox, destructive ops)
   - Execute via ToolRouter
   - Add results to context
   - Repeat
4. **Return** result

## When to Use

- Fine-tuning models
- Training new models
- Dataset preparation & analysis
- Model evaluation
- HF ecosystem exploration
- ML paper implementation
- Custom ML pipelines

## When NOT to Use

- Simple ML tasks that don't need HF ecosystem
- Tasks better handled by other tools (e.g., general code generation)
- Tasks requiring specific cloud providers (AWS, GCP, Azure)
