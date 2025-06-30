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

        // 🎮 НОВЫЕ ИГРОВЫЕ СОБЫТИЯ
        this.socket.on('gameStart', (data) => this.handleGameStart(data));
        this.socket.on('game-started', (data) => this.handleGameStart(data)); // Альтернативное название
        this.socket.on('move-made', (data) => this.handleMoveMade(data));
        this.socket.on('move-error', (data) => this.handleMoveError(data));
        this.socket.on('game-finished', (data) => this.handleGameFinished(data));
        this.socket.on('opponent-disconnected', (data) => this.handleOpponentDisconnected(data));
        this.socket.on('searching', (data) => this.handleSearching(data));
        this.socket.on('search-cancelled', (data) => this.handleSearchCancelled(data));

        // 🚪 НОВЫЕ СОБЫТИЯ КОМНАТ
        this.socket.on('roomCreated', (data) => this.handleRoomCreated(data));
        this.socket.on('room-created', (data) => this.handleRoomCreated(data)); // Альтернативное название
        this.socket.on('roomJoined', (data) => this.handleRoomJoined(data));
        this.socket.on('room-joined', (data) => this.handleRoomJoined(data)); // Альтернативное название
        this.socket.on('roomUpdated', (data) => this.handleRoomUpdated(data));
        this.socket.on('room-updated', (data) => this.handleRoomUpdated(data)); // Альтернативное название
        this.socket.on('roomError', (data) => this.handleRoomError(data));
        this.socket.on('room-error', (data) => this.handleRoomError(data)); // Альтернативное название

        // 📊 СТАТИСТИКА
        this.socket.on('stats-update', (stats) => this.handleOnlineStats(stats));

        // Онлайн статистика
        this.socket.on('onlineStats', (stats) => this.handleOnlineStats(stats));

        // Список пользователей для админа
        this.socket.on('usersList', (users) => this.handleUsersList(users));

        // Админ действия
        this.socket.on('admin_action_received', (data) => this.handleAdminAction(data));

        // 🏠 СПИСОК ПУБЛИЧНЫХ КОМНАТ
        this.socket.on('publicRoomsList', (rooms) => this.handlePublicRooms(rooms));
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
    sendMove(position, gameId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('make-move', { 
                position: position,
                gameId: gameId || window.GlassXO.gameState.gameId
            });
            console.log(`🎯 Отправляем ход: позиция ${position}, игра ${gameId}`);
        } else {
            console.log('❌ Не подключен к серверу, ход не отправлен');
            window.GlassXO.ui.showNotification('❌ Нет связи с сервером', 'error');
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
        console.log('🎮 Начало игры:', data);
        
        // Обновляем состояние игры
        window.GlassXO.gameState.gameMode = 'online';
        window.GlassXO.gameState.gameId = data.gameId;
        window.GlassXO.gameState.roomId = data.roomId;
        window.GlassXO.gameState.mySymbol = data.yourSymbol || data.symbol;
        window.GlassXO.gameState.opponent = data.opponent;
        window.GlassXO.gameState.players = data.players || [];
        window.GlassXO.gameState.isMyTurn = data.yourTurn !== undefined ? data.yourTurn : (data.yourSymbol === 'X');
        window.GlassXO.gameState.gameActive = true;
        window.GlassXO.gameState.board = data.board || Array(9).fill(null);
        window.GlassXO.gameState.currentPlayer = data.currentPlayer || 'X';
        window.GlassXO.gameState.gameStartTime = Date.now();
        window.GlassXO.gameState.moveCount = 0;
        window.GlassXO.gameState.roomCode = data.roomCode || data.code;
        
        // Закрываем модальное окно ожидания
        window.GlassXO.ui.closeModal('waiting-modal');
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        
        // Обновляем интерфейс
        window.GlassXO.ui.updateGameDisplay();
        window.GlassXO.ui.showScreen('game-screen');
        
        const mySymbol = window.GlassXO.gameState.mySymbol;
        const opponentName = data.opponent?.name || 'Соперник';
        const turnMessage = window.GlassXO.gameState.isMyTurn ? 'Ваш ход!' : `Ход ${opponentName}`;
        
        window.GlassXO.ui.showNotification(`🎮 Игра начата! Вы: ${mySymbol} vs ${opponentName}. ${turnMessage}`, 'success');
        
        // Обновляем отображение игроков
        this.updatePlayersDisplay(data.players);
    }

    // 🎯 НОВЫЙ ОБРАБОТЧИК ХОДОВ
    handleMoveMade(data) {
        console.log('🎯 Получен ход:', data);
        
        if (!window.GlassXO.gameLogic) {
            console.error('❌ GameLogic не инициализирован');
            return;
        }

        // Обновляем доску в состоянии игры
        window.GlassXO.gameState.board = data.board || window.GlassXO.gameState.board;
        window.GlassXO.gameState.currentPlayer = data.currentPlayer;
        window.GlassXO.gameState.gameStatus = data.gameStatus;
        window.GlassXO.gameState.moveCount++;
        
        // Определяем чей сейчас ход
        window.GlassXO.gameState.isMyTurn = (data.currentPlayer === window.GlassXO.gameState.mySymbol);
        
        // Обновляем конкретную клетку на доске
        if (data.position !== undefined && data.symbol) {
            // Обновляем состояние в памяти
            window.GlassXO.gameState.board[data.position] = data.symbol;
            
            // Обновляем визуальное отображение
            window.GlassXO.ui.updateCellDisplay(data.position, data.symbol);
            window.GlassXO.ui.playSound('move');
        } else {
            // Обновляем всю доску если нет конкретной позиции
            for (let i = 0; i < 9; i++) {
                window.GlassXO.ui.updateCellDisplay(i, window.GlassXO.gameState.board[i]);
            }
        }
        
        // Обновляем индикатор хода
        window.GlassXO.ui.updateTurnIndicator();
        
        // Показываем уведомление о ходе
        const isMyMove = data.symbol === window.GlassXO.gameState.mySymbol;
        if (!isMyMove) {
            window.GlassXO.ui.showNotification(`${data.playerName || 'Соперник'} сделал ход`, 'info');
        }
        
        // Проверяем завершение игры
        if (data.gameStatus === 'finished' && data.winner) {
            this.handleGameFinished({
                winner: data.winner,
                gameId: data.gameId
            });
        }
    }

    // ❌ ОБРАБОТЧИК ОШИБОК ХОДА
    handleMoveError(data) {
        console.log('❌ Ошибка хода:', data);
        window.GlassXO.ui.showNotification(`❌ ${data.message}`, 'error');
    }

    // 🏆 ОБРАБОТЧИК ЗАВЕРШЕНИЯ ИГРЫ
    handleGameFinished(data) {
        console.log('🏆 Игра завершена:', data);
        
        window.GlassXO.gameState.gameActive = false;
        window.GlassXO.gameState.gameStatus = 'finished';
        window.GlassXO.gameState.winner = data.winner;
        
        // Обновляем данные об игроках из детального ответа
        if (data.playerData) {
            window.GlassXO.gameState.opponentName = data.playerData.opponent?.name || data.opponentName || 'Соперник';
            window.GlassXO.gameState.yourName = data.playerData.you?.name || data.yourName || window.GlassXO.player?.nickname || 'Вы';
        } else {
            // Фолбэк для старого формата
            window.GlassXO.gameState.opponentName = data.opponentName || 'Соперник';
            window.GlassXO.gameState.yourName = data.yourName || window.GlassXO.player?.nickname || 'Вы';
        }
        
        if (window.GlassXO.gameLogic) {
            window.GlassXO.gameLogic.handleGameEnd(data);
        }
        
        // Показываем уведомление с правильными именами
        let message = '';
        if (data.winner.winner) {
            const isWinner = data.winner.winner === window.GlassXO.gameState.mySymbol;
            if (isWinner) {
                message = `🏆 ${window.GlassXO.gameState.yourName} победил!`;
            } else {
                message = `😔 ${window.GlassXO.gameState.opponentName} победил!`;
            }
        } else {
            message = `🤝 Ничья между ${window.GlassXO.gameState.yourName} и ${window.GlassXO.gameState.opponentName}!`;
        }
        
        window.GlassXO.ui.showNotification(message, data.winner.winner === window.GlassXO.gameState.mySymbol ? 'success' : 'info');
    }

    // 💔 ОБРАБОТЧИК ОТКЛЮЧЕНИЯ СОПЕРНИКА
    handleOpponentDisconnected(data) {
        console.log('💔 Соперник отключился:', data);
        
        window.GlassXO.gameState.gameActive = false;
        window.GlassXO.ui.showNotification(`💔 ${data.message}`, 'warning');
        
        // Показываем кнопку возврата в меню
        if (window.GlassXO.ui.showBackToMenuButton) {
            window.GlassXO.ui.showBackToMenuButton();
        }
    }

    // 🔍 ОБРАБОТЧИК ПОИСКА
    handleSearching(data) {
        console.log('🔍 Поиск игры:', data);
        
        // Обновляем информацию в модальном окне ожидания
        const queuePosition = document.getElementById('queue-position');
        const estimatedTime = document.getElementById('estimated-time');
        
        if (queuePosition) {
            queuePosition.textContent = data.playersInQueue || '?';
        }
        if (estimatedTime) {
            estimatedTime.textContent = data.playersInQueue ? `~${data.playersInQueue * 30}с` : '?';
        }
        
        window.GlassXO.ui.showNotification(data.message || 'Поиск соперника...', 'info');
    }

    // ❌ ОБРАБОТЧИК ОТМЕНЫ ПОИСКА
    handleSearchCancelled(data) {
        console.log('❌ Поиск отменен:', data);
        
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        
        window.GlassXO.ui.closeModal('waiting-modal');
        window.GlassXO.ui.showNotification(data.message || 'Поиск отменен', 'info');
    }

    // 🏠 ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ИГРОКОВ
    updatePlayersDisplay(players) {
        if (!players || players.length === 0) return;
        
        console.log('👥 Обновляем отображение игроков:', players);
        
        // Обновляем информацию об игроках в интерфейсе
        const player1Info = document.querySelector('.player1-info');
        const player2Info = document.querySelector('.player2-info');
        
        if (player1Info && players[0]) {
            player1Info.innerHTML = `
                <img src="${players[0].avatar}" alt="Avatar" class="player-avatar">
                <span class="player-name">${players[0].name} (${players[0].symbol})</span>
            `;
        }
        
        if (player2Info && players[1]) {
            player2Info.innerHTML = `
                <img src="${players[1].avatar}" alt="Avatar" class="player-avatar">
                <span class="player-name">${players[1].name} (${players[1].symbol})</span>
            `;
        }
    }

    // 🔄 ОБРАБОТЧИК ОБНОВЛЕНИЯ КОМНАТЫ
    handleRoomUpdated(data) {
        console.log('🔄 Комната обновлена:', data);
        
        if (data.room && data.room.players) {
            this.updatePlayersDisplay(data.room.players);
            
            const playerCount = data.room.players.length;
            const maxPlayers = data.room.maxPlayers || 2;
            
            window.GlassXO.ui.showNotification(
                `👥 Игроков в комнате: ${playerCount}/${maxPlayers}`, 
                'info'
            );
        }
    }

    // 🚪 ОБРАБОТЧИК СОЗДАНИЯ КОМНАТЫ
    handleRoomCreated(data) {
        console.log('🚪 Комната создана:', data);
        
        if (data.success && data.code) {
            window.GlassXO.gameState.roomCode = data.code;
            window.GlassXO.ui.showNotification(`🚪 Комната создана! Код: ${data.code}`, 'success');
            
            // Пытаемся скопировать в буфер обмена
            if (navigator.clipboard) {
                navigator.clipboard.writeText(data.code).then(() => {
                    window.GlassXO.ui.showNotification('📋 Код комнаты скопирован в буфер обмена!', 'info');
                }).catch(() => {
                    console.log('Не удалось скопировать в буфер обмена');
                });
            }
            
            // Показываем код комнаты в модальном окне
            window.GlassXO.ui.openModal('waiting-modal');
            document.getElementById('waiting-title').textContent = '🚪 Комната создана';
            document.getElementById('waiting-message').innerHTML = `
                <div class="room-code-display">
                    <p>Код комнаты:</p>
                    <div class="room-code">${data.code}</div>
                    <p class="room-share-text">Поделитесь этим кодом с другом</p>
                </div>
                <p>Ожидание второго игрока...</p>
            `;
            
            // Обновляем отображение игроков если есть данные
            if (data.room && data.room.players) {
                this.updatePlayersDisplay(data.room.players);
            }
        } else {
            window.GlassXO.ui.showNotification('❌ Ошибка создания комнаты', 'error');
        }
    }

    // 🔗 ОБРАБОТЧИК ПРИСОЕДИНЕНИЯ К КОМНАТЕ
    handleRoomJoined(data) {
        console.log('🔗 Присоединение к комнате:', data);
        
        if (data.success && data.code) {
            window.GlassXO.gameState.roomCode = data.code;
            window.GlassXO.ui.showNotification(`✅ Присоединились к комнате "${data.name || data.code}"`, 'success');
            
            // Показываем ожидание начала игры
            window.GlassXO.ui.openModal('waiting-modal');
            document.getElementById('waiting-title').textContent = '🔗 В комнате';
            document.getElementById('waiting-message').textContent = 'Ожидание начала игры...';
            
            // Обновляем отображение игроков
            if (data.room && data.room.players) {
                this.updatePlayersDisplay(data.room.players);
            }
        } else {
            window.GlassXO.ui.showNotification('❌ Ошибка присоединения к комнате', 'error');
        }
    }

    // ❌ ОБРАБОТЧИК ОШИБОК КОМНАТЫ
    handleRoomError(data) {
        console.log('❌ Ошибка комнаты:', data);
        window.GlassXO.ui.showNotification(`❌ ${data.message}`, 'error');
        
        // Закрываем модальное окно ожидания при ошибке
        window.GlassXO.ui.closeModal('waiting-modal');
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
        
        // Передаём обработку в AdminPanel (если это админ)
        if (window.GlassXO.adminPanel) {
            window.GlassXO.adminPanel.handleIncomingAction(data);
        }
        
        // Передаём обработку в EffectsManager (для всех пользователей)
        if (window.GlassXO.effects) {
            window.GlassXO.effects.handleAdminAction(data);
        }
    }

    // 🏠 ОБРАБОТЧИК СПИСКА ПУБЛИЧНЫХ КОМНАТ
    handlePublicRooms(rooms) {
        console.log('🏠 Получен список публичных комнат:', rooms);
        
        if (window.GlassXO.ui && window.GlassXO.ui.updatePublicRoomsList) {
            window.GlassXO.ui.updatePublicRoomsList(rooms);
        }
    }

    // 🔄 ЗАПРОС СПИСКА ПУБЛИЧНЫХ КОМНАТ
    requestPublicRooms() {
        if (this.socket && this.isConnected) {
            this.socket.emit('getPublicRooms');
        }
    }

    // 🔄 ОБНОВЛЕНИЕ СПИСКА КОМНАТ
    refreshPublicRooms() {
        if (this.socket && this.isConnected) {
            this.socket.emit('refreshRooms');
        }
    }

    // 🚪 БЫСТРОЕ ПРИСОЕДИНЕНИЕ К КОМНАТЕ
    quickJoinRoom(roomCode) {
        if (this.socket && this.isConnected) {
            this.socket.emit('joinRoom', { code: roomCode });
            console.log(`🔗 Присоединяемся к комнате: ${roomCode}`);
        } else {
            window.GlassXO.ui.showNotification('❌ Нет подключения к серверу', 'error');
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