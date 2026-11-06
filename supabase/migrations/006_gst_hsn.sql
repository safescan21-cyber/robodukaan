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
