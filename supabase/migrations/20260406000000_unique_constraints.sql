-- Allow upsert on visa_summaries by trip_id
ALTER TABLE public.visa_summaries
  ADD CONSTRAINT visa_summaries_trip_id_unique UNIQUE (trip_id);

-- Allow upsert on weather_packs by trip_id
ALTER TABLE public.weather_packs
  ADD CONSTRAINT weather_packs_trip_id_unique UNIQUE (trip_id);

-- Add trip_name column if missing
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS trip_name text;
