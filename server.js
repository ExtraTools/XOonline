// DiLauncher Server 2.0 - Современный лаунчер для Minecraft
// ES Modules и современный Node.js архитектура

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import cron from 'node-cron';
import winston from 'winston';
import fs from 'fs-extra';

// Импорт модулей базы данных и роутов
import { initDatabase, closeDatabase } from './server/database/database.js';
import authRoutes from './server/routes/auth.js';
import launcherRoutes from './server/routes/launcher.js';
import User from './server/models/User.js';
import MinecraftServer from './server/models/MinecraftServer.js';

// Загрузка переменных окружения
dotenv.config();

// Получение __dirname для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройка логгера
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'dilauncher' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Создание Express приложения
const app = express();
const httpServer = createServer(app);

// Инициализация Socket.IO для реал-тайм функций
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Создание необходимых директорий
await fs.ensureDir('logs');
await fs.ensureDir('data');
await fs.ensureDir('uploads');

// Безопасность с обновленными настройками
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
            mediaSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS с обновленными настройками
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
        // Разрешаем запросы без origin (мобильные приложения)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Не разрешено CORS политикой'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Version']
}));

// Rate limiting для общих запросов
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 1000, // максимум 1000 запросов на IP
    message: { 
        success: false, 
        message: 'Слишком много запросов. Попробуйте через 15 минут.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Пропускаем rate limiting для статических файлов
        return req.path.startsWith('/css/') || 
               req.path.startsWith('/js/') || 
               req.path.startsWith('/icons/') ||
               req.path.startsWith('/FRONTS/');
    }
});

app.use(generalLimiter);

// Middleware для логирования запросов
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger.log(logLevel, 'HTTP Request', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    
    next();
});

// Middleware для парсинга
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Настройка доверия прокси (для Railway и других PaaS)
app.set('trust proxy', 1);

// Сессии (только для совместимости, основная авторизация через JWT)
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dilauncher-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 дней
    },
    name: 'dilauncher.session'
};

app.use(session(sessionConfig));

// Инициализация Passport для OAuth
app.use(passport.initialize());

// Статические файлы с кэшированием
const staticOptions = {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
};

app.use(express.static(join(__dirname, 'public'), staticOptions));
app.use('/socket.io', express.static(join(__dirname, 'node_modules/socket.io/client-dist'), staticOptions));
app.use('/FRONTS', express.static(join(__dirname, 'FRONTS'), staticOptions));
app.use('/icons', express.static(join(__dirname, 'icons'), staticOptions));

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/launcher', launcherRoutes);

// Системные API маршруты
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        version: process.env.npm_package_version || '2.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check для Railway и других PaaS
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
    });
});

// API статуса и информации
app.get('/api/status', async (req, res) => {
    try {
        const onlineUsers = await User.getOnlineCount();
        const serverStats = await MinecraftServer.getServerStats();
        
        res.json({
            status: 'ok', 
            message: 'DiLauncher сервер работает',
            version: '2.0.0',
            features: [
                'Современная архитектура с PostgreSQL/SQLite',
                'JWT + Refresh токены авторизация',
                'OAuth интеграция (Google, Discord)',
                'Управление профилями Minecraft',
                'Система модов и модпаков',
                'Менеджер серверов',
                'Облачная синхронизация',
                'Real-time уведомления',
                'Расширенная аналитика'
            ],
            statistics: {
                onlineUsers,
                ...serverStats
            },
            supportedVersions: [
                '1.21.6', '1.21.5', '1.21.4', '1.21.3',
                '1.20.4', '1.20.2', '1.20.1',
                '1.19.4', '1.19.2',
                '1.18.2', '1.17.1', '1.16.5'
            ],
            modLoaders: ['Vanilla', 'Forge', 'Fabric', 'Quilt']
        });
    } catch (error) {
        logger.error('Ошибка получения статуса:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка получения статистики сервера'
        });
    }
});

// WebSocket соединения для реал-тайм функций
io.on('connection', (socket) => {
    logger.info('Новое WebSocket соединение', { socketId: socket.id });

    // Присоединение к комнате пользователя
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        logger.info('Пользователь присоединился к комнате', { userId, socketId: socket.id });
    });

    // Обновление статуса пользователя
    socket.on('user-status', async (data) => {
        try {
            const { userId, status } = data;
            const user = await User.findById(userId);
            if (user) {
                await user.setOnlineStatus(status === 'online');
                socket.broadcast.emit('user-status-change', { userId, status });
            }
        } catch (error) {
            logger.error('Ошибка обновления статуса пользователя:', error);
        }
    });

    // Уведомления о запуске игры
    socket.on('game-launched', (data) => {
        socket.broadcast.emit('game-activity', {
            type: 'launch',
            ...data,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        logger.info('WebSocket соединение закрыто', { socketId: socket.id });
    });
});

