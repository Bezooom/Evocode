# Themes — Система цветовых тем

5预设 тем для HTML Web PPT. Заменить `:root` блок в template.html.

---

## 🖋 墨水经典 (Monocle Classic)

```css
--ink:#0a0a0b;
--ink-rgb:10,10,11;
--paper:#f1efea;
--paper-rgb:241,239,234;
--paper-tint:#e8e5de;
--ink-tint:#18181a;
```

**Подходит:** Универсальная, бизнес, конференции, продукты

---

## 🌊 靛蓝瓷 (Indigo Porcelain)

```css
--ink:#0a1f3d;
--ink-rgb:10,31,61;
--paper:#f1f3f5;
--paper-rgb:241,243,245;
--paper-tint:#e4e8ec;
--ink-tint:#152a4a;
```

**Подходит:** Технологии, наука, data, tech talks

---

## 🌿 森林墨 (Forest Ink)

```css
--ink:#1a2e1f;
--ink-rgb:26,46,31;
--paper:#f5f1e8;
--paper-rgb:245,241,232;
--paper-tint:#ece7da;
--ink-tint:#253d2c;
```

**Подходит:** Экология, культура, природа, sustainability

---

## 🍂 牛皮纸 (Kraft Paper)

```css
--ink:#2a1e13;
--ink-rgb:42,30,19;
--paper:#eedfc7;
--paper-rgb:238,223,199;
--paper-tint:#e0d0b6;
--ink-tint:#3a2a1d;
```

**Подходит:** Ностальгия, литература, история, indie

---

## 🌙 沙丘 (Dune)

```css
--ink:#1f1a14;
--ink-rgb:31,26,20;
--paper:#f0e6d2;
--paper-rgb:240,230,210;
--paper-tint:#e3d7bf;
--ink-tint:#2d2620;
```

**Подходит:** Арт, дизайн, fashion, galleries

---

## Rules

- Одна тема на всю презентацию
- Не миксовать (ink из одной, paper из другой)
- Не принимать произвольные hex от пользователя
- WebGL shader адаптируется ко всем 5 темам
