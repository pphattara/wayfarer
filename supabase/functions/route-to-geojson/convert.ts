// supabase/functions/route-to-geojson/convert.ts
import type { GeoJSONFeature } from '../../../types/social';

interface ItineraryItem {
  name: string;
  lat?: number;
  lng?: number;
  type?: string;
}

interface ItineraryDay {
  day_number: number;
  items: ItineraryItem[];
}

export function itineraryToGeoJSON(days: ItineraryDay[]): GeoJSONFeature {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);

  const coordinates: [number, number][] = sorted.flatMap((day) =>
    day.items
      .filter((item): item is ItineraryItem & { lat: number; lng: number } =>
        typeof item.lat === 'number' && typeof item.lng === 'number'
      )
      .map((item): [number, number] => [item.lng, item.lat]) // GeoJSON: [lng, lat]
  );

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {},
  };
}
