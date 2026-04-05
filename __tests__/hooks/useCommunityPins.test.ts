// __tests__/hooks/useCommunityPins.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useCommunityPins } from '../../hooks/useCommunityPins';
import type { CommunityPin } from '../../types/social';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const mockPin: CommunityPin = {
  id: 'pin1',
  user_id: 'u1',
  lat: 35.71,
  lng: 139.79,
  name: 'Hidden ramen spot',
  category: 'food',
  note: 'Cash only',
  photo_url: null,
  verified: false,
  created_at: '2026-04-01T00:00:00Z',
};

describe('useCommunityPins', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [mockPin], error: null }),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPin, error: null }),
    });
  });

  it('loads pins on mount', async () => {
    const { result } = renderHook(() => useCommunityPins());
    await act(async () => {});
    expect(result.current.pins).toHaveLength(1);
    expect(result.current.pins[0].name).toBe('Hidden ramen spot');
  });
});
