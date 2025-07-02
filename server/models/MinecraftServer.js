import { query, run } from '../database/database.js';
import axios from 'axios';

export class MinecraftServer {
    constructor(serverData) {
        Object.assign(this, serverData);
        
        // Парсим JSON поля если они строки
        if (typeof this.tags === 'string') {
            this.tags = JSON.parse(this.tags);
        }
    }

    // Добавление сервера в избранное
    static async addToFavorites(userId, serverData) {
        const {
            name,
            address,
            port = 25565,
            version = null,
            tags = []
        } = serverData;

        // Проверяем, не добавлен ли уже сервер
        const existing = await query(
            'SELECT id FROM saved_servers WHERE user_id = $1 AND address = $2 AND port = $3',
            [userId, address, port]
        );

        if (existing.rows && existing.rows.length > 0) {
            throw new Error('Сервер уже добавлен в избранное');
        }

        try {
            // Получаем информацию о сервере
            const serverInfo = await MinecraftServer.getServerStatus(address, port);

            const result = await run(
                `INSERT INTO saved_servers 
                (user_id, name, address, port, version, motd, favicon_url, 
                 player_count, max_players, ping, is_online, tags, is_favorite)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
                [
                    userId,
                    name || serverInfo.description?.text || address,
                    address,
                    port,
                    version || serverInfo.version?.name,
                    serverInfo.description?.text || '',
                    serverInfo.favicon || null,
                    serverInfo.players?.online || 0,
                    serverInfo.players?.max || 0,
                    serverInfo.ping || null,
                    serverInfo.online || false,
                    JSON.stringify(tags),
                    true
                ]
            );

            const server = new MinecraftServer(result.rows ? result.rows[0] : { id: result.lastID, ...serverData });
            return server;
        } catch (error) {
            // Если не удалось получить статус, добавляем с базовой информацией
            const result = await run(
                `INSERT INTO saved_servers 
                (user_id, name, address, port, version, tags, is_favorite, is_online)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [userId, name || address, address, port, version, JSON.stringify(tags), true, false]
            );

            const server = new MinecraftServer(result.rows ? result.rows[0] : { id: result.lastID, ...serverData });
            return server;
        }
    }

    // Поиск сервера по ID
    static async findById(id) {
        const result = await query(
            'SELECT * FROM saved_servers WHERE id = $1',
            [id]
        );

        if (result.rows && result.rows.length > 0) {
            return new MinecraftServer(result.rows[0]);
        }
        return null;
    }

    // Получение серверов пользователя
    static async findByUserId(userId) {
        const result = await query(
            `SELECT * FROM saved_servers 
             WHERE user_id = $1 
             ORDER BY is_favorite DESC, added_at DESC`,
            [userId]
        );

        return (result.rows || []).map(server => new MinecraftServer(server));
    }

    // Получение статуса сервера
    static async getServerStatus(address, port = 25565) {
        const startTime = Date.now();
        
        try {
            // Используем Minecraft Server Status API
            const response = await axios.get(
                `https://api.mcsrvstat.us/3/${address}:${port}`,
                { timeout: 5000 }
            );

            const data = response.data;
            const ping = Date.now() - startTime;

            return {
                online: data.online || false,
                version: data.version,
                players: data.players,
                description: data.motd,
                favicon: data.icon,
                ping: ping,
                hostname: data.hostname,
                ip: data.ip,
                port: data.port,
                software: data.software,
                plugins: data.plugins,
                mods: data.mods
            };
        } catch (error) {
            console.error(`Ошибка получения статуса сервера ${address}:${port}:`, error.message);
            return {
                online: false,
                ping: null,
                error: error.message
            };
        }
    }

    // Обновление статуса сервера
    async updateStatus() {
        try {
            const status = await MinecraftServer.getServerStatus(this.address, this.port);

            await run(
                `UPDATE saved_servers SET 
                 motd = $1, favicon_url = $2, player_count = $3, max_players = $4, 
                 ping = $5, is_online = $6, last_checked_at = CURRENT_TIMESTAMP, version = $7
                 WHERE id = $8`,
                [
                    status.description?.text || this.motd,
                    status.favicon || this.favicon_url,
                    status.players?.online || 0,
                    status.players?.max || this.max_players,
                    status.ping,
                    status.online,
                    status.version?.name || this.version,
                    this.id
                ]
            );

            // Обновляем локальные данные
            this.motd = status.description?.text || this.motd;
            this.favicon_url = status.favicon || this.favicon_url;
            this.player_count = status.players?.online || 0;
            this.max_players = status.players?.max || this.max_players;
            this.ping = status.ping;
            this.is_online = status.online;
            this.version = status.version?.name || this.version;
            this.last_checked_at = new Date();

            return status;
        } catch (error) {
            console.error(`Ошибка обновления статуса сервера ${this.address}:`, error);
            
            await run(
                'UPDATE saved_servers SET is_online = false, last_checked_at = CURRENT_TIMESTAMP WHERE id = $1',
                [this.id]
            );
            
            this.is_online = false;
            this.last_checked_at = new Date();
            
            throw error;
        }
    }

    // Обновление информации о сервере
    async update(updateData) {
        const allowedFields = ['name', 'version', 'tags', 'is_favorite'];
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                
                if (key === 'tags') {
                    values.push(typeof value === 'string' ? value : JSON.stringify(value));
                } else {
                    values.push(value);
                }
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            throw new Error('Нет данных для обновления');
        }

