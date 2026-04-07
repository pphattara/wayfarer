// components/TripCard.tsx
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import type { Trip } from '../types'

interface Props {
  trip: Trip
  onDelete?: () => void
  onEdit?: () => void
}

export function TripCard({ trip, onDelete, onEdit }: Props) {
  const router = useRouter()
  const isConfirmed = trip.status === 'confirmed'

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/trip/${trip.id}`)}
      accessibilityLabel={`Trip to ${trip.destinations.join(', ')}, ${trip.start_date} to ${trip.end_date}`}
    >
      <LinearGradient
        colors={['#085041', '#1D9E75']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.destination}>{trip.destinations.join(', ')}</Text>
        <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
      </LinearGradient>

      <View style={styles.bottom}>
        <View style={[styles.tag, isConfirmed ? styles.tagConfirmed : styles.tagPlanning]}>
          <Text style={[styles.tagText, isConfirmed ? styles.tagTextConfirmed : styles.tagTextPlanning]}>
            {trip.status}
          </Text>
        </View>

        {(onEdit || onDelete) && (
          <Pressable
            style={styles.menuBtn}
            hitSlop={10}
            accessibilityLabel="Trip options"
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
  menuBtn: { paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' },
  menuDots: { fontSize: 18, color: '#888', fontWeight: '700', lineHeight: 22 },
})
