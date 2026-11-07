#!/usr/bin/env bash
# Moves the database from Supabase cloud to this VPS in one go (steps 1, 2 and 3).
#   sudo bash /opt/robodukaan/deploy/vps-db/move-all.sh
# Asks for the connection string and storage keys once, and asks before switching the website.
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
bash "$D/1-install.sh"
bash "$D/2-copy-data.sh"
echo
read -r -p "Everything is copied. Switch the website to the VPS database now? Type yes to switch: " ans
if [ "$ans" = yes ]; then
  bash "$D/3-switch.sh"
else
  echo "Not switched. The website still uses Supabase cloud. Switch later with:"
  echo "   sudo bash $D/2-copy-data.sh   (fresh copy)   and then   sudo bash $D/3-switch.sh"
fi
