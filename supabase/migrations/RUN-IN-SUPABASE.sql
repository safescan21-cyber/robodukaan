-- PCBDukaan update 023: quantity price breaks ("buy 10+ at ₹X each"). Safe to run more than once.
-- products.price_tiers = [{"min_qty": 10, "price": 2050}, {"min_qty": 25, "price": 1990}] (prices excl. GST).
alter table public.products add column if not exists price_tiers jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.products add constraint products_price_tiers_check
    check (jsonb_typeof(price_tiers) = 'array' and jsonb_array_length(price_tiers) <= 5);
exception when duplicate_object then null; end $$;

-- Unit price for a quantity: the lowest valid break the quantity reaches, never above the normal price.
create or replace function public.tier_price(p_base numeric, p_tiers jsonb, p_qty int)
returns numeric language sql immutable set search_path = public as $$
  select coalesce((
    select (t->>'price')::numeric
      from jsonb_array_elements(case when jsonb_typeof(p_tiers) = 'array' then p_tiers else '[]'::jsonb end) t
     where (t->>'min_qty') ~ '^\d+$' and (t->>'price') ~ '^\d+(\.\d+)?$'
       and (t->>'min_qty')::int <= p_qty and (t->>'price')::numeric > 0 and (t->>'price')::numeric <= p_base
     order by (t->>'min_qty')::int desc, (t->>'price')::numeric
     limit 1), p_base);
$$;
grant execute on function public.tier_price(numeric, jsonb, int) to anon, authenticated;

-- Checkout uses the price break for each line.
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
  v_price        numeric(10,2);
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
    if v_qty is null or v_qty < 1 or v_qty > 999 then
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

    -- Quantity price breaks (e.g. 10+ at a lower price per unit).
    v_price := public.tier_price(v_product.price, v_product.price_tiers, v_qty);

    select coalesce(nullif(v_product.hsn_code, ''), c.hsn_code) into v_hsn
      from public.categories c where c.id = v_product.category_id;

    update public.products
       set stock = stock - v_qty, sold_count = sold_count + v_qty, updated_at = now()
     where id = v_product.id;

    insert into public.order_items (order_id, product_id, name, sku, slug, hsn_code, image_url, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.sku, v_product.slug, v_hsn,
            coalesce(v_product.images[1], v_product.image_url),
            v_price, v_qty, v_price * v_qty);

    v_subtotal := v_subtotal + v_price * v_qty;
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
