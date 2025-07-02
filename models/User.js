const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ===== СХЕМА СЧЕТЧИКА ДЛЯ АВТОИНКРЕМЕНТА =====
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// ===== СХЕМА ПОЛЬЗОВАТЕЛЯ =====
const userSchema = new mongoose.Schema({
    // Уникальный ID пользователя (автоинкремент начиная с 1)
    user_id: {
        type: Number,
        unique: true
    },
    
    // Основная информация
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        minlength: 6
    },
    
    // OAuth данные
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String,
        default: ''
    },
    
    // Полная дата регистрации и активности
    registration: {
        date: { type: Date, default: Date.now },
        ip: { type: String, default: '' },
        userAgent: { type: String, default: '' },
        location: {
            country: { type: String, default: '' },
            city: { type: String, default: '' },
            timezone: { type: String, default: 'UTC' }
        }
    },
    
    // Профиль и настройки
    profile: {
        displayName: {
            type: String,
            default: function() { return this.username; }
        },
        bio: {
            type: String,
            maxlength: 200,
            default: ''
        },
        country: {
            type: String,
            default: ''
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        language: {
            type: String,
            default: 'ru',
            enum: ['ru', 'en', 'es', 'fr', 'de']
        }
    },
    
    // Игровая статистика по играм
    gameStats: {
        // Крестики-нолики
        ticTacToe: {
            gamesPlayed: { type: Number, default: 0 },
            gamesWon: { type: Number, default: 0 },
            gamesLost: { type: Number, default: 0 },
            gamesDraw: { type: Number, default: 0 },
            rating: { type: Number, default: 1000 },
            maxRating: { type: Number, default: 1000 },
            bestStreak: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            totalPlayTime: { type: Number, default: 0 }
        },
        // Змейка (будущая игра)
        snake: {
            highScore: { type: Number, default: 0 },
            gamesPlayed: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 }
        },
        // Тетрис (будущая игра)
        tetris: {
            highScore: { type: Number, default: 0 },
            gamesPlayed: { type: Number, default: 0 },
            linesCleared: { type: Number, default: 0 },
            totalTime: { type: Number, default: 0 }
        }
    },
    
    // Общая статистика по всем играм
    stats: {
        totalGamesPlayed: { type: Number, default: 0 },
        totalGamesWon: { type: Number, default: 0 },
        totalPlayTime: { type: Number, default: 0 },
        favoriteGame: { type: String, default: 'ticTacToe' },
        
        // Статистика против игроков
        pvpGames: { type: Number, default: 0 },
        pvpWins: { type: Number, default: 0 },
        pvpLosses: { type: Number, default: 0 },
        pvpDraws: { type: Number, default: 0 },
        
        // Статистика против ИИ
        aiGames: { type: Number, default: 0 },
        aiWins: { type: Number, default: 0 },
        aiLosses: { type: Number, default: 0 },
        aiDraws: { type: Number, default: 0 },
        
        // Статистика по сложности ИИ
        aiStats: {
            easy: { wins: { type: Number, default: 0 }, losses: { type: Number, default: 0 }, draws: { type: Number, default: 0 } },
            medium: { wins: { type: Number, default: 0 }, losses: { type: Number, default: 0 }, draws: { type: Number, default: 0 } },
            hard: { wins: { type: Number, default: 0 }, losses: { type: Number, default: 0 }, draws: { type: Number, default: 0 } },
            impossible: { wins: { type: Number, default: 0 }, losses: { type: Number, default: 0 }, draws: { type: Number, default: 0 } }
        },
        
        // Серии побед
        currentWinStreak: { type: Number, default: 0 },
        maxWinStreak: { type: Number, default: 0 },
        currentLossStreak: { type: Number, default: 0 },
        maxLossStreak: { type: Number, default: 0 },
        
        // Рейтинг и ELO
        rating: { type: Number, default: 1000 },
        maxRating: { type: Number, default: 1000 },
        
        // Время игры
        totalPlayTime: { type: Number, default: 0 }, // в минутах
        averageGameTime: { type: Number, default: 0 }, // в секундах
        
        // Достижения
        firstWin: { type: Boolean, default: false },
        perfectGame: { type: Boolean, default: false }, // победа в 3 хода
        comebackKing: { type: Boolean, default: false }, // победа после 5+ поражений подряд
        aiMaster: { type: Boolean, default: false }, // победа над всеми уровнями ИИ
        speedster: { type: Boolean, default: false }, // игра менее 30 секунд
        patient: { type: Boolean, default: false }, // игра более 10 минут
        socialPlayer: { type: Boolean, default: false }, // 10+ игр против игроков
        practitioner: { type: Boolean, default: false }, // 50+ игр против ИИ
        champion: { type: Boolean, default: false }, // рейтинг 1500+
        legend: { type: Boolean, default: false }, // рейтинг 2000+
    },
    
    // Уровень и опыт
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    experienceToNext: { type: Number, default: 100 },
    
    // Настройки игры
    gameSettings: {
        soundEnabled: { type: Boolean, default: true },
        musicEnabled: { type: Boolean, default: true },
        animationsEnabled: { type: Boolean, default: true },
        hintsEnabled: { type: Boolean, default: true },
        darkMode: { type: Boolean, default: true },
        autoFindGame: { type: Boolean, default: false },
        showRating: { type: Boolean, default: true }
    },
    
    // История игр (последние 20)
    gameHistory: [{
        gameId: String,
        opponent: {
            name: String,
            avatar: String,
            isAI: { type: Boolean, default: false },
            difficulty: String
        },
        result: { type: String, enum: ['win', 'loss', 'draw'] },
        rating: Number,
        ratingChange: Number,
        duration: Number, // в секундах
        moves: Number,
        playedAt: { type: Date, default: Date.now }
    }],
    
    // Детальная информация о сессиях
    sessions: [{
        loginDate: { type: Date, default: Date.now },
        logoutDate: Date,
        ip: String,
        userAgent: String,
        duration: Number, // в минутах
        gamesPlayed: { type: Number, default: 0 }
    }],
    
    // Временные данные
    lastLoginAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    lastActivity: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Виртуальные поля
