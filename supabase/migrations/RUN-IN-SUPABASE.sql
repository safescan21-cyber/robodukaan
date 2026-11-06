-- PCBDukaan update 005: block users, job postings & applications.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── Blocking users ──────────────────────────────────────────────
alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_at timestamptz;

create or replace function public.is_blocked()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_blocked from public.profiles where id = auth.uid()), false);
$$;

-- Only admins may change roles or block status (the SQL Editor may too).
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles or block users';
  end if;
  if new.is_blocked and new.id = auth.uid() then
    raise exception 'You cannot block your own account';
  end if;
  if new.is_blocked is distinct from old.is_blocked then
    new.blocked_at := case when new.is_blocked then now() else null end;
  end if;
  return new;
end;
$$;

-- Blocked users can't order, request repairs, review or apply for jobs.
create or replace function public.block_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_blocked() and not public.is_admin() then
    raise exception 'Your account has been blocked. Please contact support.';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_block_guard on public.orders;
create trigger orders_block_guard before insert on public.orders for each row execute function public.block_guard();
drop trigger if exists repairs_block_guard on public.repair_requests;
create trigger repairs_block_guard before insert on public.repair_requests for each row execute function public.block_guard();
drop trigger if exists reviews_block_guard on public.reviews;
create trigger reviews_block_guard before insert or update on public.reviews for each row execute function public.block_guard();

-- Admin customer list now includes block status and supports "new this week".
drop function if exists public.admin_customers(text, uuid);
create or replace function public.admin_customers(p_search text default null, p_user uuid default null)
returns table (
  id uuid, email text, full_name text, phone text, role text, created_at timestamptz,
  last_sign_in_at timestamptz, email_confirmed boolean, orders bigint, spent numeric, repairs bigint,
  is_blocked boolean
)
language plpgsql stable security definer set search_path = public as $$
declare term text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select p.id, p.email, p.full_name, p.phone, p.role, p.created_at,
         u.last_sign_in_at, u.email_confirmed_at is not null,
         (select count(*) from public.orders o where o.user_id = p.id),
         (select coalesce(sum(o.total), 0) from public.orders o where o.user_id = p.id and o.status <> 'cancelled'),
         (select count(*) from public.repair_requests r where r.user_id = p.id),
         p.is_blocked
  from public.profiles p
  join auth.users u on u.id = p.id
  where (p_user is null or p.id = p_user)
    and (term is null or p.email ilike '%' || term || '%' or p.full_name ilike '%' || term || '%' or p.phone ilike '%' || term || '%')
  order by p.created_at desc
  limit 500;
end;
$$;
revoke all on function public.admin_customers(text, uuid) from public;
grant execute on function public.admin_customers(text, uuid) to authenticated;

create or replace function public.admin_user_counts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'total',     (select count(*) from public.profiles),
    'this_week', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'today',     (select count(*) from public.profiles where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'admins',    (select count(*) from public.profiles where role = 'admin'),
    'blocked',   (select count(*) from public.profiles where is_blocked)
  );
end;
$$;
revoke all on function public.admin_user_counts() from public;
grant execute on function public.admin_user_counts() to authenticated;

-- ── Jobs ────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  department      text,
  location        text not null default 'India',
  employment_type text not null default 'Full-time',
  experience      text,
  salary          text,
  description     text not null,
  requirements    text,
  is_open         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.job_applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text not null,
  experience  text,
  message     text,
  resume_path text,
  status      text not null default 'new' check (status in ('new','shortlisted','interview','rejected','hired')),
  admin_notes text,
  created_at  timestamptz not null default now(),
  unique (job_id, user_id)
);
create index if not exists job_applications_job_idx on public.job_applications(job_id);

create or replace function public.prepare_job_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      if not exists (select 1 from public.jobs where id = new.job_id and is_open) then
        raise exception 'This job is no longer open';
      end if;
      new.user_id := auth.uid();
      new.status := 'new';
      new.admin_notes := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists job_applications_prepare on public.job_applications;
create trigger job_applications_prepare before insert on public.job_applications
  for each row execute function public.prepare_job_application();
