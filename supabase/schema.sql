-- RoboDukaan database schema (v2: accounts, admin, reviews, wishlist, coupons, banners)
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.

create extension if not exists pgcrypto;

-- ═══════════════════════════ Tables ═══════════════════════════

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  role       text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null default 'Home' check (label in ('Home','Office','Other')),
  full_name    text not null,
  phone        text not null,
  address_line text not null,
  city         text not null,
  state        text not null,
  pincode      text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);

create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text not null default 'chip',
  image_url   text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.categories add column if not exists image_url text;

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  sku               text not null unique,
  name              text not null,
  brand             text,
  category_id       bigint not null references public.categories(id) on delete restrict,
  short_description text,
  description       text,
  price             numeric(10,2) not null check (price >= 0),
  mrp               numeric(10,2) check (mrp is null or mrp >= price),
  stock             int not null default 0 check (stock >= 0),
  image_url         text,
  specs             jsonb not null default '{}'::jsonb,
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- v2 product fields
alter table public.products add column if not exists images            text[] not null default '{}';
alter table public.products add column if not exists faqs              jsonb  not null default '[]'::jsonb;
alter table public.products add column if not exists documents         jsonb  not null default '[]'::jsonb;
alter table public.products add column if not exists warranty_months   int    not null default 0;
alter table public.products add column if not exists ready_to_dispatch boolean not null default true;
alter table public.products add column if not exists rating_avg        numeric(3,2) not null default 0;
alter table public.products add column if not exists rating_count      int    not null default 0;
alter table public.products add column if not exists sold_count        int    not null default 0;

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_featured_idx on public.products(is_featured) where is_active;

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  user_name  text not null default 'Customer',
  rating     int  not null check (rating between 1 and 5),
  comment    text not null check (length(comment) between 2 and 1500),
  verified   boolean not null default false,
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.reviews(product_id);

create table if not exists public.wishlist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  description    text,
  discount_type  text not null check (discount_type in ('percent','flat')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_discount   numeric(10,2),
  min_order      numeric(10,2) not null default 0,
  starts_at      timestamptz,
  ends_at        timestamptz,
  usage_limit    int,
  used_count     int not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.banners (
  id         bigint generated always as identity primary key,
  title      text not null,
  subtitle   text,
  cta_label  text default 'Shop now',
  link       text not null default '/products',
  image_url  text,
  theme      text not null default 'blue' check (theme in ('blue','orange','dark','green')),
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique,
  customer_name  text not null,
  phone          text not null,
  email          text,
  address_line   text not null,
  city           text not null,
  state          text not null,
  pincode        text not null,
  notes          text,
  payment_method text not null default 'cod',
  status         text not null default 'pending',
  subtotal       numeric(10,2) not null,
  shipping       numeric(10,2) not null,
  total          numeric(10,2) not null,
  created_at     timestamptz not null default now()
);
-- v2 order fields
alter table public.orders add column if not exists user_id        uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists discount       numeric(10,2) not null default 0;
alter table public.orders add column if not exists coupon_code    text;
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists tracking_url   text;
alter table public.orders add column if not exists updated_at     timestamptz not null default now();
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','confirmed','packed','shipped','delivered','cancelled'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending','paid','refunded'));
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,
  sku         text not null,
  unit_price  numeric(10,2) not null,
  quantity    int not null check (quantity > 0),
  line_total  numeric(10,2) not null
);
alter table public.order_items add column if not exists slug text;
alter table public.order_items add column if not exists image_url text;
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ═══════════════════════ Helpers & triggers ═══════════════════════

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New sign-ups get a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can't promote themselves: only admins (or the SQL Editor) may change a role.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL Editor / service role, which may change roles.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Keep product rating summary in sync with visible reviews.
create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where product_id = pid and not is_hidden), 0),
    rating_count = (select count(*) from public.reviews where product_id = pid and not is_hidden)
  where p.id = pid;
  return null;
