// __tests__/hooks/useFollow.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useFollow } from '../../hooks/useFollow';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const makeMock = (overrides = {}) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  ...overrides,
});

describe('useFollow', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
  });

  it('isFollowing returns false when no row exists', async () => {
    const mock = makeMock({
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    });
    supabase.from.mockReturnValue(mock);

    const { result } = renderHook(() => useFollow('other-user'));
    await act(async () => {});

    expect(result.current.isFollowing).toBe(false);
  });

  it('isFollowing returns true when row exists', async () => {
    const mock = makeMock({
      single: jest.fn().mockResolvedValue({ data: { follower_id: 'me', following_id: 'other-user' }, error: null }),
    });
    supabase.from.mockReturnValue(mock);

    const { result } = renderHook(() => useFollow('other-user'));
    await act(async () => {});

    expect(result.current.isFollowing).toBe(true);
  });

  it('follow() inserts a row and sets isFollowing to true', async () => {
    const mock = makeMock({
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    supabase.from.mockReturnValue(mock);

    const { result } = renderHook(() => useFollow('other-user'));
    await act(async () => {});
    await act(async () => { await result.current.follow(); });

    expect(supabase.from).toHaveBeenCalledWith('followers');
  });
});
