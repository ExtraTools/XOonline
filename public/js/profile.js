// Профиль игрока
class GameProfile {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.initTabs();
        this.initModals();
        this.initAvatarSystem();
        this.initFriendSystem();
        this.initSettings();
        this.initCharts();
        this.addEventListeners();
    }

    // Загрузка данных пользователя
    async loadUserData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'index.html';
                return;
            }

            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.updateProfileDisplay();
                this.loadPlayerStats();
            } else {
                throw new Error('Ошибка загрузки профиля');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            // Используем демо данные если сервер недоступен
            this.loadDemoData();
        }
    }

    // Демо данные для отображения
    loadDemoData() {
        this.currentUser = {
            username: 'GamerPro2025',
            email: 'gamer@example.com',
            avatar: 'avatars/photo_2025-07-03_02-50-32.jpg',
            level: 25,
            rating: 1580,
            memberSince: 'Январь 2025',
            stats: {
                totalGames: 245,
                wins: 156,
                losses: 89,
                winRate: 63.7,
                bestStreak: 12,
                avgGameTime: '4:32',
                favoriteMode: 'XO Classic',
                playTime: '48 часов'
            }
        };
        this.updateProfileDisplay();
        this.loadPlayerStats();
    }

    // Обновление отображения профиля
    updateProfileDisplay() {
        if (!this.currentUser) return;

        // Обновляем основную информацию
        const usernameEl = document.getElementById('profileUsername');
        const avatarEl = document.getElementById('profileAvatar');
        const levelEl = document.getElementById('playerLevel');
        const ratingEl = document.getElementById('playerRating');
        const memberSinceEl = document.getElementById('memberSince');

        if (usernameEl) usernameEl.textContent = this.currentUser.username;
        if (avatarEl) avatarEl.src = this.currentUser.avatar;
        if (levelEl) levelEl.textContent = this.currentUser.level;
        if (ratingEl) ratingEl.textContent = this.currentUser.rating;
        if (memberSinceEl) memberSinceEl.textContent = this.currentUser.memberSince;

        // Обновляем статистику
        this.updateStatsDisplay();
    }

    // Обновление статистики
    updateStatsDisplay() {
        if (!this.currentUser?.stats) return;

        const stats = this.currentUser.stats;
        
        // Обновляем числовые значения статистики
        const statElements = {
            totalGames: stats.totalGames,
            winRate: `${stats.winRate}%`,
            bestStreak: stats.bestStreak,
            avgGameTime: stats.avgGameTime,
            favoriteMode: stats.favoriteMode,
            playTime: stats.playTime
        };

        Object.entries(statElements).forEach(([key, value]) => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) element.textContent = value;
        });
    }

    // Инициализация вкладок
    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Убираем активный класс со всех вкладок
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Добавляем активный класс к выбранной вкладке
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                    
                    // Загружаем данные для конкретной вкладки
                    this.loadTabContent(targetTab);
                }
                
                // Анимация
                this.animateTabChange();
            });
        });
    }

    // Загрузка контента вкладки
    loadTabContent(tabName) {
        switch (tabName) {
            case 'stats':
                this.loadStatistics();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'friends':
                this.loadFriends();
                break;
        }
    }

    // Анимация смены вкладки
    animateTabChange() {
        const activeContent = document.querySelector('.tab-content.active');
        if (activeContent) {
            activeContent.style.opacity = '0';
            activeContent.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                activeContent.style.opacity = '1';
                activeContent.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    // Инициализация модальных окон
    initModals() {
        // Модальное окно смены аватара
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const avatarModal = document.getElementById('avatarModal');
        const closeAvatarModal = document.getElementById('closeAvatarModal');

        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => {
                this.showModal(avatarModal);
            });
        }

        if (closeAvatarModal) {
            closeAvatarModal.addEventListener('click', () => {
                this.hideModal(avatarModal);
            });
        }

        // Закрытие модального окна по клику на фон
        if (avatarModal) {
            avatarModal.addEventListener('click', (e) => {
                if (e.target === avatarModal) {
                    this.hideModal(avatarModal);
                }
            });
        }
    }

    // Показать модальное окно
    showModal(modal) {
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Скрыть модальное окно
    hideModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Система аватаров
    initAvatarSystem() {
        // Выбор аватара из предустановленных
        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                const avatarSrc = option.getAttribute('data-avatar');
                this.changeAvatar(avatarSrc);
            });
        });

        // Загрузка собственного аватара
        const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
        const avatarUpload = document.getElementById('avatarUpload');

        if (uploadAvatarBtn && avatarUpload) {
            uploadAvatarBtn.addEventListener('click', () => {
                avatarUpload.click();
            });

            avatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.uploadCustomAvatar(file);
                }
            });
        }

        // Выбор аватара в инвентаре
        const avatarItems = document.querySelectorAll('.avatar-item');
        avatarItems.forEach(item => {
            if (!item.classList.contains('locked')) {
                item.addEventListener('click', () => {
                    const img = item.querySelector('img');
                    if (img) {
                        this.changeAvatar(img.src);
                        this.updateAvatarSelection(item);
                    }
                });
            }
        });
    }

    // Смена аватара
    async changeAvatar(avatarSrc) {
        try {
            // Обновляем локально
            this.currentUser.avatar = avatarSrc;
            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
                profileAvatar.src = avatarSrc;
            }

            // Отправляем на сервер (если доступен)
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('/api/user/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ avatar: avatarSrc })
                });
            }

            // Закрываем модальное окно
            const avatarModal = document.getElementById('avatarModal');
            this.hideModal(avatarModal);

            this.showNotification('Аватар успешно изменен!', 'success');
        } catch (error) {
            console.error('Ошибка смены аватара:', error);
            this.showNotification('Ошибка смены аватара', 'error');
        }
    }

    // Загрузка собственного аватара
    uploadCustomAvatar(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.changeAvatar(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    // Обновление выбора аватара
    updateAvatarSelection(selectedItem) {
        document.querySelectorAll('.avatar-item').forEach(item => {
            item.classList.remove('active');
        });
        selectedItem.classList.add('active');
    }

    // Система друзей
    initFriendSystem() {
        const addFriendBtn = document.querySelector('.add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                this.showAddFriendDialog();
            });
        }

        // Кнопки действий с друзьями
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.textContent.trim();
                const friendItem = btn.closest('.friend-item');
                const friendName = friendItem.querySelector('h4').textContent;

                switch (action) {
                    case 'Пригласить':
                        this.inviteFriend(friendName);
                        break;
                    case 'Сообщение':
                        this.openChat(friendName);
                        break;
                }
            });
        });
    }

    // Диалог добавления друга
    showAddFriendDialog() {
        const friendName = prompt('Введите имя пользователя:');
        if (friendName) {
            this.addFriend(friendName);
        }
    }

    // Добавление друга
    async addFriend(friendName) {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await fetch('/api/friends/add', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ friendName })
                });

                if (response.ok) {
                    this.showNotification(`Запрос в друзья отправлен ${friendName}`, 'success');
                    this.loadFriends();
                } else {
                    throw new Error('Ошибка добавления друга');
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showNotification('Ошибка добавления друга', 'error');
        }
    }

    // Приглашение друга в игру
    inviteFriend(friendName) {
        this.showNotification(`Приглашение отправлено ${friendName}`, 'info');
    }

    // Открытие чата
    openChat(friendName) {
        this.showNotification(`Открытие чата с ${friendName}`, 'info');
    }

    // Настройки
    initSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    // Показать настройки
    showSettings() {
        this.showNotification('Настройки профиля', 'info');
    }

    // Выход из аккаунта
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    }

    // Инициализация графиков
    initCharts() {
        this.createGamesChart();
        this.createRatingChart();
    }

    // График игр
    createGamesChart() {
        const canvas = document.getElementById('gamesChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = {
            wins: 156,
            losses: 89
        };

        // Простой круговой график
        this.drawPieChart(ctx, data);
    }

    // График рейтинга
    createRatingChart() {
        const canvas = document.getElementById('ratingChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = [1200, 1300, 1450, 1380, 1520, 1580]; // Рейтинг по месяцам

        // Простой линейный график
        this.drawLineChart(ctx, data);
    }

    // Рисование круговой диаграммы
    drawPieChart(ctx, data) {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        const total = data.wins + data.losses;
        const winsAngle = (data.wins / total) * 2 * Math.PI;

        // Победы
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, winsAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();

        // Поражения
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, winsAngle, 2 * Math.PI);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = '#F44336';
        ctx.fill();

        // Подписи
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Победы: ${data.wins}`, centerX, centerY - 10);
        ctx.fillText(`Поражения: ${data.losses}`, centerX, centerY + 10);
    }

    // Рисование линейного графика
    drawLineChart(ctx, data) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;

        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue;

        // Очистка canvas
        ctx.clearRect(0, 0, width, height);

        // Линия графика
        ctx.beginPath();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;

        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((value - minValue) / valueRange) * (height - padding * 2);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Точки
        ctx.fillStyle = '#4CAF50';
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((value - minValue) / valueRange) * (height - padding * 2);

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    // Загрузка статистики
    loadStatistics() {
        // Обновляем графики при переходе на вкладку статистики
        setTimeout(() => {
            this.createGamesChart();
            this.createRatingChart();
        }, 100);
    }

    // Загрузка достижений
    loadAchievements() {
        // Анимация разблокированных достижений
        document.querySelectorAll('.achievement-card.unlocked').forEach((card, index) => {
            setTimeout(() => {
                card.style.transform = 'translateY(-5px)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
            }, index * 100);
        });
    }

    // Загрузка инвентаря
    loadInventory() {
        // Анимация предметов инвентаря
        document.querySelectorAll('.avatar-item, .badge-item').forEach((item, index) => {
            setTimeout(() => {
                item.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    item.style.transform = '';
                }, 200);
            }, index * 50);
        });
    }

    // Загрузка друзей
    loadFriends() {
        // Анимация списка друзей
        document.querySelectorAll('.friend-item').forEach((item, index) => {
            setTimeout(() => {
                item.style.transform = 'translateX(10px)';
                setTimeout(() => {
                    item.style.transform = '';
                }, 200);
            }, index * 100);
        });
    }

    // Загрузка статистики игрока
    async loadPlayerStats() {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await fetch('/api/user/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const stats = await response.json();
                    this.updateStatsFromServer(stats);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    // Обновление статистики с сервера
    updateStatsFromServer(stats) {
        // Обновляем различные элементы статистики
        if (stats.level) {
            const levelEl = document.getElementById('playerLevel');
            if (levelEl) levelEl.textContent = stats.level;
        }

        if (stats.rating) {
            const ratingEl = document.getElementById('playerRating');
            if (ratingEl) ratingEl.textContent = stats.rating;
        }

        // Обновляем графики с новыми данными
        if (stats.gamesData) {
            this.updateChartsWithServerData(stats.gamesData);
        }
    }

    // Обновление графиков с данными сервера
    updateChartsWithServerData(gamesData) {
        // Обновляем данные для графиков
        setTimeout(() => {
            this.createGamesChart();
            this.createRatingChart();
        }, 100);
    }

    // Добавление общих обработчиков событий
    addEventListeners() {
        // Обработка ошибок изображений
        document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', () => {
                img.src = 'avatars/photo_2025-07-03_02-50-32.jpg'; // Дефолтный аватар
            });
        });

        // Клавиатурные сокращения
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Закрытие всех модальных окон
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.hideModal(modal);
                });
            }
        });

        // Автообновление онлайн статуса
        setInterval(() => {
            this.updateOnlineStatus();
        }, 30000); // Каждые 30 секунд
    }

    // Обновление онлайн статуса
    updateOnlineStatus() {
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.classList.add('online');
        }
    }

    // Показ уведомлений
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Стили уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 2rem',
            borderRadius: '10px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px'
        });

        // Цвета в зависимости от типа
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            info: '#2196F3',
            warning: '#FF9800'
        };

        notification.style.background = colors[type] || colors.info;

        // Добавляем на страницу
        document.body.appendChild(notification);

        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Автоматическое удаление
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const profile = new GameProfile();
    
    // Экспортируем в глобальную область для отладки
    window.gameProfile = profile;
}); 