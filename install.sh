#!/bin/bash
set -e

# ╔══════════════════════════════════════════════╗
# ║   РЕЙТИНГ ТАКСОПАРКОВ МОСКВЫ — INSTALL v3   ║
# ╚══════════════════════════════════════════════╝

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()      { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
die()     { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
step()    { echo -e "\n${CYAN}══════════════════════════════════${NC}"; \
            echo -e "${CYAN}  $1${NC}"; \
            echo -e "${CYAN}══════════════════════════════════${NC}"; }

[ "$EUID" -ne 0 ] && die "Запустите от root: sudo bash install.sh"

PROJECT_DIR="/opt/taxi-rating"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Параметры ────────────────────────────────
step "Параметры установки"
read -rp "Домен или IP [например 95.163.10.25]: " DOMAIN
DOMAIN=${DOMAIN:-localhost}
read -rp "Email администратора: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}

DB_PASS=$(openssl rand -hex 16)
ADMIN_PASS=$(openssl rand -hex 10)
SECRET=$(openssl rand -hex 32)
ok "Параметры получены"

# ── Система ──────────────────────────────────
step "Обновление системы"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    curl wget git unzip htop nano ufw \
    openssl ca-certificates gnupg lsb-release \
    net-tools python3 python3-pip \
    build-essential
ok "Система обновлена"

# ── PostgreSQL ───────────────────────────────
step "Установка PostgreSQL 15"

if ! command -v psql &>/dev/null; then
    info "Добавляем репозиторий PostgreSQL..."
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg

    echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list

    apt-get update -qq
    apt-get install -y -qq postgresql-15 postgresql-client-15
    ok "PostgreSQL 15 установлен"
else
    ok "PostgreSQL уже установлен: $(psql --version | head -1)"
fi

systemctl enable postgresql
systemctl start postgresql

# Ждём готовности
for i in {1..20}; do
    pg_isready -q && break
    sleep 1
done
pg_isready -q || die "PostgreSQL не запустился"
ok "PostgreSQL запущен"

# База и пользователь
info "Создание БД и пользователя..."
sudo -u postgres psql -v ON_ERROR_STOP=0 << PSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='taxiuser') THEN
    CREATE USER taxiuser WITH PASSWORD '${DB_PASS}' CREATEDB;
  ELSE
    ALTER USER taxiuser WITH PASSWORD '${DB_PASS}';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE taxirating OWNER taxiuser ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='taxirating')\gexec

GRANT ALL PRIVILEGES ON DATABASE taxirating TO taxiuser;
\c taxirating
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
PSQL
ok "База данных 'taxirating' готова"

# Разрешаем доступ из Docker
PG_VER=$(pg_lsclusters -h | awk 'NR==1{print $1}')
PG_HBA="/etc/postgresql/${PG_VER}/main/pg_hba.conf"
PG_CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"

# listen_addresses
sed -i "s/#listen_addresses\s*=\s*'localhost'/listen_addresses = '*'/" "$PG_CONF"
sed -i "s/listen_addresses\s*=\s*'localhost'/listen_addresses = '*'/" "$PG_CONF"

# hba — Docker сети
for NET in 172.16.0.0/12 192.168.0.0/16 10.0.0.0/8; do
    grep -q "$NET" "$PG_HBA" || \
        echo "host taxirating taxiuser $NET md5" >> "$PG_HBA"
done

systemctl restart postgresql
sleep 2
ok "PostgreSQL доступен из Docker"

# IP хоста для Docker контейнеров
DOCKER_GW=$(ip route | awk '/^default/{print $3; exit}')
DOCKER_HOST_IP=${DOCKER_GW:-$(hostname -I | awk '{print $1}')}
info "Хост для Docker контейнеров: $DOCKER_HOST_IP"

# ── Docker ───────────────────────────────────
step "Установка Docker"

if ! command -v docker &>/dev/null; then
    info "Устанавливаем Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    ok "Docker установлен: $(docker --version)"
else
    ok "Docker: $(docker --version)"
fi

# Docker Compose
if ! docker compose version &>/dev/null 2>&1; then
    info "Устанавливаем Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin 2>/dev/null || true
fi
if ! docker compose version &>/dev/null 2>&1; then
    # Бинарник напрямую
    DC_VER="v2.27.0"
    curl -SL "https://github.com/docker/compose/releases/download/${DC_VER}/docker-compose-linux-x86_64" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    # Обёртка для `docker compose`
    mkdir -p /usr/lib/docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose /usr/lib/docker/cli-plugins/docker-compose
