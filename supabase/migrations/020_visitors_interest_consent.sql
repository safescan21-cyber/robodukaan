-- PCBDukaan update 020: live visitors, product interest of logged-in customers, marketing-email consent.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── Consent: customers choose whether they want offers / product updates by email (DPDP Act 2023) ──
alter table public.profiles add column if not exists marketing_ok    boolean not null default false;
alter table public.profiles add column if not exists marketing_ok_at timestamptz;

create or replace function public.profile_marketing_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Ticked on the registration form (stored with the sign-up details).
    new.marketing_ok := coalesce((select (u.raw_user_meta_data->>'marketing_ok')::boolean from auth.users u where u.id = new.id), false);
  end if;
  if tg_op = 'INSERT' or new.marketing_ok is distinct from old.marketing_ok then
    new.marketing_ok_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_marketing_consent on public.profiles;
create trigger profiles_marketing_consent before insert or update of marketing_ok on public.profiles
  for each row execute function public.profile_marketing_consent();

-- ── Who is on the site now (one row per browser tab session; kept 2 days) ──────────────
create table if not exists public.site_presence (
  session_id uuid primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  path       text,
  product_id uuid references public.products(id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
create index if not exists site_presence_last_seen_idx on public.site_presence(last_seen desc);
alter table public.site_presence enable row level security;
drop policy if exists "presence: admin read" on public.site_presence;
create policy "presence: admin read" on public.site_presence for select using (public.is_admin());

-- ── Product views (kept 180 days) ───────────────────────────────────────────────────────
create table if not exists public.product_views (
  id         bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  session_id uuid,
  viewed_at  timestamptz not null default now()
);
create index if not exists product_views_product_idx on public.product_views(product_id, viewed_at desc);
create index if not exists product_views_user_idx on public.product_views(user_id, viewed_at desc) where user_id is not null;
alter table public.product_views enable row level security;
drop policy if exists "views: admin read" on public.product_views;
create policy "views: admin read" on public.product_views for select using (public.is_admin());

-- Called by the website every ~60 s while a page is open, and on every page change.
create or replace function public.track_visit(p_session uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_path text := left(coalesce(p_path, ''), 200);
  v_slug text;
  v_product uuid;
begin
  if p_session is null or v_path !~ '^/' then return; end if;
  if public.is_admin() then return; end if;                         -- don't count the shop's own admins
  if v_path ~ '^/([a-z]{2}/)?(admin|vendor)(/|$)' then return; end if;
  -- Flood protection: ignore new sessions when far more than a normal shop's traffic is arriving.
  if not exists (select 1 from public.site_presence where session_id = p_session)
     and (select count(*) from public.site_presence where first_seen > now() - interval '5 minutes') > 3000 then
    return;
  end if;
  v_slug := substring(v_path from '^/(?:[a-z]{2}/)?products/([a-z0-9-]+)/?$');
  if v_slug is not null then
    select id into v_product from public.products where slug = v_slug and is_active;
  end if;
  insert into public.site_presence (session_id, user_id, path, product_id)
  values (p_session, auth.uid(), v_path, v_product)
  on conflict (session_id) do update
    set last_seen = now(), path = excluded.path, product_id = excluded.product_id,
        user_id = coalesce(excluded.user_id, site_presence.user_id);
  -- One view per product per session per 30 minutes.
  if v_product is not null and not exists (
    select 1 from public.product_views
    where session_id = p_session and product_id = v_product and viewed_at > now() - interval '30 minutes') then
    insert into public.product_views (product_id, user_id, session_id) values (v_product, auth.uid(), p_session);
  end if;
  -- Housekeeping now and then.
  if random() < 0.01 then
    delete from public.site_presence where last_seen < now() - interval '2 days';
    delete from public.product_views where viewed_at < now() - interval '180 days';
  end if;
end;
$$;
revoke all on function public.track_visit(uuid, text) from public;
grant execute on function public.track_visit(uuid, text) to anon, authenticated;

-- Admin → Visitors: who is on the site now and today's numbers.
create or replace function public.admin_live_visitors()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'online', (select count(*) from public.site_presence where last_seen > now() - interval '3 minutes'),
    'online_logged_in', (select count(*) from public.site_presence where last_seen > now() - interval '3 minutes' and user_id is not null),
    'today_visitors', (select count(*) from public.site_presence where first_seen >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'today_product_views', (select count(*) from public.product_views where viewed_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'people', (select coalesce(jsonb_agg(x order by x->>'last_seen' desc), '[]') from (
        select jsonb_build_object('name', p.full_name, 'email', p.email, 'phone', p.phone, 'marketing_ok', p.marketing_ok,
               'path', s.path, 'product', pr.name, 'last_seen', s.last_seen) x
        from public.site_presence s
        join public.profiles p on p.id = s.user_id
        left join public.products pr on pr.id = s.product_id
        where s.last_seen > now() - interval '3 minutes') t),
    'pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visitors', n) order by n desc), '[]') from (
        select path, count(*) n from public.site_presence where last_seen > now() - interval '3 minutes' group by path order by n desc limit 15) t),
    'top_products_today', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'views', n) order by n desc), '[]') from (
        select pr.name, pr.slug, count(*) n from public.product_views v join public.products pr on pr.id = v.product_id
        where v.viewed_at > now() - interval '24 hours' group by pr.name, pr.slug order by n desc limit 10) t));
end;
$$;
revoke all on function public.admin_live_visitors() from public;
grant execute on function public.admin_live_visitors() to authenticated;

-- Admin → Interested customers: logged-in customers who viewed products, with consent status.
create or replace function public.admin_interested_customers(p_product uuid default null, p_days int default 30)
returns table (user_id uuid, full_name text, email text, phone text, marketing_ok boolean,
               product_id uuid, product_name text, product_slug text, views bigint, last_viewed timestamptz,
               in_wishlist boolean, ordered boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select p.id, p.full_name, p.email, p.phone, p.marketing_ok, pr.id, pr.name, pr.slug,
         count(*), max(v.viewed_at),
         exists (select 1 from public.wishlist w where w.user_id = p.id and w.product_id = pr.id),
         exists (select 1 from public.orders o join public.order_items i on i.order_id = o.id
                 where o.user_id = p.id and i.product_id = pr.id and o.status <> 'cancelled')
  from public.product_views v
  join public.profiles p on p.id = v.user_id
  join public.products pr on pr.id = v.product_id
  where v.viewed_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 180)))
    and (p_product is null or pr.id = p_product)
    and p.role <> 'admin'
  group by p.id, p.full_name, p.email, p.phone, p.marketing_ok, pr.id, pr.name, pr.slug
  order by max(v.viewed_at) desc
  limit 1000;
end;
$$;
revoke all on function public.admin_interested_customers(uuid, int) from public;
grant execute on function public.admin_interested_customers(uuid, int) to authenticated;
