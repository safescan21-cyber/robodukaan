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
