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
        document.getElementById('guest-login-btn')?.addEventListener('click', () => this.handleGuestLogin());
        
        // Навигация
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openModal('settings-modal'));
        document.getElementById('leaderboard-btn')?.addEventListener('click', () => this.openModal('leaderboard-modal'));
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

    setupSettingsHandlers() {
        // Звук
        document.getElementById('sound-enabled')?.addEventListener('change', (e) => {
            window.GlassXO.settings.soundEnabled = e.target.checked;
            window.GlassXO.saveGameData();
        });
        
        document.getElementById('music-enabled')?.addEventListener('change', (e) => {
            window.GlassXO.settings.musicEnabled = e.target.checked;
            window.GlassXO.saveGameData();
        });
        
        // Внешний вид
        document.getElementById('dark-theme')?.addEventListener('change', (e) => {
            window.GlassXO.settings.darkTheme = e.target.checked;
            this.toggleTheme(e.target.checked);
            window.GlassXO.saveGameData();
        });
        
        document.getElementById('animations-enabled')?.addEventListener('change', (e) => {
            window.GlassXO.settings.animationsEnabled = e.target.checked;
            document.body.classList.toggle('no-animations', !e.target.checked);
            window.GlassXO.saveGameData();
        });
        
        // Игра
        document.getElementById('auto-save')?.addEventListener('change', (e) => {
            window.GlassXO.settings.autoSave = e.target.checked;
            window.GlassXO.saveGameData();
        });
        
        document.getElementById('show-hints')?.addEventListener('change', (e) => {
            window.GlassXO.settings.showHints = e.target.checked;
            window.GlassXO.saveGameData();
        });
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
        
        document.getElementById('players-online').textContent = stats.playersOnline;
        document.getElementById('active-games').textContent = stats.activeGames;
        
        // Обновляем статистику в модальном окне ожидания
        const onlineCount = document.getElementById('online-count');
        if (onlineCount) {
            onlineCount.textContent = stats.playersOnline;
        }
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
        document.querySelectorAll('.cell').forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
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
        
        cell.textContent = player;
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
    handleGuestLogin() {
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
        
        // Фильтруем недопустимые символы
        nickname = nickname.replace(/[<>\"'&]/g, '');
        
        window.GlassXO.player.nickname = nickname;
        window.GlassXO.player.isGuest = true;
        
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
        
        this.showNotification(`👋 Добро пожаловать, ${nickname}!`, 'success');
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
} 