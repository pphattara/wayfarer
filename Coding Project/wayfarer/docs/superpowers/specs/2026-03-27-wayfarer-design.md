# Wayfarer iOS App — MVP Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## 1. Overview

Wayfarer is an iOS-first trip planning app that takes a user from trip inspiration to a fully prepared, ready-to-travel itinerary. The MVP covers AI-powered itinerary generation, best-time-to-visit recommendations, visa and document guidance, and weather-based packing suggestions — all in a single 6-step planning wizard.

The app launches iOS-only via React Native (Expo), targets the 20–35 demographic, and uses a community map (Explore tab) as its primary social surface.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Mobile | React Native + Expo Managed | Fastest iOS MVP; EAS Build for App Store; no Xcode required for dev |
| Navigation | Expo Router (file-based) | Aligns with Expo ecosystem; easy deep linking |
| Backend / Auth / DB | Supabase | BaaS — auth, PostgreSQL, storage, Edge Functions in one; minimal ops |
| AI | OpenAI GPT-4o via Supabase Edge Functions | Highest quality for travel planning; API key never exposed on client |
| Maps | Mapbox (primary) + Google Maps deep link | Custom teal branding; "Open in Google Maps" button for users who prefer it |
| Weather | OpenWeatherMap API | Free tier covers forecasts + historical climate data |
| Authentication | Apple Sign-In + Google Sign-In | Required by Apple HIG; covers both ecosystems |
| Offline | AsyncStorage | Cache itinerary + venue details after first generation |

---

## 3. Navigation Structure

Five-tab bar: **Home · Explore · Plan · Feed · Profile**

### Home
- Upcoming trips list
- "Plan your first trip" prompt (new users only)
- Weather summary for next trip
- Saved collections preview

### Explore
- Fullscreen Mapbox map
- Search bar + category filter
- Mapbox POIs (restaurants, attractions, landmarks) — browsable and saveable
- Save-to-collection from any pin
- Creator route overlays deferred to Phase 2 (requires user-generated content)

### Plan *(AI Core — see Section 5)*
- 6-step wizard: Trip Setup → Interest Chips → AI Itinerary → Best Time → Visa & Docs → Pack & Weather

### Feed
- Empty state at MVP launch ("Be the first to share your trip")
- Tab is present in navigation so the structure is established
- Post trip content (photos, videos, reviews pinned to map) deferred to Phase 2
- No `posts` table required for MVP

### Profile
- Passport nationality (pre-fills visa check)
- Travel preferences
- Saved collections
- Past trips

---

## 4. Design System

- **Primary colour:** Teal `#0F6E56`
- **Accent colours:** Coral `#E8622A`, Amber `#F5A623`
- **Style:** Clean, minimal, card-based; Apple HIG compliant
- **Dark mode:** Full support (required for in-destination use)
- **Typography:** Dynamic type enabled
- **Accessibility:** WCAG 2.1 AA target; VoiceOver tested pre-launch

---

## 5. Plan Tab — AI Wizard Flow

All AI calls route through Supabase Edge Functions. The OpenAI API key is never on the client. Edge functions handle rate limiting, error fallback, and response caching.

### Step 1 — Trip Setup
- Inputs: origin city, destination(s) (multi-city), departure date, return date, nationality (pre-filled from profile)
- Validation: past dates rejected; ambiguous city shows top 3 Mapbox geocode matches
- Constraint: input acknowledged in <2s

### Step 2 — Interest Chips
- GPT-4o generates ≥10 category chips personalised to the destination (e.g. Culture, Food, Nature, Beach, Nightlife, Shopping)
- User's saved places from Explore surface as priority chips
- Chips returned in <5s; fallback: 5 most popular shown if no attractions found

### Step 3 — AI Itinerary
- GPT-4o generates a day-by-day itinerary including opening hours and travel times between venues
- Response streamed to show progress; full plan in <10s
- On timeout: partial plan shown with "Generate more" retry button
- Itinerary + venue details cached to AsyncStorage for offline access (staleness warning after 48hrs)

### Step 4 — Best Time to Visit
- GPT-4o analyses destination weather, cost index, and crowd levels by month
- Output: optimal month(s) highlighted, user's selected dates highlighted with context
- Result cached per destination for 7 days (shared across users via `best_time_cache` table)
- Response in <5s; fallback to weather-only if crowd/cost data unavailable

### Step 5 — Visa & Docs
- Nationality from profile → GPT-4o generates visa type, application steps, timeline, document checklist, rough cost estimate
- Always includes link to official embassy/government website
- Fallback: if AI cannot determine requirements, show official embassy link with a clear note

### Step 6 — Pack & Weather
- OpenWeatherMap fetches forecast for trip dates and destination
- GPT-4o generates a packing list based on forecast (clothing, gear, essentials)
- Trip saved to Supabase on completion; user lands on trip detail view

---

## 6. Data Model

All tables in Supabase PostgreSQL with Row-Level Security. Users can only read/write their own data.

| Table | Key columns |
|---|---|
| `users` | `id`, `email`, `nationality`, `display_name`, `avatar_url` |
| `trips` | `id`, `user_id`, `origin`, `destinations[]`, `start_date`, `end_date`, `status` |
| `itinerary_days` | `id`, `trip_id`, `day_number`, `date`, `items` (JSONB) |
| `visa_summaries` | `id`, `trip_id`, `nationality`, `destination`, `content` (JSONB), `generated_at` |
| `weather_packs` | `id`, `trip_id`, `forecast` (JSONB), `packing_list` (JSONB), `fetched_at` |
| `best_time_cache` | `id`, `destination`, `content` (JSONB), `cached_at` |
| `places` | `id`, `name`, `lat`, `lng`, `mapbox_id`, `category`, `created_by` |
| `collections` | `id`, `user_id`, `name` |
| `collection_places` | `collection_id`, `place_id` |

---

## 7. Error Handling

| Scenario | Behaviour |
|---|---|
| AI response timeout (>10s) | Show partial itinerary + "Generate more" retry; never blank screen |
| Ambiguous city input | Inline top 3 Mapbox geocode matches; user selects before proceeding |
| Visa data unavailable | Show official embassy link + "AI couldn't retrieve details" notice |
| OpenWeatherMap API failure | Show "Weather unavailable" with manual packing suggestion option |
| No internet (offline) | Serve cached itinerary from AsyncStorage; staleness warning after 48hrs |

---

## 8. Testing Approach

- **Unit tests:** Supabase Edge Functions — AI prompt formatting, response parsing, caching logic
- **Integration tests:** Supabase auth flows (Apple Sign-In, Google Sign-In)
- **Manual E2E:** Full Plan wizard on device via Expo Go before each release
- **Accessibility:** VoiceOver pass on all five tabs pre-launch

---

## 9. Out of Scope for MVP

The following are explicitly deferred to Phase 2:

- Trip content posting (photos, videos, reviews pinned to map) — US4
- Creator routes and community pins on Explore map
- Business listings, claim flow, sentiment dashboard — US7, US9
- Collaboration / shared itinerary editing — US9
- Android support
- PWA / desktop

---

## 10. Success Criteria (MVP)

- Trip setup to full itinerary in under 10 seconds (AI generation)
- Visa + document checklist rendered for any nationality/destination pair
- Best-time-to-visit recommendation displayed for any destination
- Packing list generated based on live weather forecast
- Itinerary accessible offline after first load
- Apple Sign-In and Google Sign-In working end-to-end
- App submitted to App Store TestFlight
