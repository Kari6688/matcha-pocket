-- Run once in Supabase → SQL Editor → New query → Run
-- https://supabase.com/dashboard/project/aafsftwaleqhmpfudato/sql/new

create table if not exists public.user_library (
  user_id uuid primary key references auth.users (id) on delete cascade,
  spots jsonb not null default '[]'::jsonb,
  tins jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_library enable row level security;

drop policy if exists "Users can read own library" on public.user_library;
drop policy if exists "Users can insert own library" on public.user_library;
drop policy if exists "Users can update own library" on public.user_library;

create policy "Users can read own library"
  on public.user_library for select
  using (auth.uid() = user_id);

create policy "Users can insert own library"
  on public.user_library for insert
  with check (auth.uid() = user_id);

create policy "Users can update own library"
  on public.user_library for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to upsert via PostgREST
grant select, insert, update on public.user_library to authenticated;
