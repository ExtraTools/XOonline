import express from 'express';
import { userQueries } from '../database/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Получение списка пользователей онлайн
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const onlineUsers = await userQueries.getOnlineUsers();
        
        res.json({
            success: true,
            users: onlineUsers,
            count: onlineUsers.length
        });

    } catch (error) {
        console.error('Ошибка получения списка пользователей:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Получение статистики лобби
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const onlineUsers = await userQueries.getOnlineUsers();
        
        res.json({
            success: true,
            stats: {
                online_users: onlineUsers.length,
                total_rooms: 0, // TODO: добавить когда будут комнаты
                active_games: 0 // TODO: добавить когда будут игры
            }
        });

    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

export default router; 