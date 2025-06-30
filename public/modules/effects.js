// ===== EFFECTS MANAGER MODULE =====

export class EffectsManager {
    constructor() {
        this.activeEffects = new Map();
        this.intervals = new Map();
        this.timeouts = new Map();
        
        this.init();
        console.log('✨ EffectsManager инициализирован');
    }

    init() {
        this.setupScreener();
        this.createStyleSheets();
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    setupScreener() {
        this.screamerElement = document.getElementById('screamer');
        this.screamerVideo = document.getElementById('screamer-video');
        this.screamerSound = document.getElementById('screamer-sound');
    }

    createStyleSheets() {
        // Создаём стили для эффектов
        this.effectStyles = document.createElement('style');
        this.effectStyles.id = 'effect-styles';
        document.head.appendChild(this.effectStyles);
    }

    // ===== ОБРАБОТЧИК АДМИН ДЕЙСТВИЙ =====
    handleAdminAction(data) {
        console.log('✨ EffectsManager обрабатывает:', data.action);
        
        switch(data.action) {
            case 'screamer':
                this.showScreener(data.data);
                break;
            case 'lag':
                this.simulateLag(data.data);
                break;
            case 'fake_win':
                this.showFakeWin(data.data);
                break;
            case 'crazy_cursor':
                this.activateCrazyCursor(data.data);
                break;
            case 'upside_down':
                this.flipScreen(data.data);
                break;
            case 'disco':
                this.activateDiscoMode(data.data);
                break;
            case 'matrix':
                this.activateMatrixMode(data.data);
                break;
            case 'fake_error':
                this.showFakeError(data.data);
                break;
            case 'rainbow':
                this.activateRainbowText(data.data);
                break;
            case 'shake':
                this.shakeScreen(data.data);
                break;
            case 'snow':
                this.activateSnowEffect(data.data);
                break;
            case 'rain':
                this.activateRainEffect(data.data);
                break;
            case 'fireworks':
                this.activateFireworks(data.data);
                break;
            case 'glitch':
                this.activateGlitchEffect(data.data);
                break;
            case 'announce':
                this.showAnnouncement(data.data);
                break;
        }
    }

    // ===== СКРИМЕР С ВИДЕО =====
    showScreener(data) {
        if (!this.screamerElement) return;
        
        console.log('💀 СКРИМЕР АКТИВИРОВАН!');
        
        // Показываем скример
        this.screamerElement.classList.add('active');
        
        // Запускаем видео
        if (this.screamerVideo) {
            this.screamerVideo.muted = false; // Включаем звук видео
            this.screamerVideo.currentTime = 0;
            this.screamerVideo.play().catch(console.error);
        }
        
        // Дополнительный звук скримера
        if (window.GlassXO.settings.soundEnabled && this.screamerSound) {
            try {
                this.screamerSound.volume = 0.8;
                this.screamerSound.play().catch(console.error);
            } catch (e) {
                console.log('Не удалось воспроизвести дополнительный звук скримера');
            }
        }
        
        // Убираем скример через указанное время
        const duration = data.duration || 5000;
        this.setEffectTimeout('screamer', () => {
            this.screamerElement.classList.remove('active');
            if (this.screamerVideo) {
                this.screamerVideo.pause();
                this.screamerVideo.muted = true;
            }
            if (this.screamerSound) {
                this.screamerSound.pause();
                this.screamerSound.currentTime = 0;
            }
            console.log('💀 Скример завершён');
        }, duration);
    }

    // ===== МЕГА СКРИМЕР С ВИДЕО =====
    showMegaScreener(data) {
        console.log('☠️ МЕГА СКРИМЕР АКТИВИРОВАН!!! БЕРЕГИСЬ!!!');
        
        // Создаем элемент для МЕГА скримера
        const megaScreamer = document.createElement('div');
        megaScreamer.id = 'mega-screamer';
        megaScreamer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: megaScreamerFlash 0.05s infinite;
        `;

        // Создаем видео элемент
        const video = document.createElement('video');
        video.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
        `;
        video.autoplay = true;
        video.loop = true;
        video.muted = false;
        video.volume = 1.0;
        video.src = data.videoFile || 'assets/scrim/НЕ ТРОГАТЬ ЕГО НЕ ИСПОЛЬЗОВАТЬ.mp4';

        // Создаем текст предупреждения
        const warningText = document.createElement('div');
        warningText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: red;
            font-size: 100px;
            font-weight: bold;
            text-shadow: 5px 5px 10px black;
            z-index: 1000000;
            animation: megaTextPulse 0.1s infinite;
            text-align: center;
            white-space: nowrap;
        `;
        warningText.innerHTML = '☠️ МЕГА СКРИМЕР ☠️<br>💀 НЕ ТРОГАТЬ! 💀';

        // Добавляем стили анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes megaScreamerFlash {
                0% { background: #000; }
                10% { background: #ff0000; }
                20% { background: #00ff00; }
                30% { background: #0000ff; }
                40% { background: #ffff00; }
                50% { background: #ff00ff; }
                60% { background: #00ffff; }
                70% { background: #ffffff; }
                80% { background: #ff8000; }
                90% { background: #8000ff; }
                100% { background: #000; }
            }
            
            @keyframes megaTextPulse {
                0% { 
                    transform: translate(-50%, -50%) scale(1); 
                    color: red; 
                    text-shadow: 5px 5px 10px black;
                }
                25% { 
                    transform: translate(-50%, -50%) scale(1.2); 
                    color: yellow; 
                    text-shadow: 10px 10px 20px red;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.5); 
                    color: white; 
                    text-shadow: 15px 15px 30px blue;
                }
                75% { 
                    transform: translate(-50%, -50%) scale(1.2); 
                    color: lime; 
                    text-shadow: 10px 10px 20px purple;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1); 
                    color: red; 
                    text-shadow: 5px 5px 10px black;
                }
            }
        `;
        document.head.appendChild(style);

        megaScreamer.appendChild(video);
        megaScreamer.appendChild(warningText);
        document.body.appendChild(megaScreamer);

        // Пытаемся воспроизвести видео
        video.play().catch(err => {
            console.log('Не удалось воспроизвести МЕГА скример видео:', err);
            // Если видео не воспроизводится, показываем альтернативный контент
            video.style.display = 'none';
            megaScreamer.style.background = 'linear-gradient(45deg, red, black, red, black)';
            megaScreamer.style.backgroundSize = '50px 50px';
            megaScreamer.style.animation = 'megaScreamerFlash 0.05s infinite';
        });

        // Создаем дополнительные визуальные эффекты
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                if (megaScreamer.parentNode) {
                    const spark = document.createElement('div');
                    spark.style.cssText = `
                        position: absolute;
                        width: 10px;
                        height: 10px;
                        background: red;
                        border-radius: 50%;
                        left: ${Math.random() * 100}%;
                        top: ${Math.random() * 100}%;
                        animation: sparkFly 0.5s linear forwards;
                        z-index: 999998;
                    `;
                    
                    const sparkStyle = document.createElement('style');
                    sparkStyle.textContent = `
                        @keyframes sparkFly {
                            0% { transform: scale(0) rotate(0deg); opacity: 1; }
                            50% { transform: scale(2) rotate(180deg); opacity: 0.8; }
                            100% { transform: scale(0) rotate(360deg); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(sparkStyle);
                    
                    megaScreamer.appendChild(spark);
                    
                    setTimeout(() => {
                        if (spark.parentNode) spark.remove();
                        if (sparkStyle.parentNode) sparkStyle.remove();
                    }, 500);
                }
            }, i * 100);
        }

        // Эффект тряски экрана
        document.body.style.animation = 'megaShake 0.1s infinite';
        const shakeStyle = document.createElement('style');
        shakeStyle.textContent = `
            @keyframes megaShake {
                0% { transform: translate(0, 0) rotate(0deg); }
                25% { transform: translate(-10px, -10px) rotate(-2deg); }
                50% { transform: translate(10px, -10px) rotate(2deg); }
                75% { transform: translate(-10px, 10px) rotate(-2deg); }
                100% { transform: translate(10px, 10px) rotate(2deg); }
            }
        `;
        document.head.appendChild(shakeStyle);

        // Убираем МЕГА скример через указанное время
        const duration = data.duration || 10000;
        this.setEffectTimeout('mega_screamer', () => {
            if (megaScreamer.parentNode) {
                megaScreamer.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
            if (shakeStyle.parentNode) {
                shakeStyle.remove();
            }
            document.body.style.animation = '';
            
            // Показываем предупреждение после завершения
            if (window.GlassXO.ui) {
                window.GlassXO.ui.showNotification('☠️ МЕГА СКРИМЕР ЗАВЕРШЕН! Берегите нервы!', 'warning', 5000);
            }
            
            console.log('☠️ МЕГА СКРИМЕР завершён');
        }, duration);

        // Показываем предупреждение
        if (window.GlassXO.ui) {
            window.GlassXO.ui.showNotification('☠️ ВНИМАНИЕ! МЕГА СКРИМЕР АКТИВИРОВАН!', 'danger', 3000);
        }
    }

    simulateLag(data) {
        const intensity = data.intensity || 3;
        const duration = data.duration || 10000;
        
        console.log('🐌 Лаги активированы!');
        
        const lagInterval = setInterval(() => {
            const freezeTime = Math.random() * 1000 * intensity;
            document.body.style.pointerEvents = 'none';
            document.body.style.filter = 'blur(2px)';
            
            setTimeout(() => {
                document.body.style.pointerEvents = 'auto';
                document.body.style.filter = '';
            }, freezeTime);
        }, 1000);
        
        this.setEffectInterval('lag', lagInterval);
        
        this.setEffectTimeout('lag_cleanup', () => {
            this.clearEffectInterval('lag');
            document.body.style.pointerEvents = 'auto';
            document.body.style.filter = '';
            console.log('🐌 Лаги завершены');
        }, duration);
    }

    showFakeWin(data) {
        const message = data.message || '🎉 Поздравляем! Вы выиграли 1.000.000$!';
        
        console.log('🎉 Фейковая победа!');
        
        const winModal = document.createElement('div');
        winModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.5s ease;
        `;
        
        winModal.innerHTML = `
            <div style="
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f39c12);
                background-size: 400% 400%;
                animation: gradient 2s ease infinite;
                color: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                font-size: 28px;
                font-weight: bold;
                box-shadow: 0 20px 40px rgba(0,0,0,0.8);
                transform: scale(0);
                animation: popIn 0.5s ease forwards, gradient 2s ease infinite;
                max-width: 500px;
            ">
                <div style="font-size: 64px; margin-bottom: 20px; animation: bounce 1s infinite;">🎉</div>
                <div style="margin-bottom: 20px;">${message}</div>
                <div style="font-size: 16px; opacity: 0.9; margin-bottom: 30px;">
                    💰 Деньги уже переводятся на ваш счёт!<br>
                    📱 Проверьте SMS для подтверждения
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    padding: 15px 40px;
                    background: white;
                    color: #333;
                    border: none;
                    border-radius: 30px;
                    font-size: 18px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    🏆 ЗАБРАТЬ ПРИЗ! 🏆
                </button>
            </div>
        `;
        
        // Добавляем стили анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
            @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(winModal);
        
        // Автоудаление через 15 секунд
        this.setEffectTimeout('fake_win', () => {
            if (winModal.parentNode) winModal.remove();
            if (style.parentNode) style.remove();
        }, 15000);
    }

    activateCrazyCursor(data) {
        const duration = data.duration || 15000;
        
        console.log('🖱️ Сумасшедший курсор активирован!');
        
        // Меняем курсор
        document.body.style.cursor = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDE2TDE2IDhMMjQgMTZMMTYgMjRMOCAxNloiIGZpbGw9IiNGRjAwMDAiLz4KPC9zdmc+"), auto';
        
        // Случайные фейковые курсоры
        const cursorInterval = setInterval(() => {
            this.createFakeCursor();
        }, 150);
        
        this.setEffectInterval('crazy_cursor', cursorInterval);
        
        this.setEffectTimeout('crazy_cursor_cleanup', () => {
            this.clearEffectInterval('crazy_cursor');
            document.body.style.cursor = 'auto';
            console.log('🖱️ Курсор восстановлен');
        }, duration);
    }

    createFakeCursor() {
        const cursors = ['👆', '👇', '👈', '👉', '🖕', '✋', '👋', '🤚'];
        const fakeCursor = document.createElement('div');
        fakeCursor.textContent = cursors[Math.floor(Math.random() * cursors.length)];
        fakeCursor.style.cssText = `
            position: fixed;
            left: ${Math.random() * window.innerWidth}px;
            top: ${Math.random() * window.innerHeight}px;
            font-size: 24px;
            pointer-events: none;
            z-index: 99998;
            animation: fadeOut 1s ease forwards;
        `;
        
        document.body.appendChild(fakeCursor);
        
        setTimeout(() => {
            if (fakeCursor.parentNode) fakeCursor.remove();
        }, 1000);
    }

    flipScreen(data) {
        const duration = data.duration || 20000;
        
        console.log('🙃 Экран переворачивается!');
        
        document.body.style.transform = 'rotate(180deg)';
        document.body.style.transition = 'transform 3s ease';
        
        this.setEffectTimeout('flip_screen', () => {
            document.body.style.transform = 'rotate(0deg)';
            setTimeout(() => {
                document.body.style.transition = '';
                console.log('🙃 Экран восстановлен');
            }, 3000);
        }, duration);
    }

    activateDiscoMode(data) {
        const duration = data.duration || 30000;
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
        
        console.log('🕺 ДИСКО РЕЖИМ!');
        
        const discoInterval = setInterval(() => {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.style.backgroundColor = randomColor;
            document.body.style.transition = 'background-color 0.1s';
            
            // Добавляем диско эффекты
            if (Math.random() < 0.3) {
                document.body.style.filter = `hue-rotate(${Math.random() * 360}deg)`;
            }
        }, 100);
        
        this.setEffectInterval('disco', discoInterval);
        
        this.setEffectTimeout('disco_cleanup', () => {
            this.clearEffectInterval('disco');
            document.body.style.backgroundColor = '';
            document.body.style.transition = '';
            document.body.style.filter = '';
            console.log('🕺 Диско завершено');
        }, duration);
    }

    activateMatrixMode(data) {
        const duration = data.duration || 25000;
        
        console.log('💊 Добро пожаловать в Матрицу!');
        
        // Создаём canvas для матричного эффекта
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9998;
            pointer-events: none;
        `;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя";
        const matrixArray = matrix.split("");
        
        const fontSize = 12;
        const columns = canvas.width / fontSize;
        const drops = [];
        
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }
        
        function drawMatrix() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = fontSize + 'px monospace';
            
            for (let i = 0; i < drops.length; i++) {
                const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        
        const matrixInterval = setInterval(drawMatrix, 35);
        this.setEffectInterval('matrix', matrixInterval);
        
        this.setEffectTimeout('matrix_cleanup', () => {
            this.clearEffectInterval('matrix');
            if (canvas.parentNode) canvas.remove();
            console.log('💊 Матрица отключена');
        }, duration);
    }

    showFakeError(data) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff0000;
            color: white;
            padding: 30px;
            border-radius: 15px;
            z-index: 99999;
            text-align: center;
            font-family: Arial, sans-serif;
            font-size: 18px;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.8);
            border: 3px solid #ffffff;
            animation: errorPulse 1s infinite;
        `;
        
        errorDiv.innerHTML = `
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">⚠️ КРИТИЧЕСКАЯ ОШИБКА ⚠️</h2>
            <p style="margin: 0 0 20px 0;">${data.message}</p>
            <button onclick="this.parentNode.remove()" style="
                padding: 10px 25px;
                background: white;
                color: red;
                border: 2px solid red;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 16px;
            ">
                ИСПРАВИТЬ НЕМЕДЛЕННО
            </button>
        `;
        
        // Добавляем стили анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes errorPulse {
                0% { box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); }
                50% { box-shadow: 0 0 50px rgba(255, 0, 0, 1); }
                100% { box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(errorDiv);
        
        // Автоудаление через 10 секунд
        this.setEffectTimeout('fake_error', () => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 10000);
    }

    // ===== СПЕЦЭФФЕКТЫ =====
    activateRainbowText(data) {
        const duration = data.duration || 20000;
        
        console.log('🌈 Радужный режим!');
        
        this.effectStyles.textContent += `
            * {
                animation: rainbow 1s linear infinite !important;
            }
            
            @keyframes rainbow {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
        `;
        
        this.setEffectTimeout('rainbow_text', () => {
            this.effectStyles.textContent = '';
            console.log('🌈 Радуга отключена');
        }, duration);
    }

    shakeScreen(data) {
        const intensity = data.intensity || 5;
        const duration = data.duration || 10000;
        
        console.log('📳 Экран трясётся!');
        
        this.effectStyles.textContent += `
            body {
                animation: shake 0.1s infinite !important;
            }
            
            @keyframes shake {
                0% { transform: translate(0); }
                25% { transform: translate(${intensity}px, ${intensity}px); }
                50% { transform: translate(-${intensity}px, ${intensity}px); }
                75% { transform: translate(${intensity}px, -${intensity}px); }
                100% { transform: translate(-${intensity}px, -${intensity}px); }
            }
        `;
        
        this.setEffectTimeout('screen_shake', () => {
            this.effectStyles.textContent = '';
            console.log('📳 Тряска прекращена');
        }, duration);
    }

    activateSnowEffect(data) {
        const duration = data.duration || 30000;
        
        function createSnowflake() {
            const snowflake = document.createElement('div');
            snowflake.innerHTML = '❄️';
            snowflake.style.cssText = `
                position: fixed;
                top: -50px;
                left: ${Math.random() * window.innerWidth}px;
                font-size: ${Math.random() * 20 + 10}px;
                z-index: 9997;
                pointer-events: none;
                animation: fall ${Math.random() * 3 + 2}s linear forwards;
            `;
            
            document.body.appendChild(snowflake);
            
            setTimeout(() => {
                if (snowflake.parentNode) {
                    snowflake.remove();
                }
            }, 5000);
        }
        
        // Добавляем стили анимации падения
        this.effectStyles.textContent += `
            @keyframes fall {
                to {
                    transform: translateY(${window.innerHeight + 100}px) rotate(360deg);
                }
            }
        `;
        
        const snowInterval = setInterval(createSnowflake, 100);
        this.setEffectInterval('snow', snowInterval);
        
        this.setEffectTimeout('snow_cleanup', () => {
            this.clearEffectInterval('snow');
            this.effectStyles.textContent = '';
        }, duration);
    }

    activateRainEffect(data) {
        const duration = data.duration || 25000;
        
        function createRaindrop() {
            const drop = document.createElement('div');
            drop.style.cssText = `
                position: fixed;
                top: -20px;
                left: ${Math.random() * window.innerWidth}px;
                width: 2px;
                height: 20px;
                background: linear-gradient(to bottom, rgba(0,150,255,0), rgba(0,150,255,1));
                z-index: 9997;
                pointer-events: none;
                animation: rainFall ${Math.random() * 0.5 + 0.5}s linear forwards;
            `;
            
            document.body.appendChild(drop);
            
            setTimeout(() => {
                if (drop.parentNode) {
                    drop.remove();
                }
            }, 1000);
        }
        
        this.effectStyles.textContent += `
            @keyframes rainFall {
                to {
                    transform: translateY(${window.innerHeight + 100}px);
                }
            }
        `;
        
        const rainInterval = setInterval(createRaindrop, 10);
        this.setEffectInterval('rain', rainInterval);
        
        this.setEffectTimeout('rain_cleanup', () => {
            this.clearEffectInterval('rain');
        }, duration);
    }

    activateFireworks(data) {
        const duration = data.duration || 15000;
        
        function createFirework() {
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight * 0.5;
            
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: fixed;
                    left: ${x}px;
                    top: ${y}px;
                    width: 4px;
                    height: 4px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: 50%;
                    z-index: 9997;
                    pointer-events: none;
                `;
                
                const angle = (Math.PI * 2 * i) / 20;
                const velocity = Math.random() * 100 + 50;
                const vx = Math.cos(angle) * velocity;
                const vy = Math.sin(angle) * velocity;
                
                particle.style.animation = `firework 2s ease-out forwards`;
                particle.style.setProperty('--vx', vx + 'px');
                particle.style.setProperty('--vy', vy + 'px');
                
                document.body.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 2000);
            }
        }
        
        this.effectStyles.textContent += `
            @keyframes firework {
                0% {
                    transform: translate(0, 0);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--vx), var(--vy));
                    opacity: 0;
                }
            }
        `;
        
        const fireworkInterval = setInterval(createFirework, 500);
        this.setEffectInterval('fireworks', fireworkInterval);
        
        this.setEffectTimeout('fireworks_cleanup', () => {
            this.clearEffectInterval('fireworks');
        }, duration);
    }

    activateGlitchEffect(data) {
        const duration = data.duration || 12000;
        
        this.effectStyles.textContent += `
            body {
                animation: glitch 0.3s infinite !important;
            }
            
            @keyframes glitch {
                0% {
                    transform: translate(0);
                    filter: hue-rotate(0deg);
                }
                20% {
                    transform: translate(-2px, 2px);
                    filter: hue-rotate(90deg);
                }
                40% {
                    transform: translate(-2px, -2px);
                    filter: hue-rotate(180deg);
                }
                60% {
                    transform: translate(2px, 2px);
                    filter: hue-rotate(270deg);
                }
                80% {
                    transform: translate(2px, -2px);
                    filter: hue-rotate(360deg);
                }
                100% {
                    transform: translate(0);
                    filter: hue-rotate(0deg);
                }
            }
        `;
        
        this.setEffectTimeout('glitch_effect', () => {
            this.effectStyles.textContent = '';
        }, duration);
    }

    showAnnouncement(data) {
        const announcement = document.createElement('div');
        announcement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 20px 40px;
            border-radius: 25px;
            z-index: 99999;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            animation: slideInDown 0.5s ease-out;
            max-width: 80%;
        `;
        
        announcement.innerHTML = `📢 ${data.message}`;
        
        this.effectStyles.textContent += `
            @keyframes slideInDown {
                from {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutUp {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }
            }
        `;
        
        document.body.appendChild(announcement);
        
        this.setEffectTimeout('announcement', () => {
            announcement.style.animation = 'slideOutUp 0.5s ease-in';
            setTimeout(() => {
                if (announcement.parentNode) announcement.remove();
            }, 500);
        }, 8000);
    }

    // ===== УПРАВЛЕНИЕ ЭФФЕКТАМИ =====
    setEffectTimeout(name, callback, duration) {
        if (this.timeouts.has(name)) {
            clearTimeout(this.timeouts.get(name));
        }
        
        const timeout = setTimeout(() => {
            callback();
            this.timeouts.delete(name);
        }, duration);
        
        this.timeouts.set(name, timeout);
    }

    setEffectInterval(name, interval) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
        }
        
