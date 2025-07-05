#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

async function testLogin() {
    console.log('🔍 Тестирование входа...');
    
    const loginData = {
        login: 'admin',
        password: 'admin123'
    };

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();
        
        console.log('📊 Статус ответа:', response.status);
        console.log('📋 Данные ответа:', data);
        
        if (data.success && data.token) {
            console.log('✅ Токен получен:', data.token);
            
            // Теперь проверим токен
            console.log('\n🔍 Проверка токена...');
            
            const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            });

            const verifyData = await verifyResponse.json();
            
            console.log('📊 Статус проверки:', verifyResponse.status);
            console.log('📋 Данные проверки:', verifyData);
            
        } else {
            console.log('❌ Не удалось получить токен');
        }
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error);
    }
}

testLogin(); 