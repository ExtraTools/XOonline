// DiLauncher Server - Railway Compatible Version
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { userQueries, initDatabase } from './server/database/database.js';
import bcrypt from 'bcrypt';

// Импортируем роуты авторизации
import authRoutes from './server/routes/auth.js';
import profileRoutes from './server/routes/profile.js';
import minecraftRoutes from './server/routes/minecraft.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = 'AIzaSyDivBxbfDHZA7VqGmV21bCzWZ5PnLIDpBI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-for-development';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://generativelanguage.googleapis.com"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['https://xoonline-production-63d1.up.railway.app'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(join(__dirname, 'public')));
app.use('/FRONTS', express.static(join(__dirname, 'FRONTS')));
app.use('/uploads', express.static(join(__dirname, 'public/uploads')));

// Middleware для отключения кеширования
app.use((req, res, next) => {
    // Отключаем кеширование для всех файлов
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    
    // Дополнительные заголовки для предотвращения кеширования
    if (req.path.endsWith('.html') || req.path.endsWith('.css') || req.path.endsWith('.js')) {
        res.set({
            'Last-Modified': new Date().toUTCString(),
            'ETag': Date.now().toString()
        });
    }
    
    next();
});

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Подключаем роуты авторизации
app.use('/api/auth', authRoutes);

// Подключаем роуты профилей
app.use('/api/profile', profileRoutes);

// Подключаем роуты Minecraft
app.use('/api/minecraft', minecraftRoutes);

// Маршрут для страницы профиля
app.get('/profile.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'profile.html'));
});

// GML Launcher авторизация - для кастомной авторизации лаунчера
// Полная реализация согласно документации: https://gml-launcher.github.io/Gml.Docs/integrations-auth-custom.html
app.post('/api/launcher/auth', async (req, res) => {
    try {
        const { Login, Password } = req.body;
        
        console.log('🎮 GML Launcher auth attempt for:', Login);
        
        if (!Login || !Password) {
            return res.status(400).json({
                Message: 'Логин и пароль обязательны'
            });
        }

        // Ищем пользователя по логину (email или username)
        const user = await userQueries.findByLogin(Login);
        
        if (!user) {
            console.log('❌ GML Auth: Пользователь не найден:', Login);
            return res.status(404).json({
                Message: 'Пользователь не найден'
            });
        }

        console.log('🟢 GML Auth: Пользователь найден:', user.username);

        // Проверяем статус пользователя
        if (user.status === 'banned') {
            console.log('🚫 GML Auth: Пользователь заблокирован:', user.username);
            return res.status(403).json({
                Message: 'Пользователь заблокирован. Причина: Нарушение правил сервера'
            });
        }

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(Password, user.password_hash);
        
        if (!isPasswordValid) {
            console.log('❌ GML Auth: Неверный пароль для:', user.username);
            return res.status(401).json({
                Message: 'Неверный логин или пароль'
            });
        }

        // Обновляем статус онлайн
        await userQueries.updateOnlineStatus(user.id, true);

        console.log('✅ GML Auth: Успешная авторизация:', user.username);

        // Успешная авторизация - возвращаем данные согласно спецификации GML
        return res.status(200).json({
            Login: user.username,
            UserUuid: user.uuid,
            Message: 'Успешная авторизация'
        });

    } catch (error) {
        console.error('❌ Ошибка GML авторизации:', error);
        return res.status(500).json({
            Message: 'Внутренняя ошибка сервера'
        });
    }
});

// Дополнительный endpoint для проверки статуса пользователя в GML
app.get('/api/launcher/user/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        const user = await userQueries.findByUuid(uuid);
        
        if (!user) {
            return res.status(404).json({
                Message: 'Пользователь не найден'
            });
        }

        return res.status(200).json({
            Login: user.username,
            UserUuid: user.uuid,
            Status: user.status,
            IsOnline: user.is_online,
            LastLogin: user.last_login
        });

    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error);
        return res.status(500).json({
            Message: 'Внутренняя ошибка сервера'
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        version: '2.0.0',
        uptime: process.uptime()
    });
});

