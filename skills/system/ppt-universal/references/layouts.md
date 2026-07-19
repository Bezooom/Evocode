# Layouts — Система раскладок

10预设 раскладок для HTML Web PPT. Каждая — готовый `<section>` для вставки.

---

## ⚠️ Pre-flight

### A. Классы из template.html
Все классы (`h-hero`, `h-xl`, `h-sub`, `h-md`, `lead`, `kicker`, `stat-card`, `stat-label`, `stat-nb`, `stat-unit`, `stat-note`, `pipeline-section`, `pipeline-label`, `pipeline`, `step`, `step-nb`, `step-title`, `step-desc`, `grid-2-7-5`, `grid-2-6-6`, `grid-2-8-4`, `grid-3-3`, `grid-6`, `frame`, `frame-img`, `img-cap`, `callout`, `callout-src`) должны быть определены в `<style>` template.html.

### B. Тема-ритм

| Layout | Default | Reason |
|---|---|---|
| 1. Cover | `hero dark` | Opening impact |
| 2. Divider | `hero light` / `hero dark` alternate | Breath |
| 3. Big Numbers | `light` | Numbers on white |
| 4. Quote + Image | alternate `light`/`dark` | Body rhythm |
| 5. Image Grid | `light` | Screenshots need bright |
| 6. Pipeline | `light` | Flow clarity |
| 7. Question | `hero dark` | Visual impact |
| 8. Big Quote | `dark` prefer | Quote ceremony |
| 9. Before/After | `light` | Dual-column clarity |
| 10. Lead Image | alternate `light`/`dark` | Rhythm |

**Rules:**
- No 3+ consecutive same-theme pages
- 8+ pages → ≥1 `hero dark` + ≥1 `hero light`
- Must have both `light` and `dark` body pages
- Insert hero every 3-4 pages

### C. Изображения
- Grid: `height:Nvh`, no `aspect-ratio`
- Single: `aspect-ratio + max-height`
- Standard ratios: 16:10, 4:3, 3:2, 1:1, 16:9
- `object-position:top center`, only crop bottom

---

## 0. Базовая структура

```html
<section class="slide [light|dark|hero light|hero dark]">
  <div class="chrome">
    <div>栏目 · Sub</div>
    <div>Page / Total</div>
  </div>
  <!-- content -->
  <div class="foot">
    <div>Description</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 1: Обложка (Hero Cover)

```html
<section class="slide hero dark">
  <div class="chrome">
    <div>Talk · 2026.04</div>
    <div>Vol.01</div>
  </div>
  <div class="frame" style="display:grid;gap:4vh;align-content:center;min-height:80vh">
    <div class="kicker">私享会 · Topic</div>
    <h1 class="h-hero">Заголовок</h1>
    <h2 class="h-sub">Подзаголовок</h2>
    <p class="lead" style="max-width:60vw">Описание презентации.</p>
    <div class="meta-row">
      <span>Автор</span><span>·</span><span>Роль / Компания</span>
    </div>
  </div>
  <div class="foot">
    <div>Тема · 2026</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 2: Переход (Act Divider)

```html
<section class="slide hero light">
  <div class="chrome">
    <div>Act I · Данные</div>
    <div>Act I · 01 / 20</div>
  </div>
  <div class="frame" style="display:grid;gap:6vh;align-content:center;min-height:80vh">
    <div class="kicker">Act I</div>
    <h1 class="h-hero" style="font-size:8.5vw">Данные</h1>
    <p class="lead" style="max-width:55vw">Один абзац введения.</p>
  </div>
  <div class="foot">
    <div>Введение</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 3: Крупные цифры (Big Numbers)

```html
<section class="slide light">
  <div class="chrome">
    <div>Контекст · Статистика</div>
    <div>02 / 20</div>
  </div>
  <div class="frame" style="padding-top:6vh">
    <div class="kicker">Заголовок секции</div>
    <h2 class="h-xl">Тема</h2>
    <p class="lead" style="margin-bottom:5vh">Краткое описание.</p>
    <div class="grid-6" style="margin-top:6vh">
      <div class="stat-card">
        <div class="stat-label">Label</div>
        <div class="stat-nb">123 <span class="stat-unit">K</span></div>
        <div class="stat-note">Комментарий</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Label</div>
        <div class="stat-nb">456</div>
        <div class="stat-note">Комментарий</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Label</div>
        <div class="stat-nb">789</div>
        <div class="stat-note">Комментарий</div>
      </div>
      <!-- ещё 3 stat-card -->
    </div>
  </div>
  <div class="foot">
    <div>Источник · 2026</div>
    <div>Numbers</div>
  </div>
