// components/ItineraryDay.tsx
import { View, Text, StyleSheet } from 'react-native'
import type { ItineraryDay as IDay } from '../types'

export function ItineraryDay({ day }: { day: IDay }) {
  return (
    <View style={styles.card}>
      <Text style={styles.dayLabel}>Day {day.day_number} — {day.date}</Text>
      {day.items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.time}>{item.time}</Text>
          <View style={styles.details}>
            <Text style={styles.place}>{item.place}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  dayLabel: { fontSize: 15, fontWeight: '700', color: '#0F6E56', marginBottom: 12 },
  item: { flexDirection: 'row', marginBottom: 10 },
  time: { width: 50, fontSize: 13, color: '#999', fontWeight: '600', paddingTop: 2 },
  details: { flex: 1 },
  place: { fontSize: 15, fontWeight: '600', color: '#111' },
  notes: { fontSize: 13, color: '#777', marginTop: 2 },
})
