-- PCBDukaan update 014: "Notify me when back in stock".
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

create table if not exists public.stock_alerts (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  email       text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  notified_at timestamptz
);
-- One open request per email per product.
create unique index if not exists stock_alerts_open_key on public.stock_alerts(product_id, lower(email)) where notified_at is null;
create index if not exists stock_alerts_pending_idx on public.stock_alerts(product_id) where notified_at is null;
alter table public.stock_alerts enable row level security;
drop policy if exists "stock alerts: admin read" on public.stock_alerts;
drop policy if exists "stock alerts: admin update" on public.stock_alerts;
drop policy if exists "stock alerts: admin delete" on public.stock_alerts;
create policy "stock alerts: admin read" on public.stock_alerts for select using (public.is_admin());
create policy "stock alerts: admin update" on public.stock_alerts for update using (public.is_admin());
create policy "stock alerts: admin delete" on public.stock_alerts for delete using (public.is_admin());
-- No insert policy: requests come in through request_stock_alert() (checks + spam limits).

create or replace function public.request_stock_alert(p_product uuid, p_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'Please enter a valid email';
  end if;
  if not exists (select 1 from public.products where id = p_product and is_active) then
    raise exception 'Product not found';
  end if;
  -- Spam limits: 20 requests per email per day, 300 per hour overall.
  if (select count(*) from public.stock_alerts where lower(email) = v_email and created_at > now() - interval '1 day') >= 20
     or (select count(*) from public.stock_alerts where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Too many requests – please try again later';
  end if;
  insert into public.stock_alerts (product_id, email, user_id)
  values (p_product, v_email, auth.uid())
  on conflict (product_id, lower(email)) where notified_at is null do nothing;
  return true;
end;
$$;
revoke all on function public.request_stock_alert(uuid, text) from public;
grant execute on function public.request_stock_alert(uuid, text) to anon, authenticated;