        values.push(this.id);
        const sql = `UPDATE saved_servers SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

        await run(sql, values);

        // Обновляем локальные данные
        Object.assign(this, updateData);
    }

    // Удаление сервера
    async delete() {
        await run('DELETE FROM saved_servers WHERE id = $1', [this.id]);
    }

    // Добавление/удаление из избранного
    async toggleFavorite() {
        const newFavoriteStatus = !this.is_favorite;
        
        await run(
            'UPDATE saved_servers SET is_favorite = $1 WHERE id = $2',
            [newFavoriteStatus, this.id]
        );
        
        this.is_favorite = newFavoriteStatus;
        return newFavoriteStatus;
    }

    // Добавление тега
    async addTag(tag) {
        const currentTags = Array.isArray(this.tags) ? this.tags : [];
        
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            
            await run(
                'UPDATE saved_servers SET tags = $1 WHERE id = $2',
                [JSON.stringify(currentTags), this.id]
            );
            
            this.tags = currentTags;
        }
    }

    // Удаление тега
    async removeTag(tag) {
        const currentTags = Array.isArray(this.tags) ? this.tags : [];
        const filteredTags = currentTags.filter(t => t !== tag);
        
        await run(
            'UPDATE saved_servers SET tags = $1 WHERE id = $2',
            [JSON.stringify(filteredTags), this.id]
        );
        
        this.tags = filteredTags;
    }

    // Получение истории пинга (если реализовано логирование)
    async getPingHistory(days = 7) {
        // Здесь можно реализовать логирование пинга в отдельную таблицу
        // Пока возвращаем текущий пинг
        return [{
            timestamp: this.last_checked_at,
            ping: this.ping,
            online: this.is_online
        }];
    }

    // Представление сервера для API
    toJSON() {
        return {
            id: this.id,
            userId: this.user_id,
            name: this.name,
            address: this.address,
            port: this.port,
            version: this.version,
            motd: this.motd,
            faviconUrl: this.favicon_url,
            playerCount: this.player_count,
            maxPlayers: this.max_players,
            ping: this.ping,
            isOnline: this.is_online,
            isFavorite: this.is_favorite,
            tags: this.tags,
            addedAt: this.added_at,
            lastCheckedAt: this.last_checked_at
        };
    }

    // Статические методы для обслуживания

    // Обновление статуса всех серверов пользователя
    static async updateAllUserServers(userId) {
        const servers = await MinecraftServer.findByUserId(userId);
        const results = [];

        for (const server of servers) {
            try {
                const status = await server.updateStatus();
                results.push({ server: server.toJSON(), status: 'updated', info: status });
            } catch (error) {
                results.push({ server: server.toJSON(), status: 'error', error: error.message });
            }
        }

        return results;
    }

    // Обновление статуса серверов, которые давно не проверялись
    static async updateStaleServers(hoursThreshold = 1) {
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - hoursThreshold);

        const result = await query(
            `SELECT * FROM saved_servers 
             WHERE last_checked_at < $1 OR last_checked_at IS NULL
             ORDER BY last_checked_at ASC NULLS FIRST
             LIMIT 50`,
            [threshold.toISOString()]
        );

        const servers = (result.rows || []).map(server => new MinecraftServer(server));
        const updateResults = [];

        for (const server of servers) {
            try {
                await server.updateStatus();
                updateResults.push({ serverId: server.id, status: 'updated' });
            } catch (error) {
                updateResults.push({ serverId: server.id, status: 'error', error: error.message });
            }
        }

        return updateResults;
    }

    // Поиск серверов по тегам
    static async findByTags(tags, userId = null) {
        let sql = `SELECT * FROM saved_servers WHERE `;
        const params = [];
        let paramIndex = 1;

        if (userId) {
            sql += `user_id = $${paramIndex} AND `;
            params.push(userId);
            paramIndex++;
        }

        // Поиск по тегам (упрощенная версия для SQLite/PostgreSQL)
        const tagConditions = tags.map(tag => {
            params.push(`%"${tag}"%`);
            return `tags LIKE $${paramIndex++}`;
        });

        sql += `(${tagConditions.join(' OR ')}) ORDER BY is_favorite DESC, added_at DESC`;

        const result = await query(sql, params);
        return (result.rows || []).map(server => new MinecraftServer(server));
    }

    // Поиск популярных серверов
    static async getPopularServers(limit = 20) {
        const result = await query(
            `SELECT address, port, COUNT(*) as users_count, 
                    MAX(player_count) as max_players_seen,
                    AVG(ping) as avg_ping,
                    STRING_AGG(DISTINCT name, ', ') as names
             FROM saved_servers 
             WHERE is_online = true
             GROUP BY address, port
             HAVING COUNT(*) > 1
             ORDER BY users_count DESC, max_players_seen DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows || [];
    }

    // Получение статистики серверов
    static async getServerStats() {
        const result = await query(
            `SELECT 
                COUNT(*) as total_servers,
                COUNT(*) FILTER (WHERE is_online = true) as online_servers,
                COUNT(*) FILTER (WHERE is_favorite = true) as favorite_servers,
                AVG(ping) FILTER (WHERE ping IS NOT NULL) as avg_ping,
                SUM(player_count) as total_players
             FROM saved_servers`,
            []
        );

        const stats = result.rows ? result.rows[0] : result;
        return {
            totalServers: parseInt(stats.total_servers || 0),
            onlineServers: parseInt(stats.online_servers || 0),
            favoriteServers: parseInt(stats.favorite_servers || 0),
            avgPing: Math.round(parseFloat(stats.avg_ping || 0)),
            totalPlayers: parseInt(stats.total_players || 0)
        };
    }
}

export default MinecraftServer;