// components/ItineraryDay.tsx
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native'
import type { ItineraryDay as IDay, ItineraryItem } from '../types'

interface Props {
  day: IDay
  editing?: boolean
  onUpdateItem?: (i: number, field: keyof ItineraryItem, value: string) => void
  onDeleteItem?: (i: number) => void
  onMoveItem?: (from: number, to: number) => void
  onAddItem?: () => void
}

export function ItineraryDay({ day, editing, onUpdateItem, onDeleteItem, onMoveItem, onAddItem }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.dayLabel}>Day {day.day_number} — {day.date}</Text>

      {day.items.map((item, i) => (
        <View key={i}>
          {editing ? (
            <View style={styles.editRow}>
              <View style={styles.editFields}>
                <TextInput
                  style={styles.inputTime}
                  value={item.time}
                  onChangeText={v => onUpdateItem?.(i, 'time', v)}
                  placeholder="HH:MM"
                  placeholderTextColor="#bbb"
                />
                <TextInput
                  style={styles.inputPlace}
                  value={item.place}
                  onChangeText={v => onUpdateItem?.(i, 'place', v)}
                  placeholder="Place or activity"
                  placeholderTextColor="#bbb"
                />
                <TextInput
                  style={styles.inputNotes}
                  value={item.notes}
                  onChangeText={v => onUpdateItem?.(i, 'notes', v)}
                  placeholder="Notes (optional)"
                  placeholderTextColor="#bbb"
                  multiline
                />
              </View>
              <View style={styles.editActions}>
                <Pressable onPress={() => onMoveItem?.(i, i - 1)} disabled={i === 0} style={styles.moveBtn}>
                  <Text style={[styles.moveTxt, i === 0 && styles.dim]}>↑</Text>
                </Pressable>
                <Pressable onPress={() => onMoveItem?.(i, i + 1)} disabled={i === day.items.length - 1} style={styles.moveBtn}>
                  <Text style={[styles.moveTxt, i === day.items.length - 1 && styles.dim]}>↓</Text>
                </Pressable>
                <Pressable onPress={() => onDeleteItem?.(i)} style={styles.deleteBtn}>
                  <Text style={styles.deleteTxt}>✕</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.item}>
              <Text style={styles.time}>{item.time}</Text>
              <View style={styles.details}>
                <Text style={styles.place}>{item.place}</Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              </View>
            </View>
          )}

          {/* Transport connector — shown in both view and edit mode */}
          {item.transport_to_next && i < day.items.length - 1 && (
            <View style={styles.transport}>
              <View style={styles.transportLine} />
              <View style={styles.transportBadge}>
                <Text style={styles.transportIcon}>🚶</Text>
                <Text style={styles.transportText}>{item.transport_to_next}</Text>
              </View>
              <View style={styles.transportLine} />
            </View>
          )}
        </View>
      ))}

      {editing && (
        <Pressable style={styles.addBtn} onPress={onAddItem}>
          <Text style={styles.addTxt}>+ Add stop</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  dayLabel: { fontSize: 15, fontWeight: '700', color: '#0F6E56', marginBottom: 12 },

  // View mode
  item: { flexDirection: 'row', marginBottom: 4 },
  time: { width: 50, fontSize: 13, color: '#999', fontWeight: '600', paddingTop: 2 },
  details: { flex: 1 },
  place: { fontSize: 15, fontWeight: '600', color: '#111' },
  notes: { fontSize: 13, color: '#777', marginTop: 2 },

  // Transport connector
  transport: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, marginLeft: 8 },
  transportLine: { flex: 1, height: 1, backgroundColor: '#e8e8e8' },
  transportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0F9F5', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginHorizontal: 6,
  },
  transportIcon: { fontSize: 11 },
  transportText: { fontSize: 11, color: '#0F6E56', fontWeight: '600' },

  // Edit mode
  editRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  editFields: { flex: 1, gap: 4 },
  inputTime: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: '#111', width: 72,
  },
  inputPlace: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, color: '#111', fontWeight: '600',
  },
  inputNotes: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: '#444', minHeight: 36,
  },
  editActions: { justifyContent: 'center', gap: 4 },
  moveBtn: { padding: 4 },
  moveTxt: { fontSize: 16, color: '#0F6E56', fontWeight: '700' },
  dim: { color: '#ccc' },
  deleteBtn: { padding: 4, marginTop: 4 },
  deleteTxt: { fontSize: 14, color: '#e05555', fontWeight: '700' },

  addBtn: {
    marginTop: 4, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#0F6E56', borderStyle: 'dashed', alignItems: 'center',
  },
  addTxt: { fontSize: 14, color: '#0F6E56', fontWeight: '600' },
})
