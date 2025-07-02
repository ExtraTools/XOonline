# <img src="/icons/gameIcons/PNG/White/1x/gamepad.png" alt="DinosGames" style="width: 2rem; height: 2rem; display: inline-block; vertical-align: middle;"> DinosGames - Игровая площадка

Современная игровая площадка с множеством игр и системой аккаунтов.

## <img src="/icons/gameIcons/PNG/White/1x/joystick.png" alt="Игры" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Доступные игры

### <img src="/icons/gameIcons/PNG/Black/1x/checkmark.png" alt="Готово" style="width: 1.2rem; height: 1.2rem; display: inline-block; vertical-align: middle;"> Крестики-нолики
- **Статус**: Готово
- **Режимы**: Против ИИ, против игрока, локальная игра
- **Особенности**: 4 уровня сложности ИИ, рейтинговая система, красивый интерфейс

### <img src="/icons/gameIcons/PNG/Black/1x/gear.png" alt="В разработке" style="width: 1.2rem; height: 1.2rem; display: inline-block; vertical-align: middle;"> В разработке
- **Змейка**: Классическая змейка с современным дизайном
- **Тетрис**: Легендарная головоломка с падающими блоками
- **Больше игр**: Следите за обновлениями!

## <img src="/icons/gameIcons/PNG/Black/1x/power.png" alt="Технологии" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Технологии

### Frontend
- **HTML5**: Современная семантическая разметка
- **CSS3**: Glass Morphism, анимации, адаптивный дизайн
- **JavaScript ES6+**: Модульная архитектура, классы
- **Socket.IO**: Реальное время для многопользовательских игр

### Backend
- **Node.js**: Серверная платформа
- **Express.js**: Веб-фреймворк
- **Socket.IO**: WebSocket соединения
- **MongoDB**: База данных (опционально)
- **JSON Files**: Локальное хранение данных

### Хостинг
- **Railway**: Автоматический деплой
- **GitHub**: Система контроля версий

## <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="Структура" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Структура проекта

```
DinosGames/
├── public/                 # Клиентская часть
│   ├── games/             # Игры
│   │   ├── krestiki/      # Крестики-нолики
│   │   │   ├── index.html
│   │   │   ├── game.css
│   │   │   └── game.js
│   │   ├── snake/         # Змейка (будущая)
│   │   └── tetris/        # Тетрис (будущая)
│   ├── css/               # Стили
│   │   └── admin.css      # Админ панель
│   ├── modules/           # JavaScript модули
│   │   ├── adminPanel.js
│   │   ├── effects.js
│   │   ├── gameLogic.js
│   │   ├── socket.js
│   │   └── ui.js
│   ├── index.html         # Главная страница (лобби)
│   ├── style.css          # Основные стили
│   └── script.js          # Главный скрипт
├── models/                # Модели данных
│   ├── User.js            # Модель пользователя
│   └── UserData.js        # Управление данными
├── ai/                    # Искусственный интеллект
│   └── TicTacToeAI.js     # ИИ для крестиков-ноликов
├── assets/                # Ресурсы
│   └── scrim/             # Видео для скримеров
├── server.js              # Основной сервер
├── package.json           # Зависимости
└── railway.toml           # Конфигурация Railway
```

## 🛠 Установка и запуск

### Локальная разработка

1. **Клонируйте репозиторий**:
```bash
git clone https://github.com/ExtraTools/XOonline.git
cd XOonline
```

2. **Установите зависимости**:
```bash
npm install
```

3. **Настройте переменные окружения**:
```bash
cp .env.example .env
# Отредактируйте .env файл
```

4. **Запустите сервер**:
```bash
npm start
```

5. **Откройте в браузере**:
```
http://localhost:6666
```

### Продакшн (Railway)

Проект автоматически деплоится на Railway при push в main ветку.

**Живой сайт**: https://xoonline-production-63d1.up.railway.app

## <img src="/icons/gameIcons/PNG/Black/1x/userRobot.png" alt="Аккаунты" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Система аккаунтов

