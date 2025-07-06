import express from 'express';
import { userQueries } from '../database/database.js';

const router = express.Router();

// Получение всех пользователей для админ панели
router.get('/users', async (req, res) => {
    try {
        console.log('🛡️ Admin: Запрос списка пользователей');
        
        const users = await userQueries.getAllUsers();
        
        res.json({
            success: true,
            users: users,
            message: 'Пользователи загружены успешно'
        });
        
        console.log('✅ Admin: Отправлено пользователей:', users.length);
        
    } catch (error) {
        console.error('❌ Admin: Ошибка получения пользователей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении пользователей'
        });
    }
});

// Отправка скримера пользователю
router.post('/screamer', async (req, res) => {
    try {
        const { target } = req.body;
        
        if (!target) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать цель (email или username)'
            });
        }
        
        console.log('👻 Admin: Отправка скримера для:', target);
        
        // Ищем пользователя
        const user = await userQueries.findByLogin(target);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        // Сохраняем "скример" в глобальной переменной для данного пользователя
        global.screamerTargets = global.screamerTargets || new Set();
        global.screamerTargets.add(user.id);
        
        console.log('🎃 Admin: Скример активирован для:', user.username);
        
        res.json({
            success: true,
            message: `Скример отправлен пользователю ${user.username}`,
            target: user.username
        });
        
    } catch (error) {
        console.error('❌ Admin: Ошибка отправки скримера:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при отправке скримера'
        });
    }
});

// Сброс всех онлайн статусов (для очистки зависших сессий)
router.post('/reset-online', async (req, res) => {
    try {
        console.log('🛡️ Admin: Сброс всех онлайн статусов');
        
        await userQueries.resetAllOnlineStatus();
        
        res.json({
            success: true,
            message: 'Все онлайн статусы сброшены'
        });
        
        console.log('✅ Admin: Онлайн статусы сброшены');
        
    } catch (error) {
        console.error('❌ Admin: Ошибка сброса онлайн статусов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при сбросе статусов'
        });
    }
});

export default router; 