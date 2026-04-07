// __tests__/hooks/useFeed.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useFeed } from '../../hooks/useFeed';
import type { Post } from '../../types/social';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const mockPost: Post = {
  id: 'post-1',
  user_id: 'user-1',
  trip_id: null,
  caption: 'Hello Tokyo!',
  media_urls: ['https://example.com/photo.jpg'],
  lat: 35.6762,
  lng: 139.6503,
  destination_name: 'Tokyo',
  visibility: 'public',
  likes_count: 5,
  comments_count: 2,
  created_at: '2026-04-01T10:00:00Z',
  user_has_liked: false,
};

describe('useFeed', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    const mockSelect = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [mockPost], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    supabase.from.mockReturnValue(mockSelect);
  });

  it('loads posts on mount', async () => {
    const { result } = renderHook(() => useFeed());
    await act(async () => {});
    expect(result.current.posts.length).toBeGreaterThan(0);
    expect(result.current.loading).toBe(false);
  });

  it('starts with empty posts and loading true', () => {
    const { result } = renderHook(() => useFeed());
    expect(result.current.posts).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  test('likePost optimistically updates likes_count before network resolves', async () => {
    const { result } = renderHook(() => useFeed());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    const initialCount = result.current.posts[0]?.likes_count ?? 0;
    act(() => { result.current.likePost(result.current.posts[0]?.id ?? 'post-1') });
    expect(result.current.posts[0]?.likes_count).toBe(initialCount + 1);
  });
});
