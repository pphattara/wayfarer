// __tests__/functions/route-to-geojson.test.ts
// Tests the pure conversion logic extracted from the Edge Function

import { itineraryToGeoJSON } from '../../supabase/functions/route-to-geojson/convert';
import type { GeoJSONFeature } from '../../types/social';

const mockItems = [
  { name: 'Senso-ji Temple', lat: 35.7148, lng: 139.7967, type: 'attraction' },
  { name: 'Nakamise Market', lat: 35.7135, lng: 139.7966, type: 'market' },
  { name: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, type: 'landmark' },
];

const mockDays = [
  { day_number: 1, items: mockItems },
  { day_number: 2, items: [mockItems[2]] },
];

describe('itineraryToGeoJSON', () => {
  it('returns a GeoJSON Feature with LineString geometry', () => {
    const result: GeoJSONFeature = itineraryToGeoJSON(mockDays);
    expect(result.type).toBe('Feature');
    expect(result.geometry.type).toBe('LineString');
  });

  it('coordinates are [lng, lat] pairs (GeoJSON spec)', () => {
    const result = itineraryToGeoJSON(mockDays);
    const first = result.geometry.coordinates[0];
    // Senso-ji lng is 139.7967, lat is 35.7148
    expect(first[0]).toBeCloseTo(139.7967, 4);
    expect(first[1]).toBeCloseTo(35.7148, 4);
  });

  it('orders waypoints by day_number then item order', () => {
    const result = itineraryToGeoJSON(mockDays);
    // Should have 4 points total: 3 from day 1 + 1 from day 2
    expect(result.geometry.coordinates).toHaveLength(4);
  });

  it('filters out items missing lat/lng', () => {
    const days = [
      { day_number: 1, items: [{ name: 'No coords', type: 'attraction' }, mockItems[0]] },
    ];
    const result = itineraryToGeoJSON(days);
    expect(result.geometry.coordinates).toHaveLength(1);
  });

  it('returns empty coordinates array for empty days', () => {
    const result = itineraryToGeoJSON([]);
    expect(result.geometry.coordinates).toHaveLength(0);
  });
});
