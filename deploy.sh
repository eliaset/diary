#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/eliassqr/apps/dev"
PUBLIC_DIR="$APP_DIR/dist"
TMP_DIR="$APP_DIR/tmp"
TAR_PATH="$TMP_DIR/build.tar.gz"

mkdir -p "$TMP_DIR"

if [[ ! -f "$TAR_PATH" ]]; then
  echo "Error: $TAR_PATH not found. Upload build.tar.gz to $TMP_DIR first." >&2
  exit 1
fi

# Backup important files
echo "[1/6] Backing up important files..."
BACKUP_DIR="$TMP_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup .htaccess if it exists
if [ -f "$PUBLIC_DIR/.htaccess" ]; then
  cp "$PUBLIC_DIR/.htaccess" "$BACKUP_DIR/.htaccess"
  echo "  - Backed up .htaccess"
fi

# Backup .env if it exists
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$BACKUP_DIR/.env"
  echo "  - Backed up .env"
fi

echo "[2/6] Extracting bundle to $APP_DIR ..."
# Clean up old files except node_modules and important files
find "$APP_DIR" -mindepth 1 \( -name 'node_modules' -o -name '.env*' -o -name '.htaccess' \) -prune -o -exec rm -rf {} +

# Extract new files
tar -xzf "$TAR_PATH" -C "$APP_DIR" --exclude='node_modules' --exclude='.env*' --exclude='.htaccess'

# Restore backed up files
echo "[3/6] Restoring important files..."
if [ -f "$BACKUP_DIR/.htaccess" ]; then
  cp "$BACKUP_DIR/.htaccess" "$PUBLIC_DIR/.htaccess"
  echo "  - Restored .htaccess"
fi

if [ -f "$BACKUP_DIR/.env" ]; then
  cp "$BACKUP_DIR/.env" "$APP_DIR/.env"
  echo "  - Restored .env"
fi

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
