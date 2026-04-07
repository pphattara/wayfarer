// lib/offline.ts
// Uses expo-file-system instead of AsyncStorage (AsyncStorage requires native build)
import * as FileSystem from 'expo-file-system'
import type { ItineraryDay } from '../types'

interface CachedItinerary {
  days: ItineraryDay[]
  cachedAt: string
}

function cachePath(tripId: string): string {
  return `${FileSystem.cacheDirectory}wayfarer_itinerary_${tripId}.json`
}

export async function cacheItinerary(tripId: string, days: ItineraryDay[]): Promise<void> {
  try {
    const value: CachedItinerary = { days, cachedAt: new Date().toISOString() }
    await FileSystem.writeAsStringAsync(cachePath(tripId), JSON.stringify(value))
  } catch {
    // caching is best-effort — don't crash the app
  }
}

export async function getCachedItinerary(tripId: string): Promise<CachedItinerary | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(cachePath(tripId))
    return JSON.parse(raw) as CachedItinerary
  } catch {
    return null
  }
}

export function isCacheStale(cachedAt: string): boolean {
  const ageMs = Date.now() - new Date(cachedAt).getTime()
  return ageMs > 48 * 60 * 60 * 1000
}
