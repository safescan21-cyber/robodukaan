-- PCBDukaan update 028: PCB repair course page – details edited in Admin → Repair course, and enquiries.
-- Safe to run more than once.

-- Small editable site texts (public read). key 'course' = the course page details.
create table if not exists public.site_content (
  key        text primary key check (length(key) <= 60),
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "site_content: public read" on public.site_content;
create policy "site_content: public read" on public.site_content for select using (true);
drop policy if exists "site_content: admin write" on public.site_content;
create policy "site_content: admin write" on public.site_content for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.course_enquiries (
  id          bigint generated always as identity primary key,
  name        text not null check (length(name) between 2 and 100),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email       text check (email is null or length(email) <= 200),
  city        text check (city is null or length(city) <= 80),
  level       text check (level is null or length(level) <= 40),
  message     text check (message is null or length(message) <= 1000),
  status      text not null default 'new' check (status in ('new', 'contacted', 'joined', 'closed')),
  created_at  timestamptz not null default now()
);
create index if not exists course_enquiries_created_idx on public.course_enquiries(created_at desc);
alter table public.course_enquiries enable row level security;
drop policy if exists "course_enquiries: admin" on public.course_enquiries;
create policy "course_enquiries: admin" on public.course_enquiries for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.course_enquiry(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare ph text := regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g');
begin
  if ph ~ '^(91|0)\d{10}$' then ph := right(ph, 10); end if;
  if length(trim(coalesce(p->>'name', ''))) < 2 then raise exception 'Please enter your name'; end if;
  if ph !~ '^[6-9]\d{9}$' then raise exception 'Please enter a valid 10-digit mobile number'; end if;
  if (select count(*) from public.course_enquiries where phone = ph and created_at > now() - interval '1 day') >= 3 then
    raise exception 'We already have your enquiry – we''ll call you soon';
  end if;
  insert into public.course_enquiries (name, phone, email, city, level, message)
  values (left(trim(p->>'name'), 100), ph, nullif(left(trim(coalesce(p->>'email', '')), 200), ''),
          nullif(left(trim(coalesce(p->>'city', '')), 80), ''), nullif(left(trim(coalesce(p->>'level', '')), 40), ''),
          nullif(left(trim(coalesce(p->>'message', '')), 1000), ''));
end;
$$;
revoke all on function public.course_enquiry(jsonb) from public;
grant execute on function public.course_enquiry(jsonb) to anon, authenticated;
