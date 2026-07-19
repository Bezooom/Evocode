# Components — Справочник компонентов

Все компоненты определены в template.html. Использовать только готовые классы.

---

## Typography

| Class | Font | Weight | Size | Use |
|---|---|---|---|---|
| `.display` | Playfair 700 | 700 | 11vw | English hero |
| `.display-zh` | Noto Serif SC 700 | 700 | 7.8vw | Chinese hero |
| `.h1-zh` | Noto Serif SC 700 | 700 | 4.6vw | Page title |
| `.h2-zh` | Noto Serif SC 600 | 600 | 3.2vw | Subtitle |
| `.h3-zh` | Noto Serif SC 500 | 500 | 1.9vw | Section title |
| `.lead` | Noto Serif SC 400 | 400 | 1.9vw | Lead paragraph |
| `.body-zh` | Noto Sans SC 400 | 400 | 1.22vw | Body text |
| `.body-serif` | Noto Serif SC 400 | 400 | 1.3vw | Serif body |
| `.kicker` | IBM Plex Mono | — | 12px | Section hint |
| `.meta` | IBM Plex Mono | — | 0.88vw | Metadata |
| `.big-num` | Playfair 800 | 800 | 10vw | Giant number |
| `.mid-num` | Playfair 700 | 700 | 5.5vw | Mid number |

**Rule:** Serif = headlines/emphasis, Sans = body, Mono = metadata.

---

## Stat Cards

```html
<div class="stat-card">
  <div class="stat-label">LABEL</div>
  <div class="stat-nb">123<span class="stat-unit">K</span></div>
  <div class="stat-note">Description</div>
</div>
```

3 parts: label (mono) → number (serif big) → note (sans).

---

## Callout

```html
<div class="callout">
  <div class="q-big">"Quote text."</div>
  <span class="cite">— Source</span>
</div>
```

Left border + subtle background. Use for quotes and key insights.

---

## Pipeline Steps

```html
<div class="pipeline-section">
  <div class="pipeline-label">Group Label</div>
  <div class="pipeline">
    <div class="step">
      <div class="step-nb">01</div>
      <div class="step-title">Step Name</div>
      <div class="step-desc">Description.</div>
    </div>
  </div>
</div>
```

Up to 5 steps per row. More → new pipeline group.

---

## Figure / Image

```html
<figure class="frame-img" style="height:26vh">
  <img src="images/photo.jpg" alt="desc">
  <figcaption class="img-cap">Source · 2026</figcaption>
</figure>
```

Fixed height, `object-fit:cover`, `object-position:top`. Only crop bottom.

Placeholder:
```html
<div class="img-slot r-4x3">
  <span class="plus">+</span>
  <span class="label">Image placeholder</span>
</div>
```

---

## Icons (Lucide)

```html
<i data-lucide="target" class="ico-md"></i>
```

**Sizes:** `ico-lg`, `ico-md`, `ico-sm`

**Common icons:** `compass`, `target`, `check-circle`, `arrow-right`, `grid-2x2`, `share-2`, `users`, `palette`, `trending-up`, `workflow`

**No emoji.** Ever.

---

## Pillar Cards

```html
<div class="pillar">
  <div class="ic"><i data-lucide="compass" class="ico-lg"></i></div>
  <div class="t">Title</div>
  <div class="d">Description text.</div>
</div>
```

Use in `.grid-3` for 3-column layouts.

---

## Ghost (Background Characters)

```html
<div class="ghost" style="right:-6vw;top:-8vh">TEXT</div>
```

34vw, opacity 0.06. For decorative background text.

---

## Highlight (Marker Effect)

```html
<span class="hi">highlighted text</span>
```

Underline highlight. Use sparingly — 1-3 words per highlight.
