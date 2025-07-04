// DiLauncher Server - Railway Compatible Version
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Инициализация
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API конфигурация
const GEMINI_API_KEY = 'AIzaSyDivBxbfDHZA7VqGmV21bCzWZ5PnLIDpBI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Middleware
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

app.use(cors());
app.use(compression());
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

// Простая авторизация (mock данные)
app.post('/api/auth/login', (req, res) => {
    const { login, password } = req.body;

    // Тестовые аккаунты
    const testUsers = {
        'steve': 'password123',
        'alex': 'password123',
        'admin': 'admin123'
    };

    if (testUsers[login] && testUsers[login] === password) {
        res.json({
            success: true,
            message: 'Успешная авторизация',
            user: {
                id: Math.floor(Math.random() * 1000),
                username: login,
                displayName: login.charAt(0).toUpperCase() + login.slice(1)
            },
            token: 'test-jwt-token-' + Date.now()
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Неверный логин или пароль'
        });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Все поля обязательны'
        });
    }

    res.json({
        success: true,
        message: 'Регистрация успешна',
        user: {
            id: Math.floor(Math.random() * 1000),
            username,
            email,
            displayName: username
        }
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