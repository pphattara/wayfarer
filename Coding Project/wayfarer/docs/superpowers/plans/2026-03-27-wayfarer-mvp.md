# Wayfarer iOS App — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Wayfarer iOS MVP — a React Native Expo app with a 6-step AI trip planning wizard, Mapbox explore map, and Supabase backend.

**Architecture:** Expo Managed + Expo Router for file-based navigation; Supabase for auth/DB/Edge Functions; OpenAI GPT-4o proxied through Supabase Edge Functions (API key never on client); Mapbox for maps; OpenWeatherMap for weather; AsyncStorage for offline itinerary cache.

**Tech Stack:** React Native, Expo SDK 52, Expo Router v4, TypeScript, Supabase JS v2, OpenAI GPT-4o (server-side only), `@rnmapbox/maps`, OpenWeatherMap API, `expo-dev-client`, Jest + `@testing-library/react-native`, Deno (Edge Functions)

---

## File Structure

```
wayfarer/
├── app/
│   ├── _layout.tsx                  # Root layout — auth gate
│   ├── auth.tsx                     # Sign-in screen
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Five-tab bar
│   │   ├── index.tsx                # Home tab
│   │   ├── explore.tsx              # Explore tab (Mapbox)
│   │   ├── feed.tsx                 # Feed tab (empty state)
│   │   ├── profile.tsx              # Profile tab
│   │   └── plan/
│   │       ├── _layout.tsx          # Wizard layout (progress bar)
│   │       ├── index.tsx            # Step 1 — Trip Setup
│   │       ├── interests.tsx        # Step 2 — Interest Chips
│   │       ├── itinerary.tsx        # Step 3 — AI Itinerary
│   │       ├── best-time.tsx        # Step 4 — Best Time to Visit
│   │       ├── visa.tsx             # Step 5 — Visa & Docs
│   │       └── packing.tsx          # Step 6 — Pack & Weather
│   └── trip/
│       └── [id].tsx                 # Trip detail view
├── components/
│   ├── InterestChip.tsx
│   ├── ItineraryDay.tsx
│   ├── TripCard.tsx
│   ├── VisaCard.tsx
│   ├── WeatherCard.tsx
│   └── CollectionModal.tsx
├── lib/
│   ├── supabase.ts                  # Supabase client singleton
│   ├── openweather.ts               # OpenWeatherMap fetch helpers
│   └── offline.ts                   # AsyncStorage cache helpers
├── hooks/
│   ├── useAuth.ts
│   ├── useTrip.ts
│   └── useCollections.ts
├── types/
│   └── index.ts                     # Shared TypeScript types
├── supabase/
│   ├── migrations/
│   │   └── 20260327000000_initial.sql
│   └── functions/
│       ├── generate-chips/index.ts
│       ├── generate-itinerary/index.ts
│       ├── best-time/index.ts
│       ├── visa-check/index.ts
│       └── packing-list/index.ts
├── __tests__/
│   ├── lib/offline.test.ts
│   ├── lib/openweather.test.ts
│   ├── hooks/useTrip.test.ts
│   └── components/InterestChip.test.tsx
├── .env.local                       # API keys — never commit
├── app.json
└── package.json
```

---

## Phase 1 — Foundation

### Task 1: Scaffold Expo project + install dependencies

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create Expo project**

```bash
npx create-expo-app@latest wayfarer --template blank-typescript
cd wayfarer
```

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-router expo-dev-client expo-apple-authentication \
  expo-auth-session expo-web-browser expo-secure-store \
  expo-location expo-image-picker

npm install @supabase/supabase-js @rnmapbox/maps \
  @react-native-async-storage/async-storage \
  react-native-url-polyfill

npm install --save-dev jest @testing-library/react-native \
  @testing-library/jest-native jest-expo @types/jest
```

- [ ] **Step 3: Update `app.json`**

```json
{
  "expo": {
    "name": "Wayfarer",
    "slug": "wayfarer",
    "scheme": "wayfarer",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "ios": {
      "bundleIdentifier": "com.wayfarer.app",
      "supportsTablet": false,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Wayfarer uses your location to show nearby places on the map."
      }
    },
    "plugins": [
      "expo-router",
      "expo-dev-client",
      [
        "@rnmapbox/maps",
        { "RNMapboxMapsDownloadToken": "YOUR_MAPBOX_SECRET_TOKEN" }
      ],
      "expo-apple-authentication",
      [
        "expo-location",
        { "locationWhenInUsePermission": "Wayfarer uses your location to show nearby places on the map." }
      ]
    ]
  }
}
```

- [ ] **Step 4: Create `.env.local`** (never commit this file)

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
```

- [ ] **Step 5: Update `.gitignore`**

Add these lines:
```
.env.local
.env*.local
```

- [ ] **Step 6: Update `package.json` jest config**

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rnmapbox)"
    ]
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo project with all dependencies"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write the types file**

```typescript
// types/index.ts

export type TripStatus = 'planning' | 'confirmed' | 'completed'

export interface User {
  id: string
  email: string
  nationality: string
  display_name: string
  avatar_url: string | null
}

export interface Trip {
  id: string
  user_id: string
  origin: string
  destinations: string[]
  start_date: string        // ISO date string YYYY-MM-DD
  end_date: string
  status: TripStatus
  created_at: string
}

export interface ItineraryDay {
  id: string
  trip_id: string
  day_number: number
  date: string
  items: ItineraryItem[]
}

export interface ItineraryItem {
  place: string
  time: string
  notes: string
  duration_minutes?: number
}

export interface VisaSummary {
  id: string
  trip_id: string
  nationality: string
  destination: string
  visa_type: string
  steps: string[]
  timeline: string
  checklist: string[]
  cost_estimate: string
  embassy_url: string
  generated_at: string
}

export interface WeatherPack {
  id: string
  trip_id: string
  forecast: WeatherForecastDay[]
  packing_list: PackingCategory[]
  fetched_at: string
}

export interface WeatherForecastDay {
  date: string
  temp_min: number
  temp_max: number
  description: string
  icon: string
}

export interface PackingCategory {
  category: string
  items: string[]
}

export interface BestTimeResult {
  destination: string
  optimal_months: string[]
  summary: string
  monthly_breakdown: MonthData[]
  cached_at: string
}

export interface MonthData {
  month: string
  weather: string
  crowd_level: 'low' | 'medium' | 'high'
  cost_index: 'low' | 'medium' | 'high'
  score: number
}

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  mapbox_id: string | null
  category: string
  created_by: string | null
}

export interface Collection {
  id: string
  user_id: string
  name: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: Supabase DB schema + RLS

**Files:**
- Create: `supabase/migrations/20260327000000_initial.sql`

- [ ] **Step 1: Install Supabase CLI**

```bash
npm install --save-dev supabase
npx supabase init
npx supabase login
```

- [ ] **Step 2: Write migration**

```sql
-- supabase/migrations/20260327000000_initial.sql

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nationality text not null default '',
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  origin text not null,
  destinations text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  status text not null default 'planning' check (status in ('planning','confirmed','completed')),
  created_at timestamptz not null default now()
);

