#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
APP_NAME="kagaz-backend"
APP_DIR="/home/tikam/dev/kagaz_cloud/backend"
VENV_DIR="$APP_DIR/venv"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-3}"
GUNICORN_BIND="${GUNICORN_BIND:-127.0.0.1:5000}"
USER="$(whoami)"
GROUP="$(id -gn)"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Pre-checks ──────────────────────────────────────────────
command -v python3 >/dev/null 2>&1 || error "python3 not found"
[[ -d "$APP_DIR" ]] || error "App directory $APP_DIR does not exist"

# ─── Virtual environment ─────────────────────────────────────
info "Setting up Python virtual environment..."
if [[ ! -d "$VENV_DIR" ]]; then
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# ─── Install dependencies ────────────────────────────────────
info "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r "$APP_DIR/requirements.txt" -q
pip install gunicorn -q

# ─── Run database migrations ─────────────────────────────────
info "Running database migrations..."
cd "$APP_DIR"
if [[ -f "migrations/alembic.ini" ]]; then
    flask db upgrade || warn "Migration failed or no pending migrations"
fi

# ─── Create systemd service ──────────────────────────────────
info "Creating systemd service: ${APP_NAME}"
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Kagaz Cloud Backend (Gunicorn)
After=network.target

[Service]
User=${USER}
Group=${GROUP}
WorkingDirectory=${APP_DIR}
Environment="PATH=${VENV_DIR}/bin"
ExecStart=${VENV_DIR}/bin/gunicorn \
    --workers ${GUNICORN_WORKERS} \
    --bind ${GUNICORN_BIND} \
    --access-logfile /var/log/${APP_NAME}-access.log \
    --error-logfile /var/log/${APP_NAME}-error.log \
    "run:app"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ─── Create log files ────────────────────────────────────────
sudo touch /var/log/${APP_NAME}-access.log /var/log/${APP_NAME}-error.log
sudo chown "$USER":"$GROUP" /var/log/${APP_NAME}-access.log /var/log/${APP_NAME}-error.log

# ─── Start service ───────────────────────────────────────────
info "Starting ${APP_NAME} service..."
sudo systemctl daemon-reload
sudo systemctl enable "$APP_NAME"
sudo systemctl restart "$APP_NAME"

# ─── Health check ────────────────────────────────────────────
info "Waiting for backend to start..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${GUNICORN_BIND}/api/health" || true)
if [[ "$HTTP_CODE" == "200" ]]; then
    info "Backend is healthy (HTTP 200)"
else
    warn "Health check returned HTTP ${HTTP_CODE}. Check logs: journalctl -u ${APP_NAME} -f"
fi

info "Backend deployment complete!"
echo "  Service: sudo systemctl status ${APP_NAME}"
echo "  Logs:    journalctl -u ${APP_NAME} -f"
echo "  Health:  curl http://${GUNICORN_BIND}/api/health"
