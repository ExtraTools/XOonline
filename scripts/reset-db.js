#!/usr/bin/env node

/**
 * Database Reset Script
 * Полностью очищает и пересоздает базу данных
 */

import { query, run, closeDatabase } from '../server/database/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка логгера
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

// Интерфейс для ввода пользователя
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function resetDatabase() {
    logger.warn('⚠️  ВНИМАНИЕ: Это действие удалит ВСЕ данные из базы данных!');
    logger.warn('⚠️  Все пользователи, профили, серверы и настройки будут потеряны!');
    
    const confirmation = await askQuestion('\n🤔 Вы уверены, что хотите продолжить? (yes/no): ');
    
    if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
        logger.info('✅ Операция отменена пользователем');
        rl.close();
        process.exit(0);
    }

    const doubleConfirmation = await askQuestion('\n🔥 Последнее предупреждение! Введите "DELETE ALL" для подтверждения: ');
    
    if (doubleConfirmation !== 'DELETE ALL') {
        logger.info('✅ Операция отменена - неверное подтверждение');
        rl.close();
        process.exit(0);
    }

    rl.close();

    try {
        logger.info('🗑️  Начинаем сброс базы данных...');

        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
            // PostgreSQL - удаляем таблицы
            logger.info('🐘 Удаление таблиц PostgreSQL...');
            
            const tables = [
                'user_actions',
                'cloud_saves', 
                'installed_mods',
                'saved_servers',
                'launcher_profiles',
                'refresh_tokens',
                'users'
            ];

            for (const table of tables) {
                try {
                    await run(`DROP TABLE IF EXISTS ${table} CASCADE`);
                    logger.info(`   ✅ Удалена таблица: ${table}`);
                } catch (error) {
                    logger.warn(`   ⚠️ Ошибка удаления таблицы ${table}: ${error.message}`);
                }
            }

            // Удаляем последовательности (sequences)
            const sequences = [
                'users_id_seq',
                'refresh_tokens_id_seq',
                'launcher_profiles_id_seq',
                'installed_mods_id_seq',
                'saved_servers_id_seq',
                'cloud_saves_id_seq',
                'user_actions_id_seq'
            ];

            for (const sequence of sequences) {
                try {
                    await run(`DROP SEQUENCE IF EXISTS ${sequence} CASCADE`);
                    logger.info(`   ✅ Удалена последовательность: ${sequence}`);
                } catch (error) {
                    // Игнорируем ошибки - последовательности могут не существовать
                }
            }

        } else {
            // SQLite - удаляем файл базы данных
            logger.info('📄 Удаление файла базы данных SQLite...');
            
            const dbPath = path.join(__dirname, '../data/dilauncher.db');
            const dbWalPath = path.join(__dirname, '../data/dilauncher.db-wal');
            const dbShmPath = path.join(__dirname, '../data/dilauncher.db-shm');

            // Закрываем соединения
            try {
                await closeDatabase();
            } catch (error) {
                logger.warn('⚠️ Ошибка закрытия соединений:', error.message);
            }

            // Удаляем файлы базы данных
            const filesToRemove = [dbPath, dbWalPath, dbShmPath];
            
            for (const filePath of filesToRemove) {
                try {
                    if (await fs.pathExists(filePath)) {
                        await fs.remove(filePath);
                        logger.info(`   ✅ Удален файл: ${path.basename(filePath)}`);
                    }
                } catch (error) {
                    logger.warn(`   ⚠️ Ошибка удаления файла ${filePath}: ${error.message}`);
                }
            }

            // Удаляем логи
            const logsPath = path.join(__dirname, '../logs');
            try {
                if (await fs.pathExists(logsPath)) {
                    await fs.remove(logsPath);
                    logger.info('   ✅ Удалены файлы логов');
                }
            } catch (error) {
                logger.warn('   ⚠️ Ошибка удаления логов:', error.message);
            }

            // Пересоздаем директории
            await fs.ensureDir(path.join(__dirname, '../data'));
            await fs.ensureDir(path.join(__dirname, '../logs'));
        }

        logger.info('✅ База данных успешно сброшена!');
        logger.info('💡 Для создания новых таблиц выполните: npm run migrate');
        logger.info('💡 Для заполнения тестовыми данными: npm run seed');

        process.exit(0);

    } catch (error) {
        logger.error('❌ Ошибка сброса базы данных:', error);
        process.exit(1);
    }
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
if (args.includes('--force')) {
    // Принудительный сброс без подтверждения (для автоматизации)
    logger.warn('🔥 Принудительный сброс базы данных...');
    resetDatabase();
} else {
    // Обычный режим с подтверждением
    resetDatabase();
}