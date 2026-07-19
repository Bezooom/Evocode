# Technology Stack Selection Guide

## Overview

This guide helps select the right technology stack for AI system components based on requirements, scale, and constraints.

---

## 1. Backend API Frameworks

### FastAPI (Python)
**Choose when:**
- Building AI/ML APIs with async processing
- Need automatic OpenAPI/Swagger documentation
- Require dependency injection pattern
- High performance needed (Starlette + Pydantic)

**Alternative:** Flask (legacy), Django (batteries-included), Node.js/Express (JS-only teams)

**Example:**
```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

@app.get("/projects/{project_id}")
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    return await db.query(Project).filter(Project.id == project_id).first()
```

---

## 2. LLM Inference & Serving

### Local Inference (Privacy-First)

#### Llama.cpp (GGUF)
**Choose when:**
- Privacy required (no cloud API)
- Limited GPU memory (quantization)
- Edge deployment (Raspberry Pi, Jetson)
- AMD ROCm support needed

**Installation:**
```bash
# AMD ROCm
CMAKE_ARGS='-DLLAMA_HIPBLAS=on' pip install llama-cpp-python

# NVIDIA CUDA
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
```

#### SGLang
**Choose when:**
- Need separate Reasoning + Vision servers
- High-throughput serving (MoE models)
- Production RAG systems

**Architecture:**
- **Reasoning Server:** Qwen2.5-14B-Instruct-AWQ (logic)
- **Vision Server:** Qwen2.5-VL-7B-Instruct-AWQ (images)

#### vLLM vs TGI
- **vLLM:** Better for continuous batching, high concurrency
- **TGI:** Better for HuggingFace ecosystem integration

### Cloud/Unified API

#### LiteLLM
**Choose when:**
- Multi-provider support (OpenAI + Anthropic + Local)
- Need fallback mechanisms
- Cost optimization (cheap models for simple tasks)
- Rate limiting and shadow mode testing

**Example:**
```python
from litellm import completion

# Auto-fallback from GPT-4 to local model
response = completion(
    model="gpt-4", 
    fallback_models=["local:qwen2.5-14b"],
    messages=[{"role": "user", "content": "query"}]
)
```

---

## 3. Vector Databases

### Qdrant
**Choose when:**
- Production RAG systems
- Need payload filtering (metadata)
- High performance required
- Docker deployment acceptable

**Pros:** Fast, filtering, REST + gRPC API
**Cons:** Separate service to manage

### pgvector (PostgreSQL)
**Choose when:**
- Want unified database (SQL + vectors)
- Small to medium scale (<1M vectors)
- Need hybrid search (text + vector)
- Already using PostgreSQL

**Pros:** No separate service, SQL integration
**Cons:** Slower than dedicated vector DBs at scale

### ChromaDB
**Choose when:**
- Development/testing
- In-memory mode acceptable
- Quick prototyping (0-config)
- A/B testing vector models

**Pros:** Simple API, in-memory option
**Cons:** Not for production at scale

### Pinecone/Weaviate/Milvus
**Choose when:**
- Managed cloud service preferred
- Enterprise features needed (SAML, VPC)
- Multi-region replication

---

## 4. OCR & Document Processing

### Hierarchy by Complexity

| Tool | Best For | VRAM | Speed |
|------|----------|------|-------|
| **PyMuPDF** | Simple PDFs, text extraction | N/A | Fastest |
| **GLM-OCR** | Scans, formulas, tables, 8K | 2GB | 260 tok/s |
| **Doctra** | Complex PDFs, contracts | 4GB+ | Medium |
| **Table Transformer** | Table structure only | 4GB | Medium |
| **text-extract-api** | Ready API, mixed docs | 6GB+ | Slow |

**Selection Guide:**
- **Simple PDFs:** PyMuPDF
- **Scans/Handwritten:** GLM-OCR (local, private)
- **Contracts with Tables:** Doctra + Table Transformer
- **Production API:** text-extract-api

---

## 5. Graph Databases (GraphRAG)

### Apache AGE (PostgreSQL)
**Choose when:**
- Want unified PostgreSQL + Graph
- Already using pgvector
- Small to medium graphs
- EdgeQuake reference implementation

### Neo4j
**Choose when:**
- Large knowledge graphs (>1M nodes)
- Complex traversals
- Enterprise features needed
- Native Cypher preferred

### NetworkX (In-Memory)
**Choose when:**
- Prototyping
- Small graphs (<100k nodes)
- Python-only pipelines

---

## 6. Frontend Frameworks

### Next.js 16
**Choose when:**
- SEO critical (SSR/SSG)
- E-commerce or marketing site
- Need image optimization
- App Router (file-based routing)

**Features:** Partial Prerendering, Turbopack, Server Actions

### React 19 + Vite
**Choose when:**
- SPA (Single Page Application)
- Dashboard/admin panel
- Real-time updates (WebSockets)
- Fast HMR (Hot Module Replacement)

**Features:** React Compiler, use(), resource APIs

### TailwindCSS v4
**Choose when:**
- Utility-first CSS preferred
- JIT compilation needed
- Custom design system
- Dark mode support

