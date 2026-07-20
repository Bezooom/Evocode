---
name: ai-ml-engineering
domain: general
pack: general
tier: optional
triggers:
  - эмбеддинги и векторный поиск
  - fine-tune / дообучение llm
  - inference optimization
  - оптимизация inference
  - ai ml engineering
  - vllm / llama.cpp
  - обучить модель
  - pytorch fsdp
  - rag-пайплайн
  - fine-tuning
  - lora / peft
  - ml training
  - mlops
  - rag
description: |
  [RU] Макро-навык для AI/ML-инженерии: MLOps, обучение моделей, fine-tuning, оптимизация inference, RAG-пайплайны, стратегии эмбеддингов, оценка моделей. Используй при запросах: "обучить модель", "fine-tune LLM", "собрать RAG", "ускорить inference", "LoRA/PEFT", "GRPO/RL-обучение", "vLLM/llama.cpp", "PyTorch FSDP", "векторный поиск". См. также: `ai-ml-platform` — для продакшн MLOps-оркестрации, serving и трекинга экспериментов.
  [EN] Macro-skill for AI/ML engineering: MLOps, training, fine-tuning, inference optimization, RAG pipelines, embedding strategies, model evaluation. Triggers: ML training, fine-tuning, inference.
metadata:
  category: ai-ml
  triggers:
    - Обучить модель
    - Fine-tune / дообучение LLM
    - RAG-пайплайн
    - Оптимизация inference
    - LoRA / PEFT
    - Эмбеддинги и векторный поиск
    - vLLM / llama.cpp
    - PyTorch FSDP
    - ML training
    - Fine-tuning
    - Inference optimization
    - RAG
    - MLOps
---

# MACRO-SKILL: AI-ML-ENGINEERING
This is a superset of the following micro-skills: codex-hermes-agent-main--optional-skills--mlops--flash-attention, codex-hermes-agent-main--skills--mlops--cloud--modal, codex-hermes-agent-main--skills--mlops--research--dspy, codex-agents-main--plugins--llm-application-dev--skills--prompt-engineering-patterns, codex-hermes-agent-main--optional-skills--mlops--torchtitan, codex-hermes-agent-main--skills--mlops--training--grpo-rl-training, codex-hermes-agent-main--skills--mlops--training--trl-fine-tuning, codex-hermes-agent-main--optional-skills--mlops--huggingface-tokenizers, codex-hermes-agent-main--optional-skills--mlops--faiss, codex-hermes-agent-main--optional-skills--mlops--accelerate, codex-hermes-agent-main--skills--mlops--inference--llama-cpp, codex-kilo--skills--ai-ml-platform, codex-agents-main--plugins--llm-application-dev--skills--rag-implementation, codex-hermes-agent-main--optional-skills--mlops--slime, codex-hermes-agent-main--skills--mlops--inference--vllm, codex-hermes-agent-main--skills--mlops--training--pytorch-fsdp, codex-agents-main--plugins--llm-application-dev--skills--vector-index-tuning, codex-agents-main--plugins--llm-application-dev--skills--similarity-search-patterns, codex-hermes-agent-main--optional-skills--mlops--hermes-atropos-environments, codex-hermes-agent-main--skills--mlops--inference--guidance, codex-hermes-agent-main--optional-skills--mlops--llava, codex-hermes-agent-main--skills--mlops--evaluation--weights-and-biases, codex-test-outputs--compiled-skills--ai-ml-platform, codex-hermes-agent-main--skills--mlops--training--peft, codex-hermes-agent-main--optional-skills--mlops--qdrant, codex-agents-main--plugins--llm-application-dev--skills--embedding-strategies, codex-hermes-agent-main--optional-skills--mlops--pytorch-lightning, codex-agents-main--plugins--machine-learning-ops--skills--ml-pipeline-workflow, codex-hermes-agent-main--skills--mlops--training--unsloth, codex-agents-main--plugins--llm-application-dev--skills--langchain-architecture, codex-hermes-agent-main--optional-skills--mlops--simpo, codex-hermes-agent-main--skills--mlops--models--audiocraft, codex-hermes-agent-main--skills--mlops--inference--gguf, codex-hermes-agent-main--skills--mlops--models--segment-anything, codex-hermes-agent-main--optional-skills--mlops--instructor, codex-agents-main--plugins--llm-application-dev--skills--llm-evaluation, codex-kilo--skills--mlops-platform, codex-hermes-agent-main--skills--mlops--models--clip, codex-hermes-agent-main--skills--mlops--training--axolotl, codex-hermes-agent-main--skills--research--llm-wiki, codex-contributed-skills--skills--mlops-platform, codex-contributed-skills--skills--rag-patterns, codex-hermes-agent-main--skills--mlops--huggingface-hub, codex-kilo--skills--rag-patterns, codex-hermes-agent-main--skills--mlops--inference--obliteratus, codex-hermes-agent-main--skills--mlops--models--whisper, codex-hermes-agent-main--skills--mlops--models--stable-diffusion, codex-hermes-agent-main--optional-skills--mlops--nemo-curator, codex-hermes-agent-main--optional-skills--mlops--pinecone, codex-hermes-agent-main--skills--mlops--inference--outlines, codex-hermes-agent-main--optional-skills--mlops--chroma, codex-hermes-agent-main--optional-skills--mlops--saelens, codex-hermes-agent-main--optional-skills--mlops--tensorrt-llm, codex-contributed-skills--skills--ai-ml-platform, codex-hermes-agent-main--optional-skills--mlops--lambda-labs, codex-hermes-agent-main--skills--mlops--evaluation--lm-evaluation-harness

