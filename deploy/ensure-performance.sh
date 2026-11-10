#!/usr/bin/env bash
# Speed settings for pcbdukaan.com in nginx, for thousands of visitors at once. Run by deploy/auto-update.sh
# (every 5 minutes; does nothing once applied). Safe: every change is tested with "nginx -t" and undone
# automatically if the test or the site check fails. Other websites on this server are not changed.
#   - unchanging files (/_next/static, images, icons) are kept in a fast nginx cache
#   - public pages are cached as the website allows (Cache-Control s-maxage, about 1 minute) and served
#     "stale while updating", so 2000 visitors cost about one page build per minute
#   - connections to the website process are reused (keepalive); more connections allowed in total
set -uo pipefail
VERSION=4
MARK=/etc/robodukaan/performance.version
SITE=/etc/nginx/sites-available/robodukaan
[ "$(id -u)" -eq 0 ] || { echo "Please run as root."; exit 1; }
[ -f "$SITE" ] || exit 0
[ "$(cat "$MARK" 2>/dev/null)" = "$VERSION" ] && grep -q 'snippets/pcbdukaan-locations.conf' "$SITE" && exit 0
log() { echo "$(date '+%F %T') performance: $*" | tee -a /var/log/robodukaan-update.log; }

PORT=$(grep -oE 'proxy_pass http://127\.0\.0\.1:[0-9]+' "$SITE" | head -1 | grep -oE '[0-9]+$')
[ -z "$PORT" ] && PORT=$(grep -oE 'server 127\.0\.0\.1:[0-9]+' /etc/nginx/conf.d/pcbdukaan-cache.conf 2>/dev/null | grep -oE '[0-9]+$' | head -1)
[ -n "$PORT" ] || { log "could not find the website port in $SITE – nothing changed"; exit 0; }

BK=/etc/robodukaan/nginx-backup-$(date +%s)
mkdir -p "$BK" /etc/robodukaan
cp -a "$SITE" "$BK/site"; cp -a /etc/nginx/nginx.conf "$BK/nginx.conf"
[ -f /etc/nginx/conf.d/pcbdukaan-cache.conf ] && cp -a /etc/nginx/conf.d/pcbdukaan-cache.conf "$BK/"
[ -f /etc/nginx/snippets/pcbdukaan-locations.conf ] && cp -a /etc/nginx/snippets/pcbdukaan-locations.conf "$BK/"
restore() {
  log "undoing: $*"
  cp -a "$BK/site" "$SITE"; cp -a "$BK/nginx.conf" /etc/nginx/nginx.conf
  rm -f /etc/nginx/conf.d/pcbdukaan-cache.conf /etc/nginx/snippets/pcbdukaan-locations.conf
  [ -f "$BK/pcbdukaan-cache.conf" ] && cp -a "$BK/pcbdukaan-cache.conf" /etc/nginx/conf.d/
  [ -f "$BK/pcbdukaan-locations.conf" ] && cp -a "$BK/pcbdukaan-locations.conf" /etc/nginx/snippets/
  nginx -t >/dev/null 2>&1 && systemctl reload nginx
  exit 0
}

mkdir -p /var/cache/nginx/pcbdukaan /etc/nginx/snippets
chown -R www-data:www-data /var/cache/nginx/pcbdukaan 2>/dev/null || true

# 1. Shared parts (only used by pcbdukaan.com's server blocks).
cat > /etc/nginx/conf.d/pcbdukaan-cache.conf <<NGINX
# PCBDukaan speed settings (deploy/ensure-performance.sh)
proxy_cache_path /var/cache/nginx/pcbdukaan levels=1:2 keys_zone=pcbdukaan:32m max_size=2g inactive=30d use_temp_path=off;
upstream pcbdukaan_app {
    server 127.0.0.1:$PORT;
    keepalive 64;
}
map \$http_upgrade \$pcbdukaan_connection {
    default upgrade;
    ""      "";
}
# Search engines and link previews get the page details in a different place, so they get their own copy.
map \$http_user_agent \$pcbdukaan_bot {
    default 0;
    ~*(bot|crawl|spider|slurp|facebookexternalhit|facebot|twitter|whatsapp|telegram|slack|linkedin|discord|pinterest|embedly|preview|lighthouse) 1;
}
NGINX

# 2. The pcbdukaan.com locations.
cat > /etc/nginx/snippets/pcbdukaan-locations.conf <<'NGINX'
# PCBDukaan speed settings (deploy/ensure-performance.sh) – included in the pcbdukaan.com server block.
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml application/javascript application/json application/xml application/rss+xml image/svg+xml application/manifest+json;

