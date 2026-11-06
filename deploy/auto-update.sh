#!/usr/bin/env bash
# Runs every few minutes (systemd timer): if GitHub has new commits, rebuild and
# restart the store. If the new version fails to build, roll back to the last
# working version so the site stays up.
set -uo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
APP_USER="robodukaan"
LOG=/var/log/robodukaan-update.log
exec 9>/run/robodukaan-update.lock
flock -n 9 || exit 0                      # an update is already running

as_app() { sudo -u "$APP_USER" -H env PATH=/usr/local/bin:/usr/bin:/bin bash -c "cd '$APP_DIR' && $1"; }
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

as_app "git fetch -q origin main" || { log "git fetch failed"; exit 1; }
current=$(as_app "git rev-parse HEAD")
latest=$(as_app "git rev-parse origin/main")
[ "$current" = "$latest" ] && exit 0

log "Updating ${current:0:7} -> ${latest:0:7}"
build() { as_app "git reset -q --hard $1 && npm ci --no-audit --no-fund >/dev/null 2>&1 && NEXT_TELEMETRY_DISABLED=1 npm run build >/dev/null 2>&1"; }

if build "$latest"; then
  systemctl restart robodukaan
  log "Updated to ${latest:0:7} and restarted"
else
  log "Build of ${latest:0:7} FAILED - rolling back to ${current:0:7}"
  build "$current" && systemctl restart robodukaan && log "Rolled back to ${current:0:7}"
fi