## Component: open-mythos

---
name: recurrent-depth-transformer
description: >-
  OpenMythos - теоретическая реализация Recurrent-Depth Transformer (RDT) архитектуры, 
  используемой в Claude Mythos. Включает три стадии: Prelude, Recurrent Block и Coda.
  Поддерживает MoE, MLA/GQA attention, LoRA адаптацию. Triggers: RDT, looped transformer, 
  depth extrapolation, latent reasoning.
version: 1.0.0
author: Kye Gomez (реконструкция)
license: MIT
dependencies: [torch, numpy]
metadata:
  category: ml-architecture
  triggers:
    - RDT implementation
    - Looped Transformer
    - OpenMythos architecture
    - Claude Mythos reconstruction
    - Latent reasoning
    - Depth scaling
---

# OpenMythos: Recurrent-Depth Transformer

## Overview

OpenMythos — это open-source теоретическая реализация архитектуры Recurrent-Depth Transformer (RDT), которая, по мнению исследователей, лежит в основе Claude Mythos от Anthropic.

**Ключевые характеристики:**
- **Recurrent-Depth Transformer**: Трансформер с переиспользуемыми слоями, которые прогоняются через несколько итераций за один forward pass
- **Три стадии**: Prelude (стандартные слои) → Recurrent Block (замкнутый блок) → Coda (финальные слои)
- **Latent reasoning**: Рассуждения происходят в латентном пространстве, без промежуточного токенного вывода

## Архитектура RDT

```
Input
  ↓
[Prelude P]        — standard transformer layers, run once
  ↓
[Recurrent Block R] — looped T times
  ↑_______↓         (hidden state h updated each loop with input injection e)
  ↓
[Coda C]           — standard transformer layers, run once
  ↓
Output
```

**Правило обновления на каждом шаге:**
```
h_{t+1} = A·h_t + B·e + Transformer(h_t, e)
```

Где:
- `h_t` — скрытое состояние после итерации t
- `e` — закодированный вход (из Prelude), инжектируемый на каждом шаге
- `A` и `B` — обучаемые параметры инжекции

## Central Hypothesis

Claude Mythos предположительно является **Recurrent-Depth Transformer (RDT)** — также называемым Looped Transformer. Вместо стека сотен уникальных слоёв, подмножество слоёв переиспользуется и прогоняется несколько раз за один forward pass.

> **Важно**: Это не chain-of-thought. Рассуждения происходят **без промежуточного токенного вывода**, в непрерывном латентном пространстве.

## Почему это объясняет Mythos

### 1. Systematic Generalization

