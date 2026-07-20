---
name: i18n-localization
domain: general
pack: general
tier: optional
triggers:
  - i18n localization
description: Internationalization and localization patterns.
category: development
version: 4.1.0-fractal
layer: master-skill
---

# i18n & Localization

> Internationalization (i18n) and Localization (L10n) best practices.

---

## 1. Core Concepts

| Term | Meaning |
|------|---------|
| **i18n** | Internationalization - making app translatable |
| **L10n** | Localization - actual translations |
| **Locale** | Language + Region (en-US, tr-TR) |
| **RTL** | Right-to-left languages (Arabic, Hebrew) |

---

## 2. When to Use i18n

| Project Type | i18n Needed? |
|--------------|--------------|
| Public web app | ✅ Yes |
| SaaS product | ✅ Yes |
| Internal tool | ⚠️ Maybe |
| Single-region app | ⚠️ Consider future |
| Personal project | ❌ Optional |

---

## 3. Implementation Patterns

## 🧠 Knowledge Modules (Fractal Skills)

### 1. [React (react-i18next)](./sub-skills/react-react-i18next.md)
### 2. [Next.js (next-intl)](./sub-skills/nextjs-next-intl.md)
### 3. [Python (gettext)](./sub-skills/python-gettext.md)
### 4. [DO ✅](./sub-skills/do.md)
### 5. [DON'T ❌](./sub-skills/dont.md)
