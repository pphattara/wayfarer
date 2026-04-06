// app/trip/[id].tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, TextInput, Platform, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { getCachedItinerary, isCacheStale } from '../../lib/offline'
import { useTrip } from '../../hooks/useTrip'
import { ItineraryDay } from '../../components/ItineraryDay'
import { ShareTripModal } from '../../components/ShareTripModal'
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes'
import type { Trip, ItineraryDay as IDay, ItineraryItem } from '../../types'

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { saveItinerary } = useTrip()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [days, setDays] = useState<IDay[]>([])
  const [stale, setStale] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const { publishRoute } = useCreatorRoutes()
  const [publishModalVisible, setPublishModalVisible] = useState(false)
  const [routeTitle, setRouteTitle] = useState('')
  const [routeSummary, setRouteSummary] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => { loadTrip() }, [])

  async function loadTrip() {
    const cached = await getCachedItinerary(id)
    if (cached) {
      setDays(cached.days)
      setStale(isCacheStale(cached.cachedAt))
    }

    const { data: tripData, error: tripError } = await supabase
      .from('trips').select('*').eq('id', id).single()
    if (tripError) console.error('Failed to load trip:', tripError)
    if (tripData) setTrip(tripData as Trip)

    if (!cached) {
      const { data: dayData, error: dayError } = await supabase
        .from('itinerary_days').select('*').eq('trip_id', id).order('day_number')
      if (dayError) console.error('Failed to load itinerary:', dayError)
      if (dayData) setDays(dayData as IDay[])
    }
  }

  function updateItem(dayIdx: number, itemIdx: number, field: keyof ItineraryItem, value: string) {
    setDays(prev => prev.map((d, di) =>
      di !== dayIdx ? d : {
        ...d,
        items: d.items.map((item, ii) => ii !== itemIdx ? item : { ...item, [field]: value }),
      }
    ))
  }

  function deleteItem(dayIdx: number, itemIdx: number) {
    setDays(prev => prev.map((d, di) =>
      di !== dayIdx ? d : { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) }
    ))
  }

  function moveItem(dayIdx: number, from: number, to: number) {
    if (to < 0 || to >= days[dayIdx].items.length) return
    setDays(prev => prev.map((d, di) => {
      if (di !== dayIdx) return d
      const items = [...d.items]
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved)
      return { ...d, items }
    }))
  }

  function addItem(dayIdx: number) {
    setDays(prev => prev.map((d, di) =>
      di !== dayIdx ? d : {
        ...d,
        items: [...d.items, { place: '', time: '', notes: '', duration_minutes: 60 }],
      }
    ))
  }

  async function enhanceWithAI() {
    setEnhancing(true)
    try {
      const { data, error } = await supabase.functions.invoke('enhance-itinerary', {
        body: { destination: trip?.destinations[0], days },
      })
      if (error) {
        let detail = error.message ?? 'Enhance failed'
        try {
          const text = await (error as any).context?.text?.()
          if (text) {
            const parsed = JSON.parse(text)
            if (parsed?.error) detail = parsed.error
          }
        } catch {}
        throw new Error(detail)
      }
      const enhanced = data?.days ?? data
      if (Array.isArray(enhanced)) setDays(enhanced)
    } catch (e: any) {
      Alert.alert('AI Enhance failed', e.message)
    } finally {
      setEnhancing(false)
    }
  }

  async function saveEdits() {
    setSaving(true)
    try {
      await saveItinerary(id, days)
      setEditing(false)
    } catch (e: any) {
      Alert.alert('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!trip) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#0F6E56" />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (editing) {
                setEditing(false)
              } else {
                router.canGoBack() ? router.back() : router.replace('/(tabs)')
              }
            }}
            style={styles.back}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>{editing ? '✕ Cancel' : '← Back'}</Text>
          </Pressable>

          <Pressable
            onPress={editing ? saveEdits : () => setEditing(true)}
            style={[styles.editBtn, editing && styles.saveBtn]}
            disabled={saving}
            accessibilityLabel={editing ? 'Save itinerary' : 'Edit itinerary'}
            accessibilityRole="button"
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
            }
          </Pressable>
        </View>

        <Text style={styles.title}>{trip.trip_name ?? trip.destinations.join(', ')}</Text>
        <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
      </View>

      {stale && (
        <View style={styles.staleBanner}>
          <Text style={styles.staleText}>⚠ Offline — cached over 48 hours ago</Text>
        </View>
      )}

      {editing && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>Tap fields to change, ↑↓ to reorder, ✕ to remove</Text>
          <Pressable
            style={[styles.aiBtn, enhancing && styles.aiBtnLoading]}
            onPress={enhanceWithAI}
            disabled={enhancing}
            accessibilityLabel="Enhance with AI"
            accessibilityRole="button"
          >
            {enhancing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.aiBtnText}>✦ AI Enhance</Text>
            }
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {days.map((day, di) => (
          <ItineraryDay
            key={day.day_number}
            day={day}
            editing={editing}
            onUpdateItem={(ii, field, val) => updateItem(di, ii, field, val)}
            onDeleteItem={ii => deleteItem(di, ii)}
            onMoveItem={(from, to) => moveItem(di, from, to)}
            onAddItem={() => addItem(di)}
          />
        ))}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => setShareModalVisible(true)}
          accessibilityLabel="Share this trip"
        >
          <Text style={styles.shareBtnText}>Share This Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => setPublishModalVisible(true)}
          accessibilityLabel="Publish as Creator Route"
        >
          <Text style={styles.publishBtnText}>Publish as Creator Route</Text>
        </TouchableOpacity>
      </ScrollView>
      <ShareTripModal
        visible={shareModalVisible}
        tripId={trip.id}
        destinationName={trip.destinations?.[0] ?? ''}
        onClose={() => setShareModalVisible(false)}
        onPosted={() => setShareModalVisible(false)}
      />
      <Modal
        visible={publishModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPublishModalVisible(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.publishModalHeader}>
            <TouchableOpacity onPress={() => setPublishModalVisible(false)} accessibilityLabel="Cancel">
              <Text style={styles.publishModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.publishModalTitle}>Publish Route</Text>
            <TouchableOpacity
              disabled={publishing || !routeTitle.trim()}
              onPress={async () => {
                setPublishing(true)
                await publishRoute(trip!.id, routeTitle.trim(), routeSummary.trim(), [])
                setPublishing(false)
                setPublishModalVisible(false)
              }}
              accessibilityLabel="Publish route"
            >
              {publishing
                ? <ActivityIndicator color="#0F6E56" />
                : <Text style={[styles.publishModalPost, !routeTitle.trim() && styles.publishModalPostDisabled]}>Publish</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }}>
            <Text style={styles.publishFieldLabel}>Route Title</Text>
            <TextInput
              style={styles.publishInput}
              placeholder="e.g. 5 Days in Tokyo"
              value={routeTitle}
              onChangeText={setRouteTitle}
              accessibilityLabel="Route title"
            />
            <Text style={styles.publishFieldLabel}>Summary</Text>
            <TextInput
              style={[styles.publishInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="What makes this route special?"
              multiline
              value={routeSummary}
              onChangeText={setRouteSummary}
              accessibilityLabel="Route summary"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { padding: 24, paddingTop: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  back: {},
  backText: { color: '#0F6E56', fontWeight: '600', fontSize: 15 },
  editBtn: {
    backgroundColor: '#0F6E56', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  saveBtn: { backgroundColor: '#1D9E75' },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#111' },
  dates: { fontSize: 14, color: '#888', marginTop: 4 },
  staleBanner: { backgroundColor: '#FFF3CD', padding: 10, alignItems: 'center' },
  staleText: { color: '#856404', fontSize: 13 },
  editBanner: { backgroundColor: '#E1F5EE', padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  editBannerText: { color: '#0F6E56', fontSize: 12, fontWeight: '500', flex: 1 },
  aiBtn: { backgroundColor: '#0F6E56', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  aiBtnLoading: { opacity: 0.7 },
  aiBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  shareBtn: {
    marginTop: 16,
    backgroundColor: '#0F6E56',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  publishBtn: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#0F6E56',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  publishBtnText: { color: '#0F6E56', fontWeight: '600', fontSize: 16 },
  publishModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  publishModalTitle: { fontSize: 17, fontWeight: '600' },
  publishModalCancel: { fontSize: 17, color: '#666' },
  publishModalPost: { fontSize: 17, fontWeight: '600', color: '#0F6E56' },
  publishModalPostDisabled: { color: '#aaa' },
  publishFieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  publishInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 8,
  },
})
