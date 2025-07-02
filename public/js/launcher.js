// Modern Launcher App для DiLauncher

class ModernLauncher {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('authToken');
        this.downloadLinks = {
            windows: '',
            mac: '',
            linux: ''
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupScrollAnimations();
        this.checkAuthState();
        this.startAnimations();
    }

    setupEventListeners() {
        // Навигация
        this.setupNavigation();
        
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
        let isScrolling = false;
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Устанавливаем флаг прокрутки
                isScrolling = true;
                
                // Плавно удаляем активный класс со всех ссылок
                navLinks.forEach(nl => {
                    nl.classList.remove('active');
                });
                
                // Добавляем активный класс к текущей ссылке с задержкой
                setTimeout(() => {
                    link.classList.add('active');
                }, 50);
                
                // Прокручиваем к секции
                const targetId = link.getAttribute('href');
                if (targetId.startsWith('#')) {
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        const offsetTop = targetSection.offsetTop - 100;
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                        
                        // Сбрасываем флаг после завершения прокрутки
                        setTimeout(() => {
                            isScrolling = false;
                        }, 1000);
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
                }, 100);
            }
        });
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
                this.closeModal(modalId);
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
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(new FormData(loginForm));
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(new FormData(registerForm));
            });
        }
    }

    async handleLogin(formData) {
        const submitBtn = document.querySelector('#loginForm .btn-primary');
        const errorDiv = document.getElementById('loginError');
        
        try {
            this.setLoading(submitBtn, true, 'Вход...');
            this.clearError(errorDiv);

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
                
                this.closeModal('loginModal');
                this.showNotification('Успешный вход в систему!', 'success');
                this.updateAuthState(true);
            } else {
                this.showError(errorDiv, data.message);
            }
        } catch (error) {
            this.showError(errorDiv, 'Ошибка соединения с сервером');
            console.error('Login error:', error);
        } finally {
            this.setLoading(submitBtn, false, 'Войти');
        }
    }

    async handleRegister(formData) {
        const submitBtn = document.querySelector('#registerForm .btn-primary');
        const errorDiv = document.getElementById('registerError');
        
        try {
            this.setLoading(submitBtn, true, 'Регистрация...');
            this.clearError(errorDiv);

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
                
                this.closeModal('registerModal');
                this.showNotification('Аккаунт успешно создан!', 'success');
                this.updateAuthState(true);
            } else {
                if (data.errors && data.errors.length > 0) {
                    const errorMessages = data.errors.map(err => err.msg).join('<br>');
                    this.showError(errorDiv, errorMessages);
                } else {
                    this.showError(errorDiv, data.message);
                }
            }
        } catch (error) {
            this.showError(errorDiv, 'Ошибка соединения с сервером');
            console.error('Register error:', error);
        } finally {
            this.setLoading(submitBtn, false, 'Создать аккаунт');
        }
    }

    async checkAuthState() {
        if (this.token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                    },
                });

                const data = await response.json();
                
                if (data.success) {
                    this.currentUser = data.user;
                    this.updateAuthState(true);
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Auth verification error:', error);
                this.logout();
            }
        }
    }

    updateAuthState(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const navbarAuth = document.querySelector('.navbar-auth');
        
        if (isLoggedIn && this.currentUser) {
            // Пользователь вошел в систему
            if (navbarAuth) {
                navbarAuth.innerHTML = `
                    <div class="user-info-nav">
                        <span class="user-name">${this.currentUser.username}</span>
                        <button class="btn btn-outline" onclick="launcher.logout()">Выйти</button>
                    </div>
                `;
            }
        } else {
            // Пользователь не вошел в систему
            if (navbarAuth) {
                navbarAuth.innerHTML = `
                    <button class="btn btn-outline" id="loginBtn">Войти</button>
                    <button class="btn btn-primary" id="registerBtn">Регистрация</button>
                `;
                
                // Переподключаем обработчики
                this.setupModals();
            }
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.updateAuthState(false);
        this.showNotification('Вы вышли из системы', 'info');
    }

    setupSmoothScroll() {
        // Плавная прокрутка для всех якорных ссылок
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 100;
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
            // Более плавная анимация частиц
            let time = 0;
            const animateStars = () => {
                time += 0.01;
                
                // Создаем эффект мерцания звезд
                const x1 = 50 + Math.sin(time) * 30;
                const y1 = 50 + Math.cos(time * 0.7) * 20;
                const x2 = 20 + Math.cos(time * 0.5) * 40;
                const y2 = 80 + Math.sin(time * 0.3) * 15;
                const x3 = 80 + Math.sin(time * 0.8) * 25;
                const y3 = 30 + Math.cos(time * 0.6) * 35;
                
                // Применяем позиции с плавными переходами
                particles.style.backgroundPosition = 
                    `${x1}% ${y1}%, ${x2}% ${y2}%, ${x3}% ${y3}%, ${50 + Math.cos(time * 0.4) * 20}% ${70 + Math.sin(time * 0.9) * 10}%`;
                
                // Добавляем эффект появления/исчезновения
                const opacity = 0.3 + Math.sin(time * 2) * 0.4;
                particles.style.opacity = Math.max(0.1, opacity);
                
                requestAnimationFrame(animateStars);
            };
            
            animateStars();
        }
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
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
});

// Обработка закрытия страницы
window.addEventListener('beforeunload', () => {
    // Очистка таймеров и обработчиков
}); 