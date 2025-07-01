// Отладочный тест для проверки проблемы входа
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

async function debugLoginIssue() {
    console.log('🔍 ОТЛАДКА ПРОБЛЕМЫ ВХОДА\n');

    try {
        // Проверим, что сервер работает
        console.log('1. Проверяем статус сервера...');
        const healthResponse = await fetch(`${SERVER_URL}/api/health`);
        const healthData = await healthResponse.json();
        console.log(`Сервер: ${healthData.status === 'ok' ? '✅ Работает' : '❌ Проблемы'}\n`);

        // Попробуем войти с тестовыми данными
        console.log('2. Попытка входа с тестовыми данными...');
        const loginAttempt = {
            login: 'vitaliklord1996@gmail.com', // Из скриншота
            password: 'testpassword' // Попробуем разные варианты
        };

        console.log(`Пытаемся войти как: ${loginAttempt.login}`);
        
        const loginResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginAttempt),
        });

        console.log(`Статус ответа: ${loginResponse.status}`);
        
        const loginData = await loginResponse.json();
        console.log('Ответ сервера:', loginData);

        if (!loginData.success) {
            console.log('\n❌ ОШИБКА ВХОДА');
            console.log('Возможные причины:');
            console.log('- Неправильный пароль');
            console.log('- Пользователь не существует');
            console.log('- Проблема с базой данных');
            
            // Попробуем зарегистрировать нового пользователя
            console.log('\n3. Пробуем создать нового пользователя...');
            const newUser = {
                username: 'debuguser',
                email: 'debug@test.com',
                password: 'debugpass123'
            };

            const regResponse = await fetch(`${SERVER_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser),
            });

            const regData = await regResponse.json();
            console.log(`Регистрация: ${regData.success ? '✅ Успешно' : '❌ Ошибка'}`);
            
            if (regData.success) {
                // Пробуем войти с новыми данными
                console.log('\n4. Пробуем войти с новыми данными...');
                const newLoginResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        login: newUser.email,
                        password: newUser.password,
                    }),
                });

                const newLoginData = await newLoginResponse.json();
                console.log(`Новый вход: ${newLoginData.success ? '✅ Работает!' : '❌ Проблема остается'}`);
                console.log('Ответ:', newLoginData);
            }
        } else {
            console.log('✅ Вход успешен!');
        }

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

// Запускаем отладку
debugLoginIssue(); 