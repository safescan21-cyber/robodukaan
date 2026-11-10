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

# One-time extras (the AI chat model) run as their own background job so a long
# download never holds up website updates.
start_chat_setup() {
  [ -f "$APP_DIR/deploy/ensure-chat.sh" ] || return 0
  [ -f /etc/robodukaan/chat-ready ] && systemctl is-active --quiet ollama && return 0
  systemctl is-active --quiet robodukaan-chat-setup && return 0
  systemd-run --unit=robodukaan-chat-setup --collect --quiet /bin/bash "$APP_DIR/deploy/ensure-chat.sh" \
    || log "Could not start AI chat setup"
}

# The daily report timer (sales + SEO email at 8 AM); quick and does nothing if already installed.
ensure_report() {
  [ -f "$APP_DIR/deploy/ensure-report.sh" ] || return 0
  APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/ensure-report.sh" || log "Could not install the daily report timer"
}

# Admin panel → "Server move": a folder the website can write the move details into; this root job
# picks them up and starts deploy/vps-db/auto-move.sh (the details file is deleted right away).
db_move_pickup() {
  install -d -m 700 -o "$APP_USER" -g "$APP_USER" /var/lib/robodukaan-move
  [ -f /var/lib/robodukaan-move/request.json ] && [ -f "$APP_DIR/deploy/vps-db/auto-move.sh" ] || return 0
  APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/vps-db/auto-move.sh" --pickup >/dev/null 2>&1 || log "Server move pickup failed"
}
db_move_pickup

# Admin panel settings saved by the website (e.g. Admin → WhatsApp): a private folder only the app can read.
install -d -m 700 -o "$APP_USER" -g "$APP_USER" /var/lib/robodukaan-settings

# Site monitor: checks pages, APIs, database and server every 5 minutes, emails the admin on problems.
[ -f "$APP_DIR/deploy/ensure-monitor.sh" ] && APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/ensure-monitor.sh" || true

# Self-hosted login service: keep sending PCBDukaan code emails (repairs its settings if they're missing).
[ -f "$APP_DIR/deploy/vps-db/ensure-auth-email.sh" ] && bash "$APP_DIR/deploy/vps-db/ensure-auth-email.sh" || true

# New database updates for the database on this server (after the move from Supabase cloud).
[ -f "$APP_DIR/deploy/ensure-db-migrations.sh" ] && APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/ensure-db-migrations.sh" || true

# Speed settings in nginx for thousands of visitors (cache for pages, images and build files); tested and
# undone automatically if anything fails; does nothing once applied.
[ -f "$APP_DIR/deploy/ensure-performance.sh" ] && bash "$APP_DIR/deploy/ensure-performance.sh" || true

# Extra domains (e.g. pcbdukaan.in) → 301 redirect to pcbdukaan.com once their DNS points here.
[ -f "$APP_DIR/deploy/ensure-domain-redirects.sh" ] && bash "$APP_DIR/deploy/ensure-domain-redirects.sh" || true

as_app "git fetch -q origin main" || { log "git fetch failed"; exit 1; }
current=$(as_app "git rev-parse HEAD")
latest=$(as_app "git rev-parse origin/main")
[ "$current" = "$latest" ] && { start_chat_setup; ensure_report; exit 0; }

log "Updating ${current:0:7} -> ${latest:0:7}"
build() { as_app "git reset -q --hard $1 && npm ci --no-audit --no-fund >/dev/null 2>&1 && NEXT_TELEMETRY_DISABLED=1 npm run build >/dev/null 2>&1"; }

if build "$latest"; then
  # Database updates that come with this version, before the new website starts.
  [ -f "$APP_DIR/deploy/ensure-db-migrations.sh" ] && APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/ensure-db-migrations.sh" || true
  systemctl restart robodukaan
  log "Updated to ${latest:0:7} and restarted"
else
  log "Build of ${latest:0:7} FAILED - rolling back to ${current:0:7}"
  build "$current" && systemctl restart robodukaan && log "Rolled back to ${current:0:7}"
fi
start_chat_setup
ensure_report
