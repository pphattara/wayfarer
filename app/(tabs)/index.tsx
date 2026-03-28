// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTrip } from '../../hooks/useTrip'
import { TripCard } from '../../components/TripCard'
import type { Trip } from '../../types'

export default function HomeTab() {
  const router = useRouter()
  const { user } = useAuth()
  const { getUserTrips } = useTrip()
  const [trips, setTrips] = useState<Trip[]>([])

  useEffect(() => {
    getUserTrips().then(setTrips).catch(() => {})
  }, [])

  const upcoming = trips.filter(t => new Date(t.start_date) >= new Date())

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.greeting}>Hey{user?.display_name ? `, ${user.display_name}` : ''} 👋</Text>
      <Text style={styles.heading}>Your trips</Text>

      {upcoming.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips planned yet</Text>
          <Text style={styles.emptySubtitle}>Use the Plan tab to create your first trip with AI.</Text>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/plan')}>
            <Text style={styles.ctaText}>Plan a trip →</Text>
          </Pressable>
        </View>
      ) : (
        upcoming.map(trip => <TripCard key={trip.id} trip={trip} />)
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 15, color: '#888', marginBottom: 4 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  ctaButton: { backgroundColor: '#0F6E56', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
