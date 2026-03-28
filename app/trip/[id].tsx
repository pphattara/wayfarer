// app/trip/[id].tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getCachedItinerary, isCacheStale } from '../../lib/offline'
import { ItineraryDay } from '../../components/ItineraryDay'
import type { Trip, ItineraryDay as IDay } from '../../types'

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [days, setDays] = useState<IDay[]>([])
  const [stale, setStale] = useState(false)

  useEffect(() => { loadTrip() }, [])

  async function loadTrip() {
    // Try offline cache first
    const cached = await getCachedItinerary(id)
    if (cached) {
      setDays(cached.days)
      setStale(isCacheStale(cached.cachedAt))
    }

    // Fetch trip metadata
    const { data: tripData, error: tripError } = await supabase
      .from('trips').select('*').eq('id', id).single()
    if (tripError) console.error('Failed to load trip:', tripError)
    if (tripData) setTrip(tripData as Trip)

    // Fetch fresh itinerary from DB if not cached
    if (!cached) {
      const { data: dayData, error: dayError } = await supabase
        .from('itinerary_days').select('*').eq('trip_id', id).order('day_number')
      if (dayError) console.error('Failed to load itinerary:', dayError)
      if (dayData) setDays(dayData as IDay[])
    }
  }

  if (!trip) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{trip.destinations.join(', ')}</Text>
        <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
      </View>

      {stale && (
        <View style={styles.staleBanner}>
          <Text style={styles.staleText}>⚠ Offline — cached over 48 hours ago</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {days.map(day => <ItineraryDay key={day.day_number} day={day} />)}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  back: { marginBottom: 8 },
  backText: { color: '#0F6E56', fontWeight: '600', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#111' },
  dates: { fontSize: 14, color: '#888', marginTop: 4 },
  staleBanner: { backgroundColor: '#FFF3CD', padding: 10, alignItems: 'center' },
  staleText: { color: '#856404', fontSize: 13 },
})
