// supabase/functions/route-to-geojson/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { itineraryToGeoJSON } from './convert.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { trip_id } = await req.json();

    if (!trip_id) {
      return new Response(JSON.stringify({ error: 'trip_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: days, error } = await supabase
      .from('itinerary_days')
      .select('day_number, items')
      .eq('trip_id', trip_id)
      .order('day_number', { ascending: true });

    if (error) throw new Error(error.message);
    if (!days || days.length === 0) {
      return new Response(JSON.stringify({ error: 'No itinerary days found for this trip' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geojson = itineraryToGeoJSON(days);

    return new Response(JSON.stringify({ geojson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
