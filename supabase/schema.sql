-- Compline database schema. Run once in the Supabase SQL editor.
--
-- The Flask server talks to these tables with the service-role key, which
-- bypasses row-level security. RLS is enabled and the app needs no policies,
-- so the public (anon) key can never read or write them directly.

create extension if not exists pgcrypto;

-- Confirmed charges. An upload is the set of rows that share a batch_id.
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  vendor      text not null,
  card        text,
  date        date,
  amount      numeric,
  status      text,                              -- 'settled' or 'pending'
  created_at  timestamptz default now(),
  batch_id    uuid,
  memo        text
);

create index if not exists idx_transactions_user_batch on public.transactions (user_id, batch_id);

-- One row per user: a JSON settings blob with profile, saved cards, and daily
-- screenshot usage.
create table if not exists public.user_settings (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  settings  text
);

alter table public.transactions enable row level security;
alter table public.user_settings enable row level security;
