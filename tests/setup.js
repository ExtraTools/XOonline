/**
 * Jest Setup File
 * Настройки для всех тестов
 */

import dotenv from 'dotenv';

// Загружаем переменные окружения для тестов
dotenv.config({ path: '.env.test' });

// Устанавливаем тестовое окружение
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Отключаем логирование в тестах
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Глобальные моки для тестов
global.mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    display_name: 'Test User',
    created_at: new Date(),
    is_online: false
};

global.mockProfile = {
    id: 1,
    user_id: 1,
    name: 'Test Profile',
    description: 'Test profile description',
    minecraft_version: '1.21.6',
    mod_loader: 'vanilla',
    memory_allocation: 4096,
    created_at: new Date()
};

global.mockServer = {
    id: 1,
    user_id: 1,
    name: 'Test Server',
    address: 'test.server.com',
    port: 25565,
    is_favorite: true,
    added_at: new Date()
};

// Таймауты для асинхронных операций
jest.setTimeout(30000);

// Очистка после каждого теста
afterEach(() => {
    jest.clearAllMocks();
});