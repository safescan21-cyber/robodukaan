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
