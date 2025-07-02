#!/usr/bin/env node

/**
 * Database Migration Script
 * Инициализирует все таблицы DiLauncher
 */

import { initDatabase } from '../server/database/database.js';
import winston from 'winston';

// Настройка логгера для миграций
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

async function runMigrations() {
    logger.info('🚀 Запуск миграций базы данных...');
    
    try {
        await initDatabase();
        logger.info('✅ Миграции выполнены успешно!');
        logger.info('📊 Все таблицы созданы и готовы к использованию');
        
        // Выводим информацию о созданных таблицах
        const tables = [
            'users',
            'refresh_tokens', 
            'launcher_profiles',
            'installed_mods',
            'saved_servers',
            'cloud_saves',
            'user_actions'
        ];
        
        logger.info('📝 Созданные таблицы:');
        tables.forEach(table => {
            logger.info(`   • ${table}`);
        });
        
        process.exit(0);
    } catch (error) {
        logger.error('❌ Ошибка выполнения миграций:', error);
        process.exit(1);
    }
}

// Запуск миграций
runMigrations();