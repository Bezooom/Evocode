# 🔌 Спецификация адаптера ACP (Agent Client Protocol)

## 1. Введение и цели исследования

**ACP (Agent Client Protocol)** — это специализированный, независимый от редактора протокол прикладного уровня, предназначенный для организации взаимодействия между клиентской средой (IDE, текстовые редакторы, CLI) и автономным рантаймом ИИ-агента (Evocode/Kilo CLI).

### Проблема текущей реализации
На данный момент рантайм агента тесно связан с API хоста расширений VS Code (`vscode.*`). Это делает невозможным использование агента в других популярных редакторах (Neovim, Emacs, JetBrains IDE) или веб-интерфейсах без полного переписывания логики интеграции.

### Цель ACP
Создать унифицированный, расширяемый протокол на базе JSON-RPC 2.0 (по аналогии с Language Server Protocol — LSP и Debug Adapter Protocol — DAP), который позволит любому стороннему редактору выступать в роли клиента для рантайма Эвокод.

---

## 2. Схема архитектуры с ACP-адаптером

```
┌─────────────────────────────────────────────────────────────┐
│ КЛИЕНТЫ (РЕДАКТОРЫ)                                         │
│  VS Code Extension · Neovim (Lua) · JetBrains Plugin · Web  │
└───────────────────────────┬─────────────────────────────────┘
                            │ JSON-RPC 2.0 (WebSocket / Stdio)
                            │ Port: 8085 (default)
┌───────────────────────────▼─────────────────────────────────┐
│ EVOCODE ACP ADAPTER (Core sidecar)                           │
│  Парсинг JSON-RPC, сериализация, управление сессиями        │
└───────────────────────────┬─────────────────────────────────┘
                            │ Внутренний IPC
┌───────────────────────────▼─────────────────────────────────┐
│ AGENT RUNTIME (Kilo CLI / OpenCode)                         │
│  Планировщик задач, выполнение инструментов, VectorIndex     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Спецификация протокола (События и Методы)

Обмен сообщениями строится по спецификации JSON-RPC 2.0.

### 3.1. Инициализация (Client → Server)

При подключении клиент сообщает корневую директорию проекта и свои возможности (capabilities).

**Запрос (`initialize`):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "workspaceRoot": "/home/user/project",
    "clientInfo": {
      "name": "neovim",
      "version": "0.10.0"
    },
    "capabilities": {
      "diffViewer": true,
      "terminalExecution": true,
      "notifications": true
    }
  }
}
```

**Ответ:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "agentVersion": "0.95.0",
    "capabilities": {
      "supportedTools": ["read", "write", "grep", "bash", "playwright"]
    }
  }
}
```

### 3.2. Запуск задачи (Client → Server)

Запуск новой сессии агента с текстовым запросом.

**Запрос (`task/start`):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "task/start",
  "params": {
    "prompt": "Добавь обработку ошибок в src/index.ts",
    "model": "evocode-auto"
  }
}
```

**Ответ (подтверждение запуска):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "taskId": "task_abc123"
  }
}
```

### 3.3. Логирование прогресса (Server → Client, Notification)

Агент сообщает клиенту о своих текущих мыслях и действиях в реальном времени.

**Уведомление (`task/progress`):**
```json
{
  "jsonrpc": "2.0",
  "method": "task/progress",
  "params": {
    "taskId": "task_abc123",
    "status": "busy",
    "thought": "Анализирую структуру файлов для поиска src/index.ts",
    "currentAction": "glob_search"
  }
}
```

### 3.4. Авторизация вызова инструмента (Server → Client)

Если агент хочет выполнить потенциально опасное действие (например, запустить команду в терминале или изменить файл), он запрашивает разрешение у клиента.

**Запрос (`tool/authorize`):**
```json
{
  "jsonrpc": "2.0",
  "id": 100,
  "method": "tool/authorize",
  "params": {
    "taskId": "task_abc123",
    "tool": "bash",
    "arguments": {
      "command": "npm run test"
    },
    "riskLevel": "medium"
  }
}
```

**Ответ клиента (`tool/authorize` response):**
```json
{
  "jsonrpc": "2.0",
  "id": 100,
  "result": {
    "approved": true
  }
}
```

### 3.5. Отображение изменений (Server → Client)

Запрос на показ и применение диффа к файлу.

**Запрос (`diff/apply`):**
```json
{
  "jsonrpc": "2.0",
  "id": 101,
  "method": "diff/apply",
  "params": {
    "taskId": "task_abc123",
    "filePath": "/home/user/project/src/index.ts",
    "diff": "@@ -5,3 +5,5 @@\n+import { ProxyAgent } from 'undici';\n..."
  }
}
```

---

## 4. План реализации адаптера в Эвокод

1.  **Создание транспортного слоя:**
    *   Интегрировать в Core (`src/index.ts`) WebSocket-сервер на отдельном порту `8085` или сделать апгрейд существующего HTTP-сервера.
2.  **Абстракция API Редактора (Editor Bridge):**
    *   Создать абстрактный интерфейс `EditorInterface` с методами `showNotification`, `requestAuthorization`, `showDiff`.
    *   Реализовать две стратегии:
        *   `VSCodeBridge` — использует стандартные вызовы `vscode.window.showInformationMessage` и `vscode.commands.executeCommand`.
        *   `ACPBridge` — пересылает JSON-RPC запросы по WebSocket к подключенному внешнему клиенту.
3.  **Создание демонстрационных клиентов:**
    *   Написать легковесный плагин для **Neovim (Lua)**, транслирующий вызовы в стандартные QuickPick и окна ввода Vim.
    *   Написать автономный CLI-клиент на Python для работы с агентом прямо из терминала.
