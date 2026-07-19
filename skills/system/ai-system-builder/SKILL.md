---
name: ai-system-builder
description: Build specialized AI systems using modern stacks (FastAPI, PyTorch, RAG, GraphRAG, LLM Wiki, local LLMs). Use when designing procurement systems, document intelligence platforms, multi-agent workflows, or any AI application requiring private/local inference, vector search, knowledge graphs, or OCR processing.
---

# AI System Builder

Build production-ready AI systems using modern stacks: **FastAPI**, **PyTorch**, **RAG** (Qdrant/pgvector), **GraphRAG** (Apache AGE), **LLM Wiki** (long-term memory), **local LLMs** (Llama.cpp/GGUF), **OCR** (Doctra/GLM-OCR), and **multi-agent workflows** (LangGraph).

## When to Use This Skill

Use this skill when the user requests:
- **RAG systems** for legal documents, procurement specs, or knowledge bases
- **GraphRAG** with knowledge graphs (entities + relationships + vector search)
- **LLM Wiki** instead of RAG (persistent, evolving memory)
- **Local/private AI** with Llama.cpp, GGUF models, or AMD ROCm/NVIDIA CUDA
- **Document intelligence** (PDF parsing, OCR, table extraction with Doctra/GLM-OCR)
- **Multi-agent systems** with LangGraph, MetaGPT, or CrewAI
- **AI procurement systems** like Axis (44-FZ compliance, price extraction)
- **Customs intelligence** like IntelliDocs (DOKA_NEW)
- **Deployment** with Docker Compose, GPU passthrough, or Kubernetes

## Core Capabilities

### 1. Architecture Design
Design systems using patterns from `references/architecture_patterns.md`:
- **RAG**: Query → Embedding → Vector DB → LLM with context
- **GraphRAG**: Entities + relationships + hybrid search (EdgeQuake reference)
- **LLM Wiki**: Persistent Markdown knowledge base with cross-linking
- **Multi-Agent**: Orchestrator → specialized agents (lawyer, architect, accountant)

### 2. Technology Selection
Choose stacks from `references/technology_selection.md`:
- **Backend**: FastAPI (Python) or Next.js API routes
- **LLM Inference**: Llama.cpp (local), SGLang (serving), LiteLLM (multi-provider)
- **Vector DB**: Qdrant (production), pgvector (hybrid), ChromaDB (dev)
- **OCR**: GLM-OCR (scans, 2GB VRAM), Doctra (complex PDFs)
- **Graph DB**: Apache AGE (PostgreSQL), Neo4j

### 3. Implementation
Build complete systems with:
- **FastAPI** async APIs with Pydantic validation
- **PyTorch** + Hugging Face Transformers for embeddings/fine-tuning
- **Qdrant/pgvector** for semantic search
- **Docker Compose** with GPU passthrough (AMD ROCm/NVIDIA)
- **React 19/Next.js 16** frontends with TailwindCSS v4

### 4. Deployment
Deploy using `references/deployment_patterns.md`:
- **Local**: Docker Compose with GPU devices (`/dev/kfd`, `/dev/dri`)
- **Production**: Kubernetes with NVIDIA Device Plugin
- **Cloud**: HuggingFace Spaces for demos, AWS/GCP for scale

## Workflow Decision Tree

```
User Request
    ↓
Does it need RAG? ──No──→ Standard API/ML pipeline
    │
    Yes
    ↓
Need entity relationships? ──Yes──→ GraphRAG (EdgeQuake pattern)
    │                            └── Apache AGE + pgvector
    No
    ↓
Need long-term memory? ──Yes──→ LLM Wiki (Obsidian-style)
    │                            └── Markdown + cross-links
    No
    ↓
Standard RAG
    └── Qdrant/ChromaDB + sentence-transformers
```

## Architecture Patterns

### Pattern 1: Standard RAG System

**Use for:** Document search, Q&A, simple knowledge bases

**Stack:**
- FastAPI + PyTorch (sentence-transformers)
- Qdrant (vector DB)
- Llama.cpp (local LLM)
- Docker Compose

**Example Structure:**
```
project/
├── backend/
│   ├── main.py          # FastAPI with RAG pipeline
│   ├── rag.py           # Query embedding + retrieval
│   └── requirements.txt # FastAPI, torch, qdrant-client
├── frontend/
│   ├── src/App.tsx      # React 19 with Vite
│   └── package.json     # React 19, Vite, Tailwind
└── docker-compose.yml   # PostgreSQL, Qdrant, Backend, Frontend
```

**Key Code:**
```python
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

def retrieve(query, top_k=5):
    client = QdrantClient(url="http://qdrant:6333")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    query_embedding = model.encode(query).tolist()
    results = client.search(
        collection_name="documents",
        query_vector=query_embedding,
        limit=top_k
    )
    return results
```

### Pattern 2: GraphRAG (Knowledge Graph + RAG)

**Use for:** Multi-hop reasoning, entity relationships, provenance tracking

**Stack:**
- FastAPI + PostgreSQL (Apache AGE + pgvector)
- EdgeQuake reference architecture
- SGLang for LLM serving
- Vision pipeline for PDFs

