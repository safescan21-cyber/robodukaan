-- PCBDukaan update 019: vendor phone + website (for supplier prospects and enquiries).
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
alter table public.vendors add column if not exists phone   text check (phone is null or length(phone) <= 40);
alter table public.vendors add column if not exists website text check (website is null or (website ~ '^https?://' and length(website) <= 300));
