---
name: kubernetes-operators
domain: devops
pack: devops
tier: optional
triggers:
  - kubernetes controllers
  - kubernetes operators
  - operator sdk
  - gitops
  - crd
description: >-
  Разработка и управление кастомными операторами Kubernetes. Автоматизация сложных задач 
  через controller pattern, reconciliation loops и custom resources.
  Triggers: custom controllers, CRDs, GitOps, service mesh.
metadata:
  category: devops
  triggers:
    - Kubernetes operators
    - CRD
    - GitOps
    - Kubernetes controllers
    - Operator SDK
---

# Kubernetes Operators Skill

## Description:
Разработка и управление кастомными операторами Kubernetes. Автоматизация сложных задач операционных систем через controller pattern, reconciliation loops и custom resources.

## Triggers:
- Разработка custom controllers для business logic
- Создание Custom Resource Definitions (CRDs)
- Автоматизация database stateful sets
- Service mesh management (Istio, Linkerd)
- GitOps с FluxCD или ArgoCD
- Auto-scaling и resource optimization

## Available Tools:
- Operator SDK (Go/Python/Ansible)
- KubeBuilder для scaffolding
- Helm Charts для package management
- Custom Resource Definitions (YAML/JSON schema)
- Controller Runtime Library
- Cluster API для infrastructure automation

## Response Format:
- CRD specifications с validation schemas
- Controller reconciliation loops design
- RBAC permissions и service account setup
- Health check и readiness probe configuration
- Rollout strategies с canary/blue-green patterns

## Key Patterns:
1. **Reconciliation Loop**: desired state vs actual state comparison
2. **Event-Driven**: watch API для resource changes
3. **Finalizers**: cleanup on deletion
4. **Status Subresource**: real-time state tracking
