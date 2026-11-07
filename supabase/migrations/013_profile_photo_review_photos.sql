-- PCBDukaan update 013: profile photo + personal/business details, photos on reviews.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- ── Profile: photo and details ──────────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists company    text;
alter table public.profiles add column if not exists gstin      text;
alter table public.profiles add column if not exists city       text;
alter table public.profiles add column if not exists state      text;
alter table public.profiles drop constraint if exists profiles_gstin_format;
alter table public.profiles add constraint profiles_gstin_format
  check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');
alter table public.profiles drop constraint if exists profiles_details_length;
alter table public.profiles add constraint profiles_details_length
  check (length(coalesce(company, '')) <= 120 and length(coalesce(city, '')) <= 80 and length(coalesce(state, '')) <= 80);

-- ── Customer photo uploads (profile photos, review photos) ─────────────────────────
-- Public to view. Signed-in customers may only add/remove files in their own folder: <user id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-uploads', 'user-uploads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user-uploads: public read" on storage.objects;
drop policy if exists "user-uploads: own folder write" on storage.objects;
drop policy if exists "user-uploads: own folder delete" on storage.objects;
drop policy if exists "user-uploads: admin delete" on storage.objects;
create policy "user-uploads: public read" on storage.objects for select using (bucket_id = 'user-uploads');
create policy "user-uploads: own folder write" on storage.objects for insert
  with check (bucket_id = 'user-uploads' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text and not public.is_blocked());
create policy "user-uploads: own folder delete" on storage.objects for delete
  using (bucket_id = 'user-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user-uploads: admin delete" on storage.objects for delete
  using (bucket_id = 'user-uploads' and public.is_admin());

-- ── Reviews: photos + the writer's profile photo ────────────────────────────────────
alter table public.reviews add column if not exists photos      text[] not null default '{}';
alter table public.reviews add column if not exists user_avatar text;

create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_photo text;
begin
  -- vote_review() only changes the like/dislike counters: let that through unchanged.
  if tg_op = 'UPDATE' and coalesce(current_setting('pcbdukaan.vote_update', true), '') = '1' then
    return new;
  end if;
  if not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.is_hidden := old.is_hidden;
      new.likes := old.likes;
      new.dislikes := old.dislikes;
      new.admin_reply := old.admin_reply;
      new.admin_reply_at := old.admin_reply_at;
    else
      new.is_hidden := false;
      new.likes := 0;
      new.dislikes := 0;
      new.admin_reply := null;
      new.admin_reply_at := null;
    end if;
    new.user_id := auth.uid();
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.user_id = auth.uid() and i.product_id = new.product_id and o.status <> 'cancelled');
  else
    if tg_op = 'INSERT' then
      new.user_id := coalesce(new.user_id, auth.uid());
    end if;
    if tg_op = 'UPDATE' and new.admin_reply is distinct from old.admin_reply then
      new.admin_reply := nullif(trim(new.admin_reply), '');
      new.admin_reply_at := case when new.admin_reply is null then null else now() end;
    end if;
  end if;

  -- The writer's own new review or edit: name, profile photo and photo checks.
  if tg_op = 'INSERT' or new.user_id = auth.uid() then
    new.user_name := public.review_display_name(new.user_id);
    new.user_avatar := (select avatar_url from public.profiles where id = new.user_id);
    new.photos := coalesce(new.photos, '{}');
    if cardinality(new.photos) > 4 then
      raise exception 'You can add up to 4 photos to a review';
    end if;
    -- Only photos the writer uploaded to their own folder.
    foreach v_photo in array new.photos loop
      if position('/user-uploads/' || new.user_id::text || '/' in v_photo) = 0 then
        raise exception 'Invalid review photo';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- When a customer changes their profile photo, their reviews show the new one.
create or replace function public.sync_review_avatar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.avatar_url is distinct from old.avatar_url then
    -- Same pass-through flag as vote_review(): only this column changes, review rules are skipped.
    perform set_config('pcbdukaan.vote_update', '1', true);
    update public.reviews set user_avatar = new.avatar_url where user_id = new.id;
    perform set_config('pcbdukaan.vote_update', '', true);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_sync_review_avatar on public.profiles;
create trigger profiles_sync_review_avatar after update of avatar_url on public.profiles
  for each row execute function public.sync_review_avatar();
