// components/TripCard.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import type { Trip } from '../types'

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)}>
      <Text style={styles.destination}>{trip.destinations.join(', ')}</Text>
      <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
      <View style={[styles.badge, trip.status === 'confirmed' && styles.badgeConfirmed]}>
        <Text style={styles.badgeText}>{trip.status}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  destination: { fontSize: 18, fontWeight: '800', color: '#111' },
  dates: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeConfirmed: { backgroundColor: '#e8f5f0' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#0F6E56', textTransform: 'capitalize' },
})
