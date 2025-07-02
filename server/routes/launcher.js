import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken } from './auth.js';
import User from '../models/User.js';
import LauncherProfile from '../models/LauncherProfile.js';
import MinecraftServer from '../models/MinecraftServer.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting для API лаунчера
const launcherLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 минут
    max: 100, // максимум 100 запросов
    message: { 
        success: false, 
        message: 'Слишком много запросов к API лаунчера. Попробуйте через 5 минут.' 
    }
});

// Применяем rate limiting ко всем роутам
router.use(launcherLimiter);

// Все роуты требуют авторизации
router.use(authenticateToken);

// ===== ПРОФИЛИ ЛАУНЧЕРА =====

// Получение всех профилей пользователя
router.get('/profiles', async (req, res) => {
    try {
        const profiles = await LauncherProfile.findByUserId(req.user.id);
        
        // Добавляем информацию о модах для каждого профиля
        const profilesWithMods = await Promise.all(profiles.map(async (profile) => {
            const mods = await profile.getMods();
            return {
                ...profile.toJSON(),
                modsCount: mods.length,
                enabledModsCount: mods.filter(mod => mod.is_enabled).length
            };
        }));

        res.json({
            success: true,
            profiles: profilesWithMods
        });
    } catch (error) {
        console.error('Ошибка получения профилей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения профилей'
        });
    }
});

// Создание нового профиля
router.post('/profiles', [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Название профиля должно быть от 1 до 100 символов'),
    body('minecraftVersion').isLength({ min: 1 }).withMessage('Версия Minecraft обязательна'),
    body('modLoader').optional().isIn(['vanilla', 'forge', 'fabric', 'quilt']).withMessage('Неверный тип модлоадера'),
    body('description').optional().isLength({ max: 500 }).withMessage('Описание не должно превышать 500 символов'),
    body('memoryAllocation').optional().isInt({ min: 512, max: 32768 }).withMessage('Память должна быть от 512 до 32768 МБ')
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

        const profile = await LauncherProfile.create(req.user.id, req.body);

        res.status(201).json({
            success: true,
            message: 'Профиль создан успешно',
            profile: profile.toJSON()
        });
    } catch (error) {
        console.error('Ошибка создания профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания профиля'
        });
    }
});

// Получение конкретного профиля
router.get('/profiles/:id', async (req, res) => {
    try {
        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        const mods = await profile.getMods();
        const compatibility = await profile.checkModCompatibility();

        res.json({
            success: true,
            profile: {
                ...profile.toJSON(),
                mods,
                compatibility
            }
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения профиля'
        });
    }
});

// Обновление профиля
router.patch('/profiles/:id', [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('memoryAllocation').optional().isInt({ min: 512, max: 32768 }),
    body('settings').optional().isObject()
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

        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        await profile.update(req.body);

        res.json({
            success: true,
            message: 'Профиль обновлен',
            profile: profile.toJSON()
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления профиля'
        });
    }
});

// Удаление профиля
router.delete('/profiles/:id', async (req, res) => {
    try {
        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        await profile.delete();

        res.json({
            success: true,
            message: 'Профиль удален'
        });
    } catch (error) {
        console.error('Ошибка удаления профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления профиля'
        });
    }
});

// Клонирование профиля
router.post('/profiles/:id/clone', [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Название для копии обязательно')
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

        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        const clonedProfile = await profile.clone(req.body.name);

        res.status(201).json({
            success: true,
            message: 'Профиль скопирован',
            profile: clonedProfile.toJSON()
        });
    } catch (error) {
        console.error('Ошибка клонирования профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка клонирования профиля'
        });
    }
});

// Запуск игры (обновление статистики)
router.post('/profiles/:id/launch', async (req, res) => {
    try {
        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        await profile.updateLastPlayed();

        res.json({
            success: true,
            message: 'Запуск зарегистрирован'
        });
    } catch (error) {
        console.error('Ошибка при запуске:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при запуске'
        });
    }
});

// Добавление времени игры
router.post('/profiles/:id/playtime', [
    body('minutes').isInt({ min: 1 }).withMessage('Время игры должно быть положительным числом')
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

        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        await profile.addPlaytime(req.body.minutes);

        res.json({
            success: true,
            message: 'Время игры обновлено'
        });
    } catch (error) {
        console.error('Ошибка обновления времени игры:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления времени игры'
        });
    }
});

// ===== МОДЫ =====

// Добавление мода в профиль
router.post('/profiles/:id/mods', [
    body('modId').notEmpty().withMessage('ID мода обязателен'),
    body('modName').notEmpty().withMessage('Название мода обязательно'),
    body('modVersion').optional(),
    body('modSource').optional().isIn(['curseforge', 'modrinth', 'manual']),
    body('fileName').notEmpty().withMessage('Имя файла обязательно'),
    body('dependencies').optional().isArray()
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

        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        const mod = await profile.addMod(req.body);

        res.status(201).json({
            success: true,
            message: 'Мод добавлен',
            mod
        });
    } catch (error) {
        console.error('Ошибка добавления мода:', error);
        
        if (error.message.includes('уже установлен')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ошибка добавления мода'
        });
    }
});

// Удаление мода из профиля
router.delete('/profiles/:id/mods/:modId', async (req, res) => {
    try {
        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        const removed = await profile.removeMod(req.params.modId);
        
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Мод не найден'
            });
        }

        res.json({
            success: true,
            message: 'Мод удален'
        });
    } catch (error) {
        console.error('Ошибка удаления мода:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления мода'
        });
    }
});

