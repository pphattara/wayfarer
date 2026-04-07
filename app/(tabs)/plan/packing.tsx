// app/(tabs)/plan/packing.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useTrip } from '../../../hooks/useTrip'
import { fetchForecast } from '../../../lib/openweather'
import type { WeatherForecastDay, PackingCategory } from '../../../types'

export default function PackingScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const { updateTrip } = useTrip()
  const [forecast, setForecast] = useState<WeatherForecastDay[]>([])
  const [packing, setPacking] = useState<PackingCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: trip } = await supabase
        .from('trips')
        .select('start_date, end_date')
        .eq('id', tripId)
        .single()

      if (!trip) throw new Error('Trip not found')

      const forecastData = await fetchForecast(destination, trip.start_date, trip.end_date)
      setForecast(forecastData)

      const { data, error } = await supabase.functions.invoke('packing-list', {
        body: { destination, start_date: trip.start_date, end_date: trip.end_date, forecast: forecastData },
      })
      if (error) throw error
      setPacking(data.packing_list)

      await supabase.from('weather_packs').insert({
        trip_id: tripId,
        forecast: forecastData,
        packing_list: data.packing_list,
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>
      <Text style={styles.step}>Step 6 of 6</Text>
      <Text style={styles.title}>Pack & weather</Text>
      <Text style={styles.subtitle}>{destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
          {forecast.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {forecast.map(day => (
                  <View key={day.date} style={styles.forecastCard}>
                    <Text style={styles.forecastDate}>{day.date.slice(5)}</Text>
                    <Text style={styles.forecastTemp}>{day.temp_min}–{day.temp_max}°</Text>
                    <Text style={styles.forecastDesc}>{day.description}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.sectionTitle}>What to pack</Text>
          {packing.map(cat => (
            <View key={cat.category} style={styles.packCard}>
              <Text style={styles.packCategory}>{cat.category}</Text>
              {cat.items.map((item, i) => (
                <Text key={i} style={styles.packItem}>• {item}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          style={styles.doneButton}
          onPress={async () => {
            // Persist weather pack and mark trip as confirmed
            if (tripId && forecast.length > 0) {
              await supabase.from('weather_packs').upsert({
                trip_id: tripId,
                forecast,
                packing_list: packing,
                fetched_at: new Date().toISOString(),
              }, { onConflict: 'trip_id' }).catch(() => {})
              // Mark trip as confirmed
              await updateTrip(tripId, { status: 'confirmed' }).catch(() => {})
            }
            // Pop back to the tab root first, then push trip detail
            // so the wizard stack is cleared
            router.dismissAll()
            router.push(`/trip/${tripId}`)
          }}
        >
          <Text style={styles.doneText}>View my trip ✓</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, color: '#0F6E56', fontWeight: '600' },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  forecastCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 10, alignItems: 'center', minWidth: 80 },
  forecastDate: { fontSize: 12, color: '#888', marginBottom: 4 },
  forecastTemp: { fontSize: 16, fontWeight: '700', color: '#111' },
  forecastDesc: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 2 },
  packCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  packCategory: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  packItem: { fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 },
  footer: { paddingVertical: 12 },
  doneButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 17 },
})
