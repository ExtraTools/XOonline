-- DiLauncher PostgreSQL Initialization Script
-- Создает базу данных с необходимыми расширениями

-- Создаем расширения для дополнительной функциональности
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Создаем схему для временных таблиц
CREATE SCHEMA IF NOT EXISTS temp;

-- Создаем пользователя для приложения (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'dilauncher') THEN
        CREATE USER dilauncher WITH PASSWORD 'dilauncher_password';
    END IF;
END
$$;

-- Даем права пользователю
GRANT ALL PRIVILEGES ON DATABASE dilauncher TO dilauncher;
GRANT ALL PRIVILEGES ON SCHEMA public TO dilauncher;
GRANT ALL PRIVILEGES ON SCHEMA temp TO dilauncher;

-- Создаем базу данных для разработки
CREATE DATABASE dilauncher_dev WITH OWNER dilauncher;

-- Устанавливаем настройки производительности
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;

-- Перезагружаем конфигурацию
SELECT pg_reload_conf();

-- Информационное сообщение
DO $$
BEGIN
    RAISE NOTICE 'DiLauncher PostgreSQL database initialized successfully!';
    RAISE NOTICE 'Available databases: dilauncher (production), dilauncher_dev (development)';
    RAISE NOTICE 'User: dilauncher';
END
$$;