userSchema.virtual('winRate').get(function() {
    if (this.stats.gamesPlayed === 0) return 0;
    return Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
});

userSchema.virtual('pvpWinRate').get(function() {
    if (this.stats.pvpGames === 0) return 0;
    return Math.round((this.stats.pvpWins / this.stats.pvpGames) * 100);
});

userSchema.virtual('aiWinRate').get(function() {
    if (this.stats.aiGames === 0) return 0;
    return Math.round((this.stats.aiWins / this.stats.aiGames) * 100);
});

userSchema.virtual('levelProgress').get(function() {
    return Math.round((this.experience / this.experienceToNext) * 100);
});

// Методы экземпляра

// ===== АВТОИНКРЕМЕНТ user_id =====
userSchema.pre('save', async function(next) {
    // Автоинкремент user_id только для новых пользователей
    if (this.isNew && !this.user_id) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                'user_id',
                { $inc: { sequence_value: 1 } },
                { new: true, upsert: true }
            );
            this.user_id = counter.sequence_value;
        } catch (error) {
            return next(error);
        }
    }
    
    // Хеширование пароля
    if (this.password && this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    
    // Обновляем время последней активности
    this.lastActivity = new Date();
    
    next();
});

// Проверка пароля
userSchema.methods.checkPassword = async function(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
};

// Альтернативный метод для совместимости
userSchema.methods.comparePassword = async function(password) {
    return this.checkPassword(password);
};

