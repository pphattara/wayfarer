// __tests__/lib/offline.test.ts
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {}
  const mock = {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve() }),
    removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve() }),
    clear: jest.fn(() => { store = {}; return Promise.resolve() }),
  }
  return { __esModule: true, default: mock }
})

import { cacheItinerary, getCachedItinerary, isCacheStale } from '../../lib/offline'

describe('offline cache', () => {
  beforeEach(async () => {
    const FileSystem = require('expo-file-system')
    FileSystem.__reset()
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.clear()
  })

  it('stores and retrieves an itinerary', async () => {
    const days = [{ day_number: 1, date: '2026-05-01', items: [] }]
    await cacheItinerary('trip-1', days as any)
    const result = await getCachedItinerary('trip-1')
    expect(result?.days[0].date).toBe('2026-05-01')
  })

  it('isCacheStale returns false for fresh cache', async () => {
    const days = [{ day_number: 1, date: '2026-05-01', items: [] }]
    await cacheItinerary('trip-1', days as any)
    const result = await getCachedItinerary('trip-1')
    expect(isCacheStale(result!.cachedAt)).toBe(false)
  })

  it('isCacheStale returns true for cache older than 48 hours', () => {
    const oldDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
    expect(isCacheStale(oldDate)).toBe(true)
  })
})
