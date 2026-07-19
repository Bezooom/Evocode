# AI System Architecture Patterns

## Overview

This document outlines the core architectural patterns for building specialized AI systems as of April 2026. Each pattern includes implementation details, technology choices, and migration paths.

---

## 1. RAG (Retrieval-Augmented Generation)

**Purpose:** Augment LLM responses with external knowledge bases without fine-tuning.

### Architecture
```
User Query → Query Embedding → Vector DB Search → Top-K Documents → LLM with Context → Response
```

### Technology Stack
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (fast, multilingual)
- **Vector DB:** Qdrant (production), ChromaDB (dev/testing), pgvector (hybrid search)
- **LLM:** Local via Llama.cpp (GGUF), Qwen2.5-14B-Instruct-AWQ
- **Backend:** FastAPI with async/await

### Implementation Example
```python
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

client = QdrantClient(url="http://localhost:6333")
model = SentenceTransformer('all-MiniLM-L6-v2')

def retrieve(query, top_k=5):
    query_embedding = model.encode(query).tolist()
    results = client.search(
        collection_name="documents",
        query_vector=query_embedding,
        limit=top_k
    )
    return [hit.payload for hit in results]
```

### Use Cases
- Legal document search (DOKA_NEW/IntelliDocs)
- Procurement specifications (Axis)
- Customer support knowledge bases

---

## 2. GraphRAG (Knowledge Graph + RAG)

**Purpose:** Combine entity relationships with vector search for multi-hop reasoning.

### Architecture
```
Document → Entity Extraction → Knowledge Graph (Neo4j/Apache AGE) + Vector DB → 
Hybrid Query (Graph Traversal + Vector Similarity) → LLM → Response
```

### Technology Stack
- **Graph DB:** Apache AGE (PostgreSQL extension), Neo4j
- **Vector DB:** pgvector (unified storage)
- **Entity Extraction:** Google LangExtract (grounded extraction)
- **Reference:** EdgeQuake (Rust, production-ready)

### Key Features (from EdgeQuake)
- **Gleaning:** Multi-pass entity extraction
- **Community Detection:** Louvain algorithm for topic clustering
- **Query Modes:** Vector-only, Graph-only, Hybrid, Local/Global
- **Lineage Tracking:** Provenance of answers
- **Vision Pipeline:** PDF as images + fallback to pdfium

### Implementation Example
```python
# Pseudo-code for hybrid query
query_modes = {
    "vector": "Fast semantic search",
    "graph": "Entity relationship traversal",
    "hybrid": "Combined ranking",
    "local": "Focused neighborhood search",
    "global": "Whole-graph analysis"
}

# Example: Find all suppliers related to a procurement project
query = """
MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)-[:USED_IN]->(proj:Project {id: $project_id})
RETURN s.name, s.contact, COUNT(p) as product_count
"""
```

### Use Cases
- Customs terminology (DOKA_NEW: Товар → ТН ВЭД → Страна → Льготы)
- Procurement networks (Axis: Поставщик ↔ Проект ↔ Цена ↔ 44-ФЗ)
- Fraud detection (transaction graphs)

---

## 3. LLM Wiki (Long-term Memory)

