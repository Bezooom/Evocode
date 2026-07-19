# Deployment Patterns for AI Systems

## Overview

This guide covers deployment strategies for AI systems, from local development to production, including GPU passthrough, container orchestration, and scaling patterns.

---

## 1. Local Development Setup

### Docker Compose (Multi-Service)

**When to use:** Development with multiple services (Backend, DB, Vector DB, LLM serving)

**Example:**
```yaml
version: '3.8'

services:
  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: axis
      POSTGRES_USER: axis
      POSTGRES_PASSWORD: axis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Qdrant Vector DB
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

  # Backend API
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://axis:axis@postgres:5432/axis
      QDRANT_URL: http://qdrant:6333
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - qdrant

  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  qdrant_storage:
```

---

## 2. GPU Passthrough (Critical for AI)

### NVIDIA CUDA

**Docker Compose:**
```yaml
services:
  sglang-server:
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
    volumes:
      - ./models:/app/models
```

**Docker Run:**
```bash
docker run --gpus all -p 3000:3000 your-image
```

### AMD ROCm

**Docker Compose:**
```yaml
services:
  backend:
    build: ./backend
    devices:
      - /dev/kfd:/dev/kfd
      - /dev/dri:/dev/dri
    group_add:
      - video
    privileged: true
    environment:
      HSA_OVERRIDE_GFX_VERSION: "11.0.0"  # For RDNA2/3
```

**Installation:**
```bash
# AMD ROCm support for Llama.cpp
CMAKE_ARGS='-DLLAMA_HIPBLAS=on' pip install llama-cpp-python
```

**Verification:**
```bash
rocm-smi  # Check GPU visibility
```

---

## 3. Model Serving Architectures

### Single Server (Simple)
```
User → FastAPI → Llama.cpp (local) → Response
```
**Best for:** Development, single-user apps, <10 concurrent requests

### Separate Reasoning + Vision Servers (SGLang)
```
User → FastAPI → Router →
  ├─ Reasoning Server (Qwen2.5-14B) → Logic tasks
  └─ Vision Server (Qwen2.5-VL-7B) → Image tasks
```
**Best for:** Production RAG, mixed text/image workloads

### Multi-Model with Load Balancing (LiteLLM)
```
User → LiteLLM →
  ├─ Primary: GPT-4 (expensive, high quality)
  ├─ Fallback: Local Qwen (free, private)
  └─ Shadow: GPT-4o (testing, no user impact)
```
**Best for:** Cost optimization, reliability, A/B testing

---

## 4. Production Deployment

### Kubernetes (K8s)

**When to use:** Production scale, auto-scaling, multi-region

**Example Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sglang-reasoning
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sglang-reasoning
  template:
    metadata:
      labels:
        app: sglang-reasoning
    spec:
      containers:
      - name: sglang
        image: ghcr.io/sgl-project/sglang:latest
        ports:
        - containerPort: 30002
        resources:
          limits:
            nvidia.com/gpu: 1
        volumeMounts:
        - name: models
          mountPath: /app/models
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: models-pvc
```

### HuggingFace Spaces

**When to use:** Demos, prototypes, free hosting

**Setup:**
```python
# Gradio UI for RAG
import gradio as gr

with gr.Blocks() as demo:
    chatbot = gr.Chatbot()
    msg = gr.Textbox()
    btn = gr.Button("Send")
    
    def respond(message, history):
        # RAG logic here
        return rag_query(message)
    
    btn.click(respond, [msg, chatbot], chatbot)

demo.launch()
```

**docker-compose.yml:**
```yaml
# For HF Spaces Docker
version: '3'
services:
  app:
    build: .
    ports:
      - "7860"
    environment:
      HF_TOKEN: ${HF_TOKEN}
```

---

## 5. Data Persistence & Volumes

### PostgreSQL (pgvector)
```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      device: /data/postgres
      o: bind
```

### Qdrant
```yaml
volumes:
  qdrant_storage:
    # Persists vector data and collections
```

### Model Storage
```yaml
volumes:
  - ./models:/app/models  # Mount GGUF/AWQ models
  - /dev/shm:/dev/shm     # Shared memory for GPU
```

---

## 6. CI/CD Pipeline

### GitHub Actions Example

```yaml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          pip install pytest
      - name: Run tests
        run: pytest backend/tests/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app
            git pull
            docker-compose down
            docker-compose up -d --build
```

---

## 7. Scaling Strategies

### Horizontal Scaling (Multiple Instances)

**For:** Stateless API servers (FastAPI, Next.js)

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Scaling (Larger GPU)

**For:** LLM inference (SGLang, Llama.cpp)

**Options:**
- **Single GPU:** RTX 4090 (24GB) → 14B models
- **Multi-GPU:** 2x A100 (80GB) → 70B models with tensor parallelism
- **Cloud:** AWS p4d (8x A100), GCP A3 (8x H100)

---

## 8. Monitoring & Health Checks

### Docker Health Checks
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Prometheus + Grafana

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
```

**FastAPI Instrumentation:**
```python
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
Instrumentator().instrument(app).expose(app)

@app.get("/health")
async def health():
    return {"status": "healthy", "gpu_available": check_gpu()}
```

---

## 9. Security Best Practices

### Secrets Management
```yaml
# Never commit .env files!
# Use Docker secrets or environment variables

environment:
  DATABASE_URL: ${DATABASE_URL}
  OPENAI_API_KEY: ${OPENAI_API_KEY}
  QDRANT_API_KEY: ${QDRANT_API_KEY}
```

### Network Isolation
```yaml
networks:
  ai-network:
    driver: bridge
  
services:
  backend:
    networks:
      - ai-network
  qdrant:
    networks:
      - ai-network
    # Qdrant not exposed to internet!
```

### GPU Security
```yaml
# Limit GPU access to specific containers
# Don't use privileged: true unless necessary
```

---

## 10. Backup & Disaster Recovery

### PostgreSQL Backup
```bash
# Automated backup script
docker exec postgres pg_dump -U axis axis > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i postgres psql -U axis axis < backup_20260406.sql
```

### Qdrant Backup
```bash
# Qdrant has built-in snapshot API
curl -X POST http://localhost:6333/snapshots/create
```

---

## Quick Reference: Deployment Commands

### Local Development
```bash
docker-compose up -d
# Check logs
docker-compose logs -f backend
```

### Production Build
```bash
docker-compose -f docker-compose.prod.yml build
```

### GPU Verification
```bash
# NVIDIA
nvidia-smi

# AMD
rocm-smi
```

### Model Download
```bash
# HuggingFace CLI
huggingface-cli download TheBloke/Qwen2.5-14B-Instruct-AWQ --local-dir ./models
```

---

**Last Updated:** April 2026
**Version:** 1.0
