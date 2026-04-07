// hooks/useCreatorRoutes.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CreatorRoute } from '../types/social';

export function useCreatorRoutes() {
  const [routes, setRoutes] = useState<CreatorRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    setLoading(true);
    const { data } = await supabase
      .from('creator_routes')
      .select('*, author:users!creator_routes_user_id_fkey(display_name, avatar_url)')
      .eq('published', true)
      .order('created_at', { ascending: false });
    setRoutes((data as CreatorRoute[]) ?? []);
    setLoading(false);
  }

  const publishRoute = useCallback(async (
    tripId: string,
    title: string,
    summary: string,
    tags: string[]
  ): Promise<CreatorRoute | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data: geoData, error: geoError } = await supabase.functions.invoke('route-to-geojson', {
      body: { trip_id: tripId },
    });
    if (geoError || !geoData?.geojson) return null;

    const { data: days } = await supabase
      .from('itinerary_days')
      .select('day_number')
      .eq('trip_id', tripId);

    const { data: route, error } = await supabase
      .from('creator_routes')
      .insert({
        user_id: userData.user.id,
        trip_id: tripId,
        title,
        summary,
        geojson: geoData.geojson,
        days: days?.length ?? 1,
        tags,
        published: true,
      })
      .select()
      .single();

    if (error) return null;
    setRoutes((prev) => [route as CreatorRoute, ...prev]);
    return route as CreatorRoute;
  }, []);

  const saveRoute = useCallback(async (routeId: string) => {
    await supabase.rpc('increment_route_save_count', { route_id: routeId });
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, save_count: r.save_count + 1 } : r))
    );
  }, []);

  return { routes, loading, publishRoute, saveRoute, refresh: loadRoutes };
}
