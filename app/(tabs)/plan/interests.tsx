// app/(tabs)/plan/interests.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { InterestChip } from '../../../components/InterestChip'

interface Chip { label: string; emoji: string }

export default function InterestsScreen() {
  const { tripId, destination, origin, startDate, endDate } = useLocalSearchParams<{ tripId: string; destination: string; origin: string; startDate: string; endDate: string }>()
  const router = useRouter()
  const [chips, setChips] = useState<Chip[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchChips() }, [])

  async function fetchChips() {
    setLoading(true)
    try {
      const { data } = await supabase.functions.invoke('generate-chips', { body: { destination } })
      setChips(data.chips ?? [])
    } catch {
      setChips([
        { label: 'Culture', emoji: '🏛' },
        { label: 'Food', emoji: '🍜' },
        { label: 'Nature', emoji: '🏔' },
        { label: 'Shopping', emoji: '🛍' },
        { label: 'Nightlife', emoji: '🎭' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function toggleChip(label: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function handleNext() {
    if (selected.size === 0) return Alert.alert('Pick at least one interest')
    router.push({
      pathname: '/(tabs)/plan/itinerary',
      params: { tripId, destination, origin, startDate, endDate, interests: JSON.stringify([...selected]) },
    })
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>Step 2 of 6</Text>
      <Text style={styles.title}>What interests you?</Text>
      <Text style={styles.subtitle}>Select all that apply for {destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" style={{ marginTop: 32 }} />
      ) : (
        <View style={styles.chips}>
          {chips.map(chip => (
            <InterestChip
              key={chip.label}
              label={chip.label}
              emoji={chip.emoji}
              selected={selected.has(chip.label)}
              onPress={() => toggleChip(chip.label)}
            />
          ))}
        </View>
      )}

      <Pressable style={[styles.button, selected.size === 0 && styles.buttonDisabled]} onPress={handleNext} disabled={selected.size === 0}>
        <Text style={styles.buttonText}>Next →</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 32 },
  button: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
