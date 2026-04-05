// app/auth.tsx
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  async function signInWithEmail() {
    if (!email || !password) return Alert.alert('Enter email and password')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.log('signIn result:', JSON.stringify({ data: data?.user?.id, error }))
      if (error) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
        console.log('signUp result:', JSON.stringify({ data: signUpData?.user?.id, error: signUpError }))
        if (signUpError) throw signUpError
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithApple() {
    setLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('Apple did not return an identity token')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (error) Alert.alert('Sign in failed', error.message)
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Sign in failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    setLoading(true)
    try {
      const hostUri = Constants.expoConfig?.hostUri
      const redirectUrl = hostUri
        ? `exp://${hostUri}/--/auth/callback`
        : Linking.createURL('auth/callback')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data.url) throw new Error('OAuth URL missing — check Supabase provider config')

      // Listen for the deep link callback before opening the browser
      const subscription = Linking.addEventListener('url', async ({ url }) => {
        subscription.remove()
        await WebBrowser.dismissBrowser()
        const parsedUrl = new URL(url)
        // Try hash fragment (implicit flow) first, then query params (PKCE)
        const hash = parsedUrl.hash.slice(1)
        const params = hash ? new URLSearchParams(hash) : parsedUrl.searchParams
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        const code = params.get('code')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
        setLoading(false)
      })

      await WebBrowser.openBrowserAsync(data.url)
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message)
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>Wayfarer</Text>
      <Text style={styles.tagline}>Plan your next adventure</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" style={{ marginTop: 32 }} />
      ) : showEmail ? (
        <View style={styles.buttons}>
          <TextInput
            style={styles.emailInput}
            placeholder="Email"
            placeholderTextColor="#9b9b96"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.emailInput}
            placeholder="Password"
            placeholderTextColor="#9b9b96"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable style={styles.googleButton} onPress={signInWithEmail}>
            <Text style={styles.googleText}>Continue with Email</Text>
          </Pressable>
          <Pressable onPress={() => setShowEmail(false)}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.buttons}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={signInWithApple}
          />
          <Pressable style={styles.googleButton} onPress={signInWithGoogle}>
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>
          <Pressable style={styles.emailButton} onPress={() => setShowEmail(true)}>
            <Text style={styles.emailText}>Continue with Email</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  logo: { fontSize: 40, fontWeight: '800', color: '#0F6E56', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#666', marginTop: 8, marginBottom: 48 },
  buttons: { width: '100%', gap: 12 },
  appleButton: { width: '100%', height: 52 },
  googleButton: { width: '100%', height: 52, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#333' },
  emailButton: { width: '100%', height: 52, backgroundColor: '#f5f5f2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emailText: { fontSize: 16, fontWeight: '600', color: '#0F6E56' },
  emailInput: { width: '100%', height: 52, backgroundColor: '#f5f5f2', borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: '#1a1a18', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  backText: { textAlign: 'center', color: '#9b9b96', marginTop: 8, fontSize: 14 },
})
