import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { initPostgresDatabase, postgresUserQueries, closePool } from './postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Определяем тип базы данных
const usePostgres = Boolean(process.env.DATABASE_URL);
console.log(`🔧 Используется база данных: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);

// Настройка SQLite (только если не используется PostgreSQL)
let db = null;
let dbPath = null;

if (!usePostgres) {
    // Определяем путь к базе данных SQLite
    if (process.env.NODE_ENV === 'production') {
        // Для Railway пробуем несколько вариантов
        const possiblePaths = [
            './dinosgames.db',           // Текущая рабочая директория
            '/tmp/dinosgames.db',        // Временная директория
            ':memory:'                   // В памяти (последний вариант)
        ];
        
        dbPath = ':memory:'; // По умолчанию
        
        for (const testPath of possiblePaths) {
            if (testPath === ':memory:') {
                dbPath = testPath;
                console.log('🔧 Используется in-memory база данных для production');
                break;
            }
            
            try {
                // Пробуем создать тестовый файл
                const testDir = dirname(testPath);
                if (testDir !== '.') {
                    fs.mkdirSync(testDir, { recursive: true });
                }
                
                // Пробуем записать тестовый файл
                fs.writeFileSync(testPath + '.test', 'test');
                fs.unlinkSync(testPath + '.test');
                
                dbPath = testPath;
                console.log('🔧 Используется файловая база данных:', testPath);
                break;
            } catch (error) {
                console.log(`❌ Не удалось использовать путь ${testPath}:`, error.message);
            }
        }
    } else {
        // Для локальной разработки
        dbPath = join(__dirname, '../../data/dinosgames.db');
        const dbDir = dirname(dbPath);
        
        // Убедимся, что директория существует
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }
}

// Создание SQLite подключения только если не используется PostgreSQL
if (!usePostgres) {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Ошибка подключения к базе данных SQLite:', err.message);
            console.error('❌ Путь к базе данных:', dbPath);
            
            // Если это не in-memory база данных, попробуем использовать in-memory
            if (dbPath !== ':memory:') {
                console.log('🔄 Попытка использовать базу данных в памяти...');
                // Создаем новое подключение в памяти
                const memDb = new sqlite3.Database(':memory:', (memErr) => {
                    if (memErr) {
                        console.error('❌ Критическая ошибка: не удалось создать базу данных в памяти:', memErr.message);
                    } else {
                        console.log('✅ Подключение к базе данных в памяти установлено');
                        console.log('⚠️ ВНИМАНИЕ: Данные будут потеряны при перезапуске сервера');
                    }
                });
                return memDb;
            }
        } else {
            console.log('✅ Подключение к базе данных SQLite установлено по пути:', dbPath);
            
            if (dbPath === ':memory:') {
                console.log('⚠️ ВНИМАНИЕ: Используется база данных в памяти!');
                console.log('⚠️ Данные будут потеряны при перезапуске сервера');
                console.log('⚠️ Для постоянного хранения данных установите переменную DATABASE_URL');
            } else {
                console.log('💾 База данных сохраняется в файл:', dbPath);
            }
        }
    });
}

// Инициализация таблиц
export const initDatabase = async () => {
    if (usePostgres) {
        // Используем PostgreSQL
        await initPostgresDatabase();
        return;
    }
    
    // Используем SQLite
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Таблица пользователей
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid VARCHAR(36) UNIQUE NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    avatar_url VARCHAR(255) DEFAULT NULL,
                    minecraft_uuid VARCHAR(36) DEFAULT NULL,
                    minecraft_username VARCHAR(50) DEFAULT NULL,
                    current_skin_url VARCHAR(255) DEFAULT NULL,
                    skin_model VARCHAR(10) DEFAULT 'classic',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME DEFAULT NULL,
                    is_online BOOLEAN DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'active'
                )
            `, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы users:', err);
                    reject(err);
                    return;
                }
            });

            // Добавляем UUID поле если его нет (сначала без ограничения)
            db.run(`
                ALTER TABLE users ADD COLUMN uuid VARCHAR(36)
            `, (err) => {
                // Игнорируем ошибку если поле уже существует
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Ошибка добавления UUID поля:', err);
                } else {
                    // Обновляем существующих пользователей без UUID
                    db.all(`SELECT id FROM users WHERE uuid IS NULL`, (err, rows) => {
                        if (err) {
                            console.error('Ошибка получения пользователей без UUID:', err);
                            return;
                        }
                        
                        // Обновляем каждого пользователя с уникальным UUID
                        const updatePromises = rows.map(row => {
                            return new Promise((resolve, reject) => {
                                db.run(`UPDATE users SET uuid = ? WHERE id = ?`, [randomUUID(), row.id], (err) => {
                                    if (err) {
                                        console.error(`Ошибка обновления UUID для пользователя ${row.id}:`, err);
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                });
                            });
                        });
                        
                        Promise.all(updatePromises).then(() => {
                            // Создаем уникальный индекс после обновления данных
                            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid)`, (err) => {
                                if (err) {
                                    console.error('Ошибка создания уникального индекса для UUID:', err);
                                } else {
                                    console.log('✅ UUID поле успешно добавлено и настроено');
                                }
                            });
                        }).catch(err => {
                            console.error('Ошибка при обновлении UUID:', err);
                        });
                    });
                }
            });

            // Добавляем поля для Minecraft интеграции
            const minecraftFields = [
                'minecraft_uuid VARCHAR(36) DEFAULT NULL',
                'minecraft_username VARCHAR(50) DEFAULT NULL',
                'current_skin_url VARCHAR(255) DEFAULT NULL',
                'skin_model VARCHAR(10) DEFAULT \'classic\''
            ];

            minecraftFields.forEach(field => {
                const fieldName = field.split(' ')[0];
                db.run(`ALTER TABLE users ADD COLUMN ${field}`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error(`Ошибка добавления поля ${fieldName}:`, err);
                    } else if (!err) {
                        console.log(`✅ Поле ${fieldName} успешно добавлено`);
                    }
                });
            });

            // Таблица сессий
            db.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token VARCHAR(255) UNIQUE NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы sessions:', err);
                    reject(err);
                    return;
                }
            });

            // Таблица профилей игроков
            db.run(`
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    level INTEGER DEFAULT 1,
                    rating INTEGER DEFAULT 1000,
                    avatar TEXT DEFAULT 'avatars/photo_2025-07-03_02-50-32.jpg',
                    title TEXT DEFAULT 'Игрок XO Online',
                    bio TEXT,
                    total_play_time INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);

            // Таблица игровой статистики
            db.run(`
                CREATE TABLE IF NOT EXISTS player_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
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
                    last_game_at DATETIME,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);

            // Таблица достижений
            db.run(`
                CREATE TABLE IF NOT EXISTS achievements (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    icon TEXT,
                    category TEXT,
                    points INTEGER DEFAULT 10
                )
            `, (err) => {
                if (err) return console.error("Ошибка создания таблицы 'achievements'", err);
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
                const stmt = db.prepare("INSERT OR IGNORE INTO achievements (id, name, description, icon, category, points) VALUES (?, ?, ?, ?, ?, ?)");
                achievements.forEach(ach => stmt.run(ach));
                stmt.finalize();
            });

            // Таблица пользовательских достижений
            db.run(`
                CREATE TABLE IF NOT EXISTS user_achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    achievement_id TEXT NOT NULL,
                    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    progress INTEGER DEFAULT 100,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (achievement_id) REFERENCES achievements (id),
                    UNIQUE (user_id, achievement_id)
                )
            `);

            // Таблица друзей
            db.run(`
                CREATE TABLE IF NOT EXISTS friendships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    requester_id INTEGER NOT NULL,
                    addressee_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE (requester_id, addressee_id)
                )
            `);

            // Таблица активности профиля
            db.run(`
                CREATE TABLE IF NOT EXISTS profile_activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    activity_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);

            // Таблица истории игр
            db.run(`
                CREATE TABLE IF NOT EXISTS game_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player1_id INTEGER NOT NULL,
                    player2_id INTEGER,
                    winner_id INTEGER,
                    game_mode TEXT DEFAULT 'classic',
                    duration INTEGER,
                    moves TEXT DEFAULT '[]',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player1_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (player2_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (winner_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);

            console.log('🟢 База данных инициализирована со всеми таблицами');
            resolve();
        });
    });
};

// Функция создания пользователя с поддержкой PostgreSQL
const createUser = async (userData) => {
    // Если используется PostgreSQL, используем специальную функцию
    if (usePostgres) {
        const { createUser: createPostgresUser } = await import('./postgres.js');
        return createPostgresUser(userData);
    }
    
    // Для SQLite используем существующую реализацию
    return new Promise(async (resolve, reject) => {
        try {
            // Хешируем пароль
            const passwordHash = await bcrypt.hash(userData.password, 12);
            // Генерируем UUID
            const userUuid = randomUUID();
            
            const stmt = db.prepare(`
                INSERT INTO users (uuid, username, email, password_hash) 
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run([userUuid, userData.username, userData.email, passwordHash], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, uuid: userUuid, username: userData.username, email: userData.email });
                }
            });
            
            stmt.finalize();
        } catch (err) {
            reject(err);
        }
    });
};

