# DiLauncher Dockerfile
# Многоэтапная сборка для оптимизации размера образа

# === Этап 1: Base ===
FROM node:18-alpine as base

# Устанавливаем системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Создаем пользователя для приложения
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dilauncher -u 1001

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# === Этап 2: Dependencies ===
FROM base as dependencies

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# === Этап 3: Development ===
FROM base as development

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY . .

# Устанавливаем права доступа
RUN chown -R dilauncher:nodejs /app
USER dilauncher

# Открываем порт
EXPOSE 3000

# Команда для разработки
CMD ["npm", "run", "dev"]

# === Этап 4: Production ===
FROM base as production

# Копируем production зависимости
COPY --from=dependencies /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Создаем необходимые директории
RUN mkdir -p data logs && \
    chown -R dilauncher:nodejs /app

# Устанавливаем пользователя
USER dilauncher

# Добавляем healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(({default:http})=>{const req=http.request('http://localhost:3000/api/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.end()})"

# Открываем порт
EXPOSE 3000

# Команда запуска
CMD ["npm", "start"]

# === Метаданные ===
LABEL maintainer="DiLauncher Team <support@dilauncher.com>"
LABEL version="2.0.0"
LABEL description="DiLauncher - Modern Minecraft Launcher"
LABEL org.opencontainers.image.source="https://github.com/waitdino/DiLauncher"