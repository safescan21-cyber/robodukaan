#!/usr/bin/env bash
# One-time setup of the RoboDukaan store on an Ubuntu/Debian server.
# Run as root:   bash deploy/setup-server.sh
# Optional:      DOMAIN=pcbdukaan.com EMAIL=you@example.com bash deploy/setup-server.sh
set -euo pipefail

DOMAIN="${DOMAIN:-pcbdukaan.com}"
EMAIL="${EMAIL:-}"                       # for SSL expiry reminders (optional)
APP_DIR="${APP_DIR:-/opt/robodukaan}"
APP_USER="robodukaan"
PORT="${PORT:-3100}"   # other sites on this server use 3000/3001/5000, so we stay out of their way
REPO="https://github.com/safescan21-cyber/robodukaan.git"
# Public values (the publishable key is meant to be public; security comes from Supabase RLS)
SUPABASE_URL="https://cjslvfsrfjslpnyjrvhr.supabase.co"
SUPABASE_KEY="sb_publishable_GWXaPFN_spZEZ9CbbN6csw_Z1BDjFK2"

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "Please run as root."; exit 1; }
command -v apt-get >/dev/null || { echo "This script needs Ubuntu or Debian."; exit 1; }
export DEBIAN_FRONTEND=noninteractive

step "Installing system packages (nginx, git, certbot)"
apt-get update -y
apt-get install -y ca-certificates curl git sudo nginx certbot python3-certbot-nginx

step "Installing Node.js 22"
# The store runs as its own user, so it needs a system-wide Node in /usr/bin.
# (A Node installed with nvm under /root is not readable by other users; it is left untouched.)
NODE_BIN=/usr/bin/node
if [ ! -x "$NODE_BIN" ] || [ "$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
"$NODE_BIN" -v

step "Adding swap if the server has little memory (needed for the build)"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$mem_mb" -lt 2000 ] && [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "Creating app user and downloading the store"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
as_app() { sudo -u "$APP_USER" -H env PATH=/usr/local/bin:/usr/bin:/bin bash -c "$1"; }
if [ -d "$APP_DIR/.git" ]; then
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  as_app "git -C '$APP_DIR' fetch origin main && git -C '$APP_DIR' reset --hard origin/main"
else
  mkdir -p "$APP_DIR" && chown "$APP_USER:$APP_USER" "$APP_DIR"
  as_app "git clone '$REPO' '$APP_DIR'"
fi
cat > "$APP_DIR/.env.local" <<ENV
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY
ENV
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

step "Installing dependencies and building (takes a few minutes)"
as_app "cd '$APP_DIR' && npm ci --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npm run build"

step "Choosing a free port"
port_in_use() { ss -ltnH "sport = :$1" | grep -q .; }
if systemctl is-active --quiet robodukaan; then
  # Keep the port the store already uses
  PORT=$(grep -oP '(?<=-p )[0-9]+' /etc/systemd/system/robodukaan.service || echo "$PORT")
else
  while port_in_use "$PORT"; do PORT=$((PORT + 1)); done
fi
echo "Store will listen on 127.0.0.1:$PORT"

step "Starting the store as a service"
cat > /etc/systemd/system/robodukaan.service <<UNIT
[Unit]
Description=RoboDukaan store (Next.js)
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=$NODE_BIN $APP_DIR/node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now robodukaan
systemctl restart robodukaan

step "Turning on automatic updates from GitHub (every 5 minutes)"
chmod +x "$APP_DIR/deploy/auto-update.sh"
cat > /etc/systemd/system/robodukaan-update.service <<UNIT
[Unit]
Description=Update RoboDukaan from GitHub if there are new commits

[Service]
Type=oneshot
Environment=APP_DIR=$APP_DIR
ExecStart=/bin/bash $APP_DIR/deploy/auto-update.sh
UNIT
cat > /etc/systemd/system/robodukaan-update.timer <<UNIT
[Unit]
Description=Check GitHub for RoboDukaan updates every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now robodukaan-update.timer

step "Configuring nginx for $DOMAIN"
ipv6_listen=""
[ -s /proc/net/if_inet6 ] && ipv6_listen="listen [::]:80;"
cat > /etc/nginx/sites-available/robodukaan <<NGINX
server {
    listen 80;
    $ipv6_listen
    server_name $DOMAIN www.$DOMAIN;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
# Never touch other sites on this server; only add our own file.
other=$(grep -lsE "server_name[^;]*\b(www\.)?${DOMAIN//./\\.}\b" /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null | grep -v '/robodukaan$' || true)
if [ -n "$other" ]; then
  echo "!! Another nginx config already serves $DOMAIN: $other"
  echo "   Remove $DOMAIN from that file first, then run this script again."
  exit 1
fi
ln -sf /etc/nginx/sites-available/robodukaan /etc/nginx/sites-enabled/robodukaan
if ! nginx -t; then
  echo "!! nginx config test failed. Removing the RoboDukaan site so your other sites keep working."
  rm -f /etc/nginx/sites-enabled/robodukaan
  exit 1
fi
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full' >/dev/null
fi

step "Getting a free SSL certificate (HTTPS)"
server_ips=" $(hostname -I) "
domain_ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}')
if [ -n "$domain_ip" ] && [[ "$server_ips" == *" $domain_ip "* ]]; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect \
    $( [ -n "$EMAIL" ] && echo "-m $EMAIL" || echo "--register-unsafely-without-email" ) \
  || echo "!! Certificate failed. Check that both $DOMAIN and www.$DOMAIN point to this server, then run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  echo "!! $DOMAIN points to '${domain_ip:-nothing}', not this server ($(hostname -I | awk '{print $1}'))."
  echo "   Set an A record for @ and www to this server's IP, wait a few minutes, then run:"
  echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect"
fi

sleep 2
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)
step "Done. Store responds locally with HTTP $code"
echo "Open https://$DOMAIN in your browser."
echo "Automatic updates are on: new code on GitHub goes live within about 5-10 minutes."
echo "Update log: /var/log/robodukaan-update.log"
