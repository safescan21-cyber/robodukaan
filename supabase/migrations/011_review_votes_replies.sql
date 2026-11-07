-- PCBDukaan update 011: review likes/dislikes, admin replies, real customer names on reviews.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

alter table public.reviews add column if not exists likes          int not null default 0;
alter table public.reviews add column if not exists dislikes       int not null default 0;
alter table public.reviews add column if not exists admin_reply    text check (admin_reply is null or length(admin_reply) <= 1500);
alter table public.reviews add column if not exists admin_reply_at timestamptz;

-- Name shown on a review: "Sonu G." – from the profile name, else the name on the customer's
-- latest order, else "Customer". Only the first name and last initial are shown.
create or replace function public.review_display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  with n as (
    select coalesce(
      (select nullif(trim(full_name), '') from public.profiles where id = p_user),
      (select nullif(trim(customer_name), '') from public.orders where user_id = p_user order by created_at desc limit 1)
    ) as name
  ), w as (select regexp_split_to_array(name, '\s+') as parts from n where name is not null)
  select coalesce(
    (select initcap(parts[1]) || case when cardinality(parts) > 1 then ' ' || upper(left(parts[cardinality(parts)], 1)) || '.' else '' end from w),
    'Customer');
$$;

-- Customers can't set hidden, verified, likes or the admin reply themselves.
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
    new.user_name := public.review_display_name(auth.uid());
    new.verified := exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.user_id = auth.uid() and i.product_id = new.product_id and o.status <> 'cancelled');
  elsif tg_op = 'UPDATE' and new.admin_reply is distinct from old.admin_reply then
    new.admin_reply := nullif(trim(new.admin_reply), '');
    new.admin_reply_at := case when new.admin_reply is null then null else now() end;
  end if;
  return new;
end;
$$;

-- ── Likes / dislikes: one vote per customer per review ─────────────────────────────
create table if not exists public.review_votes (
  review_id  uuid not null references public.reviews(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.review_votes enable row level security;
drop policy if exists "review votes: read own" on public.review_votes;
create policy "review votes: read own" on public.review_votes for select using (user_id = auth.uid());
-- No insert/update/delete policies: votes go through vote_review() only.

-- p_vote: 1 = like, -1 = dislike, 0 = remove my vote. Returns the new counts.
create or replace function public.vote_review(p_review uuid, p_vote int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_likes int; v_dislikes int;
begin
  if auth.uid() is null then raise exception 'Please log in to vote'; end if;
  if public.is_blocked() then raise exception 'Your account has been blocked. Please contact support.'; end if;
  if p_vote not in (-1, 0, 1) then raise exception 'Invalid vote'; end if;
  select user_id into v_owner from public.reviews where id = p_review and not is_hidden;
  if not found then raise exception 'Review not found'; end if;
  if v_owner = auth.uid() then raise exception 'You can''t vote on your own review'; end if;

  if p_vote = 0 then
    delete from public.review_votes where review_id = p_review and user_id = auth.uid();
  else
    insert into public.review_votes (review_id, user_id, vote) values (p_review, auth.uid(), p_vote)
    on conflict (review_id, user_id) do update set vote = excluded.vote, created_at = now();
  end if;

  select count(*) filter (where vote = 1), count(*) filter (where vote = -1) into v_likes, v_dislikes
    from public.review_votes where review_id = p_review;
  -- Update the counters without running the review triggers (they're not a customer edit).
  perform set_config('pcbdukaan.vote_update', '1', true);
  update public.reviews set likes = v_likes, dislikes = v_dislikes where id = p_review;
  perform set_config('pcbdukaan.vote_update', '', true);
  return jsonb_build_object('likes', v_likes, 'dislikes', v_dislikes, 'my_vote', p_vote);
end;
$$;
revoke all on function public.vote_review(uuid, int) from public;
grant execute on function public.vote_review(uuid, int) to authenticated;

-- ── One-time fix: reviews that show "Customer" get the customer's real name ───────
-- (triggers are skipped for this update only; it changes nothing but the name)
alter table public.reviews disable trigger reviews_prepare;
alter table public.reviews disable trigger reviews_block_guard;
update public.reviews r set user_name = public.review_display_name(r.user_id)
 where r.user_name = 'Customer' and public.review_display_name(r.user_id) <> 'Customer';
alter table public.reviews enable trigger reviews_prepare;
alter table public.reviews enable trigger reviews_block_guard;
