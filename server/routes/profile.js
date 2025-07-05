import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { profileQueries, statsQueries, achievementQueries, friendsQueries, userQueries } from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Настройка Multer для загрузки аватаров
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = join(__dirname, '../../public/uploads/avatars');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}.png`);
    }
});

const upload = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Неверный тип файла, разрешены только изображения!'), false);
        }
    }
});

// Получение профиля пользователя
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userQueries.getFullUserInfo(userId);
        
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
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Обновление никнейма
router.post('/update-username', authenticateToken, [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Имя пользователя должно быть от 3 до 20 символов')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Ошибка валидации', errors: errors.array() });
    }

    try {
        const { username } = req.body;
        const userId = req.user.id;
        
        // Проверяем, занят ли никнейм другим пользователем
        const existingUser = await userQueries.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ success: false, message: 'Этот никнейм уже занят' });
        }
        
        await userQueries.updateUsername(userId, username);
        res.json({ success: true, message: 'Никнейм успешно обновлен' });
    } catch (error) {
        console.error('Ошибка обновления никнейма:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Смена пароля
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Текущий пароль обязателен'),
    body('newPassword').isLength({ min: 6 }).withMessage('Новый пароль должен быть не менее 6 символов')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Ошибка валидации', errors: errors.array() });
    }
    
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        const user = await userQueries.findById(userId);
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Текущий пароль неверен' });
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        await userQueries.updatePassword(userId, newPasswordHash);
        
        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Обновление аватара по URL (для стандартных)
router.post('/change-avatar', authenticateToken, [
    body('avatar_url').isURL().withMessage('Неверный URL аватара')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Ошибка валидации', errors: errors.array() });
    }

    try {
        const { avatar_url } = req.body;
        await userQueries.updateAvatar(req.user.id, avatar_url);
        res.json({ success: true, message: 'Аватар обновлен' });
    } catch (error) {
        console.error('Ошибка обновления аватара:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Загрузка кастомного аватара
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл аватара не был загружен' });
        }
        
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await userQueries.updateAvatar(req.user.id, avatarUrl);
        
        res.json({ success: true, message: 'Аватар успешно загружен', avatar_url: avatarUrl });
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
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