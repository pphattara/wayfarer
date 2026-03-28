// components/TripCard.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import type { Trip } from '../types'

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)}>
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientStrip}
      />
      <View style={styles.content}>
        <Text style={styles.destination}>{trip.destinations.join(', ')}</Text>
        <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{trip.status}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  gradientStrip: {
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: { padding: 16 },
  destination: { fontSize: 18, fontWeight: '800', color: '#0C4A6E' },
  dates: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 12 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#0EA5E9', textTransform: 'capitalize' },
})
