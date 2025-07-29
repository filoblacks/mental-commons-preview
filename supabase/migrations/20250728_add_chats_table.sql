-- ================================================================
-- Migration: create chats table for 1:1 follow-up chat requests
-- ================================================================
create extension if not exists "uuid-ossp";

create table if not exists public.chats (
  id uuid primary key default uuid_generate_v4(),
  ucme_id uuid not null references public.ucmes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  portatore_id uuid not null references public.portatori(id),
  status text not null default 'requested' check (status in ('requested','accepted','rejected')),
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now()
);

-- Vincolo di unicità su ucme_id (una sola chat per UCMe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chats_unique_ucme'
  ) THEN
    ALTER TABLE public.chats
      ADD CONSTRAINT chats_unique_ucme UNIQUE (ucme_id);
  END IF;
END $$;

-- Trigger per aggiornare updated_at
create or replace function public.set_chats_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_chats on public.chats;
create trigger set_timestamp_chats
before update on public.chats
for each row execute procedure public.set_chats_updated_at(); 