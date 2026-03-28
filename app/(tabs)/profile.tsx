// app/(tabs)/profile.tsx
import { useState } from 'react'
import { Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function ProfileTab() {
  const { user, signOut } = useAuth()
  const [nationality, setNationality] = useState(user?.nationality ?? '')
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ nationality, display_name: displayName })
      .eq('id', user.id)
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
    else Alert.alert('Saved', 'Profile updated.')
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" />

      <Text style={styles.label}>Nationality / passport</Text>
      <TextInput style={styles.input} value={nationality} onChangeText={setNationality} placeholder="e.g. Thai, British, American" />
      <Text style={styles.hint}>Used to personalise visa requirements in the Plan wizard.</Text>

      <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveProfile} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 6, borderWidth: 1, borderColor: '#eee' },
  hint: { fontSize: 12, color: '#aaa', marginBottom: 20 },
  saveButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  disabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signOutButton: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  signOutText: { color: '#E8622A', fontSize: 16, fontWeight: '600' },
})
