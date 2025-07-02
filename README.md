# 🚀 DiLauncher v2.0

**Современный лаунчер для Minecraft с расширенными возможностями**

DiLauncher — это новое поколение лаунчеров для Minecraft, созданный с современными технологиями и архитектурой. Он предоставляет полный контроль над профилями, модами, серверами и настройками игры.

![DiLauncher Preview](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=DiLauncher+v2.0)

## ✨ Основные возможности

### 🎮 Управление профилями
- **Безграничные профили** — создавайте неограниченное количество профилей
- **Поддержка всех версий** — от классических до самых новых версий Minecraft
- **Модлоадеры** — Vanilla, Forge, Fabric, Quilt
- **Настройки JVM** — тонкая настройка производительности
- **Клонирование профилей** — быстрое создание копий настроек

### 🔧 Система модов
- **Автоматическая установка** — интеграция с CurseForge и Modrinth
- **Управление зависимостями** — автоматическое разрешение конфликтов
- **Проверка совместимости** — уведомления о несовместимых модах
- **Включение/выключение** — легкое управление модами без удаления

### 🌐 Менеджер серверов
- **Автоматический пинг** — отслеживание статуса серверов
- **Информация о сервере** — MOTD, количество игроков, версия
- **Теги и категории** — организация серверов по группам
- **Популярные серверы** — рекомендации на основе сообщества

### ☁️ Облачная синхронизация
- **Профили в облаке** — синхронизация между устройствами
- **Резервное копирование** — автоматическое сохранение настроек
- **Настройки аккаунта** — единые настройки на всех устройствах

### 🔐 Современная авторизация
- **JWT токены** — безопасная авторизация с refresh токенами
- **OAuth интеграция** — вход через Google и Discord
- **Двухфакторная аутентификация** — дополнительная защита аккаунта
- **Управление сессиями** — контроль активных устройств

### 📊 Аналитика и статистика
- **Детальная статистика** — время игры, запуски, популярные версии
- **История активности** — отслеживание всех действий
- **Аналитика сообщества** — тренды и популярные моды

## 🛠 Технический стек

### Backend
- **Node.js 18+** — современная серверная платформа
- **Express.js** — веб-фреймворк с middleware
- **PostgreSQL/SQLite** — надежное хранение данных
- **JWT + Refresh токены** — безопасная авторизация
- **Socket.IO** — real-time коммуникация
- **Winston** — структурированное логирование
- **Passport.js** — OAuth интеграция

### Frontend
- **Modern JavaScript (ES2022)** — современный код
- **CSS Grid & Flexbox** — адаптивная верстка
- **WebSocket API** — real-time уведомления
- **Service Workers** — offline функционал
- **Progressive Web App** — установка как приложение

### DevOps
- **Docker** — контейнеризация
- **Railway/Heroku** — деплой в облако
- **GitHub Actions** — CI/CD pipeline
- **ESLint + Prettier** — качество кода

## 🚀 Быстрый старт

### Требования
- Node.js 18.0 или выше
- PostgreSQL 13+ (для продакшена) или SQLite (для разработки)
- Git

### Установка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/waitdino/DiLauncher.git
cd DiLauncher
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Настройте переменные окружения:**
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

4. **Инициализируйте базу данных:**
```bash
npm run migrate
```

5. **Запустите сервер:**
```bash
# Для разработки
npm run dev

# Для продакшена
npm start
```

6. **Откройте браузер:**
```
http://localhost:3000
```

### Docker

Для быстрого запуска с Docker:

```bash
docker-compose up -d
```

## 📖 API документация

### Авторизация

#### Регистрация
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "player123",
  "email": "player@example.com",
  "password": "SecurePassword123",
  "displayName": "Player 123"
}
```

#### Вход в систему
```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "player123",
  "password": "SecurePassword123"
}
```

#### Обновление токена
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Профили лаунчера

#### Создание профиля
```http
POST /api/launcher/profiles
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "Мой профиль",
  "minecraftVersion": "1.21.6",
  "modLoader": "fabric",
  "memoryAllocation": 4096,
  "description": "Профиль для игры с модами"
}
```

#### Получение профилей
```http
GET /api/launcher/profiles
Authorization: Bearer your-jwt-token
```

### Серверы

#### Добавление сервера
```http
POST /api/launcher/servers
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "name": "Мой сервер",
  "address": "play.example.com",
  "port": 25565,
  "tags": ["survival", "friendly"]
}
```

#### Получение статуса сервера
```http
GET /api/launcher/servers/status?address=play.example.com&port=25565
Authorization: Bearer your-jwt-token
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|-----------|----------|--------------|
| `PORT` | Порт сервера | `3000` |
| `NODE_ENV` | Окружение | `development` |
| `DATABASE_URL` | URL PostgreSQL | (SQLite в dev) |
| `JWT_SECRET` | Секрет для JWT | требуется |
| `GOOGLE_CLIENT_ID` | Google OAuth ID | опционально |
| `DISCORD_CLIENT_ID` | Discord OAuth ID | опционально |

