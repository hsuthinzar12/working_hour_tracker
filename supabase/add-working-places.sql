-- Run this migration in Supabase SQL Editor if you already created time_entries.
-- It is safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.working_places (
  id uuid primary key default gen_random_uuid(),
  project text not null check (project in ('Kingdao', 'Creative', 'Namhong')),
  name text not null check (char_length(trim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project, name)
);

create index if not exists working_places_project_idx on public.working_places(project, is_active);
alter table public.working_places enable row level security;
