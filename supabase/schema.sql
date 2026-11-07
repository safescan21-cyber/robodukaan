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

-- v6: GST & HSN
alter table public.categories  add column if not exists hsn_code   text;
alter table public.products    add column if not exists hsn_code   text;
alter table public.order_items add column if not exists hsn_code   text;
alter table public.orders      add column if not exists gst_rate   numeric(5,2) not null default 0;
alter table public.orders      add column if not exists gst_amount numeric(10,2) not null default 0;
create or replace function public.gst_rate()
returns numeric language sql immutable as $$ select 18::numeric $$;

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

-- ═══════════════════════ v4: videos & customer details for admins ═══════════════════════

alter table public.banners  add column if not exists video_url text;
alter table public.products add column if not exists videos text[] not null default '{}';

-- Admins can see customers' saved addresses (customers still only see their own).
drop policy if exists "addresses: admin read" on public.addresses;
create policy "addresses: admin read" on public.addresses for select using (public.is_admin());

-- Customer list with login info and order totals, for the admin panel.
create or replace function public.admin_customers(p_search text default null, p_user uuid default null)
returns table (
  id uuid, email text, full_name text, phone text, role text, created_at timestamptz,
  last_sign_in_at timestamptz, email_confirmed boolean, orders bigint, spent numeric, repairs bigint
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
         (select count(*) from public.repair_requests r where r.user_id = p.id)
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


-- PCBDukaan update 007: GST invoice numbers (CGST Rule 46).
-- Consecutive serial per financial year (April–March), unique, max 16 characters:
--   PD/2026-27/0001, PD/2026-27/0002, … restarting at 0001 every 1 April.
-- A number is issued only when an admin clicks "Issue invoice" for an order, never reused,
-- and cannot be changed afterwards. Paste into Supabase → SQL Editor → Run. Safe to run more than once.

alter table public.orders add column if not exists invoice_number text;
alter table public.orders add column if not exists invoice_date date;
create unique index if not exists orders_invoice_number_key on public.orders(invoice_number) where invoice_number is not null;

-- One row per financial year: the last serial used.
create table if not exists public.invoice_counters (
  financial_year text primary key,   -- '2026-27'
  last_serial integer not null default 0
);
alter table public.invoice_counters enable row level security;
-- No policies: only the function below (security definer) touches it.

-- Issues the next invoice number for an order (admins only). Returns the number.
-- Calling it again for the same order returns the same number.
create or replace function public.issue_invoice(p_order_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  o record;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  start_year int;
  fy text;
  serial int;
  num text;
begin
  if not public.is_admin() then raise exception 'Only admins can issue invoices'; end if;

  select id, status, invoice_number into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.invoice_number is not null then return o.invoice_number; end if;
  if o.status = 'cancelled' then raise exception 'Cancelled orders do not get an invoice number'; end if;

  start_year := extract(year from today)::int - case when extract(month from today) < 4 then 1 else 0 end;
  fy := start_year || '-' || lpad(((start_year + 1) % 100)::text, 2, '0');

  insert into public.invoice_counters as c (financial_year, last_serial) values (fy, 1)
  on conflict (financial_year) do update set last_serial = c.last_serial + 1
  returning last_serial into serial;

  num := 'PD/' || fy || '/' || lpad(serial::text, 4, '0');
  perform set_config('pcbdukaan.issuing_invoice', '1', true);
  update public.orders set invoice_number = num, invoice_date = today where id = p_order_id;
  perform set_config('pcbdukaan.issuing_invoice', '', true);
  return num;
end;
$$;
revoke all on function public.issue_invoice(uuid) from public;
grant execute on function public.issue_invoice(uuid) to authenticated;

-- Once issued, an invoice number and date can never be changed or removed.
create or replace function public.lock_invoice_number()
returns trigger language plpgsql as $$
begin
  if old.invoice_number is not null
     and (new.invoice_number is distinct from old.invoice_number or new.invoice_date is distinct from old.invoice_date) then
    raise exception 'Invoice number % is already issued and cannot be changed', old.invoice_number;
  end if;
  -- New numbers may only come from issue_invoice(), which sets this flag for its own transaction.
  if old.invoice_number is null
     and (new.invoice_number is not null or new.invoice_date is not null)
     and coalesce(current_setting('pcbdukaan.issuing_invoice', true), '') <> '1' then
    raise exception 'Invoice numbers are issued with issue_invoice() only';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_lock_invoice_number on public.orders;
create trigger orders_lock_invoice_number before update on public.orders
  for each row execute function public.lock_invoice_number();


-- PCBDukaan update 008: data for the daily email report (sales, orders, stock, repairs, jobs).
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- The last line shows your REPORT CODE: copy it and paste it on the server when
-- `sudo bash /opt/robodukaan/deploy/set-report.sh` asks for it.

-- A secret code that only the server's report job knows. Kept in a schema the website API can't read.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.report_token (
  id    int primary key default 1 check (id = 1),
  token text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
insert into private.report_token (id) values (1) on conflict (id) do nothing;

-- Returns the report numbers (yesterday, last 7 days, month to date, …) as JSON — only with the right code.
create or replace function public.daily_report(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  d date := today - 1;                        -- the day being reported (yesterday, IST)
  d_start timestamptz := (d::timestamp at time zone 'Asia/Kolkata');
  d_end   timestamptz := ((d + 1)::timestamp at time zone 'Asia/Kolkata');
  w_start timestamptz := ((d - 6)::timestamp at time zone 'Asia/Kolkata');   -- last 7 days incl. d
  pw_start timestamptz := ((d - 13)::timestamp at time zone 'Asia/Kolkata'); -- the 7 days before that
  m_start timestamptz := (date_trunc('month', d)::timestamp at time zone 'Asia/Kolkata');
begin
  if p_token is null or p_token <> (select token from private.report_token where id = 1) then
    raise exception 'Invalid report code';
  end if;

  return jsonb_build_object(
    'day', d,
    'sales', (
      select jsonb_object_agg(period, x) from (
        select p.period, jsonb_build_object(
          'orders',    count(o.*) filter (where o.status <> 'cancelled'),
          'revenue',   coalesce(sum(o.total)      filter (where o.status <> 'cancelled'), 0),
          'gst',       coalesce(sum(o.gst_amount) filter (where o.status <> 'cancelled'), 0),
          'discounts', coalesce(sum(o.discount)   filter (where o.status <> 'cancelled'), 0),
          'cancelled', count(o.*) filter (where o.status = 'cancelled'),
          'customers', count(distinct coalesce(o.user_id::text, o.phone)) filter (where o.status <> 'cancelled')
        ) as x
        from (values ('yesterday', d_start, d_end), ('last7', w_start, d_end), ('prev7', pw_start, w_start), ('month', m_start, d_end))
             as p(period, s, e)
        left join public.orders o on o.created_at >= p.s and o.created_at < p.e
        group by p.period
      ) t
    ),
    'open_orders', (
      select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) n from public.orders where status in ('pending','confirmed','packed') group by status
      ) t
    ),
    'waiting_over_24h', (
      select coalesce(jsonb_agg(jsonb_build_object('order', order_number, 'customer', customer_name, 'city', city,
                                                   'total', total, 'status', status, 'hours', floor(extract(epoch from now() - created_at) / 3600))
                                order by created_at), '[]')
      from (select * from public.orders where status in ('pending','confirmed') and created_at < now() - interval '24 hours'
            order by created_at limit 15) t
    ),
    'unpaid_delivered', (select count(*) from public.orders where status = 'delivered' and payment_status = 'pending'),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.qty desc, t.revenue desc), '[]') from (
        select oi.name, oi.sku, sum(oi.quantity) qty, sum(oi.line_total) revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where o.created_at >= w_start and o.created_at < d_end and o.status <> 'cancelled'
        group by oi.name, oi.sku order by sum(oi.quantity) desc, sum(oi.line_total) desc limit 5
      ) t
    ),
    'low_stock', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'sku', sku, 'stock', stock) order by stock, name), '[]')
      from (select name, sku, stock from public.products where is_active and stock <= 3 order by stock, name limit 20) t
    ),
    'catalog', (select jsonb_build_object('active', count(*) filter (where is_active),
                                          'hidden', count(*) filter (where not is_active),
                                          'out_of_stock', count(*) filter (where is_active and stock = 0),
                                          'no_photo', count(*) filter (where is_active and coalesce(image_url, '') = '' and coalesce(cardinality(images), 0) = 0))
                from public.products),
    'customers', jsonb_build_object(
      'new_yesterday', (select count(*) from public.profiles where created_at >= d_start and created_at < d_end),
      'new_last7',     (select count(*) from public.profiles where created_at >= w_start and created_at < d_end),
      'total',         (select count(*) from public.profiles)
    ),
    'repairs', jsonb_build_object(
      'new_yesterday', (select count(*) from public.repair_requests where created_at >= d_start and created_at < d_end),
      'open', (select coalesce(jsonb_object_agg(status, n), '{}') from (
                 select status, count(*) n from public.repair_requests
                 where status in ('new','reviewing','quoted','approved','in_repair') group by status) t)
    ),
    'jobs', jsonb_build_object(
      'applications_yesterday', (select count(*) from public.job_applications where created_at >= d_start and created_at < d_end),
      'unreviewed', (select count(*) from public.job_applications where status = 'new')
    ),
    'reviews_yesterday', (select count(*) from public.reviews where created_at >= d_start and created_at < d_end)
  );
