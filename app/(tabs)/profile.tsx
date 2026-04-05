// app/(tabs)/profile.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native'
import { useAuth } from '../../hooks/useAuth'
import { useTrip } from '../../hooks/useTrip'
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes'
import { supabase } from '../../lib/supabase'
import type { Trip } from '../../types'

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function ProfileTab() {
  const { user, signOut } = useAuth()
  const { getUserTrips } = useTrip()
  const { routes } = useCreatorRoutes()
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [nationality, setNationality] = useState(user?.nationality ?? '')
  const [saving, setSaving] = useState(false)
  const [profileUser, setProfileUser] = useState<{
    follower_count: number
    following_count: number
    display_name: string
    avatar_url: string | null
  } | null>(null)

  useEffect(() => {
    getUserTrips()
      .then(setTrips)
      .catch(() => {})
      .finally(() => setTripsLoading(false))
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return
      const { data } = await supabase
        .from('users')
        .select('display_name, avatar_url, follower_count, following_count')
        .eq('id', authData.user.id)
        .single()
      setProfileUser(data)
    }
    loadProfile()
  }, [])

  const now = new Date()
  const past = trips.filter(t => new Date(t.end_date) < now)
  const upcoming = trips.filter(t => new Date(t.start_date) >= now && t.status !== 'planning')
  const planning = trips.filter(t => t.status === 'planning')

  // All unique destinations ever visited/planned
  const allDestinations = [...new Set(trips.flatMap(t => t.destinations))]

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName.trim(), nationality: nationality.trim() })
        .eq('id', user.id)
      if (error) throw error
      setEditing(false)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {user?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{user?.display_name ?? 'Traveller'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <Pressable onPress={() => setEditing(e => !e)} style={styles.editBtn}>
          <Text style={styles.editBtnText}>{editing ? 'Cancel' : 'Edit'}</Text>
        </Pressable>
      </View>

      {/* Follower stats */}
      {profileUser && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111' }}>{profileUser.follower_count}</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>Followers</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111' }}>{profileUser.following_count}</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>Following</Text>
          </View>
        </View>
      )}

      {/* Trip stats */}
      <View style={styles.statsRow}>
        <StatCard value={tripsLoading ? 0 : past.length} label="Past" />
        <StatCard value={tripsLoading ? 0 : upcoming.length} label="Upcoming" />
        <StatCard value={tripsLoading ? 0 : planning.length} label="Planning" />
        <StatCard value={tripsLoading ? 0 : allDestinations.length} label="Destinations" />
      </View>

      {/* Published routes */}
      {routes.filter((r) => r.published).length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 10 }}>My Routes</Text>
          {routes.filter((r) => r.published).map((route) => (
            <View key={route.id} style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
              shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111' }}>{route.title}</Text>
              <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                {route.days} days · {route.save_count} saves
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Currently planning */}
      {planning.length > 0 && (
        <>
          <SectionHeader title="Currently planning" />
          {planning.map(t => (
            <View key={t.id} style={styles.tripRow}>
              <Text style={styles.tripDest}>{t.destinations.join(', ')}</Text>
              <Text style={styles.tripDate}>{t.start_date} → {t.end_date}</Text>
            </View>
          ))}
        </>
      )}

      {/* Upcoming trips */}
      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Upcoming trips" />
          {upcoming.map(t => (
            <View key={t.id} style={styles.tripRow}>
              <Text style={styles.tripDest}>{t.destinations.join(', ')}</Text>
              <Text style={styles.tripDate}>{t.start_date} → {t.end_date}</Text>
            </View>
          ))}
        </>
      )}

      {/* Past trips */}
      {past.length > 0 && (
        <>
          <SectionHeader title="Past trips" />
          {past.map(t => (
            <View key={t.id} style={styles.tripRow}>
              <Text style={styles.tripDest}>{t.destinations.join(', ')}</Text>
              <Text style={[styles.tripDate, { color: '#aaa' }]}>{t.start_date} → {t.end_date}</Text>
            </View>
          ))}
        </>
      )}

      {/* Passport info */}
      <SectionHeader title="Travel documents" />
      <View style={styles.infoCard}>
        <InfoRow label="Nationality" value={user?.nationality} />
        <InfoRow label="Passport expires" value={user?.passport_expiry} />
        {user?.passport2_nationality && (
          <>
            <View style={styles.divider} />
            <InfoRow label="2nd passport" value={user.passport2_nationality} />
            <InfoRow label="2nd passport expires" value={user.passport2_expiry} />
          </>
        )}
      </View>

      {/* Existing visas */}
      {user?.visas && user.visas.length > 0 && (
        <>
          <SectionHeader title="Existing visas" />
          <View style={styles.infoCard}>
            {user.visas.map((v, i) => (
              <View key={i}>
                {i > 0 && <View style={styles.divider} />}
                <InfoRow label={v.country} value={v.expiry ? `Expires ${v.expiry}` : 'No expiry recorded'} />
              </View>
            ))}
          </View>
        </>
      )}

      {/* Edit form */}
      {editing && (
        <>
          <SectionHeader title="Edit profile" />
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#9b9b96"
          />
          <Text style={styles.fieldLabel}>Passport nationality</Text>
          <TextInput
            style={styles.input}
            value={nationality}
            onChangeText={setNationality}
            placeholder="e.g. Thai, British"
            placeholderTextColor="#9b9b96"
          />
          <Pressable
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </>
      )}

      {/* Sign out */}
      <Pressable
        style={styles.signOutButton}
        onPress={() => signOut().catch(e => Alert.alert('Sign out failed', e.message))}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', paddingTop: 60 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#0F6E56', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', color: '#111' },
  email: { fontSize: 12, color: '#888', marginTop: 2 },
  editBtn: {
    borderWidth: 1, borderColor: '#0F6E56', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, color: '#0F6E56', fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 28,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0F6E56' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, fontWeight: '600' },

  // Section
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#9b9b96',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginBottom: 8, marginTop: 4,
  },

  // Info card
  infoCard: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  infoLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#111', fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 16 },

  // Trip rows
  tripRow: {
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20,
    marginBottom: 8, padding: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  tripDest: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  tripDate: { fontSize: 11, color: '#888' },

  // Edit form
  fieldLabel: { fontSize: 11, color: '#6b6b66', marginBottom: 6, fontWeight: '600', paddingHorizontal: 20 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a18', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 20, marginBottom: 14,
  },
  saveButton: {
    backgroundColor: '#0F6E56', borderRadius: 14, padding: 16,
    alignItems: 'center', marginHorizontal: 20, marginBottom: 20,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Sign out
  signOutButton: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#ddd', marginHorizontal: 20, marginTop: 8,
  },
  signOutText: { color: '#E8622A', fontSize: 16, fontWeight: '600' },
})