</section>
```

---

## Layout 4: Текст + Изображение

```html
<section class="slide light">
  <div class="chrome">
    <div>Контекст · Раздел</div>
    <div>03 / 20</div>
  </div>
  <div class="frame grid-2-7-5" style="padding-top:6vh">
    <div style="display:flex;flex-direction:column;justify-content:space-between;gap:3vh">
      <div>
        <div class="kicker">BUT</div>
        <h2 class="h-xl" style="white-space:nowrap;font-size:7.2vw">Заголовок</h2>
        <p class="lead" style="margin-top:3vh">Основной текст слайда.</p>
      </div>
      <div class="callout">
        "Цитата или ключевая мысль."
        <div class="callout-src">— Источник</div>
      </div>
    </div>
    <figure class="frame-img" style="aspect-ratio:16/10;max-height:56vh">
      <img src="images/03-image.jpg" alt="Описание">
      <figcaption class="img-cap">Источник · 2026</figcaption>
    </figure>
  </div>
  <div class="foot">
    <div>Page 03 · Topic</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 5: Сетка изображений

```html
<section class="slide light">
  <div class="chrome">
    <div>Контекст · Скриншоты</div>
    <div>05 / 20</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker">Доказательства</div>
    <h2 class="h-xl">Заголовок</h2>
    <div class="grid-3-3" style="margin-top:4vh">
      <figure class="frame-img" style="height:26vh">
        <img src="images/05a.png" alt="A">
        <figcaption class="img-cap">A</figcaption>
      </figure>
      <figure class="frame-img" style="height:26vh">
        <img src="images/05b.png" alt="B">
        <figcaption class="img-cap">B</figcaption>
      </figure>
      <figure class="frame-img" style="height:26vh">
        <img src="images/05c.png" alt="C">
        <figcaption class="img-cap">C</figcaption>
      </figure>
      <figure class="frame-img" style="height:26vh">
        <img src="images/05d.png" alt="D">
        <figcaption class="img-cap">D</figcaption>
      </figure>
      <figure class="frame-img" style="height:26vh">
        <img src="images/05e.png" alt="E">
        <figcaption class="img-cap">E</figcaption>
      </figure>
      <figure class="frame-img" style="height:26vh">
        <img src="images/05f.png" alt="F">
        <figcaption class="img-cap">F</figcaption>
      </figure>
    </div>
  </div>
  <div class="foot">
    <div>Скриншоты · 2026</div>
    <div>Page 05</div>
  </div>
</section>
```

---

## Layout 6: Pipeline (Воронка / Процесс)

```html
<section class="slide light">
  <div class="chrome">
    <div>Процесс · Workflow</div>
    <div>10 / 20</div>
  </div>
  <div class="frame">
    <div class="kicker">Pipeline</div>
    <h2 class="h-xl">Название процесса</h2>
    <div class="pipeline-section">
      <div class="pipeline-label">Группа A</div>
      <div class="pipeline">
        <div class="step">
          <div class="step-nb">01</div>
          <div class="step-title">Шаг</div>
          <div class="step-desc">Описание шага.</div>
        </div>
        <div class="step">
          <div class="step-nb">02</div>
          <div class="step-title">Шаг</div>
          <div class="step-desc">Описание шага.</div>
        </div>
        <!-- ... -->
      </div>
    </div>
    <div class="pipeline-section">
      <div class="pipeline-label">Группа B</div>
      <div class="pipeline">
        <!-- steps -->
      </div>
    </div>
  </div>
  <div class="foot">
    <div>Page 10 · Workflow</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 7: Вопрос (Hero Question)

```html
<section class="slide hero dark">
  <div class="chrome">
    <div>Вопрос</div>
    <div>15 / 20</div>
  </div>
  <div class="frame" style="display:grid;gap:8vh;align-content:center;min-height:80vh">
    <div class="kicker">The Question</div>
    <h1 class="h-hero" style="font-size:7vw;line-height:1.15">
      Ваш вопрос<br>в три строки?
    </h1>
    <p class="lead" style="max-width:50vw">Один абзац размышления.</p>
  </div>
  <div class="foot">
    <div>Page 15 · Question</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 8: Крупная цитата (Big Quote)

