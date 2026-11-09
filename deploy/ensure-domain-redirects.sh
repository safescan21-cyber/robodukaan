#!/usr/bin/env bash
# Extra domains that should open the shop: permanent (301) redirect to https://pcbdukaan.com, with SSL.
# Runs from auto-update.sh (root, every 5 minutes). Does nothing until a domain's DNS points to this server,
# then creates the nginx redirect + certificate once. Email (MX records) is not touched.
set -uo pipefail
TARGET="https://pcbdukaan.com"
DOMAINS="${REDIRECT_DOMAINS:-pcbdukaan.in}"
LOG=/var/log/robodukaan-update.log
log() { echo "$(date '+%F %T') [redirect] $*" >> "$LOG"; }
command -v nginx >/dev/null || exit 0
my_ip=$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)
[ -n "$my_ip" ] || exit 0

for d in $DOMAINS; do
  conf=/etc/nginx/sites-available/redirect-$d
  [ -f "/etc/robodukaan/redirect-$d.done" ] && continue
  ip=$(getent ahostsv4 "$d" | awk 'NR==1 {print $1}')
  [ "$ip" = "$my_ip" ] || continue                       # DNS not pointing here (yet)
  www_ip=$(getent ahostsv4 "www.$d" | awk 'NR==1 {print $1}')
  names="$d"; [ "$www_ip" = "$my_ip" ] && names="$d www.$d"
  # Never take over a domain another site on this server already serves.
  if grep -lsE "server_name[^;]*[[:space:]]$d([[:space:];]|$)" /etc/nginx/sites-enabled/* | grep -qv "redirect-$d$"; then
    log "$d is already served by another nginx site – not changing it"; touch "/etc/robodukaan/redirect-$d.done"; continue
  fi
  cat > "$conf" <<NGINX
# $d → $TARGET (created by deploy/ensure-domain-redirects.sh)
server {
    listen 80;
    listen [::]:80;
    server_name $names;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 $TARGET\$request_uri; }
}
NGINX
  ln -sf "$conf" "/etc/nginx/sites-enabled/redirect-$d"
  if ! nginx -t >/dev/null 2>&1; then
    rm -f "/etc/nginx/sites-enabled/redirect-$d"; log "nginx test failed for $d – removed again"; continue
  fi
  systemctl reload nginx
  cert_args=""; for n in $names; do cert_args="$cert_args -d $n"; done
  if certbot --nginx $cert_args --non-interactive --agree-tos --redirect --register-unsafely-without-email >/dev/null 2>&1; then
    log "$names now redirect to $TARGET (with SSL)"
  else
    log "$names redirect to $TARGET on http; SSL certificate failed (will retry on next run)"; continue
  fi
  mkdir -p /etc/robodukaan && touch "/etc/robodukaan/redirect-$d.done"
done
