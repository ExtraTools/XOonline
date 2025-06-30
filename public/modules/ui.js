// ===== UI MANAGER MODULE =====

export class UIManager {
    constructor() {
        this.currentScreen = null;
        this.modals = new Set();
        this.notifications = [];
        
        this.init();
        console.log('✅ UIManager инициализирован');
    }

    init() {
        this.setupEventListeners();
        this.setupModalHandlers();
        this.setupSettingsHandlers();
    }

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
    setupEventListeners() {
        // Авторизация
        this.setupAuthTabs();
        document.getElementById('guest-login-btn')?.addEventListener('click', () => this.handleGuestLogin());
        document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('register-btn')?.addEventListener('click', () => this.showRegisterForm());
        document.getElementById('code-login-btn')?.addEventListener('click', () => this.handleCodeLogin());
        document.getElementById('create-account-btn')?.addEventListener('click', () => this.handleRegister());
        document.getElementById('back-to-login-btn')?.addEventListener('click', () => this.showLoginForm());
        document.getElementById('forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
        
        // Навигация
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openModal('settings-modal'));
        document.getElementById('leaderboard-btn')?.addEventListener('click', () => this.openLeaderboard());
        document.getElementById('changelog-btn')?.addEventListener('click', () => this.showScreen('changelog-screen'));
        document.getElementById('close-changelog-btn')?.addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        
        // Режимы игры
        document.getElementById('ai-mode-btn')?.addEventListener('click', () => this.showScreen('ai-difficulty-screen'));
        document.getElementById('online-mode-btn')?.addEventListener('click', () => this.showScreen('online-lobby-screen'));
        document.getElementById('local-mode-btn')?.addEventListener('click', () => this.startLocalGame());
        
        // Сложность ИИ
        this.setupDifficultySelection();
        document.getElementById('start-ai-game-btn')?.addEventListener('click', () => this.startAIGame());
        document.getElementById('back-to-menu-btn')?.addEventListener('click', () => this.showScreen('main-menu'));
        
        // Онлайн лобби
        document.getElementById('quick-match-btn')?.addEventListener('click', () => this.findQuickMatch());
        document.getElementById('create-room-btn')?.addEventListener('click', () => this.createPrivateRoom());
        document.getElementById('join-room-btn')?.addEventListener('click', () => this.joinPrivateRoom());
        document.getElementById('back-to-menu-lobby-btn')?.addEventListener('click', () => this.showScreen('main-menu'));
        
        // Новые обработчики лобби
        this.setupLobbyHandlers();
        
        // Кнопка отмены поиска
        document.getElementById('cancel-search-btn')?.addEventListener('click', () => {
            if (window.GlassXO.socket) {
                window.GlassXO.socket.cancelMatchmaking();
            }
        });
        
        // Игровые действия
        document.getElementById('restart-game-btn')?.addEventListener('click', () => this.restartGame());
        document.getElementById('surrender-btn')?.addEventListener('click', () => this.surrenderGame());
        document.getElementById('back-to-menu-game-btn')?.addEventListener('click', () => this.showScreen('main-menu'));
        
        // Результаты игры
        document.getElementById('play-again-btn')?.addEventListener('click', () => this.playAgain());
        
        // Игровое поле
        this.setupGameBoard();
    }

    setupModalHandlers() {
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Закрытие модального окна по клику вне его
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    setupDifficultySelection() {
        document.querySelectorAll('.difficulty-option').forEach(option => {
            option.addEventListener('click', () => {
                // Убираем выделение с других опций
                document.querySelectorAll('.difficulty-option').forEach(opt => 
                    opt.classList.remove('selected'));
                
                // Выделяем выбранную опцию
                option.classList.add('selected');
                
                // Сохраняем выбранную сложность
                window.GlassXO.gameState.difficulty = option.dataset.difficulty;
                
                // Активируем кнопку старта
                document.getElementById('start-ai-game-btn').disabled = false;
            });
        });
    }

    setupGameBoard() {
        document.querySelectorAll('.cell').forEach((cell, index) => {
            cell.addEventListener('click', () => this.handleCellClick(index));
        });
    }

    setupLobbyHandlers() {
        // Быстрые коды присоединения
        document.querySelectorAll('.quick-code').forEach(code => {
            code.addEventListener('click', function() {
                const roomCode = this.dataset.code;
                const roomInput = document.getElementById('room-code');
                if (roomInput) {
                    roomInput.value = roomCode;
                    window.GlassXO.ui.showNotification(`🔗 Код ${roomCode} вставлен`, 'info');
                }
            });
        });

        // Обновление списка комнат
        document.getElementById('refresh-rooms-btn')?.addEventListener('click', function() {
            this.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                this.style.transform = '';
            }, 500);
            
            // Запросить обновление списка комнат
            if (window.GlassXO.socket) {
                window.GlassXO.socket.refreshPublicRooms();
            }
            window.GlassXO.ui.showNotification('🔄 Обновление списка комнат...', 'info');
        });

