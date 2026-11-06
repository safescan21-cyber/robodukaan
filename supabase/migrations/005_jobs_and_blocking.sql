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
