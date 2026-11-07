-- Run this whole file once (updates 016 and 017). Safe to run more than once.

-- PCBDukaan update 016: technician partner sign-ups and BIS registration numbers on products.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── BIS registration number (required by law for SMPS ≤ 48 V output sold in India) ──
alter table public.products add column if not exists bis_number text;
alter table public.products drop constraint if exists products_bis_number_length;
alter table public.products add constraint products_bis_number_length check (length(coalesce(bis_number, '')) <= 40);

-- ── Repair technician partner applications ──────────────────────────────────────────
create table if not exists public.partner_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  business_name text,
  phone         text not null,
  email         text,
  city          text not null,
  state         text,
  experience    text,
  message       text,
  status        text not null default 'new' check (status in ('new','contacted','active','rejected')),
  admin_notes   text,
  created_at    timestamptz not null default now()
);
create index if not exists partner_applications_created_idx on public.partner_applications(created_at desc);
alter table public.partner_applications enable row level security;
drop policy if exists "partners: admin read" on public.partner_applications;
drop policy if exists "partners: admin update" on public.partner_applications;
drop policy if exists "partners: admin delete" on public.partner_applications;
create policy "partners: admin read" on public.partner_applications for select using (public.is_admin());
create policy "partners: admin update" on public.partner_applications for update using (public.is_admin());
create policy "partners: admin delete" on public.partner_applications for delete using (public.is_admin());
-- No insert policy: applications come in only through apply_partner() (checks + spam limits).

