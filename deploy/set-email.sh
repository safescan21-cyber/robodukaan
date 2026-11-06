#!/usr/bin/env bash
# Connect a mailbox (e.g. sonugiri@pcbdukaan.in) so the store can send:
#   - order confirmations and new-order alerts
#   - welcome emails and PCB repair updates
#   - login / sign-up codes (through Supabase, optional step below)
# Run as root:  bash /opt/robodukaan/deploy/set-email.sh
# Passwords are typed here on the server and never stored in GitHub.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
ENV_FILE=/etc/robodukaan/email.env
SUPABASE_REF="cjslvfsrfjslpnyjrvhr"
[ "$(id -u)" -eq 0 ] || { echo "Please run as root."; exit 1; }

ask() { local prompt="$1" default="${2:-}" var; read -r -p "$prompt${default:+ [$default]}: " var; echo "${var:-$default}"; }
ask_secret() { local var; read -r -s -p "$1: " var; echo >&2; echo "$var"; }

echo "== Email setup for the PCBDukaan store =="
SMTP_USER=$(ask "Mailbox address (e.g. sonugiri@pcbdukaan.in)")
SMTP_PASS=$(ask_secret "Mailbox password (hidden)")
SMTP_HOST=$(ask "SMTP server" "smtp.hostinger.com")
SMTP_PORT=$(ask "SMTP port" "465")
SENDER_NAME=$(ask "Sender name" "PCBDukaan")
ADMIN_EMAIL=$(ask "Send new-order and repair alerts to" "$SMTP_USER")
[ -n "$SMTP_USER" ] && [ -n "$SMTP_PASS" ] || { echo "Mailbox and password are required."; exit 1; }

echo; echo "== Testing the mailbox (sending a test email to $ADMIN_EMAIL)"
SMTP_USER="$SMTP_USER" SMTP_PASS="$SMTP_PASS" SMTP_HOST="$SMTP_HOST" SMTP_PORT="$SMTP_PORT" SENDER_NAME="$SENDER_NAME" ADMIN_EMAIL="$ADMIN_EMAIL" python3 - <<'PY'
import os, smtplib, ssl, sys
from email.message import EmailMessage
e = os.environ
msg = EmailMessage()
msg["From"] = f'{e["SENDER_NAME"]} <{e["SMTP_USER"]}>'
msg["To"] = e["ADMIN_EMAIL"]
msg["Subject"] = "PCBDukaan email is working ✅"
msg.set_content("Your store can now send emails: order confirmations, welcome emails, PCB repair updates and login codes.")
try:
    port = int(e["SMTP_PORT"])
    if port == 465:
        s = smtplib.SMTP_SSL(e["SMTP_HOST"], port, context=ssl.create_default_context(), timeout=20)
    else:
        s = smtplib.SMTP(e["SMTP_HOST"], port, timeout=20); s.starttls(context=ssl.create_default_context())
    s.login(e["SMTP_USER"], e["SMTP_PASS"]); s.send_message(msg); s.quit()
    print("   Test email sent.")
except Exception as ex:
    print(f"!! Could not send with these settings: {ex}"); sys.exit(1)
PY

echo "== Saving settings for the store"
mkdir -p /etc/robodukaan && umask 077
SMTP_USER="$SMTP_USER" SMTP_PASS="$SMTP_PASS" SMTP_HOST="$SMTP_HOST" SMTP_PORT="$SMTP_PORT" SENDER_NAME="$SENDER_NAME" ADMIN_EMAIL="$ADMIN_EMAIL" python3 - "$ENV_FILE" <<'PY'
import os, sys
q = lambda v: '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'
e = os.environ
lines = {
  "SMTP_HOST": e["SMTP_HOST"], "SMTP_PORT": e["SMTP_PORT"], "SMTP_USER": e["SMTP_USER"],
  "SMTP_PASS": e["SMTP_PASS"], "MAIL_FROM": f'{e["SENDER_NAME"]} <{e["SMTP_USER"]}>', "ADMIN_EMAIL": e["ADMIN_EMAIL"],
}
open(sys.argv[1], "w").write("".join(f"{k}={q(v)}\n" for k, v in lines.items()))
PY
chmod 600 "$ENV_FILE"
mkdir -p /etc/systemd/system/robodukaan.service.d
printf '[Service]\nEnvironmentFile=-%s\n' "$ENV_FILE" > /etc/systemd/system/robodukaan.service.d/email.conf
systemctl daemon-reload && systemctl restart robodukaan
echo "   Store restarted with email turned on."

echo
echo "== Optional: send login and sign-up codes from this mailbox too"
echo "   Without this, Supabase's built-in sender only delivers codes to your own team's addresses."
echo "   Paste a Supabase access token (supabase.com → Account → Access Tokens), or press Enter to skip."
TOKEN=$(ask_secret "Supabase access token (hidden)")
if [ -n "$TOKEN" ]; then
  payload=$(SMTP_USER="$SMTP_USER" SMTP_PASS="$SMTP_PASS" SMTP_HOST="$SMTP_HOST" SMTP_PORT="$SMTP_PORT" SENDER_NAME="$SENDER_NAME" python3 - "$APP_DIR/deploy/supabase-email-templates.json" <<'PY'
import json, os, sys
e = os.environ
d = json.load(open(sys.argv[1]))
d.update({"smtp_host": e["SMTP_HOST"], "smtp_port": e["SMTP_PORT"], "smtp_user": e["SMTP_USER"], "smtp_pass": e["SMTP_PASS"],
          "smtp_admin_email": e["SMTP_USER"], "smtp_sender_name": e["SENDER_NAME"], "rate_limit_email_sent": 60,
          "mailer_otp_length": 6})
print(json.dumps(d))
PY
)
  code=$(curl -sS -o /tmp/supabase-smtp.out -w '%{http_code}' -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_REF/config/auth" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data-binary "$payload" || true)
  if [ "$code" = "200" ]; then echo "   Supabase now sends login codes from $SMTP_USER with PCBDukaan-branded emails."
  else echo "!! Supabase update failed (HTTP $code): $(head -c 300 /tmp/supabase-smtp.out)"; fi
  rm -f /tmp/supabase-smtp.out
  echo "   Tip: you can now delete that access token in Supabase (Account → Access Tokens)."
fi
echo; echo "Done."