// Поиск пользователя по email
const findByEmail = (email) => {
        return new Promise((resolve, reject) => {
            console.log('🔍 DB: searching user by email:', email);
            db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) {
                        console.log('❌ DB error in findByEmail:', err);
                        reject(err);
                    } else {
                        console.log('💾 DB result:', row ? 'found' : 'not found');
                        resolve(row);
                    }
                }
            );
        });
};

// Поиск пользователя по ID
const findById = (id) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT id, uuid, username, email, avatar_url, password_hash, created_at, last_login FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
};

// Поиск пользователя по username
const findByUsername = (username) => {
        return new Promise((resolve, reject) => {
            console.log('🔍 DB: searching user by username:', username);
            db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) {
                        console.log('❌ DB error in findByUsername:', err);
                        reject(err);
                    } else {
                        console.log('💾 DB result:', row ? 'found' : 'not found');
                        resolve(row);
                    }
                }
            );
        });
};

// Поиск пользователя по логину (email или username)
const findByLogin = (login) => {
        return new Promise((resolve, reject) => {
            console.log('🔍 DB: searching user by login:', login);
            db.get(
                'SELECT * FROM users WHERE email = ? OR username = ?',
                [login, login],
                (err, row) => {
                    if (err) {
                        console.log('❌ DB error in findByLogin:', err);
                        reject(err);
                    } else {
                        console.log('💾 DB result:', row ? 'found' : 'not found');
                        resolve(row);
                    }
                }
            );
        });
};

