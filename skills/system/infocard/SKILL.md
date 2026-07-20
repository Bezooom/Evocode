---
name: infocard
domain: general
pack: general
tier: optional
triggers:
  - инфо-карточка / info-card
  - журнальная типографика
  - редакторская карточка
  - knowledge summary
  - editorial cards
  - knowledge card
  - info cards
  - infocard
description: |
  [RU] Создание редакторских информационных карточек в стиле журнальной типографики через HTML/CSS в Markdown. Подходит для кратких summary, выделения ключевых данных, анонсов событий и одно-тематических карточек. Используй при запросах: "сделать info-card", "редакторская карточка", "knowledge card", "карточка в стиле журнала", "magazine-style оформление", "оформить факт красиво", "infocard".
  [EN] Create editorial-style information cards using HTML/CSS in Markdown. Best for knowledge summaries, data highlights, event announcements, and single-topic content cards with magazine-quality typography. Use when user wants info cards, editorial cards, knowledge cards, or mentions infocard.
metadata:
  triggers:
    - Инфо-карточка / info-card
    - Редакторская карточка
    - Knowledge card
    - Журнальная типографика
    - Editorial cards
    - Info cards
    - Knowledge summary
---

# Infocard Generator

**Quick Start:** Analyze content (density × structure × mood) → Auto-sense tone for color palette → Pick a layout skeleton → Embed HTML directly in Markdown with `<style scoped>`.

## Critical Rules

