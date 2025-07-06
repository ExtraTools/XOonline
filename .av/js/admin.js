class AdminPanel {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.targetUser = null;
        this.init();
    }

    init() {
        this.updateTime();
        this.loadUsers();
        this.setupEventListeners();
        
        // Обновляем время каждую секунду
        setInterval(() => this.updateTime(), 1000);
        
        // Автообновление данных каждые 30 секунд
        setInterval(() => this.loadUsers(), 30000);
    }

    setupEventListeners() {
        // Поиск пользователей
        document.getElementById('searchUser').addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        // Escape для закрытия модального окна
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Клик вне модального окна для закрытия
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.closeModal();
            }
        });
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('currentTime').textContent = timeString;
    }

    async loadUsers() {
        try {
            this.showLoading(true);
            console.log('🔄 Загрузка пользователей...');

            const response = await fetch('/api/admin/users');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.users = data.users;
                this.filteredUsers = [...this.users];
                this.renderUsers();
                this.updateStats();
                console.log('✅ Пользователи загружены:', this.users.length);
            } else {
                throw new Error(data.message || 'Ошибка загрузки пользователей');
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
            this.showError('Ошибка загрузки пользователей: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        
        if (this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.6);">
                        ${this.users.length === 0 ? 'Нет пользователей' : 'Пользователи не найдены'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredUsers.map(user => {
            const onlineClass = user.is_online ? 'online' : 'offline';
            const statusClass = user.status === 'active' ? 'active' : 'banned';
            const lastLogin = user.last_login ? 
                new Date(user.last_login).toLocaleString('ru-RU') : 
                'Никогда';

            return `
                <tr>
                    <td class="user-id">${user.id}</td>
                    <td class="user-uuid" title="${user.uuid}">${user.uuid.substring(0, 8)}...</td>
                    <td><strong>${user.username}</strong></td>
                    <td class="user-email">${user.email}</td>
                    <td class="password-hash" title="${user.password_hash}">
                        ${user.password_hash.substring(0, 20)}...
                    </td>
                    <td><span class="user-status ${statusClass}">${user.status}</span></td>
                    <td>
                        <span class="online-indicator ${onlineClass}"></span>
                        ${user.is_online ? 'В сети' : 'Не в сети'}
                    </td>
                    <td>${lastLogin}</td>
                    <td>
                        <button class="btn btn-danger" onclick="adminPanel.prepareScreamer('${user.email}')">
                            👻 Скример
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    searchUsers(query) {
        if (!query.trim()) {
            this.filteredUsers = [...this.users];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredUsers = this.users.filter(user => 
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.id.toString().includes(searchTerm)
            );
        }
        this.renderUsers();
    }

    updateStats() {
        const totalUsers = this.users.length;
        const onlineUsers = this.users.filter(user => user.is_online).length;
        const bannedUsers = this.users.filter(user => user.status === 'banned').length;
        
        // Регистрации сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRegistrations = this.users.filter(user => {
            const createdDate = new Date(user.created_at);
            return createdDate >= today;
        }).length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('onlineUsers').textContent = onlineUsers;
        document.getElementById('bannedUsers').textContent = bannedUsers;
        document.getElementById('todayRegistrations').textContent = todayRegistrations;
    }

    prepareScreamer(userEmail) {
        this.targetUser = userEmail;
        document.getElementById('confirmTargetUser').textContent = userEmail;
        document.getElementById('confirmModal').style.display = 'block';
    }

    async confirmScreamer() {
        if (!this.targetUser) return;

        try {
            console.log('👻 Отправка скримера пользователю:', this.targetUser);

            const response = await fetch('/api/admin/screamer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target: this.targetUser
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(`Скример отправлен пользователю ${this.targetUser}! 👻`);
                console.log('✅ Скример отправлен успешно');
            } else {
                throw new Error(data.message || 'Ошибка отправки скримера');
            }

        } catch (error) {
            console.error('❌ Ошибка отправки скримера:', error);
            this.showError('Ошибка отправки скримера: ' + error.message);
        } finally {
            this.closeModal();
        }
    }

    closeModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.targetUser = null;
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'block' : 'none';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span class="notification-text">${message}</span>
            </div>
        `;

        // Добавляем стили для уведомлений, если их еще нет
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1001;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                }
                
                .notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .notification-success {
                    background: linear-gradient(45deg, #00ff88, #00cc6a);
                }
                
                .notification-error {
                    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                }
                
                .notification-info {
                    background: linear-gradient(45deg, #667eea, #764ba2);
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Скрываем уведомление через 5 секунд
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Глобальные функции для HTML
window.loadUsers = () => adminPanel.loadUsers();
window.searchUsers = () => {
    const query = document.getElementById('searchUser').value;
    adminPanel.searchUsers(query);
};

window.sendScreamer = () => {
    const target = document.getElementById('targetUser').value.trim();
    if (!target) {
        adminPanel.showError('Введите email или имя пользователя');
        return;
    }
    adminPanel.prepareScreamer(target);
};

window.confirmScreamer = () => adminPanel.confirmScreamer();
window.closeModal = () => adminPanel.closeModal();

// Функция для сброса онлайн статусов
window.resetOnlineStatuses = async () => {
    if (!confirm('Вы уверены, что хотите сбросить все онлайн статусы? Это установит всех пользователей в статус "Не в сети".')) {
        return;
    }

    try {
        console.log('🛡️ Сброс всех онлайн статусов...');
        
        const response = await fetch('/api/admin/reset-online', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Онлайн статусы сброшены');
            adminPanel.showNotification('✅ Все онлайн статусы успешно сброшены', 'success');
            
            // Обновляем список пользователей
            await adminPanel.loadUsers();
        } else {
            console.error('❌ Ошибка:', data.message);
            adminPanel.showNotification('❌ Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка сброса онлайн статусов:', error);
        adminPanel.showNotification('❌ Ошибка сети при сбросе статусов', 'error');
    }
};

// Система авторизации
const ADMIN_PASSWORD = '260606';
const SESSION_KEY = 'admin_session';

// Проверка авторизации
function checkAuthStatus() {
    const isAuthenticated = sessionStorage.getItem(SESSION_KEY) === 'true';
    if (isAuthenticated) {
        showAdminPanel();
    } else {
        showAuthForm();
    }
}

// Показать форму авторизации
function showAuthForm() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
}

// Показать админ панель
function showAdminPanel() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
    
    // Инициализируем админ панель только после авторизации
    if (!window.adminPanel) {
        window.adminPanel = new AdminPanel();
    }
}

// Проверка пароля
function checkPassword(event) {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('authError');
    
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        showAdminPanel();
        errorDiv.style.display = 'none';
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

// Выход из админ панели
function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    showAuthForm();
    document.getElementById('adminPassword').value = '';
}

// Глобальные функции для HTML авторизации
window.checkPassword = checkPassword;
window.logout = logout;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

// Предотвращаем случайное закрытие админ панели
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = 'Вы уверены, что хотите покинуть админ панель?';
    return 'Вы уверены, что хотите покинуть админ панель?';
}); 