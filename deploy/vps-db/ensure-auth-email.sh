#!/usr/bin/env bash
# Self-hosted Supabase: make sure the login service sends PCBDukaan emails with a 6-digit code, not the
# default "Your sign-in link" email. Runs from deploy/auto-update.sh every 5 minutes; does nothing when OK.
#
# The login service downloads the email layouts every time. If it can't, it silently sends its default
# email (subject included). So the layouts are kept inside the server's own file storage (public bucket
# "email-templates") and read over the internal network – no dependency on the website or the internet.
# Result for Admin → Site health: /var/lib/robodukaan-monitor/auth-email.txt
set -uo pipefail
STATE=/etc/robodukaan/selfhost.env
[ -f "$STATE" ] || exit 0
SB_DIR=$(grep '^SB_DIR=' "$STATE" | cut -d= -f2-)
[ -n "$SB_DIR" ] && [ -f "$SB_DIR/.env" ] || exit 0
D="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$D/../.." && pwd)}"
SRC="$APP_DIR/public/email-templates"
GW="http://127.0.0.1:${GW_PORT:-8100}"
TPL_URL="http://storage:5000/object/public/email-templates"
MON=/var/lib/robodukaan-monitor
OUT=$MON/auth-email.txt
mkdir -p "$MON"
cd "$SB_DIR"
KEY=$(grep '^SERVICE_ROLE_KEY=' .env | head -1 | cut -d= -f2- | tr -d '"')
report() { echo "$*" > "$OUT"; chmod 644 "$OUT"; }

# 1. Layout files in the server's storage (uploaded again whenever they change in the website code).
sum=$(cat "$SRC"/*.html 2>/dev/null | md5sum | cut -d' ' -f1)
if [ -n "$KEY" ] && [ -d "$SRC" ] && [ "$sum" != "$(cat "$MON/auth-email.sum" 2>/dev/null)" ]; then
  curl -s -o /dev/null -X POST "$GW/storage/v1/bucket" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H 'Content-Type: application/json' -d '{"id":"email-templates","name":"email-templates","public":true}' || true
  ok=1
  for f in "$SRC"/*.html; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$GW/storage/v1/object/email-templates/$(basename "$f")" \
      -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H 'Content-Type: text/html' -H 'x-upsert: true' --data-binary @"$f")
    [ "$code" = 200 ] || ok=0
  done
  [ "$ok" = 1 ] && echo "$sum" > "$MON/auth-email.sum"
fi

# 2. Login service settings: PCBDukaan subjects + layouts from the internal storage address.
envok() {
  docker inspect supabase-auth --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null > /tmp/pcbdukaan-auth-env
  grep -q '^GOTRUE_MAILER_SUBJECTS_MAGIC_LINK=.*PCBDukaan login code' /tmp/pcbdukaan-auth-env \
    && grep -q "^GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=$TPL_URL/magic-link.html" /tmp/pcbdukaan-auth-env
}
fetchok() { docker exec supabase-auth sh -c "wget -q -T 8 -O- $TPL_URL/magic-link.html" 2>/dev/null | grep -q 'Token'; }

if envok && fetchok; then report "ok – login emails send a 6-digit code"; exit 0; fi

# Repair at most every 30 minutes (recreating the login service takes a few seconds).
STAMP=$MON/auth-email.last
if [ -f "$STAMP" ] && [ $(( $(date +%s) - $(stat -c %Y "$STAMP") )) -lt 1800 ]; then exit 0; fi
touch "$STAMP"
was="settings $(envok && echo ok || echo missing), layout $(fetchok && echo ok || echo 'not reachable')"
TEMPLATES_URL="$TPL_URL" bash "$D/write-override.sh" "$SB_DIR" > /dev/null 2>&1
docker compose up -d --no-deps --force-recreate auth > /tmp/pcbdukaan-auth-recreate.log 2>&1
sleep 10
if envok && fetchok; then
  report "repaired $(TZ=Asia/Kolkata date '+%d %b %H:%M') – was: $was"
else
  report "NOT FIXED – now: settings $(envok && echo ok || echo missing), layout $(fetchok && echo ok || echo 'not reachable'); $(tail -2 /tmp/pcbdukaan-auth-recreate.log | tr '\n' ' ' | cut -c1-250)"
fi
