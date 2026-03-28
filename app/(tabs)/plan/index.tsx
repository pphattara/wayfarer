// app/(tabs)/plan/index.tsx
import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>Step 1 of 6</Text>
      <Text style={styles.title}>Where are you going?</Text>

      <Text style={styles.label}>From</Text>
      <TextInput style={styles.input} placeholder="London, UK" value={origin} onChangeText={setOrigin} />

      <Text style={styles.label}>Destination</Text>
      <TextInput style={styles.input} placeholder="Rome, Italy" value={destination} onChangeText={setDestination} />

      <Text style={styles.label}>Departure date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-05-01" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" />

      <Text style={styles.label}>Return date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-05-07" value={endDate} onChangeText={setEndDate} keyboardType="numbers-and-punctuation" />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating trip...' : 'Next \u2192'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  button: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
