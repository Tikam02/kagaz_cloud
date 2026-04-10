#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
DOMAIN="${1:-_}"
BACKEND_UPSTREAM="127.0.0.1:5000"
FRONTEND_UPSTREAM="127.0.0.1:3000"
NGINX_CONF="/etc/nginx/sites-available/kagaz-cloud"
NGINX_LINK="/etc/nginx/sites-enabled/kagaz-cloud"
UPLOAD_DIR="/home/tikam/dev/kagaz_cloud/backend/uploads"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Install Nginx if missing ────────────────────────────────
if ! command -v nginx >/dev/null 2>&1; then
    info "Installing Nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y nginx -qq
fi

# ─── Write Nginx config ──────────────────────────────────────
info "Writing Nginx config for domain: ${DOMAIN}"
sudo tee "$NGINX_CONF" > /dev/null <<EOF
upstream backend {
    server ${BACKEND_UPSTREAM};
}

upstream frontend {
    server ${FRONTEND_UPSTREAM};
}

server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50M;

    # ── Frontend (Next.js) ───────────────────────────────────
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # ── Backend API ──────────────────────────────────────────
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # ── Uploaded files ───────────────────────────────────────
    location /uploads/ {
        alias ${UPLOAD_DIR}/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ── Gzip ─────────────────────────────────────────────────
    gzip on;
    gzip_types text/plain application/json application/javascript text/css image/svg+xml;
    gzip_min_length 1000;

    # ── Security headers ─────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

# ─── Enable site ─────────────────────────────────────────────
if [[ -L "$NGINX_LINK" ]]; then
    sudo rm "$NGINX_LINK"
fi
sudo ln -s "$NGINX_CONF" "$NGINX_LINK"

# ─── Remove default site if it exists ────────────────────────
if [[ -L /etc/nginx/sites-enabled/default ]]; then
    info "Removing default Nginx site..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# ─── Test & reload ────────────────────────────────────────────
info "Testing Nginx configuration..."
sudo nginx -t || error "Nginx config test failed"

info "Reloading Nginx..."
sudo systemctl enable nginx
sudo systemctl reload nginx

# ─── Health check ────────────────────────────────────────────
info "Running health checks through Nginx..."
sleep 2

BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/api/health" || true)
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/api/health" || true)

echo ""
info "Backend  /api/health → HTTP ${BACKEND_CODE}"
info "Frontend /            → HTTP ${FRONTEND_CODE}"

if [[ "$BACKEND_CODE" == "200" ]]; then
    info "All services healthy through Nginx"
else
    warn "Some services may not be ready. Ensure backend & frontend are deployed first."
fi

echo ""
info "Nginx setup complete!"
echo "  Config:  ${NGINX_CONF}"
echo "  Status:  sudo systemctl status nginx"
echo "  Logs:    sudo tail -f /var/log/nginx/error.log"
if [[ "$DOMAIN" != "_" ]]; then
    echo "  URL:     http://${DOMAIN}"
    echo ""
    echo "  For HTTPS, run: sudo certbot --nginx -d ${DOMAIN}"
fi
