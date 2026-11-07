-- PCBDukaan update 012: reviews always show the writer's name (also for admin accounts).
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

-- Name shown on a review, e.g. "Sonu G.": profile name → name on the latest order →
-- name given at sign-up → the part of the email before @ (letters only) → "Customer".
create or replace function public.review_display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  with n as (
    select coalesce(
      (select nullif(trim(full_name), '') from public.profiles where id = p_user),
      (select nullif(trim(customer_name), '') from public.orders where user_id = p_user order by created_at desc limit 1),
      (select nullif(trim(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')), '') from auth.users where id = p_user),
      (select nullif(regexp_replace(split_part(email, '@', 1), '[^A-Za-z]+', ' ', 'g'), ' ') from auth.users where id = p_user)
    ) as name
  ), w as (select regexp_split_to_array(trim(name), '\s+') as parts from n where trim(coalesce(name, '')) <> '')
  select coalesce(
    (select initcap(parts[1]) || case when cardinality(parts) > 1 then ' ' || upper(left(parts[cardinality(parts)], 1)) || '.' else '' end from w),
    'Customer');
$$;

create or replace function public.prepare_review()
returns trigger language plpgsql security definer set search_path = public as $$
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
  -- The writer's name: set on every new review and whenever writers edit their own review
  -- (for customers and admins alike). An admin hiding or replying to someone else's review keeps that name.
  if tg_op = 'INSERT' or new.user_id = auth.uid() then
    new.user_name := public.review_display_name(new.user_id);
  end if;
  return new;
end;
$$;

-- Fix reviews that still show "Customer".
alter table public.reviews disable trigger reviews_prepare;
alter table public.reviews disable trigger reviews_block_guard;
update public.reviews r set user_name = public.review_display_name(r.user_id)
 where r.user_name = 'Customer' and public.review_display_name(r.user_id) <> 'Customer';
alter table public.reviews enable trigger reviews_prepare;
alter table public.reviews enable trigger reviews_block_guard;