        this.intervals.set(name, interval);
    }

    clearEffectInterval(name) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
            this.intervals.delete(name);
        }
    }

    // ===== ОБРАБОТКА СОКЕТНЫХ СОБЫТИЙ =====
    setupSocketHandlers() {
        if (!window.GlassXO.socket || !window.GlassXO.socket.socket) return;
        
        const socket = window.GlassXO.socket.socket;
        
        // Скример
        socket.on('admin_screamer', (data) => {
            this.showScreener(data);
        });

        // МЕГА СКРИМЕР
        socket.on('admin_mega_screamer', (data) => {
            this.showMegaScreener(data);
        });
        
        // Лаги
        socket.on('admin_lag', (data) => {
            this.simulateLag(data);
        });
        
        // Отключение
        socket.on('admin_disconnect', (data) => {
            if (window.GlassXO.ui) {
                window.GlassXO.ui.showNotification('🚫 ' + data.message, 'error');
            }
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        });
        
        // Фейковая победа
        socket.on('admin_fake_win', (data) => {
            this.showFakeWin(data);
        });
        
        // Объявления
        socket.on('admin_announcement', (data) => {
            this.showAnnouncement({ message: data.message });
        });
        
        // Эффекты
        socket.on('admin_effect', (data) => {
            this.handleAdminAction(data);
        });
        
        // Очистка эффектов
        socket.on('admin_clear_effects', () => {
            this.clearAllEffects();
        });
        
        // Режим обслуживания
        socket.on('admin_maintenance', (data) => {
            this.showMaintenance(data.enabled);
        });
        
        // Перезагрузка сервера
        socket.on('admin_server_restart', (data) => {
            this.showServerRestart(data.message);
        });
    }
    
    showMaintenance(enabled) {
        if (enabled) {
            const maintenance = document.createElement('div');
            maintenance.id = 'maintenance-mode';
            maintenance.innerHTML = `
                <div class="maintenance-content">
                    <h1>🔧 РЕЖИМ ОБСЛУЖИВАНИЯ</h1>
                    <p>Сервер временно недоступен для проведения технических работ.</p>
                    <p>Попробуйте подключиться позже.</p>
                    <div class="maintenance-spinner"></div>
                </div>
            `;
            maintenance.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, #1a1a1a, #2d2d2d);
                color: white;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-family: Arial, sans-serif;
            `;
            
            document.body.appendChild(maintenance);
        } else {
            const maintenance = document.getElementById('maintenance-mode');
            if (maintenance) {
                maintenance.remove();
            }
        }
    }
    
    showServerRestart(message) {
        const restart = document.createElement('div');
        restart.className = 'server-restart';
        restart.innerHTML = `
            <div class="restart-content">
                <h2>♻️ ПЕРЕЗАГРУЗКА СЕРВЕРА</h2>
                <p>${message}</p>
                <div class="countdown" id="restart-countdown">10</div>
                <div class="restart-progress">
                    <div class="progress-bar" id="restart-progress-bar"></div>
                </div>
            </div>
        `;
        restart.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(255, 0, 0, 0.9), rgba(255, 100, 100, 0.9));
            color: white;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: Arial, sans-serif;
            animation: pulse 1s infinite;
        `;
        
        // Добавляем стили для прогресс-бара
        this.effectStyles.textContent += `
            .restart-progress {
                width: 300px;
                height: 20px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                overflow: hidden;
                margin: 20px auto;
            }
            .progress-bar {
                height: 100%;
                background: white;
                border-radius: 10px;
                transition: width 1s linear;
                width: 100%;
                animation: shrink 10s linear;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            @keyframes shrink {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        
        document.body.appendChild(restart);
        
        // Обратный отсчет
        let countdown = 10;
        const countdownEl = document.getElementById('restart-countdown');
        const timer = setInterval(() => {
            countdown--;
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
                clearInterval(timer);
                window.location.reload();
            }
        }, 1000);
    }

    // ===== ОЧИСТКА ВСЕХ ЭФФЕКТОВ =====
    clearAllEffects() {
        console.log('🧹 Очистка всех эффектов...');
        
        // Очищаем все таймауты
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts.clear();
        
        // Очищаем все интервалы
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();
        
        // Сбрасываем стили
        this.effectStyles.textContent = '';
        
        // Сбрасываем базовые стили body
        document.body.style.cssText = '';
        
        // Скрываем скример
        if (this.screamerElement) {
            this.screamerElement.classList.remove('active');
            if (this.screamerVideo) {
                this.screamerVideo.pause();
                this.screamerVideo.muted = true;
            }
        }
        
        // Удаляем дополнительные элементы
        const elementsToRemove = [
            'maintenance-mode',
            '.server-restart',
            '.admin-announcement',
            '.fake-error'
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = selector.startsWith('.') ? 
                document.querySelectorAll(selector) : 
                [document.getElementById(selector)].filter(Boolean);
            
            elements.forEach(el => el && el.remove());
        });
        
        console.log('✅ Все эффекты очищены');
    }
} 