end;
$$;
drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- Reviews: mark verified buyers; customers can't set verified/is_hidden themselves.
create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.is_hidden := old.is_hidden;
    else
      new.is_hidden := false;
    end if;
    new.user_id := auth.uid();
    new.user_name := coalesce((select nullif(full_name,'') from public.profiles where id = auth.uid()), 'Customer');
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.user_id = auth.uid() and i.product_id = new.product_id and o.status <> 'cancelled');
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_prepare on public.reviews;
create trigger reviews_prepare before insert or update on public.reviews
  for each row execute function public.prepare_review();

-- ═══════════════════════ Row Level Security ═══════════════════════

alter table public.profiles    enable row level security;
alter table public.addresses   enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.reviews     enable row level security;
alter table public.wishlist    enable row level security;
alter table public.coupons     enable row level security;
alter table public.banners     enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles','addresses','categories','products','reviews','wishlist','coupons','banners','orders','order_items')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy "profiles: read own or admin"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- addresses
create policy "addresses: own" on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- catalog
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "products: public read active" on public.products for select using (is_active or public.is_admin());
create policy "products: admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "banners: public read active" on public.banners for select using (is_active or public.is_admin());
create policy "banners: admin write" on public.banners for all using (public.is_admin()) with check (public.is_admin());

-- reviews
create policy "reviews: public read visible" on public.reviews for select using (not is_hidden or user_id = auth.uid() or public.is_admin());
create policy "reviews: write own" on public.reviews for insert with check (auth.uid() is not null);
create policy "reviews: update own or admin" on public.reviews for update using (user_id = auth.uid() or public.is_admin());
create policy "reviews: delete own or admin" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

-- wishlist
create policy "wishlist: own" on public.wishlist for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- coupons (customers check codes through check_coupon())
create policy "coupons: admin" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- orders (created only through place_order())
create policy "orders: read own or admin" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin update" on public.orders for update using (public.is_admin());
create policy "order_items: read own or admin" on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ═══════════════════════ Store functions ═══════════════════════

create or replace function public.shipping_for(subtotal numeric)
returns numeric language sql immutable as $$
  select case when subtotal >= 499 or subtotal = 0 then 0 else 49 end::numeric;
$$;

-- Validates a coupon for a subtotal. Returns {valid, code, discount, message}.
create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
  v_code text := upper(trim(coalesce(p_code,'')));
  v_discount numeric(10,2);
begin
  if v_code = '' then
    return jsonb_build_object('valid', false, 'message', 'Please enter a coupon code.');
  end if;
  select * into c from public.coupons where code = v_code and is_active;
  if not found then
    return jsonb_build_object('valid', false, 'code', v_code, 'message', 'This coupon code isn''t valid.');
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    return jsonb_build_object('valid', false, 'code', v_code, 'message', 'This coupon isn''t active yet.');
  end if;
  if c.ends_at is not null and c.ends_at <= now() then
    return jsonb_build_object('valid', false, 'code', v_code, 'message', 'This coupon has expired.');
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'code', v_code, 'message', 'This coupon has been fully used.');
  end if;
  if p_subtotal < c.min_order then
    return jsonb_build_object('valid', false, 'code', v_code,
      'message', format('Add ₹%s more to use this code (minimum order ₹%s).',
                        trim(to_char(c.min_order - p_subtotal, 'FM9999990')), trim(to_char(c.min_order, 'FM9999990'))));
  end if;
  v_discount := case when c.discount_type = 'percent' then p_subtotal * c.discount_value / 100 else c.discount_value end;
  if c.discount_type = 'percent' and c.max_discount is not null then
    v_discount := least(v_discount, c.max_discount);
  end if;
  v_discount := round(least(v_discount, p_subtotal), 2);
  return jsonb_build_object('valid', true, 'code', v_code, 'discount', v_discount,
    'message', format('%s applied — you save ₹%s!', v_code, trim(to_char(v_discount, 'FM9999990.##'))));
end;
$$;

