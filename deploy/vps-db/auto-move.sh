#!/usr/bin/env bash
# Automatic database move: run ONCE, enter the details, then close the terminal.
#   sudo bash /opt/robodukaan/deploy/vps-db/auto-move.sh
# The server then works on its own:
#   1. waits until api.pcbdukaan.com points to this server (checks every 5 minutes, up to 3 days)
#   2. installs Supabase on the VPS (step 1)
#   3. waits for the night (1–5 AM India time, few customers), copies everything (step 2) and switches (step 3)
#   4. checks the website; if something is wrong it switches back to Supabase cloud automatically
#   5. emails you the result
# Progress:  sudo tail -f /var/log/pcbdukaan-move.log      Cancel:  sudo systemctl stop pcbdukaan-move
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$D/../.." && pwd)}"
API_HOST="${API_HOST:-api.pcbdukaan.com}"
SECRETS=/etc/robodukaan/move.env
LOG=/var/log/pcbdukaan-move.log
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }

MOVE_DIR=/var/lib/robodukaan-move   # admin panel "Server move" page reads status.log from here
log() {
  local line; line="$(TZ=Asia/Kolkata date '+%d %b %H:%M') $*"
  echo "$line" | tee -a "$LOG"
  if [ -d "$MOVE_DIR" ]; then echo "$line" >> "$MOVE_DIR/status.log"; chmod 644 "$MOVE_DIR/status.log"; fi
}
mail_admin() {  # mail_admin SUBJECT BODY
  [ -f /etc/robodukaan/email.env ] || return 0
  SUBJ="$1" BODY="$2" python3 - <<'PY' || true
import os, smtplib, ssl
from email.message import EmailMessage
e = {}
for line in open("/etc/robodukaan/email.env"):
    if "=" in line and not line.startswith("#"):
        k, v = line.rstrip("\n").split("=", 1); e[k] = v.strip().strip("'\"")
to = e.get("ADMIN_EMAIL") or e.get("SMTP_USER")
if not (to and e.get("SMTP_HOST") and e.get("SMTP_USER")): raise SystemExit
m = EmailMessage()
m["From"] = f'{e.get("SENDER_NAME", "PCBDukaan")} <{e["SMTP_USER"]}>'; m["To"] = to; m["Subject"] = os.environ["SUBJ"]
m.set_content(os.environ["BODY"])
port = int(e.get("SMTP_PORT", "465"))
if port == 465: s = smtplib.SMTP_SSL(e["SMTP_HOST"], port, context=ssl.create_default_context(), timeout=30)
else: s = smtplib.SMTP(e["SMTP_HOST"], port, timeout=30); s.starttls(context=ssl.create_default_context())
s.login(e["SMTP_USER"], e["SMTP_PASS"]); s.send_message(m); s.quit()
PY
}

start_background() {
  systemctl stop pcbdukaan-move 2>/dev/null || true
  systemd-run --unit=pcbdukaan-move --collect --quiet -p TimeoutStartSec=infinity \
    --setenv=APP_DIR="$APP_DIR" /bin/bash "$D/auto-move.sh" --run
  log "Automatic move started."
}

# ── Called by deploy/auto-update.sh: details entered in the admin panel ("Server move") ─
if [ "${1:-}" = "--pickup" ]; then
  REQ="$MOVE_DIR/request.json"
  [ -f "$REQ" ] || exit 0
  action=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("action",""))' "$REQ" 2>/dev/null || true)
  if [ "$action" = retry ]; then
    now=$(python3 -c 'import json,sys; print("1" if json.load(open(sys.argv[1])).get("now") else "0")' "$REQ" 2>/dev/null || echo 0)
    rm -f "$REQ"
    if [ -f "$SECRETS" ]; then
      if [ "$now" = 1 ]; then
        sed -i 's/^NIGHT=.*/NIGHT=0/' "$SECRETS"
        log "Running now (not waiting for the night), with the saved details."
      else
        log "Trying again with the saved details."
      fi
      start_background
    else
      log "The saved details are gone – please fill in the form again."
    fi
    exit 0
  fi
  if [ "$action" = cancel ]; then
    rm -f "$REQ" "$SECRETS"; systemctl stop pcbdukaan-move 2>/dev/null || true
    log "Cancelled from the admin panel."
    exit 0
  fi
  mkdir -p /etc/robodukaan; umask 077
  python3 - "$REQ" > "$SECRETS" <<'PY' || { rm -f "$REQ"; log "Could not read the details from the admin panel – please send them again."; exit 0; }
import json, shlex, sys
d = json.load(open(sys.argv[1]))
url = d["cloud_url"]
region = d.get("s3_region") or ""
if not region:
    import re
    m = re.search(r"@aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com", url)
    region = m.group(1) if m else "ap-south-1"
