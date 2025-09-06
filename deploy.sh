#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/eliassqr/apps/dev"
TMP_DIR="$APP_DIR/tmp"
TAR_PATH="$TMP_DIR/build.tar.gz"

mkdir -p "$TMP_DIR"

if [[ ! -f "$TAR_PATH" ]]; then
  echo "Error: $TAR_PATH not found. Upload build.tar.gz to $TMP_DIR first." >&2
  exit 1
fi

echo "[1/5] Extracting bundle to $APP_DIR ..."
# Extract overwriting existing files
# Exclude node_modules to ensure clean install
rm -rf "$APP_DIR/node_modules"
tar -xzf "$TAR_PATH" -C "$APP_DIR"

# Optionally write .env from current environment if DB_* provided
if [[ -n "${DB_HOST:-}" ]] && [[ -n "${DB_USER:-}" ]] && [[ -n "${DB_NAME:-}" ]]; then
  echo "[env] Writing .env with DB_* and PORT variables"
  cat > "$APP_DIR/.env" << EOF
PORT=${PORT:-3000}
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS:-}
DB_NAME=${DB_NAME}
EOF
fi

cd "$APP_DIR"

echo "[2/5] Installing production dependencies ..."
# Avoid running postinstall scripts to skip client build on server
npm set ignore-scripts true >/dev/null 2>&1 || true
npm install --production
npm set ignore-scripts false >/dev/null 2>&1 || true

echo "[3/5] Adjusting file permissions ..."
chmod -R g+rwX "$APP_DIR"

# Restart via PM2 if available, else Passenger/Nodjs app restart
APP_NAME="dev-app"

echo "[4/5] Restarting app ..."
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME"
  else
    pm2 start server.js --name "$APP_NAME" --update-env
  fi
  pm2 save || true
else
  # cPanel Node.js app (Passenger) restart trigger
  mkdir -p "$APP_DIR/tmp"
  touch "$APP_DIR/tmp/restart.txt"
fi

echo "[5/5] Cleaning up ..."
rm -f "$TAR_PATH"

echo "Deployment completed."