-- Itinerary days
create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  day_number int not null,
  date date not null,
  items jsonb not null default '[]'
);

-- Visa summaries
create table public.visa_summaries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  nationality text not null,
  destination text not null,
  content jsonb not null default '{}',
  generated_at timestamptz not null default now()
);

-- Weather packs
create table public.weather_packs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  forecast jsonb not null default '[]',
  packing_list jsonb not null default '[]',
  fetched_at timestamptz not null default now()
);

-- Best time cache (shared across users, keyed by destination)
create table public.best_time_cache (
  id uuid primary key default gen_random_uuid(),
  destination text not null unique,
  content jsonb not null default '{}',
  cached_at timestamptz not null default now()
);

-- Places
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat float not null,
  lng float not null,
  mapbox_id text,
  category text not null default 'other',
  created_by uuid references public.users(id) on delete set null
);

-- Collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null
);

-- Collection places (join table)
create table public.collection_places (
  collection_id uuid references public.collections(id) on delete cascade not null,
  place_id uuid references public.places(id) on delete cascade not null,
  primary key (collection_id, place_id)
);

-- RLS: enable on all tables
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.visa_summaries enable row level security;
alter table public.weather_packs enable row level security;
alter table public.best_time_cache enable row level security;
alter table public.places enable row level security;
alter table public.collections enable row level security;
alter table public.collection_places enable row level security;

-- RLS policies
create policy "Users can read/write own profile"
  on public.users for all using (auth.uid() = id);

create policy "Users can read/write own trips"
  on public.trips for all using (auth.uid() = user_id);

create policy "Users can read/write own itinerary days"
  on public.itinerary_days for all
  using (exists (select 1 from public.trips where id = trip_id and user_id = auth.uid()));

create policy "Users can read/write own visa summaries"
  on public.visa_summaries for all
  using (exists (select 1 from public.trips where id = trip_id and user_id = auth.uid()));

create policy "Users can read/write own weather packs"
  on public.weather_packs for all
  using (exists (select 1 from public.trips where id = trip_id and user_id = auth.uid()));

create policy "Best time cache is readable by all authenticated users"
  on public.best_time_cache for select using (auth.role() = 'authenticated');

create policy "Service role can write best time cache"
  on public.best_time_cache for insert with check (auth.role() = 'service_role');

create policy "Places are readable by all authenticated users"
  on public.places for select using (auth.role() = 'authenticated');

create policy "Users can create places"
  on public.places for insert with check (auth.uid() = created_by);

create policy "Users can read/write own collections"
  on public.collections for all using (auth.uid() = user_id);

create policy "Users can manage own collection places"
  on public.collection_places for all
  using (exists (select 1 from public.collections where id = collection_id and user_id = auth.uid()));

-- Trigger: auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Push migration to Supabase**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add DB schema and RLS policies"
```

---

### Task 4: Supabase client + auth hook

**Files:**
- Create: `lib/supabase.ts`
- Create: `hooks/useAuth.ts`
- Create: `__tests__/hooks/useAuth.test.ts`

- [ ] **Step 1: Write `lib/supabase.ts`**

```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

- [ ] **Step 2: Write failing test for `useAuth`**

```typescript
// __tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react-native'

// Mock supabase before importing hook
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

import { useAuth } from '../../hooks/useAuth'

describe('useAuth', () => {
  it('initialises with null session and loading true', async () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toBeNull()
    expect(result.current.user).toBeNull()
  })

  it('exposes a signOut function', () => {
    const { result } = renderHook(() => useAuth())
    expect(typeof result.current.signOut).toBe('function')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest __tests__/hooks/useAuth.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../hooks/useAuth'`

- [ ] **Step 4: Write `hooks/useAuth.ts`**

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setUser(data as User)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, user, loading, signOut }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/hooks/useAuth.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/supabase.ts hooks/useAuth.ts __tests__/hooks/useAuth.test.ts
git commit -m "feat: add Supabase client and useAuth hook"
```

---

### Task 5: Auth screen + root layout

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/auth.tsx`

- [ ] **Step 1: Write `app/_layout.tsx`** (auth gate)

```typescript
// app/_layout.tsx
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useAuth } from '../hooks/useAuth'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(tabs)'
    if (!session && inAuthGroup) router.replace('/auth')
    if (session && !inAuthGroup) router.replace('/(tabs)')
  }, [session, loading, segments])

  return <Slot />
}
```

- [ ] **Step 2: Write `app/auth.tsx`** (sign-in screen)

```typescript
// app/auth.tsx
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session'
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
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
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
      const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectUrl)
      if (result.type === 'success') {
        const url = new URL(result.url)
        const access_token = url.searchParams.get('access_token')
        const refresh_token = url.searchParams.get('refresh_token')
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
```

- [ ] **Step 3: Build custom dev client (required for Apple auth + Mapbox)**

```bash
eas build --profile development --platform ios
```

Install the resulting `.ipa` on your device via TestFlight or direct install.

- [ ] **Step 4: Start dev server and test auth flow manually**

```bash
npx expo start --dev-client
```

Verify: tapping Apple Sign-In opens the system sheet. After sign-in, app navigates to `/(tabs)`.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/auth.tsx
git commit -m "feat: add auth screen with Apple and Google Sign-In"
```

---

### Task 6: Tab navigation shell

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx` (placeholder)
- Create: `app/(tabs)/explore.tsx` (placeholder)
- Create: `app/(tabs)/feed.tsx` (placeholder)
- Create: `app/(tabs)/profile.tsx` (placeholder)
- Create: `app/(tabs)/plan/_layout.tsx` (placeholder)

- [ ] **Step 1: Write `app/(tabs)/_layout.tsx`**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0F6E56',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopColor: '#eee' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: ({ color }) => <Ionicons name="sparkles-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed', tabBarIcon: ({ color }) => <Ionicons name="newspaper-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} /> }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create placeholder screens**

`app/(tabs)/index.tsx`:
```typescript
import { View, Text } from 'react-native'
export default function HomeTab() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Home</Text></View>
}
```

`app/(tabs)/explore.tsx`:
```typescript
import { View, Text } from 'react-native'
export default function ExploreTab() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Explore</Text></View>
}
```

`app/(tabs)/feed.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native'
export default function FeedTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.subtitle}>Trip sharing coming soon. Plan your first trip to get started.</Text>
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
})
```

`app/(tabs)/profile.tsx`:
```typescript
import { View, Text } from 'react-native'
export default function ProfileTab() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Profile</Text></View>
}
```