drop function if exists public.place_order(jsonb, jsonb);

-- Places a cash-on-delivery order. Prices, stock, coupon and totals are all
-- computed here from the database, never trusted from the browser.
create or replace function public.place_order(items jsonb, customer jsonb, coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     numeric(10,2) := 0;
  v_discount     numeric(10,2) := 0;
  v_shipping     numeric(10,2);
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

  v_order_number := 'RD' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
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

    update public.products
       set stock = stock - v_qty, sold_count = sold_count + v_qty, updated_at = now()
     where id = v_product.id;

    insert into public.order_items (order_id, product_id, name, sku, slug, image_url, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.sku, v_product.slug,
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

  update public.orders
     set subtotal = v_subtotal, discount = v_discount, coupon_code = v_coupon->>'code',
         shipping = v_shipping, total = v_subtotal - v_discount + v_shipping
   where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', v_shipping,
    'total', v_subtotal - v_discount + v_shipping
  );
end;
$$;

-- Lets anyone look up an order with order number + phone.
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

-- Admins changing an order to cancelled also returns stock.
create or replace function public.restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p set stock = p.stock + i.quantity, sold_count = greatest(0, p.sold_count - i.quantity)
      from public.order_items i where i.order_id = new.id and i.product_id = p.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists orders_restock_on_cancel on public.orders;
create trigger orders_restock_on_cancel before update on public.orders
  for each row execute function public.restock_on_cancel();

-- Customers may cancel their own order while it is still pending/confirmed (the trigger above returns stock).
create or replace function public.cancel_my_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status not in ('pending','confirmed') then
    raise exception 'This order can no longer be cancelled';
  end if;
  update public.orders set status = 'cancelled' where id = o.id;  -- trigger restocks
end;
$$;

-- Dashboard numbers for admins.
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'revenue',        (select coalesce(sum(total),0) from public.orders where status <> 'cancelled'),
    'orders',         (select count(*) from public.orders),
    'pending_orders', (select count(*) from public.orders where status in ('pending','confirmed','packed')),
    'products',       (select count(*) from public.products),
    'low_stock',      (select count(*) from public.products where is_active and stock <= 5),
    'customers',      (select count(*) from public.profiles),
    'reviews',        (select count(*) from public.reviews),
    'sales_by_day',   (select coalesce(jsonb_agg(d order by d->>'day'), '[]'::jsonb) from (
                         select jsonb_build_object('day', to_char(g.day, 'YYYY-MM-DD'),
                                'total', coalesce(sum(o.total), 0), 'orders', count(o.id)) d
                         from generate_series((now() at time zone 'Asia/Kolkata')::date - 13,
                                              (now() at time zone 'Asia/Kolkata')::date, '1 day') g(day)
                         left join public.orders o
                           on (o.created_at at time zone 'Asia/Kolkata')::date = g.day and o.status <> 'cancelled'
                         group by g.day) s),
    'top_products',   (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                         select name, slug, sold_count, stock from public.products
                         where sold_count > 0 order by sold_count desc limit 5) t)
  );
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text) from public;
revoke all on function public.track_order(text, text) from public;
revoke all on function public.check_coupon(text, numeric) from public;
revoke all on function public.cancel_my_order(uuid) from public;
revoke all on function public.admin_stats() from public;
grant execute on function public.place_order(jsonb, jsonb, text) to authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.check_coupon(text, numeric) to anon, authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.admin_stats() to authenticated;

-- ═══════════════════════ Storage (product images) ═══════════════════════

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product-images: public read" on storage.objects;
drop policy if exists "product-images: admin write" on storage.objects;
drop policy if exists "product-images: admin update" on storage.objects;
drop policy if exists "product-images: admin delete" on storage.objects;
create policy "product-images: public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product-images: admin write" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin update" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin delete" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- Backfill profiles for anyone who signed up before this script ran.
insert into public.profiles (id, email, full_name)
select id, email, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;


-- ═══════════════════════ v3: emails & PCB repair requests ═══════════════════════