// Поиск пользователя по UUID
const findByUuid = (uuid) => {
        return new Promise((resolve, reject) => {
            console.log('🔍 DB: searching user by UUID:', uuid);
            db.get(
                'SELECT id, uuid, username, email, avatar_url, created_at, last_login, is_online, status FROM users WHERE uuid = ?',
                [uuid],
                (err, row) => {
                    if (err) {
                        console.log('❌ DB error in findByUuid:', err);
                        reject(err);
                    } else {
                        console.log('💾 DB result:', row ? 'found' : 'not found');
                        resolve(row);
                    }
                }
            );
        });
};

// Обновление статуса онлайн
const updateOnlineStatus = (userId, isOnline) => {
        return new Promise((resolve, reject) => {
            const query = isOnline 
                ? 'UPDATE users SET is_online = 1, last_login = CURRENT_TIMESTAMP WHERE id = ?'
                : 'UPDATE users SET is_online = 0 WHERE id = ?';
                
            db.run(query, [userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
};

const getOnlineUsers = () => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, uuid, username, avatar_url FROM users WHERE is_online = 1 ORDER BY username',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
};

// Обновление пароля пользователя
const updatePassword = (userId, newPasswordHash) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
};

// Обновление аватара пользователя
const updateAvatar = (userId, avatarUrl) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatarUrl, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

// Обновление данных Minecraft аккаунта
const updateMinecraftData = (userId, minecraftUuid, minecraftUsername, skinUrl, skinModel) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET minecraft_uuid = ?, minecraft_username = ?, current_skin_url = ?, skin_model = ? WHERE id = ?',
            [minecraftUuid, minecraftUsername, skinUrl, skinModel, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

// Поиск пользователя по Minecraft UUID
const findByMinecraftUuid = (minecraftUuid) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE minecraft_uuid = ?',
            [minecraftUuid],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
};

// Получение полной информации о пользователе с Minecraft данными
const getFullUserInfo = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT id, uuid, username, email, avatar_url, minecraft_uuid, minecraft_username, current_skin_url, skin_model, created_at, last_login, is_online, status FROM users WHERE id = ?',
            [userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
};

// Обновление имени пользователя
const updateUsername = (userId, newUsername) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET username = ? WHERE id = ?',
            [newUsername, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

// Получение всех пользователей для админ панели
const getAllUsers = () => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, uuid, username, email, password_hash, avatar_url, created_at, last_login, is_online, status FROM users ORDER BY created_at DESC',
                [],
                (err, rows) => {
                    if (err) {
                        console.log('❌ DB error in getAllUsers:', err);
                        reject(err);
                    } else {
                        console.log('✅ DB: Loaded all users:', rows.length);
                        resolve(rows);
                    }
                }
            );
        });
};

