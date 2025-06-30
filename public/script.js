// ===== KRESTIKI v2.0 - ГЛАВНЫЙ МОДУЛЬ =====

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

// Главный скрипт DinosGames

class DinosGamesApp {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authMode = 'login'; // 'login' или 'register'
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadGameStats();
    }

    setupEventListeners() {
        // Авторизация
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Клики вне формы авторизации
        document.addEventListener('click', (e) => {
            if (e.target.id === 'auth-section') {
                this.hideAuth();
            }
        });

        // ESC для закрытия модалок
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAuth();
            }
        });
    }

    checkAuthStatus() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                this.showUserProfile();
                this.updateGameStats();
            } catch (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
                localStorage.removeItem('userData');
            }
        } else {
            this.showLoginButton();
        }
    }

    showUserProfile() {
        const loginButton = document.getElementById('login-button');
        const userProfile = document.getElementById('user-profile');

        if (loginButton) loginButton.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            
            document.getElementById('user-name').textContent = this.currentUser.username || this.currentUser.name;
            document.getElementById('user-level').textContent = `Уровень ${this.currentUser.level || 1}`;
            document.getElementById('user-avatar').src = this.currentUser.avatar || 
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.currentUser.username || 'user'}`;
        }
    }

    showLoginButton() {
        const loginButton = document.getElementById('login-button');
        const userProfile = document.getElementById('user-profile');

        if (userProfile) userProfile.style.display = 'none';
        if (loginButton) loginButton.style.display = 'flex';
    }

    updateGameStats() {
        if (!this.currentUser) return;

        // Обновляем статистику крестиков-ноликов
        const stats = this.currentUser.gameStats?.ticTacToe || this.currentUser.stats || {};
        
        const tttGames = document.getElementById('ttt-games');
        const tttWins = document.getElementById('ttt-wins');
        const tttRating = document.getElementById('ttt-rating');

        if (tttGames) tttGames.textContent = stats.gamesPlayed || 0;
        if (tttWins) tttWins.textContent = stats.gamesWon || 0;
        if (tttRating) tttRating.textContent = stats.rating || 1000;
    }

    loadGameStats() {
        // Загрузка статистики для неавторизованных пользователей
        if (!this.isAuthenticated) {
            const guestStats = {
                games: 0,
                wins: 0,
                rating: 1000
            };

            const tttGames = document.getElementById('ttt-games');
            const tttWins = document.getElementById('ttt-wins');
            const tttRating = document.getElementById('ttt-rating');

            if (tttGames) tttGames.textContent = guestStats.games;
            if (tttWins) tttWins.textContent = guestStats.wins;
            if (tttRating) tttRating.textContent = guestStats.rating;
        }
    }

    showAuth(mode = 'login') {
        this.authMode = mode;
        const authSection = document.getElementById('auth-section');
        const authTitle = document.getElementById('auth-title');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authSwitch = document.getElementById('auth-switch');

        if (!authSection) return;

        authSection.classList.add('active');

        if (mode === 'login') {
            if (authTitle) authTitle.textContent = 'Вход в аккаунт';
            if (loginForm) loginForm.style.display = 'flex';
            if (registerForm) registerForm.style.display = 'none';
            if (authSwitch) authSwitch.textContent = 'Нет аккаунта? Зарегистрируйтесь';
        } else {
            if (authTitle) authTitle.textContent = 'Регистрация';
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'flex';
            if (authSwitch) authSwitch.textContent = 'Есть аккаунт? Войдите';
        }
    }

    hideAuth() {
        const authSection = document.getElementById('auth-section');
        if (authSection) {
            authSection.classList.remove('active');
        }
        
        // Очищаем формы
        this.clearAuthForms();
    }

    switchAuthMode() {
        this.showAuth(this.authMode === 'login' ? 'register' : 'login');
    }

    clearAuthForms() {
        const forms = ['login-form', 'register-form'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.reset();
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        this.showNotification('Вход в систему...', 'info');

        try {
            // Симулируем API запрос
            const response = await this.mockLogin(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                // Сохраняем в localStorage
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
                
                this.hideAuth();
                this.showUserProfile();
                this.updateGameStats();
                
                this.showNotification(`Добро пожаловать, ${this.currentUser.username}!`, 'success');
            } else {
                this.showNotification(response.message || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;

        // Валидация
        if (!username || !email || !password || !confirmPassword) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Пароли не совпадают', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        if (username.length < 3) {
            this.showNotification('Имя пользователя должно содержать минимум 3 символа', 'error');
            return;
        }

        this.showNotification('Регистрация...', 'info');

        try {
            // Симулируем API запрос
            const response = await this.mockRegister(username, email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                // Сохраняем в localStorage
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
                
                this.hideAuth();
                this.showUserProfile();
                this.updateGameStats();
                
                this.showNotification(`Добро пожаловать в DinosGames, ${this.currentUser.username}!`, 'success');
            } else {
                this.showNotification(response.message || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    async mockLogin(email, password) {
        // Симуляция API запроса
        return new Promise((resolve) => {
            setTimeout(() => {
                // Проверяем существующих пользователей
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                const user = existingUsers.find(u => u.email === email);

                if (user && user.password === password) {
                    resolve({
                        success: true,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            avatar: user.avatar,
                            level: user.level || 1,
                            gameStats: user.gameStats || {
                                ticTacToe: {
                                    gamesPlayed: 0,
                                    gamesWon: 0,
                                    rating: 1000
                                }
                            },
                            createdAt: user.createdAt
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Неверный email или пароль'
                    });
                }
            }, 1000);
        });
    }

    async mockRegister(username, email, password) {
        // Симуляция API запроса
        return new Promise((resolve) => {
            setTimeout(() => {
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                
                // Проверяем уникальность email и username
                if (existingUsers.some(u => u.email === email)) {
                    resolve({
                        success: false,
                        message: 'Пользователь с таким email уже существует'
                    });
                    return;
                }

                if (existingUsers.some(u => u.username === username)) {
                    resolve({
                        success: false,
                        message: 'Пользователь с таким именем уже существует'
                    });
                    return;
                }

                // Создаем нового пользователя
                const newUser = {
                    id: Date.now(),
                    username,
                    email,
                    password, // В реальном приложении пароль нужно хешировать
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    level: 1,
                    gameStats: {
                        ticTacToe: {
                            gamesPlayed: 0,
                            gamesWon: 0,
                            rating: 1000
                        }
                    },
                    createdAt: new Date().toISOString()
                };

                existingUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

                resolve({
                    success: true,
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        email: newUser.email,
                        avatar: newUser.avatar,
                        level: newUser.level,
                        gameStats: newUser.gameStats,
                        createdAt: newUser.createdAt
                    }
                });
            }, 1500);
        });
    }

    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            this.currentUser = null;
            this.isAuthenticated = false;
            
            localStorage.removeItem('userData');
            
            this.showLoginButton();
            this.loadGameStats(); // Сбрасываем статистику
            
            this.showNotification('Вы успешно вышли из аккаунта', 'success');
        }
    }

    playGame(gameType) {
        if (gameType === 'ticTacToe') {
            // Переходим к игре крестики-нолики
            window.location.href = '/games/krestiki/';
        } else {
            this.showNotification(`Игра "${gameType}" пока в разработке!`, 'info');
        }
    }

    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Добавляем стили если их нет
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 2rem;
                    right: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                    max-width: 300px;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .notification-success {
                    border-color: #4CAF50;
                    background: rgba(76, 175, 80, 0.2);
                }
                
                .notification-error {
                    border-color: #f44336;
                    background: rgba(244, 67, 54, 0.2);
                }
                
                .notification-warning {
                    border-color: #FF9800;
                    background: rgba(255, 152, 0, 0.2);
                }
                
                .notification-info {
                    border-color: #2196F3;
                    background: rgba(33, 150, 243, 0.2);
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex: 1;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 0.25rem;
                }
                
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @media (max-width: 768px) {
                    .notification {
                        right: 1rem;
                        left: 1rem;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Добавляем уведомление на страницу
        document.body.appendChild(notification);

        // Автоматически удаляем через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-info-circle';
        }
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 KRESTIKI v2.0 - Модульная инициализация...');
    
    try {
        // Инициализируем модули
        window.GlassXO.ui = new UIManager();
        window.GlassXO.effects = new EffectsManager();
        window.GlassXO.socket = new SocketManager();
        window.GlassXO.gameLogic = new GameLogic();
        // Инициализируем современную админ панель v3.0
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

// Глобальные функции
window.showAuth = (mode) => {
    if (window.dinosApp) {
        window.dinosApp.showAuth(mode);
    }
};

window.hideAuth = () => {
    if (window.dinosApp) {
        window.dinosApp.hideAuth();
    }
};

window.switchAuthMode = () => {
    if (window.dinosApp) {
        window.dinosApp.switchAuthMode();
    }
};

window.logout = () => {
    if (window.dinosApp) {
        window.dinosApp.logout();
    }
};

window.playGame = (gameType) => {
    if (window.dinosApp) {
        window.dinosApp.playGame(gameType);
    }
};

console.log('🚀 DinosGames Core загружен');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.dinosApp = new DinosGamesApp();
}); 