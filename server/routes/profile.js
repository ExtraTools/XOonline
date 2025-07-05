import express from 'express';
import { profileQueries, statsQueries, achievementQueries, friendsQueries } from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получение профиля пользователя
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Получаем базовую информацию профиля
        const profile = await profileQueries.getProfile(userId);
        
        if (!profile) {
            // Создаем профиль если его нет
            await profileQueries.createProfile(userId, {
                level: 1,
                rating: 1000,
                avatar: 'avatars/photo_2025-07-03_02-50-32.jpg'
            });
            
            const newProfile = await profileQueries.getProfile(userId);
            return res.json(newProfile);
        }
        
        res.json(profile);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление аватара
router.post('/avatar', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { avatar } = req.body;
        
        if (!avatar) {
            return res.status(400).json({ error: 'Аватар не указан' });
        }
        
        await profileQueries.updateAvatar(userId, avatar);
        res.json({ success: true, message: 'Аватар обновлен' });
    } catch (error) {
        console.error('Ошибка обновления аватара:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение статистики игрока
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await statsQueries.getPlayerStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление статистики после игры
router.post('/stats/game', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { result, gameMode, duration } = req.body;
        
        await statsQueries.updateGameStats(userId, {
            result, // 'win' или 'loss'
            gameMode,
            duration
        });
        
        // Проверяем достижения
        await checkAchievements(userId, result);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение достижений
router.get('/achievements', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const achievements = await achievementQueries.getUserAchievements(userId);
        res.json(achievements);
    } catch (error) {
        console.error('Ошибка получения достижений:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка друзей
router.get('/friends', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const friends = await friendsQueries.getFriendsList(userId);
        res.json(friends);
    } catch (error) {
        console.error('Ошибка получения друзей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление друга
router.post('/friends/add', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendName } = req.body;
        
        if (!friendName) {
            return res.status(400).json({ error: 'Имя друга не указано' });
        }
        
        // Находим пользователя по имени
        const friend = await profileQueries.findUserByName(friendName);
        if (!friend) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (friend.id === userId) {
            return res.status(400).json({ error: 'Нельзя добавить себя в друзья' });
        }
        
        // Проверяем, не является ли уже другом
        const existingFriendship = await friendsQueries.checkFriendship(userId, friend.id);
        if (existingFriendship) {
            return res.status(400).json({ error: 'Пользователь уже в друзьях' });
        }
        
        await friendsQueries.addFriend(userId, friend.id);
        res.json({ success: true, message: 'Запрос в друзья отправлен' });
    } catch (error) {
        console.error('Ошибка добавления друга:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Принятие запроса в друзья
router.post('/friends/accept', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendId } = req.body;
        
        await friendsQueries.acceptFriendRequest(userId, friendId);
        res.json({ success: true, message: 'Запрос в друзья принят' });
    } catch (error) {
        console.error('Ошибка принятия запроса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление друга
router.delete('/friends/:friendId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendId } = req.params;
        
        await friendsQueries.removeFriend(userId, friendId);
        res.json({ success: true, message: 'Друг удален' });
    } catch (error) {
        console.error('Ошибка удаления друга:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение активности профиля
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const activity = await profileQueries.getRecentActivity(userId);
        res.json(activity);
    } catch (error) {
        console.error('Ошибка получения активности:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление записи активности
router.post('/activity', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, description } = req.body;
        
        await profileQueries.addActivity(userId, type, description);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка добавления активности:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление рейтинга игрока
router.post('/rating/update', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { change, reason } = req.body;
        
        const newRating = await profileQueries.updateRating(userId, change);
        
        // Логируем изменение рейтинга
        await profileQueries.addActivity(userId, 'rating_change', 
            `Рейтинг ${change > 0 ? 'увеличился' : 'уменьшился'} на ${Math.abs(change)} (${reason})`);
        
        res.json({ success: true, newRating });
    } catch (error) {
        console.error('Ошибка обновления рейтинга:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение топ игроков
router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const leaderboard = await profileQueries.getLeaderboard(limit, offset);
        res.json(leaderboard);
    } catch (error) {
        console.error('Ошибка получения топа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Поиск игроков
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Слишком короткий запрос' });
        }
        
        const players = await profileQueries.searchPlayers(query);
        res.json(players);
    } catch (error) {
        console.error('Ошибка поиска игроков:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка и выдача достижений
async function checkAchievements(userId, gameResult) {
    try {
        const stats = await statsQueries.getPlayerStats(userId);
        const achievements = [];
        
        // Проверяем различные достижения
        if (stats.totalGames === 1) {
            achievements.push('first_game');
        }
        
        if (stats.wins === 1) {
            achievements.push('first_win');
        }
        
        if (stats.currentStreak >= 5) {
            achievements.push('win_streak_5');
        }
        
        if (stats.wins >= 10) {
            achievements.push('wins_10');
        }
        
        if (stats.wins >= 50) {
            achievements.push('wins_50');
        }
        
        if (stats.wins >= 100) {
            achievements.push('wins_100');
        }
        
        if (stats.winRate >= 70 && stats.totalGames >= 20) {
            achievements.push('high_winrate');
        }
        
        // Выдаем новые достижения
        for (const achievementId of achievements) {
            const hasAchievement = await achievementQueries.hasAchievement(userId, achievementId);
            if (!hasAchievement) {
                await achievementQueries.unlockAchievement(userId, achievementId);
                
                // Добавляем в активность
                const achievementData = getAchievementData(achievementId);
                await profileQueries.addActivity(userId, 'achievement', 
                    `Получено достижение: ${achievementData.name}`);
            }
        }
    } catch (error) {
        console.error('Ошибка проверки достижений:', error);
    }
}

// Данные достижений
function getAchievementData(achievementId) {
    const achievements = {
        first_game: { name: 'Первая игра', description: 'Сыграйте свою первую игру' },
        first_win: { name: 'Первая победа', description: 'Выиграйте свою первую игру' },
        win_streak_5: { name: 'Огненная серия', description: 'Выиграйте 5 игр подряд' },
        wins_10: { name: 'Новичок', description: 'Выиграйте 10 игр' },
        wins_50: { name: 'Опытный игрок', description: 'Выиграйте 50 игр' },
        wins_100: { name: 'Мастер XO', description: 'Выиграйте 100 игр' },
        high_winrate: { name: 'Эффективный', description: 'Поддерживайте 70% побед в 20+ играх' }
    };
    
    return achievements[achievementId] || { name: 'Неизвестное достижение', description: '' };
}

export default router; 