document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Инициализация
    initTabs();
    loadUserData();
    setupEventListeners();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Удаляем активные классы
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

function loadUserData() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateProfileDisplay(data.user);
        } else {
            console.error('Error loading profile:', data.message);
        }
    })
    .catch(error => {
        console.error('Error fetching profile:', error);
    });
}

function updateProfileDisplay(user) {
    // Обновляем информацию профиля
    document.getElementById('profileUsername').textContent = user.username || 'Игрок';
    document.getElementById('profileTitle').textContent = user.minecraft && user.minecraft.username ? 'Minecraft Player' : 'Пользователь';
    document.getElementById('profileStatus').textContent = user.status || 'Оффлайн';
    document.getElementById('profileVersion').textContent = user.game_version || '1.20.4';
    document.getElementById('profileSince').textContent = new Date(user.created_at).toLocaleDateString();

    // Обновляем аватар (приоритет Minecraft скину)
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        if (user.minecraft && user.minecraft.head_url) {
            avatar.src = user.minecraft.head_url;
        } else if (user.avatar_url) {
            avatar.src = user.avatar_url;
            } else {
            // Используем дефолтную аватарку
            avatar.src = 'avatars/default.svg';
        }
    }

    // Заполняем поля формы
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('registrationDate').value = new Date(user.created_at).toLocaleDateString();
    
    // Обновляем информацию о Minecraft аккаунте
    updateMinecraftInfo(user.minecraft);
    
    // Загружаем скины
    loadSkins(user.minecraft);
}

function updateMinecraftInfo(minecraft) {
    const linkedSection = document.getElementById('minecraftLinked');
    const unlinkButton = document.getElementById('unlinkMinecraft');
    const linkSection = document.getElementById('minecraftLink');
    
    if (minecraft && minecraft.uuid) {
        // Аккаунт связан
        if (linkedSection) {
            linkedSection.style.display = 'block';
            document.getElementById('minecraftNickname').textContent = minecraft.username || 'Неизвестно';
            document.getElementById('minecraftUuid').textContent = minecraft.uuid;
            document.getElementById('minecraftSkinModel').textContent = minecraft.skin_model === 'slim' ? 'Alex' : 'Steve';
            
            // Отображаем скин
            const skinPreview = document.getElementById('minecraftSkinPreview');
            if (skinPreview && minecraft.avatar_url) {
                skinPreview.src = minecraft.avatar_url;
            }
        }
        
        if (unlinkButton) {
            unlinkButton.style.display = 'block';
        }
        
        if (linkSection) {
            linkSection.style.display = 'none';
        }
    } else {
        // Аккаунт не связан
        if (linkedSection) {
            linkedSection.style.display = 'none';
        }
        
        if (unlinkButton) {
            unlinkButton.style.display = 'none';
        }
        
        if (linkSection) {
            linkSection.style.display = 'block';
        }
    }
}

function loadSkins(minecraft) {
    const skinsList = document.getElementById('skinsList');
    if (!skinsList) return;
    
    // Очищаем список скинов
    skinsList.innerHTML = '';
    
    // Если есть связанный аккаунт, показываем текущий скин
    if (minecraft && minecraft.uuid) {
        const currentSkinCard = document.createElement('div');
        currentSkinCard.className = 'skin-card active';
        currentSkinCard.innerHTML = `
            <img src="${minecraft.avatar_url}" alt="Текущий скин">
            <div class="skin-info">
                <h4>Текущий скин</h4>
                <p>Модель: ${minecraft.skin_model === 'slim' ? 'Alex' : 'Steve'}</p>
                <button class="btn btn-primary" onclick="refreshSkin()">Обновить скин</button>
            </div>
        `;
        skinsList.appendChild(currentSkinCard);
    }
    
    // Загружаем популярные скины
    loadPopularSkins();
}

