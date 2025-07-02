export default {
    // Указываем что используем ES modules
    preset: 'node',
    testEnvironment: 'node',
    
    // Поддержка ES modules
    extensionsToTreatAsEsm: ['.js'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    
    // Пути к тестам
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js',
        '**/__tests__/**/*.js'
    ],
    
    // Игнорируем определенные папки
    testPathIgnorePatterns: [
        '/node_modules/',
        '/data/',
        '/logs/',
        '/public/'
    ],
    
    // Покрытие кода
    collectCoverage: true,
    collectCoverageFrom: [
        'server/**/*.js',
        '!server/**/*.test.js',
        '!server/**/*.spec.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    
    // Setup файлы
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Таймаут для тестов
    testTimeout: 10000,
    
    // Очистка моков между тестами
    clearMocks: true,
    
    // Подробный вывод
    verbose: true
};