// Обновление статистики после игры
userSchema.methods.updateStats = function(result, gameMode, opponent, gameDuration, moves) {
    // Общая статистика
    this.stats.gamesPlayed++;
    
    if (result === 'win') {
        this.stats.gamesWon++;
        this.stats.currentWinStreak++;
        this.stats.currentLossStreak = 0;
        if (this.stats.currentWinStreak > this.stats.maxWinStreak) {
            this.stats.maxWinStreak = this.stats.currentWinStreak;
        }
    } else if (result === 'loss') {
        this.stats.gamesLost++;
        this.stats.currentLossStreak++;
        this.stats.currentWinStreak = 0;
        if (this.stats.currentLossStreak > this.stats.maxLossStreak) {
            this.stats.maxLossStreak = this.stats.currentLossStreak;
        }
    } else {
        this.stats.gamesDraw++;
        this.stats.currentWinStreak = 0;
        this.stats.currentLossStreak = 0;
    }
    
    // Статистика по режимам
    if (gameMode === 'ai') {
        this.stats.aiGames++;
        if (result === 'win') this.stats.aiWins++;
        else if (result === 'loss') this.stats.aiLosses++;
        else this.stats.aiDraws++;
        
        // Статистика по сложности ИИ
        if (opponent && opponent.difficulty) {
            const difficulty = opponent.difficulty;
            if (this.stats.aiStats[difficulty]) {
                this.stats.aiStats[difficulty][result === 'draw' ? 'draws' : result === 'win' ? 'wins' : 'losses']++;
            }
        }
    } else if (gameMode === 'player') {
        this.stats.pvpGames++;
        if (result === 'win') this.stats.pvpWins++;
        else if (result === 'loss') this.stats.pvpLosses++;
        else this.stats.pvpDraws++;
    }
    
    // Обновление рейтинга (простая система ELO)
    const oldRating = this.stats.rating;
    if (gameMode === 'player' && opponent && !opponent.isGuest) {
        const opponentRating = opponent.rating || 1000;
        const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - this.stats.rating) / 400));
        let actualScore = 0;
        if (result === 'win') actualScore = 1;
        else if (result === 'draw') actualScore = 0.5;
        
        const K = 32; // K-фактор
        const ratingChange = Math.round(K * (actualScore - expectedScore));
        this.stats.rating = Math.max(0, this.stats.rating + ratingChange);
        
        if (this.stats.rating > this.stats.maxRating) {
            this.stats.maxRating = this.stats.rating;
        }
    } else if (gameMode === 'ai') {
        // Простое изменение рейтинга для игр с ИИ
        let change = 0;
        if (result === 'win') {
            change = opponent?.difficulty === 'impossible' ? 15 : 
                     opponent?.difficulty === 'hard' ? 10 : 
                     opponent?.difficulty === 'medium' ? 5 : 2;
        } else if (result === 'loss') {
            change = opponent?.difficulty === 'easy' ? -8 : -3;
        }
        this.stats.rating = Math.max(0, this.stats.rating + change);
        
        if (this.stats.rating > this.stats.maxRating) {
            this.stats.maxRating = this.stats.rating;
        }
    }
    
    // Добавляем опыт и проверяем уровень
    let expGained = 10;
    if (result === 'win') expGained = 25;
    else if (result === 'draw') expGained = 15;
    
    // Бонус за режим игры
    if (gameMode === 'player') expGained += 5;
    
    this.addExperience(expGained);
    
    // Обновляем время игры
    if (gameDuration) {
        this.stats.totalPlayTime += Math.round(gameDuration / 60); // конвертируем в минуты
        this.stats.averageGameTime = Math.round(
            (this.stats.averageGameTime * (this.stats.gamesPlayed - 1) + gameDuration) / this.stats.gamesPlayed
        );
    }
    
    // Проверяем достижения
    this.checkAchievements(result, gameMode, opponent, gameDuration, moves);
    
    // Добавляем в историю игр
    this.gameHistory.unshift({
        opponent: opponent ? {
            name: opponent.name,
            avatar: opponent.avatar,
            isAI: opponent.isAI || false,
            difficulty: opponent.difficulty
        } : { name: 'Неизвестный', avatar: '', isAI: false },
        result,
        rating: this.stats.rating,
        ratingChange: this.stats.rating - oldRating,
        duration: gameDuration || 0,
        moves: moves || 0,
        playedAt: new Date()
    });
    
    // Ограничиваем историю 50 играми
    if (this.gameHistory.length > 50) {
        this.gameHistory = this.gameHistory.slice(0, 50);
    }
};

// Добавление опыта и проверка уровня
userSchema.methods.addExperience = function(exp) {
    this.experience += exp;
    
    // Проверяем повышение уровня
    while (this.experience >= this.experienceToNext) {
        this.experience -= this.experienceToNext;
        this.level++;
        this.experienceToNext = this.calculateExpForNextLevel();
    }
};

// Расчет опыта для следующего уровня
userSchema.methods.calculateExpForNextLevel = function() {
    return Math.floor(100 * Math.pow(1.2, this.level - 1));
};

