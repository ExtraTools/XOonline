// Server Module - DinoGames 2025
// ES Modules и современный Node.js

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

// Импорт модулей базы данных и роутов
import { initDatabase, sessionQueries } from './server/database/database.js';
import authRoutes from './server/routes/auth.js';
import lobbyRoutes from './server/routes/lobby.js';

// Загрузка переменных окружения
dotenv.config();

// Получение __dirname для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создание Express приложения
const app = express();
const httpServer = createServer(app);

// Инициализация Socket.IO
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Безопасность
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://discord.com", "https://discordapp.com"]
        }
    }
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов
});

app.use('/api/', limiter);

// Логирование запросов
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Middleware для парсинга
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
if (process.env.NODE_ENV === 'production') {
    // В production используем простые сессии для Railway
    app.use(session({
        secret: process.env.SESSION_SECRET || 'dino-secret-railway-prod',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // HTTP в Railway
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 // 1 день для production
        }
    }));
} else {
    // В development стандартные сессии
    app.use(session({
        secret: process.env.SESSION_SECRET || 'dino-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 дней
        }
    }));
}

// Статические файлы
app.use(express.static(join(__dirname, 'public')));
app.use('/socket.io', express.static(join(__dirname, 'node_modules/socket.io/client-dist')));
app.use('/FRONTS', express.static(join(__dirname, 'FRONTS')));

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/lobby', lobbyRoutes);

// Системные API маршруты
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Health check для Railway
app.get('/health', (req, res) => {
    console.log('🏥 Health check запрос');
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    console.log('🏠 Запрос главной страницы');
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
        res.json({
        status: 'ok', 
        message: 'DinosGames сервер работает',
        version: '2.0.0',
        features: [
            'Express сервер',
            'SQLite база данных', 
            'Система авторизации',
            'Socket.IO',
            'Шрифты Benzin',
            'Темная тема'
        ]
    });
});

// SPA fallback - должен быть последним
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Инициализация базы данных и запуск сервера
const PORT = process.env.PORT || 3000;

console.log('🔧 Начинаем инициализацию DinosGames...');
console.log(`📡 Порт: ${PORT}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Запускаем сервер сразу без ожидания БД
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DinoGames сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сервер доступен на 0.0.0.0:${PORT}`);
    console.log(`📊 Инициализируем базу данных...`);
    
    // Инициализируем БД асинхронно
    initDatabase()
        .then(() => {
            console.log('✅ База данных SQLite готова');
            // Очистка истекших сессий при запуске
            sessionQueries.cleanup()
                .then(() => console.log('🧹 Очищены истекшие сессии'))
                .catch(err => console.error('⚠️ Ошибка очистки сессий:', err));
        })
        .catch((error) => {
            console.error('❌ Ошибка инициализации базы данных:', error);
            // Не выходим, позволяем серверу работать без БД
        });
}).on('error', (error) => {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен SIGTERM, завершаем работу...');
    httpServer.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Получен SIGINT, завершаем работу...');
    httpServer.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
}); 