        // Быстрое присоединение к комнате (будет обновляться динамически)
        this.setupDynamicRoomJoinHandlers();

        // Дополнительные кнопки лобби
        document.getElementById('lobby-settings-btn')?.addEventListener('click', function() {
            window.GlassXO.ui.showNotification('⚙️ Настройки лобби пока недоступны', 'info');
        });

        document.getElementById('lobby-help-btn')?.addEventListener('click', function() {
            window.GlassXO.ui.showNotification('❓ Помощь: Выберите режим игры выше для начала', 'info');
        });

        // Анимация прогресс-баров статистики
        this.animateProgressBars();
    }

    setupSettingsHandlers() {
        // Звук
        document.getElementById('sound-enabled')?.addEventListener('change', (e) => {
            window.GlassXO.settings.soundEnabled = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('music-enabled')?.addEventListener('change', (e) => {
            window.GlassXO.settings.musicEnabled = e.target.checked;
            this.saveSettings();
        });
        
        // Внешний вид
        document.getElementById('dark-theme')?.addEventListener('change', (e) => {
            window.GlassXO.settings.darkTheme = e.target.checked;
            this.toggleTheme(e.target.checked);
            this.saveSettings();
        });
        
        document.getElementById('animations-enabled')?.addEventListener('change', (e) => {
            window.GlassXO.settings.animationsEnabled = e.target.checked;
            document.body.classList.toggle('no-animations', !e.target.checked);
            this.saveSettings();
        });
        
        // Игра
        document.getElementById('auto-save')?.addEventListener('change', (e) => {
            window.GlassXO.settings.autoSave = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('show-hints')?.addEventListener('change', (e) => {
            window.GlassXO.settings.showHints = e.target.checked;
            this.saveSettings();
        });
    }

    // Сохранение настроек на сервере
    async saveSettings() {
        try {
            const nickname = window.GlassXO.player?.nickname;
            
            if (nickname && !window.GlassXO.player?.isGuest) {
                // Для зарегистрированных пользователей сохраняем на сервере
                const response = await fetch('/api/user/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nickname: nickname,
                        settings: window.GlassXO.settings
                    }),
                });

                const data = await response.json();
                if (!data.success) {
                    console.warn('Не удалось сохранить настройки на сервере:', data.message);
                }
            }
            
            // Локальное сохранение для всех пользователей
            window.GlassXO.saveGameData();
            
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            // В случае ошибки сохраняем локально
            window.GlassXO.saveGameData();
        }
    }

    // Загрузка настроек пользователя
    loadUserSettings(userSettings) {
        if (!userSettings) return;

        // Обновляем глобальные настройки
        window.GlassXO.settings = { ...window.GlassXO.settings, ...userSettings };

        // Обновляем элементы интерфейса
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled) soundEnabled.checked = userSettings.soundEnabled ?? true;

        const musicEnabled = document.getElementById('music-enabled');
        if (musicEnabled) musicEnabled.checked = userSettings.musicEnabled ?? false;

        const darkTheme = document.getElementById('dark-theme');
        if (darkTheme) {
            darkTheme.checked = userSettings.darkTheme ?? false;
            this.toggleTheme(userSettings.darkTheme);
        }

        const animationsEnabled = document.getElementById('animations-enabled');
        if (animationsEnabled) {
            animationsEnabled.checked = userSettings.animationsEnabled ?? true;
            document.body.classList.toggle('no-animations', !userSettings.animationsEnabled);
        }

        const autoSave = document.getElementById('auto-save');
        if (autoSave) autoSave.checked = userSettings.autoSave ?? true;

        const showHints = document.getElementById('show-hints');
        if (showHints) showHints.checked = userSettings.showHints ?? false;
    }

    // ===== УПРАВЛЕНИЕ ЭКРАНАМИ =====
    showScreen(screenId) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показываем нужный экран
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            
            // Если переходим в онлайн лобби, запрашиваем список комнат
            if (screenId === 'online-lobby-screen' && window.GlassXO.socket) {
                window.GlassXO.socket.requestPublicRooms();
            }
        }
    }

    // ===== МОДАЛЬНЫЕ ОКНА =====
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.modals.add(modalId);
            document.body.style.overflow = 'hidden'; // Предотвращаем прокрутку
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            this.modals.delete(modalId);
            
            // Восстанавливаем прокрутку если нет других модальных окон
            if (this.modals.size === 0) {
                document.body.style.overflow = '';
            }
        }
    }

    // ===== УВЕДОМЛЕНИЯ =====
    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        const id = window.GlassXO.utils.generateId();
        
        notification.id = `notification-${id}`;
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Стили уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: `${80 + this.notifications.length * 60}px`,
            right: '20px',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: '10001',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        // Цвета в зависимости от типа
        const colors = {
            'info': { bg: '#3b82f6', color: '#ffffff' },
            'success': { bg: '#10b981', color: '#ffffff' },
            'warning': { bg: '#f59e0b', color: '#ffffff' },
            'error': { bg: '#ef4444', color: '#ffffff' },
            'danger': { bg: '#dc2626', color: '#ffffff' }
        };
        
        const colorScheme = colors[type] || colors.info;
        notification.style.backgroundColor = colorScheme.bg;
        notification.style.color = colorScheme.color;
        
        document.body.appendChild(notification);
        this.notifications.push(id);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Автоудаление
        setTimeout(() => {
            this.removeNotification(id);
        }, duration);
        
        return id;
    }

    removeNotification(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                // Удаляем из массива
                this.notifications = this.notifications.filter(notifId => notifId !== id);
                // Перерасчитываем позиции оставшихся уведомлений
                this.repositionNotifications();
            }, 300);
        }
    }

    repositionNotifications() {
        this.notifications.forEach((id, index) => {
            const notification = document.getElementById(`notification-${id}`);
            if (notification) {
                notification.style.top = `${80 + index * 60}px`;
            }
        });
    }

    // ===== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА =====
    updatePlayerProfile() {
        const player = window.GlassXO.player;
        
        // Отображаем имя с ID если есть
        const nameDisplay = player.user_id ? 
            `${player.nickname} #${player.user_id}` : 
            player.nickname;
        
        document.getElementById('player-name').textContent = nameDisplay;
        document.getElementById('player-avatar').src = player.avatar;
        document.getElementById('player-level').textContent = player.level;
        document.getElementById('win-rate').textContent = player.winRate + '%';
        document.getElementById('games-played').textContent = player.gamesPlayed;
        document.getElementById('win-streak').textContent = player.winStreak;
        
        // Показываем кнопки для авторизованных пользователей
        document.getElementById('profile-btn').style.display = player.isGuest ? 'none' : 'block';
        document.getElementById('logout-btn').style.display = 'block';
        
        // Логируем информацию о пользователе
        if (player.user_id && player.registration) {
            const registrationDate = new Date(player.registration.date).toLocaleDateString('ru-RU');
            console.log(`👤 Профиль: Пользователь #${player.user_id} (${player.username}), зарегистрирован ${registrationDate}`);
            
            // Отображаем IP если есть
            if (player.ip) {
                console.log(`🌐 IP: ${player.ip}`);
            }
        }
    }

    updateOnlineStats() {
        const stats = window.GlassXO.onlineStats;
        
        // Обновляем числа
        document.getElementById('players-online').textContent = stats.playersOnline;
        document.getElementById('active-games').textContent = stats.activeGames;
        
        // Добавляем очередь если её нет
        const queueElement = document.getElementById('queue-size');
        if (queueElement) {
            queueElement.textContent = stats.queueSize || 0;
        }
        
        // Обновляем прогресс-бары с анимацией
        this.updateProgressBar('players-progress', stats.playersOnline, 100);
        this.updateProgressBar('games-progress', stats.activeGames, 50);
        this.updateProgressBar('queue-progress', stats.queueSize || 0, 20);
        
        // Обновляем статистику в модальном окне ожидания
        const onlineCount = document.getElementById('online-count');
        if (onlineCount) {
            onlineCount.textContent = stats.playersOnline;
        }
    }

    updateProgressBar(barId, value, maxValue) {
        const progressBar = document.getElementById(barId);
        if (progressBar) {
            const percentage = Math.min((value / maxValue) * 100, 100);
            progressBar.style.width = `${percentage}%`;
        }
    }

    animateProgressBars() {
        // Инициализируем прогресс-бары с нулевой шириной
        const progressBars = ['players-progress', 'games-progress', 'queue-progress'];
        progressBars.forEach(barId => {
            const bar = document.getElementById(barId);
            if (bar) {
                bar.style.width = '0%';
            }
        });
        
        // Анимируем с задержкой
        setTimeout(() => {
            this.updateOnlineStats();
        }, 500);
    }

    updateGameDisplay() {
        const gameState = window.GlassXO.gameState;
        
        // Обновляем информацию об игроках
        document.getElementById('player-x-name').textContent = 
            gameState.gameMode === 'local' ? 'Игрок X' : window.GlassXO.player.nickname;
        
        document.getElementById('player-o-name').textContent = 
            gameState.gameMode === 'local' ? 'Игрок O' : 
            gameState.gameMode === 'ai' ? `ИИ (${this.getDifficultyName(gameState.difficulty)})` :
            gameState.opponent || 'Ожидание...';
        
        // Обновляем режим игры
        const modeNames = {
            'local': 'Локальная игра',
            'ai': 'Игра против ИИ',
            'online': 'Онлайн игра'
        };
        document.getElementById('game-mode-display').textContent = modeNames[gameState.gameMode];
        
        // Очищаем поле
        document.querySelectorAll('.cell').forEach((cell, index) => {
            cell.textContent = '';
            cell.className = 'cell';
            cell.style.transform = '';
            cell.style.transition = '';
            
            // Убеждаемся, что в состоянии игры тоже null
            if (gameState.board && index < gameState.board.length) {
                gameState.board[index] = null;
            }
        });
        
        // Показываем кнопку сдаться только в онлайн игре
        document.getElementById('surrender-btn').style.display = 
            gameState.gameMode === 'online' ? 'block' : 'none';
        
        this.updateTurnIndicator();
        this.startGameTimer();
    }

    updateCellDisplay(index, player) {
        const cell = document.querySelector(`[data-index="${index}"]`);
        if (!cell) return;
        
        // Если player null или undefined - очищаем клетку
        if (player === null || player === undefined) {
            cell.textContent = '';
            cell.className = 'cell'; // Убираем все дополнительные классы
            cell.style.transform = '';
            cell.style.transition = '';
            return;
        }
        
        // Устанавливаем символ
        cell.textContent = player;
        
        // Очищаем предыдущие классы игроков
        cell.classList.remove('x', 'o', 'occupied');
        
        // Добавляем новые классы
        cell.classList.add(player.toLowerCase());
        cell.classList.add('occupied');
        
        // Анимация появления
        if (window.GlassXO.settings.animationsEnabled) {
            cell.style.transform = 'scale(0)';
            cell.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                cell.style.transform = 'scale(1)';
            }, 10);
        }
    }

    updateTurnIndicator() {
        const indicator = document.getElementById('turn-indicator');
        const gameState = window.GlassXO.gameState;
        
        if (!indicator) return;
        
        if (gameState.gameMode === 'local') {
            indicator.textContent = `Ход игрока ${gameState.currentPlayer}`;
        } else if (gameState.gameMode === 'ai') {
            if (gameState.currentPlayer === 'X') {
                indicator.textContent = 'Ваш ход';
            } else {
                indicator.textContent = 'Ход ИИ...';
            }
        } else if (gameState.gameMode === 'online') {
            if (gameState.isMyTurn) {
                indicator.textContent = 'Ваш ход';
            } else {
                indicator.textContent = `Ход ${gameState.opponent}...`;
            }
        }
    }

    // ===== ОБРАБОТЧИКИ ДЕЙСТВИЙ =====
    async handleGuestLogin() {
        const nicknameInput = document.getElementById('guest-nickname');
        const saveNickname = document.getElementById('save-nickname').checked;
        
        let nickname = nicknameInput.value.trim();
        
        if (!nickname) {
            nickname = 'Гость' + Math.floor(Math.random() * 1000);
            nicknameInput.value = nickname;
        }
        
        // Проверяем длину ника
        if (nickname.length > 15) {
            this.showNotification('❌ Ник не должен превышать 15 символов', 'error');
            return;
        }
        
        try {
            // Отправляем запрос на сервер для гостевого входа
            const response = await fetch('/api/guest/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nickname }),
            });

            const data = await response.json();

            if (data.success) {
                // Обновляем данные игрока с загруженной статистикой
                window.GlassXO.player = {
                    ...window.GlassXO.player,
                    ...data.user,
                    isGuest: true
                };

                // Загружаем настройки пользователя
                if (data.user.settings) {
                    this.loadUserSettings(data.user.settings);
                }

                if (saveNickname) {
                    localStorage.setItem('playerNickname', nickname);
                }

                // Обновляем профиль и переходим в главное меню
                this.updatePlayerProfile();
                this.showScreen('main-menu');
                
                // Подключаемся к серверу с ником
                if (window.GlassXO.socket) {
                    window.GlassXO.socket.setNickname(nickname);
                }
                
                this.showNotification(data.message, 'success');
                
                // Если это возвращающийся пользователь, показываем дополнительную информацию
                if (data.user.isReturning) {
                    setTimeout(() => {
                        this.showNotification(
                            `📊 Статистика загружена: Уровень ${data.user.level}, Рейтинг ${data.user.rating}`, 
                            'info', 
                            6000
                        );
                    }, 1500);
                }
            } else {
                this.showNotification(`❌ ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка гостевого входа:', error);
            this.showNotification('❌ Ошибка подключения к серверу', 'error');
        }
    }

    handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('playerNickname');
            
            window.GlassXO.player = {
                nickname: 'Гость',
                avatar: '/icons/gameIcons/PNG/Black/1x/button1.png',
                level: 1,
                winRate: 0,
                gamesPlayed: 0,
                winStreak: 0,
                isGuest: true,
                isAdmin: false
            };
            
            if (window.GlassXO.adminPanel) {
                window.GlassXO.adminPanel.hide();
            }
            
            this.showScreen('auth-screen');
            this.showNotification('👋 До свидания!', 'info');
        }
    }

    handleCellClick(index) {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.handleCellClick(index);
        }
    }

    // ===== ИГРОВЫЕ ДЕЙСТВИЯ (делегируем в GameLogic) =====
    startLocalGame() {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.startLocalGame();
        }
    }

    startAIGame() {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.startAIGame();
        }
    }

    findQuickMatch() {
        if (window.GlassXO.socket) {
            window.GlassXO.socket.findQuickMatch();
        }
    }

    createPrivateRoom() {
        if (window.GlassXO.socket) {
            window.GlassXO.socket.createPrivateRoom();
        }
    }

    joinPrivateRoom() {
        if (window.GlassXO.socket) {
            window.GlassXO.socket.joinPrivateRoom();
        }
    }

    restartGame() {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.restartGame();
        }
    }

    surrenderGame() {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.surrenderGame();
        }
    }

    playAgain() {
        this.closeModal('game-result-modal');
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.playAgain();
        }
    }

    // ===== УТИЛИТЫ =====
    toggleTheme(isDark) {
        const root = document.documentElement;
        
        if (isDark) {
            root.style.setProperty('--primary-bg', '#0a0a0a');
            root.style.setProperty('--secondary-bg', '#1a1a1a');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#a1a1aa');
            root.style.setProperty('--text-muted', '#71717a');
            root.style.setProperty('--border-color', '#262626');
            root.style.setProperty('--border-hover', '#404040');
        } else {
            root.style.setProperty('--primary-bg', '#ffffff');
            root.style.setProperty('--secondary-bg', '#f8f9fa');
            root.style.setProperty('--text-primary', '#1a1a1a');
            root.style.setProperty('--text-secondary', '#6b7280');
            root.style.setProperty('--text-muted', '#9ca3af');
            root.style.setProperty('--border-color', '#e5e7eb');
            root.style.setProperty('--border-hover', '#d1d5db');
        }
    }

    getDifficultyName(difficulty) {
        const names = {
            'easy': 'Лёгкий',
            'medium': 'Средний', 
            'hard': 'Сложный',
            'impossible': 'Невозможный'
        };
        return names[difficulty] || 'Средний';
    }

    startGameTimer() {
        const timerDisplay = document.getElementById('timer-display');
        if (!timerDisplay) return;
        
        const timer = setInterval(() => {
            const gameState = window.GlassXO.gameState;
            if (gameState.gameStartTime && gameState.gameActive) {
                const elapsed = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
                timerDisplay.textContent = window.GlassXO.utils.formatTime(elapsed);
            } else {
                clearInterval(timer);
            }
        }, 1000);
    }

    // ===== ЗВУКИ =====
    playSound(type) {
        if (!window.GlassXO.settings.soundEnabled) return;
        
        // Создаём аудио элементы для разных звуков
        const sounds = {
            'move': () => this.createBeep(800, 0.1, 100),
            'win': () => this.createMelody([523.25, 659.25, 783.99]),
            'lose': () => this.createSlide(200, 100, 500),
            'draw': () => this.createBeep(400, 0.05, 300)
        };
        
        try {
            if (sounds[type]) {
                sounds[type]();
            }
        } catch (error) {
            console.log('Не удалось воспроизвести звук:', error);
        }
    }

    createBeep(frequency, volume, duration) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }

    createMelody(notes) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        notes.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.2);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (index + 1) * 0.2);
            
            oscillator.start(audioContext.currentTime + index * 0.2);
            oscillator.stop(audioContext.currentTime + (index + 1) * 0.2);
        });
    }

    createSlide(startFreq, endFreq, duration) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + duration / 1000);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }

    // ===== НОВЫЕ МЕТОДЫ АВТОРИЗАЦИИ =====
    setupAuthTabs() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchAuthTab(targetTab);
            });
        });

        // Клик по подсказкам кодов
        document.querySelectorAll('.hint-value').forEach(hint => {
            hint.addEventListener('click', () => {
                const code = hint.textContent;
                const codeInput = document.getElementById('access-code');
                if (codeInput) {
                    codeInput.value = code;
                    this.showNotification(`🔑 Код "${code}" вставлен`, 'info');
                }
            });
        });
    }

    switchAuthTab(tabName) {
        // Убираем активный класс со всех вкладок
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Скрываем весь контент
        document.querySelectorAll('.auth-content').forEach(content => {
            content.classList.remove('active');
        });

        // Активируем выбранную вкладку
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Показываем соответствующий контент
        const targetContent = document.getElementById(`${tabName}-auth`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    handleLogin() {
        const username = document.getElementById('login-username')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        const rememberMe = document.getElementById('remember-me')?.checked;

        if (!username || !password) {
            this.showNotification('❌ Введите логин и пароль', 'error');
            return;
        }

        if (username.length < 3) {
            this.showNotification('❌ Логин должен содержать минимум 3 символа', 'error');
            return;
        }

        if (password.length < 4) {
            this.showNotification('❌ Пароль должен содержать минимум 4 символа', 'error');
            return;
        }

        // Отправляем данные на сервер
        this.sendLoginRequest(username, password, rememberMe);
    }

    async sendLoginRequest(username, password, rememberMe) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    rememberMe: rememberMe
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Обновляем данные игрока
                window.GlassXO.player = {
                    ...window.GlassXO.player,
                    ...data.user,
                    isGuest: false
                };

                if (rememberMe) {
                    localStorage.setItem('authToken', data.token);
                }

                this.updatePlayerProfile();
                this.showScreen('main-menu');
                this.showNotification(`🎉 Добро пожаловать, ${data.user.username}!`, 'success');
            } else {
                this.showNotification(`❌ ${data.message || 'Ошибка входа'}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('❌ Ошибка подключения к серверу', 'error');
        }
    }

    showRegisterForm() {
        document.querySelectorAll('.auth-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById('register-form').style.display = 'block';
    }

    showLoginForm() {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-auth').style.display = 'block';
    }

    handleRegister() {
        const username = document.getElementById('register-username')?.value.trim();
        const email = document.getElementById('register-email')?.value.trim();
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('register-confirm-password')?.value;
        const agreeTerms = document.getElementById('agree-terms')?.checked;

        // Валидация
        if (!username || !email || !password || !confirmPassword) {
            this.showNotification('❌ Заполните все поля', 'error');
            return;
        }

        if (!agreeTerms) {
            this.showNotification('❌ Необходимо согласиться с условиями', 'error');
            return;
        }

        if (username.length < 3) {
            this.showNotification('❌ Имя пользователя должно содержать минимум 3 символа', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('❌ Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('❌ Пароли не совпадают', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('❌ Введите корректный email', 'error');
            return;
        }

        // Отправляем данные на сервер
        this.sendRegisterRequest(username, email, password);
    }

    async sendRegisterRequest(username, email, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                }),
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('🎉 Аккаунт успешно создан! Войдите в систему', 'success');
                this.showLoginForm();

                // Автозаполнение логина
                const loginInput = document.getElementById('login-username');
                if (loginInput) {
                    loginInput.value = username;
                }
            } else {
                this.showNotification(`❌ ${data.message || 'Ошибка регистрации'}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showNotification('❌ Ошибка подключения к серверу', 'error');
        }
    }

    handleCodeLogin() {
        const code = document.getElementById('access-code')?.value.trim();

        if (!code) {
            this.showNotification('❌ Введите код доступа', 'error');
            return;
        }

        // Проверяем специальные коды
        this.processAccessCode(code);
    }

    processAccessCode(code) {
        const specialCodes = {
            'admin-start': () => {
                // Активируем админские права
                window.GlassXO.player.isAdmin = true;
                
                if (window.GlassXO.adminPanel) {
                    window.GlassXO.adminPanel.isAdmin = true;
                    const adminBtn = document.getElementById('admin-btn');
                    if (adminBtn) {
                        adminBtn.style.display = 'block';
                    }
                }

                // Отправляем на сервер
                if (window.GlassXO.socket && window.GlassXO.socket.socket) {
                    window.GlassXO.socket.socket.emit('admin_activate', { code: code });
                }

                window.GlassXO.player.nickname = 'Админ';
                window.GlassXO.player.isGuest = false;
                this.updatePlayerProfile();
                this.showScreen('main-menu');
                this.showNotification('🔥 Админские права активированы!', 'success');
            },
            'vip-access': () => {
                window.GlassXO.player.nickname = 'VIP Игрок';
                window.GlassXO.player.level = 10;
                window.GlassXO.player.isGuest = false;
                this.updatePlayerProfile();
                this.showScreen('main-menu');
                this.showNotification('⭐ VIP статус активирован!', 'success');
            },
            'demo-play': () => {
                window.GlassXO.player.nickname = 'Demo User';
                window.GlassXO.player.isGuest = false;
                this.updatePlayerProfile();
                this.showScreen('main-menu');
                this.showNotification('🎮 Demo режим активирован!', 'success');
            }
        };

        if (specialCodes[code.toLowerCase()]) {
            specialCodes[code.toLowerCase()]();
        } else {
            this.showNotification('❌ Неверный код доступа', 'error');
        }
    }

    handleForgotPassword() {
        const email = prompt('Введите ваш email для восстановления пароля:');
        
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(email)) {
                this.showNotification('📧 Инструкции отправлены на ваш email', 'info');
                // Здесь можно добавить запрос к серверу для восстановления пароля
            } else {
                this.showNotification('❌ Введите корректный email', 'error');
            }
        }
    }

    // ===== МЕТОДЫ ДЛЯ РАБОТЫ С ПУБЛИЧНЫМИ КОМНАТАМИ =====
    setupDynamicRoomJoinHandlers() {
        // Запрашиваем список комнат при входе в лобби
        if (window.GlassXO.socket) {
            window.GlassXO.socket.requestPublicRooms();
        }
    }

    updatePublicRoomsList(rooms) {
        console.log('🏠 Обновляем список публичных комнат:', rooms);
        
        const roomsList = document.getElementById('rooms-list');
        const emptyRooms = document.getElementById('empty-rooms');
        
        if (!roomsList) return;
        
        // Очищаем текущий список (оставляем только empty-rooms элемент)
        const existingRooms = roomsList.querySelectorAll('.room-item:not(#empty-rooms)');
        existingRooms.forEach(room => room.remove());
        
        if (rooms && rooms.length > 0) {
            // Скрываем сообщение о пустом списке
            if (emptyRooms) {
                emptyRooms.style.display = 'none';
            }
            
            // Добавляем реальные комнаты
            rooms.forEach(room => {
                const roomElement = this.createRoomElement(room);
                if (emptyRooms) {
                    roomsList.insertBefore(roomElement, emptyRooms);
                } else {
                    roomsList.appendChild(roomElement);
                }
            });
        } else {
            // Показываем сообщение о пустом списке
            if (emptyRooms) {
                emptyRooms.style.display = 'block';
            }
        }
    }

    createRoomElement(room) {
        const roomElement = document.createElement('div');
        roomElement.className = 'room-item';
        roomElement.setAttribute('data-room-code', room.code);
        
        // Определяем иконку в зависимости от наличия пароля
        const lockIcon = room.hasPassword ? 
            '<i class="fas fa-lock" title="Комната защищена паролем"></i>' : 
            '<i class="fas fa-users" title="Открытая комната"></i>';
        
        roomElement.innerHTML = `
            <div class="room-info">
                <div class="room-name">
                    ${lockIcon}
                    ${this.escapeHtml(room.name)}
                </div>
                <div class="room-details">
                    <span class="room-players">${room.players}/${room.maxPlayers}</span>
                    <span class="room-level">${room.level}</span>
                    <span class="room-time">${room.timeAgo}</span>
                </div>
                <div class="room-host">
                    <img src="${room.host.avatar}" alt="Avatar" class="host-avatar">
                    <span class="host-name">${this.escapeHtml(room.host.name)}</span>
                </div>
            </div>
            <button class="join-room-quick-btn" data-code="${room.code}" title="Присоединиться">
                <i class="fas fa-arrow-right"></i>
            </button>
        `;
        
        // Добавляем обработчик для кнопки присоединения
        const joinBtn = roomElement.querySelector('.join-room-quick-btn');
        joinBtn.addEventListener('click', () => {
            this.quickJoinRoom(room.code, room.hasPassword);
        });
        
        return roomElement;
    }

    quickJoinRoom(roomCode, hasPassword) {
        if (hasPassword) {
            const password = prompt('Введите пароль для комнаты:');
            if (!password) {
                return; // Пользователь отменил ввод
            }
            
            if (window.GlassXO.socket) {
                window.GlassXO.socket.socket.emit('joinRoom', { 
                    code: roomCode, 
                    password: password 
                });
            }
        } else {
            if (window.GlassXO.socket) {
                window.GlassXO.socket.quickJoinRoom(roomCode);
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== РЕЙТИНГ ИГРОКОВ =====
    openLeaderboard() {
        this.openModal('leaderboard-modal');
        this.setupLeaderboardHandlers();
        this.loadLeaderboard('today');
    }

    setupLeaderboardHandlers() {
        // Обработчики вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Убираем активный класс со всех вкладок
                document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
                
                // Активируем выбранную вкладку
                btn.classList.add('active');
                
                // Загружаем рейтинг для выбранного периода
                const period = btn.dataset.tab;
                this.loadLeaderboard(period);
            });
        });

        // Обработчик фильтра рейтинга
        document.getElementById('rating-filter')?.addEventListener('change', (e) => {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'today';
            this.loadLeaderboard(activeTab, e.target.value);
        });

        // Обработчик кнопки обновления
        document.getElementById('refresh-leaderboard')?.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'today';
            const filter = document.getElementById('rating-filter')?.value || 'all';
            this.loadLeaderboard(activeTab, filter);
        });
    }

    async loadLeaderboard(period = 'today', ratingFilter = 'all') {
        const leaderboardList = document.getElementById('leaderboard-list');
        
        // Показываем загрузку
        leaderboardList.innerHTML = `
            <div class="loading-leaderboard">
                <div class="loading-spinner"></div>
                <p>Загрузка рейтинга...</p>
            </div>
        `;

        try {
            // Запрашиваем данные с сервера
            const response = await fetch(`/api/leaderboard?period=${period}&filter=${ratingFilter}`);
            const data = await response.json();

            if (data.success) {
                this.displayLeaderboard(data.leaderboard, data.stats, data.myPosition);
            } else {
                this.displayEmptyLeaderboard('Не удалось загрузить рейтинг');
            }
        } catch (error) {
            console.error('Ошибка загрузки рейтинга:', error);
            this.displayMockLeaderboard(period);
        }
    }

    displayLeaderboard(players, stats, myPosition) {
        const leaderboardList = document.getElementById('leaderboard-list');
        
        if (!players || players.length === 0) {
            this.displayEmptyLeaderboard('Нет данных для отображения');
            return;
        }

        // Обновляем статистику
        this.updateLeaderboardStats(stats);
        
        // Создаем список игроков
        leaderboardList.innerHTML = players.map((player, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `top-${rank}` : '';
            const ratingClass = this.getRatingClass(player.rating);
            const title = this.getRatingTitle(player.rating);

            return `
                <div class="leaderboard-item">
                    <div class="player-rank ${rankClass}">${rank}</div>
                    <div class="player-info">
                        <img src="${player.avatar || '/icons/gameIcons/PNG/Black/1x/button1.png'}" alt="Avatar" class="player-avatar-small">
                        <div class="player-details">
                            <div class="player-name">${this.escapeHtml(player.name)}</div>
                            <div class="player-title">${title}</div>
                        </div>
                    </div>
                    <div class="player-rating ${ratingClass}">${player.rating}</div>
                    <div class="player-games">${player.games}</div>
                    <div class="player-winrate">${player.winRate}%</div>
                </div>
            `;
        }).join('');

        // Показываем позицию текущего игрока
        this.updateMyPosition(myPosition);
    }

    displayMockLeaderboard(period) {
        // Временные данные для демонстрации
        const mockPlayers = [
            { name: 'ЧемпионKRESTIKI', rating: 2150, games: 247, winRate: 87, avatar: '/icons/gameIcons/PNG/Black/1x/trophy.png' },
            { name: 'ПрофиМастер', rating: 1980, games: 189, winRate: 82, avatar: '/icons/gameIcons/PNG/Black/1x/star.png' },
            { name: 'ИгрокTop', rating: 1850, games: 156, winRate: 78, avatar: '/icons/gameIcons/PNG/Black/1x/medal1.png' },
            { name: 'КрестикиЛюбитель', rating: 1650, games: 134, winRate: 71, avatar: '/icons/gameIcons/PNG/Black/1x/buttonX.png' },
            { name: 'НоликиПро', rating: 1420, games: 98, winRate: 65, avatar: '/icons/gameIcons/PNG/Black/1x/buttonO.png' },
            { name: 'НовичокПобедитель', rating: 890, games: 67, winRate: 58, avatar: '/icons/gameIcons/PNG/Black/1x/gamepad.png' },
            { name: 'СтартовыйИгрок', rating: 650, games: 45, winRate: 52, avatar: '/icons/gameIcons/PNG/Black/1x/joystick.png' },
            { name: 'БегинерХоккей', rating: 420, games: 23, winRate: 43, avatar: '/icons/gameIcons/PNG/Black/1x/button1.png' }
        ];

        const mockStats = {
            totalPlayers: 1247,
            gamesToday: 89,
            topRating: 2150
        };

        const myPosition = {
            rank: 42,
            rating: 1100
        };

        this.displayLeaderboard(mockPlayers, mockStats, myPosition);
    }

    displayEmptyLeaderboard(message) {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = `
            <div class="loading-leaderboard">
                <i class="fas fa-trophy" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                <p>${message}</p>
                <button class="btn btn-secondary" onclick="window.GlassXO.ui.loadLeaderboard('today')">
                    <i class="fas fa-sync-alt"></i>
                    Попробовать снова
                </button>
            </div>
        `;
    }

    updateLeaderboardStats(stats) {
        if (!stats) {
            stats = { totalPlayers: 0, gamesToday: 0, topRating: 0 };
        }

        document.getElementById('total-players').textContent = stats.totalPlayers || 0;
        document.getElementById('games-today').textContent = stats.gamesToday || 0;
        document.getElementById('top-rating').textContent = stats.topRating || 0;
    }

    updateMyPosition(position) {
        const myPositionEl = document.getElementById('my-position');
        
        if (position && position.rank) {
            document.getElementById('my-rank').textContent = position.rank;
            document.getElementById('my-rating').textContent = position.rating || 0;
            myPositionEl.style.display = 'flex';
        } else {
            myPositionEl.style.display = 'none';
        }
    }

    getRatingClass(rating) {
        if (rating >= 2000) return 'rating-legend';
        if (rating >= 1500) return 'rating-master';
        if (rating >= 1000) return 'rating-expert';
        if (rating >= 500) return 'rating-amateur';
        return 'rating-beginner';
    }

    getRatingTitle(rating) {
        if (rating >= 2000) return 'Легенда KRESTIKI';
        if (rating >= 1500) return 'Мастер';
        if (rating >= 1000) return 'Эксперт';
        if (rating >= 500) return 'Любитель';
        return 'Новичок';
    }


} 