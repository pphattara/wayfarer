// app/(tabs)/plan/interests.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { InterestChip } from '../../../components/InterestChip'

interface Chip { label: string; emoji: string }

const ALL_INTERESTS: Chip[] = [
  // Food & Drink
  { label: 'Local food', emoji: '🍜' },
  { label: 'Street food', emoji: '🌮' },
  { label: 'Fine dining', emoji: '🍷' },
  { label: 'Coffee & cafes', emoji: '☕' },
  { label: 'Markets', emoji: '🥦' },
  // Culture & History
  { label: 'Museums', emoji: '🏛' },
  { label: 'History', emoji: '🏰' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Architecture', emoji: '🏗' },
  { label: 'Religion & temples', emoji: '🛕' },
  { label: 'Local culture', emoji: '🎭' },
  // Nature & Outdoors
  { label: 'Nature', emoji: '🌿' },
  { label: 'Beaches', emoji: '🏖' },
  { label: 'Hiking', emoji: '🥾' },
  { label: 'Mountains', emoji: '🏔' },
  { label: 'Waterfalls', emoji: '💧' },
  { label: 'Wildlife', emoji: '🦁' },
  // Activities
  { label: 'Adventure', emoji: '🧗' },
  { label: 'Water sports', emoji: '🏄' },
  { label: 'Cycling', emoji: '🚴' },
  { label: 'Wellness & spa', emoji: '🧘' },
  { label: 'Nightlife', emoji: '🌙' },
  { label: 'Live music', emoji: '🎵' },
  // Practical
  { label: 'Shopping', emoji: '🛍' },
  { label: 'Photography', emoji: '📸' },
  { label: 'Family-friendly', emoji: '👨‍👩‍👧' },
  { label: 'Luxury', emoji: '💎' },
  { label: 'Budget travel', emoji: '💰' },
]

export default function InterestsScreen() {
  const { tripId, destination, origin, startDate, endDate } =
    useLocalSearchParams<{ tripId: string; destination: string; origin: string; startDate: string; endDate: string }>()
  const router = useRouter()
  const [suggested, setSuggested] = useState<Chip[]>([])
  const [loadingSuggested, setLoadingSuggested] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => { fetchSuggested() }, [])

  async function fetchSuggested() {
    setLoadingSuggested(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-chips', { body: { destination } })
      if (!error && data?.chips?.length) {
        // Only keep AI chips that aren't already in our master list
        const masterLabels = new Set(ALL_INTERESTS.map(c => c.label.toLowerCase()))
        const unique = (data.chips as Chip[]).filter(c => !masterLabels.has(c.label.toLowerCase()))
        setSuggested(unique.slice(0, 6))
      }
    } catch {
      // silently fail — full list is still shown
    } finally {
      setLoadingSuggested(false)
    }
  }

  function toggle(label: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function handleNext() {
    if (selected.size === 0) {
      // auto-select some defaults if user taps next without selecting
      const defaults = ['Local food', 'Local culture', 'History', 'Nature']
      setSelected(new Set(defaults.filter(d => ALL_INTERESTS.some(c => c.label === d))))
      return
    }
    router.push({
      pathname: '/(tabs)/plan/itinerary',
      params: { tripId, destination, origin, startDate, endDate, interests: JSON.stringify([...selected]) },
    })
  }

  const selectedCount = selected.size

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>

      <Text style={styles.step}>Step 2 of 6</Text>
      <Text style={styles.title}>What interests you?</Text>
      <Text style={styles.subtitle}>Pick everything that sounds good for {destination}</Text>

      {/* AI-suggested for destination */}
      {loadingSuggested ? (
        <View style={styles.suggestedLoading}>
          <ActivityIndicator size="small" color="#0F6E56" />
          <Text style={styles.suggestedLoadingText}>Finding top picks for {destination}…</Text>
        </View>
      ) : suggested.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Suggested for {destination}</Text>
          <View style={styles.chips}>
            {suggested.map(chip => (
              <InterestChip
                key={chip.label}
                label={chip.label}
                emoji={chip.emoji}
                selected={selected.has(chip.label)}
                onPress={() => toggle(chip.label)}
              />
            ))}
          </View>
        </>
      )}

      {/* Full interest list grouped */}
      <Text style={styles.sectionLabel}>Food & Drink</Text>
      <View style={styles.chips}>
        {ALL_INTERESTS.slice(0, 5).map(chip => (
          <InterestChip key={chip.label} label={chip.label} emoji={chip.emoji}
            selected={selected.has(chip.label)} onPress={() => toggle(chip.label)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Culture & History</Text>
      <View style={styles.chips}>
        {ALL_INTERESTS.slice(5, 11).map(chip => (
          <InterestChip key={chip.label} label={chip.label} emoji={chip.emoji}
            selected={selected.has(chip.label)} onPress={() => toggle(chip.label)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Nature & Outdoors</Text>
      <View style={styles.chips}>
        {ALL_INTERESTS.slice(11, 17).map(chip => (
          <InterestChip key={chip.label} label={chip.label} emoji={chip.emoji}
            selected={selected.has(chip.label)} onPress={() => toggle(chip.label)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Activities</Text>
      <View style={styles.chips}>
        {ALL_INTERESTS.slice(17, 24).map(chip => (
          <InterestChip key={chip.label} label={chip.label} emoji={chip.emoji}
            selected={selected.has(chip.label)} onPress={() => toggle(chip.label)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Style of travel</Text>
      <View style={styles.chips}>
        {ALL_INTERESTS.slice(24).map(chip => (
          <InterestChip key={chip.label} label={chip.label} emoji={chip.emoji}
            selected={selected.has(chip.label)} onPress={() => toggle(chip.label)} />
        ))}
      </View>

      <Pressable
        style={[styles.button, selectedCount === 0 && styles.buttonEmpty]}
        onPress={handleNext}
        accessibilityLabel="Next"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>
          {selectedCount === 0 ? 'Next →' : `Next → (${selectedCount} selected)`}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, color: '#0F6E56', fontWeight: '600' },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 20 },

  suggestedLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  suggestedLoadingText: { fontSize: 12, color: '#888' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9b9b96',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },

  button: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonEmpty: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
