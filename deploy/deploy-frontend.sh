#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
APP_NAME="kagaz-frontend"
APP_DIR="/home/tikam/dev/kagaz_cloud/frontend"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NODE_PORT="${NODE_PORT:-3000}"
USER="$(whoami)"
GROUP="$(id -gn)"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Pre-checks ──────────────────────────────────────────────
command -v node >/dev/null 2>&1 || error "node not found"
command -v npm  >/dev/null 2>&1 || error "npm not found"
[[ -d "$APP_DIR" ]] || error "App directory $APP_DIR does not exist"

NODE_BIN=$(which node)
NPM_BIN=$(which npm)

# ─── Install dependencies ────────────────────────────────────
info "Installing Node.js dependencies..."
cd "$APP_DIR"
npm ci --production=false

# ─── Build ────────────────────────────────────────────────────
info "Building Next.js production bundle..."
npm run build

# ─── Create systemd service ──────────────────────────────────
info "Creating systemd service: ${APP_NAME}"
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Kagaz Cloud Frontend (Next.js)
After=network.target

[Service]
User=${USER}
Group=${GROUP}
WorkingDirectory=${APP_DIR}
Environment="NODE_ENV=production"
Environment="PORT=${NODE_PORT}"
Environment="NEXT_PUBLIC_API_URL=http://127.0.0.1:5000/api"
ExecStart=${NODE_BIN} ${APP_DIR}/node_modules/.bin/next start -p ${NODE_PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ─── Start service ───────────────────────────────────────────
info "Starting ${APP_NAME} service..."
sudo systemctl daemon-reload
sudo systemctl enable "$APP_NAME"
sudo systemctl restart "$APP_NAME"

# ─── Health check ────────────────────────────────────────────
info "Waiting for frontend to start..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${NODE_PORT}/api/health" || true)
if [[ "$HTTP_CODE" == "200" ]]; then
    info "Frontend is healthy (HTTP 200)"
else
    warn "Health check returned HTTP ${HTTP_CODE}. Check logs: journalctl -u ${APP_NAME} -f"
fi

info "Frontend deployment complete!"
echo "  Service: sudo systemctl status ${APP_NAME}"
echo "  Logs:    journalctl -u ${APP_NAME} -f"
echo "  Health:  curl http://127.0.0.1:${NODE_PORT}/api/health"
