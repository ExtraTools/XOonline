// Логика игры крестики-нолики для DinosGames

class TicTacToeGame {
    constructor() {
        this.board = Array(9).fill('');
        this.currentPlayer = 'X';
        this.gameMode = null;
        this.difficulty = null;
        this.gameActive = false;
        this.gameStartTime = null;
        this.timer = null;
        this.moves = 0;
        this.playerData = null;
        this.opponentData = null;
        this.socket = null;
        this.gameId = null;
        this.isPlayerTurn = true;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPlayerData();
        this.showGameMenu();
    }

    setupEventListeners() {
        // Ждем загрузку DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }

        // Подключение к сокету если доступно
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.setupSocketEvents();
        }
    }

    bindEvents() {
        // Добавляем обработчики кликов на клетки доски
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        // Обработчики для выбора сложности ИИ
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDifficulty(e));
        });
    }

    setupSocketEvents() {
        if (!this.socket) return;

        this.socket.on('game-found', (data) => {
            this.handleGameFound(data);
        });

        this.socket.on('move-made', (data) => {
            this.handleOpponentMove(data);
        });

        this.socket.on('game-finished', (data) => {
            this.handleGameEnd(data);
        });

        this.socket.on('opponent-disconnected', () => {
            this.handleOpponentDisconnect();
        });
    }

    loadPlayerData() {
        // Загружаем данные игрока из localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.playerData = JSON.parse(userData);
        } else {
            // Гостевой режим
            this.playerData = {
                name: 'Гость',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
                rating: 1000,
                gamesPlayed: 0,
                gamesWon: 0,
                isGuest: true
            };
        }
        this.updatePlayerInfo();
    }

    updatePlayerInfo() {
        const nameEl = document.getElementById('player-name');
        const ratingEl = document.getElementById('player-rating');
        const gamesEl = document.getElementById('player-games');
        const avatarEl = document.getElementById('player-avatar');

        if (nameEl) nameEl.textContent = this.playerData.name;
        if (ratingEl) ratingEl.textContent = this.playerData.rating || 1000;
        if (gamesEl) gamesEl.textContent = this.playerData.gamesPlayed || 0;
        if (avatarEl) avatarEl.src = this.playerData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    }

    showGameMenu() {
        this.hideAllScreens();
        const menuEl = document.getElementById('game-menu');
        if (menuEl) menuEl.style.display = 'block';
    }

    hideAllScreens() {
        const screens = ['game-menu', 'game-area', 'game-result'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const sections = ['ai-settings', 'matchmaking'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    selectMode(mode) {
        this.gameMode = mode;
        
        switch (mode) {
            case 'ai':
                this.showAISettings();
                break;
            case 'pvp':
                this.startMatchmaking();
                break;
            case 'local':
                this.startLocalGame();
                break;
        }
    }

    showAISettings() {
        const modesEl = document.querySelector('.game-modes');
        const aiEl = document.getElementById('ai-settings');
        
        if (modesEl) modesEl.style.display = 'none';
        if (aiEl) aiEl.style.display = 'block';
    }

    selectDifficulty(event) {
        // Убираем выделение с других кнопок
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Выделяем выбранную кнопку
        event.target.classList.add('selected');
        this.difficulty = event.target.dataset.difficulty;
        
        // Запускаем игру через небольшую задержку
        setTimeout(() => {
            this.startAIGame();
        }, 500);
    }

    startLocalGame() {
        this.gameMode = 'local';
        this.opponentData = {
            name: 'Игрок 2',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player2',
            rating: '—',
            isLocal: true
        };
        
        this.startGame();
    }

    startAIGame() {
        this.gameMode = 'ai';
        this.opponentData = this.getAIOpponentData();
        this.startGame();
    }

    getAIOpponentData() {
        const aiData = {
            easy: {
                name: 'ИИ Легкий',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ai-easy',
                rating: 800
            },
            medium: {
                name: 'ИИ Средний',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ai-medium',
                rating: 1200
            },
            hard: {
                name: 'ИИ Сложный',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ai-hard',
                rating: 1600
            },
            impossible: {
                name: 'ИИ Невозможный',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ai-impossible',
                rating: 2000
            }
        };

        return {
            ...aiData[this.difficulty],
            isAI: true,
            difficulty: this.difficulty
        };
    }

    startGame() {
        this.resetBoard();
        this.gameActive = true;
        this.gameStartTime = Date.now();
        this.moves = 0;
        this.currentPlayer = 'X';
        this.isPlayerTurn = true;
        
        this.showGameArea();
        this.updateOpponentInfo();
        this.updateGameStatus();
        this.startTimer();
        
        this.showNotification('Игра началась! Удачи!', 'success');
    }

    showGameArea() {
        this.hideAllScreens();
        const gameAreaEl = document.getElementById('game-area');
        if (gameAreaEl) gameAreaEl.style.display = 'block';
    }

    updateOpponentInfo() {
        const elements = {
            'opponent-name': this.opponentData.name,
            'opponent-rating': `Рейтинг: ${this.opponentData.rating}`,
            'opponent-avatar': this.opponentData.avatar,
            'game-player-name': this.playerData.name,
            'game-player-rating': `Рейтинг: ${this.playerData.rating}`,
            'game-player-avatar': this.playerData.avatar
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                if (id.includes('avatar')) {
                    el.src = value;
                } else {
                    el.textContent = value;
                }
            }
        });
    }

    updateGameStatus() {
        const turnText = this.isPlayerTurn ? 
            `Ваш ход (${this.currentPlayer})` : 
            `Ход противника (${this.currentPlayer})`;
        
        const turnEl = document.getElementById('current-turn');
        if (turnEl) turnEl.textContent = turnText;
    }

    startTimer() {
        this.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timerEl = document.getElementById('game-timer');
            if (timerEl) {
                timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    handleCellClick(event) {
        const cellIndex = parseInt(event.target.dataset.index);
        
        if (!this.gameActive || this.board[cellIndex] !== '' || !this.isPlayerTurn) {
            return;
        }

        this.makeMove(cellIndex);
    }

    makeMove(cellIndex) {
        if (this.board[cellIndex] !== '' || !this.gameActive) return;

        this.board[cellIndex] = this.currentPlayer;
        this.moves++;
        
        // Обновляем визуал
        const cell = document.querySelector(`[data-index="${cellIndex}"]`);
        if (cell) {
            cell.textContent = this.currentPlayer;
            cell.classList.add(this.currentPlayer.toLowerCase());
        }
        
        // Воспроизводим звук хода
        this.playSound('move');
        
        // Проверяем победу
        const winner = this.checkWinner();
        if (winner) {
            this.endGame(winner);
            return;
        }
        
        // Проверяем ничью
        if (this.moves === 9) {
            this.endGame('draw');
            return;
        }
        
        // Переключаем игрока
        this.switchPlayer();
        
        // Если играем против ИИ и сейчас ход ИИ
        if (this.gameMode === 'ai' && !this.isPlayerTurn) {
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    }

    makeAIMove() {
        if (!this.gameActive || this.isPlayerTurn) return;
        
        const move = this.calculateAIMove();
        if (move !== -1) {
            this.makeMove(move);
        }
    }

    calculateAIMove() {
        switch (this.difficulty) {
            case 'easy':
                return this.getRandomMove();
            case 'medium':
                return this.getMediumMove();
            case 'hard':
            case 'impossible':
                return this.getSmartMove();
            default:
                return this.getRandomMove();
        }
    }

    getRandomMove() {
        const availableMoves = this.board
            .map((cell, index) => cell === '' ? index : null)
            .filter(val => val !== null);
        
        return availableMoves.length > 0 ? 
            availableMoves[Math.floor(Math.random() * availableMoves.length)] : -1;
    }

    getMediumMove() {
        // Проверяем, можем ли выиграть
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = this.currentPlayer;
                if (this.checkWinner() === this.currentPlayer) {
                    this.board[i] = '';
                    return i;
                }
                this.board[i] = '';
            }
        }
        
        // Проверяем, нужно ли блокировать игрока
        const opponent = this.currentPlayer === 'X' ? 'O' : 'X';
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = opponent;
                if (this.checkWinner() === opponent) {
                    this.board[i] = '';
                    return i;
                }
                this.board[i] = '';
            }
        }
        
        // Иначе случайный ход
        return this.getRandomMove();
    }

    getSmartMove() {
        // Упрощенная умная логика
        const winMove = this.findWinningMove(this.currentPlayer);
        if (winMove !== -1) return winMove;

        const blockMove = this.findWinningMove(this.currentPlayer === 'X' ? 'O' : 'X');
        if (blockMove !== -1) return blockMove;

        // Предпочитаем центр и углы
        const preferredMoves = [4, 0, 2, 6, 8, 1, 3, 5, 7];
        for (let move of preferredMoves) {
            if (this.board[move] === '') {
                return move;
            }
        }

        return this.getRandomMove();
    }

    findWinningMove(player) {
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = player;
                if (this.checkWinner() === player) {
                    this.board[i] = '';
                    return i;
                }
                this.board[i] = '';
            }
        }
        return -1;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        if (this.gameMode === 'local') {
            this.isPlayerTurn = true;
        } else if (this.gameMode === 'ai') {
            this.isPlayerTurn = !this.isPlayerTurn;
        }
        
        this.updateGameStatus();
    }

    checkWinner() {
        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтальные
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикальные
            [0, 4, 8], [2, 4, 6] // Диагональные
        ];

        for (let condition of winConditions) {
            const [a, b, c] = condition;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                // Подсвечиваем выигрышную комбинацию
                condition.forEach(index => {
                    const cell = document.querySelector(`[data-index="${index}"]`);
                    if (cell) cell.classList.add('winning');
                });
                return this.board[a];
            }
        }
        return null;
    }

    endGame(result) {
        this.gameActive = false;
        if (this.timer) clearInterval(this.timer);
        
        const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
        
        // Определяем результат для игрока
        let playerResult;
        if (result === 'draw') {
            playerResult = 'draw';
        } else if ((result === 'X' && this.currentPlayer === 'O') || (result === 'O' && this.currentPlayer === 'X')) {
            // Игрок выиграл (сделал последний ход)
            playerResult = this.isPlayerTurn ? 'lose' : 'win';
        } else {
            playerResult = this.isPlayerTurn ? 'win' : 'lose';
        }
        
        // Обновляем статистику
        this.updatePlayerStats(playerResult, gameDuration);
        
        // Показываем результат
        setTimeout(() => {
            this.showGameResult(playerResult, gameDuration);
        }, 1000);
        
        // Воспроизводим звук
        this.playSound(playerResult === 'win' ? 'win' : 'lose');
    }

    updatePlayerStats(result, duration) {
        if (this.playerData.isGuest) return;
        
        this.playerData.gamesPlayed = (this.playerData.gamesPlayed || 0) + 1;
        if (result === 'win') {
            this.playerData.gamesWon = (this.playerData.gamesWon || 0) + 1;
        }
        
        // Простое обновление рейтинга
        if (this.gameMode === 'ai') {
            const ratingChange = this.calculateRatingChange(result);
            this.playerData.rating = (this.playerData.rating || 1000) + ratingChange;
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('userData', JSON.stringify(this.playerData));
    }

    calculateRatingChange(result) {
        if (result === 'draw') return 0;
        
        const baseChange = result === 'win' ? 25 : -15;
        const difficultyMultiplier = {
            easy: 0.5,
            medium: 1,
            hard: 1.5,
            impossible: 2
        };
        
        return Math.round(baseChange * (difficultyMultiplier[this.difficulty] || 1));
    }

    showGameResult(result, duration) {
        const resultEl = document.getElementById('game-result');
        if (!resultEl) return;

        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const resultDescription = document.getElementById('result-description');
        
        // Настраиваем иконку и заголовок
        if (resultIcon) {
            resultIcon.className = 'result-icon';
            if (result === 'win') {
                resultIcon.classList.add('win');
                resultIcon.innerHTML = '<i class="fas fa-trophy"></i>';
            } else if (result === 'lose') {
                resultIcon.classList.add('lose');
                resultIcon.innerHTML = '<i class="fas fa-skull"></i>';
            } else {
                resultIcon.classList.add('draw');
                resultIcon.innerHTML = '<i class="fas fa-handshake"></i>';
            }
        }

        if (resultTitle) {
            if (result === 'win') resultTitle.textContent = 'Победа!';
            else if (result === 'lose') resultTitle.textContent = 'Поражение';
            else resultTitle.textContent = 'Ничья';
        }

        if (resultDescription) {
            if (result === 'win') resultDescription.textContent = 'Поздравляем с победой!';
            else if (result === 'lose') resultDescription.textContent = 'В следующий раз повезет больше!';
            else resultDescription.textContent = 'Отличная игра! Никто не проиграл.';
        }
        
        // Обновляем статистику в результатах
        const ratingChange = this.calculateRatingChange(result);
        const oldRating = (this.playerData.rating || 1000) - ratingChange;
        
        const oldRatingEl = document.getElementById('old-rating');
        const newRatingEl = document.getElementById('new-rating');
        const ratingChangeEl = document.getElementById('rating-change');
        
        if (oldRatingEl) oldRatingEl.textContent = oldRating;
        if (newRatingEl) newRatingEl.textContent = this.playerData.rating || 1000;
        if (ratingChangeEl) {
            ratingChangeEl.textContent = ratingChange >= 0 ? `+${ratingChange}` : ratingChange;
            ratingChangeEl.className = `rating-change ${ratingChange >= 0 ? 'positive' : 'negative'}`;
        }
        
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationEl = document.getElementById('game-duration');
        if (durationEl) {
            durationEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        const movesEl = document.getElementById('moves-count');
        if (movesEl) movesEl.textContent = this.moves;
        
        resultEl.style.display = 'flex';
    }

    resetBoard() {
        this.board = Array(9).fill('');
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'board-cell';
        });
    }

    playSound(type) {
        const audio = document.getElementById(`${type}-sound`);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {
                // Игнорируем ошибки воспроизведения
            });
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Здесь можно добавить отображение уведомлений
    }

    // Обработчики событий сокета (заглушки)
    handleGameFound(data) {
        console.log('Game found:', data);
    }

    handleOpponentMove(data) {
        console.log('Opponent move:', data);
    }

    handleGameEnd(data) {
        console.log('Game end:', data);
    }

    handleOpponentDisconnect() {
        console.log('Opponent disconnected');
    }
}

