---
name: vega
domain: general
pack: general
tier: optional
triggers:
  - vega
description: Create data-driven charts with Vega-Lite (declarative) and Vega (programmatic). Best for statistical visualization of numeric data — bar, line, scatter, heatmap, area, radar charts, and word clouds. Use when user wants charts, data visualization, or mentions Vega.
---

# Vega / Vega-Lite Visualizer

**Quick Start:** Structure data as array of objects → Choose mark type (bar/line/point/area/arc/rect) → Map encodings (x, y, color, size) to fields → Set data types (quantitative/nominal/ordinal/temporal) → Wrap in ` ```vega-lite ` or ` ```vega ` fence.

**Use Vega-Lite for 90% of charts; Vega only for radar, word cloud, force-directed.**

## Critical Syntax Rules

### Rule 1: Always Include Schema
```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  ...
}
```

### Rule 2: Valid JSON Only
- Use double quotes for all keys
- No trailing commas
- Valid JSON structure

### Rule 3: Field Names Must Match Data
- Field names are case-sensitive
- `"field": "Category"` when data has `"Category"`
- `"field": "category"` when data has `"category"`

### Rule 4: Type Must Be Valid
- `quantitative` — numbers
- `nominal` — categories
- `ordinal` — ordered categories
- `temporal` — dates
- ❌ NOT: `numeric`, `string`, `date`

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Chart not rendering | Check JSON validity, verify `$schema` |
| Data not showing | Field names must match exactly |
| Wrong chart type | Match mark to data structure |
| Colors not visible | Check color scale contrast |
| Dual-axis issues | Add `resolve: {scale: {y: "independent"}}` |

## Common Chart Patterns

### Bar Chart
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"category": "A", "value": 28},
    {"category": "B", "value": 55},
    {"category": "C": "value": 43}
  ]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

### Line Chart
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"month": 1, "value": 28},
    {"month": 2, "value": 55},
    {"month": 3, "value": 43}
  ]},
  "mark": "line",
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

### Stacked Bar
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"category": "A", "group": "x", "value": 10},
    {"category": "A", "group": "y", "value": 20},
    {"category": "B", "group": "x", "value": 15},
    {"category": "B", "group": "y", "value": 25}
  ]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "group", "type": "nominal"}
  }
}
```

### Scatter Plot
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"x": 10, "y": 20, "size": 5},
    {"x": 30, "y": 40, "size": 8},
    {"x": 50, "y": 30, "size": 12}
  ]},
  "mark": "point",
  "encoding": {
    "x": {"field": "x", "type": "quantitative"},
    "y": {"field": "y", "type": "quantitative"},
    "size": {"field": "size", "type": "quantitative"},
    "color": {"field": "category", "type": "nominal"}
  }
}
```

### Heatmap
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"x": "A", "y": "X", "value": 10},
    {"x": "A", "y": "Y", "value": 20},
    {"x": "B", "y": "X", "value": 30},
    {"x": "B", "y": "Y", "value": 40}
  ]},
  "mark": "rect",
  "encoding": {
    "x": {"field": "x", "type": "nominal"},
    "y": {"field": "y", "type": "nominal"},
    "color": {"field": "value", "type": "quantitative"}
  }
}
```

### Donut Chart
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"category": "A", "value": 30},
    {"category": "B", "value": 45},
    {"category": "C": "value": 25}
  ]},
  "mark": {"type": "arc", "innerRadius": 50},
  "encoding": {
    "theta": {"field": "value", "type": "quantitative"},
    "color": {"field": "category", "type": "nominal"}
  }
}
```

### Multi-series Line
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "values": [
    {"month": 1, "series": "A", "value": 28},
    {"month": 2, "series": "A", "value": 55},
    {"month": 1, "series": "B", "value": 35},
    {"month": 2, "series": "B", "value": 48}
  ]},
  "mark": "line",
  "encoding": {
    "x": {"field": "month", "type": "ordinal"},
    "y": {"field": "value", "type": "quantitative"},
    "color": {"field": "series", "type": "nominal"}
  }
}
```

## When to Use Vega Instead of Vega-Lite

- **Radar charts** — Vega-Lite doesn't support natively
- **Word clouds** — Requires Vega's force simulation
- **Force-directed graphs** — Network visualizations
- **Custom mark types** — When you need full control

## References

- [examples.md](references/examples.md) — Stacked bar, grouped bar, multi-series line, area, heatmap, radar, word cloud, and interactive chart examples