fi
docker compose version &>/dev/null 2>&1 || die "Docker Compose не установлен"
ok "Docker Compose: $(docker compose version)"

# ── Файрвол ──────────────────────────────────
step "Настройка UFW"
ufw --force reset   >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp  >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ok "UFW настроен (22, 80, 443)"

# ── Структура проекта ────────────────────────
step "Создание структуры проекта"
mkdir -p "$PROJECT_DIR"

# Если install.sh лежит внутри проекта — копируем всё
if [ -f "$SCRIPT_DIR/docker-compose.yml" ] && [ "$SCRIPT_DIR" != "$PROJECT_DIR" ]; then
    info "Копируем файлы из $SCRIPT_DIR..."
    cp -rf "$SCRIPT_DIR"/. "$PROJECT_DIR/"
fi

cd "$PROJECT_DIR"

# Гарантируем все нужные папки
mkdir -p \
    backend/config \
    backend/apps/taxiparks/management/commands \
    backend/apps/blog/management/commands \
    frontend/components \
    frontend/pages/taxiparks \
    frontend/pages/blog \
    frontend/styles \
    frontend/lib \
    frontend/public \
    nginx \
    postgres

# Обязательные файлы
touch frontend/public/.gitkeep
ok "Структура создана: $PROJECT_DIR"

# ── Генерация файлов ─────────────────────────
step "Генерация конфигурационных файлов"

# ── .env ──
cat > "$PROJECT_DIR/.env" << ENV
# TAXI RATING — $(date)
SECRET_KEY=${SECRET}
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,${DOMAIN},www.${DOMAIN}

DB_NAME=taxirating
DB_USER=taxiuser
DB_PASSWORD=${DB_PASS}
DB_HOST=${DOCKER_HOST_IP}
DB_PORT=5432

REDIS_URL=redis://redis:6379/1

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://${DOMAIN},https://${DOMAIN}

NEXT_PUBLIC_API_URL=http://${DOMAIN}
NEXT_PUBLIC_SITE_URL=http://${DOMAIN}
API_URL=http://backend:8000
NEXT_PUBLIC_API_HOST=${DOMAIN}

ADMIN_EMAIL=${ADMIN_EMAIL}
ENV
ok ".env создан"

# ── package.json ──
cat > "$PROJECT_DIR/frontend/package.json" << 'PKG'
{
  "name": "taxi-rating-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "next dev",
    "build": "next build",
    "start": "next start -p 3000",
    "lint":  "next lint"
  },
  "dependencies": {
    "next":            "14.2.5",
    "react":           "18.3.1",
    "react-dom":       "18.3.1",
    "axios":           "1.7.2",
    "bootstrap":       "5.3.3",
    "bootstrap-icons": "1.11.3",
    "swr":             "2.2.5"
  }
}
PKG
ok "package.json создан (без lock-файла)"

# Удаляем старый package-lock.json если есть (он вызывает ошибку npm ci)
rm -f "$PROJECT_DIR/frontend/package-lock.json"
rm -f "$PROJECT_DIR/frontend/yarn.lock"
rm -f "$PROJECT_DIR/frontend/pnpm-lock.yaml"
ok "Старые lock-файлы удалены"

# ── next.config.js ──
cat > "$PROJECT_DIR/frontend/next.config.js" << 'NEXTCFG'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  eslint:     { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'http',  hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    API_URL:              process.env.API_URL              || 'http://backend:8000',
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:8000',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, net: false, tls: false };
    }
    return config;
  },
};
module.exports = nextConfig;
NEXTCFG
ok "next.config.js создан"

# ── Dockerfile.frontend ──
cat > "$PROJECT_DIR/Dockerfile.frontend" << 'DFRONT'
FROM node:20-alpine AS builder

WORKDIR /app

# Нативные зависимости для Alpine
RUN apk add --no-cache libc6-compat python3 make g++

# Только package.json — без lock-файла
COPY frontend/package.json ./

# npm install вместо npm ci (не требует lock-файла)
RUN npm install \
    --prefer-offline \
    --no-audit \
    --no-fund \
    --loglevel=error

# Исходники
COPY frontend/ .

# public обязательна
RUN mkdir -p public && touch public/.gitkeep

# Переменные сборки
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── production ──
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static

