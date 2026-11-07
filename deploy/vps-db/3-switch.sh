#!/usr/bin/env bash
# STEP 3: switch the website from Supabase cloud to the Supabase on this VPS.
#   sudo bash /opt/robodukaan/deploy/vps-db/3-switch.sh          # switch to the VPS
#   sudo bash /opt/robodukaan/deploy/vps-db/3-switch.sh --back   # undo: go back to the cloud
# Run step 2 again just before this, so the VPS has the newest orders.
# The site rebuilds (3–6 minutes) and keeps running on the old setting until the new build is ready.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
APP_USER=robodukaan
STATE=/etc/robodukaan/selfhost.env
ENV_LOCAL="$APP_DIR/.env.local"
CLOUD_COPY=/etc/robodukaan/env.local.cloud
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
[ -f "$STATE" ] || { echo "Run steps 1 and 2 first."; exit 1; }
# shellcheck disable=SC1090
. "$STATE"
die() { printf '\n!! %s\n' "$*"; exit 1; }

set_env_local() {  # set_env_local URL KEY
  umask 077
  { grep -vE '^NEXT_PUBLIC_SUPABASE_(URL|PUBLISHABLE_KEY|ANON_KEY)=' "$ENV_LOCAL" 2>/dev/null || true
    printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$1" "$2"; } > "$ENV_LOCAL.new"
  mv "$ENV_LOCAL.new" "$ENV_LOCAL"
  chown "$APP_USER:$APP_USER" "$ENV_LOCAL"
  chmod 640 "$ENV_LOCAL"
}
rebuild() {
  echo "Rebuilding the website (3–6 minutes)…"
  sudo -u "$APP_USER" -H env PATH=/usr/local/bin:/usr/bin:/bin bash -c "cd '$APP_DIR' && NEXT_TELEMETRY_DISABLED=1 npm run build" > /tmp/robodukaan-build.log 2>&1 \
    || { tail -20 /tmp/robodukaan-build.log; return 1; }
  systemctl restart robodukaan
}

if [ "${1:-}" = "--back" ]; then
  [ -f "$CLOUD_COPY" ] || die "No saved cloud setting found ($CLOUD_COPY)."
  cp "$CLOUD_COPY" "$ENV_LOCAL"; chown "$APP_USER:$APP_USER" "$ENV_LOCAL"
  rebuild || die "Build failed – see above."
  if [ -f /etc/robodukaan/backup.env.cloud ]; then cp /etc/robodukaan/backup.env.cloud /etc/robodukaan/backup.env
  else systemctl disable --now --quiet robodukaan-backup.timer 2>/dev/null || true; fi
  echo "Done: the website uses Supabase cloud again."
  exit 0
fi

# Checks before switching
code=$(curl -s -o /dev/null -w '%{http_code}' "$SB_URL/rest/v1/products?select=id&limit=1" -H "apikey: $SB_PUBLISHABLE_KEY" || true)
[ "$code" = 200 ] || die "$SB_URL is not answering (code $code). Nothing was changed."
n=$(curl -s "$SB_URL/rest/v1/products?select=id" -H "apikey: $SB_PUBLISHABLE_KEY" -H 'Range: 0-0' -H 'Prefer: count=exact' -D - -o /dev/null | tr -d '\r' | sed -nE 's#^content-range: .*/([0-9]+)#\1#Ip')
[ "${n:-0}" -gt 0 ] || die "The VPS database has no products – run step 2 first. Nothing was changed."
echo "VPS database answers with $n products."

grep -q "^NEXT_PUBLIC_SUPABASE_URL=$SB_URL\$" "$ENV_LOCAL" 2>/dev/null && { echo "The website already uses the VPS database."; exit 0; }
cp "$ENV_LOCAL" "$CLOUD_COPY"; chmod 600 "$CLOUD_COPY"
set_env_local "$SB_URL" "$SB_PUBLISHABLE_KEY"
if ! rebuild; then
  cp "$CLOUD_COPY" "$ENV_LOCAL"; chown "$APP_USER:$APP_USER" "$ENV_LOCAL"
  die "Build failed – the setting was put back to the cloud (the old build is still running)."
fi

# Nightly backup (2:30 AM) of the VPS database and files – needs no password.
[ -f /etc/robodukaan/backup.env ] && ! grep -q '^DB_URL=selfhost' /etc/robodukaan/backup.env && cp /etc/robodukaan/backup.env /etc/robodukaan/backup.env.cloud
printf 'DB_URL=selfhost\nSB_DIR=%s\n' "$SB_DIR" > /etc/robodukaan/backup.env; chmod 600 /etc/robodukaan/backup.env
cat > /etc/systemd/system/robodukaan-backup.service <<UNIT
[Unit]
Description=PCBDukaan daily database backup
After=network-online.target docker.service

[Service]
Type=oneshot
EnvironmentFile=/etc/robodukaan/backup.env
ExecStart=/bin/bash $APP_DIR/deploy/db-backup.sh
TimeoutStartSec=30min
Nice=10
IOSchedulingClass=idle
UNIT
cat > /etc/systemd/system/robodukaan-backup.timer <<UNIT
[Unit]
Description=Back up the PCBDukaan database every night

[Timer]
OnCalendar=*-*-* 02:30:00 Asia/Kolkata
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now --quiet robodukaan-backup.timer
echo "Nightly backup (2:30 AM) now copies the VPS database and files to /var/backups/pcbdukaan."

sleep 5
code=$(curl -s -o /dev/null -w '%{http_code}' https://pcbdukaan.com/products || true)
echo
echo "Done: pcbdukaan.com now uses the database on this VPS (home page check: $code)."
echo "Please test: log in, open a product, place a test order, open the admin panel."
echo "Customers stay registered with the same password; they only need to log in again once."
echo "If anything is wrong:   sudo bash $APP_DIR/deploy/vps-db/3-switch.sh --back"
