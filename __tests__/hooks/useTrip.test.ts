// __tests__/hooks/useTrip.test.ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'trip-123',
          user_id: 'user-1',
          origin: 'London',
          destinations: ['Rome'],
          start_date: '2026-05-01',
          end_date: '2026-05-05',
          status: 'planning',
          created_at: '2026-03-27T00:00:00Z',
        },
        error: null,
      }),
    }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}))

import { renderHook, act } from '@testing-library/react-native'
import { useTrip } from '../../hooks/useTrip'

describe('useTrip', () => {
  it('createTrip returns a trip with the correct origin', async () => {
    const { result } = renderHook(() => useTrip())
    let trip: any
    await act(async () => {
      trip = await result.current.createTrip({
        origin: 'London',
        destinations: ['Rome'],
        start_date: '2026-05-01',
        end_date: '2026-05-05',
      })
    })
    expect(trip.origin).toBe('London')
    expect(trip.id).toBe('trip-123')
  })
})
