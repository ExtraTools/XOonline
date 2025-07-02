@echo off
chcp 65001 >nul
title 🔥 Glass XO - Запуск игры
color 0A

echo.
echo 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
echo 🔥                   GLASS XO ONLINE                     🔥
echo 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
echo.

echo 🛡️ Настройка файрвола для всех интерфейсов...
netsh advfirewall firewall add rule name="Glass XO Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="Glass XO Node.js" dir=in action=allow program=node >nul 2>&1
netsh advfirewall firewall add rule name="Glass XO RadMin" dir=in action=allow remoteip=26.0.0.0/8 protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="Glass XO Local" dir=in action=allow remoteip=192.168.0.0/16 protocol=TCP localport=3000 >nul 2>&1
echo ✅ Файрвол настроен для всех сетей

echo 🔄 Освобождаем порт 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo ✅ Порт освобожден

echo.
echo 📋 АДРЕСА ДЛЯ ПОДКЛЮЧЕНИЯ:
echo.

echo 💻 ДЛЯ ВАС (хост сервера):
echo    🔗 http://localhost:3000
echo    🔗 http://127.0.0.1:3000
echo.

echo 🌐 АДРЕСА ДЛЯ ДРУЗЕЙ В ДРУГИХ ГОРОДАХ:
echo    🎯 РАДМИН VPN: http://26.207.157.149:3000 ^(ОСНОВНОЙ АДРЕС^)
echo    🏠 ЛОКАЛЬНАЯ СЕТЬ: http://192.168.1.111:3000 ^(в той же сети^)
echo.

echo 📋 ПРОВЕРКА IP АДРЕСОВ:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
    setlocal EnableDelayedExpansion
    set "ip=!ip: =!"
    
    if "!ip:~0,3!"=="26." (
        echo    ✅ RadMin VPN активен: !ip!
    )
    
    if "!ip:~0,3!"=="192" (
        echo    ✅ Локальная сеть активна: !ip!
    )
    
    if "!ip:~0,3!"=="10." (
        echo    ✅ Домашняя сеть активна: !ip!
    )
    
    endlocal
)

echo.
echo 🎮 ИНСТРУКЦИЯ ДЛЯ ДРУГА:
echo    1️⃣ Отправь другу адрес: http://26.207.157.149:3000
echo    2️⃣ Друг должен открыть этот адрес в браузере
echo    3️⃣ Убедись что у друга тоже установлен RadMin VPN
echo    4️⃣ Оба должны быть подключены к одной RadMin сети
echo    5️⃣ Играйте онлайн вместе!
echo.
echo 🔧 ЕСЛИ НЕ РАБОТАЕТ:
echo    ❗ Проверь что RadMin VPN подключен
echo    ❗ Друг тоже должен иметь RadMin VPN
echo    ❗ Временно отключи антивирус/брандмауэр
echo    ❗ Используй точный адрес: 26.207.157.149:3000
echo.

echo 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
echo 🔥                 ЗАПУСК СЕРВЕРА                       🔥
echo 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
echo.

rem Проверяем наличие Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не найден!
    echo 💡 Установите Node.js с https://nodejs.org
    pause
    exit /b 1
)

rem Проверяем наличие server.js
if not exist "server.js" (
    echo ❌ Файл server.js не найден!
    echo 💡 Убедитесь что вы в правильной папке
    pause
    exit /b 1
)

echo 🚀 Открываем браузер...
start http://localhost:3000

echo 🔥 Запускаем сервер...
node server.js

rem Если сервер завершился - показываем ошибку
echo.
echo ❌ Сервер остановлен!
pause 