**Key Features:**
- Gleaning (multi-pass entity extraction)
- Community detection (Louvain algorithm)
- 6 query modes (vector, graph, hybrid, local, global)
- Lineage tracking ("why did the model say this?")

**Example Query:**
```python
# Find suppliers related to procurement projects
query = """
MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)-[:USED_IN]->(proj:Project)
RETURN s.name, s.rating, COUNT(p) as product_count
"""
```

### Pattern 3: LLM Wiki (Long-term Memory)

**Use for:** Evolving knowledge bases, corporate memory, legal precedents

**Stack:**
- Markdown vaults (Obsidian-style)
- LLM for compilation + contradiction detection
- Vector search for retrieval
- Git for version control

**Key Rules:**
1. Separate vaults (personal + agent)
2. Classify sources
3. Counter-arguments section required
4. TLDR on every page
5. Good answers → new pages
6. Plan for scale
7. Periodic lint-passes

### Pattern 4: Multi-Agent System

**Use for:** Complex workflows requiring specialized roles (lawyer + architect + accountant)

**Stack:**
- LangGraph (state machines)
- MetaGPT (role assignment)
- Agent-Reach (internet access for agents)
- CrewAI-style crews

**Example Crew:**
```python
class ProcurementCrew:
    agents = [
        "architect",  # Project specs
        "lawyer",     # 44-FZ compliance
        "accountant", # Budget calculation
        "researcher"  # Agent-Reach for prices
    ]
```

### Pattern 5: Document Intelligence (OCR + Extraction)

**Use for:** Scanned PDFs, customs declarations, invoices, tables

**Stack Hierarchy:**
1. **PyMuPDF**: Simple PDFs (text only)
2. **GLM-OCR**: Scans, formulas, tables (0.9B params, 2GB VRAM, 94.62% accuracy)
3. **Doctra**: Complex PDFs → Markdown/Excel
4. **Table Transformer**: Table structure understanding
5. **text-extract-api**: Ready-to-use API

**Example:**
```python
# GLM-OCR for scanned invoices
from glm_ocr import GLMOCR

ocr = GLMOCR(model_path="glm-ocr-0.9b")
data = ocr.extract("invoice_scan.jpg")  # Tables + text preserved
```

## Technology Stack Quick Reference

| Component | Choice | Alternative |
|-----------|--------|-------------|
| **Backend** | FastAPI | Flask, Django, Node.js |
| **LLM Inference** | Llama.cpp (GGUF) | ONNX Runtime, TensorRT |
| **LLM Serving** | SGLang | vLLM, TGI |
| **Vector DB** | Qdrant | Pinecone, Weaviate, pgvector |
| **Graph DB** | Apache AGE | Neo4j, JanusGraph |
| **OCR** | GLM-OCR, Doctra | Tesseract, PaddleOCR |
| **Frontend** | React 19 + Vite | Next.js, Vue |
| **Database ORM** | SQLAlchemy | Prisma (Node.js), Peewee |
| **Deployment** | Docker Compose + GPU | Kubernetes, Podman |

## Deployment Guide

### Local Development (GPU Passthrough)

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    devices:
      - /dev/kfd:/dev/kfd  # AMD ROCm
      - /dev/dri:/dev/dri
    group_add:
      - video
    environment:
      - HSA_OVERRIDE_GFX_VERSION=11.0.0
```

### Production (Kubernetes)

See `references/deployment_patterns.md` for:
- GPU resource requests (`nvidia.com/gpu`)
- HPA (Horizontal Pod Autoscaler)
- Prometheus monitoring
- Secrets management

## Implementation Examples

See real-world implementations in TECH_REPORT.md:
- **Axis**: Procurement AI with RAG + web scraping
- **DOKA_NEW**: IntelliDocs with GraphRAG + OCR
- **Burevestnik**: Corporate site with Next.js + Framer Motion
- **ZAVB_PLAST**: E-commerce with Prisma + NextAuth

## Validation Checklist

Before completing an AI system, ensure:
- [ ] Local LLM inference works (Llama.cpp with GGUF)
- [ ] Vector DB populated with embeddings
- [ ] RAG retrieval returns relevant documents
- [ ] OCR pipeline handles edge cases (scans, tables)
- [ ] Multi-agent coordination works (if applicable)
- [ ] GPU passthrough verified (`rocm-smi` or `nvidia-smi`)
- [ ] Docker Compose starts all services
- [ ] Frontend connects to backend
- [ ] Monitoring (Prometheus) shows metrics

## Resources

### References
- `references/architecture_patterns.md` — RAG, GraphRAG, LLM Wiki, OCR, Multi-Agent patterns
- `references/technology_selection.md` — When to choose FastAPI vs Flask, Qdrant vs pgvector, etc.
- `references/deployment_patterns.md` — Docker Compose, GPU passthrough, Kubernetes, CI/CD

---

**Version:** 1.0  
**Last Updated:** April 2026  
**Based on:** TECH_REPORT.md (Axis, DOKA_NEW, Burevestnik, ZAVB_PLAST, Foroney, Neurocontrol)
