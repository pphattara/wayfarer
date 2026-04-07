// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import { useTrip } from '../../hooks/useTrip'
import { useCollections } from '../../hooks/useCollections'
import { TripCard } from '../../components/TripCard'
import { CollectionModal } from '../../components/CollectionModal'
import { fetchForecast } from '../../lib/openweather'
import type { Trip, Collection, WeatherForecastDay } from '../../types'

export default function HomeTab() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { getUserTrips, deleteTrip, updateTrip } = useTrip()
  const { getCollections } = useCollections()
  const [trips, setTrips] = useState<Trip[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [collectionModalVisible, setCollectionModalVisible] = useState(false)
  const [nextTripWeather, setNextTripWeather] = useState<WeatherForecastDay | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Edit modal state
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editDest, setEditDest] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const now = new Date(); now.setHours(0, 0, 0, 0)
  const past = trips.filter(t => new Date(t.end_date) < now)
  const upcoming = trips.filter(t => new Date(t.start_date) >= now)

  const filteredUpcoming = searchQuery.trim()
    ? upcoming.filter(t =>
        t.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.trip_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : upcoming

  const filteredPast = searchQuery.trim()
    ? past.filter(t =>
        t.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.trip_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : past

  useEffect(() => {
    loadTrips()
  }, [])

  useEffect(() => {
    getCollections().then(setCollections).catch(() => {})
  }, [])

  useEffect(() => {
    if (upcoming.length === 0) return
    const next = upcoming[0]
    setWeatherLoading(true)
    fetchForecast(next.destinations[0], next.start_date, next.end_date)
      .then(days => { if (days.length > 0) setNextTripWeather(days[0]) })
      .catch(() => {})
      .finally(() => setWeatherLoading(false))
  }, [upcoming.length])

  async function loadTrips() {
    setLoading(true)
    getUserTrips()
      .then(setTrips)
      .catch(err => console.error('Failed to load trips:', err))
      .finally(() => setLoading(false))
  }

  function openEdit(trip: Trip) {
    setEditingTrip(trip)
    setEditDest(trip.destinations[0] ?? '')
    setEditStart(trip.start_date)
    setEditEnd(trip.end_date)
  }

  async function handleSaveEdit() {
    if (!editingTrip) return
    if (!editDest.trim()) return Alert.alert('Enter a destination')
    if (!editStart.match(/^\d{4}-\d{2}-\d{2}$/) || !editEnd.match(/^\d{4}-\d{2}-\d{2}$/))
      return Alert.alert('Dates must be YYYY-MM-DD')
    if (new Date(editEnd) <= new Date(editStart))
      return Alert.alert('End date must be after start date')

    setSaving(true)
    try {
      const updated = await updateTrip(editingTrip.id, {
        destinations: [editDest.trim()],
        start_date: editStart,
        end_date: editEnd,
      })
      setTrips(prev => prev.map(t => t.id === updated.id ? updated : t))
      setEditingTrip(null)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(trip: Trip) {
    Alert.alert(
      'Delete trip',
      `Delete "${trip.destinations.join(', ')}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(trip.id)
              setTrips(prev => prev.filter(t => t.id !== trip.id))
            } catch (e: any) {
              Alert.alert('Error', e.message)
            }
          },
        },
      ]
    )
  }

  function handleCollectionSelect(_collectionId: string, _name: string) {
    setCollectionModalVisible(false)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 16 }}>
      <Text style={styles.greeting}>
        Sawadee{user?.display_name ? `, ${user.display_name}` : ''} 👋
      </Text>
      <Text style={styles.subline}>Where to next?</Text>

      {(weatherLoading || nextTripWeather) && upcoming.length > 0 && (
        <View style={styles.weatherCard}>
          <Text style={styles.weatherTitle}>Weather for {upcoming[0].destinations[0]}</Text>
          {weatherLoading ? (
            <ActivityIndicator size="small" color="#0F6E56" />
          ) : nextTripWeather ? (
            <View style={styles.weatherRow}>
              <Text style={styles.weatherTemp}>{nextTripWeather.temp_min}° – {nextTripWeather.temp_max}°C</Text>
              <Text style={styles.weatherDesc}>{nextTripWeather.description}</Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destinations, trips, people..."
          placeholderTextColor="#9b9b96"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search trips"
          returnKeyType="search"
        />
      </View>

      {/* Recent trips — past trips only */}
      {filteredPast.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Recent trips</Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={styles.storyScroll}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          >
            {filteredPast.map((t, idx) => (
              <Pressable key={idx} style={styles.storyItem} onPress={() => router.push(`/trip/${t.id}`)}>
                <View style={styles.storyCircle}>
                  <Text style={styles.storyFlag}>✈️</Text>
                </View>
                <Text style={styles.storyCity}>{t.destinations[0] ?? 'Trip'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Upcoming trips */}
      <Text style={styles.sectionLabel}>Upcoming trips</Text>

      {loading ? (
        <Text style={styles.emptySubtitle}>Loading…</Text>
      ) : upcoming.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips planned yet</Text>
          <Text style={styles.emptySubtitle}>Use the Plan tab to create your first trip with AI.</Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/plan')}
            accessibilityLabel="Plan your first trip"
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Plan your first trip</Text>
          </Pressable>
        </View>
      ) : (
        filteredUpcoming.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onEdit={() => openEdit(trip)}
            onDelete={() => handleDelete(trip)}
          />
        ))
      )}

      {/* My Collections */}
      {collections.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>My Collections</Text>
            <Pressable
              onPress={() => setCollectionModalVisible(true)}
              accessibilityLabel="View all collections"
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 11, color: '#0F6E56', fontWeight: '600' }}>See all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            style={{ marginBottom: 20 }}
          >
            {collections.slice(0, 6).map(c => (
              <Pressable
                key={c.id}
                style={{ backgroundColor: '#E1F5EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 80, alignItems: 'center' }}
                onPress={() => setCollectionModalVisible(true)}
                accessibilityLabel={`Open ${c.name} collection`}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 18, marginBottom: 4 }}>🗂</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#0F6E56', textAlign: 'center' }} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Edit modal */}
      <Modal visible={!!editingTrip} transparent animationType="slide" onRequestClose={() => setEditingTrip(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditingTrip(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Edit trip</Text>

          <Text style={styles.fieldLabel}>Destination</Text>
          <TextInput
            style={styles.input}
            value={editDest}
            onChangeText={setEditDest}
            placeholder="e.g. Tokyo, Japan"
            placeholderTextColor="#9b9b96"
          />

          <Text style={styles.fieldLabel}>Start date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={editStart}
            onChangeText={setEditStart}
            placeholder="2026-05-01"
            placeholderTextColor="#9b9b96"
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.fieldLabel}>End date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={editEnd}
            onChangeText={setEditEnd}
            placeholder="2026-05-07"
            placeholderTextColor="#9b9b96"
            keyboardType="numbers-and-punctuation"
          />

          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveEdit}
            disabled={saving}
            accessibilityLabel="Save changes"
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setEditingTrip(null)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      <CollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSelect={handleCollectionSelect}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  greeting: { fontSize: 15, fontWeight: '600', color: '#1a1a18', marginBottom: 2, paddingHorizontal: 16 },
  subline: { fontSize: 10, color: '#6b6b66', marginBottom: 16, paddingHorizontal: 16 },
  weatherCard: {
    backgroundColor: '#E1F5EE', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 16, marginBottom: 16,
  },
  weatherTitle: { fontSize: 11, fontWeight: '700', color: '#0F6E56', marginBottom: 6 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weatherTemp: { fontSize: 16, fontWeight: '800', color: '#04342C' },
  weatherDesc: { fontSize: 12, color: '#0F6E56', textTransform: 'capitalize', flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f2',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 10,
    height: 30, marginHorizontal: 16, marginBottom: 20, paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 11, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 10, color: '#1a1a18' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a18', marginBottom: 10, paddingHorizontal: 16 },
  storyScroll: { marginBottom: 20 },
  storyItem: { alignItems: 'center', gap: 4 },
  storyCircle: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    borderColor: '#0F6E56', backgroundColor: '#f5f5f2',
    alignItems: 'center', justifyContent: 'center',
  },
  storyFlag: { fontSize: 18 },
  storyCity: { fontSize: 8, color: '#6b6b66' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a18', marginBottom: 8 },
  emptySubtitle: { fontSize: 12, color: '#6b6b66', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  ctaButton: { backgroundColor: '#0F6E56', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#6b6b66', marginBottom: 6 },
  input: {
    backgroundColor: '#f5f5f2', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1a1a18', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', marginBottom: 14,
  },
  saveBtn: { backgroundColor: '#0F6E56', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#9b9b96', fontSize: 14 },
})
