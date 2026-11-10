#!/usr/bin/env bash
# STEP 1 of moving the database from Supabase cloud to this VPS: install self-hosted Supabase.
#   sudo bash /opt/robodukaan/deploy/vps-db/1-install.sh
# Before running: add a DNS "A" record  api  →  this server's IP  (Hostinger → Domains → pcbdukaan.com → DNS).
# Safe to run again. Does not touch the live website or your other sites: Supabase only listens on
# 127.0.0.1, and nginx gets one new site for api.pcbdukaan.com.
set -euo pipefail
API_HOST="${API_HOST:-api.pcbdukaan.com}"
SITE_URL="${SITE_URL:-https://pcbdukaan.com}"
SB_DIR="${SB_DIR:-/opt/supabase}"
STATE=/etc/robodukaan/selfhost.env
GW_PORT=8100        # Supabase API on 127.0.0.1:8100 (nginx → https://api.pcbdukaan.com)
PG_PORT=54322       # Postgres (session pooler) on 127.0.0.1 only
PG_TX_PORT=54329    # Postgres (transaction pooler) on 127.0.0.1 only
SKIP_NGINX="${SKIP_NGINX:-0}"   # for testing only
# PCBDukaan-branded login-code / password emails (files in the website's public/email-templates/)
TEMPLATES_URL="${TEMPLATES_URL:-$SITE_URL/email-templates}"