### Регистрация и вход
- **Email + пароль**: Полная регистрация с сохранением прогресса
- **Гостевой режим**: Быстрый вход без регистрации

### Функции аккаунта
- **Статистика игр**: Отслеживание побед, поражений, рейтинга
- **Система уровней**: Прогрессия через опыт
- **Достижения**: Награды за различные достижения
- **История игр**: Последние матчи с детализацией

## <img src="/icons/gameIcons/PNG/Black/1x/target.png" alt="Особенности" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Особенности крестиков-ноликов

### Режимы игры
1. **Против ИИ**: 4 уровня сложности
   - Легкий: Случайные ходы
   - Средний: Базовая стратегия
   - Сложный: Умная тактика
   - Невозможный: Продвинутые алгоритмы

2. **Против игрока**: Онлайн матчи
   - Поиск по рейтингу
   - Рейтинговая система
   - Статистика PvP

3. **Локальная игра**: Для двоих на одном устройстве

### Игровые функции
- **Красивая анимация**: Плавные переходы и эффекты
- **Звуковые эффекты**: Обратная связь для действий
- **Таймер игры**: Отслеживание времени матча
- **Система рейтинга**: ELO-подобная система
- **Статистика**: Детальная аналитика игр

## <img src="/icons/gameIcons/PNG/Black/1x/trophy.png" alt="Админ панель" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Админ панель

Доступ по коду `admin-start` в левом верхнем углу.

### Возможности
- **Управление пользователями**: Просмотр, кик, бан
- **Скримеры**: Обычный и МЕГА скример
- **Эффекты**: Радуга, тряска, снег, фейерверк и др.
- **Сервер**: Статистика, перезагрузка, режим обслуживания
- **Логи**: Мониторинг активности

## <img src="/icons/gameIcons/PNG/Black/1x/toolBrush.png" alt="Дизайн" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Дизайн

### Стилевые особенности
- **Glass Morphism**: Полупрозрачные элементы с размытием
- **Градиенты**: Яркие цветовые переходы
- **Анимации**: Плавные переходы и hover эффекты
- **Адаптивность**: Отличный вид на всех устройствах
- **Темная тема**: Приятная для глаз цветовая схема

### Цветовая палитра
- **Основной**: #FF6B35 (оранжевый)
- **Вторичный**: #4ECDC4 (бирюзовый)
- **Успех**: #45B7D1 (синий)
- **Предупреждение**: #F9CA24 (желтый)
- **Опасность**: #F0932B (красный)

## <img src="/icons/gameIcons/PNG/Black/1x/wrench.png" alt="API" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> API

### Авторизация
- `POST /api/guest/login` - Гостевой вход
- `GET /api/user` - Данные пользователя
- `POST /api/profile/update` - Обновление профиля

### Игры
- `POST /api/game/stats` - Обновление статистики
- `GET /api/leaderboard` - Таблица лидеров
- `GET /api/stats` - Статистика сервера

### Socket.IO события
- `find-game` - Поиск игры
- `make-move` - Совершение хода
- `game-finished` - Завершение игры
- `admin-action` - Админские действия

## <img src="/icons/gameIcons/PNG/Black/1x/leaderboardsSimple.png" alt="Мониторинг" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Мониторинг

### Метрики
- **Онлайн пользователи**: Текущее количество
- **Активные игры**: Игры в процессе
- **Статистика игр**: Общее количество, игры за день
- **Топ рейтинг**: Лучшие игроки

### Логирование
- **Подключения**: Вход/выход пользователей
- **Игры**: Создание, завершение матчей
- **Ошибки**: Отслеживание проблем
- **Админ действия**: Журнал администрирования

## <img src="/icons/gameIcons/PNG/Black/1x/locked.png" alt="Безопасность" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Безопасность

### Защита
- **Валидация данных**: Проверка всех входных данных
- **Санитизация**: Очистка от XSS атак
- **Лимиты**: Ограничение на частоту запросов
- **Логирование**: Отслеживание подозрительной активности