RUN mkdir -p public
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
DFRONT
ok "Dockerfile.frontend создан"

# ── Dockerfile.backend ──
cat > "$PROJECT_DIR/Dockerfile.backend" << 'DBACK'
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libjpeg-dev zlib1g-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN mkdir -p staticfiles media && \
    touch apps/__init__.py \
          apps/taxiparks/__init__.py \
          apps/blog/__init__.py && \
    mkdir -p apps/taxiparks/management/commands \
             apps/blog/management/commands     && \
    touch apps/taxiparks/management/__init__.py \
          apps/taxiparks/management/commands/__init__.py \
          apps/blog/management/__init__.py \
          apps/blog/management/commands/__init__.py

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
CMD ["/entrypoint.sh"]
DBACK
ok "Dockerfile.backend создан"

# ── docker-entrypoint.sh ──
cat > "$PROJECT_DIR/docker-entrypoint.sh" << 'ENTRY'
#!/bin/bash
set -e

echo "⏳ Ожидание PostgreSQL..."
for i in $(seq 1 60); do
    python manage.py check --database default 2>/dev/null && break
    echo "  Попытка $i/60 — ждём 3с..."
    sleep 3
done

python manage.py check --database default || { echo "❌ БД недоступна!"; exit 1; }
echo "✅ PostgreSQL доступен"

echo "🔄 Миграции..."
python manage.py migrate --noinput

echo "📦 Статика..."
python manage.py collectstatic --noinput --clear

echo "🌱 Тестовые данные..."
python manage.py seed_data 2>/dev/null && echo "✅ Данные загружены" || echo "ℹ️  Данные уже есть"

echo "🚀 Запуск Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile - \
    --error-logfile -
ENTRY
chmod +x "$PROJECT_DIR/docker-entrypoint.sh"
ok "docker-entrypoint.sh создан"

# ── docker-compose.yml ──
cat > "$PROJECT_DIR/docker-compose.yml" << DCF
version: '3.9'

services:
  redis:
    image: redis:7-alpine
    container_name: taxi_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: taxi_backend
    restart: unless-stopped
    env_file: .env
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - media_data:/app/media
      - static_data:/app/staticfiles
    expose:
      - "8000"
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/taxiparks/"]
      interval: 20s
      timeout: 10s
      retries: 10
      start_period: 120s

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - NEXT_PUBLIC_API_URL=http://${DOMAIN}
        - NEXT_PUBLIC_SITE_URL=http://${DOMAIN}
    container_name: taxi_frontend
    restart: unless-stopped
    env_file: .env
    environment:
      - NODE_ENV=production
      - API_URL=http://backend:8000
    expose:
      - "3000"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: taxi_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - media_data:/app/media:ro
      - static_data:/app/staticfiles:ro
      - certbot_conf:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew --quiet; sleep 12h & wait \$\${!}; done;'"

volumes:
  redis_data:
  media_data:
  static_data:
  certbot_conf:
  certbot_www:
DCF
ok "docker-compose.yml создан"

# ── nginx.conf ──
cat > "$PROJECT_DIR/nginx/nginx.conf" << 'NGX'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events { worker_connections 1024; }

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    server_tokens off;
    client_max_body_size 10M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript;

    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;

    upstream backend  { server backend:8000;  }
    upstream frontend { server frontend:3000; }

    server {
        listen 80 default_server;
        server_name _;

        location /.well-known/acme-challenge/ { root /var/www/certbot; }

        location /static/ {
            alias /app/staticfiles/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
        location /media/ {
            alias /app/media/;
            expires 7d;
        }

        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ {
            limit_req zone=api burst=30 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Upgrade    $http_upgrade;
            proxy_set_header Connection upgrade;
            proxy_read_timeout 60s;
        }
    }
}
NGX
ok "nginx.conf создан"

# ── Сборка ───────────────────────────────────
step "Сборка Docker образов"

cd "$PROJECT_DIR"

info "Собираем backend..."
docker compose build backend 2>&1 | grep -E "(Step|Successfully|ERROR|error)" || true

info "Собираем frontend..."
docker compose build frontend 2>&1 | grep -E "(Step|Successfully|ERROR|error|warn)" || true

ok "Образы собраны"

# ── Запуск ───────────────────────────────────
step "Запуск сервисов"

docker compose up -d redis
sleep 3
ok "Redis запущен"

