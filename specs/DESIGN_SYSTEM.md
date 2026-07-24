# Дизайн-система «Эвокод»

**Версия продукта:** 1.0.1 · **Тема (канон):** *Midnight Fusion*  
**Источник правды в runtime:** `packages/agent-extension/brand/evocode-overrides.css`, product-panel styles.

> Ранее в черновике фигурировал Material Blue (`#1A73E8`). **С v0.5 канон — violet/indigo Midnight Fusion.**

## Overview

Спецификация цветов, типографики, иконок и правил UI «Эвокод».

---

## Цветовая палитра

### Основные цвета (Midnight Fusion)

| Название | HEX | Использование |
|----------|-----|---------------|
| **Primary / Accent** | `#6B5CF6` | Кнопки, focus, progress, composer border |
| **Primary hover** | `#7F71F8` | Hover primary |
| **Link** | `#A397FF` | Ссылки |
| **Background (editor)** | `#0A0B10` | Основной фон редактора |
| **Background (sidebar)** | `#07080C` | Sidebar |
| **Surface / card** | `rgba(19,21,34,0.8)` / `#12141F` | Карточки, input, dropdown |
| **Border** | `#21253B` / `rgba(255,255,255,0.08)` | Границы |
| **Text Primary** | `#E0E2ED` / `#F1F5F9` | Основной текст |
| **Text Muted** | `#8A8FAB` / `#94A3B8` | Вторичный текст |
| **Success** | `#10B981` | Онлайн / OK |
| **Warning** | `#F59E0B` | Предупреждения |
| **Error** | `#EA4335` | Ошибки |
| **Panel accent (settings)** | `#6366F1` | Product panel tabs (indigo sibling) |

### Тёмная тема (по умолчанию)

```css
:root {
  --evocode-primary: #6B5CF6;
  --evocode-primary-hover: #7F71F8;
  --evocode-link: #A397FF;
  --evocode-background: #0A0B10;
  --evocode-sidebar: #07080C;
  --evocode-surface: #12141F;
  --evocode-border: #21253B;
  --evocode-text-primary: #E0E2ED;
  --evocode-text-secondary: #8A8FAB;
  --evocode-success: #10B981;
  --evocode-warning: #F59E0B;
  --evocode-error: #EA4335;
}
```

### Светлая тема (опционально, не ship default)

```css
:root[data-theme="light"] {
  --evocode-primary: #5B4DE8;
  --evocode-background: #F5F5F8;
  --evocode-surface: #FFFFFF;
  --evocode-text-primary: #1A1B23;
  --evocode-text-secondary: #5F6368;
}
```

---

## Типографика

### Шрифты

| Назначение | Шрифт | Семейство |
|------------|-------|-----------|
| **UI** | `system-ui`, `-apple-system`, `sans-serif` | Sans-serif |
| **Code** | `JetBrains Mono` / editor monospace | Monospace |
| **Заголовки** | `system-ui`, `-apple-system`, `sans-serif` | Sans-serif |
| **Текст** | `system-ui`, `-apple-system`, `sans-serif` | Sans-serif |

> **F3.U1 (Выполнено):** Полное отключение загрузки внешних шрифтов из CDN Google Fonts для 100% локальности и автономности. Использование предустановленных высококачественных системных шрифтов.

### Размеры шрифтов

| Элемент | Размер | Вес | Line-height |
|---------|--------|-----|-------------|
| **H1** | 32px | 600 | 1.2 |
| **H2** | 24px | 600 | 1.3 |
| **H3** | 20px | 500 | 1.4 |
| **Body** | 14px | 400 | 1.5 |
| **Small** | 12px | 400 | 1.4 |
| **Code** | 13px | 400 | 1.5 |

### Примеры

```css
h1 {
  font-family: 'Inter', sans-serif;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.2;
}

body {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
}
```

---

## Иконки

### Набор иконок

Эвокод использует иконки из набора **Material Icons** (или аналогичного):

| Иконка | Назначение | Пример использования |
|--------|------------|---------------------|
| `cloud` | Облако | Бейдж «Облако», переключение в облако |
| `memory` | Память | Бейдж «Локально», индикатор VRAM |
| `sync` | Синхронизация | Панель «Навыки», обновление |
| `security` | Безопасность | DLP Guard, приватность |
| `settings` | Настройки | Панель настроек |
| `info` | Информация | Информационные сообщения |
| `warning` | Предупреждение | Предупреждения |
| `error` | Ошибка | Ошибки |
| `check` | Успех | Успешные операции |
| `close` | Закрыть | Закрытие панелей, окон |

