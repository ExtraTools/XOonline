// ===== SOCKET MANAGER MODULE =====

export class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.searchTimer = null;
        
        this.init();
        console.log('🔌 SocketManager инициализирован');
    }

    init() {
        this.initializeConnection();
    }

    // ===== ПОДКЛЮЧЕНИЕ =====
    initializeConnection() {
        try {
            this.socket = io();
            this.setupEventListeners();
            console.log('🔌 Подключение к серверу...');
        } catch (error) {
            console.error('❌ Ошибка инициализации Socket.IO:', error);
            this.handleConnectionError();
        }
    }

    setupEventListeners() {
        if (!this.socket) return;

        // Подключение/отключение
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('disconnect', () => this.handleDisconnect());
        this.socket.on('connect_error', (error) => this.handleConnectionError(error));
        
        // Подключение игрока
        this.socket.on('player-connected', (data) => this.handlePlayerConnected(data));

        // Игровые события
        this.socket.on('gameStart', (data) => this.handleGameStart(data));
        this.socket.on('gameMove', (data) => this.handleGameMove(data));
        this.socket.on('gameEnd', (data) => this.handleGameEnd(data));
        this.socket.on('opponentLeft', () => this.handleOpponentLeft());
        this.socket.on('matchFound', (data) => this.handleMatchFound(data));
        this.socket.on('searching', (data) => this.handleSearching(data));

        // Комнаты
        this.socket.on('roomCreated', (data) => this.handleRoomCreated(data));
        this.socket.on('roomJoined', (data) => this.handleRoomJoined(data));
        this.socket.on('roomError', (data) => this.handleRoomError(data));

        // Онлайн статистика
        this.socket.on('onlineStats', (stats) => this.handleOnlineStats(stats));

        // Список пользователей для админа
        this.socket.on('usersList', (users) => this.handleUsersList(users));

        // Админ действия
        this.socket.on('admin_action_received', (data) => this.handleAdminAction(data));
    }

    // ===== ОБРАБОТЧИКИ ПОДКЛЮЧЕНИЯ =====
    handleConnect() {
        console.log('✅ Подключено к серверу');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Отправляем данные игрока для подключения
        const playerData = {
            user: {
                id: window.GlassXO.player.id || null,
                name: window.GlassXO.player.nickname
            },
            guestName: window.GlassXO.player.isGuest ? window.GlassXO.player.nickname : null
        };
        
        this.socket.emit('player-connect', playerData);
        
        window.GlassXO.ui.showNotification('🔌 Подключено к серверу', 'success');
    }

    handlePlayerConnected(data) {
        if (data.success && data.player) {
            // Обновляем данные игрока с сервера
            const player = data.player;
            
            // Сохраняем все новые данные
            window.GlassXO.player = {
                ...window.GlassXO.player,
                id: player.id,
                user_id: player.user_id,
                username: player.username,
                name: player.name,
                nickname: player.name,
                avatar: player.avatar,
                level: player.level || 1,
                stats: player.stats || { gamesPlayed: 0, gamesWon: 0, winRate: 0 },
                isGuest: player.isGuest,
                registration: player.registration,
                ip: player.ip,
                isAdmin: player.isAdmin || false
            };
            
            // Проверяем админский статус и обновляем админ панель
            if (window.GlassXO.player.isAdmin && window.GlassXO.adminPanel) {
                window.GlassXO.adminPanel.isAdmin = true;
                const adminBtn = document.getElementById('admin-btn');
                if (adminBtn) {
                    adminBtn.style.display = 'block';
                }
                console.log('🔥 Админские права предоставлены');
            }
            
            // Обновляем интерфейс
            window.GlassXO.ui.updatePlayerProfile();
            
            console.log('✅ Данные игрока обновлены:', window.GlassXO.player);
        }
    }

    handleDisconnect() {
        console.log('❌ Отключено от сервера');
        this.isConnected = false;
        
        window.GlassXO.ui.showNotification('❌ Подключение к серверу потеряно', 'error');
        
        // Пытаемся переподключиться
        this.attemptReconnect();
    }

    handleConnectionError(error) {
        console.error('❌ Ошибка подключения:', error);
        this.isConnected = false;
        
        window.GlassXO.ui.showNotification('❌ Ошибка подключения к серверу', 'error');
        
        // Переключаемся в оффлайн режим
        this.attemptReconnect();
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            window.GlassXO.ui.showNotification('❌ Не удалось подключиться к серверу. Игра в оффлайн режиме.', 'warning');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        
        setTimeout(() => {
            if (!this.isConnected) {
                console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
                this.socket.connect();
            }
        }, delay);
    }

    // ===== ПОЛЬЗОВАТЕЛЬ =====
    setNickname(nickname) {
        if (this.socket && this.isConnected) {
            this.socket.emit('setNickname', nickname);
        }
    }

    // ===== БЫСТРЫЙ ПОИСК =====
    findQuickMatch() {
        if (!this.isConnected) {
            window.GlassXO.ui.showNotification('❌ Нет подключения к серверу', 'error');
            return;
        }
        
        // Открываем модальное окно ожидания
        window.GlassXO.ui.openModal('waiting-modal');
        document.getElementById('waiting-title').textContent = '🔍 Поиск игры';
        document.getElementById('waiting-message').textContent = 'Поиск соперника...';
        
        this.socket.emit('findGame');
        this.startMatchmakingTimer();
        
        window.GlassXO.ui.showNotification('🔍 Ищем соперника...', 'info');
    }

    cancelMatchmaking() {
        if (this.socket && this.isConnected) {
            this.socket.emit('cancel-search');
        }
        
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        
        window.GlassXO.ui.closeModal('waiting-modal');
        window.GlassXO.ui.showNotification('❌ Поиск отменён', 'info');
    }

    startMatchmakingTimer() {
        const searchTimeDisplay = document.getElementById('search-time');
        if (!searchTimeDisplay) return;
        
        let searchStartTime = Date.now();
        
        this.searchTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - searchStartTime) / 1000);
            searchTimeDisplay.textContent = window.GlassXO.utils.formatTime(elapsed);
        }, 1000);
    }

    // ===== КОМНАТЫ =====
    createPrivateRoom() {
        const roomName = document.getElementById('room-name')?.value.trim();
        const roomPassword = document.getElementById('room-password')?.value.trim();
        
        if (!roomName) {
            window.GlassXO.ui.showNotification('❌ Введите название комнаты', 'error');
            return;
        }
        
        if (!this.isConnected) {
            window.GlassXO.ui.showNotification('❌ Нет подключения к серверу', 'error');
            return;
        }
        
        this.socket.emit('createRoom', {
            name: roomName,
            password: roomPassword || null,
            maxPlayers: 2
        });
        
        window.GlassXO.ui.showNotification('🚪 Создаём комнату...', 'info');
    }

    joinPrivateRoom() {
        const roomCode = document.getElementById('room-code')?.value.trim();
        
        if (!roomCode) {
            window.GlassXO.ui.showNotification('❌ Введите код комнаты', 'error');
            return;
        }
        
        if (!this.isConnected) {
            window.GlassXO.ui.showNotification('❌ Нет подключения к серверу', 'error');
            return;
        }
        
        this.socket.emit('joinRoom', { code: roomCode });
        window.GlassXO.ui.showNotification('🔗 Подключаемся к комнате...', 'info');
    }

    // ===== ИГРОВЫЕ ДЕЙСТВИЯ =====
    sendMove(index, player) {
        if (this.socket && this.isConnected) {
            this.socket.emit('makeMove', { index, player });
        }
    }

    requestRestart() {
        if (this.socket && this.isConnected) {
            this.socket.emit('requestRestart');
        }
    }

    surrender() {
        if (this.socket && this.isConnected) {
            this.socket.emit('surrender');
        }
    }

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
    handleGameStart(data) {
        window.GlassXO.gameState.gameMode = 'online';
        window.GlassXO.gameState.mySymbol = data.symbol;
        window.GlassXO.gameState.opponent = data.opponent;
        window.GlassXO.gameState.isMyTurn = data.symbol === 'X';
        window.GlassXO.gameState.gameActive = true;
        window.GlassXO.gameState.board = Array(9).fill(null);
        window.GlassXO.gameState.currentPlayer = 'X';
        window.GlassXO.gameState.gameStartTime = Date.now();
        window.GlassXO.gameState.moveCount = 0;
        window.GlassXO.gameState.roomCode = data.roomCode;
        
        // Закрываем модальное окно ожидания
        window.GlassXO.ui.closeModal('waiting-modal');
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        
        window.GlassXO.ui.updateGameDisplay();
        window.GlassXO.ui.showScreen('game-screen');
        
        window.GlassXO.ui.showNotification(`🎮 Игра начата! Вы играете за ${data.symbol}`, 'success');
    }

    handleGameMove(data) {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.handleOnlineMove(data);
        }
    }

    handleGameEnd(data) {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.handleOnlineGameEnd(data);
        }
    }

    handleOpponentLeft() {
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.handleOpponentLeft();
        }
    }

    handleSearching(data) {
        // Обновляем информацию в модальном окне ожидания
        document.getElementById('queue-position').textContent = data.position || '?';
        document.getElementById('estimated-time').textContent = 
            data.estimatedWait ? `${Math.round(data.estimatedWait / 60)}м` : '?';
        
        window.GlassXO.ui.showNotification(`🔍 Позиция в очереди: ${data.position}`, 'info');
    }

    handleMatchFound(data) {
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        
        window.GlassXO.ui.showNotification(`✅ Соперник найден: ${data.opponent}`, 'success');
        
        // Игра начнётся автоматически через handleGameStart
    }

    handleRoomCreated(data) {
        window.GlassXO.gameState.roomCode = data.code;
        window.GlassXO.ui.showNotification(`🚪 Комната создана! Код: ${data.code}`, 'success');
        
        // Показываем код комнаты для приглашения друзей
        const shareText = `Комната создана!\n\nКод комнаты: ${data.code}\n\nПоделитесь этим кодом с другом для совместной игры!`;
        
        // Пытаемся скопировать в буфер обмена
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data.code).then(() => {
                window.GlassXO.ui.showNotification('📋 Код комнаты скопирован в буфер обмена!', 'info');
            });
        }
        
        // Открываем модальное окно ожидания
        window.GlassXO.ui.openModal('waiting-modal');
        document.getElementById('waiting-message').textContent = 'Ожидание второго игрока...';
    }

    handleRoomJoined(data) {
        window.GlassXO.gameState.roomCode = data.code;
        window.GlassXO.ui.showNotification(`✅ Вы присоединились к комнате "${data.name}"`, 'success');
        
        // Ожидаем начала игры
        window.GlassXO.ui.openModal('waiting-modal');
        document.getElementById('waiting-message').textContent = 'Ожидание начала игры...';
    }

    handleRoomError(data) {
        window.GlassXO.ui.showNotification(`❌ Ошибка комнаты: ${data.message}`, 'error');
    }

    handleOnlineStats(stats) {
        window.GlassXO.onlineStats = stats;
        window.GlassXO.ui.updateOnlineStats();
        
        // Обновляем статистику в админ панели
        if (window.GlassXO.adminPanel && window.GlassXO.adminPanel.isVisible) {
            window.GlassXO.adminPanel.updateStats(stats);
        }
    }

    handleUsersList(users) {
        if (window.GlassXO.adminPanel && window.GlassXO.adminPanel.isVisible) {
            window.GlassXO.adminPanel.updateUsersList(users);
        }
    }

    handleAdminAction(data) {
        console.log('🔥 Получено админ действие:', data);
        
        // Передаём обработку в AdminPanel
        if (window.GlassXO.adminPanel) {
            window.GlassXO.adminPanel.handleIncomingAction(data);
        }
    }

    // ===== ПРОВЕРКА СОСТОЯНИЯ =====
    isOnline() {
        return this.isConnected && this.socket && this.socket.connected;
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
        };
    }

    // ===== ОЧИСТКА =====
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }
}

// Глобальная функция для отмены поиска соперника
window.cancelMatchmaking = () => {
    if (window.GlassXO.socket) {
        window.GlassXO.socket.cancelMatchmaking();
    }
}; 