alter table public.profiles add column if not exists welcome_sent_at timestamptz;
alter table public.orders   add column if not exists email_sent_at   timestamptz;

create table if not exists public.repair_requests (
  id             uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  phone          text not null,
  email          text,
  board_type     text not null,
  device         text,
  problem        text not null check (length(problem) between 5 and 3000),
  quantity       int  not null default 1 check (quantity between 1 and 1000),
  photos         text[] not null default '{}',
  status         text not null default 'new'
                 check (status in ('new','reviewing','quoted','approved','in_repair','repaired','returned','rejected','cancelled')),
  quote_amount   numeric(10,2),
  admin_notes    text,
  email_sent_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists repair_requests_user_idx on public.repair_requests(user_id);
create index if not exists repair_requests_created_idx on public.repair_requests(created_at desc);

-- Customers can only create "new" requests for themselves; admins set status/quote/notes.
create or replace function public.prepare_repair_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.request_number := 'PR' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
                          || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    if not public.is_admin() then
      new.user_id := auth.uid();
      new.status := 'new';
      new.quote_amount := null;
      new.admin_notes := null;
      new.email_sent_at := null;
      new.email := coalesce(nullif(trim(new.email), ''), (select email from auth.users where id = auth.uid()));
      if array_length(new.photos, 1) > 8 then raise exception 'Up to 8 photos per request'; end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists repair_requests_prepare on public.repair_requests;
create trigger repair_requests_prepare before insert or update on public.repair_requests
  for each row execute function public.prepare_repair_request();

alter table public.repair_requests enable row level security;
drop policy if exists "repairs: read own or admin" on public.repair_requests;
drop policy if exists "repairs: create own" on public.repair_requests;
drop policy if exists "repairs: admin update" on public.repair_requests;
drop policy if exists "repairs: admin delete" on public.repair_requests;
create policy "repairs: read own or admin" on public.repair_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "repairs: create own" on public.repair_requests for insert with check (auth.uid() is not null);
create policy "repairs: admin update" on public.repair_requests for update using (public.is_admin());
create policy "repairs: admin delete" on public.repair_requests for delete using (public.is_admin());

-- Private photo storage: customers upload into their own folder ({user id}/...), admins see all.
insert into storage.buckets (id, name, public)
values ('pcb-repairs', 'pcb-repairs', false)
on conflict (id) do update set public = false;

drop policy if exists "pcb-repairs: upload own" on storage.objects;
drop policy if exists "pcb-repairs: read own or admin" on storage.objects;
drop policy if exists "pcb-repairs: delete own or admin" on storage.objects;
create policy "pcb-repairs: upload own" on storage.objects for insert
  with check (bucket_id = 'pcb-repairs' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pcb-repairs: read own or admin" on storage.objects for select
  using (bucket_id = 'pcb-repairs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "pcb-repairs: delete own or admin" on storage.objects for delete
  using (bucket_id = 'pcb-repairs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- "Send this email only once" helpers used by the website's email routes.
create or replace function public.claim_order_email(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.orders set email_sent_at = now()
   where id = p_order_id and email_sent_at is null and (user_id = auth.uid() or public.is_admin());
  return found;
end;
$$;

create or replace function public.claim_welcome_email()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set welcome_sent_at = now() where id = auth.uid() and welcome_sent_at is null;
  return found;
end;
$$;

create or replace function public.claim_repair_email(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.repair_requests set email_sent_at = now()
   where id = p_request_id and email_sent_at is null and (user_id = auth.uid() or public.is_admin());
  return found;
end;
$$;

revoke all on function public.claim_order_email(uuid) from public;
revoke all on function public.claim_welcome_email() from public;
revoke all on function public.claim_repair_email(uuid) from public;
grant execute on function public.claim_order_email(uuid) to authenticated;
grant execute on function public.claim_welcome_email() to authenticated;
grant execute on function public.claim_repair_email(uuid) to authenticated;