### Размеры иконок

| Размер | Применение |
|--------|------------|
| **24px** | Основные иконки в UI |
| **16px** | Вторичные иконки, бейджи |
| **20px** | Иконки в панелях |

### Примеры

```html
<!-- Иконка в кнопке -->
<button>
  <svg class="icon icon-24"><use href="#icon-cloud"></use></svg>
  В облако
</button>

<!-- Иконка в бейдже -->
<span class="badge">
  <svg class="icon icon-16"><use href="#icon-memory"></use></svg>
  Локально
</span>
```

---

## Компоненты UI

### 1. Кнопки

#### Primary Button

```css
.btn-primary {
  background: var(--evocode-primary);
  color: var(--evocode-text-primary);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1557B0;
}
```

#### Secondary Button

```css
.btn-secondary {
  background: var(--evocode-surface);
  color: var(--evocode-text-primary);
  border: 1px solid var(--evocode-secondary);
  padding: 8px 16px;
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--evocode-background);
}
```

#### Icon Button

```css
.btn-icon {
  background: transparent;
  color: var(--evocode-text-primary);
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: var(--evocode-surface);
}
```

### 2. Бейджи

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
}

.badge-local {
  background: var(--evocode-success);
  color: var(--evocode-text-primary);
}

.badge-cloud {
  background: var(--evocode-info);
  color: var(--evocode-text-primary);
}

.badge-warning {
  background: var(--evocode-warning);
  color: var(--evocode-text-primary);
}

.badge-error {
  background: var(--evocode-error);
  color: var(--evocode-text-primary);
}
```

### 3. Панели

```css
.panel {
  background: var(--evocode-surface);
  border: 1px solid var(--evocode-secondary);
  border-radius: 8px;
  padding: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--evocode-text-primary);
}

.panel-content {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--evocode-text-primary);
}
```

### 4. Строка состояния

```css
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--evocode-background);
  border-top: 1px solid var(--evocode-secondary);
  padding: 4px 8px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--evocode-text-secondary);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-icon {
  width: 16px;
  height: 16px;
}
```

### 5. Чат

```css
.chat-container {
  background: var(--evocode-background);
  padding: 16px;
  overflow-y: auto;
}

.chat-message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--evocode-surface);
}

.chat-message-user {
  background: var(--evocode-primary);
  color: var(--evocode-text-primary);
}

.chat-message-assistant {
  background: var(--evocode-surface);
  color: var(--evocode-text-primary);
}

.chat-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--evocode-secondary);
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  background: var(--evocode-background);
  color: var(--evocode-text-primary);
}
```

---

## Правила верстки

### Отступы

| Элемент | Top | Right | Bottom | Left |
|---------|-----|-------|--------|------|
| **Container** | 16px | 16px | 16px | 16px |
| **Panel** | 16px | 16px | 16px | 16px |
| **Button** | 8px | 16px | 8px | 16px |
| **Input** | 4px | 8px | 4px | 8px |
| **Badge** | 2px | 8px | 2px | 8px |

### Сетки

- **Desktop**: 12-колоночная сетка, gutter 16px, margin 16px
- **Tablet**: 8-колоночная сетка, gutter 12px, margin 12px
- **Mobile**: 4-колоночная сетка, gutter 8px, margin 8px

### Breakpoints

| Breakpoint | Width |
|------------|-------|
| **xs** | < 576px |
| **sm** | ≥ 576px |
| **md** | ≥ 768px |
| **lg** | ≥ 992px |
| **xl** | ≥ 1200px |

---

## Анимации

### Переходы

```css
.transition-default {
  transition: all 0.2s ease-in-out;
}

.transition-fast {
  transition: all 0.1s ease-in-out;
}

.transition-slow {
  transition: all 0.3s ease-in-out;
}
```

### Эффекты

- **Hover**: лёгкое затемнение фона (5-10%)
- **Active**: лёгкое уменьшение размера (95%)
- **Focus**: обводка цветом Primary (2px, dashed)
- **Loading**: спиннер с анимацией вращения

---

## Адаптивность

### Desktop

- Панели расположены горизонтально
- Полная ширина контента
- Все функции доступны

### Tablet

- Панели расположены вертикально
- Уменьшенная ширина контента
- Некоторые функции скрыты в меню

### Mobile

- Панели расположены вертикально
- Минимальная ширина контента
- Основные функции в главном меню

---

*Конец дизайн-системы «Эвокод»*
