// ===== ADMIN PANEL MODULE =====

export class AdminPanel {
    constructor() {
        this.isVisible = false;
        this.isAdmin = false;
        this.users = [];
        this.stats = { onlinePlayers: 0, activeGames: 0 };
        this.selectedUsers = new Set();
        
        this.init();
        console.log('🔥 AdminPanel инициализирована');
    }

    init() {
        this.createAdminPanel();
        this.setupEventListeners();
        this.setupSecretInput();
    }

    // ===== СОЗДАНИЕ АДМИН ПАНЕЛИ =====
    createAdminPanel() {
        const panel = document.createElement('div');
        panel.id = 'admin-panel';
        panel.className = 'admin-panel';
        panel.innerHTML = `
            <div class="admin-header">
                <div class="admin-title">
                    <h2>🔥 KRESTIKI ADMIN PANEL</h2>
                    <span class="admin-badge">СУПЕР АДМИН</span>
                </div>
                <button class="admin-close" id="admin-close-btn">×</button>
            </div>

            <div class="admin-content">
                <!-- Статистика -->
                <div class="admin-section">
                    <h3>📊 Статистика сервера</h3>
                    <div class="admin-stats-grid">
                        <div class="admin-stat-card">
                            <div class="stat-icon">👤</div>
                            <div class="stat-info">
                                <div class="stat-number" id="admin-online">0</div>
                                <div class="stat-label">Онлайн</div>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="stat-icon">🎮</div>
                            <div class="stat-info">
                                <div class="stat-number" id="admin-games">0</div>
                                <div class="stat-label">Активных игр</div>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="stat-icon">⚡</div>
                            <div class="stat-info">
                                <div class="stat-number" id="admin-actions">0</div>
                                <div class="stat-label">Выполнено действий</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Пользователи -->
                <div class="admin-section">
                    <div class="section-header">
                        <h3>👥 Подключенные пользователи</h3>
                        <div class="admin-toolbar">
                            <button class="admin-btn mini" id="refresh-users" title="Обновить список">
                                🔄
                            </button>
                            <button class="admin-btn mini" id="select-all-users" title="Выбрать всех">
                                ☑️
                            </button>
                            <button class="admin-btn mini danger" id="clear-selection" title="Очистить выбор">
                                ❌
                            </button>
                        </div>
                    </div>
                    
                    <div class="users-container">
                        <div class="users-search">
                            <input type="text" id="users-search" placeholder="🔍 Поиск пользователей..." class="admin-input-field">
                        </div>
                        <div class="users-list" id="users-list">
                            <div class="no-users">Пользователи не найдены</div>
                        </div>
                    </div>
                </div>

                <!-- Массовые действия -->
                <div class="admin-section">
                    <h3>⚡ Массовые действия</h3>
                    <div class="mass-actions-grid">
                        <button class="admin-btn danger" id="mass-screamer">
                            💀 Скример всем
                        </button>
                        <button class="admin-btn warning" id="mass-disconnect">
                            🚫 Отключить всех
                        </button>
                        <button class="admin-btn warning" id="mass-lag">
                            🐌 Лаги всем
                        </button>
                        <button class="admin-btn success" id="mass-announce">
                            📢 Объявление
                        </button>
                    </div>
                </div>

                <!-- Спецэффекты -->
                <div class="admin-section">
                    <h3>✨ Спецэффекты</h3>
                    <div class="effects-grid">
                        <button class="admin-btn" data-effect="rainbow">🌈 Радуга</button>
                        <button class="admin-btn" data-effect="shake">📳 Тряска</button>
                        <button class="admin-btn" data-effect="snow">❄️ Снег</button>
                        <button class="admin-btn" data-effect="fireworks">🎆 Фейерверк</button>
                        <button class="admin-btn" data-effect="matrix">💊 Матрица</button>
                        <button class="admin-btn" data-effect="disco">🕺 Диско</button>
                        <button class="admin-btn" data-effect="glitch">📺 Глитч</button>
                        <button class="admin-btn" data-effect="upside_down">🙃 Переворот</button>
                    </div>
                </div>

                <!-- Троллинг -->
                <div class="admin-section">
                    <h3>😈 Троллинг арсенал</h3>
                    <div class="troll-grid">
                        <div class="troll-card">
                            <h4>💀 Скример</h4>
                            <div class="troll-controls">
                                <input type="range" id="screamer-duration" min="3" max="15" value="5" class="admin-slider">
                                <span id="screamer-duration-display">5с</span>
                                <button class="admin-btn danger mini" id="custom-screamer">Запустить</button>
                            </div>
                        </div>
                        
                        <div class="troll-card">
                            <h4>🐌 Лаги</h4>
                            <div class="troll-controls">
                                <input type="range" id="lag-intensity" min="1" max="5" value="3" class="admin-slider">
                                <span id="lag-intensity-display">3x</span>
                                <button class="admin-btn warning mini" id="custom-lag">Активировать</button>
                            </div>
                        </div>

                        <div class="troll-card">
                            <h4>🎉 Фейк победа</h4>
                            <div class="troll-controls">
                                <input type="text" id="fake-win-text" placeholder="Текст победы..." class="admin-input-field mini">
                                <button class="admin-btn success mini" id="custom-fake-win">Показать</button>
                            </div>
                        </div>

                        <div class="troll-card">
                            <h4>📢 Объявление</h4>
                            <div class="troll-controls">
                                <input type="text" id="announcement-text" placeholder="Текст объявления..." class="admin-input-field mini">
                                <button class="admin-btn success mini" id="custom-announce">Отправить</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Серверные команды -->
                <div class="admin-section">
                    <h3>🔧 Управление сервером</h3>
                    <div class="server-controls">
                        <button class="admin-btn warning" id="maintenance-mode">
                            🔧 Режим обслуживания
                        </button>
                        <button class="admin-btn danger" id="restart-server">
                            ♻️ Перезагрузка сервера
                        </button>
                        <button class="admin-btn" id="clear-effects">
                            🧹 Очистить эффекты
                        </button>
                        <button class="admin-btn success" id="save-config">
                            💾 Сохранить настройки
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }

    // ===== СЕКРЕТНЫЙ ВХОД =====
    setupSecretInput() {
        console.log('🔧 Настройка секретного ввода...');
        
        // Создаем невидимое поле ввода в левом верхнем углу
        const secretInput = document.createElement('input');
        secretInput.type = 'text';
        secretInput.id = 'secret-admin-input';
        secretInput.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 50px;
            height: 30px;
            opacity: 0;
            border: none;
            background: transparent;
            z-index: 99999;
            pointer-events: auto;
            font-size: 12px;
            color: transparent;
        `;
        
        // При фокусе делаем поле видимым для отладки
        secretInput.addEventListener('focus', () => {
            secretInput.style.opacity = '0.3';
            secretInput.style.background = 'rgba(255, 0, 0, 0.1)';
            console.log('🔍 Секретное поле активно');
        });
        
        secretInput.addEventListener('blur', () => {
            secretInput.style.opacity = '0';
            secretInput.style.background = 'transparent';
        });
        
        document.body.appendChild(secretInput);
        
        // Обработчик ввода секретного кода
        secretInput.addEventListener('input', (e) => {
            console.log('🔤 Ввод в секретное поле:', e.target.value);
            if (e.target.value.toLowerCase() === 'admin-start') {
                console.log('🎯 Секретный код введен!');
                this.activateAdmin();
                e.target.value = '';
                e.target.blur();
            }
        });
        
        // Глобальный обработчик нажатий клавиш
        document.addEventListener('keydown', (e) => {
            // Если пользователь нажимает A, фокусируемся на секретном поле
            if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    secretInput.focus();
                    e.preventDefault();
                }
            }
        });
        
        // Фокус на поле при клике в левый верхний угол
        document.addEventListener('click', (e) => {
            if (e.clientX < 80 && e.clientY < 80) {
                console.log('🖱️ Клик в секретной зоне');
                secretInput.focus();
                e.preventDefault();
            }
        });
        
        console.log('✅ Секретное поле настроено. Инструкции:');
        console.log('   📍 Кликните в левый верхний угол страницы');
        console.log('   📍 Или нажмите букву "A" и начните печатать');
        console.log('   📍 Введите: admin-start');
    }

    activateAdmin() {
        this.isAdmin = true;
        window.GlassXO.player.isAdmin = true;
        
        console.log('🔥 Активация админ панели...');
        
        // Уведомляем сервер об активации админских прав
        const notifyServer = () => {
            if (window.GlassXO.socket && window.GlassXO.socket.socket && window.GlassXO.socket.socket.connected) {
                window.GlassXO.socket.socket.emit('admin_activate', {
                    timestamp: Date.now()
                });
                console.log('✅ Сервер уведомлен об активации админа');
            } else {
                console.log('⏳ Ожидание подключения к серверу...');
                setTimeout(notifyServer, 1000);
            }
        };
        
        notifyServer();
        
        // Показываем кнопку админ панели
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.style.display = 'block';
        }
        
        // Показываем уведомление
        const showNotification = () => {
            if (window.GlassXO.ui && window.GlassXO.ui.showNotification) {
                window.GlassXO.ui.showNotification('🔥 Админ режим активирован!', 'success');
            } else {
                // Показываем нативное уведомление
                alert('🔥 Админ режим активирован!');
            }
        };
        
        showNotification();
        
        console.log('🔥 Админ панель активирована');
        this.show();
    }

    // ===== СОБЫТИЯ =====
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Закрытие панели
            if (e.target.id === 'admin-close-btn') {
                this.hide();
            }
            
            // Кнопка админ панели в навигации
            if (e.target.id === 'admin-btn' && this.isAdmin) {
                this.show();
            }

            // Массовые действия
            if (e.target.id === 'mass-screamer') this.massAction('screamer');
            if (e.target.id === 'mass-disconnect') this.massAction('disconnect');
            if (e.target.id === 'mass-lag') this.massAction('lag');
            if (e.target.id === 'mass-announce') this.massAnnounce();

            // Спецэффекты
            if (e.target.hasAttribute('data-effect')) {
                this.applyEffect(e.target.getAttribute('data-effect'));
            }

            // Троллинг
            if (e.target.id === 'custom-screamer') this.customScreener();
            if (e.target.id === 'custom-lag') this.customLag();
            if (e.target.id === 'custom-fake-win') this.customFakeWin();
            if (e.target.id === 'custom-announce') this.customAnnounce();

            // Управление пользователями
            if (e.target.id === 'refresh-users') this.refreshUsers();
            if (e.target.id === 'select-all-users') this.selectAllUsers();
            if (e.target.id === 'clear-selection') this.clearSelection();

            // Серверные команды
            if (e.target.id === 'clear-effects') this.clearAllEffects();
            if (e.target.id === 'maintenance-mode') this.toggleMaintenance();
            if (e.target.id === 'restart-server') this.restartServer();

            // Действия с отдельными пользователями
            if (e.target.classList.contains('user-action-btn')) {
                const userId = e.target.getAttribute('data-user-id');
                const action = e.target.getAttribute('data-action');
                this.userAction(userId, action);
            }

            // Выбор пользователей
            if (e.target.classList.contains('user-checkbox')) {
                const userId = e.target.getAttribute('data-user-id');
                this.toggleUserSelection(userId);
            }
        });

        // Слайдеры
        document.addEventListener('input', (e) => {
            if (e.target.id === 'screamer-duration') {
                document.getElementById('screamer-duration-display').textContent = e.target.value + 'с';
            }
            if (e.target.id === 'lag-intensity') {
                document.getElementById('lag-intensity-display').textContent = e.target.value + 'x';
            }
        });

        // Поиск пользователей
        document.addEventListener('input', (e) => {
            if (e.target.id === 'users-search') {
                this.filterUsers(e.target.value);
            }
        });
    }

    // ===== УПРАВЛЕНИЕ ПАНЕЛЬЮ =====
    show() {
        if (!this.isAdmin) return;
        
        const panel = document.getElementById('admin-panel');
        if (panel) {
            panel.classList.add('active');
            this.isVisible = true;
            this.refreshUsers();
            this.updateStats();
            console.log('🔥 Админ панель открыта');
        }
    }

    hide() {
        const panel = document.getElementById('admin-panel');
        if (panel) {
            panel.classList.remove('active');
            this.isVisible = false;
        }
    }

    // ===== ПОЛЬЗОВАТЕЛИ =====
    updateUsersList(users) {
        this.users = users || [];
        this.renderUsers();
    }

    renderUsers() {
        const container = document.getElementById('users-list');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = '<div class="no-users">Пользователи не найдены</div>';
            return;
        }

        container.innerHTML = this.users.map(user => `
            <div class="admin-user-item" data-user-id="${user.id}">
                <div class="user-checkbox-container">
                    <input type="checkbox" class="user-checkbox" data-user-id="${user.id}" 
                           ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                </div>
                <div class="user-avatar">
                    <img src="${user.avatar}" alt="${user.name}" onerror="this.src='icons/gameIcons/PNG/Black/1x/button1.png'">
                </div>
                <div class="user-info">
                    <div class="user-name">
                        ${user.name || 'Безымянный'}
                        ${user.user_id ? `<span class="user-id">#${user.user_id}</span>` : ''}
                    </div>
                    <div class="user-details">
                        <span class="user-status ${user.isGuest ? 'guest' : 'registered'}">
                            ${user.isGuest ? '👤 Гость' : '✅ Зарегистрирован'}
                        </span>
                        <span class="user-ip">📍 ${user.ip || 'unknown'}</span>
                        <span class="user-level">⭐ Ур. ${user.level || 1}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="admin-mini-btn danger user-action-btn" data-user-id="${user.id}" data-action="screamer" title="Скример">💀</button>
                    <button class="admin-mini-btn warning user-action-btn" data-user-id="${user.id}" data-action="lag" title="Лаги">🐌</button>
                    <button class="admin-mini-btn user-action-btn" data-user-id="${user.id}" data-action="fake_win" title="Фейк победа">🎉</button>
                    <button class="admin-mini-btn danger user-action-btn" data-user-id="${user.id}" data-action="disconnect" title="Отключить">🚫</button>
                </div>
            </div>
        `).join('');
    }

    refreshUsers() {
        if (window.GlassXO.socket && window.GlassXO.socket.socket) {
            window.GlassXO.socket.socket.emit('admin_get_users');
        }
    }

    selectAllUsers() {
        this.users.forEach(user => this.selectedUsers.add(user.id));
        this.renderUsers();
    }

    clearSelection() {
        this.selectedUsers.clear();
        this.renderUsers();
    }

    toggleUserSelection(userId) {
        if (this.selectedUsers.has(userId)) {
            this.selectedUsers.delete(userId);
        } else {
            this.selectedUsers.add(userId);
        }
    }

    filterUsers(searchTerm) {
        const items = document.querySelectorAll('.admin-user-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.user-name').textContent.toLowerCase();
            const id = item.querySelector('.user-id')?.textContent.toLowerCase() || '';
            const ip = item.querySelector('.user-ip').textContent.toLowerCase();
            
            if (name.includes(term) || id.includes(term) || ip.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // ===== ДЕЙСТВИЯ =====
    massAction(action) {
        const targets = Array.from(this.selectedUsers);
        if (targets.length === 0) {
            if (window.GlassXO.ui) {
                window.GlassXO.ui.showNotification('⚠️ Выберите пользователей для действия', 'warning');
            }
            return;
        }

        this.sendAdminAction(action, { targets, mass: true });
        
        const messages = {
            screamer: '💀 Скример отправлен выбранным пользователям!',
            disconnect: '🚫 Выбранные пользователи отключены!',
            lag: '🐌 Лаги активированы для выбранных!'
        };

        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification(messages[action], 'success');
        }
    }

    userAction(userId, action) {
        this.sendAdminAction(action, { targets: [userId] });
        
        const messages = {
            screamer: '💀 Скример отправлен!',
            lag: '🐌 Лаги активированы!',
            fake_win: '🎉 Фейковая победа показана!',
            disconnect: '🚫 Пользователь отключен!'
        };

        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification(messages[action], 'success');
        }
    }

    applyEffect(effect) {
        const targets = Array.from(this.selectedUsers);
        this.sendAdminAction(effect, { targets });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification(`✨ Эффект "${effect}" применён!`, 'success');
        }
    }

    customScreener() {
        const duration = document.getElementById('screamer-duration').value * 1000;
        const targets = Array.from(this.selectedUsers);
        
        this.sendAdminAction('screamer', { targets, duration });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification(`💀 Скример запущен на ${duration/1000}с!`, 'success');
        }
    }

    customLag() {
        const intensity = document.getElementById('lag-intensity').value;
        const targets = Array.from(this.selectedUsers);
        
        this.sendAdminAction('lag', { targets, intensity });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification(`🐌 Лаги активированы (${intensity}x)!`, 'success');
        }
    }

    customFakeWin() {
        const message = document.getElementById('fake-win-text').value || 'Поздравляем с победой!';
        const targets = Array.from(this.selectedUsers);
        
        this.sendAdminAction('fake_win', { targets, message });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('🎉 Фейковая победа отправлена!', 'success');
        }
    }

    customAnnounce() {
        const message = document.getElementById('announcement-text').value;
        if (!message.trim()) return;
        
        const targets = Array.from(this.selectedUsers);
        this.sendAdminAction('announce', { targets, message });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('📢 Объявление отправлено!', 'success');
        }
        
        document.getElementById('announcement-text').value = '';
    }

    massAnnounce() {
        const message = prompt('Введите текст объявления:');
        if (!message) return;
        
        this.sendAdminAction('announce', { targets: 'all', message });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('📢 Массовое объявление отправлено!', 'success');
        }
    }

    clearAllEffects() {
        this.sendAdminAction('clear_effects', { targets: 'all' });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('🧹 Все эффекты очищены!', 'success');
        }
    }

    toggleMaintenance() {
        this.sendAdminAction('maintenance', { enabled: true });
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('🔧 Режим обслуживания активирован!', 'warning');
        }
    }

    restartServer() {
        if (confirm('Вы уверены, что хотите перезагрузить сервер?')) {
            this.sendAdminAction('restart_server', {});
            
            if (window.GlassXO.ui) {
                window.GlassXO.ui.showNotification('♻️ Сервер перезагружается...', 'warning');
            }
        }
    }

    // ===== ОТПРАВКА КОМАНД =====
    sendAdminAction(action, data) {
        if (window.GlassXO.socket && window.GlassXO.socket.socket) {
            window.GlassXO.socket.socket.emit('admin_action', {
                action: action,
                data: data,
                timestamp: Date.now()
            });
        }
        
        // Увеличиваем счетчик действий
        const counter = document.getElementById('admin-actions');
        if (counter) {
            const current = parseInt(counter.textContent) || 0;
            counter.textContent = current + 1;
        }
    }

    // ===== ОБНОВЛЕНИЕ СТАТИСТИКИ =====
    updateStats(stats) {
        if (stats) {
            this.stats = stats;
        }
        
        const onlineEl = document.getElementById('admin-online');
        const gamesEl = document.getElementById('admin-games');
        
        if (onlineEl) onlineEl.textContent = this.stats.onlinePlayers || 0;
        if (gamesEl) gamesEl.textContent = this.stats.activeGames || 0;
    }

    // ===== ОБРАБОТКА ВХОДЯЩИХ ДЕЙСТВИЙ =====
    handleIncomingAction(data) {
        if (window.GlassXO.effects) {
            window.GlassXO.effects.handleAdminAction(data);
        }
    }
}

// Глобальные функции для быстрого доступа
window.quickTroll = (userId, trollType) => {
    if (window.GlassXO.adminPanel) {
        window.GlassXO.adminPanel.quickTroll(userId, trollType);
    }
}; 