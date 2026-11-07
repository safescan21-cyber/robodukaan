#!/usr/bin/env bash
# One-time setup of the free daily database backup (Supabase → this server, every night at 2:30 AM).
#   sudo bash /opt/robodukaan/deploy/set-backup.sh
# You need the database connection string:
#   Supabase → your project → Connect (top of the page) → "Session pooler" → copy the URI,
#   and put your database password in place of [YOUR-PASSWORD]
#   (forgot it? Project Settings → Database → Reset database password).
# The connection string is stored only on this server (/etc/robodukaan/backup.env, readable by root only).
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
ENV_FILE=/etc/robodukaan/backup.env
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
mkdir -p /etc/robodukaan

echo "== Daily database backup setup =="
# pg_dump 17 reads Supabase databases on Postgres 15 and 17.
if ! ls /usr/lib/postgresql/17/bin/pg_dump >/dev/null 2>&1; then
  echo "Installing the PostgreSQL 17 backup tool (pg_dump)…"
  apt-get update -qq
  apt-get install -y -qq postgresql-common >/dev/null
  /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null
  apt-get install -y -qq postgresql-client-17 >/dev/null
fi

url=""
while ! [[ "$url" =~ ^postgres(ql)?://[^[:space:]]+@[^[:space:]]+:[0-9]+/[^[:space:]]+$ ]] || [[ "$url" == *"[YOUR-PASSWORD]"* ]]; do
  read -r -s -p "Paste the Session pooler connection string (with your password; hidden while typing): " url; echo
  url=$(echo "$url" | tr -d '[:space:]"'"'")
  if [[ "$url" == *"[YOUR-PASSWORD]"* ]]; then echo "   Replace [YOUR-PASSWORD] with your database password first."; url=""
  elif ! [[ "$url" =~ ^postgres(ql)?://[^[:space:]]+@[^[:space:]]+:[0-9]+/[^[:space:]]+$ ]]; then echo "   That doesn't look like a postgresql://… connection string. Try again."; fi
done
umask 077
printf 'DB_URL=%s\n' "$url" > "$ENV_FILE"
chmod 600 "$ENV_FILE"

cat > /etc/systemd/system/robodukaan-backup.service <<UNIT
[Unit]
Description=PCBDukaan daily database backup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=$ENV_FILE
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

echo; echo "== Making the first backup now…"
if systemctl start robodukaan-backup; then
  journalctl -u robodukaan-backup -n 3 --no-pager -o cat | grep -E 'Backup saved|failed' || true
  echo; echo "Done. A new backup is made every night at 2:30 AM; the last 14 days are kept in /var/backups/pcbdukaan."
else
  journalctl -u robodukaan-backup -n 8 --no-pager -o cat
  echo; echo "The backup failed – see the message above (usually a wrong password or connection string). Run this script again."
fi

# Restore (only if something went badly wrong – ask for help first):
#   sudo /usr/lib/postgresql/17/bin/pg_restore --list /var/backups/pcbdukaan/<file>.dump   # see what's inside
#   Restoring overwrites live data, so restore into a NEW Supabase project, check it, then switch the site over.
