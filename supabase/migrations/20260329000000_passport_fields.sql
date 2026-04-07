-- supabase/migrations/20260329000000_passport_fields.sql
-- Add passport and visa fields to users table

alter table public.users
  add column if not exists passport_expiry text,
  add column if not exists passport2_nationality text,
  add column if not exists passport2_expiry text,
  add column if not exists visas jsonb not null default '[]';
