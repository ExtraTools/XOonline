import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { userQueries, refreshTokenQueries } from '../database/database.js';

const router = express.Router();

// Константы
const JWT_SECRET = process.env.JWT_SECRET || 'dino-secret-key';
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

// Middleware для проверки авторизации
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Токен доступа не предоставлен' 
        });
    }

    try {
        // Верифицируем JWT access token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userQueries.findById(decoded.userId);

        if (!user) {
            return res.status(403).json({ success: false, message: 'Пользователь не найден' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        return res.status(403).json({ success: false, message: 'Недействительный токен' });
    }
};

// Валидация для регистрации
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Имя пользователя должно быть от 3 до 20 символов')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
    
    body('email')
        .isEmail()
        .withMessage('Введите корректный email')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 1 })
        .withMessage('Пароль обязателен')
];

// Валидация для входа
const loginValidation = [
    body('login')
        .notEmpty()
        .withMessage('Введите email или никнейм'),
    
    body('password')
        .notEmpty()
        .withMessage('Пароль обязателен')
];

// Генерация криптостойкого refresh токена
const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

// Регистрация
router.post('/register', registerValidation, async (req, res) => {
    try {
        console.log('📝 Register attempt:', req.body);
        
        // Проверяем валидацию
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Register validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Ошибки валидации',
                errors: errors.array()
            });
        }

        const { username, email, password } = req.body;

        // Проверяем уникальность email
        const existingUserByEmail = await userQueries.findByEmail(email);
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует'
            });
        }

        // Проверяем уникальность username
        const existingUserByUsername = await userQueries.findByUsername(username);
        if (existingUserByUsername) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким именем уже существует'
            });
        }

        // Создаем пользователя (пароль будет захеширован автоматически в модели)
        const user = await userQueries.create(username, email, password);

        // Создаем access и refresh токены
        const accessToken = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        const refreshToken = generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
        await refreshTokenQueries.create(user.id, refreshToken, expiresAt.toISOString());

        // Устанавливаем статус онлайн
        await userQueries.updateOnlineStatus(user.id, true);

        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Вход
router.post('/login', loginValidation, async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body);
        
        // Проверяем валидацию
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Ошибки валидации',
                errors: errors.array()
            });
        }

        const { login, password } = req.body;
        console.log('🔍 Looking for user:', login);
        console.log('🔍 Input password:', password);

        // Находим пользователя по email или username
        let user = await userQueries.findByEmail(login);
        if (!user) {
            user = await userQueries.findByUsername(login);
        }
        
        if (!user) {
            console.log('❌ User not found:', login);
            return res.status(400).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }
        
        console.log('🟢 User found:', user.username);
        console.log('🔑 Password hash from DB:', user.password_hash ? 'exists' : 'missing');
        console.log('🔍 Hash length:', user.password_hash ? user.password_hash.length : 'null');

        // ВРЕМЕННАЯ ДИАГНОСТИКА - создаем тестовый хеш
        const testHash = await bcrypt.hash(password, 12);
        console.log('🧪 Test hash for current password:', testHash);
        
        // Проверяем пароль
        console.log('🔍 Input password length:', password.length);
        console.log('🔍 Stored hash length:', user.password_hash ? user.password_hash.length : 'null');
        
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔐 Password validation result:', isPasswordValid);
        
        // ВРЕМЕННАЯ ДИАГНОСТИКА - проверяем прямое сравнение
        if (!isPasswordValid) {
            console.log('❌ Password validation failed for user:', user.username);
            console.log('❌ Input password:', password);
            console.log('❌ Hash from DB:', user.password_hash);
            
            // ВРЕМЕННОЕ РЕШЕНИЕ: если пароль равен простому тексту
            if (password === user.password_hash) {
                console.log('🚨 FOUND ISSUE: Password stored as plain text!');
                console.log('🔧 Fixing by updating hash...');
                
                // Обновляем пароль с правильным хешем
                const newHash = await bcrypt.hash(password, 12);
                await userQueries.updatePassword(user.id, newHash);
                console.log('✅ Password hash updated');
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный логин или пароль'
                });
            }
        }

        // Создаем access и refresh токены
        const accessToken = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        const refreshToken = generateRefreshToken();
        const rtExpiresAt = new Date();
        rtExpiresAt.setDate(rtExpiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
        await refreshTokenQueries.create(user.id, refreshToken, rtExpiresAt.toISOString());

        // Устанавливаем статус онлайн
        await userQueries.updateOnlineStatus(user.id, true);

        res.json({
            success: true,
            message: 'Вход выполнен успешно',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                total_games: user.total_games,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Выход
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await refreshTokenQueries.revoke(refreshToken);
        }
        
        // Устанавливаем статус оффлайн
        await userQueries.updateOnlineStatus(req.user.id, false);

        res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });

    } catch (error) {
        console.error('Ошибка выхода:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Получение профиля текущего пользователя
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await userQueries.findById(req.user.id);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url,
                created_at: user.created_at,
                last_login: user.last_login,
                total_games: user.total_games,
                wins: user.wins,
                losses: user.losses,
                draws: user.draws,
                rating: user.rating
            }
        });

    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Проверка токена
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Токен действителен',
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// ВРЕМЕННЫЙ МАРШРУТ ДЛЯ ОТЛАДКИ - удалить позже (оставляем, но под условием ENV)
if (process.env.NODE_ENV !== 'production') {
router.post('/debug-login', async (req, res) => {
    try {
        const { login, password } = req.body;
        console.log('🐛 DEBUG LOGIN:', { login, password });
        
        // Находим пользователя
        let user = await userQueries.findByEmail(login);
        if (!user) {
            user = await userQueries.findByUsername(login);
        }
        
        if (!user) {
            return res.json({ success: false, message: 'Пользователь не найден', debug: true });
        }
        
        console.log('🐛 DEBUG USER:', {
            id: user.id,
            username: user.username,
            email: user.email,
            hasHash: !!user.password_hash,
            hashLength: user.password_hash?.length,
            hashStart: user.password_hash?.substring(0, 10) + '...'
        });
        
        // Проверяем разные варианты
        const directMatch = password === user.password_hash;
        const bcryptMatch = await bcrypt.compare(password, user.password_hash);
        
        console.log('🐛 DEBUG CHECKS:', { directMatch, bcryptMatch });
        
        res.json({
            success: false,
            debug: true,
            info: {
                userFound: true,
                username: user.username,
                hasHash: !!user.password_hash,
                hashLength: user.password_hash?.length,
                directMatch,
                bcryptMatch,
                inputLength: password.length
            }
        });
        
    } catch (error) {
        console.error('🐛 DEBUG ERROR:', error);
        res.json({ success: false, error: error.message, debug: true });
    }
});
}

// Endpoint для обновления access токена
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh токен не предоставлен' });
        }

        const stored = await refreshTokenQueries.findByToken(refreshToken);
        if (!stored) {
            return res.status(403).json({ success: false, message: 'Недействительный токен' });
        }

        const user = await userQueries.findById(stored.user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        // Генерируем новый access токен
        const newAccess = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        res.json({ success: true, accessToken: newAccess });
    } catch (err) {
        console.error('Ошибка refresh:', err);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

export default router; 