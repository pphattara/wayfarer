// app/(tabs)/plan/index.tsx
import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useTrip } from '../../../hooks/useTrip'
import { useAuth } from '../../../hooks/useAuth'

const STEPS = 6
const CURRENT_STEP = 1

export default function TripSetupScreen() {
  const router = useRouter()
  const { createTrip } = useTrip()
  const { user } = useAuth()

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (!origin.trim()) return 'Please enter your origin city.'
    if (!destination.trim()) return 'Please enter a destination.'
    if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Start date must be YYYY-MM-DD.'
    if (!endDate.match(/^\d{4}-\d{2}-\d{2}$/)) return 'End date must be YYYY-MM-DD.'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(startDate) < today) return 'Start date cannot be in the past.'
    if (new Date(endDate) <= new Date(startDate)) return 'End date must be after start date.'
    return null
  }

  async function handleNext() {
    const err = validate()
    if (err) return Alert.alert('Check your input', err)
    setLoading(true)
    try {
      const trip = await createTrip({
        origin: origin.trim(),
        destinations: [destination.trim()],
        start_date: startDate,
        end_date: endDate,
      })
      router.push({ pathname: '/(tabs)/plan/interests', params: { tripId: trip.id, destination: destination.trim(), origin: origin.trim(), startDate, endDate } })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = (CURRENT_STEP / STEPS) * 100

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Trip Planner</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* AI bubble */}
        <View style={styles.aiBubble}>
          <Text style={styles.aiBubbleText}>
            Hi{user?.display_name ? ` ${user.display_name}` : ''}! Where would you like to go?
          </Text>
        </View>

        {/* Form */}
        <Text style={styles.label}>From</Text>
        <TextInput
          style={styles.input}
          placeholder="London, UK"
          placeholderTextColor="#9b9b96"
          value={origin}
          onChangeText={setOrigin}
        />

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={styles.input}
          placeholder="Rome, Italy"
          placeholderTextColor="#9b9b96"
          value={destination}
          onChangeText={setDestination}
        />

        <Text style={styles.label}>Departure date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-05-01"
          placeholderTextColor="#9b9b96"
          value={startDate}
          onChangeText={setStartDate}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Return date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-05-07"
          placeholderTextColor="#9b9b96"
          value={endDate}
          onChangeText={setEndDate}
          keyboardType="numbers-and-punctuation"
        />

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating trip...' : 'Next \u2192'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f2' },
  header: {
    backgroundColor: '#0F6E56',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    width: '100%',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#0F6E56',
  },
  container: { padding: 16, paddingTop: 20 },
  aiBubble: {
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  aiBubbleText: { fontSize: 10, color: '#04342C', lineHeight: 16 },
  label: { fontSize: 10, color: '#6b6b66', marginBottom: 6 },
  input: {
    backgroundColor: '#f5f5f2',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    color: '#1a1a18',
  },
  button: {
    backgroundColor: '#0F6E56',
    borderRadius: 10,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})
