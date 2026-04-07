jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockImplementation((table) => {
      if (table === 'collections') return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'col-1', user_id: 'user-1', name: 'Italy Trip' }],
          error: null,
        }),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'col-2', name: 'New' }, error: null }),
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }
    }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}))

import { renderHook, act } from '@testing-library/react-native'
import { useCollections } from '../../hooks/useCollections'

describe('useCollections', () => {
  it('exposes getCollections and saveToCollection functions', () => {
    const { result } = renderHook(() => useCollections())
    expect(typeof result.current.getCollections).toBe('function')
    expect(typeof result.current.saveToCollection).toBe('function')
  })
})
