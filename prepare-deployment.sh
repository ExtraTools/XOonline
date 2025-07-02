#!/bin/bash

echo "🚀 DiLauncher 2.0 - Подготовка к развертыванию"
echo "=============================================="

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для проверки команды
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 не установлен${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 установлен${NC}"
        return 0
    fi
}

# Проверка зависимостей
echo -e "\n${YELLOW}📋 Проверка зависимостей...${NC}"
check_command node
check_command npm
check_command git

# Проверка версии Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 16 ]; then
    echo -e "${RED}❌ Требуется Node.js версии 16 или выше${NC}"
    exit 1
fi

# Создание необходимых директорий
echo -e "\n${YELLOW}📁 Создание директорий...${NC}"
mkdir -p logs
mkdir -p uploads/avatars
mkdir -p launcher-data
mkdir -p launcher-builds
mkdir -p crash-reports
echo -e "${GREEN}✅ Директории созданы${NC}"

# Создание .env файла если не существует
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}🔧 Создание .env файла...${NC}"
    cp .env.example .env 2>/dev/null || cat > .env << EOL
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/dilauncher

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)

# Encryption Keys
CRYPTO_SECRET=$(openssl rand -base64 32)

# Minecraft Settings
MINECRAFT_VERSIONS_API=https://launchermeta.mojang.com/mc/game/version_manifest.json
MINECRAFT_ASSETS_URL=https://resources.download.minecraft.net/
MINECRAFT_LIBRARIES_URL=https://libraries.minecraft.net/

# File Storage
UPLOAD_DIR=./uploads
LAUNCHER_STORAGE_DIR=./launcher-data
MAX_FILE_SIZE=100MB

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EOL
    echo -e "${GREEN}✅ .env файл создан с случайными ключами${NC}"
    echo -e "${YELLOW}⚠️  Обязательно обновите DATABASE_URL и другие настройки!${NC}"
else
    echo -e "${GREEN}✅ .env файл уже существует${NC}"
fi

# Установка зависимостей
echo -e "\n${YELLOW}📦 Установка зависимостей...${NC}"
npm install

# Проверка MongoDB
echo -e "\n${YELLOW}🗄️  Проверка MongoDB...${NC}"
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB установлена локально${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB не найдена локально${NC}"
    echo -e "   Используйте MongoDB Atlas или установите локально"
fi

# Создание администратора
echo -e "\n${YELLOW}👤 Создание администратора...${NC}"
cat > scripts/create-admin.js << 'EOL'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import connectDB from '../src/config/database.js';

dotenv.config();

async function createAdmin() {
    try {
        await connectDB();
        
        const adminEmail = 'admin@dilauncher.com';
        const adminPassword = 'Admin123!';
        
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Администратор уже существует');
            process.exit(0);
        }
        
        const admin = new User({
            username: 'admin',
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            emailVerified: true,
            profiles: [{
                name: 'Admin Profile',
                version: '1.20.4',
                modLoader: 'vanilla'
            }]
        });
        
        await admin.save();
        console.log('✅ Администратор создан:');
        console.log('   Email: ' + adminEmail);
        console.log('   Password: ' + adminPassword);
        console.log('   ⚠️  ОБЯЗАТЕЛЬНО смените пароль после первого входа!');
        
        process.exit(0);
    } catch (error) {
        console.error('Ошибка:', error);
        process.exit(1);
    }
}

createAdmin();
EOL

# Проверка готовности
echo -e "\n${YELLOW}🎯 Итоговая проверка...${NC}"

READY=true

# Проверка .env
if grep -q "your-super-secret" .env 2>/dev/null; then
    echo -e "${RED}❌ .env содержит дефолтные значения${NC}"
    READY=false
else
    echo -e "${GREEN}✅ .env настроен${NC}"
fi

# Проверка node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Зависимости установлены${NC}"
else
    echo -e "${RED}❌ Зависимости не установлены${NC}"
    READY=false
fi

# Итог
echo -e "\n=============================================="
if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ Проект готов к развертыванию!${NC}"
    echo -e "\nСледующие шаги:"
    echo -e "1. Настройте MongoDB (локально или MongoDB Atlas)"
    echo -e "2. Обновите .env файл с правильными настройками"
    echo -e "3. Запустите миграцию: npm run migrate"
    echo -e "4. Создайте администратора: node scripts/create-admin.js"
    echo -e "5. Запустите сервер: npm start"
else
    echo -e "${RED}❌ Требуется дополнительная настройка${NC}"
fi

echo -e "\n📚 Документация: см. DEPLOYMENT.md"
echo -e "💬 Поддержка: support@dilauncher.com"