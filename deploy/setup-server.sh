#!/usr/bin/env bash
# One-time setup of the RoboDukaan store on an Ubuntu/Debian server.
# Run as root:   bash deploy/setup-server.sh
# Optional:      DOMAIN=pcbdukaan.com EMAIL=you@example.com bash deploy/setup-server.sh
set -euo pipefail

DOMAIN="${DOMAIN:-pcbdukaan.com}"
EMAIL="${EMAIL:-}"                       # for SSL expiry reminders (optional)
APP_DIR="${APP_DIR:-/opt/robodukaan}"
APP_USER="robodukaan"
PORT=3000
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
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

step "Adding swap if the server has little memory (needed for the build)"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$mem_mb" -lt 2000 ] && [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "Creating app user and downloading the store"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
as_app() { sudo -u "$APP_USER" -H bash -c "$1"; }
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
ExecStart=$(command -v node) $APP_DIR/node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now robodukaan
systemctl restart robodukaan

step "Configuring nginx for $DOMAIN"
cat > /etc/nginx/sites-available/robodukaan <<NGINX
server {
    listen 80;
    listen [::]:80;
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
ln -sf /etc/nginx/sites-available/robodukaan /etc/nginx/sites-enabled/robodukaan
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

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
echo "To update later:  bash $APP_DIR/deploy/update.sh"
