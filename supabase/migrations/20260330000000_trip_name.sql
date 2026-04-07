-- supabase/migrations/20260330000000_trip_name.sql
alter table public.trips
  add column if not exists trip_name text;
