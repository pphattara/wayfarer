-- supabase/migrations/20260405000002_rpc.sql
CREATE OR REPLACE FUNCTION increment_route_save_count(route_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE creator_routes SET save_count = save_count + 1 WHERE id = route_id;
$$;
