---
name: devops-stack
domain: devops
pack: devops
tier: optional
triggers:
  - мониторинг и алертинг
  - deployment automation
  - автоматизация деплоя
  - security scanning
  - ci/cd пайплайн
  - ci/cd pipeline
  - observability
  - devops stack
  - monitoring
  - gitlab ci
description: |
  [RU] Единый навык DevOps-автоматизации: GitLab CI/CD, мониторинг и алертинг, observability, автоматизация деплоя — связанный стек платформенной инженерии. Используй при запросах: "настроить CI/CD пайплайн", "автоматизировать деплой", "мониторинг и алерты", "observability", "security scanning в пайплайне", "GitLab CI шаблоны".
  [EN] Unified DevOps automation skill combining GitLab CI/CD, monitoring/alerting, observability, and deployment automation into a cohesive platform engineering stack. Triggers: CI/CD pipeline, deployment automation, monitoring, observability, security scanning.
metadata:
  category: devops
  triggers:
    - CI/CD пайплайн
    - Автоматизация деплоя
    - Мониторинг и алертинг
    - Observability
    - GitLab CI
    - Security scanning
    - CI/CD pipeline
    - Deployment automation
    - Monitoring
    - Observability
    - GitLab CI
    - Security scanning
  version: "1.1.0"
  sha: jkl012mno345
  updated: 2026-07-18
  breaking: false
  dependencies:
    - name: git-guardrails
      version: ">=1.0.0"
    - name: architecture-diagram
      version: ">=1.0.0"
---

# DevOps Stack Skill (Consolidated)

## Overview
Unified DevOps automation skill combining GitLab CI/CD, monitoring/alerting, observability, and deployment automation into a cohesive platform engineering stack.

## Triggers
- CI/CD pipeline design and implementation
- Deployment automation and orchestration
- Monitoring and alerting configuration
- Observability stack setup
- Security scanning integration
- Change management and release automation

## Consolidated Components

### 1. GitLab CI/CD (from gitlab-ci-designer + gitlab-ci-advanced)
```yaml
# Core pipeline structure
stages:
  - build
  - test
  - deploy/staging
  - deploy/production

variables:
  DOCKER_IMAGE: "$CI_REGISTRY_IMAGE:latest"
  CACHED_DEPENDENCIES_PATH: .cache/deps
```

### 2. Monitoring & Alerting (from monitoring-alerting)
```yaml
# Prometheus alerting rules
groups:
  - name: api-alerts
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        annotations:
          summary: "High latency detected"
```

### 3. Observability Stack (from observability-stack)
```
┌─────────────────────────────────────────────────────────────┐
│  COLLECTORS                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  OTel SDK   │  │  OTel SDK   │  │  OTel SDK   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼──────────────────┘
          │                │                │
┌─────────▼────────────────────────────────▼──────────────────┐
│  COLLECTOR (Aggregation & Routing)                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Metrics → Prometheus/Grafana  │  Traces → Jaeger        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 4. Security Automation (DevSecOps / ГОСТ Р 56939-2024)
```toml
# .gitleaks.toml
[rule]
id = "api-key"
regex = '''(?:api[_\s]?\??key|token|secret|password|secret[_\s]?key'''
```
Обеспечение требований безопасной разработки (SDL) по ГОСТ Р 56939-2024: интеграция SAST, DAST, фаззинга и анализа зависимостей.

### 5. Chaos Engineering (from chaos-engineering)
```yaml
# LitmusChaos experiment
apiVersion:chaos Monkey.io/v1alpha1
kind:ChaosEngine
metadata:
  name: latencychaos
  namespace: default
spec:
  engineState: active
  chaosServices: ["latency", "packetloss"]
```

## Response Format

### Pipeline Templates
```yaml
# Generic deploy pipeline
deploy:
  stage: deploy
  script:
    - echo "Building and deploying..."
  artifacts:
    paths:
      - dist/
  tags:
    - docker
  dependencies:
    - build
    - test
```

### Dashboard Specifications
```json
{
  "dashboard": {
    "title": "System Health Overview",
    "panels": [
      {
        "type": "graph",
        "title": "Request Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Alert Configuration Matrix
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error Rate | > 5% | Critical | PagerDuty |
| Latency p99 | > 500ms | Warning | Slack |
| CPU Usage | > 80% | Warning | Auto-scale |
| Disk Space | < 10% | Critical | Alert Ops |

## Key Patterns

### 1. Shift Left Security (Secure Development Lifecycle)
- Pre-commit hooks for secret detection
- SAST в CI пайплайне (Требование ГОСТ Р 56939-2024)
- Анализ зависимостей (SCA) перед merge
- Фаззинг и DAST в тестовых средах

### 2. Progressive Delivery
```
Dev → Staging → Canary → Production
      (auto-test)    (10% traffic)  (full rollout)
```

### 3. Error Budget Consumption
```
SLO: 99.9% availability
Error Budget = 0.1% = 43 minutes/month
Burn Rate Alert: > 1.4x error budget consumed in 1 hour
```

### 4. Observability Triad
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Loki CLI
- **Traces**: Jaeger + OTel Collector

## Integration Points

### GitLab CI + Monitoring
```yaml
monitoring-check:
  stage: test
  script:
    - curl -g -X POST "$MONITORING_WEBHOOK" \
        -d '{"event":"deployment","commit":"'$CI_COMMIT_SHA'$"}'
  tags: [docker]
```

### Security Scan Pipeline (С учётом требований ГОСТ Р 56939-2024)
```yaml
security-scan:
  stage: test
  script:
    # Статический анализ кода (SAST)
    - semgrep --config auto .
    # Анализ уязвимостей зависимостей (SCA)
    - trivy fs --exit-code 1 .
  tags: [docker]

dast-fuzzing:
  stage: test
  script:
    # Фаззинг и динамический анализ (DAST) согласно ГОСТ
    - ./run_fuzzer.sh
    - zap-baseline.py -t http://staging-env
  tags: [docker]
```
