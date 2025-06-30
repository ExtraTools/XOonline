// Загрузка переменных окружения
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');

// Импорт моделей и ИИ
const User = require('./models/User');
const TicTacToeAI = require('./ai/TicTacToeAI');
const UserDataManager = require('./models/UserData');

const app = express();
const server = http.createServer(app);

// Настройка Socket.IO для работы в локальной сети
const io = socketIo(server, {
    cors: {
        origin: true, // Разрешаем любые origins
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    },
    allowEIO3: true, // Совместимость с Engine.IO 3
    transports: ['websocket', 'polling'], // Поддержка всех транспортов
    pingTimeout: 60000,
    pingInterval: 25000
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/glass-tic-tac-toe')
.then(() => console.log('✅ MongoDB подключена'))
.catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// CORS middleware для локальной сети
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware для получения реального IP адреса
app.use((req, res, next) => {
    req.realIP = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                 req.ip || 
                 'unknown';
    
    // Очищаем IPv6 префикс если есть
    if (req.realIP.startsWith('::ffff:')) {
        req.realIP = req.realIP.substring(7);
    }
    
    next();
});

// Middleware для статических файлов
app.use(express.static(path.join(__dirname, 'public')));
app.use('/FRONTS', express.static(path.join(__dirname, 'FRONTS')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true для HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Настройка Google OAuth (временно отключено - настройте в .env файле)
// Чтобы включить OAuth:
// 1. Получите Google Client ID и Secret в Google Console
// 2. Замените в .env файле your_google_client_id_here и your_google_client_secret_here
// 3. Раскомментируйте код ниже

/*
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:6666/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Проверяем, существует ли пользователь
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // Обновляем информацию при входе
            user.lastLoginAt = new Date();
            if (profile.photos && profile.photos[0]) {
                user.avatar = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
        }

        // Создаем нового пользователя
        user = new User({
            googleId: profile.id,
            username: profile.displayName || profile.name?.givenName || 'Пользователь',
            email: profile.emails[0].value,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            profile: {
                displayName: profile.displayName || profile.name?.givenName || 'Пользователь'
            }
        });

        await user.save();
        return done(null, user);
    } catch (error) {
        console.error('Ошибка OAuth:', error);
        return done(error, null);
    }
}));
*/

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Хранилище игр и игроков
const activeGames = new Map();
const waitingPlayers = [];
const connectedUsers = new Map();
const privateRooms = new Map();

// Инициализация системы хранения данных пользователей
const userDataManager = new UserDataManager();

// Класс для игры
class TicTacToeGame {
    constructor(player1, player2, gameMode = 'pvp', difficulty = 'medium') {
        this.id = uuidv4();
        this.gameMode = gameMode; // 'pvp', 'ai', 'local'
        this.players = {
            X: player1,
            O: player2
        };
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameStatus = 'playing'; // 'playing', 'finished', 'abandoned'
        this.winner = null;
        this.createdAt = new Date();
        this.moves = [];
        
        // Для игры с ИИ
        if (gameMode === 'ai') {
            this.ai = new TicTacToeAI(difficulty);
            this.difficulty = difficulty;
        }
        
        // Таймер хода
        this.moveTimer = null;
        this.moveTimeLimit = 30; // секунд
    }

    makeMove(player, position) {
        if (this.gameStatus !== 'playing') return false;
        if (this.board[position] !== null) return false;
        if (this.currentPlayer !== player) return false;

        // Делаем ход
        this.board[position] = player;
        this.moves.push({
            player,
            position,
            timestamp: new Date()
        });

        // Проверяем победу
        const winner = this.checkWinner();
        if (winner) {
            this.gameStatus = 'finished';
            this.winner = winner;
            return { success: true, winner, board: this.board };
        }

        // Проверяем ничью
        if (this.board.every(cell => cell !== null)) {
            this.gameStatus = 'finished';
            this.winner = 'draw';
            return { success: true, winner: 'draw', board: this.board };
        }

        // Переключаем игрока
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        // Если играем с ИИ и сейчас ход ИИ
        if (this.gameMode === 'ai' && this.currentPlayer === 'O') {
            setTimeout(() => {
                const aiMove = this.ai.getBestMove([...this.board], true);
                if (aiMove !== undefined) {
                    const result = this.makeMove('O', aiMove);
                    if (result) {
                        // Отправляем результат хода ИИ - ищем сокет игрока
                        let playerSocket = null;
                        for (const [socketId, connection] of connectedUsers.entries()) {
                            if (connection.player.id === this.players.X.id) {
                                playerSocket = connection.socket;
                                break;
                            }
                        }
                        
                        if (playerSocket) {
                            playerSocket.emit('ai-move', {
                                position: aiMove,
                                board: this.board,
                                currentPlayer: this.currentPlayer,
                                gameStatus: this.gameStatus,
                                winner: this.winner
                            });
                        }
                    }
                }
            }, 1000); // Задержка для реалистичности
        }

        return { success: true, board: this.board, currentPlayer: this.currentPlayer };
    }

    checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // горизонтали
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // вертикали
            [0, 4, 8], [2, 4, 6] // диагонали
        ];

        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return {
                    winner: this.board[a],
                    pattern: pattern
                };
            }
        }

        return null;
    }

    getHint(player) {
        if (this.gameMode === 'ai' && this.ai) {
            return this.ai.getHint(this.board, player);
        }
        return null;
    }
}

