#!/usr/bin/env bash
# Installs the site monitor (deploy/monitor.py) as a systemd timer: every 5 minutes.
# Runs from auto-update.sh as root; does nothing if already installed and unchanged.
# Turn off:  sudo systemctl disable --now robodukaan-monitor.timer && sudo touch /etc/robodukaan/monitor-disabled
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
[ -f /etc/robodukaan/monitor-disabled ] && exit 0
SERVICE="[Unit]
Description=PCBDukaan site monitor (pages, APIs, database, server)
After=network-online.target

[Service]
Type=oneshot
Environment=APP_DIR=$APP_DIR
ExecStart=/usr/bin/python3 $APP_DIR/deploy/monitor.py
TimeoutStartSec=4min
Nice=10
"
TIMER="[Unit]
Description=Run the PCBDukaan site monitor every 5 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
"
changed=0
write() { if [ "$(cat "$1" 2>/dev/null)" != "$2" ]; then printf '%s' "$2" > "$1"; changed=1; fi; }
write /etc/systemd/system/robodukaan-monitor.service "$SERVICE"
write /etc/systemd/system/robodukaan-monitor.timer "$TIMER"
[ "$changed" = 1 ] && systemctl daemon-reload
systemctl is-enabled --quiet robodukaan-monitor.timer 2>/dev/null || systemctl enable --now --quiet robodukaan-monitor.timer