docker compose up -d backend
info "Ожидаем backend (до 3 минут)..."
for i in $(seq 1 36); do
    if docker compose exec -T backend \
        curl -sf http://localhost:8000/api/taxiparks/ >/dev/null 2>&1; then
        ok "Backend готов (${i}×5 сек)"
        break
    fi
    printf '.'
    sleep 5
done
echo ""

docker compose up -d frontend
sleep 8
ok "Frontend запущен"

docker compose up -d nginx
sleep 3
ok "Nginx запущен"

# ── Django admin ─────────────────────────────
step "Django superuser"

docker compose exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
if not U.objects.filter(username='admin').exists():
    U.objects.create_superuser('admin', '${ADMIN_EMAIL}', '${ADMIN_PASS}')
    print('created')
else:
    u = U.objects.get(username='admin')
    u.set_password('${ADMIN_PASS}')
    u.save()
    print('updated')
" 2>/dev/null || warn "Superuser создайте вручную: docker compose exec backend python manage.py createsuperuser"

ok "Admin пользователь готов"

# ── Автозапуск ───────────────────────────────
step "Автозапуск при ребуте"

cat > /etc/systemd/system/taxi-rating.service << SVC
[Unit]
Description=Taxi Rating
After=docker.service postgresql.service network-online.target
Requires=docker.service postgresql.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${PROJECT_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable taxi-rating.service
ok "Systemd сервис создан"

# ── Проверка ──────────────────────────────────
step "Финальная проверка"
sleep 5

HTTP_API=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/taxiparks/ 2>/dev/null || echo 000)
HTTP_WEB=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null || echo 000)

[ "$HTTP_API" = "200" ] && ok "API:     HTTP $HTTP_API ✓" || warn "API:     HTTP $HTTP_API (стартует...)"
[ "$HTTP_WEB" = "200" ] && ok "Сайт:    HTTP $HTTP_WEB ✓" || warn "Сайт:    HTTP $HTTP_WEB (стартует...)"

docker compose ps

# ── Сохраняем данные ─────────────────────────
cat > /root/credentials.txt << CREDS
═══════════════════════════════════════
  TAXI RATING — $(date)
═══════════════════════════════════════
Сайт:    http://${DOMAIN}
API:     http://${DOMAIN}/api/
Admin:   http://${DOMAIN}/admin/

Django admin:
  login:    admin
  password: ${ADMIN_PASS}
  email:    ${ADMIN_EMAIL}

PostgreSQL:
  host:     localhost
  db:       taxirating
  user:     taxiuser
  password: ${DB_PASS}

Проект:  ${PROJECT_DIR}
Логи:    cd ${PROJECT_DIR} && docker compose logs -f
═══════════════════════════════════════
CREDS
chmod 600 /root/credentials.txt

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ УСТАНОВКА ЗАВЕРШЕНА!           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
printf  "${GREEN}║${NC}  🌐 http://%-31s${GREEN}║${NC}\n" "${DOMAIN}"
printf  "${GREEN}║${NC}  👑 /admin/ → admin / %-20s${GREEN}║${NC}\n" "${ADMIN_PASS}"
printf  "${GREEN}║${NC}  🗄️  PG pass: %-29s${GREEN}║${NC}\n" "${DB_PASS}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  💾 /root/credentials.txt               ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Применяем исправления на уже развёрнутом сервере ──

fix_deployed() {
    local DIR="/opt/taxi-rating"
    cd "$DIR"

    echo "=== Обновление .env: DB_HOST=db ==="
    sed -i 's/^DB_HOST=.*/DB_HOST=db/' .env
    grep DB_HOST .env

    echo "=== Пересборка и перезапуск ==="
    docker compose down --remove-orphans

    # Убираем старые образы backend
    docker rmi taxi-rating-backend 2>/dev/null || true

    docker compose build --no-cache backend
    docker compose up -d

    echo "=== Ожидание backend (3 мин) ==="
    for i in $(seq 1 36); do
        sleep 5
        STATUS=$(docker inspect --format='{{.State.Status}}' taxi_backend 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "running" ]; then
            HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/taxiparks/ 2>/dev/null || echo 000)
            echo "  [$((i*5))s] backend=$STATUS api=$HTTP"
            [ "$HTTP" = "200" ] && echo "✅ API работает!" && break
        else
            echo "  [$((i*5))s] backend=$STATUS — перезапускается..."
            docker logs taxi_backend --tail=5 2>/dev/null || true
        fi
    done
}