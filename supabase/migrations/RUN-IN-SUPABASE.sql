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