// Глобальные функции для HTML
window.selectMode = (mode) => {
    if (window.game) window.game.selectMode(mode);
};

window.backToModeSelection = () => {
    const modesEl = document.querySelector('.game-modes');
    const aiEl = document.getElementById('ai-settings');
    if (modesEl) modesEl.style.display = 'grid';
    if (aiEl) aiEl.style.display = 'none';
};

window.cancelMatchmaking = () => {
    if (window.game) window.game.showGameMenu();
};

window.surrenderGame = () => {
    if (confirm('Вы уверены, что хотите сдаться?')) {
        if (window.game) window.game.endGame('lose');
    }
};

window.offerDraw = () => {
    if (window.game) window.game.endGame('draw');
};

window.restartGame = () => {
    if (confirm('Начать новую игру?')) {
        if (window.game) window.game.startGame();
    }
};

window.playAgain = () => {
    const resultEl = document.getElementById('game-result');
    if (resultEl) resultEl.style.display = 'none';
    if (window.game) {
        if (window.game.gameMode === 'ai') {
            window.game.startGame();
        } else {
            window.game.showGameMenu();
        }
    }
};

window.backToMenu = () => {
    const resultEl = document.getElementById('game-result');
    if (resultEl) resultEl.style.display = 'none';
    if (window.game) window.game.showGameMenu();
};

window.backToLobby = () => {
    window.location.href = '/';
};

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    window.game = new TicTacToeGame();
}); 