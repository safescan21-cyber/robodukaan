-- RoboDukaan database schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: it drops and recreates the store functions and policies.

create extension if not exists pgcrypto;

-- ─────────────────────────── Tables ───────────────────────────

create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text not null default 'chip',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

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

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_featured_idx on public.products(is_featured) where is_active;
create index if not exists products_search_idx on public.products
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(short_description,'')));

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
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  subtotal       numeric(10,2) not null,
  shipping       numeric(10,2) not null,
  total          numeric(10,2) not null,
  created_at     timestamptz not null default now()
);

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

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ─────────────────────── Row Level Security ───────────────────────
-- Shoppers may read the catalog. Orders are never readable or writable
-- directly; they go through the place_order / track_order functions below.

alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Catalog: categories are public" on public.categories;
create policy "Catalog: categories are public" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "Catalog: active products are public" on public.products;
create policy "Catalog: active products are public" on public.products
  for select to anon, authenticated using (is_active);

-- ─────────────────────── Store functions ───────────────────────

-- Places a cash-on-delivery order. Prices, stock and totals are computed
-- here from the database, never trusted from the browser.
-- items:    [{"product_id": "<uuid>", "quantity": 2}, ...]
-- customer: {"name","phone","email","address_line","city","state","pincode","notes"}
create or replace function public.place_order(items jsonb, customer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     numeric(10,2) := 0;
  v_shipping     numeric(10,2);
  v_item         jsonb;
  v_qty          int;
  v_product      public.products%rowtype;
  v_phone        text := regexp_replace(coalesce(customer->>'phone',''), '\D', '', 'g');
begin
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

  insert into public.orders (order_number, customer_name, phone, email, address_line,
                             city, state, pincode, notes, subtotal, shipping, total)
  values (v_order_number,
          trim(customer->>'name'), v_phone, nullif(trim(customer->>'email'),''),
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

    update public.products set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;

    insert into public.order_items (order_id, product_id, name, sku, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.sku,
            v_product.price, v_qty, v_product.price * v_qty);

    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_shipping := case when v_subtotal >= 499 then 0 else 49 end;

  update public.orders
     set subtotal = v_subtotal, shipping = v_shipping, total = v_subtotal + v_shipping
   where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'total', v_subtotal + v_shipping
  );
end;
$$;

-- Lets a customer look up their own order with order number + phone.
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'customer_name', o.customer_name,
    'city', o.city,
    'subtotal', o.subtotal,
    'shipping', o.shipping,
    'total', o.total,
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

revoke all on function public.place_order(jsonb, jsonb) from public;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
