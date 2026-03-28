// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTrip } from '../../hooks/useTrip'
import { TripCard } from '../../components/TripCard'
import type { Trip } from '../../types'

const MOCK_DESTINATIONS: [string, string][] = [
  ['🇬🇧', 'London'],
  ['🇫🇷', 'Paris'],
  ['🇯🇵', 'Tokyo'],
  ['🇮🇹', 'Rome'],
]

export default function HomeTab() {
  const router = useRouter()
  const { user } = useAuth()
  const { getUserTrips } = useTrip()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserTrips()
      .then(setTrips)
      .catch((err) => console.error('Failed to load trips:', err))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = trips.filter(t => new Date(t.start_date) >= new Date())

  // Build story circles: use real trips mapped to circles, fall back to mock data
  const storyItems: [string, string][] =
    trips.length > 0
      ? trips.map(t => ['✈️', t.destinations[0] ?? 'Trip'])
      : MOCK_DESTINATIONS

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Greeting */}
      <Text style={styles.greeting}>
        Sawadee{user?.display_name ? `, ${user.display_name}` : ''} 👋
      </Text>
      <Text style={styles.subline}>Where to next?</Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destinations, trips, people..."
          placeholderTextColor="#9b9b96"
        />
      </View>

      {/* Recent trips stories */}
      <Text style={styles.sectionLabel}>Recent trips</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storyScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
      >
        {storyItems.map(([flag, city], idx) => (
          <View key={idx} style={styles.storyItem}>
            <View style={styles.storyCircle}>
              <Text style={styles.storyFlag}>{flag}</Text>
            </View>
            <Text style={styles.storyCity}>{city}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Upcoming trips */}
      <Text style={styles.sectionLabel}>Upcoming trips</Text>

      {loading ? (
        <Text style={styles.emptySubtitle}>Loading…</Text>
      ) : upcoming.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips planned yet</Text>
          <Text style={styles.emptySubtitle}>Use the Plan tab to create your first trip with AI.</Text>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/plan')}>
            <Text style={styles.ctaText}>Plan your first trip</Text>
          </Pressable>
        </View>
      ) : (
        upcoming.map(trip => <TripCard key={trip.id} trip={trip} />)
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 60 },
  greeting: { fontSize: 15, fontWeight: '600', color: '#1a1a18', marginBottom: 2, paddingHorizontal: 16 },
  subline: { fontSize: 10, color: '#6b6b66', marginBottom: 16, paddingHorizontal: 16 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f2',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 10,
    height: 30,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 11, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 10, color: '#1a1a18' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a18', marginBottom: 10, paddingHorizontal: 16 },

  storyScroll: { marginBottom: 20 },
  storyItem: { alignItems: 'center', gap: 4 },
  storyCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#0F6E56',
    backgroundColor: '#f5f5f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyFlag: { fontSize: 18 },
  storyCity: { fontSize: 8, color: '#6b6b66' },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a18', marginBottom: 8 },
  emptySubtitle: { fontSize: 12, color: '#6b6b66', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  ctaButton: { backgroundColor: '#0F6E56', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
