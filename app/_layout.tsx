// app/_layout.tsx
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useAuth } from '../hooks/useAuth'

export default function RootLayout() {
  const { session, user, loading, profileLoading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading || (session && profileLoading)) return
    const inTabsGroup = segments[0] === '(tabs)'
    const isAuthRoute = segments[0] === 'auth'
    const isOnboarding = segments[0] === 'onboarding'

    if (!session && inTabsGroup) {
      router.replace('/auth')
      return
    }
    if (session && isAuthRoute) {
      const profileComplete = user?.display_name && user?.nationality
      router.replace(profileComplete ? '/(tabs)' : '/onboarding')
      return
    }
    if (session && isOnboarding && user?.display_name && user?.nationality) {
      router.replace('/(tabs)')
    }
  }, [session, user, loading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trip/[id]" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
    </Stack>
  )
}
