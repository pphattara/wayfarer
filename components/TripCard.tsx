// components/TripCard.tsx
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import type { Trip } from '../types'

function mockTravellers(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  return 100 + (hash % 500)
}

interface Props {
  trip: Trip
  onDelete?: () => void
  onEdit?: () => void
}

export function TripCard({ trip, onDelete, onEdit }: Props) {
  const router = useRouter()
  const isConfirmed = trip.status === 'confirmed'
  const travellers = mockTravellers(trip.id)

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)}>
      <LinearGradient
        colors={['#085041', '#1D9E75']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.destination}>{trip.destinations.join(', ')}</Text>
        <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ 4.8</Text>
        </View>
      </LinearGradient>

      <View style={styles.bottom}>
        <View style={[styles.tag, isConfirmed ? styles.tagConfirmed : styles.tagPlanning]}>
          <Text style={[styles.tagText, isConfirmed ? styles.tagTextConfirmed : styles.tagTextPlanning]}>
            {trip.status}
          </Text>
        </View>
        <Text style={styles.travellers}>{travellers} travellers this month</Text>

        {(onEdit || onDelete) && (
          <Pressable
            style={styles.menuBtn}
            hitSlop={10}
            onPress={() => {
              Alert.alert(
                trip.destinations.join(', '),
                undefined,
                [
                  ...(onEdit ? [{ text: 'Edit trip', onPress: onEdit }] : []),
                  ...(onDelete ? [{ text: 'Delete trip', style: 'destructive' as const, onPress: onDelete }] : []),
                  { text: 'Cancel', style: 'cancel' as const },
                ]
              )
            }}
          >
            <Text style={styles.menuDots}>⋮</Text>
          </Pressable>
        )}
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
  gradient: { minHeight: 70, justifyContent: 'flex-end', padding: 10 },
  destination: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  dates: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ratingBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#ffffff', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { fontSize: 9, fontWeight: '600', color: '#0F6E56' },
  bottom: {
    minHeight: 36, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, gap: 8,
  },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagPlanning: { backgroundColor: '#E1F5EE' },
  tagConfirmed: { backgroundColor: '#EEEDFE' },
  tagText: { fontSize: 8, fontWeight: '600', textTransform: 'capitalize' },
  tagTextPlanning: { color: '#0F6E56' },
  tagTextConfirmed: { color: '#534AB7' },
  travellers: { flex: 1, fontSize: 9, color: '#6b6b66' },
  menuBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  menuDots: { fontSize: 18, color: '#888', fontWeight: '700', lineHeight: 22 },
})
