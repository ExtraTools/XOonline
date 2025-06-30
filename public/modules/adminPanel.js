// ===== СОВРЕМЕННАЯ АДМИН ПАНЕЛЬ v3.0 =====

export class AdminPanel {
    constructor() {
        this.isVisible = false;
        this.isAdmin = false;
        this.users = [];
        this.allUsers = [];
        this.stats = { onlinePlayers: 0, activeGames: 0 };
        this.selectedUsers = new Set();
        this.currentSection = 'dashboard';
        this.actionCount = 0;
        
        this.init();
        console.log('🔥 Modern AdminPanel v3.0 инициализирована');
    }

    init() {
        this.createModernAdminPanel();
        this.setupEventListeners();
        this.setupSecretInput();
    }

    // ===== СОЗДАНИЕ СОВРЕМЕННОЙ АДМИН ПАНЕЛИ =====
    createModernAdminPanel() {
        const panel = document.createElement('div');
        panel.id = 'admin-panel';
        panel.className = 'modern-admin-panel';
        panel.innerHTML = `
            <div class="admin-backdrop" id="admin-backdrop"></div>
            <div class="admin-container">
                <!-- Боковая навигация -->
                <nav class="admin-sidebar">
                    <div class="sidebar-header">
                        <div class="admin-logo">
                            <span class="logo-icon">🔥</span>
                            <span class="logo-text">KRESTIKI</span>
                            <span class="logo-badge">ADMIN</span>
                        </div>
                        <button class="sidebar-toggle" id="sidebar-toggle">
                            <i class="fas fa-bars"></i>
                        </button>
                    </div>
                    
                    <div class="sidebar-menu">
                        <div class="menu-section">
                            <span class="section-title">Управление</span>
                            <div class="menu-items">
                                <button class="menu-item active" data-section="dashboard">
                                    <i class="fas fa-chart-line"></i>
                                    <span>Дашборд</span>
                                </button>
                                <button class="menu-item" data-section="users">
                                    <i class="fas fa-users"></i>
                                    <span>Пользователи</span>
                                    <span class="badge" id="users-badge">0</span>
                                </button>
                                <button class="menu-item" data-section="actions">
                                    <i class="fas fa-bolt"></i>
                                    <span>Действия</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="menu-section">
                            <span class="section-title">Троллинг</span>
                            <div class="menu-items">
                                <button class="menu-item" data-section="screamers">
                                    <i class="fas fa-skull"></i>
                                    <span>Скримеры</span>
                                </button>
                                <button class="menu-item" data-section="effects">
                                    <i class="fas fa-magic"></i>
                                    <span>Эффекты</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="menu-section">
                            <span class="section-title">Система</span>
                            <div class="menu-items">
                                <button class="menu-item" data-section="server">
                                    <i class="fas fa-server"></i>
                                    <span>Сервер</span>
                                </button>
                                <button class="menu-item" data-section="logs">
                                    <i class="fas fa-file-alt"></i>
                                    <span>Логи</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sidebar-footer">
                        <div class="admin-profile">
                            <div class="profile-avatar">👑</div>
                            <div class="profile-info">
                                <div class="profile-name">Супер Админ</div>
                                <div class="profile-status">Онлайн</div>
                            </div>
                        </div>
                        <button class="logout-btn" id="admin-logout">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </nav>

                <!-- Основной контент -->
                <main class="admin-main">
                    <div class="admin-header">
                        <div class="header-left">
                            <h1 class="page-title" id="page-title">Дашборд</h1>
                            <div class="breadcrumb">
                                <span>Админ панель</span>
                                <i class="fas fa-chevron-right"></i>
                                <span id="breadcrumb-current">Дашборд</span>
                            </div>
                        </div>
                        <div class="header-right">
                            <div class="quick-actions">
                                <button class="quick-btn" id="quick-refresh" title="Обновить">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                                <button class="quick-btn" id="quick-settings" title="Настройки">
                                    <i class="fas fa-cog"></i>
                                </button>
                                <button class="close-btn" id="admin-close">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="admin-content">
                        <!-- Дашборд -->
                        <div class="content-section active" id="dashboard-section">
                            <div class="stats-grid">
                                <div class="stat-card primary">
                                    <div class="stat-icon">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <div class="stat-content">
                                        <div class="stat-number" id="stat-online">0</div>
                                        <div class="stat-label">Онлайн</div>
                                    </div>
                                    <div class="stat-trend up">
                                        <i class="fas fa-arrow-up"></i>
                                        <span>+12%</span>
                                    </div>
                                </div>
                                
                                <div class="stat-card success">
                                    <div class="stat-icon">
                                        <i class="fas fa-gamepad"></i>
                                    </div>
                                    <div class="stat-content">
                                        <div class="stat-number" id="stat-games">0</div>
                                        <div class="stat-label">Активных игр</div>
                                    </div>
                                    <div class="stat-trend up">
                                        <i class="fas fa-arrow-up"></i>
                                        <span>+8%</span>
                                    </div>
                                </div>
                                
                                <div class="stat-card warning">
                                    <div class="stat-icon">
                                        <i class="fas fa-bolt"></i>
                                    </div>
                                    <div class="stat-content">
                                        <div class="stat-number" id="stat-actions">0</div>
                                        <div class="stat-label">Выполнено действий</div>
                                    </div>
                                    <div class="stat-trend up">
                                        <i class="fas fa-arrow-up"></i>
                                        <span>+25%</span>
                                    </div>
                                </div>
                                
                                <div class="stat-card danger">
                                    <div class="stat-icon">
                                        <i class="fas fa-database"></i>
                                    </div>
                                    <div class="stat-content">
                                        <div class="stat-number" id="stat-total">0</div>
                                        <div class="stat-label">Всего пользователей</div>
                                    </div>
                                    <div class="stat-trend up">
                                        <i class="fas fa-arrow-up"></i>
                                        <span>+15%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="dashboard-grid">
                                <div class="dashboard-card">
                                    <div class="card-header">
                                        <h3>🔥 Быстрые действия</h3>
                                    </div>
                                    <div class="card-content">
                                        <div class="quick-actions-grid">
                                            <button class="action-btn danger" id="mass-mega-screamer">
                                                <i class="fas fa-skull-crossbones"></i>
                                                МЕГА СКРИМЕР
                                            </button>
                                            <button class="action-btn warning" id="mass-disconnect">
                                                <i class="fas fa-ban"></i>
                                                Отключить всех
                                            </button>
                                            <button class="action-btn info" id="mass-announcement">
                                                <i class="fas fa-bullhorn"></i>
                                                Объявление
                                            </button>
                                            <button class="action-btn success" id="server-restart">
                                                <i class="fas fa-redo"></i>
                                                Перезагрузка
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="dashboard-card">
                                    <div class="card-header">
                                        <h3>📊 Активность</h3>
                                    </div>
                                    <div class="card-content">
                                        <div class="activity-list" id="activity-list">
                                            <div class="activity-item">
                                                <div class="activity-icon success">
                                                    <i class="fas fa-user-plus"></i>
                                                </div>
                                                <div class="activity-content">
                                                    <div class="activity-title">Новый пользователь</div>
                                                    <div class="activity-time">Только что</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Пользователи -->
                        <div class="content-section" id="users-section">
                            <div class="section-header">
                                <div class="section-title">
                                    <h2>👥 Управление пользователями</h2>
                                    <span class="subtitle">Активных: <span id="users-count">0</span></span>
                                </div>
                                <div class="section-actions">
                                    <button class="btn secondary" id="select-all-users">
                                        <i class="fas fa-check-square"></i>
                                        Выбрать всех
                                    </button>
                                    <button class="btn primary" id="refresh-users">
                                        <i class="fas fa-sync-alt"></i>
                                        Обновить
                                    </button>
                                </div>
                            </div>

                            <div class="users-controls">
                                <div class="controls-left">
                                    <div class="tabs">
                                        <button class="tab active" data-tab="online">
                                            🟢 Онлайн (<span id="online-count">0</span>)
                                        </button>
                                        <button class="tab" data-tab="all">
                                            📊 Все (<span id="total-count">0</span>)
                                        </button>
                                    </div>
                                </div>
                                <div class="controls-right">
                                    <div class="search-box">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="users-search" placeholder="Поиск пользователей...">
                                    </div>
                                </div>
                            </div>

                            <div class="users-container">
                                <div class="users-grid" id="users-grid">
                                    <!-- Пользователи будут добавлены динамически -->
                                </div>
                            </div>
                        </div>

                        <!-- Другие секции будут добавлены в следующей части -->
                    </div>
                </main>
            </div>
        `;
        
        document.body.appendChild(panel);
    }

