import pkg from 'pg';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const { Pool } = pkg;

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Инициализация базы данных PostgreSQL
export const initPostgresDatabase = async () => {
    console.log('🐘 Инициализация PostgreSQL базы данных...');
    
    try {
        // Тестируем соединение
        const client = await pool.connect();
        console.log('✅ Подключение к PostgreSQL установлено');
        
        // Создаем таблицы
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                avatar_url VARCHAR(255) DEFAULT NULL,
                minecraft_uuid VARCHAR(36) DEFAULT NULL,
                minecraft_username VARCHAR(50) DEFAULT NULL,
                current_skin_url VARCHAR(255) DEFAULT NULL,
                skin_model VARCHAR(10) DEFAULT 'classic',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT NULL,
                is_online BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'active'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                level INTEGER DEFAULT 1,
                rating INTEGER DEFAULT 1000,
                avatar TEXT DEFAULT 'avatars/photo_2025-07-03_02-50-32.jpg',
                title TEXT DEFAULT 'Игрок XO Online',
                bio TEXT,
                total_play_time INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS player_stats (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                total_games INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                best_streak INTEGER DEFAULT 0,
                total_play_time INTEGER DEFAULT 0,
                avg_game_duration REAL DEFAULT 0,
                favorite_game_mode TEXT DEFAULT 'XO Classic',
                rating_history TEXT DEFAULT '[]',
                last_game_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT,
                category TEXT,
                points INTEGER DEFAULT 10
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, achievement_id)
            )
        `);

        // Создаем индексы для оптимизации
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);

        // Заполняем базовые достижения
        const achievements = [
            ['first_game', 'Первая игра', 'Сыграйте свою первую игру', '🏆', 'beginner', 10],
            ['first_win', 'Первая победа', 'Выиграйте свою первую игру', '🎯', 'beginner', 20],
            ['win_streak_5', 'Огненная серия', 'Выиграйте 5 игр подряд', '🔥', 'streaks', 50],
            ['wins_10', 'Новичок', 'Выиграйте 10 игр', '🎮', 'milestones', 25],
            ['wins_50', 'Опытный игрок', 'Выиграйте 50 игр', '🏅', 'milestones', 100],
            ['wins_100', 'Мастер XO', 'Выиграйте 100 игр', '👑', 'milestones', 200],
            ['high_winrate', 'Эффективный', 'Поддерживайте 70% побед в 20+ играх', '📈', 'skills', 150]
        ];

        for (const achievement of achievements) {
            await client.query(`
                INSERT INTO achievements (id, name, description, icon, category, points) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                ON CONFLICT (id) DO NOTHING
            `, achievement);
        }

        client.release();
        console.log('✅ PostgreSQL база данных инициализирована со всеми таблицами');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации PostgreSQL:', error);
        throw error;
    }
};

// PostgreSQL запросы пользователей
export const postgresUserQueries = {
    // Создание пользователя
    createUser: async (userData) => {
        const client = await pool.connect();
        try {
            const { username, email, password } = userData;
            const hashedPassword = await bcrypt.hash(password, 10);
            const userUuid = randomUUID();

            const result = await client.query(`
                INSERT INTO users (uuid, username, email, password_hash) 
                VALUES ($1, $2, $3, $4) 
                RETURNING id, uuid, username, email, created_at
            `, [userUuid, username, email, hashedPassword]);

            // Создаем профиль пользователя
            await client.query(`
                INSERT INTO user_profiles (user_id) VALUES ($1)
            `, [result.rows[0].id]);

            // Создаем статистику пользователя
            await client.query(`
                INSERT INTO player_stats (user_id) VALUES ($1)
            `, [result.rows[0].id]);

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    // Поиск пользователя по логину (email или username)
    findByLogin: async (login) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users 
                WHERE email = $1 OR username = $1
            `, [login]);
            
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    // Поиск пользователя по ID
    findById: async (id) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users WHERE id = $1
            `, [id]);
            
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    // Поиск пользователя по UUID
    findByUuid: async (uuid) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users WHERE uuid = $1
            `, [uuid]);
            
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    // Обновление онлайн статуса
    updateOnlineStatus: async (userId, isOnline) => {
        const client = await pool.connect();
        try {
            await client.query(`
                UPDATE users 
                SET is_online = $1, last_login = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [isOnline, userId]);
        } finally {
            client.release();
        }
    },

    // Получение всех пользователей (для админ панели)
    getAllUsers: async () => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT id, uuid, username, email, password_hash, status, is_online, last_login, created_at
                FROM users 
                ORDER BY created_at DESC
            `);
            
            return result.rows;
        } finally {
            client.release();
        }
    },

    // Поиск пользователя по email для скримера
    findByEmail: async (email) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM users WHERE email = $1
            `, [email]);
            
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    // Сброс всех онлайн статусов
    resetAllOnlineStatus: async () => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                UPDATE users 
                SET is_online = FALSE 
                WHERE is_online = TRUE
            `);
            
            return result.rowCount;
        } finally {
            client.release();
        }
    },

    // Очистка устаревших онлайн статусов
    cleanupStaleOnlineStatus: async () => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                UPDATE users 
                SET is_online = FALSE 
                WHERE is_online = TRUE 
                AND last_login < NOW() - INTERVAL '30 minutes'
            `);
            
            return result.rowCount;
        } finally {
            client.release();
        }
    }
};

// Закрытие пула соединений
export const closePool = async () => {
    await pool.end();
    console.log('🔒 PostgreSQL пул соединений закрыт');
};

// Функция создания пользователя в PostgreSQL
export const createUser = async (userData) => {
    const { username, email, password } = userData;
    
    try {
        // Хешируем пароль
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Генерируем UUID
        const userUuid = randomUUID();
        
        // Создаем подключение к базе данных
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
        
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                `INSERT INTO users (uuid, username, email, password_hash) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, uuid, username, email`,
                [userUuid, username, email, passwordHash]
            );
            
            const user = result.rows[0];
            
            return {
                id: user.id,
                uuid: user.uuid,
                username: user.username,
                email: user.email
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка создания пользователя в PostgreSQL:', error);
        throw error;
    }
};

export default { initPostgresDatabase, postgresUserQueries, closePool }; 