[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
say() { printf '\n== %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*"; exit 1; }
mkdir -p /etc/robodukaan

say "Checking the server"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
swap_mb=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
disk_gb=$(df -BG --output=avail / | tail -1 | tr -dc 0-9)
echo "RAM ${mem_mb} MB, swap ${swap_mb} MB, free disk ${disk_gb} GB"
[ "$mem_mb" -ge 3500 ] || die "Supabase needs at least 4 GB RAM; this server has ${mem_mb} MB. Stopping – nothing was changed."
[ "$disk_gb" -ge 10 ] || die "Need at least 10 GB free disk; only ${disk_gb} GB free. Stopping – nothing was changed."
for p in $GW_PORT $PG_PORT $PG_TX_PORT; do
  if ss -ltnH "sport = :$p" | grep -q . && ! docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "127.0.0.1:$p->"; then
    die "Port $p is already used by another program. Stopping – nothing was changed."
  fi
done

if [ "$SKIP_NGINX" != 1 ]; then
  my_ip=$(curl -4 -fsS --max-time 10 https://api.ipify.org || true)
  dns_ip=$(getent ahostsv4 "$API_HOST" | awk 'NR==1 {print $1}')
  if [ -z "$dns_ip" ] || [ "$dns_ip" != "$my_ip" ]; then
    die "$API_HOST must point to this server first.
   Hostinger → Domains → pcbdukaan.com → DNS / Nameservers → Add record:
     Type A,  Name: api,  Points to: ${my_ip:-this server IP},  TTL: default
   (If you use Cloudflare, add it there instead, with the orange cloud OFF for now.)
   Wait 5–10 minutes, then run this script again. Now it points to: ${dns_ip:-nothing}"
  fi
  echo "DNS OK: $API_HOST → $dns_ip"
fi

if [ ! -f "$SB_DIR/.env" ]; then
  say "Downloading Supabase and installing Docker if needed (5–15 minutes)"
  parent=$(dirname "$SB_DIR")
  mkdir -p "$parent"
  curl -fsSL https://raw.githubusercontent.com/supabase/supabase/master/docker/setup.sh -o /tmp/supabase-setup.sh
  (cd "$parent" && sh /tmp/supabase-setup.sh -y --project-dir "$(basename "$SB_DIR")")
  rm -f /tmp/supabase-setup.sh
fi
cd "$SB_DIR"
chmod 600 .env
command -v docker >/dev/null || die "Docker did not install. Please send me the messages above."

say "Configuring Supabase for PCBDukaan"
setenv() {  # setenv KEY VALUE – replace or add a line in .env
  local k="$1" v="$2"
  if grep -q "^$k=" .env; then
    K="$k" V="$v" python3 - <<'PY'
import os, re
p = ".env"; k = os.environ["K"]; v = os.environ["V"]
s = open(p).read()
s = re.sub(rf"^{re.escape(k)}=.*$", lambda m: f"{k}={v}", s, count=1, flags=re.M)
open(p, "w").write(s)
PY
  else
    printf '%s=%s\n' "$k" "$v" >> .env
  fi
}
getenv() { grep "^$1=" .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

setenv SUPABASE_PUBLIC_URL "https://$API_HOST"
setenv API_EXTERNAL_URL "https://$API_HOST/auth/v1"
setenv SITE_URL "$SITE_URL"
setenv ADDITIONAL_REDIRECT_URLS "$SITE_URL/**,https://www.${SITE_URL#https://}/**"
setenv PROXY_DOMAIN "$API_HOST"
setenv ENABLE_PHONE_SIGNUP false
setenv ENABLE_ANONYMOUS_USERS false
setenv DASHBOARD_USERNAME admin
if [ "$(getenv DASHBOARD_PASSWORD)" = "this_password_is_insecure_and_should_be_updated" ] || [ -z "$(getenv DASHBOARD_PASSWORD)" ]; then
  setenv DASHBOARD_PASSWORD "$(openssl rand -hex 12)"
fi
# Login / password-reset emails go out through your own mailbox (same as the shop's emails).
if [ -f /etc/robodukaan/email.env ]; then
  # shellcheck disable=SC1091
  ( set -a; . /etc/robodukaan/email.env; set +a
    [ -n "${SMTP_HOST:-}" ] && printf 'SMTP_HOST=%s\nSMTP_PORT=%s\nSMTP_USER=%s\nSMTP_PASS=%s\nSMTP_SENDER_NAME=%s\n' \
      "$SMTP_HOST" "${SMTP_PORT:-465}" "$SMTP_USER" "$SMTP_PASS" "${SENDER_NAME:-PCBDukaan}" ) > /tmp/sb-smtp.$$ || true
  if [ -s /tmp/sb-smtp.$$ ]; then
    while IFS='=' read -r k v; do setenv "$k" "$v"; done < /tmp/sb-smtp.$$
    setenv SMTP_ADMIN_EMAIL "$(getenv SMTP_USER)"
    echo "Login emails will be sent from $(getenv SMTP_USER)."
  fi
  rm -f /tmp/sb-smtp.$$
else
  echo "Note: /etc/robodukaan/email.env not found – set up email first (deploy/set-email.sh) so login emails work."
fi

# Only listen on 127.0.0.1 – the database is never reachable from the internet; PCBDukaan login emails.
GW_PORT=$GW_PORT PG_PORT=$PG_PORT PG_TX_PORT=$PG_TX_PORT \
  bash "$(cd "$(dirname "$0")" && pwd)/write-override.sh" "$SB_DIR"

bad=$(docker compose config --format json | python3 -c '
import json, sys
c = json.load(sys.stdin)
bad = [n + ":" + str(p.get("published")) for n, s in c["services"].items() for p in s.get("ports", []) if p.get("host_ip") != "127.0.0.1"]
print(" ".join(bad))')
[ -z "$bad" ] || die "Some ports would be open to the internet ($bad). Stopping before starting anything."
echo "All Supabase ports are private (127.0.0.1 only)."

say "Starting Supabase (first start takes a few minutes)"
docker compose up -d --quiet-pull
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$GW_PORT/auth/v1/health" -H "apikey: $(getenv ANON_KEY)" || true)
  [ "$code" = 200 ] && break
  sleep 5
done
[ "${code:-}" = 200 ] || die "Supabase did not start. Run: cd $SB_DIR && docker compose ps   and send me the output."
echo "Supabase is running."
# PCBDukaan login email layouts into the server's storage (the login service reads them from there).
[ -f "$STATE" ] || printf 'SB_DIR=%s\n' "$SB_DIR" > "$STATE"
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)" GW_PORT=$GW_PORT bash "$(cd "$(dirname "$0")" && pwd)/ensure-auth-email.sh" || true

if [ "$SKIP_NGINX" != 1 ]; then
  say "Publishing https://$API_HOST through nginx"
  cat > /etc/nginx/sites-available/supabase-api <<NGINX
# Self-hosted Supabase API for PCBDukaan (created by deploy/vps-db/1-install.sh)
server {
    listen 80;
    listen [::]:80;
    server_name $API_HOST;
    client_max_body_size 60m;
    location / {
        proxy_pass http://127.0.0.1:$GW_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/supabase-api
  if ! nginx -t 2>/dev/null; then
    rm -f /etc/nginx/sites-enabled/supabase-api
    nginx -t || true
    die "nginx config test failed – removed the new site again so your websites keep working."
  fi
  systemctl reload nginx
  # The site file above is plain http, so always (re)attach the certificate: a new one on the first run,
  # the existing one on later runs (--reinstall) – otherwise https would fall back to another site's certificate.
  certbot --nginx -d "$API_HOST" --non-interactive --agree-tos --redirect --reinstall --register-unsafely-without-email \
    || die "SSL certificate failed. Check the DNS record for $API_HOST, then run this script again."
  code=000
  for i in 1 2 3 4 5 6; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$API_HOST/auth/v1/health" -H "apikey: $(getenv ANON_KEY)" || true)
    [ "$code" = 200 ] && break
    sleep 10
  done
  [ "$code" = 200 ] || { curl -sv -o /dev/null --max-time 15 "https://$API_HOST/auth/v1/health" 2>&1 | grep -iE "subject:|SSL|error" | head -5 || true
    die "https://$API_HOST is not answering yet (code $code). Send me this message."; }
  echo "https://$API_HOST works."
fi

umask 077
cat > "$STATE" <<STATE
SB_DIR=$SB_DIR
SB_URL=https://$API_HOST
SB_PUBLISHABLE_KEY=$(getenv SUPABASE_PUBLISHABLE_KEY)
SB_ANON_KEY=$(getenv ANON_KEY)
STATE
chmod 600 "$STATE"

say "Step 1 done"
echo "Supabase dashboard (Studio):  https://$API_HOST"
echo "   user: admin    password: $(getenv DASHBOARD_PASSWORD)"
echo "   (write this password down; it is also in $SB_DIR/.env)"
echo "The live website still uses Supabase cloud. Next step:"
echo "   sudo bash /opt/robodukaan/deploy/vps-db/2-copy-data.sh"
