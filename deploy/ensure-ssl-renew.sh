#!/usr/bin/env bash
# Keeps the free Let's Encrypt SSL certificates renewing by themselves – for every site on this server
# (pcbdukaan.com, www, api.pcbdukaan.com and any other site's certificates, e.g. foodpharmamachinery.com).
#  1. makes sure a renewal timer runs twice a day (certbot's own timer, or ours if it is missing)
#  2. after a renewal, nginx reloads so the new certificate is used at once (no downtime)
#  3. once a week a test renewal (--dry-run, changes nothing) proves renewal still works; the result is
#     read by the site monitor, which emails an early warning if it fails
# Runs from deploy/auto-update.sh as root; does nothing when everything is already in place.
set -uo pipefail
command -v certbot >/dev/null || exit 0
[ -d /etc/letsencrypt/live ] || exit 0
LOG=/var/log/robodukaan-update.log
log() { echo "$(date '+%F %T') ssl: $*" >> "$LOG"; }

# 1. renewal timer
if systemctl list-unit-files certbot.timer >/dev/null 2>&1 && systemctl cat certbot.timer >/dev/null 2>&1; then
  systemctl is-enabled --quiet certbot.timer 2>/dev/null || { systemctl enable --now --quiet certbot.timer && log "turned on certbot.timer"; }
  systemctl is-active --quiet certbot.timer || systemctl start certbot.timer
elif systemctl cat snap.certbot.renew.timer >/dev/null 2>&1; then
  systemctl is-active --quiet snap.certbot.renew.timer || systemctl enable --now --quiet snap.certbot.renew.timer
elif [ ! -f /etc/cron.d/certbot ]; then
  SVC="[Unit]
Description=Renew Let's Encrypt SSL certificates (PCBDukaan)
[Service]
Type=oneshot
ExecStart=$(command -v certbot) renew --quiet
"
  TMR="[Unit]
Description=Renew SSL certificates twice a day
[Timer]
OnCalendar=*-*-* 03,15:17:00
RandomizedDelaySec=1h
Persistent=true
[Install]
WantedBy=timers.target
"
  if [ "$(cat /etc/systemd/system/robodukaan-certbot.service 2>/dev/null)" != "$SVC" ] || [ "$(cat /etc/systemd/system/robodukaan-certbot.timer 2>/dev/null)" != "$TMR" ]; then
    printf '%s' "$SVC" > /etc/systemd/system/robodukaan-certbot.service
    printf '%s' "$TMR" > /etc/systemd/system/robodukaan-certbot.timer
    systemctl daemon-reload
    log "installed our own SSL renewal timer (certbot had none)"
  fi
  systemctl is-enabled --quiet robodukaan-certbot.timer || systemctl enable --now --quiet robodukaan-certbot.timer
fi

# 2. reload nginx after every renewal (only if its settings are valid)
HOOK=/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
BODY='#!/bin/sh
# Installed by PCBDukaan deploy/ensure-ssl-renew.sh: use the renewed certificate at once.
nginx -t >/dev/null 2>&1 && systemctl reload nginx
'
if [ "$(cat "$HOOK" 2>/dev/null)" != "$BODY" ]; then
  mkdir -p "$(dirname "$HOOK")" && printf '%s' "$BODY" > "$HOOK" && chmod 755 "$HOOK" && log "added nginx reload after renewal"
fi

# 3. weekly test renewal (Let's Encrypt test server – real certificates are not touched)
OUT=/var/lib/robodukaan-monitor/ssl-renew.txt
mkdir -p /var/lib/robodukaan-monitor
if [ ! -f "$OUT" ] || [ -n "$(find "$OUT" -mtime +6 2>/dev/null)" ]; then
  if res=$(timeout 600 certbot renew --dry-run --no-random-sleep-on-renew 2>&1); then
    echo "ok $(date '+%F %T')" > "$OUT"
  else
    echo "FAILED $(date '+%F %T'): $(echo "$res" | grep -iE 'fail|error|problem' | head -3 | tr '\n' ' ' | cut -c1-400)" > "$OUT"
    log "SSL test renewal failed – see $OUT"
  fi
  chmod 644 "$OUT"
fi
exit 0
