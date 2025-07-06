import fetch from 'node-fetch';

const testRegistration = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser_debug',
                email: 'testuser_debug@example.com',
                password: '123456789'
            })
        });

        console.log('📊 Статус ответа:', response.status);
        
        const data = await response.json();
        console.log('📋 Полный ответ сервера:', data);
        
        if (response.ok) {
            console.log('✅ Регистрация успешна!');
            console.log('🔑 Токен:', data.token);
        } else {
            console.log('❌ Ошибка регистрации');
            console.log('🔍 Детали:', data.errors || data.message);
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        console.error('❌ Стек ошибки:', error.stack);
    }
};

testRegistration(); 