### Настройка OAuth

#### Google OAuth
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте redirect URI: `http://localhost:3000/api/auth/google/callback`

#### Discord OAuth
1. Перейдите в [Discord Developer Portal](https://discord.com/developers/applications)
2. Создайте новое приложение
3. Перейдите в раздел OAuth2
4. Добавьте redirect URI: `http://localhost:3000/api/auth/discord/callback`
5. Выберите scopes: `identify`, `email`

## 🏗 Архитектура

```
DiLauncher/
├── server.js                 # Главный серверный файл
├── server/
│   ├── database/
│   │   └── database.js       # Управление БД
│   │   
│   ├── models/
│   │   ├── User.js          # Модель пользователя
│   │   ├── LauncherProfile.js # Модель профиля
│   │   └── MinecraftServer.js # Модель сервера
│   └── routes/
│       ├── auth.js          # Авторизация
│       └── launcher.js      # API лаунчера
├── public/                   # Статические файлы
│   ├── index.html           # Главная страница
│   ├── css/                 # Стили
│   └── js/                  # JavaScript
├── logs/                    # Логи приложения
└── data/                    # База данных SQLite
```

## 📊 Мониторинг и логирование

### Health Check
```http
GET /health
```

### Метрики
```http
GET /api/status
```

### Логи
- **Файлы логов:** `logs/error.log`, `logs/combined.log`
- **Уровни:** `error`, `warn`, `info`, `debug`
- **Формат:** JSON с timestamp и метаданными

## 🔐 Безопасность

- **Rate Limiting** — защита от спама и атак
- **Helmet.js** — безопасные HTTP заголовки
- **CORS** — контроль доступа между доменами
- **JWT токены** — безопасная авторизация
- **bcrypt** — хеширование паролей
- **SQL инъекции** — параметризованные запросы

## 🚀 Деплой

### Railway
1. Создайте аккаунт на [Railway](https://railway.app)
2. Подключите GitHub репозиторий
3. Добавьте PostgreSQL сервис
4. Настройте переменные окружения
5. Деплойте!

### Heroku
1. Установите [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Создайте приложение: `heroku create dilauncher`
3. Добавьте PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
4. Настройте переменные: `heroku config:set JWT_SECRET=your-secret`
5. Деплойте: `git push heroku main`

### Docker
```bash
# Сборка образа
docker build -t dilauncher .

# Запуск с Docker Compose
docker-compose up -d

# Просмотр логов
docker-compose logs -f
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты с покрытием
npm run test:coverage

# E2E тесты
npm run test:e2e

# Линтинг
npm run lint

# Форматирование кода
npm run format
```

## 📈 Производительность

- **Кэширование** — Redis для сессий и данных
- **Оптимизация БД** — индексы и пулы соединений
- **Compression** — gzip сжатие ответов
- **Static assets** — кэширование и CDN
- **WebSocket** — real-time без polling

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для фичи: `git checkout -b feature/amazing-feature`
3. Зафиксируйте изменения: `git commit -m 'Add amazing feature'`
4. Отправьте в ветку: `git push origin feature/amazing-feature`
5. Создайте Pull Request

### Правила разработки
- Используйте ESLint и Prettier
- Пишите тесты для новых функций
- Следуйте [Conventional Commits](https://www.conventionalcommits.org/)
- Обновляйте документацию

## 📝 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## � Благодарности

- [Minecraft](https://minecraft.net) — за великолепную игру
- [CurseForge](https://curseforge.com) — за API модов
- [Modrinth](https://modrinth.com) — за современную платформу модов
- Всем контрибьюторам и сообществу

## 📞 Поддержка

- **Discord:** [discord.com/invite/49bt](https://discord.com/invite/49bt)
- **GitHub Issues:** [github.com/waitdino/DiLauncher/issues](https://github.com/waitdino/DiLauncher/issues)
- **Email:** support@dilauncher.com

---

<p align="center">
  Сделано с ❤️ для сообщества Minecraft
</p>

<p align="center">
  <a href="#-dilauncher-v20">🔝 Наверх</a>
</p> 