// Сброс всех онлайн статусов (очистка зависших сессий)
const resetAllOnlineStatus = () => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET is_online = 0',
                [],
                (err) => {
                    if (err) {
                        console.log('❌ DB error in resetAllOnlineStatus:', err);
                        reject(err);
                    } else {
                        console.log('✅ DB: All online statuses reset');
                        resolve();
                    }
                }
            );
        });
};

// Очистка устаревших онлайн статусов (старше 30 минут без активности)
const cleanupStaleOnlineStatus = () => {
        return new Promise((resolve, reject) => {
            // Устанавливаем офлайн для пользователей, у которых последний логин был больше 30 минут назад
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            
            db.run(
                'UPDATE users SET is_online = 0 WHERE is_online = 1 AND (last_login IS NULL OR last_login < ?)',
                [thirtyMinutesAgo],
                function(err) {
                    if (err) {
                        console.log('❌ DB error in cleanupStaleOnlineStatus:', err);
                        reject(err);
                    } else {
                        console.log(`✅ DB: Cleaned up ${this.changes} stale online statuses`);
                        resolve(this.changes);
                    }
                }
            );
        });
};

// Утилиты для работы с сессиями
export const sessionQueries = {
    // Создание сессии
    create: (userId, token, expiresAt) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO sessions (user_id, token, expires_at) 
                VALUES (?, ?, ?)
            `);
            
            stmt.run([userId, token, expiresAt], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, user_id: userId, token });
            });
            
            stmt.finalize();
        });
    },

    // Поиск сессии по токену
    findByToken: (token) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP',
                [token],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    // Удаление сессии
    delete: (token) => {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM sessions WHERE token = ?',
                [token],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Очистка истекших сессий
    cleanup: () => {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP',
                [],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

// Запросы для профилей
export const profileQueries = {
    // Создание профиля
    createProfile: (userId, data = {}) => {
        return new Promise((resolve, reject) => {
            const {
                level = 1,
                rating = 1000,
                avatar = 'avatars/photo_2025-07-03_02-50-32.jpg',
                title = 'Игрок XO Online'
            } = data;

            const stmt = db.prepare(`
                INSERT INTO user_profiles (user_id, level, rating, avatar, title)
                VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run([userId, level, rating, avatar, title], function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Создаем также запись статистики
                    statsQueries.createStats(userId).then(() => {
                        resolve(this.lastID);
                    }).catch(reject);
                }
            });

            stmt.finalize();
        });
    },

    // Получение профиля
    getProfile: (userId) => {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    u.*,
                    p.level,
                    p.rating,
                    p.avatar,
                    p.title,
                    p.bio,
                    p.total_play_time
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE u.id = ?
            `, [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Обновление аватара
    updateAvatar: (userId, avatar) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE user_profiles SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [avatar, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // Обновление рейтинга
    updateRating: (userId, change) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT rating FROM user_profiles WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const newRating = Math.max(0, (row?.rating || 1000) + change);
                    
                    db.run(
                        'UPDATE user_profiles SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                        [newRating, userId],
                        (err) => {
                            if (err) reject(err);
                            else resolve(newRating);
                        }
                    );
                }
            );
        });
    },

    // Поиск пользователя по имени
    findUserByName: (username) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT id, username, email FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    // Получение топа игроков
    getLeaderboard: (limit = 10, offset = 0) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.username,
                    p.level,
                    p.rating,
                    p.avatar,
                    s.wins,
                    s.total_games
                FROM users u
                JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN player_stats s ON u.id = s.user_id
                ORDER BY p.rating DESC
                LIMIT ? OFFSET ?
            `, [limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Поиск игроков
    searchPlayers: (query) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    p.level,
                    p.rating,
                    p.avatar
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE u.username LIKE ?
                LIMIT 20
            `, [`%${query}%`], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Добавление активности
    addActivity: (userId, type, description, metadata = '{}') => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO profile_activity (user_id, activity_type, description, metadata)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run([userId, type, description, metadata], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });

            stmt.finalize();
        });
    },

    // Получение недавней активности
    getRecentActivity: (userId, limit = 10) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM profile_activity
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `, [userId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

// Запросы для статистики
export const statsQueries = {
    // Создание записи статистики
    createStats: (userId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO player_stats (user_id)
                VALUES (?)
            `);

            stmt.run([userId], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });

            stmt.finalize();
        });
    },

    // Получение статистики игрока
    getPlayerStats: (userId) => {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT * FROM player_stats WHERE user_id = ?
            `, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    // Создаем статистику если её нет
                    this.createStats(userId).then(() => {
                        this.getPlayerStats(userId).then(resolve).catch(reject);
                    }).catch(reject);
                } else {
                    // Вычисляем дополнительные поля
                    const winRate = row.total_games > 0 ? 
                        ((row.wins / row.total_games) * 100).toFixed(1) : 0;
                    
                    resolve({
                        ...row,
                        winRate: parseFloat(winRate)
                    });
                }
            });
        });
    },

    // Обновление статистики после игры
    updateGameStats: (userId, gameData) => {
        return new Promise((resolve, reject) => {
            const { result, gameMode, duration = 0 } = gameData;

            db.get('SELECT * FROM player_stats WHERE user_id = ?', [userId], (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!stats) {
                    this.createStats(userId).then(() => {
                        this.updateGameStats(userId, gameData).then(resolve).catch(reject);
                    }).catch(reject);
                    return;
                }

                const updates = {
                    total_games: stats.total_games + 1,
                    wins: stats.wins + (result === 'win' ? 1 : 0),
                    losses: stats.losses + (result === 'loss' ? 1 : 0),
                    draws: stats.draws + (result === 'draw' ? 1 : 0),
                    total_play_time: stats.total_play_time + duration,
                    current_streak: result === 'win' ? stats.current_streak + 1 : 0,
                    best_streak: result === 'win' ? 
                        Math.max(stats.best_streak, stats.current_streak + 1) : 
                        stats.best_streak,
                    favorite_game_mode: gameMode || stats.favorite_game_mode,
                    last_game_at: new Date().toISOString()
                };

                // Вычисляем среднюю продолжительность игры
                if (updates.total_games > 0) {
                    updates.avg_game_duration = updates.total_play_time / updates.total_games;
                }

                const stmt = db.prepare(`
                    UPDATE player_stats SET
                        total_games = ?,
                        wins = ?,
                        losses = ?,
                        draws = ?,
                        current_streak = ?,
                        best_streak = ?,
                        total_play_time = ?,
                        avg_game_duration = ?,
                        favorite_game_mode = ?,
                        last_game_at = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `);

                stmt.run([
                    updates.total_games,
                    updates.wins,
                    updates.losses,
                    updates.draws,
                    updates.current_streak,
                    updates.best_streak,
                    updates.total_play_time,
                    updates.avg_game_duration,
                    updates.favorite_game_mode,
                    updates.last_game_at,
                    userId
                ], (err) => {
                    if (err) reject(err);
                    else resolve(updates);
                });

                stmt.finalize();
            });
        });
    }
};