drop trigger if exists job_applications_block_guard on public.job_applications;
create trigger job_applications_block_guard before insert on public.job_applications
  for each row execute function public.block_guard();

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
drop policy if exists "jobs: public read open" on public.jobs;
drop policy if exists "jobs: admin write" on public.jobs;
create policy "jobs: public read open" on public.jobs for select using (is_open or public.is_admin());
create policy "jobs: admin write" on public.jobs for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "applications: read own or admin" on public.job_applications;
drop policy if exists "applications: apply" on public.job_applications;
drop policy if exists "applications: admin update" on public.job_applications;
drop policy if exists "applications: admin delete" on public.job_applications;
create policy "applications: read own or admin" on public.job_applications for select using (user_id = auth.uid() or public.is_admin());
create policy "applications: apply" on public.job_applications for insert with check (auth.uid() is not null);
create policy "applications: admin update" on public.job_applications for update using (public.is_admin());
create policy "applications: admin delete" on public.job_applications for delete using (public.is_admin());

-- Private CV storage: applicants upload into their own folder, admins read all.
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;
drop policy if exists "resumes: upload own" on storage.objects;
drop policy if exists "resumes: read own or admin" on storage.objects;
create policy "resumes: upload own" on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes: read own or admin" on storage.objects for select
  using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

