import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import DiscordStrategy from 'passport-discord';
import JwtStrategy from 'passport-jwt';
import User from '../models/User.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Константы
const JWT_SECRET = process.env.JWT_SECRET || 'dilauncher-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dilauncher-refresh-secret';

// Rate limiting для авторизации
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 попыток
    message: { 
        success: false, 
        message: 'Слишком много попыток входа. Попробуйте через 15 минут.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3, // максимум 3 регистрации в час
    message: { 
        success: false, 
        message: 'Слишком много попыток регистрации. Попробуйте через час.' 
    }
});

// Конфигурация Passport.js
passport.use(new JwtStrategy({
    jwtFromRequest: (req) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    },
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const user = await User.findById(payload.userId);
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    } catch (error) {
        return done(error, false);
    }
}));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Проверяем, есть ли пользователь с таким Google ID
            let user = await User.findByOAuthId('google', profile.id);
            
            if (user) {
                return done(null, user);
            }

            // Проверяем по email
            user = await User.findByEmail(profile.emails[0].value);
            if (user) {
                // Связываем аккаунт Google с существующим пользователем
                await user.linkOAuthAccount('google', profile.id);
                return done(null, user);
            }

            // Создаем нового пользователя
            user = await User.create({
                username: profile.emails[0].value.split('@')[0],
                email: profile.emails[0].value,
                displayName: profile.displayName,
                provider: 'google',
                providerId: profile.id
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Discord OAuth Strategy
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: '/api/auth/discord/callback',
        scope: ['identify', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findByOAuthId('discord', profile.id);
            
            if (user) {
                return done(null, user);
            }

            user = await User.findByEmail(profile.email);
            if (user) {
                await user.linkOAuthAccount('discord', profile.id);
                return done(null, user);
            }

            user = await User.create({
                username: profile.username,
                email: profile.email,
                displayName: profile.global_name || profile.username,
                provider: 'discord',
                providerId: profile.id
            });

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Middleware для аутентификации
export const authenticateToken = passport.authenticate('jwt', { session: false });

// Middleware для получения информации об устройстве
const getDeviceInfo = (req) => {
    return {
        userAgent: req.get('User-Agent') || '',
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date(),
        platform: req.get('X-Platform') || 'web'
    };
};

// Валидация для регистрации
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Имя пользователя должно быть от 3 до 20 символов')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры, дефисы и подчеркивания'),
    
    body('email')
        .isEmail()
        .withMessage('Введите корректный email')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Пароль должен быть не менее 8 символов')
        .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Пароль должен содержать строчные и заглавные буквы, а также цифры'),

    body('displayName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Отображаемое имя должно быть от 1 до 50 символов')
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
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Ошибки валидации',
                errors: errors.array()
            });
        }

        const { username, email, password, displayName } = req.body;
        const deviceInfo = getDeviceInfo(req);

        // Создаем пользователя
        const user = await User.create({
            username,
            email,
            password,
            displayName
        });

        // Генерируем токены
        const { accessToken, refreshToken } = user.generateTokens(deviceInfo);
        
        // Сохраняем refresh токен
        await user.saveRefreshToken(refreshToken, deviceInfo);
        
        // Обновляем время последнего входа
        await user.updateLastLogin();

        // Логируем действие
        await user.logAction('register', { 
            method: 'email',
            userAgent: deviceInfo.userAgent 
        }, deviceInfo.ip, deviceInfo.userAgent);

        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            user: user.toPrivateProfile(),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '15m'
            }
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        
        if (error.message.includes('уже существует')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Вход
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Ошибки валидации',
                errors: errors.array()
            });
        }

        const { login, password } = req.body;
        const deviceInfo = getDeviceInfo(req);

        // Находим пользователя
        const user = await User.findByLogin(login);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        // Проверяем пароль
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.logAction('login_failed', { 
                reason: 'invalid_password',
                userAgent: deviceInfo.userAgent 
            }, deviceInfo.ip, deviceInfo.userAgent);

            return res.status(401).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        // Генерируем токены
        const { accessToken, refreshToken } = user.generateTokens(deviceInfo);
        
        // Сохраняем refresh токен
        await user.saveRefreshToken(refreshToken, deviceInfo);
        
        // Обновляем время последнего входа
        await user.updateLastLogin();

        // Логируем успешный вход
        await user.logAction('login', { 
            method: 'password',
            userAgent: deviceInfo.userAgent 
        }, deviceInfo.ip, deviceInfo.userAgent);

        res.json({
            success: true,
            message: 'Вход выполнен успешно',
            user: user.toPrivateProfile(),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '15m'
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Обновление токена
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh токен не предоставлен'
            });
        }

        // Верифицируем refresh токен
        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
            
            // Проверяем токен в базе данных
            const user = await User.findByRefreshToken(refreshToken);
            if (!user) {
                return res.status(403).json({
                    success: false,
                    message: 'Недействительный refresh токен'
                });
            }

            const deviceInfo = getDeviceInfo(req);

            // Генерируем новые токены
            const tokens = user.generateTokens(deviceInfo);
            
            // Отзываем старый токен и сохраняем новый
            await User.revokeRefreshToken(refreshToken);
            await user.saveRefreshToken(tokens.refreshToken, deviceInfo);

            res.json({
                success: true,
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: '15m'
                }
            });

        } catch (jwtError) {
            return res.status(403).json({
                success: false,
                message: 'Недействительный refresh токен'
            });
        }

    } catch (error) {
        console.error('Ошибка обновления токена:', error);
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
        const user = req.user;

        if (refreshToken) {
            await User.revokeRefreshToken(refreshToken);
        }

        // Устанавливаем статус оффлайн
        await user.setOnlineStatus(false);

        // Логируем выход
        const deviceInfo = getDeviceInfo(req);
        await user.logAction('logout', {
            userAgent: deviceInfo.userAgent
        }, deviceInfo.ip, deviceInfo.userAgent);

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

// Выход со всех устройств
router.post('/logout-all', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        // Отзываем все refresh токены пользователя
        await User.revokeAllUserTokens(user.id);

        // Устанавливаем статус оффлайн
        await user.setOnlineStatus(false);

        // Логируем выход
        const deviceInfo = getDeviceInfo(req);
        await user.logAction('logout_all', {
            userAgent: deviceInfo.userAgent
        }, deviceInfo.ip, deviceInfo.userAgent);

        res.json({
            success: true,
            message: 'Выход выполнен со всех устройств'
        });

    } catch (error) {
        console.error('Ошибка выхода:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Получение профиля
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        res.json({
            success: true,
            user: user.toPrivateProfile()
        });

    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Обновление профиля
router.patch('/profile', authenticateToken, [
    body('displayName').optional().isLength({ min: 1, max: 50 }),
    body('preferences').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Ошибки валидации',
                errors: errors.array()
            });
        }

        const user = req.user;
        const { displayName, preferences } = req.body;

        const updates = {};
        if (displayName !== undefined) updates.display_name = displayName;

        if (Object.keys(updates).length > 0) {
            await user.update(updates);
        }

        if (preferences) {
            await user.updatePreferences(preferences);
        }

        const deviceInfo = getDeviceInfo(req);
        await user.logAction('profile_update', {
            updates: Object.keys(updates),
            userAgent: deviceInfo.userAgent
        }, deviceInfo.ip, deviceInfo.userAgent);

        res.json({
            success: true,
            message: 'Профиль обновлен',
            user: user.toPrivateProfile()
        });

    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
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
        user: req.user.toPublicProfile()
    });
});