# Build files: names change with every update, so they can be kept for a long time.
location /_next/static/ {
    proxy_pass http://pcbdukaan_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_cache pcbdukaan;
    proxy_cache_valid 200 30d;
    proxy_cache_lock on;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache $upstream_cache_status always;
    access_log off;
}
# Resized product photos.
location /_next/image {
    proxy_pass http://pcbdukaan_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_cache pcbdukaan;
    proxy_cache_valid 200 7d;
    proxy_cache_lock on;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache $upstream_cache_status always;
}
# Icons, logos and other public files.
location ~* ^/(favicon\.(ico|svg)|icon-[0-9]+\.png|apple-touch-icon\.png|logo[a-z0-9-]*\.(svg|png)|og\.png|manifest\.webmanifest)$ {
    proxy_pass http://pcbdukaan_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_cache pcbdukaan;
    proxy_cache_valid 200 1d;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache $upstream_cache_status always;
    access_log off;
}
# APIs: never cached (logins, orders, payments, chat streaming).
location /api/ {
    proxy_pass http://pcbdukaan_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $pcbdukaan_connection;
    proxy_read_timeout 120s;
}
# Shop, category and product pages: the website builds them fresh for every visitor, but their content
# depends only on the address (no login on the server side), so nginx keeps each one for 15 seconds.
location ~ ^/(?:(?:hi|ur|fr|ko|ja|zh)/)?(?:products|category)(?:/|$) {
    proxy_pass http://pcbdukaan_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_cache pcbdukaan;
    proxy_cache_methods GET HEAD;
    proxy_cache_key "$scheme$host$request_uri|$pcbdukaan_bot|$http_rsc|$http_next_router_prefetch|$http_next_router_segment_prefetch|$http_next_url";
    proxy_ignore_headers Cache-Control Expires;
    proxy_cache_valid 200 15s;
    proxy_cache_bypass $http_authorization;
    proxy_no_cache $http_authorization;
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;
    proxy_cache_background_update on;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache $upstream_cache_status always;
}
# Pages: cached only when the website says they are public (Cache-Control s-maxage); private pages,
# responses that set cookies and requests with a login header always go to the website.
location / {
    proxy_pass http://pcbdukaan_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $pcbdukaan_connection;
    proxy_cache pcbdukaan;
    proxy_cache_methods GET HEAD;
    proxy_cache_key "$scheme$host$request_uri|$pcbdukaan_bot|$http_rsc|$http_next_router_prefetch|$http_next_router_segment_prefetch|$http_next_url";
    proxy_cache_bypass $http_authorization;
    proxy_no_cache $http_authorization;
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;
    proxy_cache_background_update on;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    add_header X-Cache $upstream_cache_status always;
}
NGINX

# 3. Swap the site's own "location / { … }" (pointing to the website) for the include above.
python3 - "$SITE" "$PORT" <<'PY' || restore "could not edit the site file"
import re, sys
path, port = sys.argv[1], sys.argv[2]
s = open(path).read()
out, i, changed = [], 0, 0
pat = re.compile(r"\n([ \t]*)location\s+/\s*\{")
while True:
    m = pat.search(s, i)
    if not m:
        out.append(s[i:]); break
    # find the matching closing brace
    depth, j = 0, m.end() - 1
    while j < len(s):
        if s[j] == "{": depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0: break
        j += 1
    block = s[m.start():j + 1]
    out.append(s[i:m.start()])
    if f"127.0.0.1:{port}" in block or "pcbdukaan_app" in block:
        out.append(f"\n{m.group(1)}include snippets/pcbdukaan-locations.conf;"); changed += 1
    else:
        out.append(block)
    i = j + 1
s2 = "".join(out)
if changed == 0 and "snippets/pcbdukaan-locations.conf" not in s2:
    sys.exit(1)
open(path, "w").write(s2)
PY

# 4. Allow many more connections (2000 visitors ≈ several thousand open connections).
if grep -qE '^\s*worker_connections\s+[0-9]+;' /etc/nginx/nginx.conf; then
  cur=$(grep -oE '^\s*worker_connections\s+[0-9]+' /etc/nginx/nginx.conf | grep -oE '[0-9]+$' | head -1)
  [ "${cur:-0}" -lt 4096 ] && sed -i -E 's/^(\s*worker_connections\s+)[0-9]+;/\14096;/' /etc/nginx/nginx.conf
fi
grep -qE '^\s*worker_rlimit_nofile' /etc/nginx/nginx.conf || sed -i '0,/^\s*events\s*{/s//worker_rlimit_nofile 16384;\n\nevents {/' /etc/nginx/nginx.conf

nginx -t > /tmp/pcbdukaan-nginx-test.log 2>&1 || restore "nginx -t failed: $(tail -2 /tmp/pcbdukaan-nginx-test.log | tr '\n' ' ')"
systemctl reload nginx
sleep 3
BASE="${CHECK_BASE:-https://pcbdukaan.com}"
for p in / /products "/api/search?q=relay"; do
  u="$BASE$p"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 ${CHECK_BASE:+} $( [ -z "${CHECK_BASE:-}" ] && echo --resolve pcbdukaan.com:443:127.0.0.1 ) "$u" || true)
  [ "$code" = 200 ] || restore "site check failed after the change: $u → $code"
done
echo "$VERSION" > "$MARK"
log "applied (website port $PORT, backup in $BK)"