// Запросы для достижений
export const achievementQueries = {
    // Получение всех достижений пользователя
    getUserAchievements: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    a.*,
                    ua.unlocked_at,
                    ua.progress,
                    CASE WHEN ua.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked
                FROM achievements a
                LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
                ORDER BY unlocked DESC, a.category, a.points
            `, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Проверка наличия достижения
    hasAchievement: (userId, achievementId) => {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT 1 FROM user_achievements 
                WHERE user_id = ? AND achievement_id = ?
            `, [userId, achievementId], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    },

    // Разблокировка достижения
    unlockAchievement: (userId, achievementId, progress = 100) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, progress)
                VALUES (?, ?, ?)
            `);

            stmt.run([userId, achievementId, progress], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });

            stmt.finalize();
        });
    }
};

// Запросы для друзей
export const friendsQueries = {
    // Получение списка друзей
    getFriendsList: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    u.is_online,
                    u.last_login,
                    p.avatar,
                    p.level,
                    p.rating,
                    f.status,
                    f.created_at as friend_since
                FROM friendships f
                JOIN users u ON (
                    CASE 
                        WHEN f.requester_id = ? THEN u.id = f.addressee_id
                        ELSE u.id = f.requester_id
                    END
                )
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE (f.requester_id = ? OR f.addressee_id = ?) 
                AND f.status = 'accepted'
                ORDER BY u.is_online DESC, u.last_login DESC
            `, [userId, userId, userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Проверка дружбы
    checkFriendship: (userId, friendId) => {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT * FROM friendships 
                WHERE (requester_id = ? AND addressee_id = ?) 
                OR (requester_id = ? AND addressee_id = ?)
            `, [userId, friendId, friendId, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Добавление друга
    addFriend: (userId, friendId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO friendships (requester_id, addressee_id, status)
                VALUES (?, ?, 'pending')
            `);

            stmt.run([userId, friendId], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });

            stmt.finalize();
        });
    },

    // Принятие запроса в друзья
    acceptFriendRequest: (userId, friendId) => {
        return new Promise((resolve, reject) => {
            db.run(`
                UPDATE friendships 
                SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
                WHERE addressee_id = ? AND requester_id = ? AND status = 'pending'
            `, [userId, friendId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    // Удаление друга
    removeFriend: (userId, friendId) => {
        return new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM friendships 
                WHERE (requester_id = ? AND addressee_id = ?) 
                OR (requester_id = ? AND addressee_id = ?)
            `, [userId, friendId, friendId, userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};

// Унифицированный интерфейс для работы с пользователями
export const userQueries = usePostgres ? postgresUserQueries : {
    createUser,
    findByLogin,
    findById,
    findByUuid,
    findByEmail,
    findByUsername,
    updateOnlineStatus,
    getAllUsers,
    resetAllOnlineStatus,
    cleanupStaleOnlineStatus,
    updatePassword,
    updateAvatar,
    updateMinecraftData,
    findByMinecraftUuid,
    getFullUserInfo,
    updateUsername,
    getOnlineUsers
};

// Закрытие соединений
export const closeDatabase = async () => {
    if (usePostgres) {
        await closePool();
    } else if (db) {
        db.close((err) => {
            if (err) {
                console.error('❌ Ошибка закрытия SQLite:', err.message);
            } else {
                console.log('🔒 SQLite соединение закрыто');
            }
        });
    }
};

export default db; 