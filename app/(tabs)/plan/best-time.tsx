// app/(tabs)/plan/best-time.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native'
import { useLocalSearchParams, useRouter, router as Router } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { BestTimeResult, MonthData } from '../../../types'

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CURRENT_MONTH = MONTH_ABBR[new Date().getMonth()]

function scoreBar(score: number) {
  const filled = Math.round(score)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function crowdColor(level: MonthData['crowd_level']) {
  return { low: '#0F6E56', medium: '#F5A623', high: '#E8622A' }[level]
}

function costColor(level: MonthData['cost_index']) {
  return { low: '#0F6E56', medium: '#F5A623', high: '#E8622A' }[level]
}

function isCurrentMonth(month: string) {
  return MONTH_ABBR.some(abbr => month.startsWith(abbr) && abbr === CURRENT_MONTH)
    || month.toLowerCase().startsWith(CURRENT_MONTH.toLowerCase())
}

export default function BestTimeScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const canGoBack = Router.canGoBack()
  const { session } = useAuth()
  const [result, setResult] = useState<BestTimeResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MonthData | null>(null)

  useEffect(() => { fetchBestTime() }, [])

  async function fetchBestTime() {
    setLoading(true)
    try {
      const token = session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      const { data, error } = await supabase.functions.invoke('best-time', {
        body: { destination },
        headers: { Authorization: `Bearer ${token}` },
      })
      if (error) throw error
      setResult(data as BestTimeResult)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  function buildSortedMonths(breakdown: MonthData[]): MonthData[] {
    const current = breakdown.find(m => isCurrentMonth(m.month))
    const recommended = breakdown.filter(m =>
      result?.optimal_months.some(opt => m.month.startsWith(opt) || opt.startsWith(m.month))
      && !isCurrentMonth(m.month)
    )
    const rest = breakdown.filter(m =>
      !isCurrentMonth(m.month) &&
      !recommended.includes(m)
    )
    return [
      ...(current ? [current] : []),
      ...recommended,
      ...rest,
    ]
  }

  const sorted = result ? buildSortedMonths(result.monthly_breakdown) : []

  return (
    <View style={styles.container}>
      {canGoBack && (
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      )}
      <Text style={styles.step}>Step 4 of 6</Text>
      <Text style={styles.title}>Best time to visit</Text>
      <Text style={styles.subtitle}>{destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : result ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Recommended months banner */}
          <View style={styles.recommendedCard}>
            <Text style={styles.recommendedLabel}>Recommended months</Text>
            <Text style={styles.recommendedMonths}>{result.optimal_months.join(' · ')}</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          {/* Month rows */}
          <Text style={styles.sectionLabel}>All months — tap for details</Text>
          {sorted.map(m => {
            const isCurrent = isCurrentMonth(m.month)
            const isRecommended = result.optimal_months.some(
              opt => m.month.startsWith(opt) || opt.startsWith(m.month)
            )
            return (
              <Pressable
                key={m.month}
                style={[
                  styles.monthRow,
                  isCurrent && styles.monthRowCurrent,
                  isRecommended && !isCurrent && styles.monthRowRecommended,
                ]}
                onPress={() => setSelected(m)}
              >
                {/* Left: month + tags */}
                <View style={styles.monthLeft}>
                  <View style={styles.monthNameRow}>
                    <Text style={[styles.monthName, isCurrent && styles.monthNameCurrent]}>
                      {m.month.slice(0, 3)}
                    </Text>
                    {isCurrent && <View style={styles.nowTag}><Text style={styles.nowTagText}>NOW</Text></View>}
                    {isRecommended && <View style={styles.bestTag}><Text style={styles.bestTagText}>BEST</Text></View>}
                  </View>
                  <Text style={styles.weatherLine} numberOfLines={1}>{m.weather}</Text>
                </View>

                {/* Score bar */}
                <View style={styles.scoreWrap}>
                  <Text style={styles.scoreBar}>{scoreBar(m.score)}</Text>
                  <Text style={styles.scoreNum}>{m.score}/10</Text>
                </View>

                {/* Arrow */}
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/visa', params: { tripId, destination } })}>
          <Text style={styles.nextText}>Next →</Text>
        </Pressable>
      </View>

      {/* Month detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)} />
        {selected && (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetMonth}>{selected.month}</Text>

            <View style={styles.sheetScoreRow}>
              <Text style={styles.sheetScoreLabel}>Overall score</Text>
              <Text style={styles.sheetScoreValue}>{selected.score}/10</Text>
            </View>
            <View style={styles.sheetScoreBarWrap}>
              <View style={[styles.sheetScoreBarFill, { width: `${selected.score * 10}%` }]} />
            </View>

            <View style={styles.sheetDivider} />

            <Text style={styles.sheetSectionLabel}>Weather</Text>
            <Text style={styles.sheetDetail}>{selected.weather}</Text>

            <View style={styles.sheetDivider} />

            <View style={styles.sheetMetaRow}>
              <View style={styles.sheetMetaItem}>
                <Text style={styles.sheetMetaLabel}>Crowds</Text>
                <View style={[styles.sheetBadge, { backgroundColor: crowdColor(selected.crowd_level) + '20' }]}>
                  <Text style={[styles.sheetBadgeText, { color: crowdColor(selected.crowd_level) }]}>
                    {selected.crowd_level.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.sheetMetaItem}>
                <Text style={styles.sheetMetaLabel}>Cost</Text>
                <View style={[styles.sheetBadge, { backgroundColor: costColor(selected.cost_index) + '20' }]}>
                  <Text style={[styles.sheetBadgeText, { color: costColor(selected.cost_index) }]}>
                    {selected.cost_index.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.sheetMetaItem}>
                <Text style={styles.sheetMetaLabel}>Recommended</Text>
                <View style={[styles.sheetBadge, {
                  backgroundColor: result?.optimal_months.some(opt => selected.month.startsWith(opt) || opt.startsWith(selected.month))
                    ? '#0F6E5620' : '#88888820'
                }]}>
                  <Text style={[styles.sheetBadgeText, {
                    color: result?.optimal_months.some(opt => selected.month.startsWith(opt) || opt.startsWith(selected.month))
                      ? '#0F6E56' : '#888'
                  }]}>
                    {result?.optimal_months.some(opt => selected.month.startsWith(opt) || opt.startsWith(selected.month)) ? 'YES' : 'NO'}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable style={styles.sheetClose} onPress={() => setSelected(null)}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, color: '#0F6E56', fontWeight: '600' },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 20 },

  recommendedCard: {
    backgroundColor: '#0F6E56', borderRadius: 16, padding: 16, marginBottom: 20,
  },
  recommendedLabel: { fontSize: 11, color: '#a0e4d0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  recommendedMonths: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  summary: { fontSize: 13, color: '#d0f0e8', lineHeight: 18 },

  sectionLabel: { fontSize: 11, color: '#9b9b96', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  monthRowCurrent: { borderColor: '#0F6E56', borderWidth: 1.5, backgroundColor: '#f0faf7' },
  monthRowRecommended: { borderColor: '#0F6E5640', backgroundColor: '#f8fffe' },

  monthLeft: { flex: 1 },
  monthNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  monthName: { fontSize: 14, fontWeight: '700', color: '#333' },
  monthNameCurrent: { color: '#0F6E56' },
  nowTag: { backgroundColor: '#0F6E56', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  nowTagText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  bestTag: { backgroundColor: '#F5A62330', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  bestTagText: { fontSize: 9, color: '#C47A00', fontWeight: '800' },
  weatherLine: { fontSize: 11, color: '#888' },

  scoreWrap: { alignItems: 'flex-end', gap: 2, marginRight: 8 },
  scoreBar: { fontSize: 7, color: '#0F6E56', letterSpacing: 1 },
  scoreNum: { fontSize: 12, fontWeight: '800', color: '#111' },

  chevron: { fontSize: 20, color: '#ccc', fontWeight: '300' },

  footer: { paddingVertical: 12 },
  nextButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetMonth: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 16 },

  sheetScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetScoreLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  sheetScoreValue: { fontSize: 18, fontWeight: '800', color: '#0F6E56' },
  sheetScoreBarWrap: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginBottom: 20, overflow: 'hidden' },
  sheetScoreBarFill: { height: 8, backgroundColor: '#0F6E56', borderRadius: 4 },

  sheetDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
  sheetSectionLabel: { fontSize: 11, color: '#9b9b96', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sheetDetail: { fontSize: 14, color: '#333', lineHeight: 20 },

  sheetMetaRow: { flexDirection: 'row', gap: 12 },
  sheetMetaItem: { flex: 1, alignItems: 'center', gap: 8 },
  sheetMetaLabel: { fontSize: 11, color: '#9b9b96', fontWeight: '600' },
  sheetBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, width: '100%', alignItems: 'center' },
  sheetBadgeText: { fontSize: 12, fontWeight: '800' },

  sheetClose: {
    marginTop: 24, backgroundColor: '#f5f5f2', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  sheetCloseText: { fontSize: 15, fontWeight: '700', color: '#333' },
})
