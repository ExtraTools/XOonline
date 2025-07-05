import jwt from 'jsonwebtoken';
import { userQueries, sessionQueries } from '../database/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dino-secret-key';

// Middleware для проверки JWT токена
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Токен доступа не предоставлен' });
        }

        // 1. Проверяем сессию в базе данных
        const session = await sessionQueries.findByToken(token);
        if (!session) {
            return res.status(401).json({ error: 'Сессия не найдена или недействительна. Пожалуйста, войдите снова.' });
        }

        // 2. Верифицируем JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. Получаем пользователя из базы данных по правильному полю
        const user = await userQueries.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'Недействительный токен: пользователь не найден' });
        }

        // Добавляем пользователя в запрос
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Недействительный токен' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истёк' });
        } else {
            console.error('Ошибка аутентификации:', error);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
};

// Генерация JWT токена
export const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username,
            email: user.email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Middleware для проверки роли администратора
export const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Доступ запрещён' });
    }
};

// Middleware для проверки онлайн статуса
export const updateOnlineStatus = async (req, res, next) => {
    try {
        if (req.user) {
            await userQueries.updateOnlineStatus(req.user.id, true);
            await userQueries.updateLastLogin(req.user.id);
        }
        next();
    } catch (error) {
        console.error('Ошибка обновления онлайн статуса:', error);
        next(); // Продолжаем выполнение даже если не удалось обновить статус
    }
};

export default {
    authenticateToken,
    generateToken,
    requireAdmin,
    updateOnlineStatus
}; 