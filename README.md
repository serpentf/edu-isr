# 📚 Edu ISR — Интерактивные курсы по инструментам разработки

Платета для создания и прохождения интерактивных курсов по инструментам разработки.

## 🚀 Технологии

### Backend
- **Node.js** + **Express** — серверный фреймворк
- **Sequelize** — ORM для работы с БД
- **MySQL** — база данных
- **JWT** — аутентификация

### Frontend
- **Vue 3** — фронтенд-фреймворк (Composition API)
- **Bootstrap 5.3** — вся вёрстка, без собственного CSS (правила: `.claude/skills/bootstrap-ui/SKILL.md`)
- **Vite** — сборщик
- **Vue Router** — роутинг
- **Pinia** — управление состоянием
- **Axios** — HTTP-клиент
- **Marked** — рендеринг Markdown

### Инфраструктура
- **Docker** + **Docker Compose** — контейнеризация

## 📁 Структура проекта

```
edu-isr/
├── backend/
│   ├── src/
│   │   ├── config/       # Конфигурация БД
│   │   ├── controllers/  # Контроллеры
│   │   ├── middleware/   # Middleware (аутентификация)
│   │   ├── models/       # Модели Sequelize
│   │   ├── routes/       # API маршруты
│   │   └── app.js        # Точка входа
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/          # API клиенты
│   │   ├── assets/       # Стили
│   │   ├── components/   # Vue компоненты
│   │   ├── router/       # Роуты
│   │   ├── stores/       # Pinia stores
│   │   └── views/        # Страницы
│   ├── package.json
│   └── vite.config.js
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
└── docker-compose.yml
```

## 🎯 Основные сущности

- **Users** — пользователи (студенты и администраторы)
- **Courses** — курсы
- **Modules** — модули внутри курсов
- **Lessons** — уроки (текст, видео, тесты, практические задания)
- **UserProgress** — прогресс прохождения уроков

## 🔌 API Endpoints

### Аутентификация (`/api/auth`)
- `POST /register` — регистрация
- `POST /login` — вход
- `GET /me` — информация о текущем пользователе

### Курсы (`/api/courses`)
- `GET /` — список курсов
- `GET /slug/:slug` — курс по URL
- `GET /:id` — курс по ID
- `GET /lessons/:lessonId` — урок с модулем и курсом
- `POST /` — создать курс (админ)
- `PUT /:id` — обновить курс (админ)
- `DELETE /:id` — удалить курс (админ)

### Прогресс (`/api/progress`)
- `GET /:userId` — прогресс пользователя
- `PUT /lesson/:lessonId` — обновить прогресс урока
- `GET /course/:courseId` — прогресс по курсу

## 🛠 Установка и запуск

### Быстрый старт (локально)

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd edu-isr
   ```

2. **Настройте окружение:**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Запустите MySQL (локально):**
   ```bash
   # Убедитесь, что MySQL запущен
   # Настройте .env файлы с правильными параметрами
   ```

4. **Запустите backend:**
   ```bash
   cd ../backend
   npm run dev
   ```

5. **Запустите frontend (в новом терминале):**
   ```bash
   cd ../frontend
   npm run dev
   ```

6. **Откройте браузер:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Развёртывание на сервере

Пример установки без Docker за реверс-прокси nginx (TLS, systemd, MySQL, файрвол, бэкапы): [deploy/README.md](deploy/README.md).

### Запуск через Docker (рекомендуется)

Весь проект работает в Docker контейнерах, включая MySQL базу данных:

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd edu-isr

# 2. Запустите все сервисы (включая MySQL)
docker-compose up -d

# 3. Проверьте статус контейнеров
docker-compose ps

# 4. Просмотр логов
docker-compose logs -f

# 5. Остановка всех сервисов
docker-compose down

# Очистка томов (удалит базу данных)
docker-compose down -v
```

### 🐳 Сервисы в Docker:

| Сервис | Образ | Порт | Описание |
|--------|-------|------|----------|
| **mysql** | mysql:8.0 | 3306 | База данных MySQL с томом для данных |
| **backend** | Node.js 20 | 3001 | API сервер |
| **frontend** | Node.js 20 | 5173 | Vue.js приложение |

### 🔑 Доступы к БД:

- **Host:** localhost:3306
- **Database:** edu_isr
- **User:** edu_user
- **Password:** edu_password
- **Root Password:** root

### 🌐 Адреса после запуска:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### ⚙️ Особенности Docker конфигурации:

- **Healthcheck** для MySQL — backend запускается только после готовности БД
- **Init SQL скрипт** — автоматическое создание таблиц при первом запуске
- **Volume** для MySQL — данные сохраняются между перезапусками
- **Hot reload** — изменения в коде применяются автоматически

## 📋 Возможности

✅ Каталог курсов с фильтрацией по уровню
✅ Детальная страница курса с модулями и уроками
✅ Типы уроков: текст, видео, тесты, практические задания
✅ Система аутентификации (регистрация/вход)
✅ Отслеживание прогресса обучения
✅ Админ-панель для управления курсами
✅ Markdown-рендеринг контента
✅ Адаптивный дизайн

## 🔐 Роли пользователей

- **Student** — может просматривать курсы и проходить уроки
- **Admin** — может создавать, редактировать и удалять курсы

## 📝 Примеры данных

### Структура курса:
```json
{
  "title": "Основы Git",
  "slug": "basics-of-git",
  "description": "Изучите основы работы с Git",
  "level": "beginner",
  "duration_hours": 5,
  "modules": [
    {
      "title": "Введение в Git",
      "lessons": [
        {
          "title": "Что такое Git?",
          "type": "text",
          "content": "## Что такое Git?\n\nGit — ..."
        }
      ]
    }
  ]
}
```

## 🤝 Вклад

1. Форкните репозиторий
2. Создайте ветку для функции
3. Зафиксируйте изменения
4. Отправьте пул-реквест

## 📄 Лицензия

MIT