import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создаем базу данных
let dbPath;
let db;

if (process.env.NODE_ENV === 'production') {
    // В production используем временный файл базы данных (Railway)
    dbPath = '/tmp/dinosgames.db';
    console.log('🐘 Использую SQLite файл для production:', dbPath);
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Ошибка создания базы в production:', err);
        } else {
            console.log('🟢 База данных production готова');
        }
    });
} else {
    // В development используем файл
    dbPath = join(__dirname, '../../data/dinosgames.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Ошибка открытия файла базы:', err);
        } else {
            console.log('🟢 База данных файл готова');
        }
    });
}

// Инициализация таблиц
export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Таблица пользователей
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    avatar_url VARCHAR(255) DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME DEFAULT NULL,
                    is_online BOOLEAN DEFAULT 0,
                    total_games INTEGER DEFAULT 0,
                    wins INTEGER DEFAULT 0,
                    losses INTEGER DEFAULT 0,
                    draws INTEGER DEFAULT 0,
                    rating INTEGER DEFAULT 1000,
                    status VARCHAR(20) DEFAULT 'active'
                )
            `, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы users:', err);
                    reject(err);
                    return;
                }
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

            // Таблица комнат
            db.run(`
                CREATE TABLE IF NOT EXISTS rooms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    max_players INTEGER DEFAULT 2,
                    current_players INTEGER DEFAULT 0,
                    is_private BOOLEAN DEFAULT 0,
                    password_hash VARCHAR(255) DEFAULT NULL,
                    creator_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(20) DEFAULT 'waiting',
                    FOREIGN KEY (creator_id) REFERENCES users (id)
                )
            `, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы rooms:', err);
                    reject(err);
                    return;
                }
                console.log('🟢 База данных инициализирована');
                resolve();
            });
        });
    });
};

// Утилиты для работы с пользователями
export const userQueries = {
    // Создание пользователя
    create: async (username, email, password) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Хешируем пароль
                const passwordHash = await bcrypt.hash(password, 12);
                
                const stmt = db.prepare(`
                    INSERT INTO users (username, email, password_hash) 
                    VALUES (?, ?, ?)
                `);
                
                stmt.run([username, email, passwordHash], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, username, email });
                    }
                });
                
                stmt.finalize();
            } catch (err) {
                reject(err);
            }
        });
    },

    // Поиск пользователя по email
    findByEmail: (email) => {
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
    },

    // Поиск пользователя по ID
    findById: (id) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT id, username, email, avatar_url, created_at, last_login, total_games, wins, losses, draws, rating FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    // Поиск пользователя по username
    findByUsername: (username) => {
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
    },

    // Обновление статуса онлайн
    updateOnlineStatus: (userId, isOnline) => {
        return new Promise((resolve, reject) => {
            const query = isOnline 
                ? 'UPDATE users SET is_online = 1, last_login = CURRENT_TIMESTAMP WHERE id = ?'
                : 'UPDATE users SET is_online = 0 WHERE id = ?';
                
            db.run(query, [userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },


    getOnlineUsers: () => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, username, avatar_url, rating FROM users WHERE is_online = 1 ORDER BY rating DESC',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    // Обновление пароля пользователя
    updatePassword: (userId, newPasswordHash) => {
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
    }
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

export default db; 