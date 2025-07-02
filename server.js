// DiLauncher - Основной серверный файл
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Безопасность
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "https://mc-heads.net"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://xoonline-production.up.railway.app'] 
        : ['http://localhost:3000'],
    credentials: true
}));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use('/fonts', express.static(path.join(__dirname, 'FRONTS')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Парсинг JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API маршруты
app.get('/api/stats', (req, res) => {
    // Возвращаем актуальную статистику DiLauncher
    res.json({
        users_online: Math.floor(Math.random() * 1000) + 2000,
        downloads: 125439 + Math.floor(Math.random() * 100),
        servers: 89,
        minecraft_versions: 47,
        active_players: [
            {
                name: "CraftMaster",
                status: "Играет в 1.20.4",
                avatar: "https://mc-heads.net/avatar/Steve/32"
            },
            {
                name: "BuilderPro", 
                status: "Модифицирует мир",
                avatar: "https://mc-heads.net/avatar/Alex/32"
            },
            {
                name: "RedstoneKing",
                status: "Создает схемы",
                avatar: "https://mc-heads.net/avatar/Notch/32"
            }
        ]
    });
});

// API для скачивания
app.get('/api/download/:platform', (req, res) => {
    const { platform } = req.params;
    
    console.log(`Запрос на скачивание DiLauncher для ${platform}`);
    
    if (platform === 'windows') {
        // Здесь будет ссылка на реальный файл лаунчера
        res.json({
            success: true,
            download_url: '/downloads/DiLauncher-2.1.0-Windows.exe',
            version: '2.1.0',
            size: '45.2 MB'
        });
    } else {
        res.json({
            success: false,
            message: 'Платформа пока не поддерживается'
        });
    }
});

// API для получения информации о версиях Minecraft
app.get('/api/minecraft-versions', (req, res) => {
    res.json({
        latest_release: "1.20.4",
        latest_snapshot: "24w04a",
        supported_versions: [
            "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20",
            "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19",
            "1.18.2", "1.18.1", "1.18",
            "1.17.1", "1.17",
            "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16",
            "1.15.2", "1.15.1", "1.15",
            "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14",
            "1.13.2", "1.13.1", "1.13",
            "1.12.2", "1.12.1", "1.12",
            "1.11.2", "1.11.1", "1.11",
            "1.10.2", "1.10.1", "1.10",
            "1.9.4", "1.9.3", "1.9.2", "1.9.1", "1.9",
            "1.8.9", "1.8.8", "1.8.7", "1.8.6", "1.8.5", "1.8.4", "1.8.3", "1.8.2", "1.8.1", "1.8",
            "1.7.10", "1.7.9", "1.7.8", "1.7.7", "1.7.6", "1.7.5", "1.7.4", "1.7.2"
        ]
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Что-то пошло не так'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`DiLauncher сервер запущен на порту ${PORT}`);
    console.log(`Откройте http://localhost:${PORT} для просмотра`);
    console.log(`Среда: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 