function loadPopularSkins() {
    fetch('/api/minecraft/popular-skins')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const skinsList = document.getElementById('skinsList');
                if (!skinsList) return;
                
                data.data.forEach(skin => {
                    const skinCard = document.createElement('div');
                    skinCard.className = 'skin-card';
                    skinCard.innerHTML = `
                        <img src="${skin.avatar_url}" alt="Скин ${skin.name}">
                        <div class="skin-info">
                            <h4>${skin.name}</h4>
                            <p>Популярный скин</p>
                            <button class="btn btn-secondary" onclick="previewSkin('${skin.uuid}')">Предпросмотр</button>
                        </div>
                    `;
                    skinsList.appendChild(skinCard);
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки популярных скинов:', error);
        });
}

function setupEventListeners() {
    // Обработчики для изменения пароля
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', changePassword);
    }

    // Обработчики для изменения никнейма
    const updateUsernameBtn = document.getElementById('updateUsernameBtn');
    if (updateUsernameBtn) {
        updateUsernameBtn.addEventListener('click', updateUsername);
    }
    
    // Обработчик для проверки никнейма в реальном времени
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        let checkTimeout;
        usernameInput.addEventListener('input', function() {
            clearTimeout(checkTimeout);
            const username = this.value.trim();
            
            if (username.length === 0) {
                hideUsernameStatus();
                return;
            }
            
            if (username.length < 3) {
                showUsernameStatus('error', 'Минимум 3 символа');
                return;
            }
            
            // Проверяем с задержкой для избежания спама запросов
            checkTimeout = setTimeout(() => {
                checkUsernameAvailability(username);
            }, 500);
        });
        
        // Скрываем статус при фокусе, если поле пустое
        usernameInput.addEventListener('focus', function() {
            if (this.value.trim() === '') {
                hideUsernameStatus();
            }
        });
    }



    // Minecraft account buttons
    const linkMinecraftBtn = document.getElementById('linkMinecraftBtn');
    if (linkMinecraftBtn) {
        linkMinecraftBtn.addEventListener('click', linkMinecraftAccount);
    }

    const unlinkMinecraftBtn = document.getElementById('unlinkMinecraftBtn');
    if (unlinkMinecraftBtn) {
        unlinkMinecraftBtn.addEventListener('click', unlinkMinecraftAccount);
    }

    // Skin management
    const selectSkinFileBtn = document.getElementById('selectSkinFileBtn');
    if (selectSkinFileBtn) {
        selectSkinFileBtn.addEventListener('click', () => {
            document.getElementById('skinFileInput').click();
        });
    }

    const skinFileInput = document.getElementById('skinFileInput');
    if (skinFileInput) {
        skinFileInput.addEventListener('change', uploadSkin);
    }



    // Button for logging out
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Заполните все поля');
            return;
        }

    if (newPassword !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    if (newPassword.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }

    const token = localStorage.getItem('auth_token');
    fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Пароль успешно изменён');
            // Очищаем поля
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert('Ошибка: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error changing password:', error);
        alert('Ошибка при изменении пароля');
    });
}

function updateUsername() {
    const newUsername = document.getElementById('username').value;
    
    if (!newUsername) {
        alert('Введите никнейм');
        return;
    }

    const token = localStorage.getItem('auth_token');
    fetch('/api/profile/update-username', {
                    method: 'POST',
                    headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            username: newUsername
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Никнейм успешно изменён');
            // Обновляем отображение
            const profileUsernameElement = document.getElementById('profileUsername');
            if (profileUsernameElement) {
                profileUsernameElement.textContent = newUsername;
            }
        } else {
            alert('Ошибка: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating username:', error);
        alert('Ошибка при обновлении никнейма');
    });
}



function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/';
}

// Функции для работы с Minecraft аккаунтом
function linkMinecraftAccount() {
    const minecraftUsername = document.getElementById('minecraftUsername').value;
    const token = localStorage.getItem('auth_token');
    
    if (!minecraftUsername.trim()) {
        showNotification('Введите никнейм Minecraft', 'error');
        return;
    }
    
    fetch('/api/minecraft/link-account', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            minecraftUsername: minecraftUsername.trim()
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Minecraft аккаунт успешно связан!', 'success');
            // Перезагружаем данные профиля
            loadUserData();
            } else {
            showNotification(data.message || 'Ошибка связывания аккаунта', 'error');
        }
    })
    .catch(error => {
        console.error('Error linking account:', error);
        showNotification('Ошибка при связывании аккаунта', 'error');
    });
}

