---
name: paperclip-orchestration
domain: agent
pack: agent
tier: optional
triggers:
  - paperclip orchestration
description: >
  Координация и управление задачами в рамках автономных агентств Paperclip.
  Описывает жизненный цикл агента (heartbeats), аутентификацию, процедуру
  получения задач (checkout), а также управление локальной средой разработки
  (worktrees) и запуск долгоживущих серверов через tmux.
---

# Paperclip Orchestration

Paperclip — это система управления и координации распределенных AI-агентов. Агент просыпается по расписанию (**heartbeats**), забирает назначенные задачи, выполняет полезную работу и засыпает.

## Жизненный цикл Heartbeat

Каждое пробуждение агента должно следовать строгому регламенту:

1.  **Получение личности:** `GET /api/agents/me` (проверка ролей, бюджетов).
2.  **Запрос входящих задач (Inbox):** `GET /api/agents/me/inbox-lite`.
3.  **Выбор задачи по приоритету:** `in_progress` → `in_review` (при наличии комментариев) → `todo`.
4.  **Блокировка задачи (Checkout):**
    ```http
    POST /api/issues/{issueId}/checkout
    Headers: Authorization: Bearer $PAPERCLIP_API_KEY, X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
    ```
    Каждая мутация должна содержать заголовок `X-Paperclip-Run-Id` для отслеживания цепочки событий.
5.  **Получение контекста:** `GET /api/issues/{issueId}/heartbeat-context`.
6.  **Выполнение работы:** Доставка промежуточных результатов в комментарии, закрытие зависимых тасок.
7.  **Делегирование/Блокировки:** Создание дочерних задач или перевод текущей задачи в статус `blocked` (с указанием блокирующего ID в `blockedByIssueIds`).

---

## Локальная разработка и Git Worktrees

Управление локальным экземпляром Paperclip должно осуществляться строго через интерфейс CLI `paperclipai`:

*   **Запуск сервера:** `npx paperclipai run` или `pnpm dev`
*   **Изолированные окружения (Worktrees):**
    Создание изолированной ветки с собственной БД и портом:
    ```bash
    npx paperclipai worktree:make feature-branch --start-point origin/main
    cd <worktree-path>
    eval "$(npx paperclipai worktree env)"
    npx paperclipai run
    ```
*   **Слияние истории:** `npx paperclipai worktree:merge-history --from paperclip-feature --to current --apply`
*   **Очистка:** `npx paperclipai worktree:cleanup feature-branch`

> ⚠️ **ПРАВИЛО:** Категорически запрещено выполнять прямые манипуляции с Postgres (`pg_dump`, `createdb`, удаление каталогов `db/`). Все операции должны идти через CLI `paperclipai`.

---

## Долгоживущие тестовые серверы через `tmux`

Так как heartbeat-сессия агента завершается быстро, любые запускаемые локально dev-серверы для ручного тестирования должны запускаться в изолированных сессиях `tmux`, иначе они будут немедленно убиты после завершения работы агента.

1.  **Запуск:**
    ```bash
    tmux new-session -d -s <session-name> 'pnpm dev'
    ```
2.  **Проверка:**
    ```bash
    tmux has-session -t <session-name> 2>/dev/null && echo "running"
    ```
3.  **Чтение вывода:** `tmux capture-pane -t <session-name> -p`
4.  **Остановка:** `tmux kill-session -t <session-name>`