for k, v in [("CLOUD_URL", url), ("S3_KEY", d["s3_key"]), ("S3_SECRET", d["s3_secret"]),
             ("S3_REGION", region), ("NIGHT", "1" if d.get("night", True) else "0")]:
    print(f"{k}={shlex.quote(v)}")
PY
  chmod 600 "$SECRETS"; rm -f "$REQ"
  : > "$MOVE_DIR/status.log"
  log "Details received from the admin panel."
  start_background
  exit 0
fi

# ── Part 1 (you): collect the details, then hand over to the server ─────────────────
if [ "${1:-}" != "--run" ]; then
  echo "== Automatic database move – enter the details once"
  CLOUD_URL=""
  if [ -f /etc/robodukaan/backup.env ]; then
    CLOUD_URL=$(grep '^DB_URL=' /etc/robodukaan/backup.env | cut -d= -f2- || true)
    [[ "$CLOUD_URL" == postgres* ]] || CLOUD_URL=""
    [ -n "$CLOUD_URL" ] && echo "Using the connection string from the daily backup setup."
  fi
  while [ -z "$CLOUD_URL" ]; do
    read -r -s -p "Supabase Session pooler connection string (with password; hidden): " CLOUD_URL; echo
    CLOUD_URL=$(echo "$CLOUD_URL" | tr -d '[:space:]"'"'")
    [[ "$CLOUD_URL" == postgres*://*@*:*/* && "$CLOUD_URL" != *"[YOUR-PASSWORD]"* ]] || { echo "   That doesn't look right – try again."; CLOUD_URL=""; }
  done
  S3_KEY=""; while [ -z "$S3_KEY" ]; do read -r -p "Storage S3 Access key ID: " S3_KEY; S3_KEY=$(echo "$S3_KEY" | tr -d '[:space:]'); done
  S3_SECRET=""; while [ -z "$S3_SECRET" ]; do read -r -s -p "Storage S3 Secret access key (hidden): " S3_SECRET; echo; S3_SECRET=$(echo "$S3_SECRET" | tr -d '[:space:]'); done
  S3_REGION=$(echo "$CLOUD_URL" | sed -nE 's#.*@aws-[0-9]+-([a-z0-9-]+)\.pooler\.supabase\.com.*#\1#p')
  [ -n "$S3_REGION" ] || read -r -p "Region shown next to the S3 endpoint (e.g. ap-south-1): " S3_REGION
  read -r -p "Switch at night (1–5 AM) [Y] or as soon as possible [n]? " night
  NIGHT=1; [[ "${night:-Y}" =~ ^[nN] ]] && NIGHT=0
  mkdir -p /etc/robodukaan; umask 077
  printf 'CLOUD_URL=%q\nS3_KEY=%q\nS3_SECRET=%q\nS3_REGION=%q\nNIGHT=%q\n' "$CLOUD_URL" "$S3_KEY" "$S3_SECRET" "$S3_REGION" "$NIGHT" > "$SECRETS"
  chmod 600 "$SECRETS"
  start_background
  echo
  echo "Done – you can close this terminal now. The server does the rest and emails you the result."
  echo "Watch progress:  sudo tail -f $LOG"
  echo "Cancel:          sudo systemctl stop pcbdukaan-move"
  exit 0
fi

# ── Part 2 (server, in the background) ─────────────────────────────────────────────
# shellcheck disable=SC1090
. "$SECRETS"
export CLOUD_URL S3_KEY S3_SECRET S3_REGION APP_DIR
# The most useful error lines since a step started (passwords/keys hidden), for the admin page.
reason_lines() {
  tail -n +"$(( ${1:-0} + 1 ))" "$LOG" 2>/dev/null \
    | grep -E '^(!!|psql:|ERROR|FATAL|error|Error|rclone|curl:)|failed|denied|refused|timeout|timed out|could not|Could not|No such' \
    | grep -v '^[0-9][0-9] [A-Z][a-z][a-z] ' \
    | sed -E 's#(postgres(ql)?://)[^ ]*@#\1***@#g; s#(S3_SECRET|SECRET|PASS(WORD)?)=[^ ]*#\1=***#gI' \
    | tail -4 | cut -c1-220
}
STEP_START=0
fail() {
  log "STOPPED: $*"
  while IFS= read -r l; do [ -n "$l" ] && log "  reason: $l"; done < <(reason_lines "$STEP_START")
  log "  Fix the cause, then press \"Try again\" in Admin → Server move (your details are kept)."
  mail_admin "PCBDukaan database move stopped" "The automatic database move stopped:

$*

The website still works (it uses Supabase cloud unless the email says otherwise).
Last lines of the log:
$(tail -25 "$LOG")"
  exit 1
}

log "Waiting for $API_HOST to point to this server …"
my_ip=$(curl -4 -fsS --max-time 15 https://api.ipify.org || true)
for i in $(seq 1 864); do   # 864 × 5 min = 3 days
  dns_ip=$(getent ahostsv4 "$API_HOST" | awk 'NR==1 {print $1}')
  [ -n "$dns_ip" ] && [ "$dns_ip" = "$my_ip" ] && break
  [ $((i % 12)) -eq 1 ] && log "  not yet (DNS: ${dns_ip:-nothing}, this server: ${my_ip:-?})"
  sleep 300
done
[ "$dns_ip" = "$my_ip" ] || fail "$API_HOST still does not point to this server ($my_ip) after 3 days. Check the DNS record at Hostinger."
log "DNS is ready ($API_HOST → $dns_ip)."

log "Step 1: installing Supabase on the VPS …"
STEP_START=$(wc -l < "$LOG")
bash "$D/1-install.sh" >> "$LOG" 2>&1 || fail "Installing Supabase failed."
log "Step 1 done."

# Check the Supabase cloud connection now, not at 1 AM, so a wrong connection string shows up at once.
SB_DIR=$(grep '^SB_DIR=' /etc/robodukaan/selfhost.env | cut -d= -f2-)
log "Checking the connection to Supabase cloud …"
STEP_START=$(wc -l < "$LOG")
n=$(cd "$SB_DIR" && docker compose exec -T -e CLOUD_URL db sh -c 'psql "$CLOUD_URL" -XAtc "select count(*) from public.products"' 2>>"$LOG") \
  || fail "Could not connect to your Supabase cloud database. Use the Session pooler connection string (Supabase → Connect → Session pooler) with your database password."
log "Connected to Supabase cloud ($n products)."

if [ "${NIGHT:-1}" = 1 ]; then
  log "Waiting for the night (1–5 AM India time) to copy and switch …"
  until h=$(TZ=Asia/Kolkata date +%-H); [ "$h" -ge 1 ] && [ "$h" -lt 5 ]; do sleep 300; done
fi

counts_match() {
  local t c v
  for t in public.products public.orders public.order_items auth.users public.profiles public.reviews; do
    c=$(cd "$SB_DIR" && docker compose exec -T -e CLOUD_URL db sh -c 'psql "$CLOUD_URL" -XAtc "select count(*) from '"$t"'"')
    v=$(cd "$SB_DIR" && docker compose exec -T db psql -U supabase_admin -d postgres -XAtc "select count(*) from $t")
    [ "$c" = "$v" ] || { log "  $t: cloud $c, VPS $v"; return 1; }
  done
}
for attempt in 1 2 3; do
  log "Step 2: copying data and files (attempt $attempt) …"
  STEP_START=$(wc -l < "$LOG")
  bash "$D/2-copy-data.sh" >> "$LOG" 2>&1 || fail "Copying the data failed. The website was NOT switched."
  counts_match && break
  [ "$attempt" = 3 ] && fail "Cloud and VPS counts kept differing (new orders arriving?). The website was NOT switched."
  log "  counts differ (maybe a new order just came in) – copying again in 2 minutes"
  sleep 120
done
log "Step 2 done – counts match."

log "Step 3: switching the website …"
STEP_START=$(wc -l < "$LOG")
bash "$D/3-switch.sh" >> "$LOG" 2>&1 || fail "Switching failed. The website still uses Supabase cloud."
sleep 20
. /etc/robodukaan/selfhost.env
ok=1
for u in https://pcbdukaan.com/ https://pcbdukaan.com/products https://pcbdukaan.com/pcb-repair; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$u" || true)
  [ "$code" = 200 ] || { ok=0; log "  check failed: $u → $code"; }
done
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$SB_URL/rest/v1/products?select=id&limit=1" -H "apikey: $SB_PUBLISHABLE_KEY" || true)
[ "$code" = 200 ] || { ok=0; log "  check failed: database API → $code"; }
if [ "$ok" != 1 ]; then
  log "Website check failed – switching back to Supabase cloud …"
  bash "$D/3-switch.sh" --back >> "$LOG" 2>&1 || true
  fail "After switching, the website check failed, so it was switched BACK to Supabase cloud automatically."
fi

rm -f "$SECRETS"
log "ALL DONE – pcbdukaan.com now uses the database on this VPS."
mail_admin "PCBDukaan now runs on your own server" "Good news: the database move is complete.

pcbdukaan.com now uses the database on your VPS (https://$API_HOST).
- Customers, orders, products, reviews and photos were copied (counts checked).
- Nightly backup at 2:30 AM: /var/backups/pcbdukaan
- Supabase dashboard: https://$API_HOST  (user: admin, password: sudo grep ^DASHBOARD_PASSWORD /opt/supabase/.env)

Please test: log in, open the admin panel, place a small test order.
If anything is wrong:  sudo bash $D/3-switch.sh --back
Keep the Supabase cloud project for a few weeks as a fallback."
