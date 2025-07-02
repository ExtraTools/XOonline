import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, run } from '../database/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dilauncher-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dilauncher-refresh-secret';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

export class User {
    constructor(userData) {
        Object.assign(this, userData);
    }

    // Создание нового пользователя
    static async create({ username, email, password, displayName, provider = null, providerId = null }) {
        try {
            // Проверяем уникальность
            await User.checkUniqueness(username, email);

            let passwordHash = null;
            if (password) {
                passwordHash = await bcrypt.hash(password, 12);
            }

            const userData = {
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password_hash: passwordHash,
                display_name: displayName || username,
                email_verified: provider ? true : false,
                preferences: JSON.stringify({
                    theme: 'dark',
                    language: 'ru',
                    notifications: {
                        email: true,
                        launcher: true,
                        updates: true
                    },
                    launcher: {
                        autoStart: false,
                        minimizeToTray: true,
                        defaultMemory: 4096
                    }
                })
            };

            // OAuth данные
            if (provider === 'google') userData.google_id = providerId;
            if (provider === 'discord') userData.discord_id = providerId;

            const result = await run(
                `INSERT INTO users (username, email, password_hash, display_name, email_verified, preferences, google_id, discord_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [
                    userData.username,
                    userData.email,
                    userData.password_hash,
                    userData.display_name,
                    userData.email_verified,
                    userData.preferences,
                    userData.google_id || null,
                    userData.discord_id || null
                ]
            );

            const user = new User(result.rows ? result.rows[0] : { id: result.lastID, ...userData });
            
            // Создаем дефолтный профиль лаунчера
            await user.createDefaultProfile();

            return user;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint') || error.code === '23505') {
                if (error.message.includes('username')) {
                    throw new Error('Пользователь с таким именем уже существует');
                }
                if (error.message.includes('email')) {
                    throw new Error('Пользователь с таким email уже существует');
                }
            }
            throw error;
        }
    }

    // Проверка уникальности
    static async checkUniqueness(username, email) {
        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username.toLowerCase(), email.toLowerCase()]
        );

        if (existingUser.rows && existingUser.rows.length > 0) {
            throw new Error('Пользователь с таким именем или email уже существует');
        }
    }

    // Поиск пользователя по email
    static async findByEmail(email) {
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (result.rows && result.rows.length > 0) {
            return new User(result.rows[0]);
        }
        return null;
    }

    // Поиск пользователя по username
    static async findByUsername(username) {
        const result = await query(
            'SELECT * FROM users WHERE username = $1',
            [username.toLowerCase()]
        );
        
        if (result.rows && result.rows.length > 0) {
            return new User(result.rows[0]);
        }
        return null;
    }

    // Поиск пользователя по ID
    static async findById(id) {
        const result = await query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        
        if (result.rows && result.rows.length > 0) {
            return new User(result.rows[0]);
        }
        return null;
    }

    // Поиск по OAuth ID
    static async findByOAuthId(provider, providerId) {
        const field = provider === 'google' ? 'google_id' : 'discord_id';
        const result = await query(
            `SELECT * FROM users WHERE ${field} = $1`,
            [providerId]
        );
        
        if (result.rows && result.rows.length > 0) {
            return new User(result.rows[0]);
        }
        return null;
    }

    // Поиск по email или username (для входа)
    static async findByLogin(login) {
        const result = await query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [login.toLowerCase()]
        );
        
        if (result.rows && result.rows.length > 0) {
            return new User(result.rows[0]);
        }
        return null;
    }

    // Проверка пароля
    async comparePassword(password) {
        if (!this.password_hash) return false;
        return await bcrypt.compare(password, this.password_hash);
    }

    // Генерация токенов
    generateTokens(deviceInfo = {}) {
        const payload = {
            userId: this.id,
            username: this.username,
            email: this.email
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { 
            expiresIn: ACCESS_TOKEN_EXPIRES 
        });

        const refreshToken = jwt.sign(
            { ...payload, deviceInfo }, 
            JWT_REFRESH_SECRET, 
            { expiresIn: REFRESH_TOKEN_EXPIRES }
        );

        return { accessToken, refreshToken };
    }

    // Сохранение refresh токена
    async saveRefreshToken(refreshToken, deviceInfo = {}) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

        await run(
            `INSERT INTO refresh_tokens (user_id, token, expires_at, device_info)
             VALUES ($1, $2, $3, $4)`,
            [
                this.id, 
                refreshToken, 
                expiresAt.toISOString(),
                JSON.stringify(deviceInfo)
            ]
        );
    }

    // Обновление последнего входа
    async updateLastLogin() {
        await run(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, is_online = true WHERE id = $1',
            [this.id]
        );
        this.last_login_at = new Date();
        this.is_online = true;
    }

    // Создание дефолтного профиля лаунчера
    async createDefaultProfile() {
        const defaultSettings = {
            memory: 4096,
            jvmArgs: ['-XX:+UseG1GC', '-XX:+UnlockExperimentalVMOptions'],
            windowSize: { width: 854, height: 480 },
            fullscreen: false,
            autoConnect: false
        };

        await run(
            `INSERT INTO launcher_profiles (user_id, name, description, minecraft_version, mod_loader, settings)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                this.id,
                'Основной профиль',
                'Стандартный профиль для игры в Minecraft',
                '1.21.6',
                'vanilla',
                JSON.stringify(defaultSettings)
            ]
        );
    }

