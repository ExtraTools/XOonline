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
            connectSrc: ["'self'", "ws:", "wss:"]
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

// Middleware для парсинга
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии
app.use(session({
    secret: process.env.SESSION_SECRET || 'dino-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 дней
    }
}));

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

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Инициализация базы данных и запуск сервера
const PORT = process.env.PORT || 3000;

initDatabase()
    .then(() => {
        // Очистка истекших сессий при запуске
        sessionQueries.cleanup()
            .then(() => console.log('🧹 Очищены истекшие сессии'))
            .catch(err => console.error('Ошибка очистки сессий:', err));

        httpServer.listen(PORT, () => {
            console.log(`🚀 DinoGames сервер запущен на порту ${PORT}`);
            console.log(`🌐 Откройте http://localhost:${PORT}`);
            console.log(`📊 База данных SQLite готова`);
        });
    })
    .catch((error) => {
        console.error('❌ Ошибка инициализации базы данных:', error);
        process.exit(1);
    }); 