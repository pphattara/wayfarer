// app/onboarding.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { UserVisa } from '../types'

const TOTAL_STEPS = 4

const HINTS = [
  'Tell us your name so we can personalise your experience.',
  'Your passport details help us check visa requirements and warn you if your passport expires too close to a trip.',
  'A second passport lets us find the best travel options for you — skip if you only have one.',
  'Adding existing visas means we won\'t ask you to apply for ones you already have.',
]

function StepHeader({ step, title, hint }: { step: number; title: string; hint: string }) {
  const progress = (step / TOTAL_STEPS) * 100
  return (
    <View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
        <Text style={styles.stepTitle}>{title}</Text>
        <View style={styles.hintBubble}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      </View>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [displayName, setDisplayName] = useState('')

  // Step 2
  const [nationality, setNationality] = useState('')
  const [passportExpiry, setPassportExpiry] = useState('')

  // Step 3
  const [p2Nationality, setP2Nationality] = useState('')
  const [p2Expiry, setP2Expiry] = useState('')

  // Step 4
  const [visas, setVisas] = useState<UserVisa[]>([])
  const [visaCountry, setVisaCountry] = useState('')
  const [visaExpiry, setVisaExpiry] = useState('')

  function validateExpiry(val: string): boolean {
    if (!val) return true // empty is ok on optional fields
    return /^\d{2}\/\d{4}$/.test(val)
  }

  function addVisa() {
    if (!visaCountry.trim()) return Alert.alert('Enter a country for this visa.')
    if (visaExpiry && !validateExpiry(visaExpiry)) return Alert.alert('Expiry must be MM/YYYY.')
    setVisas(prev => [...prev, { country: visaCountry.trim(), expiry: visaExpiry }])
    setVisaCountry('')
    setVisaExpiry('')
  }

  function removeVisa(idx: number) {
    setVisas(prev => prev.filter((_, i) => i !== idx))
  }

  function nextStep() {
    if (step === 1) {
      if (!displayName.trim()) return Alert.alert('Please enter your name.')
    }
    if (step === 2) {
      if (!nationality.trim()) return Alert.alert('Please enter your passport nationality.')
      if (passportExpiry && !validateExpiry(passportExpiry)) return Alert.alert('Expiry must be MM/YYYY (e.g. 09/2030).')
    }
    if (step === 3) {
      if (p2Expiry && !validateExpiry(p2Expiry)) return Alert.alert('Expiry must be MM/YYYY (e.g. 09/2030).')
    }
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
    } else {
      handleSave()
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const updates: Record<string, any> = {
        display_name: displayName.trim(),
        nationality: nationality.trim(),
        passport_expiry: passportExpiry.trim() || null,
        passport2_nationality: p2Nationality.trim() || null,
        passport2_expiry: p2Expiry.trim() || null,
        visas,
      }

      const { error } = await supabase.from('users').update(updates).eq('id', user.id)
      if (error) throw error
      await refreshUser()
      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const isLastStep = step === TOTAL_STEPS
  const isSkippable = step === 3 || step === 4

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepHeader step={step} title={STEP_TITLES[step - 1]} hint={HINTS[step - 1]} />

        <View style={styles.form}>
          {step === 1 && (
            <Field label="Your name">
              <TextInput
                style={styles.input}
                placeholder="e.g. Prince"
                placeholderTextColor="#9b9b96"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </Field>
          )}

          {step === 2 && (
            <>
              <Field label="Passport nationality">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Thai, British, American"
                  placeholderTextColor="#9b9b96"
                  value={nationality}
                  onChangeText={setNationality}
                />
              </Field>
              <Field label="Passport expiry (MM/YYYY) — optional">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 09/2030"
                  placeholderTextColor="#9b9b96"
                  value={passportExpiry}
                  onChangeText={setPassportExpiry}
                  keyboardType="numbers-and-punctuation"
                  maxLength={7}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Second passport nationality">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. British"
                  placeholderTextColor="#9b9b96"
                  value={p2Nationality}
                  onChangeText={setP2Nationality}
                />
              </Field>
              <Field label="Second passport expiry (MM/YYYY) — optional">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 03/2028"
                  placeholderTextColor="#9b9b96"
                  value={p2Expiry}
                  onChangeText={setP2Expiry}
                  keyboardType="numbers-and-punctuation"
                  maxLength={7}
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              {/* Existing visas list */}
              {visas.map((v, i) => (
                <View key={i} style={styles.visaRow}>
                  <View style={styles.visaInfo}>
                    <Text style={styles.visaCountry}>{v.country}</Text>
                    {v.expiry ? <Text style={styles.visaExpiry}>Expires {v.expiry}</Text> : null}
                  </View>
                  <Pressable onPress={() => removeVisa(i)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </Pressable>
                </View>
              ))}

              {/* Add visa form */}
              <Field label="Country that issued the visa">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. United States, Schengen"
                  placeholderTextColor="#9b9b96"
                  value={visaCountry}
                  onChangeText={setVisaCountry}
                />
              </Field>
              <Field label="Visa expiry (MM/YYYY) — optional">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12/2026"
                  placeholderTextColor="#9b9b96"
                  value={visaExpiry}
                  onChangeText={setVisaExpiry}
                  keyboardType="numbers-and-punctuation"
                  maxLength={7}
                />
              </Field>
              <Pressable style={styles.addVisaBtn} onPress={addVisa}>
                <Text style={styles.addVisaBtnText}>+ Add visa</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Navigation */}
        <View style={styles.nav}>
          <Pressable
            style={[styles.nextBtn, loading && styles.btnDisabled]}
            onPress={nextStep}
            disabled={loading}
          >
            <Text style={styles.nextBtnText}>
              {loading ? 'Saving...' : isLastStep ? 'Finish' : 'Next →'}
            </Text>
          </Pressable>

          {isSkippable && (
            <Pressable style={styles.skipBtn} onPress={() => isLastStep ? handleSave() : setStep(s => s + 1)}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
          )}

          {step > 1 && (
            <Pressable onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const STEP_TITLES = [
  'What\'s your name?',
  'Your passport',
  'Second passport',
  'Existing visas',
]

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f2' },
  scroll: { flexGrow: 1, paddingBottom: 48 },

  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)' },
  progressFill: { height: 3, backgroundColor: '#0F6E56' },

  stepHeader: { padding: 24, paddingBottom: 8 },
  stepLabel: { fontSize: 11, color: '#9b9b96', marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a18', marginBottom: 14 },
  hintBubble: { backgroundColor: '#E1F5EE', borderRadius: 10, padding: 12 },
  hintText: { fontSize: 12, color: '#04342C', lineHeight: 18 },

  form: { paddingHorizontal: 24, paddingTop: 20 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: '#6b6b66', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1a1a18',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  // Visa list
  visaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  visaInfo: { flex: 1 },
  visaCountry: { fontSize: 14, fontWeight: '600', color: '#1a1a18' },
  visaExpiry: { fontSize: 11, color: '#9b9b96', marginTop: 2 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  removeBtnText: { fontSize: 12, color: '#E05050' },

  addVisaBtn: {
    borderWidth: 1.5,
    borderColor: '#0F6E56',
    borderStyle: 'dashed',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addVisaBtnText: { fontSize: 13, color: '#0F6E56', fontWeight: '600' },

  nav: { paddingHorizontal: 24, paddingTop: 8, gap: 10 },
  nextBtn: {
    backgroundColor: '#0F6E56',
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  skipBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: { fontSize: 14, color: '#9b9b96' },

  backBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 14, color: '#9b9b96' },
})