// API маршруты

// OAuth маршруты (временно отключены)
/*
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Успешная авторизация
        res.redirect('/?auth=success');
    }
);
*/

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error('Ошибка выхода:', err);
        res.redirect('/');
    });
});

// API для получения текущего пользователя
app.get('/api/user', (req, res) => {
    if (req.user) {
        res.json({
            success: true,
            user: req.user.toPublicProfile()
        });
    } else {
        res.json({ success: false });
    }
});

// API для обновления профиля
app.post('/api/profile/update', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    try {
        const { displayName, bio, country } = req.body;
        
        if (displayName) req.user.profile.displayName = displayName;
        if (bio !== undefined) req.user.profile.bio = bio;
        if (country !== undefined) req.user.profile.country = country;

        await req.user.save();
        
        res.json({
            success: true,
            user: req.user.toPublicProfile()
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для таблицы лидеров (обновленный с UserDataManager)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { period = 'all-time', filter = 'all', limit = 50 } = req.query;
        
        // Получаем список лидеров из UserDataManager
        const leaderboard = userDataManager.getLeaderboard(period, parseInt(limit), filter);
        
        // Получаем статистику сервера
        const stats = userDataManager.getServerStats();
        
        // Если пользователь передан, получаем его позицию
        let myPosition = null;
        const { nickname } = req.query;
        if (nickname) {
            myPosition = userDataManager.getUserRank(nickname);
        }

        res.json({
            success: true,
            leaderboard: leaderboard,
            stats: stats,
            myPosition: myPosition
        });
    } catch (error) {
        console.error('Ошибка получения лидеров:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера' 
        });
    }
});

