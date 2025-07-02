import tokenService from '../services/tokenService.js';
import User from '../models/User.js';

// Middleware для проверки access токена
export const authenticate = async (req, res, next) => {
    try {
        // Получаем токен из заголовка Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            });
        }

        // Верифицируем токен
        const decoded = tokenService.verifyAccessToken(token);
        
        // Находим пользователя
        const user = await User.findById(decoded.userId)
            .select('-password -refreshTokens -emailVerificationToken -passwordResetToken');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        // Проверяем, не забанен ли пользователь
        if (user.isBanned) {
            const banExpired = user.banExpires && user.banExpires < new Date();
            if (!banExpired) {
                return res.status(403).json({
                    success: false,
                    error: 'Account is banned',
                    reason: user.banReason,
                    expiresAt: user.banExpires
                });
            } else {
                // Снимаем бан, если он истек
                user.isBanned = false;
                user.banReason = null;
                user.banExpires = null;
                await user.save();
            }
        }

        // Обновляем последнюю активность
        user.lastActive = new Date();
        await user.save();

        // Добавляем пользователя в request
        req.user = user;
        req.token = token;
        
        next();
    } catch (error) {
        if (error.message === 'Token expired') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

// Middleware для проверки ролей
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                required: roles,
                current: req.user.role
            });
        }

        next();
    };
};

// Middleware для проверки премиум статуса
export const requirePremium = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    // Админы и модераторы имеют доступ к премиум функциям
    if (['admin', 'moderator'].includes(req.user.role)) {
        return next();
    }

    if (!req.user.isPremium) {
        return res.status(403).json({
            success: false,
            error: 'Premium subscription required',
            code: 'PREMIUM_REQUIRED'
        });
    }

    // Проверяем, не истек ли премиум
    if (req.user.premiumExpires && req.user.premiumExpires < new Date()) {
        req.user.isPremium = false;
        req.user.premiumExpires = null;
        await req.user.save();
        
        return res.status(403).json({
            success: false,
            error: 'Premium subscription expired',
            code: 'PREMIUM_EXPIRED'
        });
    }

    next();
};

// Middleware для проверки верификации email
export const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    if (!req.user.emailVerified) {
        return res.status(403).json({
            success: false,
            error: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    next();
};

// Опциональная аутентификация (не выдает ошибку, если токена нет)
export const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            return next();
        }

        const decoded = tokenService.verifyAccessToken(token);
        const user = await User.findById(decoded.userId)
            .select('-password -refreshTokens -emailVerificationToken -passwordResetToken');
        
        if (user && !user.isBanned) {
            req.user = user;
            req.token = token;
        }
    } catch (error) {
        // Игнорируем ошибки, так как аутентификация опциональна
    }
    
    next();
};

// Middleware для проверки Minecraft сессии
export const authenticateMinecraft = async (req, res, next) => {
    try {
        const token = req.headers['x-minecraft-token'] || req.query.sessionToken;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Minecraft session token required'
            });
        }

        const decoded = tokenService.verifyMinecraftToken(token);
        
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid session'
            });
        }

        const profile = user.profiles.id(decoded.profileId);
        if (!profile) {
            return res.status(401).json({
                success: false,
                error: 'Profile not found'
            });
        }

        req.user = user;
        req.minecraftProfile = profile;
        req.minecraftSession = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid Minecraft session'
        });
    }
};

// Middleware для проверки API ключа
export const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key required'
            });
        }

        const decoded = tokenService.verifyApiKey(apiKey);
        
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        req.user = user;
        req.apiKeyData = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key'
        });
    }
};

// Middleware для проверки прав доступа к профилю
export const checkProfileOwnership = (req, res, next) => {
    const profileId = req.params.profileId;
    
    if (!req.user.profiles.id(profileId)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied to this profile'
        });
    }
    
    next();
};

// Rate limiting для защиты от брутфорса
export const loginRateLimit = (req, res, next) => {
    // Здесь можно добавить логику rate limiting
    // Например, используя redis для отслеживания попыток входа
    next();
};