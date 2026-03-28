// app/(tabs)/plan/itinerary.tsx
import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { cacheItinerary } from '../../../lib/offline'
import { useTrip } from '../../../hooks/useTrip'
import { ItineraryDay } from '../../../components/ItineraryDay'
import type { ItineraryDay as IDay } from '../../../types'

export default function ItineraryScreen() {
  const { tripId, destination, interests, origin, startDate, endDate } = useLocalSearchParams<{ tripId: string; destination: string; interests: string; origin: string; startDate: string; endDate: string }>()
  const router = useRouter()
  const { saveItinerary } = useTrip()
  const [days, setDays] = useState<IDay[]>([])
  const [streaming, setStreaming] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    generateItinerary()
    return () => abortRef.current?.abort()
  }, [])

  async function generateItinerary() {
    abortRef.current = new AbortController()
    setStreaming(true)
    setDays([])

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-itinerary`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destinations: [destination],
            start_date: startDate,
            end_date: endDate,
            interests: JSON.parse(interests),
          }),
          signal: abortRef.current.signal,
        }
      )

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        try {
          const parsed = JSON.parse(buffer) as IDay[]
          setDays(parsed)
        } catch {
          // not yet complete JSON — keep streaming
        }
      }

      try {
        const finalDays = JSON.parse(buffer) as IDay[]
        setDays(finalDays)
        await saveItinerary(tripId, finalDays)
        await cacheItinerary(tripId, finalDays)
      } catch {
        Alert.alert('Parse error', 'Could not parse itinerary. Please retry.')
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') Alert.alert('Error', e.message)
    } finally {
      setStreaming(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 3 of 6</Text>
      <Text style={styles.title}>Your itinerary</Text>

      {streaming && days.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0F6E56" size="large" />
          <Text style={styles.loadingText}>Generating your personalised plan…</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {days.map(day => <ItineraryDay key={day.day_number} day={day} />)}
      </ScrollView>

      {!streaming && days.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.retryButton} onPress={generateItinerary}>
            <Text style={styles.retryText}>Regenerate</Text>
          </Pressable>
          <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/best-time', params: { tripId, destination } })}>
            <Text style={styles.nextText}>Next →</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#666', fontSize: 15 },
  scroll: { flex: 1 },
  footer: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  retryButton: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#0F6E56' },
  retryText: { color: '#0F6E56', fontWeight: '700', fontSize: 15 },
  nextButton: { flex: 2, backgroundColor: '#0F6E56', borderRadius: 14, padding: 14, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