// Google OAuth
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

router.get('/google/callback', 
    passport.authenticate('google', { session: false }),
    async (req, res) => {
        try {
            const user = req.user;
            const deviceInfo = getDeviceInfo(req);

            const { accessToken, refreshToken } = user.generateTokens(deviceInfo);
            await user.saveRefreshToken(refreshToken, deviceInfo);
            await user.updateLastLogin();

            await user.logAction('login', { 
                method: 'google_oauth',
                userAgent: deviceInfo.userAgent 
            }, deviceInfo.ip, deviceInfo.userAgent);

            // Редирект с токенами (в продакшене лучше использовать безопасный метод)
            const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
            res.redirect(redirectUrl);

        } catch (error) {
            console.error('Ошибка Google OAuth:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
        }
    }
);

// Discord OAuth
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback',
    passport.authenticate('discord', { session: false }),
    async (req, res) => {
        try {
            const user = req.user;
            const deviceInfo = getDeviceInfo(req);

            const { accessToken, refreshToken } = user.generateTokens(deviceInfo);
            await user.saveRefreshToken(refreshToken, deviceInfo);
            await user.updateLastLogin();

            await user.logAction('login', { 
                method: 'discord_oauth',
                userAgent: deviceInfo.userAgent 
            }, deviceInfo.ip, deviceInfo.userAgent);

            const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
            res.redirect(redirectUrl);

        } catch (error) {
            console.error('Ошибка Discord OAuth:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
        }
    }
);

// Служебные роуты

// Очистка истекших токенов
router.post('/cleanup', async (req, res) => {
    try {
        const cleaned = await User.cleanupExpiredTokens();
        res.json({
            success: true,
            message: `Очищено ${cleaned} истекших токенов`
        });
    } catch (error) {
        console.error('Ошибка очистки токенов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка очистки токенов'
        });
    }
});

// Статистика онлайн пользователей
router.get('/online', async (req, res) => {
    try {
        const onlineCount = await User.getOnlineCount();
        res.json({
            success: true,
            onlineUsers: onlineCount
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

export default router; 