// __tests__/contexts/AuthContext.test.tsx
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb: any) => {
        cb('SIGNED_IN', { user: { id: 'u1' } })
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'u1', display_name: 'Prince', nationality: 'Thai', email: 'p@test.com', avatar_url: null, passport_expiry: null, passport2_nationality: null, passport2_expiry: null, visas: [] },
        error: null,
      }),
    })),
  },
}))

import { render, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'

function TestConsumer() {
  const { user, loading } = useAuth()
  if (loading) return <Text testID="loading">loading</Text>
  return <Text testID="name">{user?.display_name ?? 'none'}</Text>
}

test('provides user after auth state change', async () => {
  const { getByTestId } = render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  )
  await waitFor(() => expect(getByTestId('name').props.children).toBe('Prince'))
})

test('throws when useAuth used outside provider', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider')
  consoleSpy.mockRestore()
})
