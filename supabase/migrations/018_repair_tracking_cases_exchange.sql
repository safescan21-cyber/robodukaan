-- PCBDukaan update 018: repair tracking timeline, repair case studies, exchange-board offers.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── 1. Repair status history (timeline for customers) ─────────────────────────────────
create table if not exists public.repair_status_history (
  id         bigint generated always as identity primary key,
  repair_id  uuid not null references public.repair_requests(id) on delete cascade,
  status     text not null,
  changed_at timestamptz not null default now()
);
create index if not exists repair_status_history_repair_idx on public.repair_status_history(repair_id, changed_at);
alter table public.repair_status_history enable row level security;
drop policy if exists "repair history: owner or admin read" on public.repair_status_history;
create policy "repair history: owner or admin read" on public.repair_status_history for select using (
  public.is_admin() or exists (select 1 from public.repair_requests r where r.id = repair_id and r.user_id = auth.uid()));
-- Rows are written only by the trigger below.

create or replace function public.log_repair_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.repair_status_history (repair_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;
drop trigger if exists repair_requests_log_status on public.repair_requests;
create trigger repair_requests_log_status after insert or update of status on public.repair_requests
  for each row execute function public.log_repair_status();

-- Existing requests: start their history with the creation date and the current status.
insert into public.repair_status_history (repair_id, status, changed_at)
select r.id, 'new', r.created_at from public.repair_requests r
where not exists (select 1 from public.repair_status_history h where h.repair_id = r.id);
insert into public.repair_status_history (repair_id, status, changed_at)
select r.id, r.status, r.updated_at from public.repair_requests r
where r.status <> 'new' and not exists (select 1 from public.repair_status_history h where h.repair_id = r.id and h.status = r.status);

-- Public "Track your repair": request number + the mobile number used. No photos or notes.
create or replace function public.track_repair(p_request_number text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'request_number', r.request_number, 'status', r.status, 'board_type', r.board_type, 'device', r.device,
    'quantity', r.quantity, 'urgent', r.urgent, 'wants_exchange', r.wants_exchange,
    'quote_amount', case when r.status in ('quoted','approved','in_repair','repaired','returned') then r.quote_amount end,
    'created_at', r.created_at, 'updated_at', r.updated_at,
    'history', (select coalesce(jsonb_agg(jsonb_build_object('status', h.status, 'at', h.changed_at) order by h.changed_at), '[]')
                from public.repair_status_history h where h.repair_id = r.id))
  from public.repair_requests r
  where upper(r.request_number) = upper(trim(p_request_number))
    and right(regexp_replace(r.phone, '\D', '', 'g'), 10) = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10;
$$;
revoke all on function public.track_repair(text, text) from public;
grant execute on function public.track_repair(text, text) to anon, authenticated;

-- ── 2. Repair case studies (written by admin from real jobs) ──────────────────────────
create table if not exists public.case_studies (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title           text not null check (length(title) between 5 and 160),
  board_type      text check (length(board_type) <= 80),
  brand_model     text check (length(brand_model) <= 120),
  industry        text check (length(industry) <= 80),
  city            text check (length(city) <= 80),
  fault           text not null check (length(fault) <= 3000),
  diagnosis       text check (length(diagnosis) <= 5000),
  repair          text not null check (length(repair) <= 5000),
  result          text check (length(result) <= 3000),
  turnaround_days int  check (turnaround_days between 0 and 365),
  saving_note     text check (length(saving_note) <= 300),
  photos          text[] not null default '{}' check (cardinality(photos) <= 8),
  service_slug    text check (length(service_slug) <= 80),
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists case_studies_published_idx on public.case_studies(is_published, published_at desc);
alter table public.case_studies enable row level security;
drop policy if exists "case studies: public read published" on public.case_studies;
drop policy if exists "case studies: admin all" on public.case_studies;
create policy "case studies: public read published" on public.case_studies for select using (is_published or public.is_admin());
create policy "case studies: admin all" on public.case_studies for all using (public.is_admin()) with check (public.is_admin());

-- ── 3. Exchange-board offer on products ───────────────────────────────────────────────
-- exchange_price: price when the customer sends back their old faulty board of the same model.
alter table public.products add column if not exists exchange_available boolean not null default false;
alter table public.products add column if not exists exchange_price numeric(10,2) check (exchange_price is null or exchange_price > 0);
