---
name: monoscope
description: |
  [RU] Навык для работы с Monoscope — open-source observability платформой. Используй для поиска логов, метрик, трейсов, управления мониторами и дашбордами через MCP-сервер или CLI.
  [EN] Skill for Monoscope — an open-source observability platform. Use for searching logs, metrics, traces, managing monitors and dashboards via MCP server or CLI.
---

# Monoscope Observability

Monoscope is an open-source observability platform that stores telemetry data in S3-compatible storage. It allows querying logs, traces, and metrics with natural language and AI agents.

## MCP Server Integration

Monoscope exposes an MCP server for AI agents:
`POST https://api.monoscope.tech/api/v1/mcp` (or self-hosted path).

Authentication requires an API key passed as a Bearer token:
`Authorization: Bearer <your-api-key>`

### Available Tools
All public REST endpoints are exposed as MCP tools (verb-first snake_case).
- `search_events`: Search logs and traces.
- `list_monitors`, `create_monitor`, `mute_monitor`, `delete_monitor`
- `list_dashboards`, `apply_dashboard`, `get_dashboard_yaml`
- `list_issues`, `get_issue`, `analyze_issue` (fetches issue and asks LLM for probable cause)
- `search_events_nl`: Natural-language to KQL query planner and search.
- `find_error_patterns`: Top log patterns.

## CLI Usage

When MCP is not available, use the `monoscope` CLI. Set `MONOSCOPE_AGENT_MODE=1` to force JSON output and disable interactive prompts.

### Pipeline Examples:
1. What services exist?
   `monoscope facets resource.service.name --top 1 | jq -r '.["resource.service.name"][0].value'`
2. Grab an error event:
   `monoscope logs search 'severity.text=="error"' --service "$SVC" --first --id-only`
3. Get context around an event:
   `monoscope events context --window 5m --summary --at <timestamp>`
4. Acknowledge open issues:
   `monoscope issues list --service "$SVC" --status open | jq -r '.data[].id' | xargs -I {} monoscope issues ack {}`

## When to use
Use this skill when the user asks to investigate incidents, triage alerts, search logs/telemetry, or write KQL queries for Monoscope.
