-- PCBDukaan update 022: keep the customer informed of every order event (email + WhatsApp).
-- orders.notified_key remembers what the customer was last told ("status|payment|tracking link"),
-- so each event is sent exactly once, whoever made the change (admin, vendor, or the customer cancelling).
-- Safe to run more than once.
alter table public.orders add column if not exists notified_key text;

-- Returns the order (with items, courier details and what the customer was told before) when there is
-- something new to tell them, and marks it as told. Returns null otherwise.
-- Allowed for admins, the customer who owns the order, or the vendor link assigned to this order.
create or replace function public.claim_order_update(p_order_id uuid, p_vendor_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  k text;
  courier record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return null; end if;
  if not (public.is_admin()
          or (auth.uid() is not null and o.user_id = auth.uid())
          or (p_vendor_token is not null and exists (select 1 from public.vendor_assignments va where va.token = p_vendor_token and va.order_id = o.id))) then
    return null;
  end if;
  k := o.status || '|' || o.payment_status || '|' || coalesce(o.tracking_url, '');
  if o.notified_key is not distinct from k then return null; end if;
  -- A brand-new order is covered by the "order received" message.
  if o.notified_key is null and o.status = 'pending' then
    update public.orders set notified_key = k where id = o.id;
    return null;
  end if;
  update public.orders set notified_key = k where id = o.id;
  select va.courier, va.tracking_number into courier from public.vendor_assignments va
    where va.order_id = o.id and va.status = 'dispatched' order by va.dispatched_at desc nulls last limit 1;
  return jsonb_build_object(
    'previous', coalesce(o.notified_key, 'pending|pending|'),
    'order', to_jsonb(o) - 'notified_key',
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'sku', i.sku, 'quantity', i.quantity, 'line_total', i.line_total) order by i.id)
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'courier', courier.courier,
    'tracking_number', courier.tracking_number
  );
end;
$$;
revoke all on function public.claim_order_update(uuid, uuid) from public;
grant execute on function public.claim_order_update(uuid, uuid) to anon, authenticated;
