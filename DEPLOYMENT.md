# DiLauncher 2.0 - Руководство по развертыванию

## 🚀 Обзор обновлений

DiLauncher 2.0 - это полностью переработанная система с:
- ✅ Современной системой авторизации (JWT + Refresh токены)
- ✅ MongoDB для масштабируемого хранения данных
- ✅ Расширенным API для управления профилями Minecraft
- ✅ Системой управления серверами
- ✅ WebSocket для real-time обновлений
- ✅ Современным UI с анимациями и темной темой

## 📋 Требования

- Node.js 16+ 
- MongoDB 5.0+ (или MongoDB Atlas)
- npm 8+
- 2GB RAM минимум
- SSL сертификат (для production)

## 🛠️ Установка

### 1. Клонирование и установка зависимостей

```bash
git clone https://github.com/yourusername/dilauncher.git
cd dilauncher
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и настройте:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/dilauncher

# JWT Secrets (сгенерируйте сильные ключи!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Session Secret
SESSION_SECRET=your-session-secret-min-32-chars

# Encryption
CRYPTO_SECRET=your-crypto-secret-for-sensitive-data
```

### 3. Настройка MongoDB

#### Локальная установка:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# macOS
brew install mongodb-community
brew services start mongodb-community
```

#### MongoDB Atlas (рекомендуется для production):
1. Создайте аккаунт на [MongoDB Atlas](https://cloud.mongodb.com)
2. Создайте кластер
3. Получите connection string
4. Обновите `DATABASE_URL` в `.env`

### 4. Миграция данных из старой системы

```bash
npm run migrate
```

Это перенесет пользователей из SQLite в MongoDB.

## 🚀 Запуск

### Development:
```bash
npm run dev
```

### Production:
```bash
npm start
```

## 🌐 Развертывание на хостинге

### Railway.app (рекомендуется)

1. Установите Railway CLI:
```bash
npm install -g @railway/cli
```

2. Инициализируйте проект:
```bash
railway login
railway init
```

3. Добавьте MongoDB:
```bash
railway add mongodb
```

4. Настройте переменные окружения:
```bash
railway variables set JWT_SECRET="your-secret"
railway variables set JWT_REFRESH_SECRET="your-refresh-secret"
# ... остальные переменные
```

5. Разверните:
```bash
railway up
```

### Heroku

1. Создайте `Procfile`:
```
web: node src/server.js
```

2. Добавьте MongoDB через Heroku addons:
```bash
heroku addons:create mongolab:sandbox
```

3. Разверните:
```bash
git push heroku main
```

### VPS (DigitalOcean, AWS, etc.)

1. Установите Node.js и MongoDB
2. Клонируйте репозиторий
3. Настройте nginx как reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Используйте PM2 для управления процессом:
```bash
npm install -g pm2
pm2 start src/server.js --name dilauncher
pm2 save
pm2 startup
```

## 🔒 Безопасность

### 1. SSL/TLS
Обязательно используйте HTTPS в production:
- Let's Encrypt для бесплатных сертификатов
- Cloudflare для SSL + CDN

### 2. Переменные окружения
- Никогда не коммитьте `.env` файл
- Используйте сильные случайные ключи
- Регулярно обновляйте секреты

### 3. Rate Limiting
Настроен автоматически для защиты от брутфорса

### 4. CORS
Настройте разрешенные домены в `.env`:
```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

## 📊 Мониторинг

### Логи
Логи сохраняются в папке `logs/`:
- `access.log` - все запросы
- `error.log` - ошибки
- `performance.log` - медленные запросы

### Метрики
Доступны через админ панель:
- `/api/admin/dashboard` - статистика
- `/api/admin/logs` - просмотр логов

## 🔧 Обслуживание

### Резервное копирование БД

```bash
# Экспорт
mongodump --uri="mongodb://localhost:27017/dilauncher" --out=./backup

# Импорт
mongorestore --uri="mongodb://localhost:27017/dilauncher" ./backup/dilauncher
```

### Обновление зависимостей
```bash
npm update
npm audit fix
```

### Очистка старых данных
```bash
# Очистка истекших refresh токенов (добавьте в cron)
node scripts/cleanup.js
```

## 🚨 Troubleshooting

### MongoDB не подключается
- Проверьте, запущен ли MongoDB
- Проверьте правильность DATABASE_URL
- Проверьте firewall правила

### Ошибки аутентификации
- Убедитесь, что JWT_SECRET установлен
- Проверьте срок действия токенов
- Очистите localStorage в браузере

### WebSocket не работает
- Проверьте настройки прокси (nginx/cloudflare)
- Убедитесь, что порт не заблокирован

## 📞 Поддержка

- Discord: [Ваш сервер]
- Email: support@dilauncher.com
- GitHub Issues: [Репозиторий]

## 🎯 Чеклист перед запуском

- [ ] Все переменные окружения настроены
- [ ] MongoDB доступна и работает
- [ ] SSL сертификат установлен (для production)
- [ ] Резервное копирование настроено
- [ ] Логирование работает
- [ ] Админ аккаунт создан
- [ ] Тестовый запуск пройден

---

🎉 **Поздравляем!** Ваш DiLauncher 2.0 готов к работе!