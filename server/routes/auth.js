import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { 
    userQueries, 
    sessionQueries,
    profileQueries
} from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dino-secret-key';
const SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = '7d';

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

        // Создаем профиль для нового пользователя
        await profileQueries.createProfile(user.id, {
            level: 1,
            rating: 1000,
            avatar: 'avatars/default.svg',
            title: 'Новичок XO Online'
        });

        // Создаем JWT токен
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        // Сохраняем сессию в базе
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней
        await sessionQueries.create(user.id, token, expiresAt.toISOString());

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
            token
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
        
        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            console.log('❌ Password validation failed for user:', user.username);
            return res.status(400).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        // Создаем JWT токен
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        // Сохраняем сессию в базе
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней
        await sessionQueries.create(user.id, token, expiresAt.toISOString());

        // Устанавливаем статус онлайн
        await userQueries.updateOnlineStatus(user.id, true);

        res.json({
            success: true,
            message: 'Вход выполнен успешно',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
            token
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
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        // Удаляем сессию из базы
        await sessionQueries.delete(token);
        
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

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await userQueries.getFullUserInfo(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url,
                created_at: user.created_at,
                last_login: user.last_login,
                minecraft: {
                    uuid: user.minecraft_uuid,
                    username: user.minecraft_username,
                    skin_url: user.current_skin_url,
                    skin_model: user.skin_model,
                    head_url: user.minecraft_uuid ? `https://crafatar.com/heads/${user.minecraft_uuid}?size=64&overlay` : null,
                    avatar_url: user.minecraft_uuid ? `https://crafatar.com/avatars/${user.minecraft_uuid}?size=128&overlay` : null,
                    render_url: user.minecraft_uuid ? `https://crafatar.com/renders/body/${user.minecraft_uuid}?size=256&overlay` : null
                }
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

export default router; 