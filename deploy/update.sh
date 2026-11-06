#!/usr/bin/env bash
# Pull the latest code from GitHub, rebuild and restart the store. Run as root.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
APP_USER="robodukaan"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
sudo -u "$APP_USER" -H git -C "$APP_DIR" fetch origin main
sudo -u "$APP_USER" -H git -C "$APP_DIR" reset --hard origin/main
sudo -u "$APP_USER" -H env PATH=/usr/local/bin:/usr/bin:/bin bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npm run build"
systemctl restart robodukaan
echo "Updated and restarted. Check: systemctl status robodukaan"
