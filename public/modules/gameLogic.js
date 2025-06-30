// ===== GAME LOGIC MODULE =====

export class GameLogic {
    constructor() {
        this.winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтали
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикали
            [0, 4, 8], [2, 4, 6]             // Диагонали
        ];
        
        this.init();
        console.log('🎯 GameLogic инициализирован');
    }

    init() {
        // Инициализация игровой логики
    }

    // ===== ЛОКАЛЬНАЯ ИГРА =====
    startLocalGame() {
        this.resetGameState();
        window.GlassXO.gameState.gameMode = 'local';
        window.GlassXO.gameState.gameActive = true;
        window.GlassXO.gameState.isMyTurn = true;
        
        window.GlassXO.ui.updateGameDisplay();
        window.GlassXO.ui.showScreen('game-screen');
        window.GlassXO.ui.showNotification('🎮 Локальная игра начата!', 'success');
    }

    // ===== ИГРА С ИИ =====
    startAIGame() {
        if (!window.GlassXO.gameState.difficulty) {
            window.GlassXO.ui.showNotification('❌ Выберите уровень сложности', 'error');
            return;
        }
        
        this.resetGameState();
        window.GlassXO.gameState.gameMode = 'ai';
        window.GlassXO.gameState.gameActive = true;
        window.GlassXO.gameState.isMyTurn = true;
        window.GlassXO.gameState.mySymbol = 'X';
        window.GlassXO.gameState.opponent = `ИИ (${this.getDifficultyName(window.GlassXO.gameState.difficulty)})`;
        
        window.GlassXO.ui.updateGameDisplay();
        window.GlassXO.ui.showScreen('game-screen');
        window.GlassXO.ui.showNotification(`🤖 Игра против ИИ (${this.getDifficultyName(window.GlassXO.gameState.difficulty)}) начата!`, 'success');
    }

    // ===== ОБРАБОТКА ХОДОВ =====
    handleCellClick(index) {
        const gameState = window.GlassXO.gameState;
        
        // Проверяем, можем ли мы сделать ход
        if (!gameState.gameActive || gameState.board[index] !== null) {
            return;
        }
        
        // В локальной игре можем ходить всегда
        // В онлайн игре только в свою очередь
        if (gameState.gameMode === 'online' && !gameState.isMyTurn) {
            window.GlassXO.ui.showNotification('❌ Сейчас не ваш ход!', 'warning');
            return;
        }
        
        this.makeMove(index, gameState.currentPlayer);
    }

    makeMove(index, player) {
        const gameState = window.GlassXO.gameState;
        
        // Обновляем локальное состояние
        gameState.board[index] = player;
        gameState.moveCount++;
        
        // Обновляем отображение
        window.GlassXO.ui.updateCellDisplay(index, player);
        
        // Проверяем результат игры
        const result = this.checkGameResult();
        
        if (result) {
            this.endGame(result);
            return;
        }
        
        // Переключаем игрока
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
        
        // Обновляем индикатор хода
        window.GlassXO.ui.updateTurnIndicator();
        
        // Обрабатываем ход в зависимости от режима игры
        if (gameState.gameMode === 'local') {
            // В локальной игре просто продолжаем
            gameState.isMyTurn = true;
        } else if (gameState.gameMode === 'ai') {
            // В игре с ИИ делаем ход бота
            gameState.isMyTurn = false;
            setTimeout(() => this.makeAIMove(), 500);
        } else if (gameState.gameMode === 'online') {
            // В онлайн игре отправляем ход на сервер
            gameState.isMyTurn = false;
            if (window.GlassXO.socket && gameState.gameId) {
                window.GlassXO.socket.sendMove(index, gameState.gameId);
                console.log(`🎯 Отправляем ход онлайн: позиция ${index}, игра ${gameState.gameId}`);
            } else {
                console.error('❌ Нет подключения к серверу или ID игры');
                window.GlassXO.ui.showNotification('❌ Ошибка отправки хода', 'error');
                // Откатываем ход
                gameState.board[index] = null;
                gameState.moveCount--;
                gameState.isMyTurn = true;
                window.GlassXO.ui.updateCellDisplay(index, null);
            }
        }
        
        window.GlassXO.ui.playSound('move');
    }

    // ===== ИИ ЛОГИКА =====
    makeAIMove() {
        const gameState = window.GlassXO.gameState;
        
        if (!gameState.gameActive || gameState.currentPlayer !== 'O') {
            return;
        }
        
        let moveIndex;
        
        switch (gameState.difficulty) {
            case 'easy':
                moveIndex = this.getRandomMove();
                break;
            case 'medium':
                moveIndex = this.getMediumAIMove();
                break;
            case 'hard':
                moveIndex = this.getHardAIMove();
                break;
            case 'impossible':
                moveIndex = this.getImpossibleAIMove();
                break;
            default:
                moveIndex = this.getMediumAIMove();
        }
        
        if (moveIndex !== -1) {
            this.makeMove(moveIndex, 'O');
            gameState.isMyTurn = true;
        }
    }

    getRandomMove() {
        const availableMoves = window.GlassXO.gameState.board
            .map((cell, index) => cell === null ? index : null)
            .filter(index => index !== null);
        
        if (availableMoves.length === 0) return -1;
        
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    getMediumAIMove() {
        // 70% времени играет оптимально, 30% случайно
        if (Math.random() < 0.7) {
            return this.getImpossibleAIMove();
        } else {
            return this.getRandomMove();
        }
    }

    getHardAIMove() {
        // 90% времени играет оптимально, 10% случайно
        if (Math.random() < 0.9) {
            return this.getImpossibleAIMove();
        } else {
            return this.getRandomMove();
        }
    }

    getImpossibleAIMove() {
        // Используем минимакс алгоритм для идеальной игры
        let bestScore = -Infinity;
        let bestMove = -1;
        const board = [...window.GlassXO.gameState.board];
        
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'O';
                let score = this.minimax(board, 0, false);
                board[i] = null;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }
        
        return bestMove;
    }

    minimax(board, depth, isMaximizing) {
        const result = this.checkGameResultForBoard(board);
        
        if (result && result.winner === 'O') return 1;
        if (result && result.winner === 'X') return -1;
        if (result && result.winner === 'draw') return 0;
        
        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'X';
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    // ===== ПРОВЕРКА РЕЗУЛЬТАТА =====
    checkGameResult() {
        return this.checkGameResultForBoard(window.GlassXO.gameState.board);
    }

    checkGameResultForBoard(board) {
        // Проверяем все выигрышные комбинации
        for (let pattern of this.winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], pattern };
            }
        }
        
        // Проверяем ничью
        if (board.every(cell => cell !== null)) {
            return { winner: 'draw', pattern: null };
        }
        
        return null;
    }

    // ===== ОКОНЧАНИЕ ИГРЫ =====
    endGame(result) {
        const gameState = window.GlassXO.gameState;
        gameState.gameActive = false;
        
        let title, message, isWin = false;
        
        // Получаем имена игроков
        const playerName = window.GlassXO.player?.nickname || window.GlassXO.player?.name || 'Игрок';
        
        // Правильно извлекаем имя соперника
        let opponentName = 'Соперник';
        if (gameState.opponent) {
            if (typeof gameState.opponent === 'string') {
                opponentName = gameState.opponent;
            } else if (typeof gameState.opponent === 'object') {
                opponentName = gameState.opponent.name || gameState.opponent.nickname || gameState.opponent.username || 'Соперник';
            }
        }
        
        if (result.winner === 'draw') {
            title = '🤝 Ничья!';
            if (gameState.gameMode === 'online') {
                message = `Ничья между ${playerName} и ${opponentName}! Отличная игра!`;
            } else if (gameState.gameMode === 'ai') {
                message = `Ничья между ${playerName} и ИИ! Вы играете как компьютер!`;
            } else {
                message = 'Ничья! Отличная игра! Попробуйте ещё раз.';
            }
        } else if (gameState.gameMode === 'local') {
            title = `🎉 Победил игрок ${result.winner}!`;
            message = `Игрок ${result.winner} выиграл эту партию!`;
            isWin = true;
        } else if (gameState.gameMode === 'ai') {
            if (result.winner === 'X') {
                title = `🎉 ${playerName} победил!`;
                message = `${playerName} обыграл ИИ уровня "${this.getDifficultyName(gameState.difficulty)}"! Поздравляем!`;
                isWin = true;
            } else {
                title = `🤖 ИИ победил!`;
                message = `ИИ уровня "${this.getDifficultyName(gameState.difficulty)}" обыграл ${playerName}. Попробуйте ещё раз!`;
            }
        } else if (gameState.gameMode === 'online') {
            if (result.winner === gameState.mySymbol) {
                title = `🎉 ${playerName} победил!`;
                message = `${playerName} обыграл ${opponentName}! Поздравляем с победой!`;
                isWin = true;
            } else {
                title = `😞 ${opponentName} победил!`;
                message = `${opponentName} обыграл ${playerName}. Удачи в следующий раз!`;
            }
        }
        
        // Подсвечиваем выигрышную комбинацию
        if (result.pattern) {
            result.pattern.forEach(index => {
                document.querySelector(`[data-index="${index}"]`)?.classList.add('winning');
            });
        }
        
        // Обновляем статистику
        this.updatePlayerStats(isWin, result.winner === 'draw');
        
        // Показываем результат
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-message').textContent = message;
        
        // Статистика игры
        const gameDuration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
        document.getElementById('game-duration').textContent = window.GlassXO.utils.formatTime(gameDuration);
        document.getElementById('moves-made').textContent = gameState.moveCount;
        document.getElementById('result-stats').style.display = 'block';
        
        window.GlassXO.ui.openModal('game-result-modal');
        
        window.GlassXO.ui.playSound(isWin ? 'win' : (result.winner === 'draw' ? 'draw' : 'lose'));
    }

    // ===== УПРАВЛЕНИЕ ИГРОЙ =====
    restartGame() {
        if (window.GlassXO.gameState.gameMode === 'local') {
            this.startLocalGame();
        } else if (window.GlassXO.gameState.gameMode === 'ai') {
            this.startAIGame();
        } else if (window.GlassXO.gameState.gameMode === 'online' && window.GlassXO.socket) {
            if (window.GlassXO.socket.isConnected) {
                console.log('🔄 Запрашиваем рестарт онлайн игры');
                window.GlassXO.socket.requestRestart();
                window.GlassXO.ui.showNotification('🔄 Запрос на рестарт отправлен сопернику...', 'info');
            } else {
                window.GlassXO.ui.showNotification('❌ Нет подключения к серверу', 'error');
                window.GlassXO.ui.showScreen('online-lobby-screen');
            }
        }
    }

    surrenderGame() {
        if (confirm('Вы уверены, что хотите сдаться?')) {
            const gameState = window.GlassXO.gameState;
            
            if (gameState.gameMode === 'online' && window.GlassXO.socket) {
                window.GlassXO.socket.surrender();
            } else {
                const opponent = gameState.currentPlayer === 'X' ? 'O' : 'X';
                this.endGame({ winner: opponent, pattern: null });
            }
        }
    }

    playAgain() {
        const gameState = window.GlassXO.gameState;
        
        if (gameState.gameMode === 'local') {
            this.startLocalGame();
        } else if (gameState.gameMode === 'ai') {
            window.GlassXO.ui.showScreen('ai-difficulty-screen');
        } else if (gameState.gameMode === 'online') {
            // Для онлайн игры предлагаем варианты
            if (gameState.roomId && window.GlassXO.socket && window.GlassXO.socket.isConnected) {
                // Если есть активная комната, запросим рестарт в ней
                if (confirm('🔄 Начать новую игру в этой же комнате?')) {
                    window.GlassXO.socket.requestRestart();
                    window.GlassXO.ui.showNotification('🔄 Запрос на новую игру отправлен...', 'info');
                } else {
                    // Если отказался от рестарта, идем в лобби
                    window.GlassXO.ui.showScreen('online-lobby-screen');
                }
            } else {
                // Если нет активной комнаты или соединения, идем в лобби
                window.GlassXO.ui.showScreen('online-lobby-screen');
            }
        }
    }

    // ===== УТИЛИТЫ =====
    resetGameState() {
        window.GlassXO.gameState.board = Array(9).fill(null);
        window.GlassXO.gameState.currentPlayer = 'X';
        window.GlassXO.gameState.gameActive = false;
        window.GlassXO.gameState.isMyTurn = false;
        window.GlassXO.gameState.mySymbol = null;
        window.GlassXO.gameState.opponent = null;
        window.GlassXO.gameState.gameStartTime = Date.now();
        window.GlassXO.gameState.moveCount = 0;
        window.GlassXO.gameState.gameStatus = 'waiting';
        window.GlassXO.gameState.winner = null;
        
        // Очищаем визуальное отображение всех клеток
        document.querySelectorAll('.cell').forEach((cell, index) => {
            cell.textContent = '';
            cell.className = 'cell'; // Убираем все дополнительные классы включая winning
            cell.style.transform = '';
            cell.style.transition = '';
        });
        
        // Закрываем модальное окно результата если открыто
        if (window.GlassXO.ui && window.GlassXO.ui.closeModal) {
            window.GlassXO.ui.closeModal('game-result-modal');
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

    updatePlayerStats(isWin, isDraw) {
        const player = window.GlassXO.player;
        
        player.gamesPlayed++;
        
        if (isWin) {
            player.winStreak++;
        } else if (!isDraw) {
            player.winStreak = 0;
        }
        
        // Пересчитываем процент побед
        const wins = Math.round((player.winRate / 100) * (player.gamesPlayed - 1));
        const newWins = wins + (isWin ? 1 : 0);
        player.winRate = Math.round((newWins / player.gamesPlayed) * 100);
        
        window.GlassXO.ui.updatePlayerProfile();
        window.GlassXO.saveGameData();
    }

    // ===== НОВЫЕ ОБРАБОТЧИКИ ОНЛАЙН ИГРЫ =====
    updateCellDisplay(position, symbol) {
        // Обновляем только отображение клетки (без изменения логики)
        if (window.GlassXO.ui && window.GlassXO.ui.updateCellDisplay) {
            window.GlassXO.ui.updateCellDisplay(position, symbol);
            window.GlassXO.ui.playSound('move');
        }
    }

    handleGameEnd(data) {
        console.log('🎮 Обработка завершения онлайн игры:', data);
        
        if (!window.GlassXO.gameState.gameActive) {
            console.log('⚠️ Игра уже завершена, пропускаем обработку');
            return;
        }
        
        window.GlassXO.gameState.gameActive = false;
        window.GlassXO.gameState.gameStatus = 'finished';
        
        // Определяем результат для локального отображения
        let localResult = null;
        if (data.winner) {
            if (data.winner.winner) {
                localResult = {
                    winner: data.winner.winner,
                    pattern: data.winner.pattern || null
                };
            } else if (data.winner.winner === null) {
                localResult = {
                    winner: 'draw',
                    pattern: null
                };
            }
        } else if (data.result) {
            // Альтернативная структура данных
            localResult = {
                winner: data.result,
                pattern: data.pattern || null
            };
        }
        
        if (localResult) {
            console.log('🏆 Завершаем игру с результатом:', localResult);
            this.endGame(localResult);
        } else {
            console.log('❌ Не удалось определить результат игры:', data);
            // Показываем общее сообщение о завершении
            window.GlassXO.ui.showNotification('🎮 Игра завершена', 'info');
            window.GlassXO.ui.openModal('game-result-modal');
            document.getElementById('result-title').textContent = '🎮 Игра завершена';
            document.getElementById('result-message').textContent = 'Связь с сервером потеряна или произошла ошибка.';
        }
    }
} 