// API для статистики
app.get('/api/stats', async (req, res) => {
    try {
        const serverStats = userDataManager.getServerStats();
        const activeGamesCount = activeGames.size;
        const onlineUsers = connectedUsers.size;

        res.json({
            success: true,
            stats: {
                totalUsers: serverStats.totalPlayers,
                activeGames: activeGamesCount,
                onlineUsers: onlineUsers,
                totalGames: serverStats.totalGames,
                gamesToday: serverStats.gamesToday,
                topRating: serverStats.topRating
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для гостевого входа с загрузкой данных
app.post('/api/guest/login', async (req, res) => {
    try {
        const { nickname } = req.body;
        
        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Никнейм обязателен'
            });
        }

        if (nickname.length > 15) {
            return res.status(400).json({
                success: false,
                message: 'Никнейм не должен превышать 15 символов'
            });
        }

        // Фильтруем недопустимые символы
        const cleanNickname = nickname.replace(/[<>\"'&]/g, '').trim();
        
        if (cleanNickname.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Никнейм содержит недопустимые символы'
            });
        }

        // Получаем или создаем пользователя
        const userData = await userDataManager.getOrCreateUser(cleanNickname);

        res.json({
            success: true,
            user: userData,
            message: userData.isReturning ? 
                `Добро пожаловать обратно, ${cleanNickname}!` : 
                `Добро пожаловать, ${cleanNickname}!`
        });

    } catch (error) {
        console.error('Ошибка гостевого входа:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// API для обновления настроек пользователя
app.post('/api/user/settings', async (req, res) => {
    try {
        const { nickname, settings } = req.body;
        
        if (!nickname) {
            return res.status(400).json({
                success: false,
                message: 'Никнейм обязателен'
            });
        }

        const success = await userDataManager.updateUserSettings(nickname, settings);
        
        if (success) {
            res.json({
                success: true,
                message: 'Настройки сохранены'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// API для обновления статистики игры
app.post('/api/game/stats', async (req, res) => {
    try {
        const { nickname, gameResult } = req.body;
        
        if (!nickname || !gameResult) {
            return res.status(400).json({
                success: false,
                message: 'Необходимы никнейм и результат игры'
            });
        }

        await userDataManager.updateUserStats(nickname, gameResult);
        
        res.json({
            success: true,
            message: 'Статистика обновлена'
        });

    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// ===== АДМИН API =====

// API для сброса статистики пользователя
app.post('/api/admin/reset-user-stats', async (req, res) => {
    try {
        const { nickname } = req.body;
        
        if (!nickname) {
            return res.status(400).json({
                success: false,
                message: 'Никнейм обязателен'
            });
        }

        const success = await userDataManager.resetUserStats(nickname);
        
        if (success) {
            res.json({
                success: true,
                message: 'Статистика пользователя сброшена'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

    } catch (error) {
        console.error('Ошибка сброса статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// API для удаления пользователя
app.post('/api/admin/delete-user', async (req, res) => {
    try {
        const { nickname } = req.body;
        
        if (!nickname) {
            return res.status(400).json({
                success: false,
                message: 'Никнейм обязателен'
            });
        }

        const success = await userDataManager.deleteUser(nickname);
        
        if (success) {
            res.json({
                success: true,
                message: 'Пользователь удален'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// ===== НОВЫЕ API МАРШРУТЫ АВТОРИЗАЦИИ =====

// Регистрация нового пользователя
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Валидация входных данных
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Все поля обязательны для заполнения'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя должно содержать минимум 3 символа'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Пароль должен содержать минимум 6 символов'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Введите корректный email адрес'
            });
        }

        // Проверяем существование пользователя
        const existingUserByUsername = await User.findOne({ username: username });
        if (existingUserByUsername) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким именем уже существует'
            });
        }

        const existingUserByEmail = await User.findOne({ email: email });
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует'
            });
        }

        // Создаем нового пользователя
        const newUser = new User({
            username: username,
            email: email,
            password: password, // Пароль будет захеширован в схеме
            profile: {
                displayName: username
            }
        });

        await newUser.save();

        console.log(`✅ Новый пользователь зарегистрирован: #${newUser.user_id} (${username})`);

        res.json({
            success: true,
            message: 'Аккаунт успешно создан!',
            user: {
                id: newUser._id,
                user_id: newUser.user_id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Вход в систему
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;

        // Валидация входных данных
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Введите логин и пароль'
            });
        }

        // Поиск пользователя по имени или email
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        // Проверка пароля
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }

        // Обновляем время последнего входа
        user.lastLoginAt = new Date();
        await user.save();

        // Создаем токен (если нужен)
        let token = null;
        if (rememberMe) {
            token = jwt.sign(
                { userId: user._id, username: user.username },
                process.env.JWT_SECRET || 'your-jwt-secret',
                { expiresIn: '30d' }
            );
        }

        console.log(`✅ Пользователь вошел в систему: #${user.user_id} (${user.username})`);

        res.json({
            success: true,
            message: 'Успешный вход в систему!',
            user: {
                id: user._id,
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                nickname: user.profile.displayName || user.username,
                avatar: user.avatar,
                level: user.level,
                stats: user.stats,
                profile: user.profile
            },
            token: token
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// Проверка токена
app.post('/api/auth/verify-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Токен не предоставлен'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                nickname: user.profile.displayName || user.username,
                avatar: user.avatar,
                level: user.level,
                stats: user.stats,
                profile: user.profile
            }
        });

    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(400).json({
            success: false,
            message: 'Недействительный токен'
        });
    }
});

// Восстановление пароля (заглушка)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email обязателен'
            });
        }

        const user = await User.findOne({ email: email });
        
        if (user) {
            // Здесь можно добавить отправку email с инструкциями
            console.log(`📧 Запрос восстановления пароля для: ${email}`);
        }

        // Всегда возвращаем успех для безопасности
        res.json({
            success: true,
            message: 'Если аккаунт с таким email существует, инструкции отправлены на почту'
        });

    } catch (error) {
        console.error('Ошибка восстановления пароля:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// 🚀 НОВАЯ СИСТЕМА КОМНАТ И ОНЛАЙН ИГРЫ
const gameRooms = new Map(); // roomId -> { players: [], game: Game, spectators: [] }
const playerRooms = new Map(); // socketId -> roomId

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('🔌 Новый игрок подключился:', socket.id);

    // === ПОДКЛЮЧЕНИЕ ИГРОКА ===
    socket.on('player-connect', async (data) => {
        try {
            const { user, guestName } = data;
            const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                            socket.handshake.headers['x-real-ip'] || 
                            socket.handshake.address || 
                            socket.conn.remoteAddress || 
                            'unknown';
            const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
            
            let playerData;
            let dbUser = null;
            
            if (user && user.id && !user.id.startsWith('guest_') && mongoose.Types.ObjectId.isValid(user.id)) {
                try {
                    dbUser = await User.findById(user.id);
                    if (dbUser) {
                        dbUser.startSession(clientIP, userAgent);
                        await dbUser.save();
                        
                        playerData = {
                            id: dbUser._id.toString(),
                            socketId: socket.id,
                            user_id: dbUser.user_id,
                            name: dbUser.profile.displayName || dbUser.username,
                            username: dbUser.username,
                            avatar: dbUser.avatar,
                            isGuest: false,
                            stats: dbUser.stats,
                            level: dbUser.level,
                            ip: clientIP
                        };
                        
                        console.log(`✅ Пользователь #${dbUser.user_id} (${dbUser.username}) подключился`);
                    }
                } catch (dbError) {
                    console.warn('⚠️ Ошибка БД, создаем гостя:', dbError.message);
                    playerData = null;
                }
            }
            
            if (!playerData) {
                const name = guestName || user?.name || `Гость_${Date.now()}`;
                playerData = {
                    id: socket.id,
                    socketId: socket.id,
                    user_id: null,
                    name: name,
                    username: name,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                    isGuest: true,
                    stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0 },
                    level: 1,
                    ip: clientIP
                };
                
                console.log(`✅ Гость "${name}" подключился`);
            }

            connectedUsers.set(socket.id, {
                socket,
                player: playerData,
                dbUser: dbUser
            });

            socket.emit('player-connected', {
                success: true,
                player: playerData
            });

            // Статистика
            io.emit('stats-update', {
                onlinePlayers: connectedUsers.size,
                activeGames: activeGames.size
            });

        } catch (error) {
            console.error('❌ Ошибка подключения:', error);
            socket.emit('error', { message: 'Ошибка подключения' });
        }
    });

    // === БЫСТРАЯ ИГРА ===
    socket.on('findGame', () => {
        const userConnection = connectedUsers.get(socket.id);
        if (!userConnection) return;

        const player = userConnection.player;

        // Ищем соперника в очереди
        if (waitingPlayers.length > 0) {
            const opponentConnection = waitingPlayers.shift();
            const opponent = opponentConnection.player;
            
            // Создаем уникальную комнату
            const roomId = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const game = new TicTacToeGame(player, opponent, 'pvp');
            
            const room = {
                id: roomId,
                type: 'quick_game',
                players: [
                    { ...player, symbol: 'X', socketId: socket.id },
                    { ...opponent, symbol: 'O', socketId: opponentConnection.socket.id }
                ],
                game: game,
                createdAt: new Date()
            };

            gameRooms.set(roomId, room);
            activeGames.set(game.id, game);
            
            // Присоединяем к комнате
            socket.join(roomId);
            opponentConnection.socket.join(roomId);
            
            playerRooms.set(socket.id, roomId);
            playerRooms.set(opponentConnection.socket.id, roomId);

            // Отправляем данные обоим игрокам
            socket.emit('gameStart', {
                gameId: game.id,
                roomId: roomId,
                yourSymbol: 'X',
                yourTurn: true,
                opponent: { ...opponent, symbol: 'O' },
                players: room.players,
                board: game.board,
                gameStatus: game.gameStatus
            });

            opponentConnection.socket.emit('gameStart', {
                gameId: game.id,
                roomId: roomId,
                yourSymbol: 'O', 
                yourTurn: false,
                opponent: { ...player, symbol: 'X' },
                players: room.players,
                board: game.board,
                gameStatus: game.gameStatus
            });

            console.log(`🎮 Быстрая игра: ${player.name} (X) vs ${opponent.name} (O) [${roomId}]`);
        } else {
            // Добавляем в очередь
            waitingPlayers.push(userConnection);
            socket.emit('searching', { 
                message: 'Ищем соперника...', 
                playersInQueue: waitingPlayers.length 
            });
            console.log(`🔍 ${player.name} в очереди поиска (позиция: ${waitingPlayers.length})`);
        }
    });

    // === СОЗДАНИЕ ПРИВАТНОЙ КОМНАТЫ ===
    socket.on('createRoom', (data) => {
        const userConnection = connectedUsers.get(socket.id);
        if (!userConnection) return;

        const player = userConnection.player;
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roomId = `private_${roomCode}`;
        
        const room = {
            id: roomId,
            code: roomCode,
            type: 'private_room',
            name: data.name || `Комната ${player.name}`,
            host: player,
            players: [{ ...player, symbol: 'X', socketId: socket.id, ready: false }],
            password: data.password || null,
            maxPlayers: 2,
            game: null,
            createdAt: new Date(),
            isPublic: !data.password // Комната публичная если нет пароля
        };

        gameRooms.set(roomId, room);
        privateRooms.set(roomCode, room);
        socket.join(roomId);
        playerRooms.set(socket.id, roomId);

        socket.emit('roomCreated', {
            success: true,
            code: roomCode,
            name: room.name,
            room: {
                code: roomCode,
                name: room.name,
                players: room.players,
                maxPlayers: room.maxPlayers,
                hasPassword: !!room.password,
                isPublic: room.isPublic
            }
        });

        // Обновляем список публичных комнат для всех
        broadcastPublicRooms();
        
        console.log(`🚪 ${room.isPublic ? 'Публичная' : 'Приватная'} комната "${room.name}" создана [${roomCode}]`);
    });

    // === ПРИСОЕДИНЕНИЕ К ПРИВАТНОЙ КОМНАТЕ ===
    socket.on('joinRoom', (data) => {
        const userConnection = connectedUsers.get(socket.id);
        if (!userConnection) return;

        const player = userConnection.player;
        const room = privateRooms.get(data.code);

        if (!room) {
            socket.emit('roomError', { message: 'Комната не найдена' });
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            socket.emit('roomError', { message: 'Комната заполнена' });
            return;
        }

        if (room.password && room.password !== data.password) {
            socket.emit('roomError', { message: 'Неверный пароль' });
            return;
        }

        // Добавляем игрока
        room.players.push({ ...player, symbol: 'O', socketId: socket.id, ready: false });
        socket.join(room.id);
        playerRooms.set(socket.id, room.id);

        // Уведомляем всех в комнате
        io.to(room.id).emit('roomUpdated', {
            room: {
                code: room.code,
                name: room.name,
                players: room.players,
                maxPlayers: room.maxPlayers,
                hasPassword: !!room.password
            }
        });

        socket.emit('roomJoined', {
            success: true,
            code: room.code,
            name: room.name,
            room: {
                code: room.code,
                name: room.name,
                players: room.players,
                maxPlayers: room.maxPlayers,
                hasPassword: !!room.password
            }
        });

        console.log(`👤 ${player.name} присоединился к комнате [${data.code}]`);

        // Если комната заполнена, можно начать игру
        if (room.players.length === 2) {
            // Автоматически начинаем игру
            const game = new TicTacToeGame(room.players[0], room.players[1], 'pvp');
            room.game = game;
            activeGames.set(game.id, game);

            // Отправляем всем в комнате
            io.to(room.id).emit('gameStart', {
                gameId: game.id,
                roomId: room.id,
                players: room.players,
                board: game.board,
                gameStatus: game.gameStatus,
                currentPlayer: game.currentPlayer
            });

            // Отправляем индивидуально каждому
            room.players.forEach((roomPlayer, index) => {
                const playerSocket = connectedUsers.get(roomPlayer.socketId)?.socket;
                if (playerSocket) {
                    playerSocket.emit('gameStart', {
                        gameId: game.id,
                        roomId: room.id,
                        yourSymbol: roomPlayer.symbol,
                        yourTurn: roomPlayer.symbol === 'X',
                        opponent: room.players[index === 0 ? 1 : 0],
                        players: room.players,
                        board: game.board,
                        gameStatus: game.gameStatus
                    });
                }
            });

            console.log(`🎮 Игра началась в приватной комнате [${room.code}]`);
        }
    });

    // === ЗАПРОС СПИСКА ПУБЛИЧНЫХ КОМНАТ ===
    socket.on('getPublicRooms', () => {
        const publicRooms = getPublicRoomsList();
        socket.emit('publicRoomsList', publicRooms);
    });

    // === ОБНОВЛЕНИЕ СПИСКА КОМНАТ ===
    socket.on('refreshRooms', () => {
        const publicRooms = getPublicRoomsList();
        socket.emit('publicRoomsList', publicRooms);
    });

    // Начало игры с ИИ
    socket.on('start-ai-game', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const aiPlayer = {
            id: 'ai-' + data.difficulty,
            name: `ИИ (${data.difficulty})`,
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ai',
            isAI: true,
            difficulty: data.difficulty
        };

        const game = new TicTacToeGame(user.player, aiPlayer, 'ai', data.difficulty);
        activeGames.set(game.id, game);

        socket.join(game.id);
        socket.emit('ai-game-started', {
            gameId: game.id,
            aiPlayer,
            difficulty: data.difficulty,
            difficultyInfo: game.ai.getDifficultyDescription()
        });
    });

    // === ХОД В ИГРЕ ===
    socket.on('make-move', async (data) => {
        const userConnection = connectedUsers.get(socket.id);
        if (!userConnection) return;

        const player = userConnection.player;
        const roomId = playerRooms.get(socket.id);
        const room = gameRooms.get(roomId);
        
        if (!room || !room.game) {
            console.log(`❌ Комната не найдена для игрока ${player.name}`);
            return;
        }

        const game = room.game;

        // Находим игрока в комнате и получаем его символ
        const roomPlayer = room.players.find(p => p.socketId === socket.id);
        if (!roomPlayer) {
            console.log(`❌ Игрок ${player.name} не найден в комнате ${roomId}`);
            return;
        }

        const playerSymbol = roomPlayer.symbol;

        // Проверяем, чей сейчас ход
        if (game.currentPlayer !== playerSymbol) {
            socket.emit('move-error', { 
                message: 'Сейчас не ваш ход!',
                currentPlayer: game.currentPlayer 
            });
            return;
        }

        // Выполняем ход
        const moveResult = game.makeMove(playerSymbol, data.position);
        
        if (moveResult.success) {
            // Отправляем обновление ВСЕМ в комнате
            io.to(roomId).emit('move-made', {
                position: data.position,
                symbol: playerSymbol,
                playerName: player.name,
                board: game.board,
                currentPlayer: game.currentPlayer,
                gameStatus: game.gameStatus,
                winner: game.winner,
                gameId: game.id
            });

            console.log(`🎯 Ход: ${player.name} (${playerSymbol}) -> позиция ${data.position} [${roomId}]`);

            // Если игра закончена
            if (game.gameStatus === 'finished') {
                // Отправляем результат игры
                const gameResult = {
                    gameId: game.id,
                    winner: game.winner,
                    players: room.players,
                    finalBoard: game.board
                };

                io.to(roomId).emit('game-finished', gameResult);

                // Обновляем статистику игроков
                await updatePlayerStats(game);
                
                // Обновляем счетчик игр в сессии
                if (userConnection.dbUser) {
                    userConnection.dbUser.addGameToSession();
                    await userConnection.dbUser.save();
                }
                
                // Очищаем игру из активных
                activeGames.delete(game.id);
                
                // Очищаем комнату через 30 секунд
                setTimeout(() => {
                    gameRooms.delete(roomId);
                    room.players.forEach(p => {
                        playerRooms.delete(p.socketId);
                    });
                    // Обновляем список публичных комнат
                    broadcastPublicRooms();
                    console.log(`🧹 Комната ${roomId} очищена`);
                }, 30000);

                let resultMessage = '';
                if (game.winner.winner) {
                    const winnerPlayer = room.players.find(p => p.symbol === game.winner.winner);
                    resultMessage = `🏆 Победил: ${winnerPlayer.name} (${game.winner.winner})`;
                } else {
                    resultMessage = '🤝 Ничья!';
                }
                console.log(`🎮 Игра завершена: ${resultMessage} [${roomId}]`);
            }
        } else {
            // Ошибка хода
            socket.emit('move-error', { 
                message: moveResult.error || 'Неверный ход',
                position: data.position 
            });
            console.log(`❌ Неверный ход от ${player.name}: ${moveResult.error}`);
        }
    });

    // Подсказка для игры с ИИ
    socket.on('get-hint', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const game = activeGames.get(data.gameId);
        if (!game || game.gameMode !== 'ai') return;

        const hint = game.getHint('X'); // Игрок всегда X против ИИ
        if (hint) {
            socket.emit('hint-received', hint);
        }
    });

    // === ОТМЕНА ПОИСКА ===
    socket.on('cancel-search', () => {
        const userIndex = waitingPlayers.findIndex(p => p.socket.id === socket.id);
        if (userIndex > -1) {
            const userConnection = waitingPlayers[userIndex];
            waitingPlayers.splice(userIndex, 1);
            
            socket.emit('search-cancelled', { 
                message: 'Поиск игры отменен',
                success: true 
            });
            
            console.log(`❌ ${userConnection.player.name} отменил поиск игры`);
        }
    });

    // ===== АДМИНСКИЕ КОМАНДЫ =====
    
    // Админские действия
    socket.on('admin_action', (data) => {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.player.isAdmin) {
            console.log(`❌ Отклонено админ действие от неавторизованного пользователя: ${socket.id}`);
            return;
        }
        
        console.log(`🔥 Админ действие: ${data.action} от ${user.player.name}`);
        handleAdminAction(socket, data.action, data.data);
    });
    
    // Запрос списка пользователей для админки
    socket.on('admin_get_users', () => {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.player.isAdmin) return;
        
        const onlineUsers = getAllUsers();
        const allUsers = userDataManager.getAllUsers();
        
        socket.emit('admin_users_list', {
            online: onlineUsers,
            all: allUsers,
            stats: userDataManager.getServerStats()
        });
    });
    
    // Запрос статистики для админки
    socket.on('admin_get_stats', () => {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.player.isAdmin) return;
        
        const stats = {
            onlinePlayers: connectedUsers.size,
            activeGames: activeGames.size
        };
        socket.emit('admin_stats_update', stats);
    });
    
    // Активация админских прав
    socket.on('admin_activate', (data) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            user.player.isAdmin = true;
            console.log(`🔥 Пользователь ${user.player.name} активировал админ права`);
        }
    });

    // === ОТКЛЮЧЕНИЕ ИГРОКА ===
    socket.on('disconnect', async () => {
        console.log('💔 Игрок отключился:', socket.id);
        
        const userConnection = connectedUsers.get(socket.id);
        
        if (userConnection) {
            const player = userConnection.player;
            
            // Обрабатываем отключение в активной игре
            const roomId = playerRooms.get(socket.id);
            if (roomId) {
                const room = gameRooms.get(roomId);
                if (room && room.game && room.game.gameStatus === 'playing') {
                    // Уведомляем соперника об отключении
                    socket.to(roomId).emit('opponent-disconnected', {
                        message: `${player.name} отключился от игры`,
                        disconnectedPlayer: player.name,
                        gameId: room.game.id
                    });
                    
                    // Завершаем игру
                    room.game.gameStatus = 'finished';
                    room.game.winner = { 
                        winner: room.players.find(p => p.socketId !== socket.id)?.symbol || null,
                        reason: 'opponent_disconnected'
                    };
                    
                    console.log(`🔌 Игра ${room.game.id} завершена из-за отключения ${player.name}`);
                }
                
                // Очищаем ссылки на игрока
                playerRooms.delete(socket.id);
                if (room) {
                    room.players = room.players.filter(p => p.socketId !== socket.id);
                    if (room.players.length === 0) {
                        gameRooms.delete(roomId);
                        if (room.game) {
                            activeGames.delete(room.game.id);
                        }
                        if (room.code) {
                            privateRooms.delete(room.code);
                        }
                        console.log(`🧹 Пустая комната ${roomId} удалена`);
                    }
                    // Обновляем список публичных комнат
                    broadcastPublicRooms();
                }
            }
            
            // Завершаем сессию в БД
            if (userConnection.dbUser) {
                try {
                    userConnection.dbUser.endSession();
                    await userConnection.dbUser.save();
                    console.log(`📊 Сессия завершена для #${player.user_id} (${player.username})`);
                } catch (error) {
                    console.error('❌ Ошибка завершения сессии:', error);
                }
            }
            
            console.log(`👋 ${player.name} покинул сервер`);
        }
        
        // Удаляем из списка подключенных
        connectedUsers.delete(socket.id);
        
        // Удаляем из очереди поиска
        const waitingIndex = waitingPlayers.findIndex(p => p.socket.id === socket.id);
        if (waitingIndex > -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }

        // Обновляем статистику
        io.emit('stats-update', {
            onlinePlayers: connectedUsers.size,
            activeGames: gameRooms.size
        });
    });
});

// ===== ФУНКЦИИ УПРАВЛЕНИЯ КОМНАТАМИ =====

// Получение списка публичных комнат
function getPublicRoomsList() {
    const publicRooms = [];
    
    for (let [roomId, room] of gameRooms.entries()) {
        if (room.isPublic && room.players.length < room.maxPlayers && !room.game) {
            const timeSinceCreated = Math.floor((Date.now() - room.createdAt.getTime()) / 1000);
            
            publicRooms.push({
                id: room.id,
                code: room.code,
                name: room.name,
                host: {
                    name: room.host.name,
                    avatar: room.host.avatar,
                    level: room.host.level || 1
                },
                players: room.players.length,
                maxPlayers: room.maxPlayers,
                hasPassword: !!room.password,
                isPublic: room.isPublic,
                createdAt: room.createdAt,
                timeAgo: formatTimeAgo(timeSinceCreated),
                level: determineRoomLevel(room.host)
            });
        }
    }
    
    // Сортируем по времени создания (новые сначала)
    return publicRooms.sort((a, b) => b.createdAt - a.createdAt);
}

// Рассылка списка публичных комнат всем пользователям
function broadcastPublicRooms() {
    const publicRooms = getPublicRoomsList();
    io.emit('publicRoomsList', publicRooms);
}

// Определение уровня комнаты на основе хоста
function determineRoomLevel(host) {
    const level = host.level || 1;
    const rating = host.rating || 1000;
    
    if (rating >= 1500 || level >= 10) return 'Эксперт';
    if (rating >= 1200 || level >= 5) return 'Продвинутый';
    if (rating >= 1000 || level >= 3) return 'Средний';
    return 'Новичок';
}

// Форматирование времени "назад"
function formatTimeAgo(seconds) {
    if (seconds < 60) return `${seconds} сек назад`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ч назад`;
}

// Очистка пустых и неактивных комнат
function cleanupRooms() {
    const now = Date.now();
    const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 минут
    
    for (let [roomId, room] of gameRooms.entries()) {
        // Удаляем пустые комнаты старше 30 минут
        if (room.players.length === 0 && (now - room.createdAt.getTime()) > ROOM_TIMEOUT) {
            gameRooms.delete(roomId);
            if (room.code) {
                privateRooms.delete(room.code);
            }
            console.log(`🧹 Удалена неактивная комната: ${room.name} [${room.code}]`);
        }
    }
    
    // Обновляем список комнат после очистки
    broadcastPublicRooms();
}

// Запускаем очистку комнат каждые 5 минут
setInterval(cleanupRooms, 5 * 60 * 1000);

// ===== АДМИНСКИЕ ФУНКЦИИ =====

// Функция обработки админских действий
function handleAdminAction(adminSocket, action, data) {
    console.log(`🔥 Выполнение админ действия: ${action}`);
    
    switch(action) {
        case 'screamer':
            if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_screamer', {
                            duration: data.duration || 5000,
                            video: true
                        });
                        console.log(`💀 Скример отправлен пользователю: ${targetConnection.player.name}`);
                    }
                });
            }
            break;

        case 'mega_screamer':
            if (data.targets === 'all') {
                io.emit('admin_mega_screamer', {
                    duration: data.duration || 10000,
                    videoFile: data.videoFile || 'assets/scrim/НЕ ТРОГАТЬ ЕГО НЕ ИСПОЛЬЗОВАТЬ.mp4',
                    intensity: 'maximum'
                });
                console.log(`☠️ МЕГА СКРИМЕР запущен для ВСЕХ пользователей на ${data.duration/1000}с`);
            } else if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_mega_screamer', {
                            duration: data.duration || 10000,
                            videoFile: data.videoFile || 'assets/scrim/НЕ ТРОГАТЬ ЕГО НЕ ИСПОЛЬЗОВАТЬ.mp4',
                            intensity: 'maximum'
                        });
                        console.log(`☠️ МЕГА СКРИМЕР отправлен пользователю: ${targetConnection.player.name}`);
                    }
                });
            }
            break;
            
        case 'lag':
            if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_lag', {
                            intensity: data.intensity || 3,
                            duration: 10000
                        });
                        console.log(`🐌 Лаги активированы для: ${targetConnection.player.name}`);
                    }
                });
            }
            break;
            
        case 'disconnect':
            if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_disconnect', {
                            message: 'Вы были отключены администратором'
                        });
                        console.log(`🚫 Отключаем пользователя: ${targetConnection.player.name}`);
                        setTimeout(() => {
                            targetConnection.socket.disconnect();
                        }, 2000);
                    }
                });
            }
            break;
            
        case 'fake_win':
            if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_fake_win', {
                            message: data.message || 'Поздравляем с победой!'
                        });
                        console.log(`🎉 Фейковая победа отправлена: ${targetConnection.player.name}`);
                    }
                });
            }
            break;
            
        case 'announce':
            if (data.targets === 'all') {
                io.emit('admin_announcement', {
                    message: data.message
                });
                console.log(`📢 Массовое объявление: ${data.message}`);
            } else if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_announcement', {
                            message: data.message
                        });
                        console.log(`📢 Объявление для ${targetConnection.player.name}: ${data.message}`);
                    }
                });
            }
            break;
            
        case 'clear_effects':
            if (data.targets === 'all') {
                io.emit('admin_clear_effects');
                console.log(`🧹 Очистка всех эффектов`);
            } else if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_clear_effects');
                    }
                });
            }
            break;
            
        case 'maintenance':
            io.emit('admin_maintenance', {
                enabled: data.enabled
            });
            console.log(`🔧 Режим обслуживания ${data.enabled ? 'включен' : 'выключен'}`);
            break;
            
        case 'restart_server':
            io.emit('admin_server_restart', {
                message: 'Сервер перезагружается через 10 секунд...'
            });
            console.log(`♻️ Перезагрузка сервера через 10 секунд...`);
            setTimeout(() => {
                process.exit(0);
            }, 10000);
            break;
            
        // Спецэффекты
        case 'rainbow':
        case 'shake':
        case 'snow':
        case 'fireworks':
        case 'matrix':
        case 'disco':
        case 'glitch':
        case 'upside_down':
            if (data.targets && Array.isArray(data.targets)) {
                data.targets.forEach(targetId => {
                    const targetConnection = connectedUsers.get(targetId);
                    if (targetConnection) {
                        targetConnection.socket.emit('admin_effect', {
                            effect: action,
                            data: data
                        });
                        console.log(`✨ Эффект "${action}" применен к: ${targetConnection.player.name}`);
                    }
                });
            }
            break;
            
        default:
            console.log(`❓ Неизвестное админ действие: ${action}`);
            break;
    }
}

// Функция получения всех пользователей для админки
function getAllUsers() {
    const users = [];
    for (let [socketId, connection] of connectedUsers) {
        const player = connection.player;
        users.push({
            id: socketId,
            name: player.name,
            user_id: player.user_id,
            avatar: player.avatar || 'icons/gameIcons/PNG/Black/1x/button1.png',
            ip: connection.socket.handshake.address,
            level: player.level || 1,
            isGuest: player.isGuest !== false
        });
    }
    return users;
}

// Функция обновления статистики игроков
async function updatePlayerStats(game) {
    try {
        if (game.gameMode === 'ai') {
            // Обновляем статистику только для человека
            const player = game.players.X;
            if (!player.isGuest) {
                const user = await User.findById(player.id);
                if (user) {
                    let result;
                    if (game.winner?.winner === 'X') result = 'win';
                    else if (game.winner?.winner === 'O') result = 'loss';
                    else result = 'draw';

                    user.updateStats(result, 'ai');
                    await user.save();
                }
            }
        } else if (game.gameMode === 'pvp') {
            // Обновляем статистику для обоих игроков
            const playerX = game.players.X;
            const playerO = game.players.O;

            if (!playerX.isGuest) {
                const userX = await User.findById(playerX.id);
                if (userX) {
                    let result;
                    if (game.winner?.winner === 'X') result = 'win';
                    else if (game.winner?.winner === 'O') result = 'loss';
                    else result = 'draw';

                    userX.updateStats(result, 'player');
                    await userX.save();
                }
            }

            if (!playerO.isGuest) {
                const userO = await User.findById(playerO.id);
                if (userO) {
                    let result;
                    if (game.winner?.winner === 'O') result = 'win';
                    else if (game.winner?.winner === 'X') result = 'loss';
                    else result = 'draw';

                    userO.updateStats(result, 'player');
                    await userO.save();
                }
            }
        }
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Обслуживание статических файлов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера для локальной сети
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Прослушивание на всех интерфейсах

server.listen(PORT, HOST, () => {
    console.log('🔥'.repeat(50));
    console.log('🚀 KRESTIKI Online - Сервер запущен!');
    console.log('🔥'.repeat(50));
    console.log(`📡 Порт: ${PORT}`);
    console.log(`🌐 Хост: ${HOST} (все сетевые интерфейсы)`);
    console.log('');
    console.log('🎮 АДРЕСА ДЛЯ ПОДКЛЮЧЕНИЯ:');
    console.log(`   📍 Локально: http://localhost:${PORT}`);
    console.log(`   📍 По IP: http://[ВАШ_IP]:${PORT}`);
    console.log(`   📍 RadMin: http://[RADMIN_IP]:${PORT}`);
    console.log('');
    console.log('🔧 НАСТРОЙКА РАДМИН:');
    console.log('   1️⃣ Подключитесь через RadMin VPN');
    console.log('   2️⃣ Узнайте IP второго ПК в сети RadMin');
    console.log(`   3️⃣ Откройте http://[IP_РАДМИН]:${PORT}`);
    console.log('   4️⃣ Наслаждайтесь игрой! 🎯');
    console.log('');
    console.log('📱 ВОЗМОЖНОСТИ ИГРЫ:');
    console.log('  ✅ Уникальные ID пользователей (начиная с 1)');
    console.log('  ✅ Полная история регистрации и сессий');
    console.log('  ✅ Игра против ИИ (4 уровня сложности)');
    console.log('  ✅ Онлайн мультиплеер через сеть');
    console.log('  ✅ Приватные комнаты');
    console.log('  ✅ Админ панель с троллинг функциями');
    console.log('  ✅ Профили и детальная статистика');
    console.log('  ✅ Система рейтингов и достижений');
    console.log('  ✅ Современный минималистичный дизайн');
    console.log('  ✅ Скример с видео и звуком');
    console.log('');
    console.log('🔒 АДМИН ПАНЕЛЬ:');
    console.log('   🔑 Секретный код: "admin-start"');
    console.log('   📍 Ввод в левом верхнем углу сайта');
    console.log('');
    console.log('🔥'.repeat(50));
}); 