### Модерация
- **Фильтр никнеймов**: Автоматическая проверка
- **Система жалоб**: Возможность пожаловаться
- **Админ панель**: Инструменты модерации

## <img src="/icons/gameIcons/PNG/Black/1x/power.png" alt="Производительность" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Производительность

### Оптимизации
- **Сжатие**: Минификация CSS/JS
- **Кеширование**: Оптимальное время кеширования
- **CDN**: Использование внешних ресурсов
- **Lazy Loading**: Отложенная загрузка

### Масштабируемость
- **Socket.IO**: Поддержка множественных соединений
- **MongoDB**: Масштабируемая база данных
- **Railway**: Автоматическое масштабирование

## <img src="/icons/gameIcons/PNG/Black/1x/exclamation.png" alt="Проблемы" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Известные проблемы

### В работе
- Иногда соединение может прерываться на слабом интернете
- Мобильная версия требует доработки некоторых элементов

### Планы по исправлению
- Улучшение reconnect логики
- Оптимизация для мобильных устройств
- Добавление PWA функций

## <img src="/icons/gameIcons/PNG/Black/1x/target.png" alt="Roadmap" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Roadmap

### v1.0.0 (Текущая)
- <img src="/icons/gameIcons/PNG/Black/1x/checkmark.png" alt="✅" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Система аккаунтов
- <img src="/icons/gameIcons/PNG/Black/1x/checkmark.png" alt="✅" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Крестики-нолики с ИИ
- <img src="/icons/gameIcons/PNG/Black/1x/checkmark.png" alt="✅" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Админ панель
- <img src="/icons/gameIcons/PNG/Black/1x/checkmark.png" alt="✅" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Рейтинговая система

### v1.1.0 (Ближайшие планы)
- <img src="/icons/gameIcons/PNG/Black/1x/gear.png" alt="🔄" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Игра "Змейка"
- <img src="/icons/gameIcons/PNG/Black/1x/gear.png" alt="🔄" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Система друзей
- <img src="/icons/gameIcons/PNG/Black/1x/gear.png" alt="🔄" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Чат в играх
- <img src="/icons/gameIcons/PNG/Black/1x/gear.png" alt="🔄" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Турниры

### v1.2.0 (Будущие планы)
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Игра "Тетрис"
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Система кланов
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Магазин скинов
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Ежедневные квесты

### v2.0.0 (Долгосрочные планы)
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Мобильное приложение
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Больше игр (шахматы, шашки)
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Система донатов
- <img src="/icons/gameIcons/PNG/Black/1x/menuList.png" alt="📋" style="width: 1rem; height: 1rem; display: inline-block; vertical-align: middle;"> Международная локализация

## <img src="/icons/gameIcons/PNG/Black/1x/multiplayer.png" alt="Вклад" style="width: 1.5rem; height: 1.5rem; display: inline-block; vertical-align: middle;"> Вклад в проект

### Как помочь
1. **Тестирование**: Ищите баги и сообщайте о них
2. **Идеи**: Предлагайте новые функции
3. **Код**: Отправляйте Pull Request
4. **Дизайн**: Улучшайте интерфейс

### Стандарты кода
- **JavaScript**: ES6+, модульная архитектура
- **CSS**: BEM методология, CSS переменные
- **HTML**: Семантическая разметка
- **Комментарии**: На русском языке

## 📞 Контакты

- **GitHub**: https://github.com/ExtraTools/XOonline
- **Живой сайт**: https://xoonline-production-63d1.up.railway.app
- **Техподдержка**: Создайте Issue в GitHub

## 📜 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.

---

**Сделано с ❤️ командой DinosGames**

*Играйте честно, веселитесь и побеждайте!* <img src="/icons/gameIcons/PNG/Black/1x/trophy.png" alt="🏆" style="width: 1.2rem; height: 1.2rem; display: inline-block; vertical-align: middle;"> 