`app/(tabs)/plan/_layout.tsx`:
```typescript
import { Stack } from 'expo-router'
export default function PlanLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: Verify tabs render on device**

```bash
npx expo start --dev-client
```

Expected: five tabs visible, tapping each shows placeholder screen.

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add five-tab navigation shell"
```

---

## Phase 2 — Edge Functions (AI Backend)

### Task 7: Edge Function — generate-chips

**Files:**
- Create: `supabase/functions/generate-chips/index.ts`

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/generate-chips/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { destination } = await req.json()
  if (!destination) {
    return new Response(JSON.stringify({ error: 'destination required' }), { status: 400, headers: corsHeaders })
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Generate exactly 12 interest category chips for a traveller visiting ${destination}.
Return a JSON array of objects with shape: { "label": string, "emoji": string }.
Categories should be specific to the destination and cover a range of interests.
Return only valid JSON, no markdown.`
    }],
    max_tokens: 500,
  })

  const raw = response.choices[0].message.content ?? '[]'
  let chips: { label: string; emoji: string }[]
  try {
    chips = JSON.parse(raw)
  } catch {
    // fallback to 5 generic chips if parse fails
    chips = [
      { label: 'Culture', emoji: '🏛' },
      { label: 'Food', emoji: '🍜' },
      { label: 'Nature', emoji: '🏔' },
      { label: 'Shopping', emoji: '🛍' },
      { label: 'Nightlife', emoji: '🎭' },
    ]
  }

  return new Response(JSON.stringify({ chips }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Set OpenAI secret in Supabase**

```bash
npx supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

- [ ] **Step 3: Deploy function**

```bash
npx supabase functions deploy generate-chips
```

- [ ] **Step 4: Test with curl**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-chips' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"destination": "Rome, Italy"}'
```

Expected: `{"chips":[{"label":"...","emoji":"..."},...]}` with 12 items.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-chips/
git commit -m "feat: add generate-chips Edge Function"
```

---

### Task 8: Edge Function — generate-itinerary (streaming)

**Files:**
- Create: `supabase/functions/generate-itinerary/index.ts`

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/generate-itinerary/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { origin, destinations, start_date, end_date, interests } = await req.json()

  const days = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [{
      role: 'system',
      content: 'You are a professional travel planner. Generate detailed, practical itineraries with real places, opening hours, and travel times.',
    }, {
      role: 'user',
      content: `Plan a ${days}-day trip from ${origin} to ${destinations.join(', ')}.
Travel dates: ${start_date} to ${end_date}.
Interests: ${interests.join(', ')}.

Return a JSON array of day objects. Each day:
{
  "day_number": number,
  "date": "YYYY-MM-DD",
  "items": [
    { "place": string, "time": "HH:MM", "notes": string, "duration_minutes": number }
  ]
}

Return only valid JSON array, no markdown.`,
    }],
    max_tokens: 3000,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
})
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy generate-itinerary
```

- [ ] **Step 3: Test with curl**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-itinerary' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"origin":"London","destinations":["Rome"],"start_date":"2026-05-01","end_date":"2026-05-05","interests":["Culture","Food"]}' \
  --no-buffer
```

Expected: streaming JSON text arrives incrementally.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-itinerary/
git commit -m "feat: add generate-itinerary streaming Edge Function"
```

---

### Task 9: Edge Function — best-time

**Files:**
- Create: `supabase/functions/best-time/index.ts`

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/best-time/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { destination } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Check cache first (7-day TTL)
  const { data: cached } = await supabase
    .from('best_time_cache')
    .select('content, cached_at')
    .eq('destination', destination)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.cached_at).getTime()
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      return new Response(JSON.stringify(cached.content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Analyse the best time to visit ${destination} for tourists.
Return a JSON object:
{
  "destination": string,
  "optimal_months": string[],
  "summary": string (2-3 sentences),
  "monthly_breakdown": [
    { "month": string, "weather": string, "crowd_level": "low"|"medium"|"high", "cost_index": "low"|"medium"|"high", "score": number (1-10) }
  ]
}
Return only valid JSON, no markdown.`
    }],
    max_tokens: 1500,
  })

  const content = JSON.parse(response.choices[0].message.content ?? '{}')

  // Upsert cache
  await supabase.from('best_time_cache').upsert({
    destination,
    content,
    cached_at: new Date().toISOString(),
  }, { onConflict: 'destination' })

  return new Response(JSON.stringify(content), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy best-time
```

- [ ] **Step 3: Test**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/best-time' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"destination": "Paris, France"}'
```

Expected: JSON with `optimal_months`, `summary`, and 12-item `monthly_breakdown`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/best-time/
git commit -m "feat: add best-time Edge Function with 7-day cache"
```

---

### Task 10: Edge Functions — visa-check + packing-list

**Files:**
- Create: `supabase/functions/visa-check/index.ts`
- Create: `supabase/functions/packing-list/index.ts`

- [ ] **Step 1: Write `visa-check`**

```typescript
// supabase/functions/visa-check/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { nationality, destination } = await req.json()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'system',
      content: 'You are a travel visa expert. Provide accurate, practical visa guidance. Always recommend verifying with the official embassy.',
    }, {
      role: 'user',
      content: `Visa requirements for a ${nationality} passport holder visiting ${destination}.
Return JSON:
{
  "visa_type": string (e.g. "Schengen Visa", "Visa on Arrival", "Visa Free"),
  "steps": string[] (ordered application steps),
  "timeline": string (e.g. "Apply at least 3 months before travel"),
  "checklist": string[] (required documents),
  "cost_estimate": string (e.g. "€80 / ~3,500 THB"),
  "embassy_url": string (official embassy or government URL for ${nationality} citizens applying for ${destination})
}
Return only valid JSON, no markdown.`
    }],
    max_tokens: 1000,
  })

  const content = JSON.parse(response.choices[0].message.content ?? '{}')
  return new Response(JSON.stringify(content), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Write `packing-list`**

```typescript
// supabase/functions/packing-list/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { destination, start_date, end_date, forecast } = await req.json()
  const days = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  const weatherSummary = forecast
    .slice(0, 5)
    .map((d: { date: string; temp_min: number; temp_max: number; description: string }) =>
      `${d.date}: ${d.temp_min}–${d.temp_max}°C, ${d.description}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Create a packing list for a ${days}-day trip to ${destination}.
Weather forecast:
${weatherSummary}

Return JSON array of categories:
[
  { "category": string, "items": string[] }
]
Categories: Clothing, Shoes, Toiletries, Electronics, Documents, Health & Safety, Extras.
Return only valid JSON, no markdown.`
    }],
    max_tokens: 800,
  })

  const packing_list = JSON.parse(response.choices[0].message.content ?? '[]')
  return new Response(JSON.stringify({ packing_list }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 3: Deploy both**

```bash
npx supabase functions deploy visa-check
npx supabase functions deploy packing-list
```

- [ ] **Step 4: Test visa-check**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/visa-check' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"nationality": "Thai", "destination": "France"}'
```

Expected: JSON with `visa_type: "Schengen Visa"`, steps array, checklist array, embassy_url.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/visa-check/ supabase/functions/packing-list/
git commit -m "feat: add visa-check and packing-list Edge Functions"
```

---

## Phase 3 — Plan Wizard

### Task 11: Plan wizard — Step 1 (Trip Setup)

**Files:**
- Create: `app/(tabs)/plan/index.tsx`
- Create: `hooks/useTrip.ts`
- Create: `__tests__/hooks/useTrip.test.ts`

- [ ] **Step 1: Write failing test for `useTrip`**

```typescript
// __tests__/hooks/useTrip.test.ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'trip-123',
          user_id: 'user-1',
          origin: 'London',
          destinations: ['Rome'],
          start_date: '2026-05-01',
          end_date: '2026-05-05',
          status: 'planning',
          created_at: '2026-03-27T00:00:00Z',
        },
        error: null,
      }),
    }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}))

