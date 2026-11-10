-- PCBDukaan update 025: teach the AI assistant (your own answers + questions customers asked) and switch on
-- the daily report from the admin panel. Safe to run more than once.

-- Your own answers for the AI (Admin → AI assistant). Public text, like an FAQ.
create table if not exists public.ai_knowledge (
  id         bigint generated always as identity primary key,
  question   text not null check (length(question) between 3 and 300),
  answer     text not null check (length(answer) between 2 and 1500),
  keywords   text check (keywords is null or length(keywords) <= 300),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_knowledge enable row level security;
drop policy if exists "ai_knowledge: read active" on public.ai_knowledge;
create policy "ai_knowledge: read active" on public.ai_knowledge for select using (is_active or public.is_admin());
drop policy if exists "ai_knowledge: admin write" on public.ai_knowledge;
create policy "ai_knowledge: admin write" on public.ai_knowledge for all using (public.is_admin()) with check (public.is_admin());

-- What customers ask the chat (phone numbers and email addresses removed), so you can teach better answers.
create table if not exists public.chat_questions (
  id         bigint generated always as identity primary key,
  question   text not null,
  products   int not null default 0,
  knowledge  int not null default 0,
  mode       text,
  created_at timestamptz not null default now()
);
create index if not exists chat_questions_created_idx on public.chat_questions(created_at desc);
alter table public.chat_questions enable row level security;
drop policy if exists "chat_questions: admin read" on public.chat_questions;
create policy "chat_questions: admin read" on public.chat_questions for select using (public.is_admin());
drop policy if exists "chat_questions: admin delete" on public.chat_questions;
create policy "chat_questions: admin delete" on public.chat_questions for delete using (public.is_admin());

create or replace function public.log_chat_question(p_question text, p_products int, p_knowledge int, p_mode text)
returns void language plpgsql security definer set search_path = public as $$
declare q text;
begin
  q := left(trim(coalesce(p_question, '')), 300);
  if length(q) < 2 then return; end if;
  -- no personal data: hide phone numbers and email addresses
  q := regexp_replace(q, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '•••@•••', 'g');
  q := regexp_replace(q, '\+?\d[\d\s-]{6,}\d', '•••', 'g');
  if (select count(*) from public.chat_questions where created_at > now() - interval '1 hour') > 2000 then return; end if;
  insert into public.chat_questions (question, products, knowledge, mode)
  values (q, greatest(0, least(coalesce(p_products, 0), 99)), greatest(0, least(coalesce(p_knowledge, 0), 99)), left(coalesce(p_mode, ''), 20));
  if random() < 0.01 then delete from public.chat_questions where created_at < now() - interval '90 days'; end if;
end;
$$;
revoke all on function public.log_chat_question(text, int, int, text) from public;
grant execute on function public.log_chat_question(text, int, int, text) to anon, authenticated;

-- Admin → Reports reads the report code, so the daily report works without the server terminal.
create or replace function public.admin_report_token()
returns text language plpgsql security definer set search_path = public, private as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return (select token from private.report_token where id = 1);
end;
$$;
revoke all on function public.admin_report_token() from public;
grant execute on function public.admin_report_token() to authenticated;
