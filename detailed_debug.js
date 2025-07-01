// Подробный отладочный тест
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

async function detailedDebug() {
    console.log('🔍 ПОДРОБНАЯ ОТЛАДКА\n');

    try {
        // Тест регистрации с деталями
        console.log('📝 Тестируем регистрацию...');
        const newUser = {
            username: 'testuser2024',
            email: 'test2024@example.com',
            password: 'testpass123'
        };

        console.log('Данные для регистрации:', newUser);

        const regResponse = await fetch(`${SERVER_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUser),
        });

        console.log('Статус ответа регистрации:', regResponse.status);
        console.log('Заголовки ответа:', Object.fromEntries(regResponse.headers.entries()));

        const regData = await regResponse.json();
        console.log('Полный ответ регистрации:', JSON.stringify(regData, null, 2));

        if (regData.success) {
            console.log('✅ Регистрация успешна! Тестируем вход...');
            
            const loginResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login: newUser.email,
                    password: newUser.password,
                }),
            });

            const loginData = await loginResponse.json();
            console.log('Результат входа:', JSON.stringify(loginData, null, 2));
        } else {
            console.log('❌ Регистрация не удалась');
            if (regData.errors) {
                console.log('Ошибки валидации:', regData.errors);
            }
        }

    } catch (error) {
        console.error('❌ Ошибка при отладке:', error);
    }
}

detailedDebug(); 