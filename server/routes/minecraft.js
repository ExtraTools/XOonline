import express from 'express';
import fetch from 'node-fetch';
import { userQueries } from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Базовые URL для Minecraft API
const MOJANG_API_BASE = 'https://api.mojang.com';
const MINECRAFT_SERVICES_BASE = 'https://api.minecraftservices.com';
const SESSION_SERVER_BASE = 'https://sessionserver.mojang.com';
const CRAFATAR_BASE = 'https://crafatar.com';

// Получение UUID игрока по никнейму
router.get('/uuid/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        // Используем Mojang API для получения UUID
        const response = await fetch(`${MOJANG_API_BASE}/users/profiles/minecraft/${username}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Игрок не найден' 
                });
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        res.json({
            success: true,
            data: {
                uuid: data.id,
                username: data.name,
                legacy: data.legacy || false,
                demo: data.demo || false
            }
        });
    } catch (error) {
        console.error('Ошибка получения UUID:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при получении данных игрока' 
        });
    }
});

// Получение информации о скине игрока
router.get('/profile/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        // Получаем профиль игрока из Mojang API
        const response = await fetch(`${SESSION_SERVER_BASE}/session/minecraft/profile/${uuid}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Профиль игрока не найден' 
                });
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Декодируем текстуры
        let textures = null;
        if (data.properties && data.properties.length > 0) {
            const textureProperty = data.properties.find(prop => prop.name === 'textures');
            if (textureProperty) {
                const decodedTextures = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString('utf8'));
                textures = decodedTextures.textures;
            }
        }
        
        res.json({
            success: true,
            data: {
                uuid: data.id,
                username: data.name,
                textures: textures,
                // Генерируем URL для отображения скина
                skinUrl: textures && textures.SKIN ? textures.SKIN.url : null,
                skinModel: textures && textures.SKIN && textures.SKIN.metadata ? textures.SKIN.metadata.model : 'classic',
                capeUrl: textures && textures.CAPE ? textures.CAPE.url : null,
                // URL для головы игрока (используем Crafatar)
                headUrl: `${CRAFATAR_BASE}/heads/${uuid}?size=64&overlay`,
                // URL для полного аватара (используем Crafatar)
                avatarUrl: `${CRAFATAR_BASE}/avatars/${uuid}?size=128&overlay`,
                // URL для 3D рендера
                renderUrl: `${CRAFATAR_BASE}/renders/body/${uuid}?size=256&overlay`
            }
        });
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при получении профиля игрока' 
        });
    }
});

// Связывание Minecraft аккаунта с профилем пользователя
router.post('/link-account', authenticateToken, async (req, res) => {
    try {
        const { minecraftUsername } = req.body;
        const userId = req.user.id;
        
        if (!minecraftUsername) {
            return res.status(400).json({ 
                success: false, 
                message: 'Никнейм Minecraft не указан' 
            });
        }
        
        // Получаем UUID игрока
        const uuidResponse = await fetch(`${MOJANG_API_BASE}/users/profiles/minecraft/${minecraftUsername}`);
        
        if (!uuidResponse.ok) {
            if (uuidResponse.status === 404) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Игрок с таким никнеймом не найден' 
                });
            }
            throw new Error(`HTTP error! status: ${uuidResponse.status}`);
        }
        
        const uuidData = await uuidResponse.json();
        const minecraftUuid = uuidData.id;
        
        // Проверяем, не связан ли уже этот Minecraft аккаунт с другим пользователем
        const existingUser = await userQueries.findByMinecraftUuid(minecraftUuid);
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Этот Minecraft аккаунт уже связан с другим пользователем' 
            });
        }
        
        // Получаем информацию о скине
        const profileResponse = await fetch(`${SESSION_SERVER_BASE}/session/minecraft/profile/${minecraftUuid}`);
        let skinUrl = null;
        let skinModel = 'classic';
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            
            if (profileData.properties && profileData.properties.length > 0) {
                const textureProperty = profileData.properties.find(prop => prop.name === 'textures');
                if (textureProperty) {
                    const decodedTextures = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString('utf8'));
                    if (decodedTextures.textures && decodedTextures.textures.SKIN) {
                        skinUrl = decodedTextures.textures.SKIN.url;
                        skinModel = decodedTextures.textures.SKIN.metadata && decodedTextures.textures.SKIN.metadata.model === 'slim' ? 'slim' : 'classic';
                    }
                }
            }
        }
        
        // Обновляем данные пользователя
        await userQueries.updateMinecraftData(userId, minecraftUuid, minecraftUsername, skinUrl, skinModel);
        
        res.json({
            success: true,
            message: 'Minecraft аккаунт успешно связан',
            data: {
                minecraft_uuid: minecraftUuid,
                minecraft_username: minecraftUsername,
                skin_url: skinUrl,
                skin_model: skinModel,
                head_url: `${CRAFATAR_BASE}/heads/${minecraftUuid}?size=64&overlay`,
                avatar_url: `${CRAFATAR_BASE}/avatars/${minecraftUuid}?size=128&overlay`,
                render_url: `${CRAFATAR_BASE}/renders/body/${minecraftUuid}?size=256&overlay`
            }
        });
    } catch (error) {
        console.error('Ошибка связывания аккаунта:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при связывании аккаунта' 
        });
    }
});

