-- PCBDukaan update 024: online payment with Razorpay (UPI, cards, net banking). Safe to run more than once.
-- The Razorpay key secret is kept in app_secrets (no API access; only the functions below read it), so the
-- database itself checks Razorpay's payment signature – a customer can't mark an order paid without paying.
create extension if not exists pgcrypto with schema extensions;

alter table public.orders add column if not exists razorpay_order_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists paid_at timestamptz;
create unique index if not exists orders_razorpay_order_key on public.orders(razorpay_order_id) where razorpay_order_id is not null;

create table if not exists public.app_secrets (
  name       text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;  -- no policies: never readable through the API
revoke all on public.app_secrets from anon, authenticated;

-- Admin → Payments saves the key secret here (and on the server for creating payments).
create or replace function public.admin_set_secret(p_name text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_name not in ('razorpay_key_secret') then raise exception 'Unknown setting'; end if;
  if nullif(trim(coalesce(p_value, '')), '') is null then
    delete from public.app_secrets where name = p_name;
  else
    insert into public.app_secrets (name, value) values (p_name, trim(p_value))
    on conflict (name) do update set value = excluded.value, updated_at = now();
  end if;
end;
$$;
revoke all on function public.admin_set_secret(text, text) from public;
grant execute on function public.admin_set_secret(text, text) to authenticated;

create or replace function public.admin_secret_is_set(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() and exists (select 1 from public.app_secrets where name = p_name);
$$;
revoke all on function public.admin_secret_is_set(text) from public;
grant execute on function public.admin_secret_is_set(text) to authenticated;

-- HMAC-SHA256 (hex) with the Razorpay key secret – the same signature Razorpay sends after a payment.
create or replace function public.razorpay_sign(p_payload text)
returns text language plpgsql stable security definer set search_path = public as $$
declare s text;
begin
  select value into s from public.app_secrets where name = 'razorpay_key_secret';
  if s is null then raise exception 'Online payment is not set up'; end if;
  return encode(extensions.hmac(convert_to(p_payload, 'UTF8'), convert_to(s, 'UTF8'), 'sha256'), 'hex');
end;
$$;
revoke all on function public.razorpay_sign(text) from public, anon, authenticated;

-- Link a Razorpay order to the customer's order. The website signs (order, Razorpay order, amount) with the
-- secret, so nobody can attach a cheaper payment to an expensive order.
create or replace function public.attach_payment(p_order_id uuid, p_razorpay_order_id text, p_amount bigint, p_sig text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or (o.user_id is distinct from auth.uid() and not public.is_admin()) then raise exception 'Order not found'; end if;
  if o.status = 'cancelled' then raise exception 'This order is cancelled'; end if;
  if o.payment_status <> 'pending' then raise exception 'This order is already paid'; end if;
  if p_amount <> round(o.total * 100) then raise exception 'Amount does not match the order'; end if;
  if public.razorpay_sign(o.id::text || '|' || p_razorpay_order_id || '|' || p_amount::text) <> lower(coalesce(p_sig, '')) then
    raise exception 'Payment link could not be verified';
  end if;
  update public.orders set razorpay_order_id = p_razorpay_order_id, payment_method = 'online' where id = o.id;
end;
$$;
revoke all on function public.attach_payment(uuid, text, bigint, text) from public;
grant execute on function public.attach_payment(uuid, text, bigint, text) to authenticated;

-- Mark the order paid when Razorpay's signature (order_id|payment_id) is correct. Used by the checkout
-- (customer's browser) and by the Razorpay webhook (if the browser closed before it could report back).
create or replace function public.confirm_payment(p_razorpay_order_id text, p_payment_id text, p_signature text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then raise exception 'Payment could not be verified'; end if;
  if coalesce(p_payment_id, '') !~ '^pay_[A-Za-z0-9]{6,40}$'
     or public.razorpay_sign(p_razorpay_order_id || '|' || p_payment_id) <> lower(coalesce(p_signature, '')) then
    raise exception 'Payment could not be verified';
  end if;
  if o.payment_status <> 'paid' then
    update public.orders set payment_status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now() where id = o.id;
  end if;
  return jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'already_paid', o.payment_status = 'paid');
end;
$$;
revoke all on function public.confirm_payment(text, text, text) from public;
grant execute on function public.confirm_payment(text, text, text) to anon, authenticated;
