// ===== DINOSGAMES - МИНИМАЛИСТИЧНОЕ ЛОББИ =====
console.log('📜 script.js загружается...');

// Глобальные функции для совместимости с HTML (объявляем сразу)
let app = null;
console.log('🌍 Глобальные функции определены');

function showAuth(mode) {
    console.log('🔐 showAuth вызвана, режим:', mode);
    if (app) {
        app.showAuth(mode);
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

function hideAuth() {
    console.log('🚪 hideAuth вызвана');
    if (app) {
        app.hideAuth();
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

function switchAuthMode() {
    console.log('🔄 switchAuthMode вызвана');
    if (app) {
        app.switchAuthMode();
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

function logout() {
    console.log('👋 logout вызвана');
    if (app) {
        app.logout();
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

function playGame(gameType) {
    console.log('🎮 playGame вызвана, тип игры:', gameType);
    if (app) {
        app.playGame(gameType);
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

function backToGames() {
    console.log('↩️ backToGames вызвана');
    if (app) {
        app.backToGames();
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

function playSound(type) {
    console.log('🔊 playSound вызвана, тип:', type);
    if (app) {
        app.playSound(type);
    } else {
        console.warn('⚠️ app еще не инициализирован');
    }
}

class DinosGamesApp {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authMode = 'login';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadGameStats();
        this.handleAudioErrors();
    }

    setupEventListeners() {
        // Авторизация
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Закрытие модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAuth();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAuth();
            }
        });
    }

    checkAuthStatus() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                this.showUserProfile();
                this.updateGameStats();
            } catch (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
                localStorage.removeItem('userData');
            }
        } else {
            this.showLoginButton();
        }
    }

    showUserProfile() {
        const loginButton = document.getElementById('login-button');
        const userProfile = document.getElementById('user-profile');

        if (loginButton) loginButton.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            
            document.getElementById('user-name').textContent = this.currentUser.username || this.currentUser.name;
            document.getElementById('user-level').textContent = `Уровень ${this.currentUser.level || 1}`;
            document.getElementById('user-avatar').src = this.currentUser.avatar || 
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.currentUser.username || 'user'}`;
        }
    }

    showLoginButton() {
        const loginButton = document.getElementById('login-button');
        const userProfile = document.getElementById('user-profile');

        if (userProfile) userProfile.style.display = 'none';
        if (loginButton) loginButton.style.display = 'flex';
    }

    updateGameStats() {
        if (!this.currentUser) return;

        const stats = this.currentUser.gameStats?.ticTacToe || this.currentUser.stats || {};
        
        const tttGames = document.getElementById('ttt-games');
        const tttWins = document.getElementById('ttt-wins');

        if (tttGames) tttGames.textContent = stats.gamesPlayed || 0;
        if (tttWins) tttWins.textContent = stats.gamesWon || 0;
    }

    loadGameStats() {
        if (!this.isAuthenticated) {
            const guestStats = {
                games: 0,
                wins: 0
            };

            const tttGames = document.getElementById('ttt-games');
            const tttWins = document.getElementById('ttt-wins');

            if (tttGames) tttGames.textContent = guestStats.games;
            if (tttWins) tttWins.textContent = guestStats.wins;
        }
    }

    showAuth(mode = 'login') {
        this.authMode = mode;
        const authModal = document.getElementById('auth-modal');
        const authTitle = document.getElementById('auth-title');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authSwitchBtn = document.getElementById('auth-switch-btn');

        if (!authModal) return;

        authModal.classList.add('active');

        if (mode === 'login') {
            if (authTitle) authTitle.textContent = 'Вход в аккаунт';
            if (loginForm) loginForm.style.display = 'flex';
            if (registerForm) registerForm.style.display = 'none';
            if (authSwitchBtn) authSwitchBtn.textContent = 'Нет аккаунта? Зарегистрируйтесь';
        } else {
            if (authTitle) authTitle.textContent = 'Регистрация';
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'flex';
            if (authSwitchBtn) authSwitchBtn.textContent = 'Есть аккаунт? Войдите';
        }
    }

    hideAuth() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.classList.remove('active');
        }
        
        this.clearAuthForms();
    }

    switchAuthMode() {
        this.showAuth(this.authMode === 'login' ? 'register' : 'login');
    }

    clearAuthForms() {
        const forms = ['login-form', 'register-form'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.reset();
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        this.showNotification('Вход в систему...', 'info');

        try {
            const response = await this.mockLogin(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
                
                this.hideAuth();
                this.showUserProfile();
                this.updateGameStats();
                
                this.showNotification(`Добро пожаловать, ${this.currentUser.username}!`, 'success');
            } else {
                this.showNotification(response.message || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;

        if (!username || !email || !password || !confirmPassword) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Пароли не совпадают', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        if (username.length < 3) {
            this.showNotification('Имя пользователя должно содержать минимум 3 символа', 'error');
            return;
        }

        this.showNotification('Регистрация...', 'info');

        try {
            const response = await this.mockRegister(username, email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
                
                this.hideAuth();
                this.showUserProfile();
                this.updateGameStats();
                
                this.showNotification(`Добро пожаловать в DinosGames, ${this.currentUser.username}!`, 'success');
            } else {
                this.showNotification(response.message || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    async mockLogin(email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                const user = existingUsers.find(u => u.email === email);

                if (user && user.password === password) {
                    resolve({
                        success: true,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            avatar: user.avatar,
                            level: user.level || 1,
                            gameStats: user.gameStats || {
                                ticTacToe: {
                                    gamesPlayed: 0,
                                    gamesWon: 0
                                }
                            },
                            createdAt: user.createdAt
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Неверный email или пароль'
                    });
                }
            }, 800);
        });
    }

    async mockRegister(username, email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                
                if (existingUsers.some(u => u.email === email)) {
                    resolve({
                        success: false,
                        message: 'Пользователь с таким email уже существует'
                    });
                    return;
                }

                if (existingUsers.some(u => u.username === username)) {
                    resolve({
                        success: false,
                        message: 'Пользователь с таким именем уже существует'
                    });
                    return;
                }

                const newUser = {
                    id: Date.now(),
                    username,
                    email,
                    password,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    level: 1,
                    gameStats: {
                        ticTacToe: {
                            gamesPlayed: 0,
                            gamesWon: 0
                        }
                    },
                    createdAt: new Date().toISOString()
                };

                existingUsers.push(newUser);
                localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

                resolve({
                    success: true,
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        email: newUser.email,
                        avatar: newUser.avatar,
                        level: newUser.level,
                        gameStats: newUser.gameStats,
                        createdAt: newUser.createdAt
                    }
                });
            }, 1000);
        });
    }

    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            this.currentUser = null;
            this.isAuthenticated = false;
            
            localStorage.removeItem('userData');
            
            this.showLoginButton();
            this.loadGameStats();
            
            this.showNotification('Вы успешно вышли из аккаунта', 'success');
        }
    }

    playGame(gameType) {
        if (gameType === 'ticTacToe') {
            window.location.href = '/games/krestiki/';
        } else {
            this.showNotification(`Игра "${gameType}" пока в разработке!`, 'info');
        }
    }

    backToGames() {
        const gameScreen = document.getElementById('tic-tac-toe-game');
        if (gameScreen) {
            gameScreen.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; margin-left: 1rem; cursor: pointer;">×</button>
        `;

        notifications.appendChild(notification);

        // Автоматически удаляем уведомление через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    handleAudioErrors() {
        // Инициализируем Web Audio API для генерации звуков (аудио файлы больше не используются)
        this.initAudioContext();
        console.log('🔊 Звуки переведены на Web Audio API');
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API не поддерживается', error);
        }
    }

    playSound(type = 'move') {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Настройки звука в зависимости от типа
            switch(type) {
                case 'move':
                    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                    oscillator.type = 'square';
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                    break;
                case 'win':
                    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.1);
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                    break;
                default:
                    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                    oscillator.type = 'triangle';
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            }
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Ошибка воспроизведения звука:', error);
        }
    }
}

// ===== МИНИ-ИГРА ДИНОЗАВРИК =====
class DinoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.gameSpeed = 2; // Медленнее
        this.gravity = 0.4; // Медленнее падение
        this.jumpPower = 10; // Медленнее прыжок
        this.running = false;
        this.groundY = 150;
        
        this.dino = {
            x: 50,
            y: this.groundY,
            width: 30, // Уменьшенный хитбокс
            height: 30, // Уменьшенный хитбокс
            velocityY: 0,
            onGround: true
        };
        
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 100; // Интервал между препятствиями
        this.clouds = [
            {x: 200, y: 30},
            {x: 450, y: 50},
            {x: 650, y: 25}
        ];
        
        // Анимация смерти
        this.isDead = false;
        this.deathAnimation = {
            frame: 0,
            maxFrames: 30,
            explosionParticles: []
        };
        
        this.setupControls();
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.jump();
            }
        });
        
        this.canvas.addEventListener('click', () => {
            this.jump();
        });
    }
    
    jump() {
        if (this.dino.onGround) {
            this.dino.velocityY = -this.jumpPower;
            this.dino.onGround = false;
        }
    }
    
    update() {
        if (!this.running) return;
        
        // Обновляем динозавра
        this.dino.velocityY += this.gravity;
        this.dino.y += this.dino.velocityY;
        
        // Проверка земли
        if (this.dino.y >= this.groundY) {
            this.dino.y = this.groundY;
            this.dino.velocityY = 0;
            this.dino.onGround = true;
        }
        
        // Создание препятствий (бесконечная генерация)
        this.obstacleTimer++;
        if (this.obstacleTimer >= this.obstacleInterval) {
            // Случайные типы препятствий с правильными размерами
            const obstacleTypes = [
                {emoji: '🌵', width: 20, height: 25, y: 165},
                {emoji: '🪨', width: 25, height: 15, y: 175},
                {emoji: '🌿', width: 15, height: 25, y: 165}
            ];
            
            const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            
            this.obstacles.push({
                x: 800,
                y: randomType.y,
                width: randomType.width,
                height: randomType.height,
                emoji: randomType.emoji
            });
            
            // Динамический интервал (чем больше счет, тем чаще препятствия)
            this.obstacleInterval = Math.max(60, 120 - Math.floor(this.score / 100));
            this.obstacleTimer = 0;
        }
        
        // Обновляем облака (бесконечное движение)
        this.clouds.forEach(cloud => {
            cloud.x -= this.gameSpeed * 0.3; // Облака движутся медленнее
            if (cloud.x < -50) {
                cloud.x = 850; // Возвращаем облако справа
                cloud.y = 20 + Math.random() * 40; // Случайная высота
            }
        });
        
        // Обновление препятствий
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            if (!obstacle) continue; // Защита от undefined
            
            obstacle.x -= this.gameSpeed;
            
            // Удаление препятствий за экраном
            if (obstacle.x < -30) {
                this.obstacles.splice(i, 1);
                this.score += 10;
                document.getElementById('score').textContent = this.score;
                continue;
            }
            
            // Проверка коллизий
            if (this.checkCollision(this.dino, obstacle)) {
                this.startDeathAnimation();
                return;
            }
        }
        
        // Более плавное ускорение
        if (!this.isDead) {
            this.gameSpeed += 0.002;
        }
        
        // Обновление анимации смерти
        if (this.isDead) {
            this.updateDeathAnimation();
        }
    }
    
    checkCollision(rect1, rect2) {
        if (!rect1 || !rect2) return false; // Защита от undefined
        
        // Точные хитбоксы без избыточного padding
        const padding = 5; // Минимальный отступ для справедливости
        
        return rect1.x + padding < rect2.x + rect2.width - padding &&
               rect1.x + rect1.width - padding > rect2.x + padding &&
               rect1.y + padding < rect2.y + rect2.height - padding &&
               rect1.y + rect1.height - padding > rect2.y + padding;
    }
    
    draw() {
        // Очистка канваса
        this.ctx.fillStyle = '#87ceeb'; // Небесно-голубой фон
        this.ctx.fillRect(0, 0, 800, 200);
        
        // Земля с градиентом
        const gradient = this.ctx.createLinearGradient(0, 190, 0, 200);
        gradient.addColorStop(0, '#90ee90');
        gradient.addColorStop(1, '#228b22');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 190, 800, 10);
        
        // Облака (анимированные)
        this.ctx.font = '24px Arial';
        this.clouds.forEach(cloud => {
            this.ctx.fillText('☁️', cloud.x, cloud.y);
        });
        
        // Динозавр (развернутый)
        this.ctx.save();
        this.ctx.scale(-1, 1); // Зеркальное отражение
        this.ctx.font = '40px Arial';
        
        if (this.isDead) {
            // Анимация смерти - мигающий красный динозавр
            if (Math.floor(this.deathAnimation.frame / 5) % 2 === 0) {
                this.ctx.filter = 'hue-rotate(0deg) brightness(1.5) saturate(2)';
                this.ctx.fillText('💀', -(this.dino.x + 40), this.dino.y + 35);
            } else {
                this.ctx.filter = 'hue-rotate(0deg) brightness(0.5)';
                this.ctx.fillText('🦕', -(this.dino.x + 40), this.dino.y + 35);
            }
        } else {
            this.ctx.fillText('🦕', -(this.dino.x + 40), this.dino.y + 35);
        }
        this.ctx.filter = 'none';
        this.ctx.restore();
        
        // Частицы взрыва при смерти
        if (this.isDead) {
            this.drawExplosionParticles();
        }
        
        // Препятствия (разные типы)
        this.ctx.font = '28px Arial';
        this.obstacles.forEach(obstacle => {
            if (obstacle && obstacle.emoji) {
                this.ctx.fillText(obstacle.emoji, obstacle.x, obstacle.y + 25);
            }
        });
        
        // Индикатор скорости
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Скорость: ${this.gameSpeed.toFixed(1)}`, 10, 20);
        
        // Отладка хитбоксов (только при разработке)
        if (window.DEBUG_MODE) {
            this.drawDebugHitboxes();
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        
        if (this.running) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    start() {
        this.running = true;
        this.isDead = false;
        this.score = 0;
        this.gameSpeed = 2;
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 100;
        this.dino.y = this.groundY;
        this.dino.velocityY = 0;
        this.dino.onGround = true;
        
        // Сброс анимации смерти
        this.deathAnimation = {
            frame: 0,
            maxFrames: 30,
            explosionParticles: []
        };
        
        // Сброс облаков
        this.clouds = [
            {x: 200, y: 30},
            {x: 450, y: 50}, 
            {x: 650, y: 25}
        ];
        
        document.getElementById('score').textContent = '0';
        this.gameLoop();
    }
    
    startDeathAnimation() {
        this.isDead = true;
        this.running = false;
        this.deathAnimation.frame = 0;
        
        // Создаем частицы взрыва
        for (let i = 0; i < 15; i++) {
            this.deathAnimation.explosionParticles.push({
                x: this.dino.x + 20,
                y: this.dino.y + 20,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                maxLife: 30,
                emoji: ['💥', '⭐', '✨', '💫'][Math.floor(Math.random() * 4)]
            });
        }
        
        // Анимация в течение 2 секунд, затем game over
        setTimeout(() => {
            this.gameOver();
        }, 2000);
    }
    
    updateDeathAnimation() {
        this.deathAnimation.frame++;
        
        // Обновляем частицы взрыва
        this.deathAnimation.explosionParticles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3; // Гравитация
            particle.life--;
        });
        
        // Удаляем мертвые частицы
        this.deathAnimation.explosionParticles = this.deathAnimation.explosionParticles.filter(p => p.life > 0);
    }
    
    drawExplosionParticles() {
        this.ctx.font = '16px Arial';
        this.deathAnimation.explosionParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillText(particle.emoji, particle.x, particle.y);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawDebugHitboxes() {
        // Хитбокс динозавра
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);
        
        // Хитбоксы препятствий
        this.ctx.strokeStyle = 'blue';
        this.obstacles.forEach(obstacle => {
            if (obstacle) {
                this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        });
        
        // Информация о коллизиях
        this.ctx.fillStyle = 'white';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(`Dino: ${this.dino.x},${this.dino.y} ${this.dino.width}x${this.dino.height}`, 10, 40);
        
        // Ближайшее препятствие
        const nearestObstacle = this.obstacles.find(obs => obs && obs.x > this.dino.x && obs.x < this.dino.x + 100);
        if (nearestObstacle) {
            this.ctx.fillText(`Obstacle: ${nearestObstacle.x},${nearestObstacle.y} ${nearestObstacle.width}x${nearestObstacle.height}`, 10, 55);
            const distance = nearestObstacle.x - (this.dino.x + this.dino.width);
            this.ctx.fillText(`Distance: ${distance.toFixed(1)}px`, 10, 70);
        }
    }
    
    gameOver() {
        this.running = false;
        this.isDead = false;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, 800, 200);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('💀 GAME OVER 💀', 400, 80);
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Счёт: ${this.score}`, 400, 110);
        this.ctx.fillText('Кликните для перезапуска', 400, 140);
        
        // Перезапуск по клику
        setTimeout(() => {
            this.canvas.addEventListener('click', () => {
                this.start();
            }, { once: true });
        }, 1000);
    }
}

