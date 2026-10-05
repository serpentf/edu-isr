---
name: bootstrap-ui
description: Правила вёрстки фронтенда Edu ISR — только Bootstrap 5.3, без собственного CSS. Загружай перед любым изменением шаблонов, вёрстки или внешнего вида в frontend/ (файлы .vue, index.html, рендер Markdown уроков), при создании новой страницы или компонента и при ревью UI-правок.
---

# Вёрстка Edu ISR: чистый Bootstrap 5.3

## Решение

Весь интерфейс верстается **только средствами Bootstrap 5.3**: компоненты, утилитарные классы, сетка, JS-плагины Bootstrap. Собственного CSS в проекте нет и не должно появляться.

**Почему:**
- Единый визуальный язык без расхождений между страницами: раньше стили жили в `<style scoped>`, инлайн-атрибутах и неподключённом `style.css` и противоречили друг другу.
- Любой разработчик знает Bootstrap: не нужно изучать местные классы.
- Тёмная тема, адаптивность и доступность достаются бесплатно от фреймворка.

Подключение — из npm (версия зафиксирована в `package-lock.json`), в `frontend/src/main.js`:

```js
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap'; // JS-плагины: collapse, dropdown, alert, modal…
```

CDN-ссылки в `index.html` не добавлять.

## Правила

1. **Нет `<style>`** в `.vue`-файлах, нет собственных `.css`/`.scss`-файлов в `src/`. Исключение — готовые темы одобренных виджетов (см. «Сторонние виджеты»).
2. **Нет `style="…"`**. Единственное исключение — значения, которые вычисляются в рантайме и для которых в Bootstrap нет класса: ширина `.progress-bar` (`:style="{ width: pct + '%' }"`) — так делает сама документация Bootstrap.
3. **Только классы Bootstrap.** Не придумывать собственные классы для оформления. Классы-хуки для JS заменять на `ref`.
4. **Идиомы 5.3**, а не устаревшие:

   | Не так | А так |
   |--------|-------|
   | `text-muted` | `text-body-secondary` |
   | `bg-warning text-dark`, `bg-success` на бейджах | `text-bg-warning`, `text-bg-success` |
   | `bg-light` на фоне страницы или карточки | `bg-body-tertiary` |
   | `bg-white` на `card-header` | без класса (цвет берётся из темы) |
   | `navbar-dark bg-dark` | `bg-dark` + `data-bs-theme="dark"` |
   | `<small class="form-text text-muted">` | `<div class="form-text">` |
   | `style="height: …"` на `.progress` | стандартная высота `.progress` |

5. **Сетка:** списки карточек — `row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4` + `col`; ограничение ширины формы или текста — `row` + `col-lg-8` / `col-xl-9`, а не `max-width`. Колонки — только внутри `.row`.
6. **Медиа:** картинки и видео фиксированной пропорции — `ratio ratio-16x9` (+ `object-fit-cover` для `img`), адаптивные картинки — `img-fluid`.
7. **Списки ссылок** — `.list-group-item` только внутри `.list-group` (в карточке — `list-group list-group-flush`).
8. **Интерактивность** — плагины Bootstrap через `data-bs-*`. Если нужно управлять из Vue — JS API (`import { Collapse } from 'bootstrap'`, `Collapse.getInstance(el)`), см. `components/Navbar.vue`.
9. **Доступность:** у каждого `input` — `label` с `for` (или `visually-hidden`); группы радиокнопок — `fieldset` + `legend`; спиннеры — `role="status"` + `visually-hidden`; заголовки по порядку (размер задаётся классом `h5`, а не выбором тега).

## Готовые части проекта

- `src/utils/badges.js` — подписи и классы бейджей уровня курса и типа урока. Не дублировать эти словари в компонентах.
- `src/utils/markdown.js` — `renderMarkdown()`: рендер Markdown уроков с классами Bootstrap (`table`, `img-fluid`, обёртка `table-responsive`, оформление `blockquote`, `pre`, `details`). Нужно стилизовать новый элемент Markdown — добавь классы в словарь `CLASSES`, а не CSS.

## Сторонние виджеты

Некоторые вещи Bootstrap не умеет. Для них подключён ровно один одобренный виджет на задачу:

| Задача | Библиотека | Где | Как оформлен |
|--------|-----------|-----|--------------|
| Подсветка кода | highlight.js (core + нужные языки) | `src/utils/highlight.js` | Готовая тема `highlight.js/styles/github.css` — единственный разрешённый импорт CSS кроме Bootstrap |
| Редактор кода | CodeMirror 6 | `src/components/CodeEditor.vue` | Свои стили CodeMirror; размеры — через `EditorView.theme()` в конфигурации редактора |

Правила:
- Тему виджета не правим и не переопределяем. Контейнер вокруг виджета оформляется классами Bootstrap (`border rounded`).
- Тяжёлые виджеты грузятся лениво (`defineAsyncComponent`), только на страницах, где нужны. Пример — `JsChallenge` в `views/Lesson.vue`.
- Новый виджет — это расширение решения: добавь его в эту таблицу.

## Если Bootstrap не хватает

Сначала поищи решение в утилитах (spacing, flex, borders, shadows, `position`, `object-fit`, `z-index`) и в CSS-переменных компонентов. Если всё же нужен собственный стиль, это пересмотр решения: не добавляй CSS молча, обсуди с командой и обнови этот скил.

## Проверка перед коммитом

```bash
cd frontend
grep -rn "<style\|style=\|text-muted\|bg-white\|text-dark\|\.css'" src | grep -v "progress-bar\|bootstrap.min.css\|highlight.js/styles"   # должно быть пусто
npx vite build                                                                                                       # сборка без ошибок
```

Проверь страницу на ширине телефона (≈375px): нет горизонтальной прокрутки, меню-гамбургер открывается и закрывается после перехода.
