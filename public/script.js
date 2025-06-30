// ===== GLASS XO v2.0 - ГЛАВНЫЙ МОДУЛЬ =====

// Импорт модулей
import { AdminPanel } from './modules/adminPanel.js';
import { GameLogic } from './modules/gameLogic.js';
import { UIManager } from './modules/ui.js';
import { SocketManager } from './modules/socket.js';
import { EffectsManager } from './modules/effects.js';

// Глобальный объект игры
window.GlassXO = {
    adminPanel: null,
    gameLogic: null,
    ui: null,
    socket: null,
    effects: null,
    
    // Настройки игры
    settings: {
        soundEnabled: true,
        musicEnabled: false,
        darkTheme: false,
        animationsEnabled: true,
        autoSave: true,
        showHints: false
    },
    
    // Данные игрока
    player: {
        nickname: 'Гость',
        avatar: 'icons/gameIcons/PNG/Black/1x/button1.png',
        level: 1,
        winRate: 0,
        gamesPlayed: 0,
        winStreak: 0,
        isGuest: true,
        isAdmin: false
    },
    
    // Состояние игры
    gameState: {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        gameMode: 'local',
        gameActive: true,
        isMyTurn: false,
        mySymbol: null,
        opponent: null,
        gameStartTime: null,
        moveCount: 0,
        difficulty: 'medium',
        roomCode: null
    },
    
    // Онлайн статистика
    onlineStats: {
        playersOnline: 0,
        activeGames: 0,
        totalMessages: 0
    }
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Glass XO v2.0 - Модульная инициализация...');
    
    try {
        // Инициализируем модули
        window.GlassXO.ui = new UIManager();
        window.GlassXO.effects = new EffectsManager();
        window.GlassXO.socket = new SocketManager();
        window.GlassXO.gameLogic = new GameLogic();
        window.GlassXO.adminPanel = new AdminPanel();
        
        // Загружаем сохранённые данные
        loadGameData();
        
        // Настраиваем интеграцию между модулями
        setupModuleIntegration();
        
        // Запускаем загрузочную последовательность
        await startLoadingSequence();
        
        console.log('✅ Все модули инициализированы успешно');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        window.GlassXO.ui.showNotification('Ошибка загрузки игры', 'error');
    }
});

// Загрузочная последовательность
async function startLoadingSequence() {
    // Показываем загрузочный экран
    window.GlassXO.ui.showScreen('loading-screen');
    
    // Имитируем загрузку
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Скрываем загрузочный экран
    document.getElementById('loading-screen').classList.remove('active');
    
    // Проверяем сохранённый ник
    const savedNickname = localStorage.getItem('playerNickname');
    if (savedNickname) {
        window.GlassXO.player.nickname = savedNickname;
        window.GlassXO.ui.showScreen('main-menu');
        window.GlassXO.ui.updatePlayerProfile();
        } else {
        window.GlassXO.ui.showScreen('auth-screen');
    }
}

// Загрузка сохранённых данных
function loadGameData() {
    try {
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            window.GlassXO.settings = { ...window.GlassXO.settings, ...JSON.parse(savedSettings) };
        }
        
        const savedPlayerData = localStorage.getItem('playerData');
        if (savedPlayerData) {
            window.GlassXO.player = { ...window.GlassXO.player, ...JSON.parse(savedPlayerData) };
        }
        
        // Применяем настройки
        applySettings();
        
    } catch (error) {
        console.log('Ошибка загрузки данных:', error);
    }
}

// Применение настроек
function applySettings() {
    const settings = window.GlassXO.settings;
    
    // Настройки чекбоксов
    document.getElementById('sound-enabled').checked = settings.soundEnabled;
    document.getElementById('music-enabled').checked = settings.musicEnabled;
    document.getElementById('dark-theme').checked = settings.darkTheme;
    document.getElementById('animations-enabled').checked = settings.animationsEnabled;
    document.getElementById('auto-save').checked = settings.autoSave;
    document.getElementById('show-hints').checked = settings.showHints;
    
    // Применяем тему
    window.GlassXO.ui.toggleTheme(settings.darkTheme);
    
    // Анимации
    if (!settings.animationsEnabled) {
        document.body.classList.add('no-animations');
    }
}

// Сохранение данных
window.GlassXO.saveGameData = function() {
    if (window.GlassXO.settings.autoSave) {
        localStorage.setItem('gameSettings', JSON.stringify(window.GlassXO.settings));
        localStorage.setItem('playerData', JSON.stringify(window.GlassXO.player));
    }
};

// Глобальные утилиты
window.GlassXO.utils = {
    formatTime: (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },
    
    generateId: () => Math.random().toString(36).substr(2, 9),
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Глобальные функции для HTML onclick
window.closeModal = (modalId) => {
    if (window.GlassXO.ui) {
        window.GlassXO.ui.closeModal(modalId);
    }
};

window.showScreen = (screenId) => {
    if (window.GlassXO.ui) {
        window.GlassXO.ui.showScreen(screenId);
    }
};

// Настройка интеграции модулей
function setupModuleIntegration() {
    // Интеграция эффектов с админ панелью
    if (window.GlassXO.adminPanel && window.GlassXO.effects) {
        // Устанавливаем обработчики админских событий в эффектах
        window.GlassXO.adminPanel.effectsManager = window.GlassXO.effects;
    }
    
    // Настройка сокетных обработчиков для эффектов (с задержкой для сокетов)
    setTimeout(() => {
        if (window.GlassXO.effects && window.GlassXO.effects.setupSocketHandlers) {
            window.GlassXO.effects.setupSocketHandlers();
        }
        
        // Настройка обработчиков для админ панели
        if (window.GlassXO.adminPanel && window.GlassXO.socket) {
            setupAdminSocketHandlers();
        }
    }, 2000);
    
    console.log('🔗 Модули интегрированы');
}

// Настройка админских сокет обработчиков
function setupAdminSocketHandlers() {
    if (!window.GlassXO.socket || !window.GlassXO.socket.socket) return;
    
    const socket = window.GlassXO.socket.socket;
    
    // Обновление списка пользователей в админке
    socket.on('admin_users_list', (users) => {
        if (window.GlassXO.adminPanel) {
            window.GlassXO.adminPanel.updateUsersList(users);
        }
    });
    
    // Обновление статистики в админке
    socket.on('admin_stats_update', (stats) => {
        if (window.GlassXO.adminPanel) {
            window.GlassXO.adminPanel.updateStats(stats);
        }
    });
    
    console.log('🔥 Админские сокет обработчики настроены');
}

console.log('🚀 Glass XO Core загружен'); 