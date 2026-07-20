---
name: paperclip-create-agent
domain: agent
pack: agent
tier: optional
triggers:
  - paperclip create agent
description: >
  Создание и настройка новых агентов в системе Paperclip с учетом ограничений бюджетов,
  прав доступа и ролевых шаблонов. Используй при найме новых ботов в компанию.
---

# Paperclip Create Agent

Позволяет создавать новых агентов в вашей виртуальной компании. Требует наличия прав администратора или флага `can_create_agents=true`.

## Шаги найма агента

1.  **Получить список доступных адаптеров:**
    ```bash
    curl -sS "$PAPERCLIP_API_URL/llms/agent-configuration.txt" -H "Authorization: Bearer $PAPERCLIP_API_KEY"
    ```
2.  **Получить доступные иконки агентов:**
    ```bash
    curl -sS "$PAPERCLIP_API_URL/llms/agent-icons.txt" -H "Authorization: Bearer $PAPERCLIP_API_KEY"
    ```
3.  **Составить конфигурацию найма:**
    Основные параметры JSON-тела:
    *   `name`: Имя агента (например, "DevOps Bot").
    *   `role`: Роль (например, `coder`, `uxdesigner`, `cto`).
    *   `reportsTo`: ID вышестоящего агента (цепочка подчинения).
    *   `adapterType`: Тип адаптера (например, `codex_local`, `claude_local`).
    *   `instructionsBundle`: Пакет файлов инструкций (обязательно передавать файл `AGENTS.md` с подробным описанием задач роли).
    *   `desiredSkills`: Системные навыки, устанавливаемые агенту на старте.
    *   `runtimeConfig`: Конфигурация запуска (heartbeat таймеры и лимиты бюджета).

4.  **Отправить запрос на создание:**
    ```bash
    curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-hires" \
      -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "CTO",
        "role": "cto",
        "title": "Chief Technology Officer",
        "icon": "crown",
        "reportsTo": "<ceo-agent-id>",
        "adapterType": "codex_local",
        "instructionsBundle": {"files": {"AGENTS.md": "You are the CTO..."}},
        "runtimeConfig": {"heartbeat": {"enabled": false, "wakeOnDemand": true}}
      }'
    ```

5.  **Контроль утверждения (Governance):**
    Если в компании включено правило `requireBoardApprovalForNewAgents`, созданный агент перейдет в статус `pending_approval`. В этом случае будет создан объект утверждения (Approval). Для отслеживания его статуса используйте:
    ```bash
    curl -sS "$PAPERCLIP_API_URL/api/approvals/<approval-id>"
    ```