let dinoGameInstance = null;

function startDinoGame() {
    const gameModal = document.getElementById('dino-game');
    gameModal.style.display = 'flex';
    
    if (!dinoGameInstance) {
        dinoGameInstance = new DinoGame();
    }
    
    dinoGameInstance.start();
    
    // Воспроизводим звук клика
    if (app) app.playSound('move');
}

function closeDinoGame() {
    const gameModal = document.getElementById('dino-game');
    gameModal.style.display = 'none';
    
    if (dinoGameInstance) {
        dinoGameInstance.running = false;
    }
}

// Режим отладки (включается клавишей D)
window.DEBUG_MODE = false;
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
        window.DEBUG_MODE = !window.DEBUG_MODE;
        console.log(`Debug mode: ${window.DEBUG_MODE ? 'ON' : 'OFF'}`);
    }
});

// Глобальная переменная для системы частиц
let particleSystem = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    app = new DinosGamesApp();
    
    // Инициализация системы частиц
    if (window.ParticleSystem) {
        setTimeout(() => {
            particleSystem = new ParticleSystem();
            console.log('✨ Система частиц инициализирована');
        }, 100); // Небольшая задержка для прогрузки DOM
    }
    
    console.log('🦕 DinosGames загружено!');
    console.log('💡 Нажмите D для включения режима отладки хитбоксов');
}); 