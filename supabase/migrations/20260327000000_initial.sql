-- supabase/migrations/20260327000000_initial.sql

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nationality text not null default '',
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  origin text not null,
  destinations text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  status text not null default 'planning' check (status in ('planning','confirmed','completed')),
  created_at timestamptz not null default now()
);

-- Itinerary days
create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  day_number int not null,
  date date not null,
  items jsonb not null default '[]'
);

-- Visa summaries
create table public.visa_summaries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  nationality text not null,
  destination text not null,
  content jsonb not null default '{}',
  generated_at timestamptz not null default now()
);

-- Weather packs
create table public.weather_packs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  forecast jsonb not null default '[]',
  packing_list jsonb not null default '[]',
  fetched_at timestamptz not null default now()
);

-- Best time cache (shared across users, keyed by destination)
create table public.best_time_cache (
  id uuid primary key default gen_random_uuid(),
  destination text not null unique,
  content jsonb not null default '{}',
  cached_at timestamptz not null default now()
);

-- Places
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat float not null,
  lng float not null,
  mapbox_id text,
  category text not null default 'other',
  created_by uuid references public.users(id) on delete set null
);

-- Collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null
);

-- Collection places (join table)
create table public.collection_places (
  collection_id uuid references public.collections(id) on delete cascade not null,
  place_id uuid references public.places(id) on delete cascade not null,
  primary key (collection_id, place_id)
);

-- RLS: enable on all tables
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.visa_summaries enable row level security;
alter table public.weather_packs enable row level security;
alter table public.best_time_cache enable row level security;
alter table public.places enable row level security;
alter table public.collections enable row level security;
alter table public.collection_places enable row level security;

-- RLS policies
create policy "Users can read/write own profile"
  on public.users for all using (auth.uid() = id);

create policy "Users can read/write own trips"
  on public.trips for all using (auth.uid() = user_id);

create policy "Users can read/write own itinerary days"
  on public.itinerary_days for all
  using (exists (select 1 from public.trips where id = trip_id and user_id = auth.uid()));

create policy "Users can read/write own visa summaries"
  on public.visa_summaries for all
  using (exists (select 1 from public.trips where id = trip_id and user_id = auth.uid()));

create policy "Users can read/write own weather packs"
  on public.weather_packs for all
  using (exists (select 1 from public.trips where id = trip_id and user_id = auth.uid()));

create policy "Best time cache is readable by all authenticated users"
  on public.best_time_cache for select using (auth.role() = 'authenticated');

create policy "Service role can write best time cache"
  on public.best_time_cache for insert with check (auth.role() = 'service_role');

create policy "Places are readable by all authenticated users"
  on public.places for select using (auth.role() = 'authenticated');

create policy "Users can create places"
  on public.places for insert with check (auth.uid() = created_by);

create policy "Users can read/write own collections"
  on public.collections for all using (auth.uid() = user_id);

create policy "Users can manage own collection places"
  on public.collection_places for all
  using (exists (select 1 from public.collections where id = collection_id and user_id = auth.uid()));

-- Trigger: auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