// Проверка достижений
userSchema.methods.checkAchievements = function(result, gameMode, opponent, duration, moves) {
    // Первая победа
    if (result === 'win' && this.stats.gamesWon === 1) {
        this.stats.firstWin = true;
    }
    
    // Идеальная игра (победа в 5 ходов)
    if (result === 'win' && moves && moves <= 5) {
        this.stats.perfectGame = true;
    }
    
    // Король возвращений (победа после 5+ поражений)
    if (result === 'win' && this.stats.currentLossStreak >= 5) {
        this.stats.comebackKing = true;
    }
    
    // Мастер ИИ (победа над всеми уровнями)
    if (result === 'win' && gameMode === 'ai') {
        const aiStats = this.stats.aiStats;
        if (aiStats.easy.wins > 0 && aiStats.medium.wins > 0 && 
            aiStats.hard.wins > 0 && aiStats.impossible.wins > 0) {
            this.stats.aiMaster = true;
        }
    }
    
    // Скоростной игрок (игра менее 30 секунд)
    if (duration && duration < 30) {
        this.stats.speedster = true;
    }
    
    // Терпеливый игрок (игра более 10 минут)
    if (duration && duration > 600) {
        this.stats.patient = true;
    }
    
    // Социальный игрок (10+ игр против игроков)
    if (this.stats.pvpGames >= 10) {
        this.stats.socialPlayer = true;
    }
    
    // Практик (50+ игр против ИИ)
    if (this.stats.aiGames >= 50) {
        this.stats.practitioner = true;
    }
    
    // Чемпион (рейтинг 1500+)
    if (this.stats.rating >= 1500) {
        this.stats.champion = true;
    }
    
    // Легенда (рейтинг 2000+)
    if (this.stats.rating >= 2000) {
        this.stats.legend = true;
    }
};

// Получение публичного профиля
userSchema.methods.toPublicProfile = function() {
    return {
        id: this._id,
        user_id: this.user_id, // Уникальный ID пользователя
        username: this.username,
        avatar: this.avatar,
        profile: this.profile,
        registration: this.registration, // Полная дата регистрации
        stats: {
            ...this.stats.toObject(),
            winRate: this.winRate,
            pvpWinRate: this.pvpWinRate,
            aiWinRate: this.aiWinRate
        },
        level: this.level,
        experience: this.experience,
        experienceToNext: this.experienceToNext,
        levelProgress: this.levelProgress,
        gameSettings: this.gameSettings,
        gameHistory: this.gameHistory.slice(0, 10), // Только последние 10 игр для публичного профиля
        sessions: this.sessions.slice(0, 5), // Последние 5 сессий
        lastLoginAt: this.lastLoginAt,
        createdAt: this.createdAt
    };
};

// Получение краткого профиля для игры
userSchema.methods.toGameProfile = function() {
    return {
        id: this._id,
        user_id: this.user_id, // Уникальный ID пользователя
        name: this.profile.displayName || this.username,
        username: this.username,
        avatar: this.avatar,
        level: this.level,
        rating: this.stats.rating,
        winRate: this.winRate,
        gamesPlayed: this.stats.gamesPlayed,
        isGuest: false,
        registeredAt: this.registration.date
    };
};

// Статический метод для поиска топ игроков
userSchema.statics.getTopPlayers = function(limit = 10, type = 'rating') {
    let sortField;
    switch (type) {
        case 'wins':
            sortField = { 'stats.gamesWon': -1 };
            break;
        case 'streak':
            sortField = { 'stats.maxWinStreak': -1 };
            break;
        case 'level':
            sortField = { level: -1, experience: -1 };
            break;
        default:
            sortField = { 'stats.rating': -1 };
    }
    
    return this.find({ 'stats.gamesPlayed': { $gt: 0 } })
        .sort(sortField)
        .limit(limit)
        .select('username avatar profile stats level');
};

// Методы для работы с сессиями
userSchema.methods.startSession = function(ip, userAgent) {
    this.sessions.unshift({
        loginDate: new Date(),
        ip: ip || '',
        userAgent: userAgent || '',
        gamesPlayed: 0
    });
    
    // Ограничиваем историю сессий 20 записями
    if (this.sessions.length > 20) {
        this.sessions = this.sessions.slice(0, 20);
    }
    
    this.lastLoginAt = new Date();
    this.isOnline = true;
};

userSchema.methods.endSession = function() {
    if (this.sessions.length > 0) {
        const currentSession = this.sessions[0];
        if (!currentSession.logoutDate) {
            currentSession.logoutDate = new Date();
            currentSession.duration = Math.round((currentSession.logoutDate - currentSession.loginDate) / 60000); // в минутах
        }
    }
    this.isOnline = false;
};

userSchema.methods.addGameToSession = function() {
    if (this.sessions.length > 0) {
        this.sessions[0].gamesPlayed++;
    }
};

// Статический метод для получения пользователя по user_id
userSchema.statics.findByUserId = function(user_id) {
    return this.findOne({ user_id: user_id });
};

module.exports = mongoose.model('User', userSchema); 