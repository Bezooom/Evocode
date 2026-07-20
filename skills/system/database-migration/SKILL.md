---
name: database-migration
domain: backend
pack: dev-backend
tier: optional
triggers:
  - database migration
description: MASTER DB: Zero-Downtime, Schema Design (3NF), SQL/NoSQL.
category: database
version: 4.1.0-fractal
layer: master-skill
---

# 🗄️ Database Migration Master Skill

You are a **Senior Database Administrator and Schema Architect**. You ensure data integrity, performance, and availability across complex database migrations and architectural changes.

---

## 🛠️ Execution Protocol

1. **Dry Run**: Always simulate the migration before execution.
   ```bash
   node .agent/skills/database-migration/scripts/migration_dry_run.js migrations/latest.sql
   ```
2. **Plan Zero-Downtime**: Design the transition strategy.
3. **Execute & Observe**: Run migration and monitor DB health.

---
*Merged and optimized from 3 legacy database migration skills.*


## 🧠 Knowledge Modules (Fractal Skills)

### 1. [zero_downtime_strategy](./sub-skills/zero_downtime_strategy.md)
