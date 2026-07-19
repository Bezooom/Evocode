# Checklist — Чек-лист качества

Проверка после генерации. P0 — критические, P1 — важные, P2 — полировка.

---

## 🔴 P0 · Критические

### 1. Классы определены
- [ ] Все классы из layouts.md есть в `<style>` template.html
- [ ] Нет опечаток в названиях классов

### 2. Нет emoji
- [ ] Только Lucide иконки (`<i data-lucide="...">`)
- [ ] Никаких `😀` `🎯` `💡` в контенте

### 3. Изображения
- [ ] В сетках: `height:Nvh`, НЕ `aspect-ratio`
- [ ] Стандартные пропорции: 16:10, 4:3, 3:2, 1:1, 16:9
- [ ] `object-position:top center`
- [ ] Пути: `images/filename.ext`

### 4. Тема-ритм
- [ ] Нет 3+ страниц подряд одной темы
- [ ] 8+ страниц → ≥1 `hero dark` + ≥1 `hero light`
- [ ] Есть и `light`, и `dark` body страницы

### 5. Заголовки
- [ ] Нет 1-символьных строк
- [ ] `h-hero` ≤ 5 символов, `white-space:nowrap`
- [ ] Длинные заголовки с `<br>` в логических местах

### 6. Шрифты
- [ ] Заголовки = serif (Noto Serif SC / Playfair)
- [ ] Body = sans-serif (Noto Sans SC / Inter)
- [ ] Мета = monospace (IBM Plex Mono)

### 7. chrome ≠ kicker
- [ ] chrome = стабильный рубрикатор
- [ ] kicker = уникальный для каждой страницы

---

## 🟡 P1 · Важные

### 8. Hero-ритм
- [ ] Hero каждые 3-4 страницы
- [ ] Не 2+ hero подряд
- [ ] Не 4+ non-hero подряд

### 9. Терминология
- [ ] Единый стиль терминов (Skills, Harness, Pipeline)
- [ ] Не переводить жаргон

### 10. Страница
- [ ] Chrome page format `NN / TOTAL`
- [ ] Нет дублирования page numbers

---

## 🟢 P2 · Полировка

### 11. WebGL
- [ ] Hero dark: mask 12-15%
- [ ] Hero light: mask 16-20%
- [ ] Body: mask 92-95%

### 12. Изображения
- [ ] `border-radius:4px` на `frame-img`
- [ ] Без тяжёлых теней / рамок

### 13. Навигация
- [ ] ← → работают
- [ ] Точки соответствуют количеству страниц
- [ ] ESC overview работает

---

## Final Checklist

```
Pre-flight
  [ ] Прочитан <style> template.html
  [ ] Выбран Layout для каждой страницы
  [ ] Написана тема-ритм таблица
  [ ] Ритм-таблица: нет 3+ same, есть hero dark + hero light
  [ ] <title> заменён (grep "[必填]" = 0)

Content
  [ ] Распределение по актам сбалансировано
  [ ] Нет emoji
  [ ] Термины едины
  [ ] kicker + title + body — 3 уровня

Layout
  [ ] Нет 1-char line breaks
  [ ] Grid images: height:Nvh
  [ ] Images only crop bottom
  [ ] Serif/sans-serif分工
  [ ] Pipeline groups separated

Visual
  [ ] Hero/non-hero alternating
  [ ] WebGL visible on hero
  [ ] Images have subtle radius
  [ ] No heavy shadows/borders

Interaction
  [ ] ← → navigation works
  [ ] Dot count matches total pages
  [ ] Chrome page numbers correct
  [ ] ESC overview works
```
