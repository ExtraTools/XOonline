// Modern Launcher App для DiLauncher

class ModernLauncher {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.downloadLinks = {
            windows: '',
            mac: '',
            linux: ''
        };
        this.aiAssistantInitialized = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupScrollAnimations();
        this.checkAuthState();
        this.startAnimations();
        this.setupLauncherDemo();
        this.setupDiscordAuth();
        this.handleAuthCallback();
        this.setupUpdateLog();
    }

    setupEventListeners() {
        // Навигация
        this.setupNavigation();
        
        // Мобильное меню
        this.setupMobileMenu();
        
        // Модальные окна
        this.setupModals();
        
        // Кнопки скачивания
        this.setupDownloadButtons();
        
        // Форма авторизации
        this.setupAuthForms();
        
        // Плавная прокрутка
        this.setupSmoothScroll();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.navbar-link');
        const navbar = document.querySelector('.navbar');
        let isScrolling = false;
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Устанавливаем флаг прокрутки
                isScrolling = true;
                
                // Убеждаемся что навбар остается видимым
                if (navbar) {
                    navbar.style.opacity = '1';
                    navbar.style.visibility = 'visible';
                    navbar.style.transform = 'none';
                }
                
                // Мгновенно обновляем активную ссылку
                navLinks.forEach(nl => {
                    nl.classList.remove('active');
                });
                link.classList.add('active');
                
                // Прокручиваем к секции
                const targetId = link.getAttribute('href');
                if (targetId.startsWith('#')) {
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        const offsetTop = targetSection.offsetTop - 80;
                        
                        // Отключаем View Transitions для навигации
                        if (document.startViewTransition) {
                            // Простая прокрутка без view transitions
                            window.scrollTo({
                                top: offsetTop,
                                behavior: 'smooth'
                            });
                        } else {
                            // Обычная прокрутка для браузеров без поддержки
                            window.scrollTo({
                                top: offsetTop,
                                behavior: 'smooth'
                            });
                        }
                        
                        // Сбрасываем флаг через короткое время
                        setTimeout(() => {
                            isScrolling = false;
                        }, 300);
                    }
                }
            });
        });

        // Обновляем активную ссылку при прокрутке (только если не используется навигация)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.updateActiveNavLink();
                }, 50);
            }
        });
    }

    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
        
        // Открытие мобильного меню
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.openMobileMenu();
            });
        }
        
        // Закрытие мобильного меню
        if (mobileMenuClose) {
            mobileMenuClose.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
        
        // Закрытие при клике на ссылку
        mobileMenuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                
                // Закрываем меню
                this.closeMobileMenu();
                
                // Ждем закрытия анимации и переходим к секции
                setTimeout(() => {
                    if (targetId.startsWith('#')) {
                        const targetSection = document.querySelector(targetId);
                        if (targetSection) {
                            const offsetTop = targetSection.offsetTop - 80;
                            window.scrollTo({
                                top: offsetTop,
                                behavior: 'smooth'
                            });
                            
                            // Обновляем активную ссылку в основной навигации
                            document.querySelectorAll('.navbar-link').forEach(nl => {
                                nl.classList.remove('active');
                                if (nl.getAttribute('href') === targetId) {
                                    nl.classList.add('active');
                                }
                            });
                        }
                    }
                }, 300);
            });
        });
        
        // Закрытие при клике на фон
        if (mobileMenu) {
            mobileMenu.addEventListener('click', (e) => {
                if (e.target === mobileMenu) {
                    this.closeMobileMenu();
                }
            });
        }
        
        // Закрытие при изменении размера экрана
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileMenu();
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }
    
    openMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 150;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                document.querySelectorAll('.navbar-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    setupModals() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const closeButtons = document.querySelectorAll('.modal-close');

        // Открытие модальных окон
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.openModal('loginModal');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.openModal('registerModal');
            });
        }

        // Закрытие модальных окон
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal');
                // Специальная обработка для ИИ-чата
                if (modalId === 'aiAssistantModal') {
                    this.closeAIAssistant();
                } else {
                    this.closeModal(modalId);
                }
            });
        });

        // Закрытие по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.closeModal(modal.id);
                });
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    setupDownloadButtons() {
        // Hero download button
        const heroDownloadBtn = document.getElementById('heroDownloadBtn');
        if (heroDownloadBtn) {
            heroDownloadBtn.addEventListener('click', () => {
                this.handleDownload('windows'); // По умолчанию Windows
            });
        }

        // Watch demo button
        const watchDemoBtn = document.getElementById('watchDemoBtn');
        if (watchDemoBtn) {
            watchDemoBtn.addEventListener('click', () => {
                this.showComingSoon('Демо скоро будет доступно!');
            });
        }

        // Platform specific download buttons
        const downloadButtons = document.querySelectorAll('.btn-download');
        downloadButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.target.getAttribute('data-platform');
                this.handleDownload(platform);
            });
        });

        // AI Assistant buttons
        const aiHelperNavBtn = document.getElementById('aiHelperNavBtn');
        const aiHelperMobileBtn = document.getElementById('aiHelperMobileBtn');
        
        if (aiHelperNavBtn) {
            aiHelperNavBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Предотвращаем переход по ссылке
                this.openAIAssistant();
            });
        }
        
        if (aiHelperMobileBtn) {
            aiHelperMobileBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Предотвращаем переход по ссылке
                // Закрываем мобильное меню и открываем ИИ-помощника
                this.closeMobileMenu();
                setTimeout(() => {
                    this.openAIAssistant();
                }, 300);
            });
        }
    }

    handleDownload(platform = 'windows') {
        // Пока ссылки не готовы, показываем уведомление
        this.showNotification(
            `Скачивание для ${this.getPlatformName(platform)} будет доступно совсем скоро! 
            Следите за обновлениями в Discord.`,
            'info'
        );
        
        // TODO: Заменить на реальные ссылки
        // const downloadLink = this.downloadLinks[platform];
        // if (downloadLink) {
        //     window.open(downloadLink, '_blank');
        // }
    }

    getPlatformName(platform) {
        const names = {
            windows: 'Windows',
            mac: 'macOS',
            linux: 'Linux'
        };
        return names[platform] || 'Unknown';
    }

    setupAuthForms() {
        // Старые формы больше не используются
        // Всё управление авторизацией происходит через Discord OAuth
        const logoutButtons = document.querySelectorAll('#userLogout, #mobileUserLogout');
        
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.logout();
            });
        });
    }

    // Discord OAuth Functions
    setupDiscordAuth() {
        const discordButtons = document.querySelectorAll('#discordLoginBtn, #discordLoginMobileBtn');
        
        discordButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Проверяем, если кнопка отключена
                if (btn.disabled || btn.classList.contains('btn-disabled')) {
                    e.preventDefault();
                    this.showNotification('Discord авторизация временно недоступна. Ведется настройка приложения.', 'info');
                    return;
                }
                
                this.initiateDiscordLogin();
            });
        });
    }

    initiateDiscordLogin() {
        // Показываем состояние загрузки
        const discordButtons = document.querySelectorAll('#discordLoginBtn, #discordLoginMobileBtn');
        discordButtons.forEach(btn => {
            btn.classList.add('auth-loading');
            btn.disabled = true;
            btn.textContent = 'Переход в Discord...';
        });

        // Перенаправляем на Discord OAuth
        window.location.href = '/api/auth/discord';
    }

    handleAuthCallback() {
        // Обработка результатов OAuth после возврата с Discord
        const urlParams = new URLSearchParams(window.location.search);
        const authResult = urlParams.get('auth');
        const error = urlParams.get('error');

        if (authResult === 'success') {
            // Успешная авторизация
            this.showNotification('Добро пожаловать в DiLauncher!', 'success');
            this.checkAuthState();
            
            // Очищаем URL от параметров
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            // Ошибка авторизации
            let errorMessage = 'Ошибка авторизации';
            switch (error) {
                case 'invalid_state':
                    errorMessage = 'Ошибка безопасности. Попробуйте еще раз.';
                    break;
                case 'auth_failed':
                    errorMessage = 'Не удалось войти через Discord. Попробуйте еще раз.';
                    break;
                default:
                    errorMessage = 'Произошла ошибка при входе';
            }
            
            this.showNotification(errorMessage, 'error');
            this.updateAuthState(false);
            
            // Очищаем URL от параметров
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async checkAuthState() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include' // Включаем cookie в запрос
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.user) {
                    this.currentUser = data.user;
                    this.updateAuthState(true);
                    console.log('✅ Пользователь авторизован:', data.user.username);
                    return;
                }
            }
            
            // Если статус 401 или данные неверные - пользователь не авторизован
            console.log('ℹ️ Пользователь не авторизован');
            this.updateAuthState(false);
            
        } catch (error) {
            console.error('Auth verification error:', error);
            this.updateAuthState(false);
        }
    }

    updateAuthState(isLoggedIn) {
        const discordLoginBtn = document.getElementById('discordLoginBtn');
        const discordLoginMobileBtn = document.getElementById('discordLoginMobileBtn');
        const userMenu = document.getElementById('userMenu');
        const mobileUserInfo = document.getElementById('mobileUserInfo');
        
        if (isLoggedIn && this.currentUser) {
            // Пользователь вошел в систему
            if (discordLoginBtn) {
                discordLoginBtn.style.display = 'none';
            }
            if (discordLoginMobileBtn) {
                discordLoginMobileBtn.style.display = 'none';
            }
            
            // Показываем меню пользователя
            if (userMenu) {
                userMenu.style.display = 'flex';
                
                // Обновляем информацию о пользователе
                const userAvatar = document.getElementById('userAvatar');
                const userName = document.getElementById('userName');
                
                if (userAvatar && this.currentUser.avatar) {
                    userAvatar.src = `https://cdn.discordapp.com/avatars/${this.currentUser.userId}/${this.currentUser.avatar}.png`;
                }
                if (userName) {
                    userName.textContent = this.currentUser.globalName || this.currentUser.username;
                }
            }
            
            // Мобильная версия
            if (mobileUserInfo) {
                mobileUserInfo.style.display = 'flex';
                
                const mobileUserAvatar = document.getElementById('mobileUserAvatar');
                const mobileUserName = document.getElementById('mobileUserName');
                
                if (mobileUserAvatar && this.currentUser.avatar) {
                    mobileUserAvatar.src = `https://cdn.discordapp.com/avatars/${this.currentUser.userId}/${this.currentUser.avatar}.png`;
                }
                if (mobileUserName) {
                    mobileUserName.textContent = this.currentUser.globalName || this.currentUser.username;
                }
            }
            
            // Обновляем аватарку и имя в лаунчере
            this.loadRandomAvatar();
        } else {
            // Пользователь не вошел в систему
            if (discordLoginBtn) {
                discordLoginBtn.style.display = 'flex';
                discordLoginBtn.classList.remove('auth-loading');
                discordLoginBtn.disabled = false;
                if (!discordLoginBtn.innerHTML.includes('Войти через Discord')) {
                    discordLoginBtn.innerHTML = `
                        <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" class="btn-icon">
                        Войти через Discord
                    `;
                }
            }
            if (discordLoginMobileBtn) {
                discordLoginMobileBtn.style.display = 'flex';
                discordLoginMobileBtn.classList.remove('auth-loading');
                discordLoginMobileBtn.disabled = false;
                if (!discordLoginMobileBtn.innerHTML.includes('Войти через Discord')) {
                    discordLoginMobileBtn.innerHTML = `
                        <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" class="btn-icon">
                        Войти через Discord
                    `;
                }
            }
            
            if (userMenu) {
                userMenu.style.display = 'none';
            }
            if (mobileUserInfo) {
                mobileUserInfo.style.display = 'none';
            }
            
            // Обновляем аватарку и имя в лаунчере
            this.loadRandomAvatar();
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.token = null;
        this.currentUser = null;
        this.updateAuthState(false);
        this.showNotification('Вы вышли из системы', 'info');
    }

    setupSmoothScroll() {
        // Плавная прокрутка для всех якорных ссылок (кроме навигации)
        document.querySelectorAll('a[href^="#"]:not(.navbar-link)').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    setupScrollAnimations() {
        // Intersection Observer для анимаций при прокрутке
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Наблюдаем за элементами для анимации
        document.querySelectorAll('.feature-card, .platform-card, .stat-card').forEach(el => {
            observer.observe(el);
        });
    }

    startAnimations() {
        // Анимации частиц в hero секции
        this.animateParticles();
        
        // Обновление статистики
        this.animateCounters();
    }

    animateParticles() {
        const particles = document.querySelector('.hero-particles');
        if (particles) {
            // Убираем JavaScript анимацию - используем только CSS
            // CSS анимации более плавные и не конфликтуют с transition
        }
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const originalText = counter.textContent.trim();
            
            // Пропускаем анимацию для "24/7" - оставляем как есть
            if (originalText === '24/7') {
                return;
            }
            
            const target = parseInt(originalText.replace(/[^\d]/g, ''));
            const duration = 2000;
            const step = target / (duration / 50);
            let current = 0;
            
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                const formattedNumber = this.formatNumber(Math.floor(current));
                counter.textContent = counter.textContent.replace(/[\d,\.]+/, formattedNumber);
            }, 50);
        });
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Вспомогательные методы
    setLoading(button, isLoading, text) {
        if (button) {
            button.disabled = isLoading;
            button.textContent = text;
        }
    }

    showError(errorElement, message) {
        if (errorElement) {
            errorElement.innerHTML = message;
            errorElement.style.display = 'block';
        }
    }

    clearError(errorElement) {
        if (errorElement) {
            errorElement.innerHTML = '';
            errorElement.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Добавляем стили если их нет
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 1rem 1.5rem;
                    color: var(--text-primary);
                    z-index: 10000;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    min-width: 300px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification-success {
                    border-left: 4px solid #00ff88;
                }
                .notification-error {
                    border-left: 4px solid #ff6b6b;
                }
                .notification-info {
                    border-left: 4px solid #4ECDC4;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 1.2rem;
                    margin-left: auto;
                }
                .notification-close:hover {
                    color: var(--text-primary);
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    showComingSoon(message) {
        this.showNotification(message, 'info');
    }

    setupLauncherDemo() {
        // Демо интерактивности лаунчера
        const versionSelect = document.getElementById('versionSelect');
        const playButton = document.getElementById('playButton');
        const menuItems = document.querySelectorAll('.menu-item[data-tab]');
        const launcherTabs = document.querySelectorAll('.launcher-tab');
        
        // Переключение вкладок
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-tab');
                
                // Убираем активный класс у всех пунктов меню
                menuItems.forEach(mi => mi.classList.remove('active'));
                // Добавляем активный класс к нажатому пункту
                item.classList.add('active');
                
                // Скрываем все вкладки
                launcherTabs.forEach(tab => tab.classList.remove('active'));
                // Показываем нужную вкладку
                const targetTab = document.getElementById(`${tabId}-tab`);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            });
        });
        
        // Выбор версии
        if (versionSelect) {
            versionSelect.addEventListener('change', (e) => {
                const selectedVersion = e.target.value;
                console.log(`Выбрана версия: ${selectedVersion}`);
                
                // Обновляем информацию о модах
                const modCount = Math.floor(Math.random() * 5);
                const modCountElements = document.querySelectorAll('.info-value');
                modCountElements.forEach(element => {
                    if (element.textContent !== '4GB' && !element.textContent.includes('GB')) {
                        element.textContent = modCount;
                    }
                });
                
                // Анимация при выборе версии
                versionSelect.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    versionSelect.style.transform = 'scale(1)';
                }, 150);
            });
        }
        
        // Кнопка запуска
        if (playButton) {
            playButton.addEventListener('click', () => {
                const selectedVersion = versionSelect ? versionSelect.value : 'Minecraft';
                playButton.innerHTML = '⏳ Запуск...';
                playButton.disabled = true;
                playButton.style.cursor = 'not-allowed';
                
                setTimeout(() => {
                    playButton.innerHTML = '▶ ИГРАТЬ';
                    playButton.disabled = false;
                    playButton.style.cursor = 'pointer';
                }, 2000);
            });
        }
        
        // Интерактивность модов
        const modItems = document.querySelectorAll('.mod-item');
        modItems.forEach(item => {
            item.addEventListener('click', () => {
                const modName = item.querySelector('.mod-name').textContent;
                const statusElement = item.querySelector('.mod-status');
                
                if (statusElement.textContent === 'Доступен') {
                    statusElement.textContent = 'Установлен';
                    statusElement.style.color = '#00ff88';
                } else if (statusElement.textContent === 'Установлен') {
                    statusElement.textContent = 'Доступен';
                    statusElement.style.color = '#ffaa00';
                }
            });
        });
        
        // Настройки
        const settingToggles = document.querySelectorAll('.setting-toggle');
        settingToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                // Просто переключаем без уведомлений
            });
        });
        
        const settingSelects = document.querySelectorAll('.setting-select');
        settingSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const settingLabel = e.target.parentElement.querySelector('.setting-label').textContent;
                
                // Обновляем отображение RAM в игровой информации
                if (settingLabel === 'RAM (GB)') {
                    const ramValueElements = document.querySelectorAll('.info-value');
                    ramValueElements.forEach(element => {
                        if (element.textContent.includes('GB')) {
                            element.textContent = `${e.target.value}GB`;
                        }
                    });
                }
            });
        });
        
        // Рандомная аватарка и анимация профиля
        this.loadRandomAvatar();
        
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar) {
            profileAvatar.addEventListener('click', () => {
                // Анимация поворота при клике
                profileAvatar.style.transform = 'scale(1.1) rotate(360deg)';
                profileAvatar.style.transition = 'transform 0.5s ease';
                setTimeout(() => {
                    profileAvatar.style.transform = 'scale(1) rotate(0deg)';
                }, 500);
            });
        }
    }
    
    loadRandomAvatar() {
        const avatarImage = document.getElementById('avatarImage');
        
        if (avatarImage) {
            if (this.currentUser && this.currentUser.avatar) {
                // Если пользователь вошел через Discord, используем его аватарку
                avatarImage.src = `https://cdn.discordapp.com/avatars/${this.currentUser.userId}/${this.currentUser.avatar}.png`;
            } else {
                // Используем дефолтную аватарку
                const selectedAvatar = 'photo_2025-07-03_02-50-33 (2).jpg';
                avatarImage.src = `/avatars/${selectedAvatar}`;
            }
            avatarImage.style.opacity = '1';
            
            // Обновляем имя пользователя в профиле лаунчера
            const profileName = document.querySelector('.profile-name');
            if (profileName) {
                if (this.currentUser) {
                    profileName.textContent = this.currentUser.globalName || this.currentUser.username || 'WaitDinoS';
                } else {
                    profileName.textContent = 'WaitDinoS';
                }
            }
        }
    }

    // AI Assistant methods - Modern 2024-2025 Design
    openAIAssistant() {
        const aiModal = document.getElementById('aiAssistantModal');
        if (aiModal) {
            aiModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Запускаем анимацию появления
            requestAnimationFrame(() => {
                aiModal.classList.add('show');
            });
        }
        
        // Устанавливаем обработчики только один раз
        if (!this.aiAssistantInitialized) {
            this.setupAIAssistant();
            this.aiAssistantInitialized = true;
        }
    }

    setupAIAssistant() {
        const aiSendBtn = document.getElementById('aiSendBtn');
        const aiChatInput = document.getElementById('aiChatInput');
        const aiAssistantClose = document.getElementById('aiAssistantClose');

        // Закрытие модального окна
        if (aiAssistantClose) {
            aiAssistantClose.addEventListener('click', () => {
                this.closeAIAssistant();
            });
        }

        // Закрытие по клику на фон
        const aiModal = document.getElementById('aiAssistantModal');
        if (aiModal) {
            aiModal.addEventListener('click', (e) => {
                if (e.target === aiModal) {
                    this.closeAIAssistant();
                }
            });
        }

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && aiModal && aiModal.classList.contains('show')) {
                this.closeAIAssistant();
            }
        });

        // Отправка сообщения
        if (aiSendBtn) {
            aiSendBtn.addEventListener('click', () => {
                this.sendAIMessage();
            });
        }

        // Отправка по Enter
        if (aiChatInput) {
            aiChatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendAIMessage();
                }
            });

            // Авто-ресайз текстового поля
            aiChatInput.addEventListener('input', () => {
                aiChatInput.style.height = 'auto';
                aiChatInput.style.height = Math.min(aiChatInput.scrollHeight, 120) + 'px';
            });
        }
    }

    closeAIAssistant() {
        const aiModal = document.getElementById('aiAssistantModal');
        if (aiModal) {
            // Запускаем анимацию закрытия
            aiModal.classList.remove('show');
            aiModal.classList.add('closing');
            
            // После анимации скрываем модальное окно
            setTimeout(() => {
                aiModal.style.display = 'none';
                aiModal.classList.remove('closing');
                document.body.style.overflow = '';
            }, 300); // Время анимации
        }
    }

    async sendAIMessage() {
        const aiChatInput = document.getElementById('aiChatInput');
        const aiChatMessages = document.getElementById('aiChatMessages');
        const aiSendBtn = document.getElementById('aiSendBtn');

        if (!aiChatInput || !aiChatMessages) return;

        const message = aiChatInput.value.trim();
        if (!message) return;

        // Добавляем сообщение пользователя
        this.addUserMessage(message);
        
        // Очищаем поле ввода
        aiChatInput.value = '';
        aiChatInput.style.height = 'auto';

        // Отключаем кнопку отправки и добавляем анимацию
        if (aiSendBtn) {
            aiSendBtn.disabled = true;
            aiSendBtn.classList.add('sending');
        }

        // Показываем индикатор загрузки
        const loadingMessage = this.addAILoadingMessage();

        try {
            // Получаем общий контекст Minecraft
            const versionSelect = document.getElementById('versionSelect');
            const currentVersion = versionSelect ? versionSelect.value : null;
            
            // Формируем контекст без привязки к версии
            let contextMessage = 'Пользователь использует DiLauncher для игры в Minecraft';
            if (currentVersion) {
                contextMessage += `. Текущая версия: ${currentVersion}`;
            }
            
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    context: contextMessage
                }),
            });

            const data = await response.json();

            // Удаляем индикатор загрузки
            if (loadingMessage) {
                loadingMessage.remove();
            }

            if (data.success) {
                this.addAIMessage(data.response);
            } else {
                this.addAIMessage('Извините, произошла ошибка: ' + data.message);
            }
        } catch (error) {
            console.error('AI Chat error:', error);
            
            // Удаляем индикатор загрузки
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            this.addAIMessage('Извините, не удалось связаться с ИИ-помощником. Попробуйте позже.');
        } finally {
            // Включаем кнопку отправки и убираем анимацию
            if (aiSendBtn) {
                aiSendBtn.disabled = false;
                aiSendBtn.classList.remove('sending');
            }
        }
    }

    addUserMessage(message) {
        const aiChatMessages = document.getElementById('aiChatMessages');
        if (!aiChatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message user';
        messageElement.textContent = message;

        aiChatMessages.appendChild(messageElement);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }

    addAIMessage(message) {
        const aiChatMessages = document.getElementById('aiChatMessages');
        if (!aiChatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'ai-message ai';
        messageElement.innerHTML = this.formatAIMessage(message);

        aiChatMessages.appendChild(messageElement);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }

    addAILoadingMessage() {
        const aiChatMessages = document.getElementById('aiChatMessages');
        if (!aiChatMessages) return null;

        const loadingElement = document.createElement('div');
        loadingElement.className = 'ai-loading';
        loadingElement.innerHTML = `
            <div class="ai-loading-dots">
                <div class="ai-loading-dot"></div>
                <div class="ai-loading-dot"></div>
                <div class="ai-loading-dot"></div>
            </div>
        `;

        aiChatMessages.appendChild(loadingElement);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        return loadingElement;
    }

    formatAIMessage(message) {
        // Простое форматирование markdown-подобного текста
        let formatted = this.escapeHtml(message);
        
        // Жирный текст
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Курсив
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Списки
        formatted = formatted.replace(/^- (.*$)/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Переносы строк
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Update Log Modal
    setupUpdateLog() {
        const logoUpdateLog = document.getElementById('logoUpdateLog');
        const updateLogModal = document.getElementById('updateLogModal');
        const updateLogClose = document.getElementById('updateLogClose');

        // Инициализация карусели
        this.currentSlide = 0;
        this.totalSlides = 4;
        this.isTransitioning = false;

        // Открытие модального окна при клике на логотип
        if (logoUpdateLog && updateLogModal) {
            logoUpdateLog.addEventListener('click', () => {
                this.openUpdateLog();
            });
        }

        // Закрытие модального окна
        if (updateLogClose) {
            updateLogClose.addEventListener('click', () => {
                this.closeUpdateLog();
            });
        }

        // Закрытие по клику на фон
        if (updateLogModal) {
            updateLogModal.addEventListener('click', (e) => {
                if (e.target === updateLogModal) {
                    this.closeUpdateLog();
                }
            });
        }

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && updateLogModal && updateLogModal.classList.contains('active')) {
                this.closeUpdateLog();
            }
        });

        // Настройка навигации карусели
        this.setupCarouselNavigation();
    }

    setupCarouselNavigation() {
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');
        const indicators = document.querySelectorAll('.indicator');
        const carousel = document.getElementById('versionCarousel');

        // Навигационные кнопки
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => this.prevSlide());
            nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Индикаторы
        if (indicators && indicators.length > 0) {
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => this.goToSlide(index));
            });
        }

        // Клавиатурная навигация
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('updateLogModal')?.classList.contains('active')) {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            }
        });

        // Свайп-жесты для мобильных
        if (carousel) {
            this.setupSwipeGestures(carousel);
        }

        // Инициализация состояния (только если модальное окно не открыто)
        if (!document.getElementById('updateLogModal')?.classList.contains('active')) {
            this.updateCarouselState();
        }
    }

    setupSwipeGestures(carousel) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        }, { passive: true });

        carousel.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
        }, { passive: true });

        carousel.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;

            const diff = startX - currentX;
            const threshold = 50;

            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    this.nextSlide();
                } else {
                    this.prevSlide();
                }
            }
        }, { passive: true });
    }

    prevSlide() {
        if (this.isTransitioning) return;
        this.currentSlide = this.currentSlide > 0 ? this.currentSlide - 1 : this.totalSlides - 1;
        this.updateCarouselState();
    }

    nextSlide() {
        if (this.isTransitioning) return;
        this.currentSlide = this.currentSlide < this.totalSlides - 1 ? this.currentSlide + 1 : 0;
        this.updateCarouselState();
    }

    goToSlide(index) {
        if (this.isTransitioning || index === this.currentSlide) return;
        this.currentSlide = index;
        this.updateCarouselState();
    }

    updateCarouselState() {
        const slides = document.querySelectorAll('.version-slide');
        const indicators = document.querySelectorAll('.indicator');
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');

        // Проверяем что элементы существуют
        if (slides.length === 0) {
            console.warn('Carousel slides not found');
            return;
        }

        this.isTransitioning = true;

        // Обновляем слайды
        slides.forEach((slide, index) => {
            slide.classList.remove('active', 'prev', 'next');
            
            if (index === this.currentSlide) {
                slide.classList.add('active');
            } else if (index < this.currentSlide) {
                slide.classList.add('prev');
            } else {
                slide.classList.add('next');
            }
        });

        // Обновляем индикаторы
        if (indicators && indicators.length > 0) {
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === this.currentSlide);
            });
        }

        // Обновляем кнопки навигации
        if (prevBtn && nextBtn) {
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }

        // Сбрасываем флаг после анимации
        setTimeout(() => {
            this.isTransitioning = false;
        }, 200);
    }

    openUpdateLog() {
        const updateLogModal = document.getElementById('updateLogModal');
        const carousel = document.getElementById('versionCarousel');
        
        if (updateLogModal) {
            updateLogModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Инициализируем карусель
            this.currentSlide = 0;
            
            // Добавляем класс initialized для включения анимаций
            if (carousel) {
                carousel.classList.add('initialized');
            }
            
            // Небольшая задержка для корректной инициализации
            setTimeout(() => {
                this.updateCarouselState();
            }, 50);
            
            console.log('📋 Открыт лог обновлений DiLauncher');
        }
    }

    closeUpdateLog() {
        const updateLogModal = document.getElementById('updateLogModal');
        const carousel = document.getElementById('versionCarousel');
        
        if (updateLogModal) {
            updateLogModal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Убираем класс initialized
            if (carousel) {
                carousel.classList.remove('initialized');
            }
            
            console.log('📋 Закрыт лог обновлений');
        }
    }
}