end;
$$;
revoke all on function public.daily_report(text) from public;
grant execute on function public.daily_report(text) to anon, authenticated;

-- Your report code (copy the long value shown below):
select token as "REPORT CODE – copy this" from private.report_token;


-- PCBDukaan update 009: business buyers (company + GSTIN on orders), bulk quote requests,
-- urgent / exchange repair requests, part-number cross-reference on products.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── Company name + GSTIN on orders (shown on the tax invoice) ──────────────────────
alter table public.orders add column if not exists buyer_company text;
alter table public.orders add column if not exists buyer_gstin   text;

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
  v_gstin        text := upper(nullif(regexp_replace(coalesce(customer->>'gstin',''), '\s', '', 'g'), ''));
  v_company      text := nullif(trim(coalesce(customer->>'company','')), '');
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

  -- Business buyers: GSTIN on the invoice for input tax credit (15 characters, e.g. 27AAACP1234Q1Z5).
  if v_gstin is not null and v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then
    raise exception 'Please enter a valid 15-character GSTIN (or leave it empty)';
  end if;
  if v_gstin is not null and v_company is null then
    raise exception 'Please enter the company name for the GST invoice';
  end if;
  if length(coalesce(v_company, '')) > 120 then
    raise exception 'Company name is too long';
  end if;

  v_order_number := 'PD' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
                    || upper(substr(md5(gen_random_uuid()::text), 1, 5));

  insert into public.orders (order_number, user_id, customer_name, phone, email, address_line,
                             city, state, pincode, notes, buyer_company, buyer_gstin, subtotal, shipping, total)
  values (v_order_number, auth.uid(),
          trim(customer->>'name'), v_phone,
          coalesce(nullif(trim(customer->>'email'),''), (select email from auth.users where id = auth.uid())),
          trim(customer->>'address_line'), trim(customer->>'city'), trim(customer->>'state'),
          customer->>'pincode', nullif(trim(customer->>'notes'),''), v_company, v_gstin, 0, 0, 0)
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

