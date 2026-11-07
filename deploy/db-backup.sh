#!/usr/bin/env bash
# Daily copy of the Supabase database to this server (runs from the robodukaan-backup timer).
# Setup / change the connection: sudo bash /opt/robodukaan/deploy/set-backup.sh
# Restore help: see the comment at the end of set-backup.sh.
set -euo pipefail
: "${DB_URL:?DB_URL missing – run sudo bash /opt/robodukaan/deploy/set-backup.sh}"
DIR="${BACKUP_DIR:-/var/backups/pcbdukaan}"
KEEP_DAYS="${KEEP_DAYS:-14}"
PG_DUMP="$(ls -1 /usr/lib/postgresql/*/bin/pg_dump 2>/dev/null | sort -V | tail -1)"
PG_DUMP="${PG_DUMP:-$(command -v pg_dump)}"
mkdir -p "$DIR"
chmod 700 "$DIR"
stamp=$(TZ=Asia/Kolkata date +%F_%H%M)
out="$DIR/pcbdukaan_$stamp.dump"

# public = shop data, private = report settings, auth = customer logins, storage = file list (not the files).
if ! "$PG_DUMP" "$DB_URL" -Fc --no-owner --no-privileges -n public -n private -n auth -n storage -f "$out.part" 2> "$DIR/last-error.txt"; then
  echo "Full backup failed ($(tail -1 "$DIR/last-error.txt")) – trying shop data only"
  "$PG_DUMP" "$DB_URL" -Fc --no-owner --no-privileges -n public -n private -f "$out.part"
fi
mv "$out.part" "$out"
chmod 600 "$out"
find "$DIR" -name 'pcbdukaan_*.dump' -mtime +"$KEEP_DAYS" -delete
echo "Backup saved: $out ($(du -h "$out" | cut -f1)). Kept: $(ls "$DIR"/pcbdukaan_*.dump | wc -l) copies, $(du -sh "$DIR" | cut -f1) in total."