// Отвязывание Minecraft аккаунта
router.post('/unlink-account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Очищаем данные Minecraft
        await userQueries.updateMinecraftData(userId, null, null, null, 'classic');
        
        res.json({
            success: true,
            message: 'Minecraft аккаунт отвязан'
        });
    } catch (error) {
        console.error('Ошибка отвязывания аккаунта:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при отвязывании аккаунта' 
        });
    }
});

// Обновление скина пользователя
router.post('/update-skin', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userQueries.getFullUserInfo(userId);
        
        if (!user.minecraft_uuid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Minecraft аккаунт не связан' 
            });
        }
        
        // Получаем актуальную информацию о скине
        const profileResponse = await fetch(`${SESSION_SERVER_BASE}/session/minecraft/profile/${user.minecraft_uuid}`);
        
        if (!profileResponse.ok) {
            return res.status(404).json({ 
                success: false, 
                message: 'Не удалось получить информацию о скине' 
            });
        }
        
        const profileData = await profileResponse.json();
        let skinUrl = null;
        let skinModel = 'classic';
        
        if (profileData.properties && profileData.properties.length > 0) {
            const textureProperty = profileData.properties.find(prop => prop.name === 'textures');
            if (textureProperty) {
                const decodedTextures = JSON.parse(Buffer.from(textureProperty.value, 'base64').toString('utf8'));
                if (decodedTextures.textures && decodedTextures.textures.SKIN) {
                    skinUrl = decodedTextures.textures.SKIN.url;
                    skinModel = decodedTextures.textures.SKIN.metadata && decodedTextures.textures.SKIN.metadata.model === 'slim' ? 'slim' : 'classic';
                }
            }
        }
        
        // Обновляем данные о скине
        await userQueries.updateMinecraftData(userId, user.minecraft_uuid, user.minecraft_username, skinUrl, skinModel);
        
        res.json({
            success: true,
            message: 'Скин обновлен',
            data: {
                skin_url: skinUrl,
                skin_model: skinModel,
                head_url: `${CRAFATAR_BASE}/heads/${user.minecraft_uuid}?size=64&overlay`,
                avatar_url: `${CRAFATAR_BASE}/avatars/${user.minecraft_uuid}?size=128&overlay`,
                render_url: `${CRAFATAR_BASE}/renders/body/${user.minecraft_uuid}?size=256&overlay`
            }
        });
    } catch (error) {
        console.error('Ошибка обновления скина:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при обновлении скина' 
        });
    }
});

// Получение популярных скинов для демонстрации
router.get('/popular-skins', async (req, res) => {
    try {
        // Список популярных игроков для демонстрации
        const popularPlayers = [
            'Notch', 'jeb_', 'dinnerbone', 'Grumm', 'dream',
            'technoblade', 'skeppy', 'tommyinnit', 'wilbursoot', 'philza'
        ];
        
        const skins = [];
        
        for (const player of popularPlayers) {
            try {
                const response = await fetch(`${MOJANG_API_BASE}/users/profiles/minecraft/${player}`);
                if (response.ok) {
                    const data = await response.json();
                    skins.push({
                        name: data.name,
                        uuid: data.id,
                        head_url: `${CRAFATAR_BASE}/heads/${data.id}?size=64&overlay`,
                        avatar_url: `${CRAFATAR_BASE}/avatars/${data.id}?size=128&overlay`,
                        render_url: `${CRAFATAR_BASE}/renders/body/${data.id}?size=256&overlay`
                    });
                }
            } catch (error) {
                console.error(`Ошибка получения скина для ${player}:`, error);
            }
        }
        
        res.json({
            success: true,
            data: skins
        });
    } catch (error) {
        console.error('Ошибка получения популярных скинов:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при получении популярных скинов' 
        });
    }
});

export default router; 