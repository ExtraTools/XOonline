const fs = require('fs').promises;
const path = require('path');

class UserDataManager {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/users.json');
        this.users = {};
        this.stats = {
            totalUsers: 0,
            gamesPlayed: 0,
            lastUpdate: null
        };
        this.loadData();
    }

    // Загрузка данных из файла
    async loadData() {
        try {
            // Убеждаемся что папка data существует
            const dataDir = path.dirname(this.dataPath);
            await fs.mkdir(dataDir, { recursive: true });

            const data = await fs.readFile(this.dataPath, 'utf8');
            const parsedData = JSON.parse(data);
            
            this.users = parsedData.users || {};
            this.stats = parsedData.stats || {
                totalUsers: 0,
                gamesPlayed: 0,
                lastUpdate: null
            };

            console.log(`💾 Загружено ${Object.keys(this.users).length} пользователей`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📄 Файл данных не найден, создаю новый...');
                await this.saveData();
            } else {
                console.error('❌ Ошибка загрузки данных пользователей:', error);
            }
        }
    }

    // Сохранение данных в файл
    async saveData() {
        try {
            const dataToSave = {
                users: this.users,
                stats: {
                    ...this.stats,
                    lastUpdate: new Date().toISOString()
                }
            };

            await fs.writeFile(this.dataPath, JSON.stringify(dataToSave, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователей:', error);
        }
    }

    // Получение или создание пользователя по нику
    async getOrCreateUser(nickname) {
        const normalizedNick = nickname.toLowerCase().trim();
        
        if (this.users[normalizedNick]) {
            console.log(`🟢 Загружен пользователь: ${nickname}`);
            return {
                ...this.users[normalizedNick],
                nickname: nickname, // Оригинальное написание
                isReturning: true
            };
        } else {
            console.log(`🆕 Создан новый пользователь: ${nickname}`);
            const newUser = this.createNewUser(nickname);
            this.users[normalizedNick] = newUser;
            this.stats.totalUsers++;
            await this.saveData();
            
            return {
                ...newUser,
                isReturning: false
            };
        }
    }

    // Создание нового пользователя
    createNewUser(nickname) {
        return {
            nickname: nickname,
            registrationDate: new Date().toISOString(),
            lastLoginDate: new Date().toISOString(),
            
            // Игровая статистика
            level: 1,
            experience: 0,
            rating: 1000,
            
            // Статистика игр
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesDraw: 0,
            winStreak: 0,
            bestWinStreak: 0,
            
            // Статистика по режимам
            localGames: 0,
            aiGames: 0,
            onlineGames: 0,
            
            // Статистика ИИ
            aiWins: { easy: 0, medium: 0, hard: 0, impossible: 0 },
            aiLosses: { easy: 0, medium: 0, hard: 0, impossible: 0 },
            
            // Достижения
            achievements: [],
            
            // Настройки
            settings: {
                soundEnabled: true,
                musicEnabled: false,
                darkTheme: false,
                animationsEnabled: true,
                autoSave: true,
                showHints: false
            },

            // Аватар
            avatar: '/icons/gameIcons/PNG/Black/1x/button1.png',
            
            // Временные данные
            totalPlayTime: 0, // в секундах
            averageGameTime: 0,
            fastestWin: 0,
            
            // IP информация
            lastIP: null,
            isGuest: true
        };
    }

    // Обновление статистики пользователя
    async updateUserStats(nickname, gameResult) {
        const normalizedNick = nickname.toLowerCase().trim();
        const user = this.users[normalizedNick];
        
        if (!user) {
            console.error(`❌ Пользователь ${nickname} не найден для обновления статистики`);
            return;
        }

        // Обновляем основную статистику
        user.gamesPlayed++;
        user.lastLoginDate = new Date().toISOString();
        this.stats.gamesPlayed++;

        // Обновляем результат игры
        if (gameResult.isWin) {
            user.gamesWon++;
            user.winStreak++;
            user.bestWinStreak = Math.max(user.bestWinStreak, user.winStreak);
            user.experience += 10;
            user.rating += this.calculateRatingChange(true, user.rating);
        } else if (gameResult.isDraw) {
            user.gamesDraw++;
            user.experience += 3;
        } else {
            user.gamesLost++;
            user.winStreak = 0;
            user.rating += this.calculateRatingChange(false, user.rating);
        }

        // Обновляем статистику по режимам
        switch (gameResult.gameMode) {
            case 'local':
                user.localGames++;
                break;
            case 'ai':
                user.aiGames++;
                if (gameResult.difficulty) {
                    if (gameResult.isWin) {
                        user.aiWins[gameResult.difficulty]++;
                    } else if (!gameResult.isDraw) {
                        user.aiLosses[gameResult.difficulty]++;
                    }
                }
                break;
            case 'online':
                user.onlineGames++;
                break;
        }

        // Время игры
        if (gameResult.gameTime) {
            user.totalPlayTime += gameResult.gameTime;
            user.averageGameTime = Math.round(user.totalPlayTime / user.gamesPlayed);
            
            if (gameResult.isWin) {
                if (user.fastestWin === 0 || gameResult.gameTime < user.fastestWin) {
                    user.fastestWin = gameResult.gameTime;
                }
            }
        }

        // Обновляем уровень
        user.level = Math.floor(user.experience / 100) + 1;

        // Проверяем достижения
        this.checkAchievements(user);

        // Сохраняем рейтинг в рамках
        user.rating = Math.max(0, Math.min(3000, user.rating));

        await this.saveData();
        console.log(`💾 Обновлена статистика ${nickname}: Рейтинг ${user.rating}, Уровень ${user.level}`);
    }

    // Расчет изменения рейтинга
    calculateRatingChange(isWin, currentRating) {
        const baseChange = 25;
        const ratingFactor = currentRating < 1000 ? 1.5 : currentRating > 2000 ? 0.7 : 1.0;
        
        if (isWin) {
            return Math.round(baseChange * ratingFactor);
        } else {
            return -Math.round(baseChange * ratingFactor * 0.8);
        }
    }

    // Проверка достижений
    checkAchievements(user) {
        const achievements = [];

        // Достижения за игры
        if (user.gamesPlayed >= 10 && !user.achievements.includes('first_steps')) {
            achievements.push('first_steps');
        }
        if (user.gamesPlayed >= 100 && !user.achievements.includes('experienced')) {
            achievements.push('experienced');
        }

        // Достижения за побеждения
        if (user.gamesWon >= 10 && !user.achievements.includes('winner')) {
            achievements.push('winner');
        }
        if (user.gamesWon >= 50 && !user.achievements.includes('champion')) {
            achievements.push('champion');
        }

        // Достижения за серии побед
        if (user.bestWinStreak >= 5 && !user.achievements.includes('streak_master')) {
            achievements.push('streak_master');
        }
        if (user.bestWinStreak >= 10 && !user.achievements.includes('unstoppable')) {
            achievements.push('unstoppable');
        }

        // Достижения за рейтинг
        if (user.rating >= 1500 && !user.achievements.includes('expert')) {
            achievements.push('expert');
        }
        if (user.rating >= 2000 && !user.achievements.includes('master')) {
            achievements.push('master');
        }

        // Достижения за ИИ
        const totalAIWins = Object.values(user.aiWins).reduce((sum, wins) => sum + wins, 0);
        if (totalAIWins >= 20 && !user.achievements.includes('ai_slayer')) {
            achievements.push('ai_slayer');
        }

        // Добавляем новые достижения
        achievements.forEach(achievement => {
            if (!user.achievements.includes(achievement)) {
                user.achievements.push(achievement);
                console.log(`🎖️ ${user.nickname} получил достижение: ${achievement}`);
            }
        });
    }

    // Обновление настроек пользователя
    async updateUserSettings(nickname, settings) {
        const normalizedNick = nickname.toLowerCase().trim();
        const user = this.users[normalizedNick];
        
        if (user) {
            user.settings = { ...user.settings, ...settings };
            await this.saveData();
            console.log(`⚙️ Обновлены настройки ${nickname}`);
            return true;
        }
        return false;
    }

    // Получение топ игроков
    getLeaderboard(period = 'all-time', limit = 50, ratingFilter = 'all') {
        const users = Object.values(this.users);
        
        // Фильтруем по рейтингу
        let filteredUsers = users;
        switch (ratingFilter) {
            case 'beginner':
                filteredUsers = users.filter(u => u.rating < 500);
                break;
            case 'amateur':
                filteredUsers = users.filter(u => u.rating >= 500 && u.rating < 1000);
                break;
            case 'expert':
                filteredUsers = users.filter(u => u.rating >= 1000 && u.rating < 1500);
                break;
            case 'master':
                filteredUsers = users.filter(u => u.rating >= 1500 && u.rating < 2000);
                break;
            case 'legend':
                filteredUsers = users.filter(u => u.rating >= 2000);
                break;
        }

        // Сортируем по рейтингу
        const sortedUsers = filteredUsers
            .filter(user => user.gamesPlayed > 0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);

        return sortedUsers.map(user => ({
            name: user.nickname,
            rating: user.rating,
            games: user.gamesPlayed,
            winRate: user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0,
            avatar: user.avatar
        }));
    }

    // Получение позиции пользователя в рейтинге
    getUserRank(nickname) {
        const normalizedNick = nickname.toLowerCase().trim();
        const user = this.users[normalizedNick];
        
        if (!user) return null;

        const allUsers = Object.values(this.users)
            .filter(u => u.gamesPlayed > 0)
            .sort((a, b) => b.rating - a.rating);

        const rank = allUsers.findIndex(u => u.nickname.toLowerCase() === normalizedNick) + 1;
        
        return {
            rank: rank || null,
            rating: user.rating,
            totalPlayers: allUsers.length
        };
    }

    // Получение статистики сервера
    getServerStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayGames = Object.values(this.users).reduce((sum, user) => {
            const lastLogin = new Date(user.lastLoginDate);
            return lastLogin >= today ? sum + user.gamesPlayed : sum;
        }, 0);

        const topRating = Math.max(...Object.values(this.users).map(u => u.rating), 0);

        return {
            totalPlayers: this.stats.totalUsers,
            gamesToday: todayGames,
            totalGames: this.stats.gamesPlayed,
            topRating: topRating
        };
    }

    // Административные функции
    async deleteUser(nickname) {
        const normalizedNick = nickname.toLowerCase().trim();
        if (this.users[normalizedNick]) {
            delete this.users[normalizedNick];
            this.stats.totalUsers--;
            await this.saveData();
            return true;
        }
        return false;
    }

    async resetUserStats(nickname) {
        const normalizedNick = nickname.toLowerCase().trim();
        const user = this.users[normalizedNick];
        
        if (user) {
            const originalNick = user.nickname;
            const originalSettings = user.settings;
            const originalDates = {
                registrationDate: user.registrationDate,
                lastIP: user.lastIP
            };
            
            this.users[normalizedNick] = {
                ...this.createNewUser(originalNick),
                settings: originalSettings,
                ...originalDates
            };
            
            await this.saveData();
            return true;
        }
        return false;
    }

    // Получение всех пользователей для админ панели
    getAllUsers() {
        return Object.values(this.users).map(user => ({
            nickname: user.nickname,
            level: user.level,
            rating: user.rating,
            gamesPlayed: user.gamesPlayed,
            winRate: user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0,
            lastLogin: user.lastLoginDate,
            isGuest: user.isGuest,
            lastIP: user.lastIP
        }));
    }
}

module.exports = UserDataManager; 