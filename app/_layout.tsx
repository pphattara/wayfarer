// app/_layout.tsx
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

function RootLayoutNav() {
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
  }, [session, user, loading, profileLoading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0F6E56" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trip/[id]" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}