// Инициализация лаунчера
let launcher;

document.addEventListener('DOMContentLoaded', () => {
    launcher = new ModernLauncher();
    
    // Добавляем CSS анимации
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        .feature-card,
        .platform-card,
        .stat-card {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .feature-card.animate-in,
        .platform-card.animate-in,
        .stat-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .user-info-nav {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .user-name {
            color: var(--text-primary);
            font-weight: 600;
        }
    `;
    document.head.appendChild(animationStyles);

    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeModalBtns = document.querySelectorAll('.modal-close');
    const loginForm = document.getElementById('loginForm');

    // Открыть модальное окно входа
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.add('active');
        });
    }

    // Закрыть модальные окна
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            document.getElementById(modalId).classList.remove('active');
        });
    });

    // Вход по никнейму
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value;

            // Здесь будет логика входа, пока просто закрываем окно
            console.log(`Попытка входа с ником: ${username}`);
            
            // Имитация успешного входа
            loginModal.classList.remove('active');
            
            // Меняем кнопку "Войти" на никнейм
            const authContainer = document.querySelector('.navbar-auth');
            authContainer.innerHTML = `<span class="navbar-username">${username}</span>`;
        });
    }
});

// ===============================================
// VIEW TRANSITIONS API - 2025 CUTTING EDGE
// ===============================================

/**
 * Modern View Transitions API implementation
 */
class ViewTransitionManager {
    constructor() {
        this.isSupported = 'startViewTransition' in document;
        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.log('View Transitions API not supported, using fallback');
            return;
        }

        this.setupSmoothNavigation();
        this.setupSectionObserver();
    }

    setupSmoothNavigation() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                this.transitionToSection(targetElement);
            }
        });
    }

    transitionToSection(targetElement) {
        if (!this.isSupported) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        document.startViewTransition(() => {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        });
    }

    setupSectionObserver() {
        const sections = document.querySelectorAll('.hero, .stats, .features, .download, .discord');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('section-active');
                } else {
                    entry.target.classList.remove('section-active');
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '0px 0px -20% 0px'
        });

        sections.forEach(section => observer.observe(section));
    }
}

// ===============================================
// PROGRESSIVE ENHANCEMENT - 2025
// ===============================================

class ProgressiveEnhancement {
    constructor() {
        this.features = {
            viewTransitions: 'startViewTransition' in document,
            containerQueries: CSS.supports('container-type', 'inline-size'),
            backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
            scrollSnap: CSS.supports('scroll-snap-type', 'y mandatory'),
            linearEasing: CSS.supports('animation-timing-function', 'linear(0, 1)')
        };
        
        this.init();
    }

    init() {
        Object.entries(this.features).forEach(([feature, supported]) => {
            document.body.classList.toggle(`supports-${feature}`, supported);
        });

        console.log('🚀 Supported modern CSS features:', this.features);
    }
}

// Initialize modern features
document.addEventListener('DOMContentLoaded', () => {
    new ProgressiveEnhancement();
    new ViewTransitionManager();
    
    console.log('🚀 DiLauncher with Discord OAuth and 2025 modern web features loaded!');
});

// Handle reduced motion preferences
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduce-motion');
    console.log('⚡ Reduced motion mode enabled');
}

// Обработка закрытия страницы
window.addEventListener('beforeunload', () => {
    // Очистка таймеров и обработчиков
}); 