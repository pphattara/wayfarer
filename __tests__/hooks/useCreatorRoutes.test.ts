// __tests__/hooks/useCreatorRoutes.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes';
import type { CreatorRoute } from '../../types/social';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const mockRoute: CreatorRoute = {
  id: 'r1',
  user_id: 'u1',
  trip_id: 't1',
  title: 'Tokyo 5 Days',
  summary: 'Best of Tokyo',
  geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[139.6, 35.6]] }, properties: {} },
  days: 5,
  tags: ['culture', 'food'],
  published: true,
  view_count: 100,
  save_count: 20,
  created_at: '2026-04-01T00:00:00Z',
};

describe('useCreatorRoutes', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [mockRoute], error: null }),
    });
  });

  it('loads published routes on mount', async () => {
    const { result } = renderHook(() => useCreatorRoutes());
    await act(async () => {});
    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].title).toBe('Tokyo 5 Days');
  });
});