### Rule 1: Direct HTML Embedding
Write info cards as direct HTML in Markdown. **NEVER** use code blocks (` ```html `). The HTML should be embedded directly in the document.

### Rule 2: No Empty Lines in HTML Structure
Do NOT add any empty lines within the HTML info card structure. Keep the entire HTML block continuous.

### Rule 3: Content Analysis Before Layout
Analyze content along three dimensions:

**Density** (determines breathing rhythm):
| Density | Content Volume | Visual Treatment |
|---------|---------------|-----------------|
| Low | ≤ 50 words core | Big-character. One oversized element dominates. |
| Medium | 50–200 words | Hero + supporting panels. 2–3 main blocks. |
| High | 200+ words | Asymmetric multi-column grids. Never equal-weight tiles. |

**Structure** (determines layout geometry):
| Structure | Signal | Layout Pattern |
|-----------|--------|---------------|
| Single point | One core concept | One anchor element dominates |
| Contrast | A vs B, old vs new | Split panel, two poles |
| Hierarchy | Layers build on each other | Stacked modules, pyramid |
| Flow | Sequential steps | Vertical cascade |
| Radial | Core + derivatives | Hub with surrounding panels |
| Parallel | Multiple equal concepts | Asymmetric grid (never equal columns) |

**Mood** (determines color temperature):
| Mood | Visual Feel |
|------|-------------|
| Reflective | More whitespace, serif-heavy, lower contrast |
| Sharp | Strong contrast, bold type, vivid accent |
| Warm | Earth tones, rounded feel, gentle rhythm |
| Technical | Monospace accents, grid-like density |

### Rule 4: Tone Sensing
Auto-select color palette based on content topic.

| Content Tone | Background | Accent | Trigger Keywords |
|---|---|---|---|
| Philosophical | `#FAF8F4` | `#7C6853` | cognition, thinking, meaning, philosophy |
| Technical | `#F5F7FA` | `#3D5A80` | architecture, algorithm, system, API |
| Literary | `#FBF9F1` | `#6B4E3D` | story, narrative, writing, poetry |
| Scientific | `#F4F8F6` | `#2D6A4F` | experiment, data, research, paper |
| Business | `#F4F3F0` | `#2D6A4F` | market, strategy, growth, finance |
| Creative | `#F6F3F2` | `#B8432F` | design, art, aesthetics, creation |
| Default | `#FAFAF8` | `#4A4A4A` | When no clear match |

### Rule 5: Title Protection
If the user provides a title explicitly, use it as-is. Put editorial interpretation into subtitle, summary, or side modules.

### Rule 6: Typography Hierarchy
- Hero title: `32px–48px`, weight 700–900, tight letter-spacing
- Subtitle / summary: `16px–20px`, weight 400–500
- Body text: `14px–16px`, weight 400, line-height `1.6–1.7`
- Meta / tags / captions: `11px–13px`, weight 500–700, uppercase

### Rule 7: Visual Weight Distribution
At least one module should feel visually heavier than the others.

### Rule 8: Taste Rules (Anti-AI)
- No centered hero — prefer left-aligned or asymmetric
- No equal-width tiles — use `2fr 1fr`, asymmetric grids
- No pure black `#000000` — use off-black
- Max 1 accent color, saturation < 80%
- No neon gradients — no purple-blue AI glow
- No filler data (`99.99%`, `1234567`)
- No AI phrasing ("empower", "seamless", "unleash")

## Style Families

### Warm Editorial and Storytelling
| Style | Suitable For |
|---|---|
| **Editorial Warm** | Knowledge summaries, book notes, essays |
| **Customer Spotlight** | Customer stories, case studies |
| **Sunset Warm** | Community recaps, event notes |
| **Midcentury** | Brand stories, retro-modern |

### Soft Lifestyle and Teaching
| Style | Suitable For |
|---|---|
| **Soft Neutral** | Lifestyle, wellness, education |
| **Slate Chalk** | Teaching, lessons, concepts |
| **Education Studio** | Courses, workshops |

### Paper, Research, and Governance
| Style | Suitable For |
|---|---|
| **Paper Minimal** | Product notes, meeting notes |
| **Lab Journal** | Research, science, academia |
| **Academic Paper** | Research abstracts, papers |
| **Policy Paper** | Governance, policy, legal |
| **Navy Formal** | Investor decks, executive briefs |
| **Japanese Minimal** | Brand narratives, cultural notes |
| **Clinical Brief** | Healthcare, medical |

### Business, Finance, and Trust
| Style | Suitable For |
|---|---|
| **Corporate Clean** | Product launches, B2B briefs |
| **Pitch Deck VC** | Fundraising, market opportunity |
| **Sales Room** | Pipeline reviews, deal strategy |
| **Trust Center** | Security notes, compliance |
| **Partner Channel** | Partner briefs, alliance updates |

### Technical and Operational
| Style | Suitable For |
|---|---|
| **Tech Blueprint** | Technical specs, system design |
| **Engineering Whiteprint** | Architecture, API briefs |
| **Terminal Green** | Infra status, CLI guides |

### Broadcast and High-Contrast
| Style | Suitable For |
|---|---|
| **Bold Contrast** | Data highlights, KPI dashboards |
| **News Broadcast** | Flash updates, press briefings |
| **Incident Desk** | Incident reviews, postmortems |
| **Neo Brutalism** | Bold campaigns, manifestos |
| **Swiss Grid** | Structured editorial, typography |

### Signature Visual Identities
| Style | Suitable For |
|---|---|
| **Deep Night** | Entertainment, gaming, creative |
| **Glassmorphism** | Premium product reveals |

## Layout Families

### Core Single-Topic Cards
- **Hero Card** — Single topic with title + summary + one supporting panel
- **Quote Card** — Pull-quotes, mission statements
- **Split Panel** — Two-column: main content + sidebar
- **Stacked Modules** — Multi-section vertical flow

### Metrics and Operational Readouts
- **Metric Board** — KPI cards, performance dashboards
- **Financial Snapshot** — Revenue summaries, cash views
- **Sales Brief** — Pipeline reviews, deal strategy
- **Terminal Window** — Status snapshots, command walkthroughs

### Sequence, Roadmap, and Progression
- **Timeline Flow** — Sequential steps, milestones
- **Station Workflow** — Workflow breakdowns
- **Roadmap Board** — NOW / NEXT / LATER planning
- **Staircase Progression** — Maturity curves
- **Funnel Stack** — Sales funnels, conversion flows

### Comparison and Decision
- **Pros & Cons** — Trade-off analysis
- **Quadrant Matrix** — Priority mapping, 2x2 classification
- **Matrix Table** — MxN classification grids
- **Comparison** — Side-by-side contrast
- **Principle Grid** — Numbered tenets with anti-patterns

### Grid and Inventory
- **Bento Grid** — Multi-topic overviews
- **Badge Grid** — Feature lists, catalogs
- **Checklist Board** — Execution tracking, QA gates

### System and Relationship Mapping
- **Architecture Map** — Layered systems
- **Radial Hub** — Ecosystem overviews
- **Layered Sidebar Map** — Layered stack with context rails

### Document and Memo Logic
- **Research Abstract** — Study findings, evidence synthesis
- **Board Memo** — Executive updates, decision memos
- **Policy Memo** — Internal policy changes
- **Education Module** — Lesson summaries
- **Healthcare Summary** — Clinical overviews

### Governance, Risk, and Audit
- **Risk Register** — Risk tracking, mitigation planning
- **Compliance Audit** — Audit summaries, control reviews

### Narrative and Stakeholder Updates
- **News Bulletin** — Breaking updates, digest cards
- **Org Update** — Team changes, hiring
- **Customer Story** — Case studies, outcomes
- **Partner Brief** — Alliance updates

## Design Principles

### Space and Breathing Room
- Card padding: `32px–48px` from edges
- Module gaps: `16px–24px`
- Title line-height: `1.1–1.3`

### Visual Accents
- Rules: `4px–6px` thick
- Accent colors: one highlight used for rules and highlights
- Optional: `4%` noise overlay for paper texture

### Content Rhythm
- High-density cards: overview → core judgment → supporting modules → conclusion
- Ranking content: asymmetric hero + structured list
- Tutorial/analysis: overview → core insight → detail blocks → boundaries → summary

## Rich Text Elements

**Drop cap** (editorial opening):
```html
<p class="card-body dropcap">First paragraph...</p>
```

**Highlight quote** (standalone insight):
```html
<p class="card-highlight">Key insight</p>
```

**Titled item** (label + description):
```html
<div class="card-item">
  <p class="card-item-label">Item Title</p>
  <p class="card-panel-text">Description.</p>
</div>
```

**Section divider**:
```html
<div class="card-divider"></div>
```

**End mark** (editorial closure):
```html
<span class="card-endmark">∎</span>
```

## Common Classes

| Class | Purpose |
|-------|---------|
| `.card-frame` | Outer container |
| `.card` | Main card surface |
| `.card-meta` | Meta line |
| `.card-title` | Main headline |
| `.card-subtitle` | Secondary headline |
| `.card-bar` | Thick accent rule |
| `.card-body` | Body text |
| `.card-grid` | Grid container |
| `.card-panel` | Content panel |
| `.card-tag` | Inline tag/badge |
| `.card-stat` | Oversized metric |
| `.card-divider` | Horizontal rule |
| `.card-footer` | Bottom strip |
| `.card-endmark` | Editorial closure |