**Purpose:** Replace ephemeral RAG with persistent, evolving knowledge base (Andrei Karpathy's approach).

### Architecture
```
Document Ingestion → LLM Compilation → Markdown Wiki (Obsidian-style) → 
Cross-linking + Contradiction Detection → Persistent Storage → 
Query → Wiki Search + LLM Synthesis → Response → New Wiki Page
```

### Key Rules (from @shannholmberg)
1. Separate vaults (personal + agent)
2. Classify sources
3. Required "counter-arguments" section
4. TLDR on every page
5. Good answers → new pages
6. Plan for scale
7. Periodic lint-passes

### Technology Stack
- **Storage:** Markdown files + Git (version control)
- **Indexing:** Obsidian-style backlinks + vector embeddings
- **Processing:** LLM for compilation and contradiction detection

### Implementation Example
```python
class LLMWiki:
    def ingest_document(self, doc_path, source_type):
        """Compile document into wiki pages"""
        content = self.extract_text(doc_path)
        pages = self.llm.compile_to_pages(content, source_type)
        
        for page in pages:
            self.create_page(page.title, page.content, page.links)
            self.check_contradictions(page.content)
    
    def query(self, question):
        """Search wiki and generate answer"""
        relevant_pages = self.search_wiki(question)
        answer = self.llm.synthesize(answer, relevant_pages)
        
        # Save good answers as new pages
        if self.is_quality_answer(answer):
            self.create_page(f"Q: {question}", answer)
        
        return answer
```

### Use Cases
- Customs legislation wiki (DOKA_NEW: 145 ТК ЕАЭС → прецеденты → письма ФТС)
- Procurement history wiki (Axis: price history, 44-ФЗ precedents)
- Corporate knowledge (onboarding, technical docs)

---

## 4. OCR & Document Processing

**Purpose:** Extract structured data from PDFs, images, scanned documents.

### Technology Hierarchy

#### Level 1: Basic Text Extraction
- **PyMuPDF (fitz):** Fast, C++ backend, table support
- **Use:** Simple PDFs, text-only documents

```python
import fitz
doc = fitz.open("document.pdf")
for page in doc:
    text = page.get_text()
```

#### Level 2: Advanced OCR (GLM-OCR)
- **GLM-OCR (0.9B params):** 8K resolution, LaTeX, tables, 8+ languages
- **Performance:** #1 on OmniDocBench V1.5 (94.62%), 2GB VRAM, ~260 tok/s
- **Use:** Scanned docs, checks, formulas, container numbers, postal stamps

```bash
# Runs locally, fully offline
pip install glm-ocr
```

#### Level 3: Document Understanding (Doctra)
- **Doctra:** PDF → Markdown/CSV/Excel with tables + charts
- **Use:** Contracts, reports, two-column layouts, financial statements

#### Level 4: Table Understanding
- **Table Transformer (Microsoft):** Structure recognition (rows, columns, merged cells)
- **License:** MIT, 1.5M+ downloads
- **Use:** Invoices, financial reports, historical documents

```python
from transformers import AutoModelForTableQuestionAnswering, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("microsoft/table-transformer-structure-recognition")
model = AutoModelForTableQuestionAnswering.from_pretrained("microsoft/table-transformer-structure-recognition")
```

#### Level 5: Structured Extraction API
- **text-extract-api:** Ready-to-use local API (OCR + LLM)
- **Use:** Fast backend for RAG/agent systems

### Use Cases
- Customs declarations (DOKA_NEW: judicial expertise, handwritten signatures)
- Invoice processing (Axis: PriceMemory from supplier invoices)
- Retail: shelf price recognition
- Logistics: container numbers and waybills

---

## 5. Multi-Agent Systems

**Purpose:** Orchestrate multiple specialized LLM agents for complex tasks.

### Architecture
```
Task → Orchestrator → Agent Roles (Coder, Reviewer, Tester, etc.) → 
Communication Layer → Final Output
```

### Technology Stack
- **Framework:** LangGraph (state machines), MetaGPT (role assignment)
- **Coordination:** CrewAI-style crews (8+ agents, 13 skills)
- **External Access:** Agent-Reach (X, Reddit, YouTube, GitHub via CLI + cookies)

### Agent Types

#### 5.1 Domain Experts
- **Agent-Architect:** Project specifications (Axis)
- **Agent-Lawyer:** 44-FZ compliance (Axis), Customs law (DOKA_NEW)
- **Agent-Accountant:** Budgets, TaxHacker integration

#### 5.2 Data Workers
- **Agent-Analyst:** Entity extraction
- **Agent-Researcher:** Internet research via Agent-Reach
- **Agent-Writer:** Response composition

#### 5.3 Personal Assistants
- **My-Brain-Is-Full-Crew:** Obsidian vault management (13 skills)
- **Health/Anxiety/Email/Meetings agents**

### Implementation Example
```python
from langgraph.graph import StateGraph

class ProcurementCrew:
    def __init__(self):
        self.workflow = StateGraph(State)
        self.add_agents()
    
    def add_agents(self):
        self.workflow.add_node("architect", architect_agent)
        self.workflow.add_node("lawyer", lawyer_agent)
        self.workflow.add_node("accountant", accountant_agent)
        self.workflow.add_node("researcher", researcher_agent_with_agent_reach)
        
    def execute(self, task):
        return self.workflow.invoke({"task": task})
```

### Use Cases
- **Axis:** Architect + Lawyer + Accountant for procurement projects
- **DOKA_NEW:** Analyst + Lawyer + Writer for customs queries
- **Foroney:** Social media trend agent (Agent-Reach)

---

## 6. Synthetic Data Generation

**Purpose:** Generate high-quality training data for fine-tuning and RAG testing.

### Technology Stack
- **NVIDIA NeMo DataDesigner:** Column dependencies + LLM-as-a-judge
- **Use:** Private data scenarios, HIPAA/PCI compliance

### Implementation
```python
from nemostudio import DataDesigner

designer = DataDesigner(
    schema={"project_type", "budget", "supplier_count"},
    dependencies=[("budget", "project_type")]  # Correlated columns
)

synthetic_data = designer.generate(1000, judge_model="gpt-4")
```

### Use Cases
- **Axis:** Synthetic procurement specifications (no real data exposure)
- **DOKA_NEW:** Edge case testing for customs declarations
- **Healthcare:** Synthetic medical records (HIPAA compliance)
- **Finance:** Synthetic transactions for anti-fraud testing

---

## 7. Model Serving & Inference

### Local Inference (Privacy-First)
- **Llama.cpp:** GGUF format, quantization (AWQ, GPTQ)
- **SGLang:** Separate Reasoning + Vision servers
- **vLLM:** High-throughput serving
- **TGI:** Text Generation Inference (HuggingFace)

### Multi-Provider Routing
- **LiteLLM:** Unified API for OpenAI/Anthropic/Local
- **Features:** Load balancing, fallback, rate limiting, shadow mode

### GPU Passthrough
- **Docker Compose:** `/dev/kfd`, `/dev/dri` for AMD ROCm
- **NVIDIA:** `--gpus all` or specific GPU assignment

```yaml
services:
  sglang-reasoning:
    image: ghcr.io/sgl-project/sglang:latest
    command: >
      python3 -m sglang.launch_server
      --model-path /app/models/Qwen2.5-14B-Instruct-AWQ
      --port 30002
      --quantization awq_marlin
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## 8. Monitoring & Observability

### Stack
- **Prometheus + Grafana:** Metrics (HTTP requests, latency, GPU usage)
- **Pino:** Structured JSON logging (10x faster than console.log)
- **Distributed Tracing:** Correlation IDs for microservices

### Key Metrics
- **SLO/SLI:** Uptime, p99 latency
- **Cost Tracking:** Multi-provider LLM costs (EdgeQuake)
- **Lineage:** "Why did the model answer this way?" (GraphRAG)

---

## 9. Migration Paths

### RAG → GraphRAG
**When:** Need multi-hop reasoning, entity relationships
**How:** Add Apache AGE/Neo4j, implement entity extraction, hybrid queries
**Reference:** EdgeQuake implementation

### RAG → LLM Wiki
**When:** Need long-term memory, evolving knowledge
**How:** Add Markdown storage, cross-linking, contradiction detection
**Reference:** Andrei Karpathy's 7 rules

### PyMuPDF → Doctra/GLM-OCR
**When:** Complex PDFs (tables, scans, two-column)
**How:** Replace PyMuPDF with Doctra for structure, GLM-OCR for scans
**Benefit:** +30% RAG accuracy

---

**Last Updated:** April 2026
**Version:** 1.0
