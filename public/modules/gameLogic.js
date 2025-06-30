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
            if (window.GlassXO.socket) {
                window.GlassXO.socket.sendMove(index, player);
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
        
        if (result.winner === 'draw') {
            title = '🤝 Ничья!';
            message = 'Отличная игра! Попробуйте ещё раз.';
        } else if (gameState.gameMode === 'local') {
            title = `🎉 Победил игрок ${result.winner}!`;
            message = `Игрок ${result.winner} выиграл эту партию!`;
            isWin = true;
        } else if (gameState.gameMode === 'ai') {
            if (result.winner === 'X') {
                title = '🎉 Вы победили!';
                message = `Поздравляем! Вы обыграли ИИ уровня "${this.getDifficultyName(gameState.difficulty)}"!`;
                isWin = true;
            } else {
                title = '😞 Вы проиграли!';
                message = `ИИ уровня "${this.getDifficultyName(gameState.difficulty)}" оказался сильнее. Попробуйте ещё раз!`;
            }
        } else if (gameState.gameMode === 'online') {
            if (result.winner === gameState.mySymbol) {
                title = '🎉 Вы победили!';
                message = `Поздравляем! Вы обыграли ${gameState.opponent}!`;
                isWin = true;
            } else {
                title = '😞 Вы проиграли!';
                message = `${gameState.opponent} оказался сильнее. Удачи в следующий раз!`;
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
            window.GlassXO.socket.requestRestart();
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
            window.GlassXO.ui.showScreen('online-lobby-screen');
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

    // ===== ОБРАБОТЧИКИ ОНЛАЙН ИГРЫ =====
    handleOnlineMove(data) {
        window.GlassXO.gameState.board[data.index] = data.player;
        window.GlassXO.gameState.moveCount++;
        window.GlassXO.ui.updateCellDisplay(data.index, data.player);
        
        const result = this.checkGameResult();
        if (result) {
            this.endGame(result);
            return;
        }
        
        window.GlassXO.gameState.currentPlayer = window.GlassXO.gameState.currentPlayer === 'X' ? 'O' : 'X';
        window.GlassXO.gameState.isMyTurn = window.GlassXO.gameState.currentPlayer === window.GlassXO.gameState.mySymbol;
        
        window.GlassXO.ui.updateTurnIndicator();
        window.GlassXO.ui.playSound('move');
    }

    handleOnlineGameEnd(data) {
        window.GlassXO.gameState.gameActive = false;
        
        const result = {
            winner: data.winner,
            pattern: data.winningPattern
        };
        
        this.endGame(result);
    }

    handleOpponentLeft() {
        window.GlassXO.gameState.gameActive = false;
        window.GlassXO.ui.showNotification('😞 Ваш соперник покинул игру', 'warning');
        
        setTimeout(() => {
            window.GlassXO.ui.showScreen('main-menu');
        }, 3000);
    }
} 