---
name: ai-ml-platform
description: |
  [RU] Комплексный навык ML/AI-платформенной инженерии: MLOps-оркестрация, трекинг экспериментов, model serving и RAG-архитектуры для продакшн AI-систем. Используй при запросах: "спроектировать ML-платформу", "развернуть LLM в production", "настроить трекинг экспериментов (MLflow/W&B)", "model serving", "продакшн RAG-архитектура", "MLOps-пайплайн". См. также: `ai-ml-engineering` — для соседних задач обучения моделей, fine-tuning и оптимизации inference.
  [EN] Comprehensive ML/AI platform engineering skill integrating MLOps orchestration, experiment tracking, model serving, and RAG architectures for production-grade AI systems. Triggers: ML system architecture design, experiment tracking, RAG pipeline, LLM deployment.
metadata:
  category: ai-ml
  triggers:
    - Архитектура ML-системы
    - MLOps-оркестрация
    - Трекинг экспериментов
    - Model serving
    - LLM в production
    - Продакшн RAG
    - ML system architecture
    - Experiment tracking
    - RAG pipeline
    - LLM deployment
    - Model serving
    - MLOps
---

# AI/ML Platform Skill (Consolidated)

## Overview
Comprehensive ML/AI platform engineering skill integrating MLOps orchestration, experiment tracking, model serving, and RAG architectures for production-grade AI systems.

## Triggers
- ML system architecture design
- Experiment tracking and model registry setup
- RAG pipeline implementation
- LLM deployment and serving
- Model retraining automation
- AI infrastructure scaling

## Available Components (Consolidated)

### 1. MLOps Platform (from mlops-platform)
- **Tools**: MLflow, Kubeflow, Ray Serve, Vertex AI, SageMaker
- **Patterns**: Training pipelines, model registries, serving infrastructure

### 2. MLflow Integration (from mlflow-integration)
- **Focus**: Experiment tracking, model versioning, automated retraining
- **Workflows**: Tracking → Registry → Serving → Monitoring

### 3. RAG Patterns (from rag-patterns)
- **Components**: Embedding, Vector Store, Retrieval, Re-ranking
- **Patterns**: Multi-query RAG, Query Transformation, GraphRAG, Agentic RAG

### 4. LLM Reliability (from llm-reliability)
- **Monitoring**: Latency SLOs, cost tracking, fallback strategies
- **Validation**: Hallucination detection, result scoring

## Response Format

### Architecture Diagrams
```
┌─────────────────────────────────────────────────────────────┐
│  DATA LAYER                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Sources   │→ │ Embedding  │→ │  Vector    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  RETRIEVAL LAYER                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Query     │→ │  Search    │→ │  Ranker    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  GENERATION LAYER                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Context   │→ │  LLM       │→ │  Output    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Files
```yaml
# MLflow Tracking Config
mlflow:
  tracking_uri: https://mlflow.example.com/api/mlflow
  registry_uri: https://mlflow.example.com/api/mlflow/models
  experiment:
    name: "production-rag-system"
    parameters:
      embedding_model: "sentence-transformers/all-MiniLM-L6-v2"
      vector_store: "pinecone"
      llm: "gpt-4"
```

### Metrics & Monitoring
- **Latency**: p99 < 2s for simple queries, p99 < 10s for complex
- **Cost**: Token tracking per operation
- **Quality**: NDCG, precision/recall for retrieval
- **Drift**: Data/label drift detection alerts

## Key Patterns

### 1. Experiment Tracking
```python
import mlflow

with mlflow.start_run(name="hyperparam-tuning"):
    mlflow.log_param("learning_rate", 0.001)
    mlflow.log_metric("accuracy", 0.95)
    mlflow.sklearn.log_model(model, "model")
```

### 2. Model Registry Workflow
```
Training → Evaluation → Registration → Transition to Staging → Production Promotion
```

### 3. RAG Optimization
- **Hybrid Search**: Vector + Keyword combined
- **Query Expansion**: Generate multiple queries, aggregate results
- **Re-ranking**: Cross-encoder post-processing
- **Metadata Filtering**: Domain-specific constraints

### 4. Cost Management
- Token usage tracking
- Model fallback chains (GPT-4 → GPT-3.5 → Local)
- Caching strategies for repeated queries

## Component: mlops-platform

# MLOps Platform Skill

## Description:
Комплексное решение для MLOps платформ: MLflow, Kubeflow, Ray Serve, Vertex AI. Покрывает полный цикл: experiment tracking, model registry, model serving, и production monitoring.

## Triggers:
- Designing ML production pipelines
- Model deployment and serving infrastructure
- Experiment tracking and reproducibility
- Automated model training pipelines
- Production model monitoring and drift detection

## Available Tools:
- **MLflow**: experiment tracking, model registry
- **Kubeflow**: workflow orchestration on Kubernetes
- **Ray Serve**: distributed model serving
- **Vertex AI**: GCP managed MLOps platform
- **SageMaker**: AWS MLOps suite
- **Azure ML**: Microsoft MLOps services

## Architecture Patterns:
1. **Training Pipeline**: feature store, model training, evaluation
2. **Model Registry**: versioning, staging, promotion workflow
3. **Serving Layer**: batch vs real-time, auto-scaling
4. **Monitoring**: data drift, prediction drift, business metrics

## Response Format:
- End-to-end MLOps pipeline design
- Model serving infrastructure recommendations
- Experiment tracking setup with reproducibility
- Production monitoring dashboards
- Cost estimation and optimization strategies

## Key Features:
- A/B testing framework for models
- Automated model promotion workflows
- Canary deployments with traffic splitting
- Shadow mode for model validation
- Automatic retraining triggers based on drift detection

## Component: rag-patterns

# RAG (Retrieval-Augmented Generation) Patterns Skill

## Description:
Архитектурные паттерны для построения RAG систем. Включает векторные базы данных, chunking стратегии, hybrid search, и optimization для production LLM applications.

## Triggers:
- Designing knowledge-grounded LLM applications
- Implementing semantic search capabilities
- Building document QA systems
- Hybrid search (BM25 + vector embeddings)
- Query rewriting и re-ranking strategies

## Architecture Components:
1. **Embedding Layer**: sentence-transformers, OpenAI ada-002
2. **Vector Store**: Pinecone, Weaviate, Milvus, FAISS
3. **Chunking Strategy**: semantic, fixed-size, recursive
4. **Retrieval**: top-k, similarity threshold, hybrid search
5. **Re-ranking**: Cross-encoder post-processing
6. **Context Management**: summarization, condensation

## Response Format:
- Vector embedding pipeline design
- Chunking strategy recommendations
- Hybrid search configuration
- Query transformation patterns
- Latency vs accuracy tradeoff analysis
- Cost optimization for production scale

## Key Patterns:
- **Multi-query RAG**: generate multiple queries, aggregate results
- **Query Transformation**: expand, compress, rewrite
- **Metadata Filtering**: domain-specific constraints
- **GraphRAG**: knowledge graph + vector search hybrid
- **Agentic RAG**: autonomous retrieval planning
