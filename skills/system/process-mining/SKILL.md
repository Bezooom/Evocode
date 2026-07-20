---
name: process-mining
domain: general
pack: general
tier: optional
triggers:
  - process mining
description: >
  TRIGGER when: user asks to discover processes from event logs, generate event logs,
  analyze process conformance, visualize business processes, BPMN diagrams, XES files,
  process mining, process discovery, conformance checking, process optimization,
  "найди процесс из логов", "BPMN диаграмма", "XES лог", "анализ процесса", "визуализация процесса".
  Also trigger when user asks to extract processes from documents/meetings, track process changes,
  build process presentations, or apply ML for process anomaly detection.
---

# Process Mining — Comprehensive Event Log Analysis & Business Process Optimization

A full-stack process mining pipeline encompassing event log parsing, process discovery, conformance checking, machine learning optimization, and presentation-ready reporting.

## 1. Core Workflow

### Step 1: Understand Input Data Sources
Determine the source of the process data:
- **Event Logs (CSV/XES)**: Identify `case_id`, `activity`, `timestamp`, and `resource` columns.
- **Documents (PDF/DOCX/PPTX)**: Extract process descriptions from organizational documents using unified extraction (PyMuPDF, mammoth, markitdown).
- **Meeting Transcripts**: Mine organizational processes, decision-making flows, and bottlenecks directly from meeting transcripts.
- **Natural Language**: Confirm process steps and decision points directly with the user.

### Step 2: Choose Analysis Approach
- **Process Discovery**: Raw event log → BPMN diagram / Petri net.
- **Conformance Checking**: Event log + BPMN model → Gap analysis, fitness score.
- **Process ML & Predictive Monitoring**: Predict next events, detect anomalies, forecast SLA violations.
- **Process Simulation & Log Generation**: Generate synthetic logs from a BPMN model.
- **Incident & Bottleneck Detection**: Identify process failures, root causes, and suggest remediations.

### Step 3: Design Sketch (ASCII)
Always produce an ASCII sketch first to confirm the process flow with the user:
```
Direction: left-to-right | Nodes: 6 | Type: flow
[primary] Order In  →  [process] Validate  →  [decision] Fraud?
                                                       ↓ Yes
                                                 [error] Manual Review
                                                       ↓ No
                       [process] Pick Items  ←  [process] Check Stock
```
**STOP — Wait for user confirmation before proceeding.**

---

## 2. Advanced Process Extraction (Documents & Meetings)

When structured event logs are unavailable, processes can be mined from unstructured data:

### Document Extraction
Extract process flows from manuals, SOPs, or policy documents:
- **PDFs (Scientific/Technical)**: Use `PyMuPDF` for high-fidelity text/table extraction.
- **DOCX**: Use `mammoth` to preserve document structure and extract process lists.
- **Images/Scans**: Use `markitdown` with OCR to read scanned process diagrams.

### Meeting Transcript Mining
Analyze meeting transcripts to discover hidden organizational processes:
- **Identify actors**: Map who makes decisions vs. who executes tasks.
- **Discover approval chains**: Track informal approvals and handoffs.
- **Highlight bottlenecks**: Pinpoint where processes stall (e.g., "we are always waiting for X").

---

## 3. Process Discovery & Conformance

### Discovery Algorithms (via `pm4py`)
- **Alpha Miner**: Simple, clean logs (outputs BPMN with loops).
- **Heuristics Miner**: Noisy, real-world logs (outputs Petri net / BPMN).
- **Inductive Miner**: Complex, overlapping processes (outputs block-structured models).

### Conformance Checking
- **Token-based Replay**: Measures how well the log fits the model (Fitness).
- **Trace Alignment**: Pinpoints exactly where a trace deviates from the standard model.
- **Gap Analysis**: Identifies missing/extra paths, unauthorized activities, or skipped compliance steps.

---

## 4. Machine Learning & Process Optimization

Apply ML to optimize processes and predict outcomes:

### Predictive Process Monitoring
- **Next-Event Prediction**: Train sequence models (LSTMs or Transformers) on event logs to predict the next likely activity for an ongoing case.
- **Time-Series Forecasting**: Use `TimesFM` or similar models to forecast case volumes, seasonal throughput, and resource demand.

