// ===== MODERN PARTICLE SYSTEM 2025 =====
// Продвинутая система частиц с притяжением к тексту

class ParticleSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.titleElement = null;
        this.titleBounds = { x: 0, y: 0, width: 0, height: 0 };
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.resize();
        this.createParticles();
        this.setupEventListeners();
        this.updateTitleBounds();
        this.animate();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('particleCanvas');
        if (!this.canvas) {
            console.error('Canvas элемент не найден!');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
    }
    
    resize() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    updateTitleBounds() {
        this.titleElement = document.querySelector('.main-title');
        if (this.titleElement) {
            const rect = this.titleElement.getBoundingClientRect();
            this.titleBounds = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
            };
        }
    }
    
    createParticles() {
        if (!this.canvas) return;
        
        // Адаптивное количество частиц
        const particleCount = Math.min(120, Math.floor(window.innerWidth / 12));
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                size: Math.random() * 2.5 + 0.5,
                opacity: Math.random() * 0.6 + 0.3,
                color: this.getRandomColor(),
                attractionForce: Math.random() * 0.015 + 0.005,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01
            });
        }
    }
    
    getRandomColor() {
        const colors = [
            'rgba(157, 78, 221',  // Фиолетовый
            'rgba(199, 125, 255', // Светло-фиолетовый  
            'rgba(138, 43, 226',  // Темно-фиолетовый
            'rgba(186, 85, 211',  // Медиум-фиолетовый
            'rgba(147, 51, 234',  // Пурпурный
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.updateTitleBounds();
        });
        
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        // Обновляем позицию заголовка при изменениях DOM
        const observer = new MutationObserver(() => {
            this.updateTitleBounds();
        });
        
        if (document.body) {
            observer.observe(document.body, { 
                childList: true, 
                subtree: true, 
                attributes: true 
            });
        }
    }
    
    updateParticle(particle) {
        // Пульсация частицы
        particle.pulsePhase += particle.pulseSpeed;
        const pulseFactor = Math.sin(particle.pulsePhase) * 0.3 + 1;
        
        // Притяжение к центру заголовка
        const titleCenterX = this.titleBounds.x;
        const titleCenterY = this.titleBounds.y;
        
        const distanceToTitle = Math.sqrt(
            Math.pow(particle.x - titleCenterX, 2) + 
            Math.pow(particle.y - titleCenterY, 2)
        );
        
        // Зона притяжения вокруг заголовка
        const attractionRadius = 350;
        
        if (distanceToTitle < attractionRadius && titleCenterX > 0) {
            const attractionStrength = (attractionRadius - distanceToTitle) / attractionRadius;
            const angle = Math.atan2(titleCenterY - particle.y, titleCenterX - particle.x);
            
            // Усиленное притяжение с учетом пульсации
            const force = particle.attractionForce * attractionStrength * pulseFactor;
            particle.vx += Math.cos(angle) * force;
            particle.vy += Math.sin(angle) * force;
        }
        
        // Притяжение к мышке (более деликатное)
        const distanceToMouse = Math.sqrt(
            Math.pow(particle.x - this.mouse.x, 2) + 
            Math.pow(particle.y - this.mouse.y, 2)
        );
        
        if (distanceToMouse < 120) {
            const mouseAttraction = (120 - distanceToMouse) / 120;
            const mouseAngle = Math.atan2(this.mouse.y - particle.y, this.mouse.x - particle.x);
            
            particle.vx += Math.cos(mouseAngle) * 0.008 * mouseAttraction;
            particle.vy += Math.sin(mouseAngle) * 0.008 * mouseAttraction;
        }
        
        // Ограничение скорости
        const maxSpeed = 2.5;
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (speed > maxSpeed) {
            particle.vx = (particle.vx / speed) * maxSpeed;
            particle.vy = (particle.vy / speed) * maxSpeed;
        }
        
        // Применение трения
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        
        // Обновление позиции
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Границы экрана с мягким отскоком
        const margin = 20;
        if (particle.x < -margin || particle.x > this.canvas.width + margin) {
            particle.vx *= -0.6;
            particle.x = Math.max(-margin, Math.min(this.canvas.width + margin, particle.x));
        }
        if (particle.y < -margin || particle.y > this.canvas.height + margin) {
            particle.vy *= -0.6;
            particle.y = Math.max(-margin, Math.min(this.canvas.height + margin, particle.y));
        }
        
        // Динамическое изменение прозрачности
        const baseOpacity = 0.4;
        const variation = Math.sin(particle.pulsePhase * 0.5) * 0.3;
        particle.opacity = baseOpacity + variation;
    }
    
    drawParticle(particle) {
        if (!this.ctx) return;
        
        this.ctx.save();
        
        // Основная частица
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color + ', ' + particle.opacity + ')';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Добавляем свечение
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = particle.color + ', 0.8)';
        this.ctx.fill();
        
        // Дополнительное внутреннее свечение
        this.ctx.globalAlpha = particle.opacity * 0.7;
        this.ctx.fillStyle = 'rgba(255, 255, 255, ' + (particle.opacity * 0.3) + ')';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawConnections() {
        if (!this.ctx) return;
        
        const connectionDistance = 90;
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const particle1 = this.particles[i];
                const particle2 = this.particles[j];
                
                const distance = Math.sqrt(
                    Math.pow(particle1.x - particle2.x, 2) + 
                    Math.pow(particle1.y - particle2.y, 2)
                );
                
                if (distance < connectionDistance) {
                    const opacity = (connectionDistance - distance) / connectionDistance * 0.25;
                    
                    this.ctx.save();
                    this.ctx.globalAlpha = opacity;
                    this.ctx.strokeStyle = 'rgba(157, 78, 221, ' + opacity + ')';
                    this.ctx.lineWidth = 0.8;
                    this.ctx.shadowBlur = 5;
                    this.ctx.shadowColor = 'rgba(157, 78, 221, 0.5)';
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle1.x, particle1.y);
                    this.ctx.lineTo(particle2.x, particle2.y);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }
    }
    
    drawTitleAura() {
        if (!this.ctx || !this.titleElement || this.titleBounds.x <= 0) return;
        
        // Аура вокруг заголовка
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = 'rgba(157, 78, 221, 0.1)';
        this.ctx.filter = 'blur(40px)';
        
        this.ctx.beginPath();
        this.ctx.arc(
            this.titleBounds.x, 
            this.titleBounds.y, 
            200, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.restore();
    }
    
    animate() {
        if (!this.ctx || !this.canvas) return;
        
        // Очистка canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка ауры заголовка
        this.drawTitleAura();
        
        // Обновление и отрисовка частиц
        for (const particle of this.particles) {
            this.updateParticle(particle);
            this.drawParticle(particle);
        }
        
        // Отрисовка соединений между частицами
        this.drawConnections();
        
        // Продолжение анимации
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.particles = [];
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// Экспорт для использования в других модулях
window.ParticleSystem = ParticleSystem; 