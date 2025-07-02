#!/usr/bin/env node

/**
 * Database Seed Script
 * Заполняет базу данных тестовыми данными для разработки
 */

import { initDatabase } from '../server/database/database.js';
import User from '../server/models/User.js';
import LauncherProfile from '../server/models/LauncherProfile.js';
import MinecraftServer from '../server/models/MinecraftServer.js';
import winston from 'winston';

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

async function seedDatabase() {
    logger.info('🌱 Заполнение базы данных тестовыми данными...');
    
    try {
        // Инициализируем базу данных
        await initDatabase();
        
        // Создаем тестовых пользователей
        logger.info('👥 Создание тестовых пользователей...');
        
        const testUsers = [
            {
                username: 'steve',
                email: 'steve@minecraft.com',
                password: 'password123',
                displayName: 'Steve Crafter'
            },
            {
                username: 'alex',
                email: 'alex@minecraft.com', 
                password: 'password123',
                displayName: 'Alex Builder'
            },
            {
                username: 'herobrine',
                email: 'herobrine@minecraft.com',
                password: 'password123',
                displayName: 'Herobrine Legend'
            }
        ];

        const users = [];
        for (const userData of testUsers) {
            try {
                const user = await User.create(userData);
                users.push(user);
                logger.info(`   ✅ Создан пользователь: ${user.username}`);
            } catch (error) {
                if (error.message.includes('уже существует')) {
                    logger.warn(`   ⚠️ Пользователь ${userData.username} уже существует`);
                    const existingUser = await User.findByUsername(userData.username);
                    users.push(existingUser);
                } else {
                    throw error;
                }
            }
        }

        // Создаем тестовые профили
        logger.info('🎮 Создание тестовых профилей...');
        
        const profilesData = [
            {
                name: 'Vanilla 1.21.6',
                description: 'Чистая версия Minecraft без модов',
                minecraftVersion: '1.21.6',
                modLoader: 'vanilla',
                memoryAllocation: 4096
            },
            {
                name: 'Modded Fabric',
                description: 'Профиль с модами на Fabric',
                minecraftVersion: '1.21.6',
                modLoader: 'fabric',
                memoryAllocation: 6144
            },
            {
                name: 'Forge Adventure',
                description: 'Приключенческий профиль с модами',
                minecraftVersion: '1.20.4',
                modLoader: 'forge',
                memoryAllocation: 8192
            },
            {
                name: 'Old School',
                description: 'Классическая версия для ностальгии',
                minecraftVersion: '1.19.4',
                modLoader: 'vanilla',
                memoryAllocation: 2048
            }
        ];

        for (const user of users) {
            for (const profileData of profilesData) {
                try {
                    const profile = await LauncherProfile.create(user.id, profileData);
                    logger.info(`   ✅ Создан профиль: ${profile.name} для ${user.username}`);
                    
                    // Добавляем тестовые моды для modded профилей
                    if (profileData.modLoader !== 'vanilla') {
                        await addTestMods(profile, profileData.modLoader);
                    }
                } catch (error) {
                    logger.warn(`   ⚠️ Ошибка создания профиля ${profileData.name}: ${error.message}`);
                }
            }
        }

        // Создаем тестовые серверы
        logger.info('🌐 Создание тестовых серверов...');
        
        const serversData = [
            {
                name: 'Hypixel',
                address: 'mc.hypixel.net',
                port: 25565,
                tags: ['minigames', 'popular', 'bedwars']
            },
            {
                name: '2b2t',
                address: '2b2t.org',
                port: 25565,
                tags: ['anarchy', 'survival', 'oldest']
            },
            {
                name: 'Mineplex',
                address: 'us.mineplex.com',
                port: 25565,
                tags: ['minigames', 'arcade', 'cakewars']
            },
            {
                name: 'CubeCraft',
                address: 'play.cubecraft.net',
                port: 25565,
                tags: ['minigames', 'eggwars', 'skywars']
            }
        ];

        for (const user of users.slice(0, 2)) { // Только для первых двух пользователей
            for (const serverData of serversData) {
                try {
                    const server = await MinecraftServer.addToFavorites(user.id, serverData);
                    logger.info(`   ✅ Добавлен сервер: ${server.name} для ${user.username}`);
                } catch (error) {
                    logger.warn(`   ⚠️ Ошибка добавления сервера ${serverData.name}: ${error.message}`);
                }
            }
        }

        logger.info('✅ База данных успешно заполнена тестовыми данными!');
        logger.info('📊 Статистика:');
        logger.info(`   • Пользователей: ${users.length}`);
        logger.info(`   • Профилей: ${users.length * profilesData.length}`);
        logger.info(`   • Серверов: ${2 * serversData.length}`);
        
        logger.info('\n🔑 Тестовые аккаунты:');
        testUsers.forEach(user => {
            logger.info(`   • ${user.username} / ${user.password}`);
        });

        process.exit(0);
    } catch (error) {
        logger.error('❌ Ошибка заполнения базы данных:', error);
        process.exit(1);
    }
}

async function addTestMods(profile, modLoader) {
    const modsData = {
        fabric: [
            {
                modId: 'sodium',
                modName: 'Sodium',
                modVersion: '0.5.8',
                modSource: 'modrinth',
                fileName: 'sodium-fabric-0.5.8+mc1.21.jar'
            },
            {
                modId: 'iris',
                modName: 'Iris Shaders',
                modVersion: '1.7.0',
                modSource: 'modrinth',
                fileName: 'iris-1.7.0+mc1.21.jar',
                dependencies: ['sodium']
            },
            {
                modId: 'lithium',
                modName: 'Lithium',
                modVersion: '0.12.1',
                modSource: 'modrinth',
                fileName: 'lithium-fabric-0.12.1+mc1.21.jar'
            }
        ],
        forge: [
            {
                modId: 'jei',
                modName: 'Just Enough Items',
                modVersion: '15.2.0.27',
                modSource: 'curseforge',
                fileName: 'jei-1.20.4-15.2.0.27.jar'
            },
            {
                modId: 'iron-chests',
                modName: 'Iron Chests',
                modVersion: '1.20.4-14.4.4',
                modSource: 'curseforge',
                fileName: 'ironchests-1.20.4-14.4.4.jar'
            },
            {
                modId: 'journeymap',
                modName: 'JourneyMap',
                modVersion: '5.9.7',
                modSource: 'curseforge',
                fileName: 'journeymap-1.20.4-5.9.7-fabric.jar'
            }
        ]
    };

    const mods = modsData[modLoader] || [];
    
    for (const modData of mods) {
        try {
            await profile.addMod(modData);
        } catch (error) {
            // Игнорируем ошибки добавления модов в seed
        }
    }
}

// Запуск заполнения
seedDatabase();