#!/usr/bin/env bash
# Run the database move NOW (don't wait for 1–5 AM), using the details already entered in
# Admin → Server move (or ask for them if there are none), and show the progress here.
#   sudo bash /opt/robodukaan/deploy/vps-db/move-now.sh
# You can close the terminal at any time – the move keeps running on the server and emails you the result.
# The website keeps working on Supabase cloud until the copy is checked; the switch itself takes ~1 minute.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
SECRETS=/etc/robodukaan/move.env
LOG=/var/log/pcbdukaan-move.log
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo:  sudo bash $0"; exit 1; }

if [ ! -f "$SECRETS" ]; then
  echo "No saved details yet – enter them once (answer n to “Switch at night” to run now)."
  exec bash "$D/auto-move.sh"
fi

sed -i 's/^NIGHT=.*/NIGHT=0/' "$SECRETS"
mkdir -p /var/lib/robodukaan-move
TZ=Asia/Kolkata date '+%d %b %H:%M Running now (started from the terminal), with the saved details.' | tee -a "$LOG" >> /var/lib/robodukaan-move/status.log
systemctl stop pcbdukaan-move 2>/dev/null || true
systemd-run --unit=pcbdukaan-move --collect --quiet -p TimeoutStartSec=infinity \
  --setenv=APP_DIR="${APP_DIR:-$(cd "$D/../.." && pwd)}" /bin/bash "$D/auto-move.sh" --run
echo
echo "Started. Progress (Ctrl+C stops watching – the move continues):"
echo
tail -n 0 -f /var/lib/robodukaan-move/status.log &
TAIL=$!
trap 'kill $TAIL 2>/dev/null' EXIT
while systemctl is-active --quiet pcbdukaan-move; do sleep 5; done
sleep 2
echo
tail -n 1 /var/lib/robodukaan-move/status.log | grep -q "ALL DONE" \
  && echo "✓ Finished – pcbdukaan.com now uses the database on this server." \
  || echo "The move stopped – see the lines starting with “reason:” above (also in Admin → Server move)."