-- ── Bulk quote requests (from product pages; guests allowed) ───────────────────────
create table if not exists public.quote_requests (
  id            uuid primary key default gen_random_uuid(),
  quote_number  text not null unique,
  user_id       uuid references auth.users(id) on delete set null,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text,
  quantity      int  not null check (quantity between 1 and 100000),
  name          text not null,
  company       text,
  gstin         text,
  phone         text not null,
  email         text,
  city          text,
  message       text,
  status        text not null default 'new' check (status in ('new','quoted','won','lost')),
  quoted_amount numeric(12,2),
  admin_notes   text,
  created_at    timestamptz not null default now()
);
create index if not exists quote_requests_created_idx on public.quote_requests(created_at desc);
create index if not exists quote_requests_phone_idx on public.quote_requests(phone, created_at desc);
alter table public.quote_requests enable row level security;
drop policy if exists "quotes: read own or admin" on public.quote_requests;
drop policy if exists "quotes: admin update" on public.quote_requests;
drop policy if exists "quotes: admin delete" on public.quote_requests;
create policy "quotes: read own or admin" on public.quote_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "quotes: admin update" on public.quote_requests for update using (public.is_admin());
create policy "quotes: admin delete" on public.quote_requests for delete using (public.is_admin());
-- No insert policy: requests come in only through request_quote() below (checks + spam limits).

