-- Run once in Supabase SQL Editor. Does not delete existing data.
create extension if not exists pgcrypto;
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null unique,
  worker_name text not null,
  login_name text not null,
  password_hash text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_id_not_blank check(length(btrim(worker_id))>0),
  constraint worker_name_not_blank check(length(btrim(worker_name))>0)
);
create index if not exists workers_login_name_idx on public.workers(login_name);
alter table public.workers enable row level security;
-- Intentionally do not grant policies to anon/authenticated roles.
-- Only Next.js server routes (secret/service-role key) access workers.