function unlinkMinecraftAccount() {
    const token = localStorage.getItem('auth_token');
    
    if (!confirm('Вы уверены, что хотите отвязать Minecraft аккаунт?')) {
        return;
    }
    
    fetch('/api/minecraft/unlink-account', {
        method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Minecraft аккаунт отвязан', 'success');
            // Перезагружаем данные профиля
            loadUserData();
        } else {
            showNotification(data.message || 'Ошибка отвязывания аккаунта', 'error');
        }
    })
    .catch(error => {
        console.error('Error unlinking account:', error);
        showNotification('Ошибка при отвязывании аккаунта', 'error');
    });
}

function refreshSkin() {
    const token = localStorage.getItem('auth_token');
    
    fetch('/api/minecraft/update-skin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Скин обновлен!', 'success');
            // Перезагружаем данные профиля
            loadUserData();
        } else {
            showNotification(data.message || 'Ошибка обновления скина', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating skin:', error);
        showNotification('Ошибка при обновлении скина', 'error');
    });
}



function uploadSkin() {
    const fileInput = document.getElementById('skinFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Выберите файл скина', 'error');
        return;
    }
    
    if (file.type !== 'image/png') {
        showNotification('Файл должен быть в формате PNG', 'error');
        return;
    }
    
    if (file.size > 1024 * 1024) { // 1MB
        showNotification('Размер файла не должен превышать 1MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('skin', file);
    
    const token = localStorage.getItem('auth_token');
    
    fetch('/api/minecraft/upload-skin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Скин загружен!', 'success');
            loadUserData();
        } else {
            showNotification(data.message || 'Ошибка загрузки скина', 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading skin:', error);
        showNotification('Ошибка при загрузке скина', 'error');
    });
}

// Функции для проверки никнейма
async function checkUsernameAvailability(username) {
    const token = localStorage.getItem('auth_token');
    
    try {
        showUsernameStatus('checking', 'Проверяем...');
        
        const response = await fetch(`/api/profile/check-username/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.available) {
            showUsernameStatus('available', data.message);
        } else {
            showUsernameStatus('unavailable', data.message);
        }
    } catch (error) {
        console.error('Error checking username:', error);
        showUsernameStatus('error', 'Ошибка проверки');
    }
}

function showUsernameStatus(type, message) {
    const statusElement = document.getElementById('usernameStatus');
    const messageElement = document.getElementById('usernameMessage');
    const statusText = statusElement.querySelector('.status-text');
    
    if (!statusElement || !messageElement) return;
    
    // Удаляем все классы типов
    statusElement.classList.remove('checking', 'available', 'unavailable', 'error');
    messageElement.classList.remove('available', 'unavailable', 'error');
    
    // Добавляем нужный класс
    statusElement.classList.add(type);
    messageElement.classList.add(type);
    
    // Устанавливаем текст
    statusText.textContent = type === 'checking' ? '' : '';
    messageElement.textContent = message;
    
    // Показываем элементы
    statusElement.style.display = 'flex';
    messageElement.style.display = 'block';
}

function hideUsernameStatus() {
    const statusElement = document.getElementById('usernameStatus');
    const messageElement = document.getElementById('usernameMessage');
    
    if (statusElement) {
        statusElement.style.display = 'none';
    }
    if (messageElement) {
        messageElement.style.display = 'none';
        messageElement.textContent = '';
    }
}

function showNotification(message, type) {
    // Создаем уведомление
        const notification = document.createElement('div');
    notification.className = `notification ${type}`;
        notification.textContent = message;

    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
        document.body.appendChild(notification);

    // Автоматически удаляем через 5 секунд
        setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
            }, 300);
    }, 5000);
} 