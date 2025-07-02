import pg from 'pg';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import winston from 'winston';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Логгер для базы данных
const dbLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

class DatabaseManager {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.db = null;
        this.initialized = false;
    }

    async init() {
        try {
            if (this.isProduction) {
                await this.initPostgreSQL();
            } else {
                await this.initSQLite();
            }
            
            await this.createTables();
            this.initialized = true;
            dbLogger.info('✅ База данных успешно инициализирована');
        } catch (error) {
            dbLogger.error('❌ Ошибка инициализации базы данных:', error);
            throw error;
        }
    }

    async initPostgreSQL() {
        const connectionString = process.env.DATABASE_URL || 
            `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

        this.db = new Pool({
            connectionString,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Тестируем соединение
        const client = await this.db.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        dbLogger.info('🐘 PostgreSQL подключен успешно');
    }

    async initSQLite() {
        const dbPath = join(__dirname, '../../data/dilauncher.db');
        
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                dbLogger.error('❌ Ошибка подключения к SQLite:', err);
                throw err;
            }
            dbLogger.info('📄 SQLite подключен успешно');
        });

        // Включаем WAL режим для лучшей производительности
        await this.query('PRAGMA journal_mode = WAL;');
        await this.query('PRAGMA synchronous = NORMAL;');
        await this.query('PRAGMA cache_size = 1000;');
        await this.query('PRAGMA foreign_keys = ON;');
    }

    async query(text, params = []) {
        if (!this.initialized && !text.includes('CREATE TABLE') && !text.includes('PRAGMA')) {
            throw new Error('База данных не инициализирована');
        }

        if (this.isProduction) {
            // PostgreSQL
            const client = await this.db.connect();
            try {
                const result = await client.query(text, params);
                return result;
            } finally {
                client.release();
            }
        } else {
            // SQLite
            return new Promise((resolve, reject) => {
                this.db.all(text, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ rows, rowCount: rows?.length || 0 });
                    }
                });
            });
        }
    }

    async run(text, params = []) {
        if (this.isProduction) {
            const client = await this.db.connect();
            try {
                const result = await client.query(text, params);
                return result;
            } finally {
                client.release();
            }
        } else {
            return new Promise((resolve, reject) => {
                this.db.run(text, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ 
                            lastID: this.lastID, 
                            changes: this.changes,
                            rowCount: this.changes 
                        });
                    }
                });
            });
        }
    }

    async createTables() {
        const tables = [
            // Пользователи
            `CREATE TABLE IF NOT EXISTS users (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                display_name VARCHAR(100),
                avatar_url VARCHAR(255),
                email_verified BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_secret VARCHAR(255),
                google_id VARCHAR(255) UNIQUE,
                discord_id VARCHAR(255) UNIQUE,
                subscription_type VARCHAR(20) DEFAULT 'free',
                subscription_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                updated_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                last_login_at TIMESTAMP,
                is_online BOOLEAN DEFAULT FALSE,
                total_playtime INTEGER DEFAULT 0,
                preferences JSONB${this.isProduction ? '' : 'TEXT'},
                status VARCHAR(20) DEFAULT 'active'
            )`,

            // Refresh токены
            `CREATE TABLE IF NOT EXISTS refresh_tokens (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                user_id INTEGER NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                device_info JSONB${this.isProduction ? '' : 'TEXT'},
                is_revoked BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Профили лаунчера
            `CREATE TABLE IF NOT EXISTS launcher_profiles (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                minecraft_version VARCHAR(20) NOT NULL,
                mod_loader VARCHAR(20), -- 'forge', 'fabric', 'quilt', 'vanilla'
                mod_loader_version VARCHAR(50),
                java_version VARCHAR(20),
                memory_allocation INTEGER DEFAULT 2048,
                jvm_args TEXT,
                icon_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                updated_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                last_played_at TIMESTAMP,
                playtime INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                settings JSONB${this.isProduction ? '' : 'TEXT'},
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Установленные моды
            `CREATE TABLE IF NOT EXISTS installed_mods (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                profile_id INTEGER NOT NULL,
                mod_id VARCHAR(255) NOT NULL, -- ID из CurseForge/Modrinth
                mod_name VARCHAR(255) NOT NULL,
                mod_version VARCHAR(100),
                mod_source VARCHAR(20), -- 'curseforge', 'modrinth', 'manual'
                file_name VARCHAR(255),
                file_size INTEGER,
                download_url VARCHAR(500),
                dependencies JSONB${this.isProduction ? '' : 'TEXT'},
                installed_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                is_enabled BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (profile_id) REFERENCES launcher_profiles (id) ON DELETE CASCADE
            )`,

            // Сохраненные серверы
            `CREATE TABLE IF NOT EXISTS saved_servers (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                address VARCHAR(255) NOT NULL,
                port INTEGER DEFAULT 25565,
                version VARCHAR(20),
                motd TEXT,
                favicon_url VARCHAR(255),
                player_count INTEGER DEFAULT 0,
                max_players INTEGER DEFAULT 0,
                ping INTEGER,
                is_online BOOLEAN DEFAULT FALSE,
                last_checked_at TIMESTAMP,
                added_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                is_favorite BOOLEAN DEFAULT FALSE,
                tags JSONB${this.isProduction ? '' : 'TEXT'},
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Облачные сохранения
            `CREATE TABLE IF NOT EXISTS cloud_saves (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                user_id INTEGER NOT NULL,
                profile_id INTEGER NOT NULL,
                world_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500),
                file_size INTEGER,
                file_hash VARCHAR(64),
                uploaded_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                is_latest BOOLEAN DEFAULT TRUE,
                version INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (profile_id) REFERENCES launcher_profiles (id) ON DELETE CASCADE
            )`,

            // Лог действий пользователей
            `CREATE TABLE IF NOT EXISTS user_actions (
                id ${this.isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                user_id INTEGER,
                action_type VARCHAR(50) NOT NULL,
                details JSONB${this.isProduction ? '' : 'TEXT'},
                ip_address INET${this.isProduction ? '' : 'TEXT'},
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT ${this.isProduction ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )`
        ];

        for (const table of tables) {
            try {
                await this.run(table);
                dbLogger.info(`✅ Таблица создана/проверена`);
            } catch (error) {
                dbLogger.error(`❌ Ошибка создания таблицы:`, error);
                throw error;
            }
        }

        // Создаем индексы для производительности
        await this.createIndexes();
    }

    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)',
            'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON launcher_profiles(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_mods_profile_id ON installed_mods(profile_id)',
            'CREATE INDEX IF NOT EXISTS idx_servers_user_id ON saved_servers(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_saves_user_id ON cloud_saves(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_actions_user_id ON user_actions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_actions_created_at ON user_actions(created_at)'
        ];

        for (const index of indexes) {
            try {
                await this.run(index);
            } catch (error) {
                // Индекс может уже существовать, это нормально
                if (!error.message.includes('already exists')) {
                    dbLogger.warn(`⚠️ Предупреждение при создании индекса:`, error.message);
                }
            }
        }
    }

    async close() {
        if (this.db) {
            if (this.isProduction) {
                await this.db.end();
            } else {
                this.db.close();
            }
            dbLogger.info('🔒 Соединение с базой данных закрыто');
        }
    }

    // Методы для работы с транзакциями
    async transaction(callback) {
        if (this.isProduction) {
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                const result = await callback(client);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } else {
            // SQLite не поддерживает вложенные транзакции в том же объеме
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    callback(this.db)
                        .then(result => {
                            this.db.run('COMMIT', (err) => {
                                if (err) reject(err);
                                else resolve(result);
                            });
                        })
                        .catch(error => {
                            this.db.run('ROLLBACK');
                            reject(error);
                        });
                });
            });
        }
    }
}

// Создаем единственный экземпляр
const database = new DatabaseManager();

// Экспортируем методы для удобства
export const initDatabase = () => database.init();
export const query = (text, params) => database.query(text, params);
export const run = (text, params) => database.run(text, params);
export const transaction = (callback) => database.transaction(callback);
export const closeDatabase = () => database.close();

export default database; 