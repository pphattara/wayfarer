// app/(tabs)/plan/itinerary.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { cacheItinerary } from '../../../lib/offline'
import { useTrip } from '../../../hooks/useTrip'
import { ItineraryDay } from '../../../components/ItineraryDay'
import type { ItineraryDay as IDay } from '../../../types'

interface FlightDetails {
  flightNumber: string
  departureTime: string   // HH:MM
  arrivalTime: string     // HH:MM
  checkinTime: string     // HH:MM
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      {children}
    </View>
  )
}

export default function ItineraryScreen() {
  const { tripId, destination, interests, origin, startDate, endDate } =
    useLocalSearchParams<{ tripId: string; destination: string; interests: string; origin: string; startDate: string; endDate: string }>()
  const router = useRouter()
  const { saveItinerary } = useTrip()

  // Pre-generation form state
  const [confirmed, setConfirmed] = useState(false)
  const [flight, setFlight] = useState<FlightDetails>({
    flightNumber: '',
    departureTime: '',
    arrivalTime: '',
    checkinTime: '',
  })

  // Generation state
  const [days, setDays] = useState<IDay[]>([])
  const [generating, setGenerating] = useState(false)

  function validateTime(val: string): boolean {
    return !val || /^([01]\d|2[0-3]):[0-5]\d$/.test(val)
  }

  function handleGenerate() {
    if (flight.departureTime && !validateTime(flight.departureTime))
      return Alert.alert('Invalid time', 'Departure time must be HH:MM (e.g. 09:30)')
    if (flight.arrivalTime && !validateTime(flight.arrivalTime))
      return Alert.alert('Invalid time', 'Arrival time must be HH:MM (e.g. 14:45)')
    if (flight.checkinTime && !validateTime(flight.checkinTime))
      return Alert.alert('Invalid time', 'Check-in time must be HH:MM (e.g. 15:00)')
    setConfirmed(true)
    generateItinerary()
  }

  async function generateItinerary() {
    setGenerating(true)
    setDays([])

    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          origin,
          destinations: [destination],
          start_date: startDate,
          end_date: endDate,
          interests: JSON.parse(interests),
          flight_number: flight.flightNumber || undefined,
          departure_time: flight.departureTime || undefined,
          arrival_time: flight.arrivalTime || undefined,
          checkin_time: flight.checkinTime || undefined,
        },
      })

      if (error) {
        console.error('invoke error:', JSON.stringify(error))
        let detail = error.message ?? 'Itinerary generation failed'
        try {
          const text = await (error as any).context?.text?.()
          console.error('edge fn body:', text)
          if (text) {
            const parsed = JSON.parse(text)
            if (parsed?.error) detail = parsed.error
          }
        } catch {}
        throw new Error(detail)
      }

      const finalDays = data as IDay[]
      if (!Array.isArray(finalDays) || finalDays.length === 0) {
        throw new Error('Itinerary came back empty. Please retry.')
      }
      setDays(finalDays)
      await saveItinerary(tripId, finalDays)
      await cacheItinerary(tripId, finalDays)
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        Alert.alert('Error', e.message)
        setConfirmed(false) // go back to form so user can retry
      }
    } finally {
      setGenerating(false)
    }
  }

  // ─── Pre-generation form ──────────────────────────────────────────────────
  if (!confirmed) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>

          <Text style={styles.step}>Step 3 of 6</Text>
          <Text style={styles.title}>Flight details</Text>
          <Text style={styles.subtitle}>
            Help us plan your first day more accurately. All fields are optional — skip if you don't have details yet.
          </Text>

          <View style={styles.tripSummary}>
            <Text style={styles.tripSummaryText}>✈  {origin} → {destination}</Text>
            <Text style={styles.tripSummaryText}>📅  {startDate} – {endDate}</Text>
          </View>

          <Field label="Flight number" hint="Optional">
            <TextInput
              style={styles.input}
              placeholder="e.g. TG917"
              placeholderTextColor="#9b9b96"
              value={flight.flightNumber}
              onChangeText={v => setFlight(f => ({ ...f, flightNumber: v }))}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Departure time" hint="When your flight leaves (HH:MM)">
            <TextInput
              style={styles.input}
              placeholder="e.g. 09:30"
              placeholderTextColor="#9b9b96"
              value={flight.departureTime}
              onChangeText={v => setFlight(f => ({ ...f, departureTime: v }))}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </Field>

          <Field label="Arrival time" hint="When you land at destination (HH:MM)">
            <TextInput
              style={styles.input}
              placeholder="e.g. 14:45"
              placeholderTextColor="#9b9b96"
              value={flight.arrivalTime}
              onChangeText={v => setFlight(f => ({ ...f, arrivalTime: v }))}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </Field>

          <Field label="Accommodation check-in time" hint="So we don't plan activities before you can drop bags (HH:MM)">
            <TextInput
              style={styles.input}
              placeholder="e.g. 15:00"
              placeholderTextColor="#9b9b96"
              value={flight.checkinTime}
              onChangeText={v => setFlight(f => ({ ...f, checkinTime: v }))}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </Field>

          <Pressable style={styles.generateBtn} onPress={handleGenerate}>
            <Text style={styles.generateBtnText}>Generate itinerary →</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={() => { setConfirmed(true); generateItinerary() }}>
            <Text style={styles.skipBtnText}>Skip — generate without flight details</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ─── Generation / result view ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Pressable onPress={() => setConfirmed(false)} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>
      <Text style={styles.step}>Step 3 of 6</Text>
      <Text style={styles.title}>Your itinerary</Text>

      {generating && days.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0F6E56" size="large" />
          <Text style={styles.loadingText}>Generating your personalised plan…</Text>
          {flight.arrivalTime && (
            <Text style={styles.loadingSubtext}>Accounting for arrival at {flight.arrivalTime}</Text>
          )}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {days.map(day => <ItineraryDay key={day.day_number} day={day} />)}
      </ScrollView>

      {!generating && days.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.retryButton} onPress={() => { setConfirmed(false); setDays([]) }}>
            <Text style={styles.retryText}>Change details</Text>
          </Pressable>
          <Pressable style={styles.regenerateButton} onPress={generateItinerary}>
            <Text style={styles.regenerateText}>Regenerate</Text>
          </Pressable>
          <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/best-time', params: { tripId, destination } })}>
            <Text style={styles.nextText}>Next →</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, color: '#0F6E56', fontWeight: '600' },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 20 },

  tripSummary: {
    backgroundColor: '#E1F5EE', borderRadius: 12, padding: 14, marginBottom: 24, gap: 4,
  },
  tripSummaryText: { fontSize: 13, color: '#04342C', fontWeight: '600' },

  fieldWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 2 },
  fieldHint: { fontSize: 11, color: '#9b9b96', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a18', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },

  generateBtn: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipBtn: { padding: 14, alignItems: 'center' },
  skipBtnText: { color: '#9b9b96', fontSize: 13 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#444', fontSize: 15, fontWeight: '600' },
  loadingSubtext: { color: '#888', fontSize: 13 },
  scroll: { flex: 1 },

  footer: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  retryButton: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ccc' },
  retryText: { color: '#666', fontWeight: '600', fontSize: 12 },
  regenerateButton: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#0F6E56' },
  regenerateText: { color: '#0F6E56', fontWeight: '700', fontSize: 12 },
  nextButton: { flex: 2, backgroundColor: '#0F6E56', borderRadius: 12, padding: 12, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
