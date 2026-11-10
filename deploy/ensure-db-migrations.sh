#!/usr/bin/env bash
# Applies new database updates (supabase/migrations/0NN_*.sql) to the database on this VPS – once each, in
# order. Run by deploy/auto-update.sh (before restarting the website and every 5 minutes); does nothing when
# everything is applied. Only for the self-hosted database (after the move from Supabase cloud).
# Every update file is written to be safe to run more than once.
set -uo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
STATE=/etc/robodukaan/selfhost.env
[ -f "$STATE" ] || exit 0
SB_DIR=$(grep '^SB_DIR=' "$STATE" | cut -d= -f2-)
[ -n "$SB_DIR" ] && [ -f "$SB_DIR/.env" ] || exit 0
SB_URL=$(grep '^SB_URL=' "$STATE" | cut -d= -f2-)
# Only when the website really uses this server's database.
[ -n "$SB_URL" ] && grep -q "^NEXT_PUBLIC_SUPABASE_URL=.*${SB_URL#https://}" "$APP_DIR/.env.local" 2>/dev/null || exit 0
LOG=/var/log/robodukaan-update.log
log() { echo "$(date '+%F %T') db-update: $*" >> "$LOG"; }
cd "$SB_DIR"
psql_db() { docker compose exec -T db psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
val() { docker compose exec -T db psql -X -At -U postgres -d postgres -c "$1" 2>/dev/null; }

[ "$(val "select 1")" = 1 ] || exit 0   # database not running right now – try again next time

# First run: everything up to update 024 came with the move, so mark those as done.
if [ "$(val "select to_regclass('private.applied_migrations') is not null")" != t ]; then
  psql_db -c "create schema if not exists private; create table if not exists private.applied_migrations (name text primary key, applied_at timestamptz not null default now()); revoke all on schema private from public;" >/dev/null || exit 0
  for f in "$APP_DIR"/supabase/migrations/[0-9][0-9][0-9]_*.sql; do
    n=$(basename "$f"); num=$((10#${n%%_*}))
    [ "$num" -le 24 ] && psql_db -c "insert into private.applied_migrations (name) values ('$n') on conflict do nothing" >/dev/null
  done
  log "started tracking database updates (001–024 came with the move)"
fi

applied=0
for f in "$APP_DIR"/supabase/migrations/[0-9][0-9][0-9]_*.sql; do
  n=$(basename "$f")
  [ "$(val "select 1 from private.applied_migrations where name = '$n'")" = 1 ] && continue
  if psql_db < "$f" > /tmp/pcbdukaan-migration.log 2>&1; then
    psql_db -c "insert into private.applied_migrations (name) values ('$n') on conflict do nothing" >/dev/null
    log "applied $n"; applied=1
  else
    log "FAILED $n: $(grep -m2 ERROR /tmp/pcbdukaan-migration.log | tr '\n' ' ' | cut -c1-300)"
    break   # later updates may depend on this one
  fi
done
[ "$applied" = 1 ] && psql_db -c "notify pgrst, 'reload schema'" >/dev/null
exit 0
