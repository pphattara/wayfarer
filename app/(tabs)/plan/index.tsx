// app/(tabs)/plan/index.tsx
import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTrip } from '../../../hooks/useTrip'
import { useAuth } from '../../../hooks/useAuth'

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <LinearGradient
        colors={['#0EA5E9', '#0284C7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.step}>Step 1 of 6</Text>
        <Text style={styles.title}>Where are you going?</Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.label}>From</Text>
        <TextInput style={styles.input} placeholder="London, UK" value={origin} onChangeText={setOrigin} />

        <Text style={styles.label}>Destination</Text>
        <TextInput style={styles.input} placeholder="Rome, Italy" value={destination} onChangeText={setDestination} />

        <Text style={styles.label}>Departure date</Text>
        <TextInput style={styles.input} placeholder="e.g. 2026-05-01" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>Return date</Text>
        <TextInput style={styles.input} placeholder="e.g. 2026-05-07" value={endDate} onChangeText={setEndDate} keyboardType="numbers-and-punctuation" />

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating trip...' : 'Next \u2192'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
  },
  step: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  formCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#0C4A6E', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  button: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
