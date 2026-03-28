// app/auth.tsx
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)

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
      const redirectUrl = makeRedirectUri({ scheme: 'wayfarer', path: 'auth/callback' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data.url) throw new Error('OAuth URL missing — check Supabase provider config')
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
      if (result.type === 'success') {
        // Supabase implicit flow returns tokens in hash fragment
        const hash = new URL(result.url).hash.slice(1)
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Wayfarer</Text>
      <Text style={styles.tagline}>Plan your next adventure</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" style={{ marginTop: 32 }} />
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
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  logo: { fontSize: 40, fontWeight: '800', color: '#0F6E56', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#666', marginTop: 8, marginBottom: 48 },
  buttons: { width: '100%', gap: 12 },
  appleButton: { width: '100%', height: 52 },
  googleButton: { width: '100%', height: 52, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#333' },
})
