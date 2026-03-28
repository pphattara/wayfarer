// app/(tabs)/plan/best-time.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import type { BestTimeResult, MonthData } from '../../../types'

export default function BestTimeScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const [result, setResult] = useState<BestTimeResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBestTime() }, [])

  async function fetchBestTime() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('best-time', { body: { destination } })
      if (error) throw error
      setResult(data as BestTimeResult)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const crowdColor = (level: MonthData['crowd_level']) =>
    ({ low: '#0F6E56', medium: '#F5A623', high: '#E8622A' }[level])

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 4 of 6</Text>
      <Text style={styles.title}>Best time to visit</Text>
      <Text style={styles.subtitle}>{destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : result ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.summaryCard}>
            <Text style={styles.optimalLabel}>Recommended months</Text>
            <Text style={styles.optimalMonths}>{result.optimal_months.join(' · ')}</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          {result.monthly_breakdown.map(m => (
            <View key={m.month} style={styles.monthRow}>
              <Text style={styles.monthName}>{m.month}</Text>
              <Text style={styles.weather}>{m.weather}</Text>
              <Text style={[styles.badge, { color: crowdColor(m.crowd_level) }]}>{m.crowd_level} crowds</Text>
              <Text style={styles.score}>{m.score}/10</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/visa', params: { tripId, destination } })}>
          <Text style={styles.nextText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  optimalLabel: { fontSize: 12, color: '#0F6E56', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  optimalMonths: { fontSize: 20, fontWeight: '800', color: '#111', marginVertical: 4 },
  summary: { fontSize: 14, color: '#666', lineHeight: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, gap: 8 },
  monthName: { width: 36, fontSize: 13, fontWeight: '700', color: '#333' },
  weather: { flex: 1, fontSize: 12, color: '#666' },
  badge: { fontSize: 11, fontWeight: '600' },
  score: { fontSize: 14, fontWeight: '800', color: '#111', width: 36, textAlign: 'right' },
  footer: { paddingVertical: 12 },
  nextButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 17 },
})