**Alternative:** Bootstrap (legacy), Chakra UI/MUI (component libraries)

---

## 7. Database ORMs

### Prisma (TypeScript)
**Choose when:**
- TypeScript project
- Type-safe queries needed
- Migration management required
- Next.js/Node.js backend

**Features:** Generated types, relations, seeds

### SQLAlchemy (Python)
**Choose when:**
- Python/FastAPI backend
- Complex queries with joins
- Alembic migrations needed
- Data Science integration (pandas)

### Drizzle ORM
**Choose when:**
- Lightweight alternative to Prisma
- SQL-like syntax preferred
- Edge/Cloudflare Workers

---

## 8. Authentication

### NextAuth.js (Auth.js)
**Choose when:**
- Next.js project
- OAuth providers needed (Google, GitHub)
- JWT sessions
- Prisma integration

**Providers:** Credentials, OAuth, WebAuthn, MFA

### Keycloak/Auth0
**Choose when:**
- Enterprise SSO (SAML, OIDC)
- Multi-tenant SaaS
- Legacy system integration

---

## 9. Workflow Orchestration

### LangGraph
**Choose when:**
- Multi-agent systems
- State machines needed
- RAG pipelines with feedback loops
- Production workflows

### Temporal/Camunda
**Choose when:**
- Long-running workflows (days/weeks)
- Human-in-the-loop
- Enterprise workflows
- Visibility into execution

### Simple Async (Python)
**Choose when:**
- Simple pipelines
- No external orchestration needed
- `async/await` sufficient

---

## 10. Monitoring & Observability

### Prometheus + Grafana
**Choose when:**
- Metrics needed (HTTP, latency, GPU)
- Kubernetes deployment
- SLO/SLI tracking

### Pino (Logging)
**Choose when:**
- High-performance logging (10x console.log)
- Structured JSON logs
- Elasticsearch/Logstash integration

### LangSmith
**Choose when:**
- LLM trace visibility
- Prompt debugging
- Cost tracking
- LangChain/LangGraph usage

---

## 11. Deployment & DevOps

### Docker Compose
**Choose when:**
- Multi-service apps (Backend + DB + Vector DB)
- Local development parity
- GPU passthrough needed (AMD ROCm/NVIDIA)

**GPU Passthrough:**
```yaml
devices:
  - /dev/kfd:/dev/kfd  # AMD ROCm
  - /dev/dri:/dev/dri
  - /dev/nvidia0       # NVIDIA
```

### Kubernetes
**Choose when:**
- Production scale (>10 services)
- Auto-scaling needed
- Multi-region deployment
- CI/CD integration

### HuggingFace Spaces
**Choose when:**
- Demo/Showcase
- Quick deployment
- Free tier acceptable

---

## 12. Data Processing

### Pandas
**Choose when:**
- Data analysis
- CSV/Excel processing
- EDA (Exploratory Data Analysis)

### Polars
**Choose when:**
- Large datasets (>1GB)
- Faster than Pandas needed
- Memory efficiency required

### XLSX (SheetJS)
**Choose when:**
- Excel import/export
- Browser-based processing
- Large files (SAX parser)

---

## 13. Web Scraping

### SeleniumBase
**Choose when:**
- JavaScript-rendered pages
- Complex interactions needed
- E2E testing also needed

### Cheerio (Node.js) / BeautifulSoup (Python)
**Choose when:**
- Static HTML
- Fast parsing needed
- No JavaScript execution

### Playwright
**Choose when:**
- Modern alternative to Selenium
- Better performance
- Mobile emulation

---

## 14. Validation & Types

### Zod (TypeScript)
**Choose when:**
- Runtime validation needed
- TypeScript inference
- Form validation
- API input validation

### Pydantic (Python)
**Choose when:**
- Python data validation
- FastAPI integration
- Settings management

---

## 15. Build Tools

### Vite
**Choose when:**
- React/Vue/Svelte frontend
- Fast HMR needed
- Modern build (esbuild + Rollup)

### Turbopack
**Choose when:**
- Next.js 14+
- Faster builds than Webpack

---

## Quick Selection Matrix

| Use Case | Backend | LLM | Vector DB | Frontend | DB |
|----------|---------|-----|-----------|----------|-----|
| **Private RAG** | FastAPI | Llama.cpp | Qdrant | React+Vite | PostgreSQL+pgvector |
| **GraphRAG** | FastAPI | SGLang | pgvector+AGE | Next.js | PostgreSQL |
| **Multi-Agent** | FastAPI | LiteLLM | ChromaDB | React | Prisma+PostgreSQL |
| **E-commerce AI** | Next.js API | OpenAI | Pinecone | Next.js | Prisma+PostgreSQL |
| **Desktop AI App** | PyQt6 | Llama.cpp | ChromaDB (local) | PyQt6 | SQLite+pgvector |
| **LLM Wiki** | FastAPI | Local GGUF | Qdrant | Next.js | PostgreSQL+Markdown |

---

**Last Updated:** April 2026
**Version:** 1.0
