#!/bin/bash
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
die()   { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }
step()  { echo -e "\n${CYAN}══════════════════════════════════${NC}"; \
          echo -e "${CYAN}  $1${NC}"; \
          echo -e "${CYAN}══════════════════════════════════${NC}"; }

[ "$EUID" -ne 0 ] && die "Запустите от root: sudo bash install.sh"

# ── Параметры ────────────────────────────────
step "Параметры"
read -rp "Домен или IP сервера: " DOMAIN
DOMAIN=${DOMAIN:-localhost}
read -rp "Email администратора: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}

DB_PASS=$(openssl rand -hex 16)
ADMIN_PASS=$(openssl rand -hex 10)
SECRET_KEY=$(openssl rand -hex 32)
PROJECT_DIR="/opt/taxi-rating"

ok "Домен: $DOMAIN"

# ── Система ──────────────────────────────────
step "Системные пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    curl wget git unzip nano htop \
    build-essential openssl ca-certificates \
    gnupg lsb-release ufw fail2ban \
    supervisor

ok "Базовые пакеты установлены"

# ── Python 3.11 ──────────────────────────────
step "Python 3.11"

if ! python3.11 --version &>/dev/null; then
    add-apt-repository -y ppa:deadsnakes/ppa 2>/dev/null || true
    apt-get update -qq
    apt-get install -y -qq \
        python3.11 \
        python3.11-venv \
        python3.11-dev \
        python3-pip \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        libssl-dev \
        libffi-dev
fi

ok "Python: $(python3.11 --version)"

# ── Node.js 20 ───────────────────────────────
step "Node.js 20"

if ! node --version 2>/dev/null | grep -q 'v20'; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

ok "Node.js: $(node --version)"
ok "npm:     $(npm --version)"

# ── PostgreSQL 15 ────────────────────────────
step "PostgreSQL 15"

if ! command -v psql &>/dev/null; then
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
    echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -y -qq postgresql-15 postgresql-client-15
fi

systemctl enable postgresql
systemctl start postgresql

# Ждём старта
for i in {1..20}; do pg_isready -q && break || sleep 1; done
pg_isready -q || die "PostgreSQL не запустился"

ok "PostgreSQL: $(psql --version | head -1)"

# Создаём БД и пользователя
info "Создание БД..."
sudo -u postgres psql -v ON_ERROR_STOP=0 << PSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='taxiuser') THEN
    CREATE USER taxiuser WITH PASSWORD '${DB_PASS}' CREATEDB;
  ELSE
    ALTER USER taxiuser WITH PASSWORD '${DB_PASS}';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE taxirating
  OWNER taxiuser
  ENCODING ''UTF8''
  TEMPLATE template0'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname='taxirating'
)\gexec

GRANT ALL PRIVILEGES ON DATABASE taxirating TO taxiuser;
\c taxirating
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
PSQL

ok "БД taxirating создана"

# ── Redis ─────────────────────────────────────
step "Redis"

apt-get install -y -qq redis-server

# Базовая конфигурация
cat > /etc/redis/redis.conf << 'REDISCFG'
bind 127.0.0.1
port 6379
daemonize yes
supervised systemd
maxmemory 128mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
dir /var/lib/redis
logfile /var/log/redis/redis-server.log
REDISCFG

systemctl enable redis-server
systemctl restart redis-server
sleep 2

redis-cli ping | grep -q PONG && ok "Redis запущен" || die "Redis не запустился"

# ── Nginx ─────────────────────────────────────
step "Nginx"

apt-get install -y -qq nginx
systemctl enable nginx

ok "Nginx: $(nginx -v 2>&1)"

# ── Проект: клонируем ─────────────────────────
step "Клонирование проекта"

if [ -d "$PROJECT_DIR/.git" ]; then
    info "Обновляем существующий репозиторий..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    info "Клонируем репозиторий..."
    git clone https://github.com/tech1and/taxi.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

ok "Проект: $PROJECT_DIR"