import { renderHook, act } from '@testing-library/react-native'
import { useTrip } from '../../hooks/useTrip'

describe('useTrip', () => {
  it('createTrip returns a trip with the correct origin', async () => {
    const { result } = renderHook(() => useTrip())
    let trip: any
    await act(async () => {
      trip = await result.current.createTrip({
        origin: 'London',
        destinations: ['Rome'],
        start_date: '2026-05-01',
        end_date: '2026-05-05',
      })
    })
    expect(trip.origin).toBe('London')
    expect(trip.id).toBe('trip-123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/hooks/useTrip.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../hooks/useTrip'`

- [ ] **Step 3: Write `hooks/useTrip.ts`**

```typescript
// hooks/useTrip.ts
import { supabase } from '../lib/supabase'
import type { Trip, ItineraryDay } from '../types'

export function useTrip() {
  async function createTrip(params: {
    origin: string
    destinations: string[]
    start_date: string
    end_date: string
  }): Promise<Trip> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('trips')
      .insert({ ...params, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as Trip
  }

  async function saveItinerary(tripId: string, days: ItineraryDay[]): Promise<void> {
    const rows = days.map(d => ({
      trip_id: tripId,
      day_number: d.day_number,
      date: d.date,
      items: d.items,
    }))
    const { error } = await supabase.from('itinerary_days').insert(rows)
    if (error) throw error
  }

  async function getUserTrips(): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Trip[]
  }

  return { createTrip, saveItinerary, getUserTrips }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/hooks/useTrip.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Write `app/(tabs)/plan/index.tsx`**

```typescript
// app/(tabs)/plan/index.tsx
import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useTrip } from '../../../hooks/useTrip'
import { useAuth } from '../../../hooks/useAuth'

export default function TripSetupScreen() {
  const router = useRouter()
  const { createTrip } = useTrip()
  const { user } = useAuth()

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (!origin.trim()) return 'Please enter your origin city.'
    if (!destination.trim()) return 'Please enter a destination.'
    if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Start date must be YYYY-MM-DD.'
    if (!endDate.match(/^\d{4}-\d{2}-\d{2}$/)) return 'End date must be YYYY-MM-DD.'
    if (new Date(startDate) < new Date()) return 'Start date cannot be in the past.'
    if (new Date(endDate) <= new Date(startDate)) return 'End date must be after start date.'
    return null
  }

  async function handleNext() {
    const err = validate()
    if (err) return Alert.alert('Check your input', err)
    setLoading(true)
    try {
      const trip = await createTrip({
        origin: origin.trim(),
        destinations: [destination.trim()],
        start_date: startDate,
        end_date: endDate,
      })
      router.push({ pathname: '/(tabs)/plan/interests', params: { tripId: trip.id, destination: destination.trim(), origin: origin.trim(), startDate, endDate } })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>Step 1 of 6</Text>
      <Text style={styles.title}>Where are you going?</Text>

      <Text style={styles.label}>From</Text>
      <TextInput style={styles.input} placeholder="London, UK" value={origin} onChangeText={setOrigin} />

      <Text style={styles.label}>Destination</Text>
      <TextInput style={styles.input} placeholder="Rome, Italy" value={destination} onChangeText={setDestination} />

      <Text style={styles.label}>Departure date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-05-01" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" />

      <Text style={styles.label}>Return date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-05-07" value={endDate} onChangeText={setEndDate} keyboardType="numbers-and-punctuation" />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating trip...' : 'Next →'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  button: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/plan/index.tsx hooks/useTrip.ts __tests__/hooks/useTrip.test.ts
git commit -m "feat: add Plan wizard Step 1 — Trip Setup"
```

---

### Task 12: Plan wizard — Step 2 (Interest Chips)

**Files:**
- Create: `app/(tabs)/plan/interests.tsx`
- Create: `components/InterestChip.tsx`
- Create: `__tests__/components/InterestChip.test.tsx`

- [ ] **Step 1: Write failing test for `InterestChip`**

```typescript
// __tests__/components/InterestChip.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { InterestChip } from '../../components/InterestChip'

describe('InterestChip', () => {
  it('renders label and emoji', () => {
    const { getByText } = render(
      <InterestChip label="Culture" emoji="🏛" selected={false} onPress={() => {}} />
    )
    expect(getByText('🏛 Culture')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <InterestChip label="Food" emoji="🍜" selected={false} onPress={onPress} />
    )
    fireEvent.press(getByText('🍜 Food'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/components/InterestChip.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../../components/InterestChip'`

- [ ] **Step 3: Write `components/InterestChip.tsx`**

```typescript
// components/InterestChip.tsx
import { Pressable, Text, StyleSheet } from 'react-native'

interface Props {
  label: string
  emoji: string
  selected: boolean
  onPress: () => void
}

export function InterestChip({ label, emoji, selected, onPress }: Props) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {emoji} {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f9f9f9', margin: 4 },
  chipSelected: { borderColor: '#0F6E56', backgroundColor: '#e8f5f0' },
  text: { fontSize: 14, color: '#555', fontWeight: '500' },
  textSelected: { color: '#0F6E56', fontWeight: '700' },
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/InterestChip.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Write `app/(tabs)/plan/interests.tsx`**

```typescript
// app/(tabs)/plan/interests.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { InterestChip } from '../../../components/InterestChip'

interface Chip { label: string; emoji: string }

export default function InterestsScreen() {
  const { tripId, destination, origin, startDate, endDate } = useLocalSearchParams<{ tripId: string; destination: string; origin: string; startDate: string; endDate: string }>()
  const router = useRouter()
  const [chips, setChips] = useState<Chip[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChips()
  }, [])

  async function fetchChips() {
    setLoading(true)
    try {
      const { data } = await supabase.functions.invoke('generate-chips', {
        body: { destination },
      })
      setChips(data.chips ?? [])
    } catch {
      // fallback chips
      setChips([
        { label: 'Culture', emoji: '🏛' },
        { label: 'Food', emoji: '🍜' },
        { label: 'Nature', emoji: '🏔' },
        { label: 'Shopping', emoji: '🛍' },
        { label: 'Nightlife', emoji: '🎭' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function toggleChip(label: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function handleNext() {
    if (selected.size === 0) return Alert.alert('Pick at least one interest')
    router.push({
      pathname: '/(tabs)/plan/itinerary',
      params: { tripId, destination, origin, startDate, endDate, interests: JSON.stringify([...selected]) },
    })
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>Step 2 of 6</Text>
      <Text style={styles.title}>What interests you?</Text>
      <Text style={styles.subtitle}>Select all that apply for {destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" style={{ marginTop: 32 }} />
      ) : (
        <View style={styles.chips}>
          {chips.map(chip => (
            <InterestChip
              key={chip.label}
              label={chip.label}
              emoji={chip.emoji}
              selected={selected.has(chip.label)}
              onPress={() => toggleChip(chip.label)}
            />
          ))}
        </View>
      )}

      <Pressable style={[styles.button, selected.size === 0 && styles.buttonDisabled]} onPress={handleNext} disabled={selected.size === 0}>
        <Text style={styles.buttonText}>Next →</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 32 },
  button: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/plan/interests.tsx components/InterestChip.tsx __tests__/components/InterestChip.test.tsx
git commit -m "feat: add Plan wizard Step 2 — Interest Chips"
```

---

### Task 13: Plan wizard — Step 3 (AI Itinerary + offline cache)

**Files:**
- Create: `app/(tabs)/plan/itinerary.tsx`
- Create: `components/ItineraryDay.tsx`
- Create: `lib/offline.ts`
- Create: `__tests__/lib/offline.test.ts`

- [ ] **Step 1: Write failing test for `offline.ts`**

```typescript
// __tests__/lib/offline.test.ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import { cacheItinerary, getCachedItinerary, isCacheStale } from '../../lib/offline'

describe('offline cache', () => {
  beforeEach(async () => {
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/lib/offline.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/offline'`

- [ ] **Step 3: Write `lib/offline.ts`**

```typescript
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
  return JSON.parse(raw) as CachedItinerary
}

export function isCacheStale(cachedAt: string): boolean {
  const ageMs = Date.now() - new Date(cachedAt).getTime()
  return ageMs > 48 * 60 * 60 * 1000
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/offline.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Write `components/ItineraryDay.tsx`**

```typescript
// components/ItineraryDay.tsx
import { View, Text, StyleSheet } from 'react-native'
import type { ItineraryDay as IDay } from '../types'

export function ItineraryDay({ day }: { day: IDay }) {
  return (
    <View style={styles.card}>
      <Text style={styles.dayLabel}>Day {day.day_number} — {day.date}</Text>
      {day.items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.time}>{item.time}</Text>
          <View style={styles.details}>
            <Text style={styles.place}>{item.place}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  dayLabel: { fontSize: 15, fontWeight: '700', color: '#0F6E56', marginBottom: 12 },
  item: { flexDirection: 'row', marginBottom: 10 },
  time: { width: 50, fontSize: 13, color: '#999', fontWeight: '600', paddingTop: 2 },
  details: { flex: 1 },
  place: { fontSize: 15, fontWeight: '600', color: '#111' },
  notes: { fontSize: 13, color: '#777', marginTop: 2 },
})
```

- [ ] **Step 6: Write `app/(tabs)/plan/itinerary.tsx`**

```typescript
// app/(tabs)/plan/itinerary.tsx
import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { cacheItinerary } from '../../../lib/offline'
import { useTrip } from '../../../hooks/useTrip'
import { ItineraryDay } from '../../../components/ItineraryDay'
import type { ItineraryDay as IDay } from '../../../types'

export default function ItineraryScreen() {
  const { tripId, destination, interests, origin, startDate, endDate } = useLocalSearchParams<{ tripId: string; destination: string; interests: string; origin: string; startDate: string; endDate: string }>()
  const router = useRouter()
  const { saveItinerary } = useTrip()
  const [days, setDays] = useState<IDay[]>([])
  const [streaming, setStreaming] = useState(true)
  const [rawBuffer, setRawBuffer] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    generateItinerary()
    return () => abortRef.current?.abort()
  }, [])

  async function generateItinerary() {
    abortRef.current = new AbortController()
    setStreaming(true)
    setDays([])
    setRawBuffer('')

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-itinerary`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin,
            destinations: [destination],
            start_date: startDate,
            end_date: endDate,
            interests: JSON.parse(interests),
          }),
          signal: abortRef.current.signal,
        }
      )

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        setRawBuffer(buffer)

        // Try to parse partial JSON
        try {
          const parsed = JSON.parse(buffer) as IDay[]
          setDays(parsed)
        } catch {
          // Not yet complete JSON — keep streaming
        }
      }

      // Final parse
      try {
        const finalDays = JSON.parse(buffer) as IDay[]
        setDays(finalDays)
        await saveItinerary(tripId, finalDays)
        await cacheItinerary(tripId, finalDays)
      } catch {
        Alert.alert('Parse error', 'Could not parse itinerary. Please retry.')
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') Alert.alert('Error', e.message)
    } finally {
      setStreaming(false)
    }
  }

  function handleNext() {
    router.push({ pathname: '/(tabs)/plan/best-time', params: { tripId, destination } })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 3 of 6</Text>
      <Text style={styles.title}>Your itinerary</Text>

      {streaming && days.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0F6E56" size="large" />
          <Text style={styles.loadingText}>Generating your personalised plan…</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {days.map(day => <ItineraryDay key={day.day_number} day={day} />)}
      </ScrollView>

      {!streaming && days.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.retryButton} onPress={generateItinerary}>
            <Text style={styles.retryText}>Regenerate</Text>
          </Pressable>
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>Next →</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#666', fontSize: 15 },
  scroll: { flex: 1 },
  footer: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  retryButton: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#0F6E56' },
  retryText: { color: '#0F6E56', fontWeight: '700', fontSize: 15 },
  nextButton: { flex: 2, backgroundColor: '#0F6E56', borderRadius: 14, padding: 14, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
```

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/plan/itinerary.tsx components/ItineraryDay.tsx lib/offline.ts __tests__/lib/offline.test.ts
git commit -m "feat: add Plan wizard Step 3 — AI Itinerary with streaming and offline cache"
```

---

### Task 14: Plan wizard — Steps 4, 5, 6

**Files:**
- Create: `app/(tabs)/plan/best-time.tsx`
- Create: `app/(tabs)/plan/visa.tsx`
- Create: `app/(tabs)/plan/packing.tsx`
- Create: `lib/openweather.ts`
- Create: `__tests__/lib/openweather.test.ts`

- [ ] **Step 1: Write failing test for `openweather.ts`**

```typescript
// __tests__/lib/openweather.test.ts
global.fetch = jest.fn()

import { fetchForecast } from '../../lib/openweather'

describe('fetchForecast', () => {
  it('returns parsed forecast days', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: [
          { dt_txt: '2026-05-01 12:00:00', main: { temp_min: 15, temp_max: 22 }, weather: [{ description: 'clear sky', icon: '01d' }] },
          { dt_txt: '2026-05-02 12:00:00', main: { temp_min: 13, temp_max: 20 }, weather: [{ description: 'light rain', icon: '10d' }] },
        ],
      }),
    })

    const result = await fetchForecast('Rome', '2026-05-01', '2026-05-05')
    expect(result).toHaveLength(2)
    expect(result[0].description).toBe('clear sky')
    expect(result[0].temp_max).toBe(22)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/lib/openweather.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/openweather'`

- [ ] **Step 3: Write `lib/openweather.ts`**

```typescript
// lib/openweather.ts
import type { WeatherForecastDay } from '../types'

const BASE = 'https://api.openweathermap.org/data/2.5'

export async function fetchForecast(
  destination: string,
  _startDate: string,
  _endDate: string
): Promise<WeatherForecastDay[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY
  const res = await fetch(
    `${BASE}/forecast?q=${encodeURIComponent(destination)}&appid=${apiKey}&units=metric&cnt=40`
  )
  if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`)
  const data = await res.json()

  // One entry per day (noon readings)
  const days: WeatherForecastDay[] = data.list
    .filter((item: any) => item.dt_txt.includes('12:00:00'))
    .map((item: any) => ({
      date: item.dt_txt.split(' ')[0],
      temp_min: Math.round(item.main.temp_min),
      temp_max: Math.round(item.main.temp_max),
      description: item.weather[0].description,
      icon: item.weather[0].icon,
    }))

  return days
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/openweather.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Write `app/(tabs)/plan/best-time.tsx`**

```typescript
// app/(tabs)/plan/best-time.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import type { BestTimeResult, MonthData } from '../../../types'

export default function BestTimeScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const [result, setResult] = useState<BestTimeResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBestTime() }, [])

  async function fetchBestTime() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('best-time', {
        body: { destination },
      })
      if (error) throw error
      setResult(data as BestTimeResult)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  const crowdColor = (level: MonthData['crowd_level']) =>
    ({ low: '#0F6E56', medium: '#F5A623', high: '#E8622A' }[level])

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 4 of 6</Text>
      <Text style={styles.title}>Best time to visit</Text>
      <Text style={styles.subtitle}>{destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : result ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.summaryCard}>
            <Text style={styles.optimalLabel}>Recommended months</Text>
            <Text style={styles.optimalMonths}>{result.optimal_months.join(' · ')}</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          {result.monthly_breakdown.map(m => (
            <View key={m.month} style={styles.monthRow}>
              <Text style={styles.monthName}>{m.month}</Text>
              <Text style={styles.weather}>{m.weather}</Text>
              <Text style={[styles.badge, { color: crowdColor(m.crowd_level) }]}>
                {m.crowd_level} crowds
              </Text>
              <Text style={styles.score}>{m.score}/10</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/visa', params: { tripId, destination } })}>
          <Text style={styles.nextText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  optimalLabel: { fontSize: 12, color: '#0F6E56', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  optimalMonths: { fontSize: 20, fontWeight: '800', color: '#111', marginVertical: 4 },
  summary: { fontSize: 14, color: '#666', lineHeight: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, gap: 8 },
  monthName: { width: 36, fontSize: 13, fontWeight: '700', color: '#333' },
  weather: { flex: 1, fontSize: 12, color: '#666' },
  badge: { fontSize: 11, fontWeight: '600' },
  score: { fontSize: 14, fontWeight: '800', color: '#111', width: 36, textAlign: 'right' },
  footer: { paddingVertical: 12 },
  nextButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 17 },
})
```

- [ ] **Step 6: Write `app/(tabs)/plan/visa.tsx`**

```typescript
// app/(tabs)/plan/visa.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { VisaSummary } from '../../../types'

export default function VisaScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [visa, setVisa] = useState<Partial<VisaSummary> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchVisa() }, [])

  async function fetchVisa() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('visa-check', {
        body: { nationality: user?.nationality || 'Unknown', destination },
      })
      if (error) throw error
      setVisa(data)

      // Persist to DB
      await supabase.from('visa_summaries').insert({
        trip_id: tripId,
        nationality: user?.nationality || 'Unknown',
        destination,
        content: data,
      })
    } catch (e: any) {
      Alert.alert('Visa check failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 5 of 6</Text>
      <Text style={styles.title}>Visa & documents</Text>
      <Text style={styles.subtitle}>{user?.nationality} → {destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : visa ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.card}>
            <Text style={styles.visaType}>{visa.visa_type}</Text>
            <Text style={styles.timeline}>{visa.timeline}</Text>
          </View>

          <Text style={styles.sectionTitle}>Steps</Text>
          {(visa.steps ?? []).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Documents needed</Text>
          {(visa.checklist ?? []).map((doc, i) => (
            <Text key={i} style={styles.checkItem}>✓  {doc}</Text>
          ))}

          {visa.cost_estimate && (
            <>
              <Text style={styles.sectionTitle}>Estimated cost</Text>
              <Text style={styles.cost}>{visa.cost_estimate}</Text>
            </>
          )}

          {visa.embassy_url && (
            <Pressable style={styles.embassyButton} onPress={() => Linking.openURL(visa.embassy_url!)}>
              <Text style={styles.embassyText}>Official embassy website →</Text>
            </Pressable>
          )}
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.nextButton} onPress={() => router.push({ pathname: '/(tabs)/plan/packing', params: { tripId, destination } })}>
          <Text style={styles.nextText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  visaType: { fontSize: 22, fontWeight: '800', color: '#6B7BFF' },
  timeline: { fontSize: 14, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6B7BFF', color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '700', lineHeight: 22 },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  checkItem: { fontSize: 14, color: '#333', marginBottom: 6, lineHeight: 20 },
  cost: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
  embassyButton: { backgroundColor: '#f0f0ff', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  embassyText: { color: '#6B7BFF', fontWeight: '700', fontSize: 15 },
  footer: { paddingVertical: 12 },
  nextButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 17 },
})
```

- [ ] **Step 7: Write `app/(tabs)/plan/packing.tsx`**

```typescript
// app/(tabs)/plan/packing.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { fetchForecast } from '../../../lib/openweather'
import type { WeatherForecastDay, PackingCategory } from '../../../types'

export default function PackingScreen() {
  const { tripId, destination } = useLocalSearchParams<{ tripId: string; destination: string }>()
  const router = useRouter()
  const [forecast, setForecast] = useState<WeatherForecastDay[]>([])
  const [packing, setPacking] = useState<PackingCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Get trip dates
      const { data: trip } = await supabase
        .from('trips')
        .select('start_date, end_date')
        .eq('id', tripId)
        .single()

      const forecastData = await fetchForecast(destination, trip.start_date, trip.end_date)
      setForecast(forecastData)

      const { data, error } = await supabase.functions.invoke('packing-list', {
        body: { destination, start_date: trip.start_date, end_date: trip.end_date, forecast: forecastData },
      })
      if (error) throw error
      setPacking(data.packing_list)

      // Persist weather pack
      await supabase.from('weather_packs').insert({
        trip_id: tripId,
        forecast: forecastData,
        packing_list: data.packing_list,
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 6 of 6</Text>
      <Text style={styles.title}>Pack & weather</Text>
      <Text style={styles.subtitle}>{destination}</Text>

      {loading ? (
        <ActivityIndicator color="#0F6E56" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
          {forecast.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {forecast.map(day => (
                  <View key={day.date} style={styles.forecastCard}>
                    <Text style={styles.forecastDate}>{day.date.slice(5)}</Text>
                    <Text style={styles.forecastTemp}>{day.temp_min}–{day.temp_max}°</Text>
                    <Text style={styles.forecastDesc}>{day.description}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.sectionTitle}>What to pack</Text>
          {packing.map(cat => (
            <View key={cat.category} style={styles.packCard}>
              <Text style={styles.packCategory}>{cat.category}</Text>
              {cat.items.map((item, i) => (
                <Text key={i} style={styles.packItem}>• {item}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable style={styles.doneButton} onPress={() => router.replace(`/trip/${tripId}`)}>
          <Text style={styles.doneText}>View my trip ✓</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  step: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  forecastCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 10, alignItems: 'center', minWidth: 80 },
  forecastDate: { fontSize: 12, color: '#888', marginBottom: 4 },
  forecastTemp: { fontSize: 16, fontWeight: '700', color: '#111' },
  forecastDesc: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 2 },
  packCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  packCategory: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  packItem: { fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 },
  footer: { paddingVertical: 12 },
  doneButton: { backgroundColor: '#0F6E56', borderRadius: 14, padding: 16, alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 17 },
})
```

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/plan/best-time.tsx app/(tabs)/plan/visa.tsx app/(tabs)/plan/packing.tsx \
  lib/openweather.ts __tests__/lib/openweather.test.ts
git commit -m "feat: add Plan wizard Steps 4–6 (Best Time, Visa, Packing)"
```

---

## Phase 4 — Supporting Tabs

### Task 15: Trip detail view

**Files:**
- Create: `app/trip/[id].tsx`

- [ ] **Step 1: Write `app/trip/[id].tsx`**

```typescript
// app/trip/[id].tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getCachedItinerary, isCacheStale } from '../../lib/offline'
import { ItineraryDay } from '../../components/ItineraryDay'
import type { Trip, ItineraryDay as IDay } from '../../types'

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [days, setDays] = useState<IDay[]>([])
  const [stale, setStale] = useState(false)

  useEffect(() => { loadTrip() }, [])

  async function loadTrip() {
    // Try offline cache first
    const cached = await getCachedItinerary(id)
    if (cached) {
      setDays(cached.days)
      setStale(isCacheStale(cached.cachedAt))
    }

    // Fetch trip metadata
    const { data: tripData } = await supabase
      .from('trips').select('*').eq('id', id).single()
    if (tripData) setTrip(tripData as Trip)

    // Fetch fresh itinerary from DB if not cached
    if (!cached) {
      const { data: dayData } = await supabase
        .from('itinerary_days').select('*').eq('trip_id', id).order('day_number')
      if (dayData) setDays(dayData as IDay[])
    }
  }

  if (!trip) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{trip.destinations.join(', ')}</Text>
        <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
      </View>

      {stale && (
        <View style={styles.staleBanner}>
          <Text style={styles.staleText}>⚠ Offline — cached over 48 hours ago</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {days.map(day => <ItineraryDay key={day.day_number} day={day} />)}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  back: { marginBottom: 8 },
  backText: { color: '#0F6E56', fontWeight: '600', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#111' },
  dates: { fontSize: 14, color: '#888', marginTop: 4 },
  staleBanner: { backgroundColor: '#FFF3CD', padding: 10, alignItems: 'center' },
  staleText: { color: '#856404', fontSize: 13 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/trip/[id].tsx
git commit -m "feat: add trip detail view with offline cache support"
```

---

### Task 16: Home tab

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `components/TripCard.tsx`

- [ ] **Step 1: Write `components/TripCard.tsx`**

```typescript
// components/TripCard.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import type { Trip } from '../types'

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/trip/${trip.id}`)}>
      <Text style={styles.destination}>{trip.destinations.join(', ')}</Text>
      <Text style={styles.dates}>{trip.start_date} → {trip.end_date}</Text>
      <View style={[styles.badge, trip.status === 'confirmed' && styles.badgeConfirmed]}>
        <Text style={styles.badgeText}>{trip.status}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  destination: { fontSize: 18, fontWeight: '800', color: '#111' },
  dates: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeConfirmed: { backgroundColor: '#e8f5f0' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#0F6E56', textTransform: 'capitalize' },
})
```

- [ ] **Step 2: Replace `app/(tabs)/index.tsx`**

```typescript
// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTrip } from '../../hooks/useTrip'
import { TripCard } from '../../components/TripCard'
import type { Trip } from '../../types'

export default function HomeTab() {
  const router = useRouter()
  const { user } = useAuth()
  const { getUserTrips } = useTrip()
  const [trips, setTrips] = useState<Trip[]>([])

  useEffect(() => {
    getUserTrips().then(setTrips).catch(() => {})
  }, [])

  const upcoming = trips.filter(t => new Date(t.start_date) >= new Date())

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.greeting}>Hey{user?.display_name ? `, ${user.display_name}` : ''} 👋</Text>
      <Text style={styles.heading}>Your trips</Text>

      {upcoming.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips planned yet</Text>
          <Text style={styles.emptySubtitle}>Use the Plan tab to create your first trip with AI.</Text>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/plan')}>
            <Text style={styles.ctaText}>Plan a trip →</Text>
          </Pressable>
        </View>
      ) : (
        upcoming.map(trip => <TripCard key={trip.id} trip={trip} />)
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 15, color: '#888', marginBottom: 4 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  ctaButton: { backgroundColor: '#0F6E56', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx components/TripCard.tsx
git commit -m "feat: add Home tab with trip list and empty state"
```

---

### Task 17: Explore tab (Mapbox)

**Files:**
- Modify: `app/(tabs)/explore.tsx`

- [ ] **Step 1: Set Mapbox access token in `app.json`**

Ensure `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` is in `.env.local`. The Mapbox SDK reads from `MapboxAccessToken` in `app.json` at build time — set it:

In `app.json` under `expo.extra`:
```json
{
  "expo": {
    "extra": {
      "mapboxAccessToken": "YOUR_MAPBOX_PUBLIC_TOKEN"
    }
  }
}
```

- [ ] **Step 2: Replace `app/(tabs)/explore.tsx`**

```typescript
// app/(tabs)/explore.tsx
import { useState } from 'react'
import { View, StyleSheet, Pressable, Text, Linking } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import Constants from 'expo-constants'

MapboxGL.setAccessToken(Constants.expoConfig?.extra?.mapboxAccessToken ?? '')

export default function ExploreTab() {
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null)

  function handleMapPress(e: any) {
    const coord = e.geometry.coordinates as [number, number]
    setSelectedCoord(coord)
  }

  function openInGoogleMaps() {
    if (!selectedCoord) return
    const [lng, lat] = selectedCoord
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} onPress={handleMapPress}>
        <MapboxGL.Camera
          zoomLevel={12}
          centerCoordinate={[0, 51.5]} // default: London
          animationMode="flyTo"
        />

        {selectedCoord && (
          <MapboxGL.PointAnnotation id="selected" coordinate={selectedCoord}>
            <View style={styles.pin} />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {selectedCoord && (
        <View style={styles.bottomSheet}>
          <Text style={styles.coordText}>
            {selectedCoord[1].toFixed(5)}, {selectedCoord[0].toFixed(5)}
          </Text>
          <Pressable style={styles.gmapsButton} onPress={openInGoogleMaps}>
            <Text style={styles.gmapsText}>Open in Google Maps →</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  pin: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0F6E56', borderWidth: 2, borderColor: '#fff' },
  bottomSheet: { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  coordText: { fontSize: 13, color: '#888', marginBottom: 10 },
  gmapsButton: { backgroundColor: '#f0f7f4', borderRadius: 10, padding: 12, alignItems: 'center' },
  gmapsText: { color: '#0F6E56', fontWeight: '700', fontSize: 15 },
})
```

- [ ] **Step 3: Rebuild dev client (Mapbox requires native build)**

```bash
eas build --profile development --platform ios
```

- [ ] **Step 4: Test on device**

Verify: map loads, tap sets a pin, "Open in Google Maps" button appears and opens correctly.

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/explore.tsx
git commit -m "feat: add Explore tab with Mapbox map and Google Maps deep link"
```

---

### Task 18: Profile tab

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Replace `app/(tabs)/profile.tsx`**

```typescript
// app/(tabs)/profile.tsx
import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native'
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
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: add Profile tab with nationality and sign out"
```

---

### Task 19: Collections feature

**Files:**
- Create: `hooks/useCollections.ts`
- Create: `components/CollectionModal.tsx`
- Create: `__tests__/hooks/useCollections.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/hooks/useCollections.test.ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockImplementation((table) => {
      if (table === 'collections') return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'col-1', user_id: 'user-1', name: 'Italy Trip' }],
          error: null,
        }),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'col-2', name: 'New' }, error: null }),
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }
    }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}))

import { renderHook, act } from '@testing-library/react-native'
import { useCollections } from '../../hooks/useCollections'

describe('useCollections', () => {
  it('exposes getCollections and saveToCollection functions', () => {
    const { result } = renderHook(() => useCollections())
    expect(typeof result.current.getCollections).toBe('function')
    expect(typeof result.current.saveToCollection).toBe('function')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/hooks/useCollections.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../hooks/useCollections'`

- [ ] **Step 3: Write `hooks/useCollections.ts`**

```typescript
// hooks/useCollections.ts
import { supabase } from '../lib/supabase'
import type { Collection, Place } from '../types'

export function useCollections() {
  async function getCollections(): Promise<Collection[]> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user!.id)
    if (error) throw error
    return data as Collection[]
  }

  async function createCollection(name: string): Promise<Collection> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('collections')
      .insert({ name, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as Collection
  }

  async function saveToCollection(collectionId: string, place: Omit<Place, 'id' | 'created_by'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()

    // Upsert place
    const { data: placeData, error: placeError } = await supabase
      .from('places')
      .upsert({ ...place, created_by: user!.id }, { onConflict: 'mapbox_id' })
      .select()
      .single()
    if (placeError) throw placeError

    // Add to collection (ignore duplicate)
    await supabase
      .from('collection_places')
      .insert({ collection_id: collectionId, place_id: placeData.id })
      .throwOnError()
  }

  return { getCollections, createCollection, saveToCollection }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/hooks/useCollections.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useCollections.ts __tests__/hooks/useCollections.test.ts
git commit -m "feat: add useCollections hook"
```

---

### Task 20: Full test run + TestFlight build

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass. Fix any failures before proceeding.

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build production iOS app via EAS**

```bash
eas build --profile production --platform ios
```

- [ ] **Step 4: Submit to TestFlight**

```bash
eas submit --platform ios
```

Follow prompts to submit to App Store Connect. Invite testers via TestFlight.

- [ ] **Step 5: Manual E2E checklist on device**

Run through the full Plan wizard on a physical iPhone:
- [ ] Sign in with Apple
- [ ] Sign in with Google
- [ ] Create a trip (London → Rome, future dates)
- [ ] Select interest chips
- [ ] AI itinerary generates and streams
- [ ] Best time to visit shows monthly breakdown
- [ ] Visa check shows requirements + embassy link
- [ ] Packing list generates with weather forecast
- [ ] Trip appears on Home tab
- [ ] Explore map loads with Mapbox
- [ ] Tap map → "Open in Google Maps" works
- [ ] Profile nationality saves
- [ ] Sign out and sign back in — trips persist

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final MVP build — all tests passing"
```

---

## Success Criteria

All items from the spec must be met before marking MVP complete:

- [ ] Trip setup to itinerary in <10 seconds (test on device, not simulator)
- [ ] Visa + checklist rendered for any nationality/destination pair
- [ ] Best-time recommendation displayed for any destination
- [ ] Packing list generated from live weather forecast
- [ ] Itinerary accessible offline after first load (airplane mode test)
- [ ] Apple Sign-In and Google Sign-In working end-to-end
- [ ] App submitted to App Store TestFlight
