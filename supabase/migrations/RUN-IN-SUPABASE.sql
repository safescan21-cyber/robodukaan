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