    // Получение профилей пользователя
    async getProfiles() {
        const result = await query(
            `SELECT * FROM launcher_profiles 
             WHERE user_id = $1 AND is_active = true 
             ORDER BY last_played_at DESC NULLS LAST, created_at DESC`,
            [this.id]
        );

        return result.rows || [];
    }

    // Получение сохраненных серверов
    async getSavedServers() {
        const result = await query(
            `SELECT * FROM saved_servers 
             WHERE user_id = $1 
             ORDER BY is_favorite DESC, added_at DESC`,
            [this.id]
        );

        return result.rows || [];
    }

    // Обновление настроек пользователя
    async updatePreferences(newPreferences) {
        const currentPrefs = this.preferences ? 
            (typeof this.preferences === 'string' ? JSON.parse(this.preferences) : this.preferences) : {};
        
        const updatedPrefs = { ...currentPrefs, ...newPreferences };

        await run(
            'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(updatedPrefs), this.id]
        );

        this.preferences = updatedPrefs;
        return updatedPrefs;
    }

    // Обновление аватара
    async updateAvatar(avatarUrl) {
        await run(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, this.id]
        );
        this.avatar_url = avatarUrl;
    }

    // Обновление пароля
    async updatePassword(newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await run(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, this.id]
        );
        this.password_hash = passwordHash;
    }

    // Связывание OAuth аккаунта
    async linkOAuthAccount(provider, providerId) {
        const field = provider === 'google' ? 'google_id' : 'discord_id';
        await run(
            `UPDATE users SET ${field} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [providerId, this.id]
        );
        this[field] = providerId;
    }

    // Отвязывание OAuth аккаунта
    async unlinkOAuthAccount(provider) {
        const field = provider === 'google' ? 'google_id' : 'discord_id';
        await run(
            `UPDATE users SET ${field} = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [this.id]
        );
        this[field] = null;
    }

    // Установка статуса онлайн
    async setOnlineStatus(isOnline) {
        await run(
            'UPDATE users SET is_online = $1 WHERE id = $2',
            [isOnline, this.id]
        );
        this.is_online = isOnline;
    }

    // Логирование действия пользователя
    async logAction(actionType, details = {}, ipAddress = null, userAgent = null) {
        await run(
            `INSERT INTO user_actions (user_id, action_type, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                this.id,
                actionType,
                JSON.stringify(details),
                ipAddress,
                userAgent
            ]
        );
    }

    // Получение публичного профиля
    toPublicProfile() {
        return {
            id: this.id,
            username: this.username,
            displayName: this.display_name || this.username,
            avatarUrl: this.avatar_url,
            createdAt: this.created_at,
            isOnline: this.is_online,
            totalPlaytime: this.total_playtime,
            subscriptionType: this.subscription_type
        };
    }

    // Получение приватного профиля (для владельца)
    toPrivateProfile() {
        const prefs = this.preferences ? 
            (typeof this.preferences === 'string' ? JSON.parse(this.preferences) : this.preferences) : {};

        return {
            ...this.toPublicProfile(),
            email: this.email,
            emailVerified: this.email_verified,
            twoFactorEnabled: this.two_factor_enabled,
            hasPassword: !!this.password_hash,
            linkedAccounts: {
                google: !!this.google_id,
                discord: !!this.discord_id
            },
            preferences: prefs,
            subscriptionExpiresAt: this.subscription_expires_at,
            lastLoginAt: this.last_login_at,
            updatedAt: this.updated_at
        };
    }

    // Статические методы для работы с refresh токенами
    static async findByRefreshToken(token) {
        const result = await query(
            `SELECT rt.*, u.* FROM refresh_tokens rt
             JOIN users u ON rt.user_id = u.id
             WHERE rt.token = $1 AND rt.expires_at > CURRENT_TIMESTAMP AND rt.is_revoked = false`,
            [token]
        );

        if (result.rows && result.rows.length > 0) {
            return new User(result.rows[0]);
        }
        return null;
    }

    static async revokeRefreshToken(token) {
        await run(
            'UPDATE refresh_tokens SET is_revoked = true WHERE token = $1',
            [token]
        );
    }

    static async revokeAllUserTokens(userId) {
        await run(
            'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
            [userId]
        );
    }

    static async cleanupExpiredTokens() {
        const result = await run(
            'DELETE FROM refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP OR is_revoked = true'
        );
        return result.rowCount || result.changes || 0;
    }

    // Получение статистики онлайн пользователей
    static async getOnlineCount() {
        const result = await query(
            'SELECT COUNT(*) as count FROM users WHERE is_online = true'
        );
        return parseInt(result.rows ? result.rows[0].count : result.rows?.[0]?.count || 0);
    }

    // Поиск пользователей
    static async search(query, limit = 10) {
        const result = await query(
            `SELECT id, username, display_name, avatar_url, is_online
             FROM users 
             WHERE (username ILIKE $1 OR display_name ILIKE $1) AND status = 'active'
             ORDER BY is_online DESC, username ASC
             LIMIT $2`,
            [`%${query}%`, limit]
        );

        return (result.rows || []).map(user => new User(user));
    }
}

export default User;