### Anomaly & Incident Detection
Treat process deviations like infrastructure incidents:
- **Detect**: Monitor ongoing cases for SLA breaches or anomalous loops.
- **Triage**: Classify severity (e.g., P0: Compliance breach, P2: Minor delay).
- **Diagnose**: Analyze root causes (e.g., resource bottlenecks, missing data).
- **Learn**: Update the process model to accommodate valid exceptions, or implement guards to prevent invalid ones.

### Process Change Tracking
Generate process changelogs to track evolution:
- Compare process models over time.
- Categorize changes: ✨ New Activities, 🔧 Streamlined Paths, 🐛 Compliance Fixes.
- Output customer/stakeholder-friendly process release notes.

---

## 5. Output Formats & Visualization

After ASCII confirmation, generate the requested output formats.

### Structural Outputs
1. **Mermaid Flowchart**: Markdown embedded. Use semantic coloring, subgraphs, and proper shapes.
2. **draw.io XML**: Professional `.drawio` file with FlowForge `tech-blue` theme and layout algorithms.
3. **BPMN XML**: Standard BPMN 2.0 format (`<bpmn:process>`, `<bpmn:task>`, `<bpmn:exclusiveGateway>`).

### Advanced Data Visualization (Vega-Lite & Matplotlib)
Instead of basic graphs, generate advanced process metrics:
- **Sankey Diagrams**: Visualize case flow volumes between activities.
- **Cycle Time Heatmaps**: Show average transition times between steps.
- **Resource Utilization Charts**: Bar charts tracking workload across `org:resource`.

---

## 6. Reporting & Presentations

Communicate process mining results effectively to stakeholders.

### Process Reports (LaTeX & Markdown)
- **Professional Reports**: Use LaTeX `scientific_report.sty` for formal process audits. Include styled boxes for `\begin{keyfindings}`, `\begin{methodology}`, and `\begin{recommendations}`.
- **Infocards**: For quick Markdown summaries, use HTML/CSS embedded infocards (magazine-style typography, high contrast, clean structure) to highlight key bottlenecks or KPI improvements.

### Scientific/Business Slides
Generate stunning presentation slides for process mining readouts:
1. **Plan the deck**: Introduction → Discovered Model → Conformance Gaps → Bottleneck Analysis → Recommendations.
2. **Generate visuals**: Create high-quality flowcharts, Sankey diagrams, or conceptual schematics for each slide.
3. **Format**: Use a visual-first approach (minimal text, 1-2 key insights per slide). Combine into PDF using programmatic slide generation or assemble via PPTX workflows.

---

## 7. Python Toolkit & Examples

### Required Packages
```bash
pip install pm4py xes-mine networkx matplotlib pandas scikit-learn
```

### Example: Full Discovery & Conformance Pipeline
```python
import pm4py
from pm4py.objects.log.importer.csv import importer as csv_importer

# 1. Load event log
log = pm4py.read_event_log_csv("orders.csv",
    case_id_column="case",
    activity_column="activity",
    timestamp_column="timestamp",
    resource_column="resource"
)

# 2. Discover process model (Inductive Miner)
bpmn = pm4py.discover_bpmn_inductive(log)

# 3. Check conformance
fitness = pm4py.conformance_fitness(log, bpmn)
precision = pm4py.conformance_precision(log, bpmn)

# 4. Extract process variants
variants, freqs = pm4py.process_mining(log)

# 5. Save model
pm4py.write_bpmn(bpmn, "discovered_process.bpmn")
```

### Quality Assurance Checklist
- **Mermaid**: `accTitle`/`accDescr` included, nodes < 30 per graph, valid semantic `snake_case` IDs.
- **draw.io**: No overlapping nodes, consistent spacing, orthogonal arrows.
- **BPMN**: Proper namespaces, valid gateway semantics (XOR/AND/OR).
- **Reports/Slides**: High-contrast visuals, minimal text, actionable bottleneck insights clearly highlighted.
