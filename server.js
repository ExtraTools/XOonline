// DiLauncher Server - Railway Compatible Version
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './db.js';

dotenv.config();

// Инициализация
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}));

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(join(__dirname, 'public')));

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
            'Кроссплатформенность'
        ],
        supportedVersions: [
            '1.21.6', '1.21.5', '1.21.4', '1.21.3',
            '1.20.4', '1.20.2', '1.20.1',
            '1.19.4', '1.19.2'
        ]
    });
});

// ===== Database initialisation =====
(async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('📚 PostgreSQL connected & users table ensured');
  } catch (err) {
    console.error('Database init error:', err);
  }
})();

// ===== JWT helper =====
const signToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET || 'development_secret', { expiresIn: '7d' });

const authMiddleware = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Требуется авторизация' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development_secret');
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Неверный токен' });
  }
};

// ===== Auth routes (PostgreSQL) =====
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Все поля обязательны' });
  }
  try {
    const hashed = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username.trim(), email.trim().toLowerCase(), hashed]
    );
    const user = rows[0];
    const token = signToken(user.id);
    res.json({ success: true, message: 'Регистрация успешна', user, token });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ success: false, message: 'Пользователь с таким именем или email уже существует' });
    }
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ success: false, message: 'Все поля обязательны' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username=$1 OR email=$1 LIMIT 1',
      [login]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
    delete user.password_hash;
    const token = signToken(user.id);
    res.json({ success: true, message: 'Успешная авторизация', user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Требуется авторизация' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development_secret');
    const { rows } = await pool.query('SELECT id, username, email, created_at FROM users WHERE id=$1', [payload.id]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Пользователь не найден' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(401).json({ success: false, message: 'Неверный или просроченный токен' });
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

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DiLauncher сервер запущен на порту ${PORT}`);
    console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
    console.log(`⏰ Время запуска: ${new Date().toISOString()}`);
    console.log(`📊 Node.js версия: ${process.version}`);
    console.log(`🔧 Окружение: ${process.env.NODE_ENV || 'production'}`);
});

export default app; 