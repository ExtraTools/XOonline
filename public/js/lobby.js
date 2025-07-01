// Lobby App - DinosGames
class LobbyApp {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('authToken');
        this.socket = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Проверяем наличие токена
        if (this.token) {
            const isValid = await this.verifyToken();
            if (isValid) {
                this.showSuccess(); // Показываем страницу успеха
            } else {
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }

    setupEventListeners() {
        // Переключение вкладок авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Обработка форм
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e.target);
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e.target);
        });

        // Кнопки выхода
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        document.getElementById('logoutBtnSuccess').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    switchAuthTab(tab) {
        // Обновляем активную вкладку
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Показываем соответствующую форму
        if (tab === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }

        // Очищаем ошибки
        this.clearErrors();
    }

    async handleLogin(form) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('.form-button');
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Вход...';
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login: formData.get('login'),
                    password: formData.get('password'),
                }),
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.token);
                this.showSuccess(); // Показываем страницу успеха
            } else {
                this.showError('loginError', data.message);
            }
        } catch (error) {
            this.showError('loginError', 'Ошибка соединения с сервером');
            console.error('Login error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    }

    async handleRegister(form) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('.form-button');
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Регистрация...';
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                }),
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.token);
                this.showSuccess(); // Показываем страницу успеха
            } else {
                if (data.errors && data.errors.length > 0) {
                    const errorMessages = data.errors.map(err => err.msg).join('\n');
                    this.showError('registerError', errorMessages);
                } else {
                    this.showError('registerError', data.message);
                }
            }
        } catch (error) {
            this.showError('registerError', 'Ошибка соединения с сервером');
            console.error('Register error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.token = null;
            this.currentUser = null;
            localStorage.removeItem('authToken');
            this.showAuth();
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                return true;
            } else {
                localStorage.removeItem('authToken');
                this.token = null;
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            localStorage.removeItem('authToken');
            this.token = null;
            return false;
        }
    }

    showAuth() {
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('lobbyContainer').style.display = 'none';
        document.getElementById('successContainer').style.display = 'none';
        this.clearForms();
        this.clearErrors();
    }

    showSuccess() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('lobbyContainer').style.display = 'none';
        document.getElementById('successContainer').style.display = 'flex';
        
        // Заполняем данные пользователя
        if (this.currentUser) {
            document.getElementById('welcomeUsername').textContent = this.currentUser.username;
            document.getElementById('welcomeEmail').textContent = this.currentUser.email;
            document.getElementById('welcomeAvatar').textContent = this.currentUser.username.charAt(0).toUpperCase();
        }
    }

    async showLobby() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('successContainer').style.display = 'none';
        document.getElementById('lobbyContainer').style.display = 'block';
        
        // Загружаем профиль пользователя
        await this.loadUserProfile();
        
        // Загружаем данные лобби
        await this.loadLobbyData();
        
        // Запускаем обновления
        this.startLobbyUpdates();
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('Profile loading error:', error);
        }
    }

    updateUserDisplay() {
        if (!this.currentUser) return;

        const avatar = document.getElementById('userAvatar');
        const username = document.getElementById('username');
        const rating = document.getElementById('userRating');

        avatar.textContent = this.currentUser.username.charAt(0).toUpperCase();
        username.textContent = this.currentUser.username;
        rating.textContent = `Рейтинг: ${this.currentUser.rating} • Игр: ${this.currentUser.total_games}`;
    }

    async loadLobbyData() {
        await Promise.all([
            this.loadOnlineUsers(),
            this.loadLobbyStats()
        ]);
    }

    async loadOnlineUsers() {
        try {
            const response = await fetch('/api/lobby/users', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateOnlineUsers(data.users);
            }
        } catch (error) {
            console.error('Online users loading error:', error);
        }
    }

    async loadLobbyStats() {
        try {
            const response = await fetch('/api/lobby/stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateLobbyStats(data.stats);
            }
        } catch (error) {
            console.error('Lobby stats loading error:', error);
        }
    }

    updateOnlineUsers(users) {
        const userList = document.getElementById('userList');
        const onlineCount = document.getElementById('onlineCount');
        
        onlineCount.textContent = users.length;
        
        if (users.length === 0) {
            userList.innerHTML = '<div class="loading">Нет пользователей онлайн</div>';
            return;
        }

        userList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-status"></div>
                <div class="user-avatar" style="width: 24px; height: 24px; font-size: 0.8rem;">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style="font-size: 0.9rem; font-weight: 600;">
                        ${user.username}
                    </div>
                    <div style="font-size: 0.7rem; color: #888;">
                        Рейтинг: ${user.rating}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateLobbyStats(stats) {
        document.getElementById('statsOnline').textContent = stats.online_users;
        document.getElementById('statsRooms').textContent = stats.total_rooms;
        document.getElementById('statsGames').textContent = stats.active_games;
    }

    startLobbyUpdates() {
        // Обновляем данные каждые 30 секунд
        this.lobbyUpdateInterval = setInterval(() => {
            this.loadLobbyData();
        }, 30000);
    }

    stopLobbyUpdates() {
        if (this.lobbyUpdateInterval) {
            clearInterval(this.lobbyUpdateInterval);
            this.lobbyUpdateInterval = null;
        }
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        
        // Автоматически скрываем ошибку через 5 секунд
        setTimeout(() => {
            errorElement.textContent = '';
        }, 5000);
    }

    clearErrors() {
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
    }

    clearForms() {
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
    }

    // Discord функционал
    async loadDiscordData() {
        try {
            const response = await fetch('https://discord.com/api/guilds/1369754088941682830/widget.json');
            const data = await response.json();
            
            if (data && data.presence_count !== undefined) {
                this.updateDiscordWidgets(data);
            }
        } catch (error) {
            console.log('Discord API недоступен, используем fallback данные');
            // Используем статичные данные как fallback
            this.updateDiscordWidgets({
                name: '49 Battalion',
                presence_count: 33,
                instant_invite: 'https://discord.com/invite/MRv5xtu8',
                members: []
            });
        }
    }

    updateDiscordWidgets(discordData) {
        // Обновляем счетчик на странице успеха
        const successCount = document.getElementById('discordOnlineCount');
        if (successCount) {
            successCount.textContent = discordData.presence_count || 33;
        }

        // Обновляем счетчик в боковой панели лобби
        const sidebarCount = document.getElementById('discordSidebarCount');
        if (sidebarCount) {
            sidebarCount.textContent = discordData.presence_count || 33;
        }

        // Обновляем ссылки приглашения если есть новая
        if (discordData.instant_invite) {
            const inviteLinks = document.querySelectorAll('a[href*="discord.com/invite"], a[href*="discord.gg"]');
            inviteLinks.forEach(link => {
                link.href = discordData.instant_invite;
            });
        }
    }

    startDiscordUpdates() {
        // Загружаем данные Discord при инициализации
        this.loadDiscordData();
        
        // Обновляем данные Discord каждые 2 минуты
        this.discordUpdateInterval = setInterval(() => {
            this.loadDiscordData();
        }, 120000); // 2 минуты
    }

    stopDiscordUpdates() {
        if (this.discordUpdateInterval) {
            clearInterval(this.discordUpdateInterval);
            this.discordUpdateInterval = null;
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.lobbyApp = new LobbyApp();
    
    // Запускаем обновления Discord виджетов
    window.lobbyApp.startDiscordUpdates();
});

// Обработка закрытия страницы
window.addEventListener('beforeunload', () => {
    if (window.lobbyApp) {
        window.lobbyApp.stopLobbyUpdates();
        window.lobbyApp.stopDiscordUpdates();
    }
}); 