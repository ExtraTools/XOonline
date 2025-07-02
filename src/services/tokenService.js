import jwt from 'jsonwebtoken';
import crypto from 'crypto';

class TokenService {
    constructor() {
        this.accessSecret = process.env.JWT_SECRET || 'default-access-secret';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
        this.accessExpire = process.env.JWT_EXPIRE || '15m';
        this.refreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';
    }

    // Генерация access токена
    generateAccessToken(payload) {
        return jwt.sign(payload, this.accessSecret, {
            expiresIn: this.accessExpire,
            issuer: 'DiLauncher',
            audience: 'dilauncher-client'
        });
    }

    // Генерация refresh токена
    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }

    // Генерация пары токенов
    generateTokenPair(user) {
        const payload = {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            uuid: user.uuid
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken();
        
        // Вычисляем время истечения refresh токена
        const refreshExpiresAt = new Date();
        const [value, unit] = this.refreshExpire.match(/(\d+)([dhms])/).slice(1);
        
        switch(unit) {
            case 'd': refreshExpiresAt.setDate(refreshExpiresAt.getDate() + parseInt(value)); break;
            case 'h': refreshExpiresAt.setHours(refreshExpiresAt.getHours() + parseInt(value)); break;
            case 'm': refreshExpiresAt.setMinutes(refreshExpiresAt.getMinutes() + parseInt(value)); break;
            case 's': refreshExpiresAt.setSeconds(refreshExpiresAt.getSeconds() + parseInt(value)); break;
        }

        return {
            accessToken,
            refreshToken,
            expiresIn: this.getExpiresInSeconds(this.accessExpire),
            refreshExpiresAt,
            tokenType: 'Bearer'
        };
    }

    // Верификация access токена
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.accessSecret, {
                issuer: 'DiLauncher',
                audience: 'dilauncher-client'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }

    // Декодирование токена без проверки
    decodeToken(token) {
        return jwt.decode(token);
    }

    // Проверка, истек ли токен
    isTokenExpired(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) return true;
            
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        } catch {
            return true;
        }
    }

    // Получение времени до истечения токена
    getTokenExpiresIn(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) return 0;
            
            const currentTime = Math.floor(Date.now() / 1000);
            return Math.max(0, decoded.exp - currentTime);
        } catch {
            return 0;
        }
    }

    // Преобразование строки времени в секунды
    getExpiresInSeconds(timeStr) {
        const match = timeStr.match(/(\d+)([dhms])/);
        if (!match) return 0;
        
        const [, value, unit] = match;
        const num = parseInt(value);
        
        switch(unit) {
            case 'd': return num * 24 * 60 * 60;
            case 'h': return num * 60 * 60;
            case 'm': return num * 60;
            case 's': return num;
            default: return 0;
        }
    }

    // Генерация токена для Minecraft сессии
    generateMinecraftToken(user, profile) {
        const payload = {
            userId: user._id.toString(),
            username: user.username,
            uuid: user.uuid,
            profileId: profile._id.toString(),
            profileName: profile.name,
            selectedVersion: profile.version,
            type: 'minecraft-session'
        };

        return jwt.sign(payload, this.accessSecret, {
            expiresIn: '24h',
            issuer: 'DiLauncher-Minecraft'
        });
    }

    // Верификация Minecraft токена
    verifyMinecraftToken(token) {
        try {
            return jwt.verify(token, this.accessSecret, {
                issuer: 'DiLauncher-Minecraft'
            });
        } catch (error) {
            throw new Error('Invalid Minecraft session token');
        }
    }

    // Генерация токена для скачивания файлов
    generateDownloadToken(userId, fileId, expiresIn = '1h') {
        const payload = {
            userId,
            fileId,
            type: 'download',
            timestamp: Date.now()
        };

        return jwt.sign(payload, this.accessSecret, {
            expiresIn,
            issuer: 'DiLauncher-Download'
        });
    }

    // Верификация токена скачивания
    verifyDownloadToken(token) {
        try {
            return jwt.verify(token, this.accessSecret, {
                issuer: 'DiLauncher-Download'
            });
        } catch (error) {
            throw new Error('Invalid download token');
        }
    }

    // Генерация API ключа для внешних интеграций
    generateApiKey(userId, name, permissions = []) {
        const apiKey = `dlk_${crypto.randomBytes(32).toString('hex')}`;
        const payload = {
            userId,
            name,
            permissions,
            type: 'api-key',
            createdAt: Date.now()
        };

        const signature = jwt.sign(payload, this.accessSecret, {
            noTimestamp: true,
            issuer: 'DiLauncher-API'
        });

        return {
            apiKey,
            signature,
            fullKey: `${apiKey}.${signature}`
        };
    }

    // Верификация API ключа
    verifyApiKey(fullKey) {
        try {
            const [apiKey, signature] = fullKey.split('.');
            if (!apiKey || !signature || !apiKey.startsWith('dlk_')) {
                throw new Error('Invalid API key format');
            }

            return jwt.verify(signature, this.accessSecret, {
                issuer: 'DiLauncher-API'
            });
        } catch (error) {
            throw new Error('Invalid API key');
        }
    }
}

export default new TokenService();