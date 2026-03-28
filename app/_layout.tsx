// app/_layout.tsx
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useAuth } from '../hooks/useAuth'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inTabsGroup = segments[0] === '(tabs)'
    const isAuthRoute = segments[0] === 'auth'

    if (!session && inTabsGroup) router.replace('/auth')
    if (session && !inTabsGroup && !isAuthRoute) router.replace('/(tabs)')
  }, [session, loading, segments])

  return <Slot />
}
