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

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  worker_name text not null,
  work_date date not null,
  working_place text not null,
  project text not null check (project in ('Kingdao', 'Creative', 'Namhong')),
  working_hours numeric(4,1) not null check (working_hours > 0 and working_hours <= 24),
  created_at timestamptz not null default now()
);

create index if not exists time_entries_date_idx on public.time_entries(work_date desc);
create index if not exists time_entries_worker_idx on public.time_entries(worker_id);
create index if not exists time_entries_project_idx on public.time_entries(project);

alter table public.working_places enable row level security;
alter table public.time_entries enable row level security;

-- No anon/authenticated policies on purpose.
-- The browser never receives the secret/service-role key; Next.js server routes access these tables.
