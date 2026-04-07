// __tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react-native'
import React from 'react'

// Mock supabase before importing hook
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

import { useAuth } from '../../hooks/useAuth'
import { AuthProvider } from '../../contexts/AuthContext'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children)

const getMockOnAuthStateChange = () =>
  require('../../lib/supabase').supabase.auth.onAuthStateChange as jest.Mock

beforeEach(() => {
  getMockOnAuthStateChange().mockClear()
  getMockOnAuthStateChange().mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  })
})

describe('useAuth', () => {
  it('initialises with null session, null user, and loading true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('sets loading false after INITIAL_SESSION fires', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    const callback = getMockOnAuthStateChange().mock.calls[0][0]
    await act(async () => {
      callback('INITIAL_SESSION', null)
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.session).toBeNull()
  })

  it('exposes a signOut function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(typeof result.current.signOut).toBe('function')
  })
})