alter table public.job_applications add column if not exists email_sent_at timestamptz;
create or replace function public.claim_job_application_email(p_application_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.job_applications set email_sent_at = now()
   where id = p_application_id and email_sent_at is null and (user_id = auth.uid() or public.is_admin());
  return found;
end;
$$;
revoke all on function public.claim_job_application_email(uuid) from public;
grant execute on function public.claim_job_application_email(uuid) to authenticated;

-- A first sample job (edit or close it in Admin → Jobs).
insert into public.jobs (slug, title, department, location, employment_type, experience, description, requirements)
values ('pcb-repair-technician', 'PCB Repair Technician', 'Service', 'India', 'Full-time', '2+ years',
  'Diagnose and repair industrial PCBs at component level: inverter, SMPS, VFD, PLC and machine control boards. Test repaired boards and prepare repair reports.',
  'Hands-on SMD soldering and rework\nReading schematics and tracing faults\nUse of multimeter, oscilloscope and power supplies\nITI / Diploma in Electronics preferred')
on conflict (slug) do nothing;


-- PCBDukaan update 006: prices exclude GST; 18% GST is added at checkout. HSN codes.
-- Paste into Supabase → SQL Editor → Run (after 005). Safe to run more than once.

alter table public.categories  add column if not exists hsn_code   text;
alter table public.products    add column if not exists hsn_code   text;
alter table public.order_items add column if not exists hsn_code   text;
alter table public.orders      add column if not exists gst_rate   numeric(5,2) not null default 0;
alter table public.orders      add column if not exists gst_amount numeric(10,2) not null default 0;

-- One place to change the GST rate.
create or replace function public.gst_rate()
returns numeric language sql immutable as $$ select 18::numeric $$;

-- Default HSN codes by category (each product can override in Admin → Products).
-- Please confirm these with your CA before issuing tax invoices.
update public.categories set hsn_code = v.hsn
from (values
  ('industrial-control-boards', '8543 90 00'),
  ('vfd-motor-drives',          '8543 90 00'),
  ('plc-io-modules',            '8543 90 00'),
  ('communication-modules',     '8543 90 00'),
  ('displays-hmi',              '8543 90 00'),
  ('smps-power-supplies',       '8504 40 90'),
  ('relays-power-components',   '8541'),
  ('load-cells-weighing',       '9031'),
  ('industrial-sensors',        '9026'),
  ('test-repair-tools',         '9030')
) as v(slug, hsn)
where categories.slug = v.slug and categories.hsn_code is null;

create or replace function public.place_order(items jsonb, customer jsonb, coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     numeric(10,2) := 0;
  v_discount     numeric(10,2) := 0;
  v_shipping     numeric(10,2);
  v_taxable      numeric(10,2);
  v_gst          numeric(10,2);
  v_gst_rate     numeric(5,2) := public.gst_rate();
  v_hsn          text;
  v_coupon       jsonb;
  v_item         jsonb;
  v_qty          int;
  v_product      public.products%rowtype;
  v_phone        text := regexp_replace(coalesce(customer->>'phone',''), '\D', '', 'g');
begin
  if auth.uid() is null then
    raise exception 'Please log in to place an order';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if jsonb_array_length(items) > 50 then
    raise exception 'Too many different items in one order';
  end if;
  if length(trim(coalesce(customer->>'name',''))) < 2 then
    raise exception 'Please enter your name';
  end if;
  if v_phone ~ '^91\d{10}$' then v_phone := substr(v_phone, 3); end if;
  if v_phone !~ '^[6-9]\d{9}$' then
    raise exception 'Please enter a valid 10-digit Indian mobile number';
  end if;
  if coalesce(customer->>'pincode','') !~ '^[1-9]\d{5}$' then
    raise exception 'Please enter a valid 6-digit PIN code';
  end if;
  if length(trim(coalesce(customer->>'address_line',''))) < 5
     or length(trim(coalesce(customer->>'city',''))) < 2
     or length(trim(coalesce(customer->>'state',''))) < 2 then
    raise exception 'Please enter your full address';
  end if;

  v_order_number := 'PD' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
                    || upper(substr(md5(gen_random_uuid()::text), 1, 5));

  insert into public.orders (order_number, user_id, customer_name, phone, email, address_line,
                             city, state, pincode, notes, subtotal, shipping, total)
  values (v_order_number, auth.uid(),
          trim(customer->>'name'), v_phone,
          coalesce(nullif(trim(customer->>'email'),''), (select email from auth.users where id = auth.uid())),
          trim(customer->>'address_line'), trim(customer->>'city'), trim(customer->>'state'),
          customer->>'pincode', nullif(trim(customer->>'notes'),''), 0, 0, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'Invalid quantity';
    end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and is_active
      for update;
    if not found then
      raise exception 'A product in your cart is no longer available';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Only % left in stock for %', v_product.stock, v_product.name;
    end if;

    select coalesce(nullif(v_product.hsn_code, ''), c.hsn_code) into v_hsn
      from public.categories c where c.id = v_product.category_id;

    update public.products
       set stock = stock - v_qty, sold_count = sold_count + v_qty, updated_at = now()
     where id = v_product.id;

    insert into public.order_items (order_id, product_id, name, sku, slug, hsn_code, image_url, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.sku, v_product.slug, v_hsn,
            coalesce(v_product.images[1], v_product.image_url),
            v_product.price, v_qty, v_product.price * v_qty);

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if nullif(trim(coalesce(coupon_code,'')), '') is not null then
    v_coupon := public.check_coupon(coupon_code, v_subtotal);
    if not (v_coupon->>'valid')::boolean then
      raise exception '%', v_coupon->>'message';
    end if;
    v_discount := (v_coupon->>'discount')::numeric;
    update public.coupons set used_count = used_count + 1 where code = v_coupon->>'code';
  end if;

  v_shipping := public.shipping_for(v_subtotal);
  -- Prices are excluding GST. GST applies to the goods after discount, plus shipping.
  v_taxable := v_subtotal - v_discount + v_shipping;
  v_gst := round(v_taxable * v_gst_rate / 100, 2);

  update public.orders
     set subtotal = v_subtotal, discount = v_discount, coupon_code = v_coupon->>'code',
         shipping = v_shipping, gst_rate = v_gst_rate, gst_amount = v_gst,
         total = v_taxable + v_gst
   where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', v_shipping,
    'gst_rate', v_gst_rate,
    'gst', v_gst,
    'total', v_taxable + v_gst
  );
end;
$$;

create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'customer_name', o.customer_name,
    'city', o.city,
    'subtotal', o.subtotal,
    'discount', o.discount,
    'shipping', o.shipping,
    'gst_rate', o.gst_rate,
    'gst_amount', o.gst_amount,
    'total', o.total,
    'tracking_url', o.tracking_url,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity,
                                          'unit_price', i.unit_price, 'line_total', i.line_total)
                       order by i.id)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  where o.order_number = upper(trim(p_order_number))
    and o.phone = right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 10);
$$;
