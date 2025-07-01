// Database Initialization Module - DinoGames 2025

import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Конфигурация базы данных
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dinogames'
};

// Создание экземпляра Sequelize
export const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Функция создания базы данных если не существует
async function createDatabaseIfNotExists() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
    });
    
    await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    
    await connection.end();
}

// Инициализация базы данных
export async function initDatabase() {
    try {
        // Создаём базу данных если не существует
        await createDatabaseIfNotExists();
        
        // Проверка подключения
        await sequelize.authenticate();
        console.log('✅ Подключение к базе данных установлено');
        
        // Импорт моделей
        const { User } = await import('./models/User.js');
        const { Game } = await import('./models/Game.js');
        const { GameSession } = await import('./models/GameSession.js');
        const { PlayerStats } = await import('./models/PlayerStats.js');
        
        // Определение связей между моделями
        User.hasMany(GameSession, { as: 'sessions', foreignKey: 'userId' });
        GameSession.belongsTo(User, { as: 'user', foreignKey: 'userId' });
        
        User.hasOne(PlayerStats, { as: 'stats', foreignKey: 'userId' });
        PlayerStats.belongsTo(User, { as: 'user', foreignKey: 'userId' });
        
        Game.hasMany(GameSession, { as: 'sessions', foreignKey: 'gameId' });
        GameSession.belongsTo(Game, { as: 'game', foreignKey: 'gameId' });
        
        // Синхронизация моделей с базой данных
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('✅ Модели синхронизированы с базой данных');
        
        // Создание начальных данных
        await seedDatabase();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        throw error;
    }
}

// Заполнение базы данных начальными данными
async function seedDatabase() {
    try {
        const { Game } = await import('./models/Game.js');
        
        // Проверяем, есть ли уже игры
        const gamesCount = await Game.count();
        
        if (gamesCount === 0) {
            // Создаём начальные игры
            await Game.bulkCreate([
                {
                    code: 'battleship',
                    name: 'Морской бой',
                    description: 'Классическая стратегическая игра',
                    minPlayers: 2,
                    maxPlayers: 2,
                    estimatedTime: 15,
                    isActive: true
                },
                {
                    code: 'tictactoe',
                    name: 'Крестики-нолики',
                    description: 'Простая и увлекательная игра',
                    minPlayers: 2,
                    maxPlayers: 2,
                    estimatedTime: 5,
                    isActive: true
                }
            ]);
            
            console.log('✅ Начальные данные добавлены в базу данных');
        }
    } catch (error) {
        console.error('❌ Ошибка заполнения базы данных:', error);
    }
}

// Экспорт функции закрытия соединения
export async function closeDatabase() {
    await sequelize.close();
} 