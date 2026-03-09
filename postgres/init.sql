-- Инициализация базы данных PostgreSQL
-- Этот файл выполняется при первом запуске контейнера

-- Убеждаемся что БД существует
SELECT 'CREATE DATABASE taxirating'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'taxirating')\gexec

-- Расширения
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Права
GRANT ALL PRIVILEGES ON DATABASE taxirating TO taxiuser;
ALTER USER taxiuser CREATEDB;

-- Настройки для производительности
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET random_page_cost = '1.1';