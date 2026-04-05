// hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchProfile(userId: string) {
    setProfileLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (fetchError) {
        console.warn('fetchProfile error:', fetchError.message)
        setError(fetchError.message)
      } else if (data) {
        setUser(data as User)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        fetchProfile(newSession.user.id)
      } else {
        setUser(null)
        setProfileLoading(false)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
  }

  return { session, user, loading, profileLoading, error, signOut }
}
