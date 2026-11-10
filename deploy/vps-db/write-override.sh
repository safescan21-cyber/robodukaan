#!/usr/bin/env bash
# Writes the PCBDukaan settings for self-hosted Supabase (docker-compose.pcbdukaan.yml) and makes sure
# docker compose uses them (COMPOSE_FILE in .env). Used by 1-install.sh and ensure-auth-email.sh.
#   bash write-override.sh /opt/supabase
# - every port only on 127.0.0.1 (nginx publishes the API with https)
# - login emails: 6-digit codes with PCBDukaan subjects and layouts (kept in the server's storage)
set -euo pipefail
SB_DIR="${1:-/opt/supabase}"
GW_PORT="${GW_PORT:-8100}"
PG_PORT="${PG_PORT:-54322}"
PG_TX_PORT="${PG_TX_PORT:-54329}"
# Layouts are read from the server's own storage over the internal network (see ensure-auth-email.sh).
TEMPLATES_URL="${TEMPLATES_URL:-http://storage:5000/object/public/email-templates}"
cd "$SB_DIR"
cat > docker-compose.pcbdukaan.yml <<YML
# PCBDukaan: keep every Supabase port on 127.0.0.1 (nginx publishes the API with HTTPS).
services:
  api-gw:
    ports: !override
      - "127.0.0.1:$GW_PORT:8000/tcp"
  supavisor:
    ports: !override
      - "127.0.0.1:$PG_PORT:5432"
      - "127.0.0.1:$PG_TX_PORT:6543"
  auth:
    environment:
      GOTRUE_MAILER_OTP_LENGTH: "6"
      GOTRUE_RATE_LIMIT_EMAIL_SENT: "60"
      GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "{{ .Token }} is your PCBDukaan verification code"
      GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "{{ .Token }} is your PCBDukaan login code"
      GOTRUE_MAILER_SUBJECTS_RECOVERY: "Reset your PCBDukaan password"
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION: "$TEMPLATES_URL/confirmation.html"
      GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: "$TEMPLATES_URL/magic-link.html"
      GOTRUE_MAILER_TEMPLATES_RECOVERY: "$TEMPLATES_URL/recovery.html"
YML
# COMPOSE_FILE must list docker-compose.yml first and include ours (keep any other files already listed).
cur=$(grep '^COMPOSE_FILE=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)
[ -n "$cur" ] || cur="docker-compose.yml"
case ":$cur:" in *":docker-compose.pcbdukaan.yml:"*) new="$cur" ;; *) new="$cur:docker-compose.pcbdukaan.yml" ;; esac
if grep -q '^COMPOSE_FILE=' .env; then sed -i "s#^COMPOSE_FILE=.*#COMPOSE_FILE=$new#" .env; else echo "COMPOSE_FILE=$new" >> .env; fi
echo "COMPOSE_FILE=$new"