// Главная страница (SPA)
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// API документация (простая версия)
app.get('/api', (req, res) => {
    res.json({
        name: 'DiLauncher API',
        version: '2.0.0',
        description: 'API для современного лаунчера Minecraft',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Регистрация пользователя',
                'POST /api/auth/login': 'Вход в систему',
                'POST /api/auth/refresh': 'Обновление токена',
                'POST /api/auth/logout': 'Выход из системы',
                'GET /api/auth/profile': 'Профиль пользователя',
                'GET /api/auth/google': 'OAuth через Google',
                'GET /api/auth/discord': 'OAuth через Discord'
            },
            launcher: {
                'GET /api/launcher/profiles': 'Список профилей',
                'POST /api/launcher/profiles': 'Создание профиля',
                'GET /api/launcher/servers': 'Сохраненные серверы',
                'POST /api/launcher/servers': 'Добавление сервера',
                'GET /api/launcher/stats/*': 'Статистика и аналитика'
            }
        },
        authentication: 'Bearer JWT Token',
        rateLimit: {
            general: '1000 requests per 15 minutes',
            auth: '5 requests per 15 minutes',
            launcher: '100 requests per 5 minutes'
        }
    });
});

// SPA fallback - должен быть последним для клиентской маршрутизации
app.get('*', (req, res) => {
    // Проверяем, что это не API запрос
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint не найден'
        });
    }
    
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Глобальная обработка ошибок
app.use((error, req, res, next) => {
    logger.error('Необработанная ошибка:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Не отправляем детали ошибки в продакшене
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(error.status || 500).json({
        success: false,
        message: isDevelopment ? error.message : 'Внутренняя ошибка сервера',
        ...(isDevelopment && { stack: error.stack })
    });
});

// Обработка 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint не найден'
    });
});

// Планировщик задач
const initScheduler = () => {
    // Очистка истекших токенов каждый час
    cron.schedule('0 * * * *', async () => {
        try {
            const cleaned = await User.cleanupExpiredTokens();
            logger.info(`Очищено ${cleaned} истекших токенов`);
        } catch (error) {
            logger.error('Ошибка очистки токенов:', error);
        }
    });

    // Обновление статуса серверов каждые 30 минут
    cron.schedule('*/30 * * * *', async () => {
        try {
            const results = await MinecraftServer.updateStaleServers(2); // серверы старше 2 часов
            logger.info(`Обновлен статус ${results.length} серверов`);
        } catch (error) {
            logger.error('Ошибка обновления серверов:', error);
        }
    });

    logger.info('Планировщик задач инициализирован');
};

// Инициализация и запуск сервера
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Запуск DiLauncher v2.0...');
logger.info('Начинаем инициализацию DiLauncher', {
    port: PORT,
    host: HOST,
    nodeEnv: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
});

// Запускаем сервер
httpServer.listen(PORT, HOST, async () => {
    logger.info(`🟢 DiLauncher сервер запущен`, {
        port: PORT,
        host: HOST,
        url: `http://${HOST}:${PORT}`
    });

    try {
        // Инициализируем базу данных
        logger.info('💾 Инициализация базы данных...');
        await initDatabase();
        logger.info('🟢 База данных готова');

        // Запускаем планировщик
        initScheduler();

        // Очищаем истекшие токены при запуске
        const cleaned = await User.cleanupExpiredTokens();
        if (cleaned > 0) {
            logger.info(`🧹 Очищено ${cleaned} истекших токенов при запуске`);
        }

        logger.info('✅ DiLauncher полностью готов к работе');
        console.log(`
╔══════════════════════════════════════╗
║        DiLauncher v2.0 Ready!        ║
║                                      ║
║  🌐 Server: http://${HOST}:${PORT.toString().padEnd(13)}║
║  📊 Status: http://${HOST}:${PORT}/api/status${' '.repeat(5)}║
║  📚 API: http://${HOST}:${PORT}/api${' '.repeat(11)}║
║                                      ║
║  ✨ Новые возможности:               ║
║  • Современная архитектура           ║
║  • JWT + OAuth авторизация           ║
║  • Управление профилями Minecraft    ║
║  • Система модов и серверов          ║
║  • Real-time уведомления             ║
╚══════════════════════════════════════╝
        `);

    } catch (error) {
        logger.error('❌ Критическая ошибка при инициализации:', error);
        console.error('❌ Не удалось запустить DiLauncher:', error.message);
        
        // В разработке останавливаем процесс, в продакшене пытаемся работать без БД
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}).on('error', (error) => {
    logger.error('❌ Ошибка запуска сервера:', error);
    console.error('❌ Не удалось запустить сервер:', error.message);
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`🛑 Получен сигнал ${signal}, начинаем graceful shutdown...`);
    
    // Закрываем HTTP сервер
    httpServer.close(async () => {
        logger.info('🔴 HTTP сервер остановлен');

        try {
            // Закрываем соединения с базой данных
            await closeDatabase();
            logger.info('🔴 База данных отключена');

            // Закрываем Socket.IO
            io.close();
            logger.info('🔴 WebSocket сервер остановлен');

            logger.info('✅ Graceful shutdown завершен');
            process.exit(0);
        } catch (error) {
            logger.error('❌ Ошибка при shutdown:', error);
            process.exit(1);
        }
    });

    // Таймаут для принудительного завершения
    setTimeout(() => {
        logger.error('⏰ Таймаут graceful shutdown, принудительное завершение');
        process.exit(1);
    }, 30000); // 30 секунд
};

// Обработчики сигналов
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
    logger.error('💥 Необработанное исключение:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('� Необработанное отклонение Promise:', { reason, promise });
    gracefulShutdown('unhandledRejection');
});

export default app; 