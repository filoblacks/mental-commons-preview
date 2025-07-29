-- Migrazione Sprint 1 – Abbonamento MC Premium
-- Aggiunge colonne per la gestione abbonamenti Stripe

alter table if exists users
    add column if not exists has_subscription boolean default false,
    add column if not exists stripe_customer_id text,
    add column if not exists stripe_subscription_status text; 