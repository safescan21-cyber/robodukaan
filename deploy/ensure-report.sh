#!/usr/bin/env bash
# Installs the daily email report (sales + SEO) as a systemd timer: every day at 08:00 India time.
# Runs from auto-update.sh as root; does nothing if it's already installed and unchanged.
# Report settings (code, recipient): sudo bash deploy/set-report.sh
# Turn the report off:  sudo systemctl disable --now robodukaan-report.timer && touch /etc/robodukaan/report-disabled
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
NODE_BIN="$(command -v node || echo /usr/bin/node)"
[ -f /etc/robodukaan/report-disabled ] && exit 0
mkdir -p /etc/robodukaan

SERVICE="[Unit]
Description=PCBDukaan daily report email (sales + SEO)
After=network-online.target robodukaan.service
Wants=network-online.target

[Service]
Type=oneshot
User=robodukaan
WorkingDirectory=$APP_DIR
Environment=APP_DIR=$APP_DIR
EnvironmentFile=-/etc/robodukaan/email.env
EnvironmentFile=-/etc/robodukaan/report.env
StateDirectory=robodukaan
Environment=REPORT_STATE=/var/lib/robodukaan/report-state.json
ExecStart=$NODE_BIN $APP_DIR/deploy/daily-report.mjs
TimeoutStartSec=20min
Nice=10
"
TIMER="[Unit]
Description=Send the PCBDukaan daily report every morning

[Timer]
OnCalendar=*-*-* 08:00:00 Asia/Kolkata
Persistent=true

[Install]
WantedBy=timers.target
"
changed=0
write() { if [ "$(cat "$1" 2>/dev/null)" != "$2" ]; then printf '%s' "$2" > "$1"; changed=1; fi; }
write /etc/systemd/system/robodukaan-report.service "$SERVICE"
write /etc/systemd/system/robodukaan-report.timer "$TIMER"
if [ "$changed" = 1 ]; then
  systemctl daemon-reload
  echo "$(date '+%F %T') [report] daily report timer installed/updated" >> /var/log/robodukaan-update.log
fi
systemctl is-enabled --quiet robodukaan-report.timer 2>/dev/null || systemctl enable --now --quiet robodukaan-report.timer