```html
<section class="slide dark">
  <div class="chrome">
    <div>Takeaway · Инсайт</div>
    <div>12 / 20</div>
  </div>
  <div class="frame" style="display:grid;gap:5vh;align-content:center;min-height:80vh">
    <div class="kicker">Quote</div>
    <blockquote style="font-family:var(--serif-zh);font-weight:700;font-size:5.8vw;line-height:1.2;max-width:72vw">
      "Ключевая цитата<br>в две строки."
    </blockquote>
    <p class="lead" style="max-width:55vw;opacity:.65">
      English version or elaboration.
    </p>
    <div class="meta-row">
      <span>— Автор</span><span>·</span><span>2026</span>
    </div>
  </div>
  <div class="foot">
    <div>Page 12 · Quote</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Layout 9: До / После (Before / After)

```html
<section class="slide light">
  <div class="chrome">
    <div>Shift · Сравнение</div>
    <div>08 / 20</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker">Before / After</div>
    <h2 class="h-xl" style="margin-bottom:4vh">Заголовок сравнения</h2>
    <div class="grid-2-6-6" style="gap:5vw 4vh">
      <div style="padding:3vh 2vw;border-left:3px solid currentColor;opacity:.55">
        <div class="kicker" style="opacity:.9">Before</div>
        <h3 class="h-md" style="margin-top:2vh">Старый подход</h3>
        <ul style="margin-top:3vh;padding-left:1.2em;display:flex;flex-direction:column;gap:1.4vh;font-family:var(--sans-zh);font-size:max(14px,1.1vw);line-height:1.55">
          <li>Пункт 1</li>
          <li>Пункт 2</li>
          <li>Пункт 3</li>
        </ul>
      </div>
      <div style="padding:3vh 2vw;border-left:3px solid currentColor">
        <div class="kicker" style="opacity:.9">After</div>
        <h3 class="h-md" style="margin-top:2vh">Новый подход</h3>
        <ul style="margin-top:3vh;padding-left:1.2em;display:flex;flex-direction:column;gap:1.4vh;font-family:var(--sans-zh);font-size:max(14px,1.1vw);line-height:1.55">
          <li>Пункт 1</li>
          <li>Пункт 2</li>
          <li>Пункт 3</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="foot">
    <div>Page 08 · Shift</div>
    <div>Before / After</div>
  </div>
</section>
```

---

## Layout 10: Плотный контент + Изображение

```html
<section class="slide light">
  <div class="chrome">
    <div>Контекст · Раздел</div>
    <div>06 / 20</div>
  </div>
  <div class="frame grid-2-8-4" style="padding-top:6vh">
    <div>
      <div class="kicker">Phase 01</div>
      <h2 class="h-xl" style="margin-top:1vh;margin-bottom:3vh">Заголовок</h2>
      <p class="lead" style="margin-bottom:3vh">Ведущий абзац.</p>
      <p style="font-family:var(--sans-zh);font-size:max(14px,1.15vw);line-height:1.75;opacity:.78;margin-bottom:2.4vh">
        Основной текст слайда.
      </p>
      <div class="callout" style="margin-top:3vh">
        "Цитата."
        <div class="callout-src">— Источник</div>
      </div>
    </div>
    <figure class="frame-img" style="aspect-ratio:3/4;max-height:60vh">
      <img src="images/06-image.jpg" alt="Описание">
      <figcaption class="img-cap">Источник</figcaption>
    </figure>
  </div>
  <div class="foot">
    <div>Page 06 · Topic</div>
    <div>— · —</div>
  </div>
</section>
```

---

## Grid reference

| Class | Ratio | Use |
|---|---|---|
| `.grid-2-6-6` | 1:1 | Split |
| `.grid-2-7-5` | 7:5 | Text + image |
| `.grid-2-8-4` | 2:1 | Text + small image |
| `.grid-3` | 3 equal | 3 items |
| `.grid-3-3` | 3×2 | 6 images |
| `.grid-6` | 3×2 | 6 stat cards |