# ── Backend: виртуальное окружение ────────────
step "Python виртуальное окружение"

cd "$PROJECT_DIR"

if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi

source venv/bin/activate

pip install --upgrade pip wheel setuptools --quiet
pip install --no-cache-dir -r backend/requirements.txt --quiet

ok "Python venv: $(python --version)"
ok "Пакеты установлены"

# ── Backend: .env ─────────────────────────────
step "Конфигурация Backend (.env)"

cat > "$PROJECT_DIR/backend/.env" << ENV
SECRET_KEY=${SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,${DOMAIN}

DB_NAME=taxirating
DB_USER=taxiuser
DB_PASSWORD=${DB_PASS}
DB_HOST=127.0.0.1
DB_PORT=5432

REDIS_URL=redis://127.0.0.1:6379/1

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://${DOMAIN},https://${DOMAIN}

SITE_URL=http://${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
ENV

ok ".env создан"

# ── Backend: структура приложений ─────────────
step "Инициализация Django приложений"

cd "$PROJECT_DIR"

# Создаём все __init__.py
touch backend/apps/__init__.py
touch backend/apps/taxiparks/__init__.py
touch backend/apps/blog/__init__.py

mkdir -p backend/apps/taxiparks/management/commands
mkdir -p backend/apps/blog/management/commands

touch backend/apps/taxiparks/management/__init__.py
touch backend/apps/taxiparks/management/commands/__init__.py
touch backend/apps/blog/management/__init__.py
touch backend/apps/blog/management/commands/__init__.py

mkdir -p backend/staticfiles backend/media

# ── Backend: Django setup ─────────────────────
step "Django: миграции и данные"

cd "$PROJECT_DIR"
source venv/bin/activate

export DJANGO_SETTINGS_MODULE=config.settings
export PYTHONPATH="$PROJECT_DIR/backend:$PYTHONPATH"

cd backend

info "Применяем миграции..."
python manage.py migrate --noinput

info "Собираем статику..."
python manage.py collectstatic --noinput --clear

info "Загружаем тестовые данные..."
python manage.py seed_data || warn "Seed уже выполнен или ошибка"

info "Создаём суперпользователя..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
if not U.objects.filter(username='admin').exists():
    U.objects.create_superuser('admin', '${ADMIN_EMAIL}', '${ADMIN_PASS}')
    print('✅ admin создан')
else:
    u = U.objects.get(username='admin')
    u.set_password('${ADMIN_PASS}')
    u.save()
    print('✅ пароль admin обновлён')
"

cd "$PROJECT_DIR"
ok "Django настроен"

# ── Frontend: сборка ──────────────────────────
step "Next.js: сборка"

cd "$PROJECT_DIR/frontend"

# Удаляем lock-файлы (если есть несовместимые)
rm -f package-lock.json yarn.lock pnpm-lock.yaml

# Создаём актуальный package.json
cat > package.json << 'PKG'
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

# Создаём next.config.js
cat > next.config.js << 'NEXTCFG'
/** @type {import('next').NextConfig} */
const nextConfig = {
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
    API_URL:              process.env.API_URL              || 'http://localhost:8000',
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:8000',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
};
module.exports = nextConfig;
NEXTCFG

# Создаём .env.local для Next.js
cat > .env.local << NEXTENV
NEXT_PUBLIC_API_URL=http://${DOMAIN}
NEXT_PUBLIC_SITE_URL=http://${DOMAIN}
API_URL=http://127.0.0.1:8000
NEXTENV

# Создаём public если нет
mkdir -p public
touch public/.gitkeep

info "npm install..."
npm install --no-audit --no-fund --loglevel=error

info "npm run build..."
NEXT_PUBLIC_API_URL="http://${DOMAIN}" \
NEXT_PUBLIC_SITE_URL="http://${DOMAIN}" \
npm run build

cd "$PROJECT_DIR"
ok "Next.js собран"

# ── Supervisor ────────────────────────────────
step "Supervisor (управление процессами)"

# Конфиг для Gunicorn (Django)
cat > /etc/supervisor/conf.d/taxi-backend.conf << SUPBACK
[program:taxi-backend]
command=${PROJECT_DIR}/venv/bin/gunicorn config.wsgi:application
    --bind 127.0.0.1:8000
    --workers 3
    --timeout 120
    --keep-alive 5
    --log-level info
directory=${PROJECT_DIR}/backend
user=www-data
autostart=true
autorestart=true
startretries=5
redirect_stderr=true
stdout_logfile=/var/log/taxi-backend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
environment=
    DJANGO_SETTINGS_MODULE="config.settings",
    PYTHONPATH="${PROJECT_DIR}/backend",
    HOME="/var/www",
    PATH="${PROJECT_DIR}/venv/bin:/usr/bin:/bin"
SUPBACK

# Конфиг для Next.js
cat > /etc/supervisor/conf.d/taxi-frontend.conf << SUPFRONT
[program:taxi-frontend]
command=node ${PROJECT_DIR}/frontend/.next/standalone/server.js
directory=${PROJECT_DIR}/frontend
user=www-data
autostart=true
autorestart=true
startretries=5
redirect_stderr=true
stdout_logfile=/var/log/taxi-frontend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
environment=
    NODE_ENV="production",
    PORT="3000",
    HOSTNAME="127.0.0.1",
    API_URL="http://127.0.0.1:8000",
    NEXT_PUBLIC_API_URL="http://${DOMAIN}",
    NEXT_PUBLIC_SITE_URL="http://${DOMAIN}"
SUPFRONT

# Права для www-data
chown -R www-data:www-data "$PROJECT_DIR/backend/staticfiles" \
                            "$PROJECT_DIR/backend/media" \
                            "$PROJECT_DIR/frontend/.next" 2>/dev/null || true

# Копируем статику Next.js для standalone
if [ -d "$PROJECT_DIR/frontend/.next/standalone" ]; then
    cp -r "$PROJECT_DIR/frontend/.next/static" \
          "$PROJECT_DIR/frontend/.next/standalone/.next/static" 2>/dev/null || true
    cp -r "$PROJECT_DIR/frontend/public" \
          "$PROJECT_DIR/frontend/.next/standalone/public" 2>/dev/null || true
fi

systemctl enable supervisor
systemctl restart supervisor
sleep 3

supervisorctl reread
supervisorctl update
supervisorctl start taxi-backend  2>/dev/null || true
supervisorctl start taxi-frontend 2>/dev/null || true

ok "Supervisor настроен"

# ── Nginx конфигурация ────────────────────────
step "Nginx конфигурация"

# Удаляем дефолтный сайт
rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/taxi-rating << NGINXCFG
# Рейтинг таксопарков Москвы
# Домен: ${DOMAIN}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=60r/m;

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 10M;

    # Логи
    access_log /var/log/nginx/taxi-access.log;
    error_log  /var/log/nginx/taxi-error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json
               application/javascript text/javascript;

    # Django статика
    location /static/ {
        alias ${PROJECT_DIR}/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Django медиа
    location /media/ {
        alias ${PROJECT_DIR}/backend/media/;
        expires 7d;
    }

    # Django Admin
    location /admin/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout    30s;
    }

    # Sitemap.xml
    location = /sitemap.xml {
        proxy_pass         http://127.0.0.1:8000/sitemap.xml;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    # Django REST API
    location /api/ {
        limit_req zone=api burst=30 nodelay;
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout    30s;
    }

    # Next.js frontend
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection upgrade;
        proxy_read_timeout 60s;
    }

    # Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
NGINXCFG

ln -sf /etc/nginx/sites-available/taxi-rating \
       /etc/nginx/sites-enabled/taxi-rating

nginx -t && systemctl reload nginx
ok "Nginx настроен"

# ── Файрвол ───────────────────────────────────
step "UFW файрвол"

ufw --force reset   > /dev/null
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow 22/tcp  > /dev/null
ufw allow 80/tcp  > /dev/null
ufw allow 443/tcp > /dev/null
ufw --force enable > /dev/null

ok "UFW: 22, 80, 443 открыты"

# ── SSL (опционально) ─────────────────────────
IS_IP=false
[[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && IS_IP=true

if [ "$IS_IP" = false ] && [ "$DOMAIN" != "localhost" ]; then
    step "SSL (Let's Encrypt)"
    apt-get install -y -qq certbot python3-certbot-nginx

    if certbot --nginx \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$ADMIN_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --redirect \
        --non-interactive 2>&1; then

        ok "SSL сертификат получен"

        # Обновляем Next.js .env.local на HTTPS
        sed -i "s|http://${DOMAIN}|https://${DOMAIN}|g" \
            "$PROJECT_DIR/frontend/.env.local"

        # Автообновление
        systemctl enable certbot.timer 2>/dev/null || \
        (crontab -l 2>/dev/null; \
         echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") \
        | crontab -

        ok "Автообновление SSL настроено"
    else
        warn "SSL не настроен (проверьте DNS для $DOMAIN)"
    fi
fi

# ── Автозапуск ────────────────────────────────
step "Автозапуск сервисов"

systemctl enable postgresql redis-server nginx supervisor

ok "Все сервисы добавлены в автозапуск"

# ── Проверка ──────────────────────────────────
step "Финальная проверка"
sleep 5

info "Статус сервисов:"
echo ""
for svc in postgresql redis-server nginx supervisor; do
    STATUS=$(systemctl is-active $svc 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "active" ]; then
        ok "$svc: $STATUS"
    else
        warn "$svc: $STATUS"
    fi
done

echo ""
info "Статус приложений:"
supervisorctl status

echo ""
info "HTTP проверка:"
sleep 3
API=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/taxiparks/ 2>/dev/null || echo 000)
WEB=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo 000)
NGX=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null || echo 000)

[ "$API" = "200" ] && ok "Django API:  $API" || warn "Django API:  $API"
[ "$WEB" = "200" ] && ok "Next.js:     $WEB" || warn "Next.js:     $WEB"
[ "$NGX" = "200" ] && ok "Nginx:       $NGX" || warn "Nginx:       $NGX"

# ── Сохраняем данные ─────────────────────────
cat > /root/credentials.txt << CREDS
══════════════════════════════════════════
  TAXI RATING — $(date)
══════════════════════════════════════════
Сайт:   http://${DOMAIN}
API:    http://${DOMAIN}/api/
Admin:  http://${DOMAIN}/admin/

Django admin:
  login:    admin
  password: ${ADMIN_PASS}
  email:    ${ADMIN_EMAIL}

PostgreSQL:
  host:     127.0.0.1
  db:       taxirating
  user:     taxiuser
  password: ${DB_PASS}

Проект:  ${PROJECT_DIR}

Управление:
  supervisorctl status
  supervisorctl restart taxi-backend
  supervisorctl restart taxi-frontend
  tail -f /var/log/taxi-backend.log
  tail -f /var/log/taxi-frontend.log
  tail -f /var/log/nginx/taxi-error.log

Обновление проекта:
  cd ${PROJECT_DIR}
  git pull
  source venv/bin/activate
  cd backend && python manage.py migrate
  cd ../frontend && npm run build
  supervisorctl restart all
══════════════════════════════════════════
CREDS
chmod 600 /root/credentials.txt

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      ✅ УСТАНОВКА ЗАВЕРШЕНА!             ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
printf  "${GREEN}║${NC}  🌐 http://%-30s ${GREEN}║${NC}\n" "$DOMAIN"
printf  "${GREEN}║${NC}  👑 admin / %-30s ${GREEN}║${NC}\n" "$ADMIN_PASS"
printf  "${GREEN}║${NC}  🗄️  taxiuser / %-27s ${GREEN}║${NC}\n" "$DB_PASS"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  💾 /root/credentials.txt               ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""