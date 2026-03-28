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
    const inAuthGroup = segments[0] === '(tabs)'
    if (!session && inAuthGroup) router.replace('/auth')
    if (session && !inAuthGroup) router.replace('/(tabs)')
  }, [session, loading, segments])

  return <Slot />
}
