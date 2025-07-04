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

// Загружаем переменные окружения
dotenv.config();

// Инициализация
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API конфигурация
const GEMINI_API_KEY = 'AIzaSyDivBxbfDHZA7VqGmV21bCzWZ5PnLIDpBI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Discord OAuth конфигурация
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Проверяем наличие обязательных переменных окружения
if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI || !JWT_SECRET) {
    console.error('❌ Отсутствуют обязательные переменные окружения для Discord OAuth');
    console.error('Необходимо установить: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, JWT_SECRET');
    process.exit(1);
}

// Хранилище активных сессий (в продакшене используйте Redis)
const activeSessions = new Map();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "https://cdn.discordapp.com"],
            connectSrc: ["'self'", "ws:", "wss:", "https://generativelanguage.googleapis.com", "https://discord.com", "https://discordapp.com"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['https://xoonline-production-63d1.up.railway.app'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(join(__dirname, 'public')));
app.use('/FRONTS', express.static(join(__dirname, 'FRONTS')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Утилиты для работы с JWT
function generateJWT(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJWT(token) {
    try {
        const [header, payload, signature] = token.split('.');
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${header}.${payload}`)
            .digest('base64url');
        
        if (signature !== expectedSignature) return null;
        
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (decodedPayload.exp < Date.now() / 1000) return null;
        
        return decodedPayload;
    } catch (error) {
        return null;
    }
}

// Middleware для проверки авторизации
function authenticate(req, res, next) {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Токен авторизации не найден'
        });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: 'Недействительный токен'
        });
    }
    
    req.user = decoded;
    next();
}

// API маршруты
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
            'ИИ-помощник по Minecraft'
        ],
        supportedVersions: [
            '1.21.6', '1.21.5', '1.21.4', '1.21.3',
            '1.20.4', '1.20.2', '1.20.1',
            '1.19.4', '1.19.2'
        ]
    });
});

// ИИ-помощник по Minecraft
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Сообщение не может быть пустым'
            });
        }

        // Системный промпт для универсального помощника по Minecraft
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

// Discord OAuth авторизация
app.get('/api/auth/discord', (req, res) => {
    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify&state=${state}`;
    
    // Сохраняем state для проверки
    res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000 // 10 минут
    });
    
    res.redirect(authUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies.oauth_state;
    
    if (!code || !state || state !== storedState) {
        return res.redirect('/?error=invalid_state');
    }
    
    try {
        // Обмен кода на токен
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            throw new Error('Не удалось получить access token');
        }
        
        // Получение информации о пользователе
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });
        
        const userData = await userResponse.json();
        
        // Создание JWT токена
        const jwtPayload = {
            userId: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            avatar: userData.avatar,
            email: userData.email,
            globalName: userData.global_name,
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 дней
        };
        
        const jwtToken = generateJWT(jwtPayload);
        
        // Сохранение сессии
        activeSessions.set(userData.id, {
            token: jwtToken,
            user: userData,
            lastActivity: Date.now()
        });
        
        // Установка cookie
        res.cookie('authToken', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
            sameSite: 'lax'
        });
        
        // Очистка state cookie
        res.clearCookie('oauth_state');
        
        // Перенаправление на главную страницу
        res.redirect('/?auth=success');
        
    } catch (error) {
        console.error('Ошибка Discord OAuth:', error);
        res.redirect('/?error=auth_failed');
    }
});

// Получение информации о текущем пользователе
app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Выход из системы
app.post('/api/auth/logout', authenticate, (req, res) => {
    // Удаляем сессию
    activeSessions.delete(req.user.userId);
    
    // Очищаем cookie
    res.clearCookie('authToken');
    
    res.json({
        success: true,
        message: 'Выход выполнен успешно'
    });
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

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DiLauncher сервер запущен на порту ${PORT}`);
    console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
    console.log(`⏰ Время запуска: ${new Date().toISOString()}`);
    console.log(`📊 Node.js версия: ${process.version}`);
    console.log(`🔧 Окружение: ${process.env.NODE_ENV || 'production'}`);
});

export default app; 