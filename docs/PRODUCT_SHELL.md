# Product shell — без Microsoft, настройки как у IDE

## Почему «система думала, что это VS Code»

Launcher раньше вызывал **`code`** (Microsoft).  
Тогда неизбежно:

- док/WM_CLASS = Code  
- логотипы About/splash = VS Code  
- «Эвокод» = extension поверх

**Исправление:** только **VSCodium** (flatpak уже ставится) или своя сборка.

## Запуск сейчас

```bash
# VSCodium без Microsoft (уже: flatpak --user)
flatpak info --user com.vscodium.codium

cd /home/bezoom/storage/Projects/Evocode
npm run ide:install-desktop
npm run ide:install-shell
npm run evocode
```

**Не** запускайте ярлык Microsoft VS Code.  
**Не** используйте `code` (заблокирован, пока не `EVOCODE_ALLOW_CODE=1`).

Меню приложений → **Эвокод** (иконка синяя «Э»).

## Нативный chrome (не «расширение Kilo»)

### В сайдбаре агента остаются только
- **Новая задача**
- **История**

### Вынесено на toolbar IDE (editor title + status bar)
| Кнопка | Где |
|--------|-----|
| Настройки | editor title · status bar · Ctrl+, |
| Менеджер агентов | editor title · status bar · Ctrl+Shift+A |
| Профиль | editor title · status bar |
| Модели | editor title · status bar · Ctrl+Shift+M |
| Чат агента | editor title · Ctrl+L |

### Удалено
- **Marketplace** (команды + меню + palette) — не нужен

### Settings IDE
- **Ctrl+,** → стандартный UI Settings, группа **Эвокод**
- **Ctrl+Shift+M** → панель **Модели** (runtime LLM)

Совместимость с брендом «Kilo» **не цель** — только фичи, упакованные как Эвокод.

## Иконки / лого VSCodium

VSCodium flatpak = лого **VSCodium**, не Microsoft, но ещё не «Эвокод» на splash.  
Полная замена splash/About:

```bash
npm run ide:build-codium   # долго, свой product.json + иконки
```

## Проверка

```bash
# должен писать flatpak codium, НЕ code
npm run evocode
# в доке — не синий Microsoft Code
```
