// app/(tabs)/plan/visa.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { VisaSummary } from '../../../types'

export default function VisaScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [visa, setVisa] = useState<Partial<VisaSummary> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchVisa() }, [])

  async function fetchVisa() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('visa-check', {
        body: { nationality: user?.nationality || 'Unknown', destination },
      })
      if (error) throw error
      setVisa(data)
      await supabase.from('visa_summaries').insert({
        trip_id: tripId,
        nationality: user?.nationality || 'Unknown',
        destination,
        content: data,
      })
    } catch (e: any) {
      Alert.alert('Visa check failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 5 of 6</Text>
      <Text style={styles.title}>Visa & documents</Text>
      <Text style={styles.subtitle}>{user?.nationality} → {destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : visa ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.card}>
            <Text style={styles.visaType}>{visa.visa_type}</Text>
            <Text style={styles.timeline}>{visa.timeline}</Text>
          </View>

          <Text style={styles.sectionTitle}>Steps</Text>
          {(visa.steps ?? []).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Documents needed</Text>
          {(visa.checklist ?? []).map((doc, i) => (
            <Text key={i} style={styles.checkItem}>✓  {doc}</Text>
          ))}

          {visa.cost_estimate && (
            <>
              <Text style={styles.sectionTitle}>Estimated cost</Text>
              <Text style={styles.cost}>{visa.cost_estimate}</Text>
            </>
          )}

          {visa.embassy_url ? (
            <Pressable style={styles.embassyButton} onPress={() => Linking.openURL(visa.embassy_url as string)}>
              <Text style={styles.embassyText}>Official embassy website →</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/packing', params: { tripId, destination } })}>
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  visaType: { fontSize: 22, fontWeight: '800', color: '#6B7BFF' },
  timeline: { fontSize: 14, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6B7BFF', color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '700', lineHeight: 22 },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  checkItem: { fontSize: 14, color: '#333', marginBottom: 6, lineHeight: 20 },
  cost: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
  embassyButton: { backgroundColor: '#f0f0ff', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  embassyText: { color: '#6B7BFF', fontWeight: '700', fontSize: 15 },
  footer: { paddingVertical: 12 },
  nextButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 17 },
})
