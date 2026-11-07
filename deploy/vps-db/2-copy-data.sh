#!/usr/bin/env bash
# STEP 2: copy all data and files from Supabase cloud to the Supabase on this VPS.
#   sudo bash /opt/robodukaan/deploy/vps-db/2-copy-data.sh
# The live website keeps using the cloud until step 3, so this is safe to run (and re-run: it replaces
# the VPS copy with a fresh one each time). Run it once to test, and again right before step 3.
#
# It asks for (from the Supabase cloud dashboard – works on a phone browser):
#  1. Database connection string: Connect → "Session pooler" → copy, put your DB password in it.
#     (Skipped if the daily backup is already set up – it reuses that.)
#  2. Storage S3 keys: Project Settings → Storage → "S3 Connection" → "New access key".
#     Copy the Access key ID and Secret access key (the secret is shown only once).
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/robodukaan}"
STATE=/etc/robodukaan/selfhost.env
[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
[ -f "$STATE" ] || { echo "Run step 1 first: sudo bash $APP_DIR/deploy/vps-db/1-install.sh"; exit 1; }
# shellcheck disable=SC1090
. "$STATE"
say() { printf '\n== %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*"; exit 1; }
cd "$SB_DIR"
sbenv() { grep "^$1=" .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
# Local database as superuser (inside the Supabase db container – no network port needed).
local_sql() { docker compose exec -T db psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
local_val() { docker compose exec -T db psql -X -At -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -c "$1"; }
cloud_sql() { docker compose exec -T -e CLOUD_URL db sh -c 'psql "$CLOUD_URL" -X -q -v ON_ERROR_STOP=1 "$@"' sh "$@"; }
cloud_val() { docker compose exec -T -e CLOUD_URL db sh -c 'psql "$CLOUD_URL" -X -At -v ON_ERROR_STOP=1 -c "$1"' sh "$1"; }

# ── 1. Cloud database connection ─────────────────────────────────────────────────────
CLOUD_URL="${CLOUD_URL:-}"
if [ -z "$CLOUD_URL" ] && [ -f /etc/robodukaan/backup.env ]; then
  CLOUD_URL=$(grep '^DB_URL=' /etc/robodukaan/backup.env | cut -d= -f2- || true)
  [[ "$CLOUD_URL" == postgres* ]] || CLOUD_URL=""
fi
while [ -z "$CLOUD_URL" ]; do
  read -r -s -p "Paste the cloud Session pooler connection string (with your password; hidden): " CLOUD_URL; echo
  CLOUD_URL=$(echo "$CLOUD_URL" | tr -d '[:space:]"'"'")
  [[ "$CLOUD_URL" == postgres*://*@*:*/* && "$CLOUD_URL" != *"[YOUR-PASSWORD]"* ]] || { echo "   That doesn't look right – try again."; CLOUD_URL=""; }
done
export CLOUD_URL
say "Connecting to Supabase cloud"
n=$(cloud_val "select count(*) from public.products") || die "Could not connect to the cloud database. Check the connection string / password."
echo "Connected. Cloud has $n products."
REF="${CLOUD_REF:-$(echo "$CLOUD_URL" | sed -nE 's#^postgres(ql)?://postgres\.([a-z0-9]+):.*#\2#p')}"
[ -n "$REF" ] || REF=$(echo "$CLOUD_URL" | sed -nE 's#.*@db\.([a-z0-9]+)\.supabase\.co.*#\1#p')
[ -n "$REF" ] || die "Could not read the project reference from the connection string."

# ── 2. Database structure (tables, rules, functions) ─────────────────────────────────
say "Creating the shop's tables on the VPS"
if [ "$(local_val "select to_regclass('public.products') is not null")" != t ]; then
  docker compose exec -T db psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres < "$APP_DIR/supabase/schema.sql" > /tmp/sb-schema.log 2>&1 \
    || { tail -5 /tmp/sb-schema.log; die "Creating the tables failed (details above)."; }
  echo "Tables created."
else
  # Re-run: add anything new from later updates (every migration is safe to run again).
  docker compose exec -T db psql -X -q -U postgres -d postgres < "$APP_DIR/supabase/schema.sql" > /tmp/sb-schema.log 2>&1 || true
  echo "Tables already exist (updated)."
fi

# ── 3. Data ───────────────────────────────────────────────────────────────────────────
say "Copying data (customers, products, orders, reviews, repairs …)"
TABLES="auth.users auth.identities $(local_val "select string_agg(format('%I.%I', schemaname, tablename), ' ' order by schemaname, tablename) from pg_tables where schemaname in ('public','private')")"
cols_sql="select string_agg(quote_ident(attname), ',' order by attnum) from pg_attribute where attrelid = '%s'::regclass and attnum > 0 and not attisdropped and attgenerated = ''"
local_sql -c "set session_replication_role = replica" -c "truncate $(echo "$TABLES" | sed 's/ /, /g') cascade" >/dev/null
for t in $TABLES; do
  [ "$(cloud_val "select to_regclass('$t') is not null")" = t ] || { echo "   $t – not in cloud, skipped"; continue; }
  lc=$(local_val "$(printf "$cols_sql" "$t")" | tr ',' '\n')
  cc=$(cloud_val "$(printf "$cols_sql" "$t")" | tr ',' '\n')
  cols=$(grep -Fxf <(echo "$cc") <(echo "$lc") | paste -sd, -)
  [ -n "$cols" ] || continue
  docker compose exec -T -e CLOUD_URL db sh -c 'psql "$CLOUD_URL" -X -q -v ON_ERROR_STOP=1 -c "\copy (select $1 from $2) to stdout"' sh "$cols" "$t" \
    | local_sql -c "set session_replication_role = replica" -c "\copy $t($cols) from pstdin" \
    || die "Copying $t failed."
  printf '   %-34s %s rows\n' "$t" "$(local_val "select count(*) from $t")"
done
# Login service expects empty text (not NULL) in these columns – fix any rows that have NULL.
local_sql <<'SQL'
do $$
declare c text;
begin
  foreach c in array array['confirmation_token','recovery_token','email_change_token_new','email_change',
                           'email_change_token_current','phone_change','phone_change_token','reauthentication_token'] loop
    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = c) then
      execute format('update auth.users set %I = %L where %I is null', c, '', c);
    end if;
  end loop;
end $$;
SQL
# Counters (e.g. order and invoice numbers) continue where the cloud stopped.
for s in $(local_val "select string_agg(format('%I.%I', schemaname, sequencename), ' ') from pg_sequences where schemaname in ('public','private')"); do
  v=$(cloud_val "select case when is_called then last_value else null end from $s" 2>/dev/null || true)
  [ -n "$v" ] && local_val "select setval('$s', $v)" >/dev/null || true
done

# ── 4. Files (photos, documents, repair photos, CVs) ─────────────────────────────────
say "Copying files"
if [ "${SKIP_FILES:-0}" = 1 ]; then
  echo "Skipped (SKIP_FILES=1)."
else
  export RCLONE_CONFIG=/dev/null
  TMP_FILES=/var/tmp/pcbdukaan-file-copy; mkdir -p "$TMP_FILES"; chmod 700 "$TMP_FILES"
  command -v rclone >/dev/null || { apt-get update -qq && apt-get install -y -qq rclone >/dev/null; }
  S3_KEY="${S3_KEY:-}"; S3_SECRET="${S3_SECRET:-}"
  [ -n "$S3_KEY" ] || read -r -p "Cloud Storage S3 Access key ID: " S3_KEY
  [ -n "$S3_SECRET" ] || { read -r -s -p "Cloud Storage S3 Secret access key (hidden): " S3_SECRET; echo; }
  S3_REGION="${S3_REGION:-$(echo "$CLOUD_URL" | sed -nE 's#.*@aws-[0-9]+-([a-z0-9-]+)\.pooler\.supabase\.com.*#\1#p')}"
  [ -n "$S3_REGION" ] || read -r -p "Cloud region (shown next to the S3 endpoint, e.g. ap-south-1): " S3_REGION
  export RCLONE_CONFIG_CLOUD_TYPE=s3 RCLONE_CONFIG_CLOUD_PROVIDER=Other RCLONE_CONFIG_CLOUD_FORCE_PATH_STYLE=true
  export RCLONE_CONFIG_CLOUD_ENDPOINT="${CLOUD_S3_ENDPOINT:-https://$REF.storage.supabase.co/storage/v1/s3}"
  export RCLONE_CONFIG_CLOUD_REGION="$S3_REGION" RCLONE_CONFIG_CLOUD_ACCESS_KEY_ID="$S3_KEY" RCLONE_CONFIG_CLOUD_SECRET_ACCESS_KEY="$S3_SECRET"
  rclone lsd cloud: >/dev/null 2>&1 || die "Could not open cloud Storage with those S3 keys. Check the Access key ID / Secret and region."
  for b in $(cloud_val "select string_agg(id, ' ') from storage.buckets"); do
    if [ "$(local_val "select exists(select 1 from storage.buckets where id = '$b')")" != t ]; then
      pub=$(cloud_val "select public from storage.buckets where id = '$b'")
      local_val "insert into storage.buckets (id, name, public) values ('$b', '$b', $pub = 't')" >/dev/null
    fi
    if ! rclone lsf "cloud:$b" --max-depth 1 >/dev/null 2>&1; then
      echo "   $b – empty or not readable in the cloud, skipped"; continue
    fi
    rm -rf "$TMP_FILES/$b"; mkdir -p "$TMP_FILES/$b"
    rclone copy "cloud:$b" "$TMP_FILES/$b" --transfers 4 --checkers 8 -q || die "Downloading files of bucket $b failed."
    SB_KEY="$(sbenv SERVICE_ROLE_KEY)" python3 - "$TMP_FILES/$b" "$b" <<'PY' || die "Uploading files of bucket $b failed."
import mimetypes, os, sys, urllib.error, urllib.parse, urllib.request
root, bucket = sys.argv[1], sys.argv[2]
key = os.environ["SB_KEY"]
for d, _, files in os.walk(root):
    for f in files:
        path = os.path.join(d, f)
        name = os.path.relpath(path, root).replace(os.sep, "/")
        url = "http://127.0.0.1:8100/storage/v1/object/" + bucket + "/" + urllib.parse.quote(name)
        ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
        with open(path, "rb") as fh:
            req = urllib.request.Request(url, data=fh.read(), method="POST", headers={
                "Authorization": "Bearer " + key, "apikey": key, "Content-Type": ctype, "x-upsert": "true"})
        try:
            urllib.request.urlopen(req, timeout=120).read()
        except urllib.error.HTTPError as e:
            sys.exit(f"   {bucket}/{name}: {e.code} {e.read()[:200]!r}")
PY
    rm -rf "${TMP_FILES:?}/$b"
    printf '   %-20s cloud %s files → VPS %s files\n' "$b" \
      "$(cloud_val "select count(*) from storage.objects where bucket_id = '$b'")" \
      "$(local_val "select count(*) from storage.objects where bucket_id = '$b'")"
  done
fi

# ── 5. Point stored photo/file links to the VPS ──────────────────────────────────────
say "Updating photo and file links to $SB_URL"
local_sql <<SQL
set session_replication_role = replica;
do \$\$
declare r record; n bigint;
begin
  for r in
    select c.table_schema s, c.table_name t, c.column_name col, c.data_type dt
    from information_schema.columns c join information_schema.tables tb using (table_schema, table_name)
    where c.table_schema in ('public','private') and tb.table_type = 'BASE TABLE'
      and c.data_type in ('text','character varying','jsonb','json','ARRAY')
      and (c.data_type <> 'ARRAY' or c.udt_name in ('_text','_varchar'))
  loop
    execute format(
      'update %I.%I set %I = replace(%I::text, %L, %L)::%s where %I::text like %L',
      r.s, r.t, r.col, r.col, 'https://$REF.supabase.co', '$SB_URL',
      case r.dt when 'ARRAY' then 'text[]' when 'character varying' then 'varchar' else r.dt end,
      r.col, '%' || 'https://$REF.supabase.co' || '%');
    get diagnostics n = row_count;
    if n > 0 then raise notice '% %.%: % rows', r.col, r.s, r.t, n; end if;
  end loop;
end \$\$;
SQL

say "Step 2 done – the VPS now has a full copy"
echo "Products: cloud $(cloud_val "select count(*) from public.products") · VPS $(local_val "select count(*) from public.products")"
echo "Orders:   cloud $(cloud_val "select count(*) from public.orders") · VPS $(local_val "select count(*) from public.orders")"
echo "Users:    cloud $(cloud_val "select count(*) from auth.users") · VPS $(local_val "select count(*) from auth.users")"
echo
echo "The website still uses the cloud. When you're ready (best at night), run step 2 again for the newest"
echo "data, then switch right away:   sudo bash $APP_DIR/deploy/vps-db/3-switch.sh"
