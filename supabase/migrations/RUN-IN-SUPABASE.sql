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