// Включение/выключение мода
router.patch('/profiles/:id/mods/:modId/toggle', [
    body('enabled').isBoolean().withMessage('Статус включения должен быть boolean')
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

        const profile = await LauncherProfile.findById(req.params.id);
        
        if (!profile || profile.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Профиль не найден'
            });
        }

        await profile.toggleMod(req.params.modId, req.body.enabled);

        res.json({
            success: true,
            message: `Мод ${req.body.enabled ? 'включен' : 'выключен'}`
        });
    } catch (error) {
        console.error('Ошибка переключения мода:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка переключения мода'
        });
    }
});

// ===== СЕРВЕРЫ =====

// Получение сохраненных серверов
router.get('/servers', async (req, res) => {
    try {
        const servers = await MinecraftServer.findByUserId(req.user.id);
        
        res.json({
            success: true,
            servers: servers.map(server => server.toJSON())
        });
    } catch (error) {
        console.error('Ошибка получения серверов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения серверов'
        });
    }
});

// Добавление сервера в избранное
router.post('/servers', [
    body('name').notEmpty().withMessage('Название сервера обязательно'),
    body('address').notEmpty().withMessage('Адрес сервера обязателен'),
    body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Порт должен быть от 1 до 65535'),
    body('tags').optional().isArray()
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

        const server = await MinecraftServer.addToFavorites(req.user.id, req.body);

        res.status(201).json({
            success: true,
            message: 'Сервер добавлен в избранное',
            server: server.toJSON()
        });
    } catch (error) {
        console.error('Ошибка добавления сервера:', error);
        
        if (error.message.includes('уже добавлен')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Ошибка добавления сервера'
        });
    }
});

// Получение статуса сервера
router.get('/servers/status', [
    query('address').notEmpty().withMessage('Адрес сервера обязателен'),
    query('port').optional().isInt({ min: 1, max: 65535 })
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

        const { address, port = 25565 } = req.query;
        const status = await MinecraftServer.getServerStatus(address, parseInt(port));

        res.json({
            success: true,
            status
        });
    } catch (error) {
        console.error('Ошибка получения статуса сервера:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статуса сервера'
        });
    }
});

// Обновление сервера
router.patch('/servers/:id', [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('tags').optional().isArray(),
    body('isFavorite').optional().isBoolean()
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

        const server = await MinecraftServer.findById(req.params.id);
        
        if (!server || server.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Сервер не найден'
            });
        }

        await server.update(req.body);

        res.json({
            success: true,
            message: 'Сервер обновлен',
            server: server.toJSON()
        });
    } catch (error) {
        console.error('Ошибка обновления сервера:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления сервера'
        });
    }
});

// Удаление сервера
router.delete('/servers/:id', async (req, res) => {
    try {
        const server = await MinecraftServer.findById(req.params.id);
        
        if (!server || server.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Сервер не найден'
            });
        }

        await server.delete();

        res.json({
            success: true,
            message: 'Сервер удален'
        });
    } catch (error) {
        console.error('Ошибка удаления сервера:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления сервера'
        });
    }
});

// Обновление статуса всех серверов пользователя
router.post('/servers/refresh', async (req, res) => {
    try {
        const results = await MinecraftServer.updateAllUserServers(req.user.id);

        res.json({
            success: true,
            message: 'Статус серверов обновлен',
            results
        });
    } catch (error) {
        console.error('Ошибка обновления серверов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления серверов'
        });
    }
});

// ===== СТАТИСТИКА И АНАЛИТИКА =====

// Статистика профилей пользователя
router.get('/stats/profiles', async (req, res) => {
    try {
        const stats = await LauncherProfile.getUserStats(req.user.id);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Ошибка получения статистики профилей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

// Популярные версии Minecraft
router.get('/stats/versions', async (req, res) => {
    try {
        const versions = await LauncherProfile.getPopularVersions();

        res.json({
            success: true,
            versions
        });
    } catch (error) {
        console.error('Ошибка получения статистики версий:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

// Популярные модлоадеры
router.get('/stats/modloaders', async (req, res) => {
    try {
        const modLoaders = await LauncherProfile.getPopularModLoaders();

        res.json({
            success: true,
            modLoaders
        });
    } catch (error) {
        console.error('Ошибка получения статистики модлоадеров:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

// Статистика серверов
router.get('/stats/servers', async (req, res) => {
    try {
        const stats = await MinecraftServer.getServerStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Ошибка получения статистики серверов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

// ===== НАСТРОЙКИ ЛАУНЧЕРА =====

// Получение настроек лаунчера
router.get('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const preferences = user.preferences || {};

        res.json({
            success: true,
            settings: preferences.launcher || {}
        });
    } catch (error) {
        console.error('Ошибка получения настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения настроек'
        });
    }
});

// Обновление настроек лаунчера
router.patch('/settings', [
    body('autoStart').optional().isBoolean(),
    body('minimizeToTray').optional().isBoolean(),
    body('defaultMemory').optional().isInt({ min: 512, max: 32768 }),
    body('theme').optional().isIn(['light', 'dark', 'auto']),
    body('language').optional().isIn(['ru', 'en'])
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

        const user = await User.findById(req.user.id);
        const currentPrefs = user.preferences || {};
        
        const updatedPrefs = {
            ...currentPrefs,
            launcher: {
                ...(currentPrefs.launcher || {}),
                ...req.body
            }
        };

        await user.updatePreferences(updatedPrefs);

        res.json({
            success: true,
            message: 'Настройки обновлены',
            settings: updatedPrefs.launcher
        });
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления настроек'
        });
    }
});

export default router;