-- ================================================================
-- Migration: create messages table for chat messages (Sprint 6)
-- ================================================================
create extension if not exists "uuid-ossp";

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','portatore')),
  text text not null check (char_length(text) <= 4000),
  created_at timestamp without time zone not null default now()
);

-- Indice per ricerca messaggi per chat
create index if not exists messages_chat_id_idx on public.messages(chat_id); 