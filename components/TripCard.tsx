// components/TripCard.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import type { Trip } from '../types'

function mockTravellers(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  return 100 + (hash % 500)
}

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  const isConfirmed = trip.status === 'confirmed'
  const travellers = mockTravellers(trip.id)

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)}>
      {/* Top gradient section */}
      <LinearGradient
        colors={['#085041', '#1D9E75']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.destination}>{trip.destinations.join(', ')}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ 4.8</Text>
        </View>
      </LinearGradient>

      {/* Bottom section */}
      <View style={styles.bottom}>
        <View style={[styles.tag, isConfirmed ? styles.tagConfirmed : styles.tagPlanning]}>
          <Text style={[styles.tagText, isConfirmed ? styles.tagTextConfirmed : styles.tagTextPlanning]}>
            {trip.status}
          </Text>
        </View>
        <Text style={styles.travellers}>{travellers} travellers this month</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gradient: {
    height: 65,
    justifyContent: 'flex-end',
    padding: 8,
  },
  destination: { fontSize: 10, fontWeight: '600', color: '#ffffff' },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: { fontSize: 9, fontWeight: '600', color: '#0F6E56' },
  bottom: {
    height: 35,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  tag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagPlanning: { backgroundColor: '#E1F5EE' },
  tagConfirmed: { backgroundColor: '#EEEDFE' },
  tagText: { fontSize: 8, fontWeight: '600', textTransform: 'capitalize' },
  tagTextPlanning: { color: '#0F6E56' },
  tagTextConfirmed: { color: '#534AB7' },
  travellers: { fontSize: 9, color: '#6b6b66' },
})