Vanilla трансформеры не могут комбинировать знания новыми способами. Looped трансформеры проходят этот тест через **three-stage grokking process**:
1. Memorization — модель подстраивается под распределение данных
2. In-distribution generalization — модель обрабатывает известные композиции
3. Systematic generalization — модель обрабатывает новые композиции OOD резко и внезапно

### 2. Depth Extrapolation

Обучай на 5-hop цепочк��х рассуждений, тестируй на 10-hop. Vanilla трансформер терпит неудачу. Looped трансформер успешен — запуском большего количества петель во время инференса.

### 3. Latent Thoughts как Implicit CoT

Каждая итерация цикла — функциональный эквивалент одного шага chain-of-thought, но в непрерывном латентном пространстве. Это позволяет кодировать **множество альтернативных следующих шагов одновременно**.

### 4. No Parameter Explosion

Модель с k слоями, запущенная L раз, достигает качества kL-слойной модели, но только с k слоями параметров.

## Stability Problem (and How It Was Likely Solved)

Обучение looped моделей нестабильно. Решение:

1. **Параметризуй A как непрерывную негативную диагональную матрицу**
2. **Дискретизируй через ZOH/Euler схемы**: `A_discrete = exp(Δt · A_continuous)`
3. **Примени негативность через**: `A := Diag(-exp(log_A))`
4. Это гарантирует `ρ(A) < 1` всегда

Это **Parcae architecture** — наиболее вероятный класс решений для стабилизации Mythos.

## Mixture of Experts

Предполагаемый дизайн: каждая FFN в Recurrent Block заменяется на fine-grained MoE:
- Множество маленьких экспертов (1/m нормального размера)
- Роутер выбирает top-mK экспертов
- Несколько **shared experts** активируются всегда

## Использование OpenMythos

```python
import torch
from open_mythos.main import OpenMythos, MythosConfig

attn_type = "mla"  # or "gqa"

base = {
    "vocab_size": 1000,
    "dim": 256,
    "n_heads": 8,
    "max_seq_len": 128,
    "max_loop_iters": 4,
    "prelude_layers": 1,
    "coda_layers": 1,
    "n_experts": 8,
    "n_shared_experts": 1,
    "n_experts_per_tok": 2,
    "expert_dim": 64,
    "lora_rank": 8,
    "attn_type": attn_type,
}

if attn_type == "gqa":
    cfg = MythosConfig(**base, n_kv_heads=2)
else:
    cfg = MythosConfig(
        **base,
        n_kv_heads=8,
        kv_lora_rank=32,
        q_lora_rank=64,
        qk_rope_head_dim=16,
        qk_nope_head_dim=16,
        v_head_dim=16,
    )

model = OpenMythos(cfg)
ids = torch.randint(0, cfg.vocab_size, (2, 16))
logits = model(ids, n_loops=4)
out = model.generate(ids, max_new_tokens=8, n_loops=8)
```

## Scaling Laws

Parcae устанавливает первые предсказуемые scaling laws для looped моделей:
- **Training**: Фиксированный FLOP бюджет — увеличение recurence и уменьшение token count даёт меньший loss
- **Inference**: Больше петель улучшает качество по предсказуемому экспоненциальному закону

При 770M параметров looped модель достигает качества 1.3B модели — примерно **половина параметров для того же качества**.

## Ключевые концепции для понимания RDT

| Property | Description |
|---|---|
| Architecture | Recurrent-Depth Transformer (Prelude + Looped Recurrent Block + Coda) |
| FFN layer | Suspected MoE — fine-grained experts + always-on shared experts |
| Reasoning mechanism | Implicit multi-hop via iterative latent updates |
| Inference-time scaling | More loops = deeper reasoning |
| Training stability | LTI-constrained injection parameters with spectral radius < 1 |
| Halting | Adaptive Computation Time (ACT) or learned convergence criterion |

## Ресурсы

- **OpenMythos GitHub**: https://github.com/kyegomez/OpenMythos
- **Paper**: "Loop, Think, & Generalize — Implicit Reasoning in Recurrent Depth Transformers"
- **Paper**: "Parcae — Scaling Laws for Stable Looped Language Models"
- **Paper**: "Reasoning with Latent Thoughts — On the Power of Looped Transformers"

---

# Flash Attention - Fast Memory-Efficient Attention

(существующий контент сохранён)