app.get('/api/status', (req, res) => {
        res.json({
        status: 'ok', 
        message: 'DiLauncher сервер работает на Railway',
        version: '2.0.0',
        features: [
            'Railway деплой',
            'Статический контент',
            'API endpoints',
            'Кроссплатформенность',
            'ИИ-помощник по Minecraft',
            'Email/пароль авторизация',
            'GML Launcher совместимость'
        ],
        supportedVersions: [
            '1.21.6', '1.21.5', '1.21.4', '1.21.3',
            '1.20.4', '1.20.2', '1.20.1',
            '1.19.4', '1.19.2'
        ]
    });
});

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Сообщение не может быть пустым'
            });
        }

        const systemPrompt = `Ты - ИИ-помощник для DiLauncher, универсальный эксперт по Minecraft. Помогаешь игрокам со всеми аспектами игры.

Основные области твоей экспертизы:
- Моды и модпаки для всех версий Minecraft
- Gameplay советы и механики игры
- Строительство и редстоун
- Фармы и автоматизация
- Выживание и достижения
- Серверы и мультиплеер
- Настройки производительности
- Решение технических проблем
- Совместимость модов
- OptiFine, шейдеры и ресурспаки

Поддерживаемые модлоадеры:
- Forge (классический, много модов)
- Fabric (легкий, быстрый)
- Quilt (форк Fabric)  
- NeoForge (новый форк Forge)

Ты знаешь обо всех версиях Minecraft - от альфа до последних релизов. Всегда уточняй версию, если это важно для ответа.

Отвечай на русском языке кратко и по делу. Если не знаешь точной информации, честно скажи об этом и предложи альтернативы.`;

        const fullPrompt = `${systemPrompt}\n\nКонтекст: ${context || 'Пользователь спрашивает о Minecraft'}\n\nВопрос пользователя: ${message}`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: fullPrompt
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            
            res.json({
                success: true,
                response: aiResponse,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Нет ответа от ИИ');
        }

    } catch (error) {
        console.error('Ошибка ИИ-помощника:', error);
        res.status(500).json({
            success: false,
            message: 'Извините, ИИ-помощник временно недоступен. Попробуйте позже.',
            error: error.message
        });
    }
});

// Профили лаунчера
app.get('/api/launcher/profiles', (req, res) => {
    res.json({
        success: true,
        profiles: [
            {
                id: 1,
                name: 'Основной профиль',
                minecraftVersion: '1.21.6',
                modLoader: 'vanilla',
                memoryAllocation: 4096,
                lastPlayed: new Date().toISOString(),
                playtime: 0
            },
            {
                id: 2,
                name: 'Модовый профиль',
                minecraftVersion: '1.20.4',
                modLoader: 'forge',
                memoryAllocation: 6144,
                lastPlayed: null,
                playtime: 0
            }
        ]
    });
});

app.post('/api/launcher/profiles', (req, res) => {
    const { name, minecraftVersion, modLoader, memoryAllocation } = req.body;
    
    res.json({
        success: true,
        message: 'Профиль создан',
        profile: {
            id: Math.floor(Math.random() * 1000),
            name: name || 'Новый профиль',
            minecraftVersion: minecraftVersion || '1.21.6',
            modLoader: modLoader || 'vanilla',
            memoryAllocation: memoryAllocation || 4096,
            createdAt: new Date().toISOString()
        }
        });
});

// Серверы
app.get('/api/launcher/servers', (req, res) => {
    res.json({
        success: true,
        servers: [
            {
                id: 1,
                name: 'Hypixel',
                address: 'mc.hypixel.net',
                port: 25565,
                isOnline: true,
                playerCount: 45678,
                maxPlayers: 100000,
                ping: 25
            },
            {
                id: 2,
                name: 'Mineplex',
                address: 'us.mineplex.com',
                port: 25565,
                isOnline: true,
                playerCount: 12345,
                maxPlayers: 50000,
                ping: 42
            }
        ]
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: 'Что-то пошло не так'
    });
});

// 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint не найден'
    });
}); 

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Запуск сервера с инициализацией базы данных
async function startServer() {
    try {
        // Инициализируем базу данных
        await initDatabase();
        console.log('✅ База данных инициализирована успешно');
        
        // Запускаем сервер
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 DiLauncher сервер запущен на порту ${PORT}`);
            console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
            console.log(`⏰ Время запуска: ${new Date().toISOString()}`);
            console.log(`📊 Node.js версия: ${process.version}`);
            console.log(`🔧 Окружение: ${process.env.NODE_ENV || 'production'}`);
            console.log(`🎮 GML Launcher API: /api/launcher/auth`);
            console.log(`🔐 Web Auth API: /api/auth/*`);
        });
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

startServer();

export default app; 