create or replace function public.request_quote(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone   text := regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g');
  v_gstin   text := upper(nullif(regexp_replace(coalesce(p->>'gstin',''), '\s', '', 'g'), ''));
  v_qty     int;
  v_product public.products%rowtype;
  v_number  text;
  v_id      uuid;
begin
  if v_phone ~ '^91\d{10}$' then v_phone := substr(v_phone, 3); end if;
  if v_phone !~ '^[6-9]\d{9}$' then raise exception 'Please enter a valid 10-digit mobile number'; end if;
  if length(trim(coalesce(p->>'name',''))) < 2 then raise exception 'Please enter your name'; end if;
  begin v_qty := (p->>'quantity')::int; exception when others then v_qty := null; end;
  if v_qty is null or v_qty < 1 or v_qty > 100000 then raise exception 'Please enter a quantity'; end if;
  if v_gstin is not null and v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then
    raise exception 'Please enter a valid 15-character GSTIN (or leave it empty)';
  end if;
  if length(coalesce(p->>'message','')) > 2000 or length(coalesce(p->>'company','')) > 120 then
    raise exception 'Text is too long';
  end if;
  if nullif(trim(coalesce(p->>'email','')), '') is not null and (p->>'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email';
  end if;
  -- Spam limits: 5 requests per mobile number per day, 60 per hour overall.
  if (select count(*) from public.quote_requests where phone = v_phone and created_at > now() - interval '1 day') >= 5
     or (select count(*) from public.quote_requests where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many requests – please call or email us instead';
  end if;
  if nullif(p->>'product_id','') is not null then
    select * into v_product from public.products where id = (p->>'product_id')::uuid and is_active;
  end if;

  v_number := 'Q' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || upper(substr(md5(gen_random_uuid()::text), 1, 4));
  insert into public.quote_requests (quote_number, user_id, product_id, product_name, quantity, name, company, gstin, phone, email, city, message)
  values (v_number, auth.uid(), v_product.id, coalesce(v_product.name, nullif(trim(p->>'product_name'), '')), v_qty,
          trim(p->>'name'), nullif(trim(coalesce(p->>'company','')), ''), v_gstin, v_phone,
          coalesce(nullif(trim(coalesce(p->>'email','')), ''), (select email from auth.users where id = auth.uid())),
          nullif(trim(coalesce(p->>'city','')), ''), nullif(trim(coalesce(p->>'message','')), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'quote_number', v_number);
end;
$$;
revoke all on function public.request_quote(jsonb) from public;
grant execute on function public.request_quote(jsonb) to anon, authenticated;

-- ── Repair requests: "machine stopped" priority and board-exchange wish ────────────
alter table public.repair_requests add column if not exists urgent boolean not null default false;
alter table public.repair_requests add column if not exists wants_exchange boolean not null default false;
-- Extra safeguard (the repair_requests_prepare trigger already forces user_id and clears quote fields):
-- customers may only create requests for themselves, as new and without a quote.
drop policy if exists "repairs: create own" on public.repair_requests;
create policy "repairs: create own" on public.repair_requests for insert
  with check (user_id = auth.uid() and status = 'new' and quote_amount is null and admin_notes is null);

-- ── Products: part numbers this product replaces (Omron, Siemens, … cross-reference) ─
alter table public.products add column if not exists equivalents text;


-- PCBDukaan update 010: "New arrival" flag on products + technical data files (datasheets, manuals,
-- drawings) that the admin uploads and customers download.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── New arrivals: the admin ticks which products appear in "New arrivals" ──────────
alter table public.products add column if not exists is_new_arrival boolean not null default false;
create index if not exists products_new_arrival_idx on public.products(created_at desc) where is_new_arrival and is_active;

-- ── Technical data files ────────────────────────────────────────────────────────────
-- Public bucket: anyone can download; only admins can upload, replace or delete. Max 25 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-docs', 'product-docs', true, 26214400, array[
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'image/png', 'image/jpeg', 'image/webp',
  'text/plain', 'text/csv',
  'application/octet-stream'          -- CAD files (DWG, STEP …) are usually sent with this type
])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product-docs: public read" on storage.objects;
drop policy if exists "product-docs: admin write" on storage.objects;
drop policy if exists "product-docs: admin update" on storage.objects;
drop policy if exists "product-docs: admin delete" on storage.objects;
create policy "product-docs: public read" on storage.objects for select using (bucket_id = 'product-docs');
create policy "product-docs: admin write" on storage.objects for insert with check (bucket_id = 'product-docs' and public.is_admin());
create policy "product-docs: admin update" on storage.objects for update using (bucket_id = 'product-docs' and public.is_admin());
create policy "product-docs: admin delete" on storage.objects for delete using (bucket_id = 'product-docs' and public.is_admin());


-- PCBDukaan update 011: review likes/dislikes, admin replies, real customer names on reviews.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

alter table public.reviews add column if not exists likes          int not null default 0;
alter table public.reviews add column if not exists dislikes       int not null default 0;
alter table public.reviews add column if not exists admin_reply    text check (admin_reply is null or length(admin_reply) <= 1500);
alter table public.reviews add column if not exists admin_reply_at timestamptz;

-- Name shown on a review: "Sonu G." – from the profile name, else the name on the customer's
-- latest order, else "Customer". Only the first name and last initial are shown.
create or replace function public.review_display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  with n as (
    select coalesce(
      (select nullif(trim(full_name), '') from public.profiles where id = p_user),
      (select nullif(trim(customer_name), '') from public.orders where user_id = p_user order by created_at desc limit 1)
    ) as name
  ), w as (select regexp_split_to_array(name, '\s+') as parts from n where name is not null)
  select coalesce(
    (select initcap(parts[1]) || case when cardinality(parts) > 1 then ' ' || upper(left(parts[cardinality(parts)], 1)) || '.' else '' end from w),
    'Customer');
$$;

-- Customers can't set hidden, verified, likes or the admin reply themselves.
create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- vote_review() only changes the like/dislike counters: let that through unchanged.
  if tg_op = 'UPDATE' and coalesce(current_setting('pcbdukaan.vote_update', true), '') = '1' then
    return new;
  end if;
  if not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.is_hidden := old.is_hidden;
      new.likes := old.likes;
      new.dislikes := old.dislikes;
      new.admin_reply := old.admin_reply;
      new.admin_reply_at := old.admin_reply_at;
    else
      new.is_hidden := false;
      new.likes := 0;
      new.dislikes := 0;
      new.admin_reply := null;
      new.admin_reply_at := null;
    end if;
    new.user_id := auth.uid();
    new.user_name := public.review_display_name(auth.uid());
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.user_id = auth.uid() and i.product_id = new.product_id and o.status <> 'cancelled');
  elsif tg_op = 'UPDATE' and new.admin_reply is distinct from old.admin_reply then
    new.admin_reply := nullif(trim(new.admin_reply), '');
    new.admin_reply_at := case when new.admin_reply is null then null else now() end;
  end if;
  return new;
end;
$$;

-- ── Likes / dislikes: one vote per customer per review ─────────────────────────────
create table if not exists public.review_votes (
  review_id  uuid not null references public.reviews(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.review_votes enable row level security;
drop policy if exists "review votes: read own" on public.review_votes;
create policy "review votes: read own" on public.review_votes for select using (user_id = auth.uid());
-- No insert/update/delete policies: votes go through vote_review() only.

-- p_vote: 1 = like, -1 = dislike, 0 = remove my vote. Returns the new counts.
create or replace function public.vote_review(p_review uuid, p_vote int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_likes int; v_dislikes int;
begin
  if auth.uid() is null then raise exception 'Please log in to vote'; end if;
  if public.is_blocked() then raise exception 'Your account has been blocked. Please contact support.'; end if;
  if p_vote not in (-1, 0, 1) then raise exception 'Invalid vote'; end if;
  select user_id into v_owner from public.reviews where id = p_review and not is_hidden;
  if not found then raise exception 'Review not found'; end if;
  if v_owner = auth.uid() then raise exception 'You can''t vote on your own review'; end if;

  if p_vote = 0 then
    delete from public.review_votes where review_id = p_review and user_id = auth.uid();
  else
    insert into public.review_votes (review_id, user_id, vote) values (p_review, auth.uid(), p_vote)
    on conflict (review_id, user_id) do update set vote = excluded.vote, created_at = now();
  end if;

  select count(*) filter (where vote = 1), count(*) filter (where vote = -1) into v_likes, v_dislikes
    from public.review_votes where review_id = p_review;
  -- Update the counters without running the review triggers (they're not a customer edit).
  perform set_config('pcbdukaan.vote_update', '1', true);
  update public.reviews set likes = v_likes, dislikes = v_dislikes where id = p_review;
  perform set_config('pcbdukaan.vote_update', '', true);
  return jsonb_build_object('likes', v_likes, 'dislikes', v_dislikes, 'my_vote', p_vote);
end;
$$;
revoke all on function public.vote_review(uuid, int) from public;
grant execute on function public.vote_review(uuid, int) to authenticated;

-- ── One-time fix: reviews that show "Customer" get the customer's real name ───────
-- (triggers are skipped for this update only; it changes nothing but the name)
alter table public.reviews disable trigger reviews_prepare;
alter table public.reviews disable trigger reviews_block_guard;
update public.reviews r set user_name = public.review_display_name(r.user_id)
 where r.user_name = 'Customer' and public.review_display_name(r.user_id) <> 'Customer';
alter table public.reviews enable trigger reviews_prepare;
alter table public.reviews enable trigger reviews_block_guard;


-- PCBDukaan update 012: reviews always show the writer's name (also for admin accounts).
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- Name shown on a review, e.g. "Sonu G.": profile name → name on the latest order →
-- name given at sign-up → the part of the email before @ (letters only) → "Customer".
create or replace function public.review_display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  with n as (
    select coalesce(
      (select nullif(trim(full_name), '') from public.profiles where id = p_user),
      (select nullif(trim(customer_name), '') from public.orders where user_id = p_user order by created_at desc limit 1),
      (select nullif(trim(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')), '') from auth.users where id = p_user),
      (select nullif(regexp_replace(split_part(email, '@', 1), '[^A-Za-z]+', ' ', 'g'), ' ') from auth.users where id = p_user)
    ) as name
  ), w as (select regexp_split_to_array(trim(name), '\s+') as parts from n where trim(coalesce(name, '')) <> '')
  select coalesce(
    (select initcap(parts[1]) || case when cardinality(parts) > 1 then ' ' || upper(left(parts[cardinality(parts)], 1)) || '.' else '' end from w),
    'Customer');
$$;

create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- vote_review() only changes the like/dislike counters: let that through unchanged.
  if tg_op = 'UPDATE' and coalesce(current_setting('pcbdukaan.vote_update', true), '') = '1' then
    return new;
  end if;
  if not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.is_hidden := old.is_hidden;
      new.likes := old.likes;
      new.dislikes := old.dislikes;
      new.admin_reply := old.admin_reply;
      new.admin_reply_at := old.admin_reply_at;
    else
      new.is_hidden := false;
      new.likes := 0;
      new.dislikes := 0;
      new.admin_reply := null;
      new.admin_reply_at := null;
    end if;
    new.user_id := auth.uid();
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.user_id = auth.uid() and i.product_id = new.product_id and o.status <> 'cancelled');
  else
    if tg_op = 'INSERT' then
      new.user_id := coalesce(new.user_id, auth.uid());
    end if;
    if tg_op = 'UPDATE' and new.admin_reply is distinct from old.admin_reply then
      new.admin_reply := nullif(trim(new.admin_reply), '');
      new.admin_reply_at := case when new.admin_reply is null then null else now() end;
    end if;
  end if;
  -- The writer's name: set on every new review and whenever writers edit their own review
  -- (for customers and admins alike). An admin hiding or replying to someone else's review keeps that name.
  if tg_op = 'INSERT' or new.user_id = auth.uid() then
    new.user_name := public.review_display_name(new.user_id);
  end if;
  return new;
end;
$$;

-- Fix reviews that still show "Customer".
alter table public.reviews disable trigger reviews_prepare;
alter table public.reviews disable trigger reviews_block_guard;
update public.reviews r set user_name = public.review_display_name(r.user_id)
 where r.user_name = 'Customer' and public.review_display_name(r.user_id) <> 'Customer';
alter table public.reviews enable trigger reviews_prepare;
alter table public.reviews enable trigger reviews_block_guard;
