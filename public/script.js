// Главный скрипт DinosGames
class DinosGamesApp {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authMode = 'login'; // 'login' или 'register'
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
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

        // Клики вне формы авторизации
        const authSection = document.getElementById('auth-section');
        if(authSection) {
            authSection.addEventListener('click', (e) => {
                if (e.target.id === 'auth-section') {
                    this.hideAuth();
                }
            });
        }

        // ESC для закрытия модалок
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
            } catch (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
                localStorage.removeItem('userData');
                this.showLoginButton();
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
            
            const userNameEl = userProfile.querySelector('.user-name');
            const userLevelEl = userProfile.querySelector('.user-level');
            const userAvatarEl = userProfile.querySelector('.user-avatar');

            if (userNameEl) userNameEl.textContent = this.currentUser.username || this.currentUser.name;
            if (userLevelEl) userLevelEl.textContent = `Уровень ${this.currentUser.level || 1}`;
            if (userAvatarEl) {
                userAvatarEl.src = this.currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.currentUser.username || 'user'}`;
            }
        }
    }

    showLoginButton() {
        const loginButton = document.getElementById('login-button');
        const userProfile = document.getElementById('user-profile');

        if (userProfile) userProfile.style.display = 'none';
        if (loginButton) loginButton.style.display = 'flex';
    }

    showAuth(mode = 'login') {
        this.authMode = mode;
        const authSection = document.getElementById('auth-section');
        const authTitle = document.getElementById('auth-title');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authSwitch = document.getElementById('auth-switch');

        if (!authSection) return;

        authSection.classList.add('active');

        if (mode === 'login') {
            if (authTitle) authTitle.textContent = 'Вход в аккаунт';
            if (loginForm) loginForm.style.display = 'flex';
            if (registerForm) registerForm.style.display = 'none';
            if (authSwitch) authSwitch.textContent = 'Нет аккаунта? Зарегистрируйтесь';
        } else {
            if (authTitle) authTitle.textContent = 'Регистрация';
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'flex';
            if (authSwitch) authSwitch.textContent = 'Есть аккаунт? Войдите';
        }
    }

    hideAuth() {
        const authSection = document.getElementById('auth-section');
        if (authSection) {
            authSection.classList.remove('active');
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

        if (!email || !password) return;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password, rememberMe: true }) // Using email as username for login
            });
            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
                this.hideAuth();
                this.showUserProfile();
            } else {
                console.error('Login failed:', data.message);
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        if (!username || !email || !password) return;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();

            if (data.success) {
                // Automatically log in after registration
                this.handleLogin(event);
            } else {
                 console.error('Registration failed:', data.message);
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
        }
    }

    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('userData');
            this.showLoginButton();
        }
    }

    playGame(gameType) {
        if (gameType === 'ticTacToe') {
            window.location.href = '/games/krestiki/';
        } else {
            alert(`Игра "${gameType}" пока в разработке!`);
        }
    }
}

// Глобальные функции для HTML onclick, чтобы они работали после рефакторинга
window.showAuth = (mode) => window.dinosApp.showAuth(mode);
window.hideAuth = () => window.dinosApp.hideAuth();
window.switchAuthMode = () => window.dinosApp.switchAuthMode();
window.logout = () => window.dinosApp.logout();
window.playGame = (gameType) => window.dinosApp.playGame(gameType);


// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.dinosApp = new DinosGamesApp();
}); 