class TicTacToeAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        this.randomnessFactor = this.getRandomnessFactor(difficulty);
        this.humanPlayer = 'X';
        this.aiPlayer = 'O';
    }

    // Определяем максимальную глубину поиска для разных уровней
    getMaxDepth(difficulty) {
        switch (difficulty) {
            case 'easy': return 2;
            case 'medium': return 4;
            case 'hard': return 6;
            case 'impossible': return 9; // Полный поиск
            default: return 4;
        }
    }

    // Определяем фактор случайности (чем выше, тем больше ошибок)
    getRandomnessFactor(difficulty) {
        switch (difficulty) {
            case 'easy': return 0.4; // 40% случайных ходов
            case 'medium': return 0.15; // 15% случайных ходов
            case 'hard': return 0.05; // 5% случайных ходов
            case 'impossible': return 0; // 0% случайных ходов
            default: return 0.15;
        }
    }

    // Получение лучшего хода для ИИ
    getBestMove(board, isFirstMove = false) {
        // Проверяем, есть ли пустые клетки
        const availableMoves = this.getAvailableMoves(board);
        if (availableMoves.length === 0) return undefined;

        // Для первого хода в легком режиме просто выбираем случайную клетку
        if (isFirstMove && this.difficulty === 'easy') {
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        }

        // Добавляем случайность в зависимости от сложности
        if (Math.random() < this.randomnessFactor) {
            return this.getRandomMove(board);
        }

        // Используем minimax алгоритм для лучшего хода
        const bestMove = this.minimax(board, this.maxDepth, true, -Infinity, Infinity);
        return bestMove.position;
    }

    // Minimax алгоритм с альфа-бета отсечением
    minimax(board, depth, isMaximizing, alpha, beta) {
        const result = this.evaluateBoard(board);
        
        // Базовые случаи
        if (result !== null || depth === 0) {
            return { score: this.getScore(result, depth), position: null };
        }

        const availableMoves = this.getAvailableMoves(board);
        
        if (isMaximizing) {
            // Ход ИИ (максимизируем счет)
            let maxEval = { score: -Infinity, position: null };
            
            for (let move of availableMoves) {
                const newBoard = [...board];
                newBoard[move] = this.aiPlayer;
                
                const evaluation = this.minimax(newBoard, depth - 1, false, alpha, beta);
                
                if (evaluation.score > maxEval.score) {
                    maxEval = { score: evaluation.score, position: move };
                }
                
                alpha = Math.max(alpha, evaluation.score);
                if (beta <= alpha) break; // Альфа-бета отсечение
            }
            
            return maxEval;
        } else {
            // Ход человека (минимизируем счет)
            let minEval = { score: Infinity, position: null };
            
            for (let move of availableMoves) {
                const newBoard = [...board];
                newBoard[move] = this.humanPlayer;
                
                const evaluation = this.minimax(newBoard, depth - 1, true, alpha, beta);
                
                if (evaluation.score < minEval.score) {
                    minEval = { score: evaluation.score, position: move };
                }
                
                beta = Math.min(beta, evaluation.score);
                if (beta <= alpha) break; // Альфа-бета отсечение
            }
            
            return minEval;
        }
    }

    // Оценка позиции на доске
    evaluateBoard(board) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // горизонтали
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // вертикали
            [0, 4, 8], [2, 4, 6] // диагонали
        ];

        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a]; // Возвращаем победителя ('X' или 'O')
            }
        }

        // Проверяем ничью
        if (board.every(cell => cell !== null)) {
            return 'draw';
        }

        return null; // Игра продолжается
    }

    // Получение счета для minimax
    getScore(result, depth) {
        if (result === this.aiPlayer) return 10 - depth; // ИИ выиграл (быстрее = лучше)
        if (result === this.humanPlayer) return depth - 10; // Человек выиграл (быстрее = хуже для ИИ)
        return 0; // Ничья или игра продолжается
    }

    // Получение доступных ходов
    getAvailableMoves(board) {
        return board.map((cell, index) => cell === null ? index : null)
                   .filter(index => index !== null);
    }

    // Случайный ход (для добавления ошибок)
    getRandomMove(board) {
        const availableMoves = this.getAvailableMoves(board);
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Получение подсказки для игрока
    getHint(board, player = 'X') {
        // Сначала проверяем, может ли игрок выиграть
        const winMove = this.findWinningMove(board, player);
        if (winMove !== null) {
            return {
                type: 'win',
                position: winMove,
                message: `Вы можете выиграть, поставив ${player} в клетку ${winMove + 1}!`,
                priority: 'high'
            };
        }

        // Затем проверяем, нужно ли блокировать противника
        const opponent = player === 'X' ? 'O' : 'X';
        const blockMove = this.findWinningMove(board, opponent);
        if (blockMove !== null) {
            return {
                type: 'block',
                position: blockMove,
                message: `Заблокируйте противника в клетке ${blockMove + 1}!`,
                priority: 'high'
            };
        }

        // Ищем стратегически важные позиции
        const strategicMove = this.findStrategicMove(board, player);
        if (strategicMove !== null) {
            return {
                type: 'strategic',
                position: strategicMove,
                message: this.getStrategicMessage(strategicMove),
                priority: 'medium'
            };
        }

        // Если ничего особенного нет, даем общий совет
        const availableMoves = this.getAvailableMoves(board);
        if (availableMoves.length > 0) {
            const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            return {
                type: 'general',
                position: randomMove,
                message: `Рассмотрите ход в клетку ${randomMove + 1}`,
                priority: 'low'
            };
        }

        return null;
    }

    // Поиск выигрышного хода
    findWinningMove(board, player) {
        const availableMoves = this.getAvailableMoves(board);
        
        for (let move of availableMoves) {
            const testBoard = [...board];
            testBoard[move] = player;
            
            if (this.evaluateBoard(testBoard) === player) {
                return move;
            }
        }
        
        return null;
    }

    // Поиск стратегически важного хода
    findStrategicMove(board, player) {
        const availableMoves = this.getAvailableMoves(board);
        
        // Приоритет клеток: центр > углы > стороны
        const priorities = {
            4: 5, // центр
            0: 4, 2: 4, 6: 4, 8: 4, // углы
            1: 3, 3: 3, 5: 3, 7: 3  // стороны
        };

        // Если центр свободен и это первые ходы, рекомендуем центр
        if (board[4] === null && board.filter(cell => cell !== null).length <= 2) {
            return 4;
        }

        // Если противник занял центр, занимаем угол
        if (board[4] && board[4] !== player) {
            const corners = [0, 2, 6, 8].filter(pos => board[pos] === null);
            if (corners.length > 0) {
                return corners[0];
            }
        }

        // Ищем наилучшую позицию по приоритету
        let bestMove = null;
        let bestPriority = 0;
        
        for (let move of availableMoves) {
            const priority = priorities[move] || 1;
            if (priority > bestPriority) {
                bestPriority = priority;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    // Получение сообщения для стратегического хода
    getStrategicMessage(position) {
        const messages = {
            4: "Центр - отличная стратегическая позиция!",
            0: "Угол даёт много возможностей для атаки",
            2: "Угол даёт много возможностей для атаки", 
            6: "Угол даёт много возможностей для атаки",
            8: "Угол даёт много возможностей для атаки",
            1: "Хороший ход для контроля верхнего ряда",
            3: "Хороший ход для контроля левой колонки",
            5: "Хороший ход для контроля правой колонки", 
            7: "Хороший ход для контроля нижнего ряда"
        };
        
        return messages[position] || `Рассмотрите клетку ${position + 1}`;
    }

    // Получение описания сложности
    getDifficultyDescription() {
        const descriptions = {
            easy: {
                name: "Новичок",
                description: "Играет расслабленно, делает много ошибок",
                winChance: "95%",
                characteristics: ["Случайные ходы", "Не видит очевидных выигрышей", "Хорошо для обучения"]
            },
            medium: {
                name: "Любитель", 
                description: "Думает на несколько ходов вперед, иногда ошибается",
                winChance: "70%",
                characteristics: ["Базовая стратегия", "Иногда пропускает атаки", "Сбалансированная игра"]
            },
            hard: {
                name: "Эксперт",
                description: "Играет очень сильно, редко делает ошибки",
                winChance: "30%",
                characteristics: ["Сильная стратегия", "Редкие ошибки", "Серьёзный вызов"]
            },
            impossible: {
                name: "Гроссмейстер",
                description: "Идеальная игра, никогда не проигрывает",
                winChance: "5%",
                characteristics: ["Идеальная игра", "Нет ошибок", "Максимальный вызов"]
            }
        };
        
        return descriptions[this.difficulty] || descriptions.medium;
    }

    // Получение статистики о работе ИИ
    getAIStats() {
        return {
            difficulty: this.difficulty,
            maxDepth: this.maxDepth,
            randomnessFactor: this.randomnessFactor,
            description: this.getDifficultyDescription()
        };
    }

    // Анализ позиции для продвинутых игроков
    analyzePosition(board) {
        const analysis = {
            winner: this.evaluateBoard(board),
            availableMoves: this.getAvailableMoves(board),
            bestMoves: [],
            evaluation: 0
        };

        if (analysis.winner !== null) {
            analysis.evaluation = this.getScore(analysis.winner, 0);
            return analysis;
        }

        // Анализируем все доступные ходы
        for (let move of analysis.availableMoves) {
            const testBoard = [...board];
            testBoard[move] = this.aiPlayer;
            
            const moveEval = this.minimax(testBoard, Math.min(this.maxDepth, 6), false, -Infinity, Infinity);
            analysis.bestMoves.push({
                position: move,
                score: moveEval.score,
                evaluation: this.getMoveEvaluation(moveEval.score)
            });
        }

        // Сортируем ходы по качеству
        analysis.bestMoves.sort((a, b) => b.score - a.score);
        analysis.evaluation = analysis.bestMoves[0]?.score || 0;

        return analysis;
    }

    // Получение текстовой оценки хода
    getMoveEvaluation(score) {
        if (score >= 8) return "Отличный ход!";
        if (score >= 5) return "Хороший ход";
        if (score >= 0) return "Нейтральный ход";
        if (score >= -5) return "Слабый ход";
        return "Плохой ход";
    }

    // Получение совета по улучшению игры
    getGameAdvice(board, lastMove, player) {
        const advice = [];
        
        // Проверяем, упустил ли игрок победу
        const missedWin = this.findWinningMove(board, player);
        if (missedWin !== null) {
            advice.push({
                type: "missed_opportunity",
                message: `Вы упустили победу в клетке ${missedWin + 1}!`,
                severity: "high"
            });
        }

        // Проверяем, позволил ли игрок противнику выиграть
        if (lastMove !== undefined) {
            const opponent = player === 'X' ? 'O' : 'X';
            const testBoard = [...board];
            testBoard[lastMove] = null; // Убираем последний ход
            
            const opponentWin = this.findWinningMove(testBoard, opponent);
            if (opponentWin === lastMove) {
                advice.push({
                    type: "defensive_error",
                    message: "Нужно было заблокировать противника!",
                    severity: "high"
                });
            }
        }

        // Общие стратегические советы
        const moveCount = board.filter(cell => cell !== null).length;
        if (moveCount <= 2) {
            if (board[4] === null) {
                advice.push({
                    type: "strategy",
                    message: "Совет: центр даёт больше возможностей для победы",
                    severity: "low"
                });
            }
        }

        return advice;
    }
}

module.exports = TicTacToeAI; 