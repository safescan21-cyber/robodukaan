-- PCBDukaan update 027: questions & answers on product pages, and "customers also bought".
-- Safe to run more than once.

create table if not exists public.product_questions (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  asker_name  text check (asker_name is null or length(asker_name) <= 60),
  question    text not null check (length(question) between 5 and 500),
  answer      text check (answer is null or length(answer) <= 2000),
  answered_at timestamptz,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists product_questions_product_idx on public.product_questions(product_id, created_at desc);
alter table public.product_questions enable row level security;
drop policy if exists "questions: read answered or own" on public.product_questions;
create policy "questions: read answered or own" on public.product_questions for select
  using ((answer is not null and is_public) or user_id = auth.uid() or public.is_admin());
drop policy if exists "questions: admin update" on public.product_questions;
create policy "questions: admin update" on public.product_questions for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "questions: admin delete" on public.product_questions;
create policy "questions: admin delete" on public.product_questions for delete using (public.is_admin());

-- Logged-in customers ask a question (max 5 a day); the name shown is their first name.
create or replace function public.ask_product_question(p_product_id uuid, p_question text)
returns bigint language plpgsql security definer set search_path = public as $$
declare q text := trim(coalesce(p_question, '')); new_id bigint; nm text;
begin
  if auth.uid() is null then raise exception 'Please log in to ask a question'; end if;
  if length(q) < 5 then raise exception 'Please write your question'; end if;
  if length(q) > 500 then raise exception 'Question is too long (500 characters)'; end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active) then raise exception 'Product not found'; end if;
  if (select count(*) from public.product_questions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many questions today – please try again tomorrow';
  end if;
  select nullif(split_part(trim(coalesce(full_name, '')), ' ', 1), '') into nm from public.profiles where id = auth.uid();
  insert into public.product_questions (product_id, user_id, asker_name, question)
  values (p_product_id, auth.uid(), left(coalesce(nm, 'Customer'), 60), q)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.ask_product_question(uuid, text) from public;
grant execute on function public.ask_product_question(uuid, text) to authenticated;

-- "Customers also bought": products most often in the same (not cancelled) orders. Product ids only.
create or replace function public.also_bought(p_product_id uuid, p_limit int default 6)
returns table (product_id uuid, orders bigint) language sql stable security definer set search_path = public as $$
  select oi2.product_id, count(distinct oi2.order_id) as orders
  from public.order_items oi1
  join public.orders o on o.id = oi1.order_id and o.status <> 'cancelled'
  join public.order_items oi2 on oi2.order_id = oi1.order_id and oi2.product_id <> oi1.product_id
  join public.products p on p.id = oi2.product_id and p.is_active
  where oi1.product_id = p_product_id and oi2.product_id is not null
  group by oi2.product_id
  order by orders desc
  limit greatest(1, least(coalesce(p_limit, 6), 12));
$$;
revoke all on function public.also_bought(uuid, int) from public;
grant execute on function public.also_bought(uuid, int) to anon, authenticated;
