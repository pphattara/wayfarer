// lib/offline.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ItineraryDay } from '../types'

interface CachedItinerary {
  days: ItineraryDay[]
  cachedAt: string
}

const KEY_PREFIX = '@wayfarer:itinerary:'

export async function cacheItinerary(tripId: string, days: ItineraryDay[]): Promise<void> {
  const value: CachedItinerary = { days, cachedAt: new Date().toISOString() }
  await AsyncStorage.setItem(KEY_PREFIX + tripId, JSON.stringify(value))
}

export async function getCachedItinerary(tripId: string): Promise<CachedItinerary | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + tripId)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CachedItinerary
  } catch {
    return null
  }
}

export function isCacheStale(cachedAt: string): boolean {
  const ageMs = Date.now() - new Date(cachedAt).getTime()
  return ageMs > 48 * 60 * 60 * 1000
}
