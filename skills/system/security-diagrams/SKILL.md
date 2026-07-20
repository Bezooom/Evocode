---
name: security
domain: security
pack: security
tier: optional
triggers:
  - security
description: Create security architecture diagrams using PlantUML with identity, encryption, firewall, and compliance stencil icons. Best for IAM flows, zero-trust models, encryption pipelines, and threat detection architectures. Use when user wants security diagrams, IAM, zero-trust, or encryption visuals.
---

# Security Architecture Diagram Generator

**Quick Start:** Define trust boundaries → Place identity/encryption/firewall icons → Connect with access flows → Group into security zones → Wrap in ` ```plantuml ` fence.

> ⚠️ **IMPORTANT:** Always use ` ```plantuml ` or ` ```puml ` code fence. NEVER use ` ```text `.

## Critical Rules

- Every diagram starts with `@startuml` and ends with `@enduml`
- Use `left to right direction` for access flows
- Use `mxgraph.aws4.*` stencil syntax for security icons
- Default colors applied automatically — no need for `fillColor` or `strokeColor`
- Use `rectangle "Trust Boundary" { ... }` for security zones
- Directed flows: `-->` (solid), `..>` (dashed = audit/async)

## Mxgraph Stencil Syntax

```
mxgraph.aws4.<icon> "Label" as <alias>
```

### Identity & Access

| Stencil | Purpose |
|---------|---------|
| `identity_and_access_management` | IAM policies & roles |
| `cognito` | User authentication & federation |
| `sts` | Temporary security credentials |
| `organizations` | Multi-account governance |

### Encryption & Secrets

| Stencil | Purpose |
|---------|---------|
| `key_management_service` | Key management & encryption |
| `secrets_manager` | Secrets rotation & storage |
| `certificate_manager` | TLS certificate lifecycle |
| `cloudhsm` | Hardware security module |
| `encrypted_data` | Encrypted data at rest |

### Network Security

| Stencil | Purpose |
|---------|---------|
| `network_firewall` | Network traffic filtering |
| `generic_firewall` | Web application firewall |
| `shield` | DDoS protection |
| `security_group` | Instance-level firewall |

### Threat Detection & Compliance

| Stencil | Purpose |
|---------|---------|
| `guardduty` | Threat detection |
| `cloudtrail` | Audit trail |
| `security_hub` | Compliance posture |
| `audit_manager` | Audit management |
| `macie` | Sensitive data discovery |

### Connection Types

| Syntax | Meaning | Use Case |
|--------|---------|----------|
| `A --> B` | Solid arrow | Auth flow / access request |
| `A ..> B` | Dashed arrow | Audit event / async detection |
| `A -- B` | Solid line | Trust relationship |
| `A --> B : "label"` | Labeled | Protocol or credential |

## Security Architecture Types

| Type | Purpose | Key Stencils |
|------|---------|--------------|
| IAM & AuthN | Identity & authentication | `cognito`, `identity_and_access_management`, `sts` |
| Encryption Pipeline | Data encryption at rest/in-transit | `key_management_service`, `certificate_manager`, `secrets_manager` |
| Network Security | Perimeter defense & firewalls | `network_firewall`, `shield`, `security_group` |
| Threat Detection | Automated threat response | `guardduty`, `detective`, `security_hub` |
| Compliance Audit | Governance & audit trail | `config`, `audit_manager`, `cloudtrail`, `security_lake` |
| Zero Trust | Zero-trust access model | `cognito`, `identity_and_access_management`, `network_firewall` |
| Data Protection | Sensitive data classification | `macie`, `encrypted_data`, `key_management_service` |
| Multi-account Gov | Organization-wide security | `organizations`, `control_tower`, `security_hub` |

## Quick Example

```plantuml
@startuml
left to right direction
mxgraph.aws4.users "Users" as users
mxgraph.aws4.cognito "Cognito" as auth
mxgraph.aws4.identity_and_access_management "IAM" as iam

rectangle "Protected Resources" {
  mxgraph.aws4.s3 "Data (S3)" as s3
  mxgraph.aws4.encrypted_data "Encrypted" as enc
}

users --> auth : "login"
auth --> iam : "token"
iam --> s3
s3 --> enc
@enduml
```