create or replace function public.apply_partner(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g');
  v_email text := nullif(trim(coalesce(p->>'email','')), '');
  v_id    uuid;
begin
  if v_phone ~ '^91\d{10}$' then v_phone := substr(v_phone, 3); end if;
  if v_phone !~ '^[6-9]\d{9}$' then raise exception 'Please enter a valid 10-digit mobile number'; end if;
  if length(trim(coalesce(p->>'name',''))) < 2 then raise exception 'Please enter your name'; end if;
  if length(trim(coalesce(p->>'city',''))) < 2 then raise exception 'Please enter your city'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email'; end if;
  if length(coalesce(p->>'name','')) > 100 or length(coalesce(p->>'business_name','')) > 120 or length(coalesce(p->>'city','')) > 80
     or length(coalesce(p->>'state','')) > 80 or length(coalesce(p->>'experience','')) > 500 or length(coalesce(p->>'message','')) > 2000
     or length(coalesce(v_email,'')) > 200 then
    raise exception 'Text is too long';
  end if;
  -- Spam limits: 3 per mobile number per day, 30 per hour overall.
  if (select count(*) from public.partner_applications where phone = v_phone and created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.partner_applications where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many requests – please email us instead';
  end if;
  insert into public.partner_applications (user_id, name, business_name, phone, email, city, state, experience, message)
  values (auth.uid(), trim(p->>'name'), nullif(trim(coalesce(p->>'business_name','')), ''), v_phone,
          coalesce(v_email, (select email from auth.users where id = auth.uid())),
          trim(p->>'city'), nullif(trim(coalesce(p->>'state','')), ''),
          nullif(trim(coalesce(p->>'experience','')), ''), nullif(trim(coalesce(p->>'message','')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.apply_partner(jsonb) from public;
grant execute on function public.apply_partner(jsonb) to anon, authenticated;

-- PCBDukaan update 017: vendors (suppliers who dispatch orders) and order assignment.
-- Admin assigns an order to a vendor → the vendor gets an email with a private link → on that page the
-- vendor accepts the order and marks it dispatched (courier + tracking) → admin is notified.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

create table if not exists public.vendors (
  id           uuid primary key default gen_random_uuid(),
  company_name text not null check (length(trim(company_name)) between 2 and 120),
  contact_name text check (length(contact_name) <= 80),
  email        text check (email is null or (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200)),
  whatsapp     text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  city         text check (length(city) <= 80),
  notes        text check (length(notes) <= 1000),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.vendors enable row level security;
drop policy if exists "vendors: admin all" on public.vendors;
create policy "vendors: admin all" on public.vendors for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.vendor_assignments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders(id) on delete cascade,
  vendor_id       uuid not null references public.vendors(id) on delete restrict,
  token           uuid not null unique default gen_random_uuid(),   -- the vendor's private link
  status          text not null default 'assigned' check (status in ('assigned','accepted','declined','dispatched')),
  admin_note      text check (length(admin_note) <= 1000),
  assigned_at     timestamptz not null default now(),
  accepted_at     timestamptz,
  dispatched_at   timestamptz,
  courier         text check (length(courier) <= 80),
  tracking_number text check (length(tracking_number) <= 80),
  tracking_url    text check (tracking_url is null or (tracking_url ~ '^https?://' and length(tracking_url) <= 500)),
  vendor_note     text check (length(vendor_note) <= 1000),
  notified_at     timestamptz
);
create index if not exists vendor_assignments_vendor_idx on public.vendor_assignments(vendor_id, assigned_at desc);
alter table public.vendor_assignments enable row level security;
drop policy if exists "vendor assignments: admin all" on public.vendor_assignments;
create policy "vendor assignments: admin all" on public.vendor_assignments for all using (public.is_admin()) with check (public.is_admin());

-- What the vendor sees on their private link: items, quantities, delivery address – no prices except the
-- cash-on-delivery amount to collect.
create or replace function public.vendor_order(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', a.status, 'assigned_at', a.assigned_at, 'accepted_at', a.accepted_at, 'dispatched_at', a.dispatched_at,
    'courier', a.courier, 'tracking_number', a.tracking_number, 'tracking_url', a.tracking_url,
    'vendor_note', a.vendor_note, 'admin_note', a.admin_note,
    'vendor', v.company_name,
    'order_number', o.order_number, 'order_date', o.created_at, 'order_status', o.status,
    'ship_to', jsonb_build_object('name', o.customer_name, 'phone', o.phone, 'address', o.address_line,
                                  'city', o.city, 'state', o.state, 'pincode', o.pincode,
                                  'company', o.buyer_company, 'gstin', o.buyer_gstin),
    'notes', o.notes,
    'cod_amount', case when o.payment_method = 'cod' and o.payment_status <> 'paid' then o.total end,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'sku', i.sku, 'quantity', i.quantity) order by i.name), '[]')
              from public.order_items i where i.order_id = o.id))
  from public.vendor_assignments a
  join public.vendors v on v.id = a.vendor_id
  join public.orders o on o.id = a.order_id
  where a.token = p_token;
$$;

-- The vendor's buttons: accept / decline / dispatch. Dispatch moves the order to "shipped".
create or replace function public.vendor_order_update(p_token uuid, p_action text, p_courier text default null,
  p_tracking text default null, p_tracking_url text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.vendor_assignments%rowtype; o public.orders%rowtype;
begin
  select * into a from public.vendor_assignments where token = p_token for update;
  if not found then raise exception 'This link is no longer valid'; end if;
  select * into o from public.orders where id = a.order_id;
  if o.status = 'cancelled' then raise exception 'This order was cancelled – please do not dispatch it'; end if;
  p_note := nullif(left(trim(coalesce(p_note, '')), 1000), '');
  if p_action = 'accept' then
    if a.status not in ('assigned', 'declined') then raise exception 'This order is already %', a.status; end if;
    update public.vendor_assignments set status = 'accepted', accepted_at = now(), vendor_note = coalesce(p_note, vendor_note) where id = a.id;
  elsif p_action = 'decline' then
    if a.status = 'dispatched' then raise exception 'This order is already dispatched'; end if;
    update public.vendor_assignments set status = 'declined', vendor_note = coalesce(p_note, vendor_note) where id = a.id;
  elsif p_action = 'dispatch' then
    if a.status = 'dispatched' then raise exception 'This order is already marked dispatched'; end if;
    if length(trim(coalesce(p_courier, ''))) < 2 then raise exception 'Please enter the courier name'; end if;
    if length(trim(coalesce(p_tracking, ''))) < 3 then raise exception 'Please enter the tracking / AWB number'; end if;
    p_tracking_url := nullif(trim(coalesce(p_tracking_url, '')), '');
    if p_tracking_url is not null and p_tracking_url !~ '^https?://' then raise exception 'The tracking link must start with https://'; end if;
    update public.vendor_assignments set status = 'dispatched', dispatched_at = now(),
      accepted_at = coalesce(accepted_at, now()),
      courier = left(trim(p_courier), 80), tracking_number = left(trim(p_tracking), 80),
      tracking_url = left(p_tracking_url, 500), vendor_note = coalesce(p_note, vendor_note)
    where id = a.id;
    update public.orders set status = 'shipped',
      tracking_url = coalesce(left(p_tracking_url, 500), tracking_url), updated_at = now()
    where id = o.id and status in ('pending', 'confirmed', 'packed');
  else
    raise exception 'Unknown action';
  end if;
  return public.vendor_order(p_token);
end;
$$;
revoke all on function public.vendor_order(uuid) from public;
revoke all on function public.vendor_order_update(uuid, text, text, text, text, text) from public;
grant execute on function public.vendor_order(uuid) to anon, authenticated;
grant execute on function public.vendor_order_update(uuid, text, text, text, text, text) to anon, authenticated;

-- For the website server after a vendor update: which order (admin link) and the customer's email
-- (shipped notification). Same private link as above.
create or replace function public.vendor_order_meta(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('order_id', o.id, 'customer_email', o.email)
  from public.vendor_assignments a join public.orders o on o.id = a.order_id where a.token = p_token;
$$;
revoke all on function public.vendor_order_meta(uuid) from public;
grant execute on function public.vendor_order_meta(uuid) to anon, authenticated;
