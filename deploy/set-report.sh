#!/usr/bin/env bash
# One-time setup of the daily report email. Run on the server:
#   sudo bash /opt/robodukaan/deploy/set-report.sh
# Before running it, run supabase/migrations/008_daily_report.sql in Supabase → SQL Editor:
# its last line shows your REPORT CODE. Paste that code here when asked.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
ENV_FILE=/etc/robodukaan/report.env
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
mkdir -p /etc/robodukaan

default_to=$(grep -E '^ADMIN_EMAIL=' /etc/robodukaan/email.env 2>/dev/null | cut -d= -f2- | tr -d "\"'" || true)
echo "== Daily report setup (sales + SEO email every morning at 8:00 AM) =="
code=""
while ! [[ "$code" =~ ^[0-9a-f]{64}$ ]]; do
  read -r -p "Report code from Supabase (64 letters/numbers, paste with right-click): " code
  code=$(echo "$code" | tr -d '[:space:]"' | tr 'A-F' 'a-f')
  [[ "$code" =~ ^[0-9a-f]{64}$ ]] || echo "   That doesn't look right: it should be 64 characters (0-9, a-f). Try again."
done
read -r -p "Send the report to [${default_to:-sonugiri@pcbdukaan.in}]: " to
to="${to:-${default_to:-sonugiri@pcbdukaan.in}}"
to=$(echo "$to" | tr -d "\"'[:space:]")

umask 077
printf 'REPORT_TOKEN=%s\nREPORT_TO=%s\n' "$code" "$to" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
rm -f /etc/robodukaan/report-disabled
APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/ensure-report.sh"

echo; echo "== Sending a test report now (takes 1–3 minutes)…"
if systemctl start robodukaan-report; then
  journalctl -u robodukaan-report -n 6 --no-pager -o cat | grep -vE '^(robodukaan-report.service|Started|Starting|Finished)' || true
  echo; echo "Done. Check $to for the report. From now on it arrives every day at 8:00 AM."
else
  journalctl -u robodukaan-report -n 8 --no-pager -o cat
  echo; echo "The test report failed – see the message above."
fi