    // ===== СОБЫТИЯ =====
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Закрытие панели
            if (e.target.id === 'admin-close' || e.target.id === 'admin-backdrop') {
                this.hide();
            }
            
            // Навигация по секциям
            if (e.target.classList.contains('menu-item')) {
                const section = e.target.getAttribute('data-section');
                this.switchSection(section);
            }
            
            // Вкладки пользователей
            if (e.target.classList.contains('tab')) {
                const tab = e.target.getAttribute('data-tab');
                this.switchUsersTab(tab);
            }
            
            // Быстрые действия
            if (e.target.id === 'refresh-users' || e.target.id === 'quick-refresh') this.refreshUsers();
            if (e.target.id === 'select-all-users') this.selectAllUsers();
            if (e.target.id === 'mass-mega-screamer') this.quickMegaScreener();
            if (e.target.id === 'mass-disconnect') this.quickMassDisconnect();
            if (e.target.id === 'mass-announcement') this.quickAnnouncement();
            if (e.target.id === 'server-restart') this.quickServerRestart();
            
            // Логаут
            if (e.target.id === 'admin-logout') this.logout();
        });

        // Поиск пользователей
        document.addEventListener('input', (e) => {
            if (e.target.id === 'users-search') {
                this.filterUsers(e.target.value);
            }
        });
    }

    // ===== СЕКРЕТНЫЙ ВХОД =====
    setupSecretInput() {
        console.log('🔧 Настройка секретного ввода...');
        
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
        
        secretInput.addEventListener('focus', () => {
            secretInput.style.opacity = '0.1';
            secretInput.style.background = 'rgba(255, 0, 0, 0.05)';
        });
        
        secretInput.addEventListener('blur', () => {
            secretInput.style.opacity = '0';
            secretInput.style.background = 'transparent';
        });
        
        secretInput.addEventListener('input', (e) => {
            if (e.target.value.toLowerCase() === 'admin-start') {
                this.activateAdmin();
                e.target.value = '';
                e.target.blur();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    secretInput.focus();
                    e.preventDefault();
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.clientX < 80 && e.clientY < 80) {
                secretInput.focus();
                e.preventDefault();
            }
        });
        
        document.body.appendChild(secretInput);
        console.log('✅ Секретный вход настроен: кликните в левый верхний угол и введите "admin-start"');
    }

    // ===== АКТИВАЦИЯ АДМИНА =====
    activateAdmin() {
        this.isAdmin = true;
        window.GlassXO.player.isAdmin = true;
        
        if (window.GlassXO.socket && window.GlassXO.socket.socket) {
            window.GlassXO.socket.socket.emit('admin_activate', {
                timestamp: Date.now()
            });
        }
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('🔥 Современная админ панель v3.0 активирована!', 'success');
        }
        
        this.show();
    }

    // ===== ПЕРЕКЛЮЧЕНИЕ СЕКЦИЙ =====
    switchSection(section) {
        // Убираем активные классы
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        
        // Активируем новую секцию
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        document.getElementById(`${section}-section`)?.classList.add('active');
        
        // Обновляем заголовок
        const titles = {
            dashboard: 'Дашборд',
            users: 'Пользователи',
            actions: 'Действия',
            screamers: 'Скримеры',
            effects: 'Эффекты',
            server: 'Сервер',
            logs: 'Логи'
        };
        
        document.getElementById('page-title').textContent = titles[section];
        document.getElementById('breadcrumb-current').textContent = titles[section];
        
        this.currentSection = section;
        
        if (section === 'users') {
            this.refreshUsers();
        }
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
            console.log('🔥 Современная админ панель открыта');
        }
    }

    hide() {
        const panel = document.getElementById('admin-panel');
        if (panel) {
            panel.classList.remove('active');
            this.isVisible = false;
        }
    }

    logout() {
        this.isAdmin = false;
        window.GlassXO.player.isAdmin = false;
        this.hide();
        
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('👋 Выход из админ панели', 'info');
        }
    }

    // ===== ОБНОВЛЕНИЕ ДАННЫХ =====
    refreshUsers() {
        if (window.GlassXO.socket && window.GlassXO.socket.socket) {
            window.GlassXO.socket.socket.emit('admin_get_users');
        }
    }

    updateUsersList(data) {
        console.log('📊 Обновление списка пользователей:', data);
        
        if (data && data.online) {
            this.users = data.online || [];
            this.allUsers = data.all || [];
            this.serverStats = data.stats || {};
        } else {
            this.users = Array.isArray(data) ? data : [];
        }
        
        this.renderUsers();
        this.updateCounters();
        this.updateStats(this.serverStats);
    }

    updateCounters() {
        document.getElementById('users-badge').textContent = this.users.length;
        document.getElementById('online-count').textContent = this.users.length;
        document.getElementById('total-count').textContent = this.allUsers ? this.allUsers.length : 0;
        document.getElementById('users-count').textContent = this.users.length;
    }

    updateStats(stats) {
        if (stats) this.stats = stats;
        
        document.getElementById('stat-online').textContent = this.users.length || 0;
        document.getElementById('stat-games').textContent = this.stats.activeGames || 0;
        document.getElementById('stat-actions').textContent = this.actionCount;
        document.getElementById('stat-total').textContent = this.allUsers ? this.allUsers.length : 0;
    }

    // ===== БЫСТРЫЕ ДЕЙСТВИЯ =====
    quickMegaScreener() {
        if (!confirm('☠️ ВНИМАНИЕ!\n\nЗапустить МЕГА СКРИМЕР для ВСЕХ пользователей на сервере?\n\nЭто очень интенсивный эффект!')) {
            return;
        }
        
        this.sendAdminAction('mega_screamer', {
            targets: 'all',
            duration: 10000,
            videoFile: 'assets/scrim/MEGAScreamer.mp4'
        });
        
        this.showNotification('☠️ МЕГА СКРИМЕР запущен для всех!', 'error');
    }

    quickMassDisconnect() {
        if (!confirm('⚠️ Отключить всех пользователей с сервера?')) return;
        
        this.sendAdminAction('disconnect', { targets: 'all' });
        this.showNotification('🚫 Все пользователи отключены!', 'warning');
    }

    quickAnnouncement() {
        const message = prompt('📢 Введите текст объявления для всех пользователей:');
        if (!message) return;
        
        this.sendAdminAction('announce', { targets: 'all', message });
        this.showNotification('📢 Массовое объявление отправлено!', 'success');
    }

    quickServerRestart() {
        if (!confirm('♻️ Перезагрузить сервер?\n\nВсе пользователи будут отключены!')) return;
        
        this.sendAdminAction('restart_server', {});
        this.showNotification('♻️ Сервер перезагружается...', 'warning');
    }

    // ===== ОБРАБОТКА ВХОДЯЩИХ ДЕЙСТВИЙ =====
    handleIncomingAction(data) {
        console.log('🔧 Обработка входящего админ действия:', data);
        
        switch(data.action || data.type) {
            case 'screamer':
                this.handleScreener(data);
                break;
                
            case 'mega_screamer':
                this.handleMegaScreener(data);
                break;
                
            case 'announcement':
                this.handleAnnouncement(data);
                break;
                
            case 'disconnect':
                this.handleDisconnect(data);
                break;
                
            case 'clear_effects':
                this.handleClearEffects(data);
                break;
                
            case 'maintenance':
                this.handleMaintenance(data);
                break;
                
            case 'server_restart':
                this.handleServerRestart(data);
                break;
                
            default:
                console.log('❓ Неизвестное админ действие:', data);
                break;
        }
        
        // Добавляем в лог активности
        this.addActivity(data);
    }

    handleScreener(data) {
        if (window.GlassXO.effects) {
            window.GlassXO.effects.showScreener(data.duration || 5000);
        }
        this.showNotification('💀 Скример активирован!', 'error');
    }

    handleMegaScreener(data) {
        if (window.GlassXO.effects) {
            window.GlassXO.effects.showMegaScreener(data.duration || 10000, data.videoFile);
        }
        this.showNotification('☠️ МЕГА СКРИМЕР активирован!', 'error');
    }

    handleAnnouncement(data) {
        this.showNotification(`📢 ${data.message}`, 'info');
        
        // Показываем модальное окно с объявлением
        if (window.GlassXO.ui) {
            alert(`📢 Объявление администратора:\n\n${data.message}`);
        }
    }

    handleDisconnect(data) {
        this.showNotification('🚫 Вы были отключены администратором', 'error');
        
        // Отключаемся через 2 секунды
        setTimeout(() => {
            if (window.GlassXO.socket) {
                window.GlassXO.socket.disconnect();
            }
            location.reload();
        }, 2000);
    }

    handleClearEffects(data) {
        if (window.GlassXO.effects) {
            window.GlassXO.effects.clearAllEffects();
        }
        this.showNotification('🧹 Все эффекты очищены', 'success');
    }

    handleMaintenance(data) {
        if (data.enabled) {
            this.showNotification('🔧 Режим обслуживания включен', 'warning');
        } else {
            this.showNotification('✅ Режим обслуживания отключен', 'success');
        }
    }

    handleServerRestart(data) {
        this.showNotification('♻️ Сервер будет перезагружен через 10 секунд!', 'error');
        
        // Показываем предупреждение
        if (window.GlassXO.ui) {
            alert('♻️ ВНИМАНИЕ!\n\nСервер будет перезагружен через 10 секунд!\nВся несохраненная информация будет потеряна.');
        }
    }

    addActivity(data) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;
        
        const actionIcons = {
            'screamer': { icon: 'fas fa-skull', color: 'danger' },
            'mega_screamer': { icon: 'fas fa-skull-crossbones', color: 'danger' },
            'announcement': { icon: 'fas fa-bullhorn', color: 'info' },
            'disconnect': { icon: 'fas fa-ban', color: 'warning' },
            'maintenance': { icon: 'fas fa-wrench', color: 'warning' },
            'server_restart': { icon: 'fas fa-redo', color: 'danger' }
        };
        
        const actionData = actionIcons[data.action] || { icon: 'fas fa-cog', color: 'info' };
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon ${actionData.color}">
                <i class="${actionData.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">Админ действие: ${data.action}</div>
                <div class="activity-time">Только что</div>
            </div>
        `;
        
        // Добавляем в начало списка
        activityList.insertBefore(activityItem, activityList.firstChild);
        
        // Ограничиваем количество элементов
        const items = activityList.querySelectorAll('.activity-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    // ===== УТИЛИТЫ =====
    sendAdminAction(action, data) {
        if (window.GlassXO.socket && window.GlassXO.socket.socket) {
            window.GlassXO.socket.socket.emit('admin_action', {
                action: action,
                data: data,
                timestamp: Date.now()
            });
            
            this.actionCount++;
            this.updateStats();
        }
    }

    showNotification(message, type) {
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // ===== РЕНДЕРИНГ ПОЛЬЗОВАТЕЛЕЙ =====
    renderUsers() {
        const usersGrid = document.getElementById('users-grid');
        if (!usersGrid) return;
        
        const currentTab = document.querySelector('.tab.active')?.getAttribute('data-tab') || 'online';
        const usersList = currentTab === 'online' ? this.users : this.allUsers;
        
        usersGrid.innerHTML = '';
        
        if (!usersList || usersList.length === 0) {
            usersGrid.innerHTML = `
                <div class="no-users">
                    <div class="no-users-icon">👥</div>
                    <div class="no-users-text">Пользователей не найдено</div>
                </div>
            `;
            return;
        }
        
        usersList.forEach(user => {
            const userCard = this.createUserCard(user, currentTab === 'online');
            usersGrid.appendChild(userCard);
        });
    }

    createUserCard(user, isOnline = false) {
        const card = document.createElement('div');
        card.className = `user-card ${this.selectedUsers.has(user.id || user.socketId) ? 'selected' : ''}`;
        card.dataset.userId = user.id || user.socketId;
        
        const statusBadge = isOnline ? 
            '<span class="user-status online">🟢 Онлайн</span>' : 
            '<span class="user-status offline">⚫ Оффлайн</span>';
        
        const stats = user.stats || {};
        const level = user.level || 1;
        const rating = stats.rating || 1000;
        
        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-avatar">
                    ${user.avatar ? `<img src="${user.avatar}" alt="Avatar">` : '👤'}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name || user.nickname || 'Неизвестный'}</div>
                    <div class="user-details">
                        ${statusBadge}
                        <span class="user-level">Уровень ${level}</span>
                    </div>
                </div>
                <button class="user-select-btn" onclick="window.GlassXO.adminPanel.toggleUserSelection('${user.id || user.socketId}')">
                    <i class="fas fa-check"></i>
                </button>
            </div>
            
            <div class="user-stats">
                <div class="stat-item">
                    <div class="stat-value">${stats.gamesPlayed || 0}</div>
                    <div class="stat-label">Игр</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.gamesWon || 0}</div>
                    <div class="stat-label">Побед</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(stats.winRate || 0)}%</div>
                    <div class="stat-label">Винрейт</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${rating}</div>
                    <div class="stat-label">Рейтинг</div>
                </div>
            </div>
            
            <div class="user-actions">
                <button class="action-btn-sm danger" onclick="window.GlassXO.adminPanel.quickAction('screamer', ['${user.id || user.socketId}'])" title="Скример">
                    <i class="fas fa-skull"></i>
                </button>
                <button class="action-btn-sm warning" onclick="window.GlassXO.adminPanel.quickAction('lag', ['${user.id || user.socketId}'])" title="Лаг">
                    <i class="fas fa-stopwatch"></i>
                </button>
                <button class="action-btn-sm info" onclick="window.GlassXO.adminPanel.quickAction('announce', ['${user.id || user.socketId}'])" title="Сообщение">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="action-btn-sm danger" onclick="window.GlassXO.adminPanel.quickAction('disconnect', ['${user.id || user.socketId}'])" title="Отключить">
                    <i class="fas fa-ban"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    // ===== УПРАВЛЕНИЕ ВЫБОРОМ =====
    toggleUserSelection(userId) {
        if (this.selectedUsers.has(userId)) {
            this.selectedUsers.delete(userId);
        } else {
            this.selectedUsers.add(userId);
        }
        
        // Обновляем визуальное отображение
        const card = document.querySelector(`[data-user-id="${userId}"]`);
        if (card) {
            card.classList.toggle('selected', this.selectedUsers.has(userId));
        }
        
        this.updateSelectionCounter();
    }

    selectAllUsers() {
        const userCards = document.querySelectorAll('.user-card');
        userCards.forEach(card => {
            const userId = card.dataset.userId;
            this.selectedUsers.add(userId);
            card.classList.add('selected');
        });
        
        this.updateSelectionCounter();
    }

    updateSelectionCounter() {
        const selectedCount = this.selectedUsers.size;
        const selectAllBtn = document.getElementById('select-all-users');
        if (selectAllBtn) {
            selectAllBtn.innerHTML = `
                <i class="fas fa-check-square"></i>
                Выбрано: ${selectedCount}
            `;
        }
    }

    // ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
    switchUsersTab(tab) {
        // Убираем активный класс со всех вкладок
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        
        // Активируем нужную вкладку
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Очищаем выбор
        this.selectedUsers.clear();
        
        // Перерендериваем пользователей
        this.renderUsers();
    }

    // ===== ФИЛЬТРАЦИЯ =====
    filterUsers(query) {
        if (!query) {
            this.renderUsers();
            return;
        }
        
        const userCards = document.querySelectorAll('.user-card');
        const searchQuery = query.toLowerCase();
        
        userCards.forEach(card => {
            const userName = card.querySelector('.user-name').textContent.toLowerCase();
            const matches = userName.includes(searchQuery);
            card.style.display = matches ? 'block' : 'none';
        });
    }

    // ===== БЫСТРЫЕ ДЕЙСТВИЯ С ПОЛЬЗОВАТЕЛЯМИ =====
    quickAction(action, userIds) {
        if (!userIds || userIds.length === 0) {
            this.showNotification('❌ Выберите пользователей', 'error');
            return;
        }
        
        switch(action) {
            case 'screamer':
                this.sendAdminAction('screamer', {
                    targets: userIds,
                    duration: 5000
                });
                this.showNotification(`💀 Скример отправлен ${userIds.length} пользователям`, 'warning');
                break;
                
            case 'lag':
                this.sendAdminAction('lag', {
                    targets: userIds,
                    intensity: 3,
                    duration: 10000
                });
                this.showNotification(`🐌 Лаги активированы для ${userIds.length} пользователей`, 'warning');
                break;
                
            case 'announce':
                const message = prompt('📢 Введите сообщение для выбранных пользователей:');
                if (!message) return;
                
                this.sendAdminAction('announce', {
                    targets: userIds,
                    message: message
                });
                this.showNotification(`📢 Сообщение отправлено ${userIds.length} пользователям`, 'success');
                break;
                
            case 'disconnect':
                if (!confirm(`🚫 Отключить ${userIds.length} пользователей?`)) return;
                
                this.sendAdminAction('disconnect', {
                    targets: userIds
                });
                this.showNotification(`🚫 Отключено ${userIds.length} пользователей`, 'danger');
                break;
        }
    }
}

// Экспорт для совместимости
window.AdminPanel = AdminPanel; 