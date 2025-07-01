// Simple Password Strength Indicator - DinosGames (NO RESTRICTIONS)

class PasswordStrengthIndicator {
    constructor() {
        this.init();
    }

    init() {
        const passwordInput = document.getElementById('registerPassword');
        const strengthContainer = document.getElementById('passwordStrength');
        const strengthText = document.getElementById('strengthText');
        const segments = [
            document.getElementById('segment1'),
            document.getElementById('segment2'),
            document.getElementById('segment3'),
            document.getElementById('segment4')
        ];

        if (!passwordInput || !strengthContainer) {
            return;
        }

        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            this.updateStrength(password, segments, strengthText);
        });
    }

    calculateStrength(password) {
        if (!password) {
            return { level: 0, text: 'Введите пароль' };
        }

        let score = 0;

        // Простые критерии (каждый +1 балл)
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        // Определяем уровень и текст
        let level, text;
        if (score <= 1) {
            level = 1;
            text = 'Слабый';
        } else if (score <= 3) {
            level = 2;
            text = 'Средний';
        } else if (score <= 5) {
            level = 3;
            text = 'Хороший';
        } else {
            level = 4;
            text = 'Отличный';
        }

        return { level, text };
    }

    updateStrength(password, segments, textElement) {
        const strength = this.calculateStrength(password);

        // Обновляем сегменты
        segments.forEach((segment, index) => {
            if (index < strength.level) {
                segment.classList.add('active');
            } else {
                segment.classList.remove('active');
            }
        });

        // Обновляем текст
        textElement.textContent = strength.text;
        textElement.className = 'strength-text';
        
        const levelClass = ['', 'weak', 'fair', 'good', 'strong'][strength.level];
        if (levelClass) {
            textElement.classList.add(levelClass);
        }
    }
}

// Инициализируем при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    new PasswordStrengthIndicator();
}); 