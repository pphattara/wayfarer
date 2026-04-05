# Wayfarer — Full Version Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Builds on:** `docs/superpowers/specs/2026-03-27-wayfarer-design.md` (MVP)

---

## 1. Overview

The full version of Wayfarer extends the MVP into a complete travel platform. Where the MVP established the AI planning core and individual trip workflow, the full version adds the social layer, business discovery, cross-platform reach, real-time collaboration, and monetisation. All features from the MVP spec are retained unchanged; this document defines only what is new or extended.

The target remains the 20–35 traveller demographic. The full product positions Wayfarer as the single app from inspiration → planning → booking → community → sharing.

---

## 2. New Tech Stack Additions

| Layer | Addition | Rationale |
|---|---|---|
| Push notifications | Expo Notifications + APNs/FCM | Trip reminders, weather alerts, social activity |
| Real-time | Supabase Realtime (Postgres changes) | Collaborative itinerary editing, live feed updates |
| File storage | Supabase Storage | Trip photos, videos, creator route assets |
| PDF export | `react-native-pdf-lib` + Edge Function | Shareable itinerary PDF |
| Deep links | Expo Linking + Universal Links | Share trip/route links that open the app |
| Android | EAS Build (Android target) | Google Play Store release |
| Web/PWA | Expo for Web + Next.js shell | Lightweight web presence; SEO landing pages |
| Payments | RevenueCat + StoreKit/Google Billing | In-app subscription management (Pro tier) |
| Analytics | PostHog (self-hosted optional) | Event tracking; funnel analysis; no PII |
| Background tasks | Expo Background Fetch | Nightly trip reminders, cache warm |

---

## 3. Revised Navigation Structure

The five-tab bar is retained. Feed is now fully implemented; a new **Discover** surface replaces the basic Explore shell.

### Home (extended)
- Upcoming trips list (unchanged)
- Suggested trips ("People like you went to X") — ML personalisation based on past trip history and interests
- Trending destinations widget — ranked by recent Wayfarer trip volume
- Collaboration requests badge — pending itinerary invites

### Explore (extended — becomes Discover)
- Full Mapbox map (unchanged)
- **Creator routes overlay** — community-published trip paths rendered as colour-coded polylines; tap to preview
- **Community pins** — user-submitted POIs visible on map; differentiated from Mapbox POIs by pin style
- **Business listings layer** — claimed businesses shown with verified badge, photos, and booking link
- Filter panel: creator routes, community pins, Mapbox POIs, business listings — each individually toggleable
- Route detail sheet: creator name, trip summary, save-to-collection, follow creator

### Plan (unchanged core + enhancements)
- Step 1 wizard flow is unchanged
- **Step 3 enhancement:** Alternative itinerary button — re-generates a second plan variant to compare
- **Collaboration invite:** Before Step 3 renders, option to invite travel companions; companions see the plan in real time
- **Step 7 (new) — Booking Links:** After Pack & Weather, Wayfarer surfaces affiliate booking links (flights, hotels) scoped to the trip dates and destination, via Skyscanner/Booking.com partner APIs. This step is optional and skippable.

### Feed (fully implemented)
- Chronological + algorithmic feed of trip posts from followed users and trending content
- Post types: photo, short video (≤60s), multi-photo gallery, route share
- Post is always pinned to a location — renders as a card with a mini-map thumbnail
- Like, comment, re-share to own profile
- "Save to collection" from any feed post
- Moderation: report flow; content queued for human review

### Profile (extended)
- Public/private toggle for each trip
- Follower/following counts and lists
- "Creator" badge for users with published routes
- Business owner mode — separate tab in profile for managing business listings
- Subscription tier display (Free / Pro)

---

## 4. Social Layer

### Following System
- One-directional follow (Twitter model, not mutual friendship)
- `followers` table: `follower_id`, `following_id`, `created_at`
- Feed query: posts from followed users + trending posts ranked by `likes + comments` within 48h window
- Follow suggestions: users who planned trips to the same destination (derived from `trips` table)

### Trip Content Posts
- A post is created from a completed trip's trip detail view ("Share your trip")
- Post metadata: `user_id`, `trip_id`, `caption`, `media_urls[]`, `location` (lat/lng), `destination_name`, `visibility` (public/followers/private)
- Media upload: client uploads to Supabase Storage; Edge Function generates thumbnail + video transcode job
- Feed renders posts as cards; tapping opens full-screen post view
- `posts` table: `id`, `user_id`, `trip_id`, `caption`, `media_urls` (JSONB), `lat`, `lng`, `destination_name`, `visibility`, `likes_count`, `comments_count`, `created_at`
- `post_likes`: `post_id`, `user_id`, `created_at` (composite PK)
- `post_comments`: `id`, `post_id`, `user_id`, `body`, `created_at`

### Creator Routes
- A creator route is a planned trip path published to the Explore map
- Any user can publish a completed trip as a route from the trip detail view
- Route data: ordered list of `{lat, lng, name, type}` waypoints derived from `itinerary_days.items`
- Supabase Edge Function converts itinerary JSONB → GeoJSON LineString for Mapbox rendering
- `creator_routes` table: `id`, `user_id`, `trip_id`, `title`, `summary`, `geojson` (JSONB), `days`, `tags[]`, `published`, `view_count`, `save_count`, `created_at`
- Community pins: any user can drop a custom pin from the Explore map long-press gesture
- `community_pins` table: `id`, `user_id`, `lat`, `lng`, `name`, `category`, `note`, `photo_url`, `verified`, `created_at`

---

## 5. Collaboration

### Shared Itinerary Editing
- Trip owner can invite collaborators by email or username from the Plan wizard (Step 3) or trip detail view
- Collaborators can view the itinerary in real time; edit permissions are per-collaborator (view / suggest / full edit)
- Real-time sync uses Supabase Realtime subscriptions on `itinerary_days` — all editors receive live updates
- Conflict model: last-write-wins per itinerary item (item granularity prevents full-row conflicts)
- Presence indicator: up to 5 collaborator avatars shown at top of itinerary view; active collaborators highlighted
- `trip_collaborators` table: `trip_id`, `user_id`, `role` (viewer/suggester/editor), `invited_at`, `accepted_at`
- Invite flow: email → magic link → deep link → opens app at trip; if no account, prompts sign-up first

### Commenting on Itinerary Items
- Collaborators can thread comments on any itinerary item
- `itinerary_comments` table: `id`, `itinerary_day_id`, `item_index`, `user_id`, `body`, `resolved`, `created_at`
- Resolved comments are hidden by default; toggle to show

---

## 6. Business Listings

### Discovery
- Businesses appear on the Explore map as a separate pin layer (toggleable)
- Business pin data sourced from: (a) Mapbox POI data enriched by claimed owner, or (b) owner-created listing
- Business card shows: name, category, rating (aggregated from Wayfarer user reviews), cover photo, "Book / Visit" CTA

### Claim Flow
- Any Mapbox POI can be claimed by a business owner
- Claim steps: select POI on map → "Claim this business" → verify via email domain or Google Business OAuth
- Claimed business unlocks: edit name/description/hours, add photos, add booking link, view sentiment dashboard
- `business_listings` table: `id`, `mapbox_poi_id` (nullable), `owner_user_id`, `name`, `category`, `description`, `hours` (JSONB), `cover_photo_url`, `booking_url`, `verified`, `created_at`

### Sentiment Dashboard (owner-only)
- Aggregates all Wayfarer reviews + post mentions of the business
- Shows: average rating, rating trend (30d), most common sentiment keywords (NLP via GPT-4o mini)
- Accessible from Profile → Business tab
- Edge Function: `business-sentiment` — queries `reviews` and `post_mentions` tables, calls GPT-4o mini for keyword extraction, caches result for 24h

### Reviews
- Any user can leave a review on a business from the business card or post
- `reviews` table: `id`, `user_id`, `business_id`, `rating` (1–5), `body`, `photo_urls[]`, `trip_id` (optional), `created_at`
- Aggregate rating stored on `business_listings.avg_rating` (updated via Postgres trigger)

---

## 7. Android & Cross-Platform

### Android
- EAS Build adds Android target; managed workflow supports both platforms
- Android-specific: replace `expo-apple-authentication` with Google Sign-In only on Android; Apple Sign-In button hidden via platform check
- Mapbox SDK supports Android natively — no API change
- Push: APNs (iOS) + FCM (Android) both handled by Expo Notifications
- Target: Google Play Store release 4–6 weeks after iOS full launch

### Web/PWA
- Expo for Web provides lightweight browser experience for trip sharing and route viewing
- Web does not support the full Plan wizard (camera, file uploads are limited) — wizard redirects to "Download the app" prompt on web
- Public trip pages and creator routes are server-rendered via a minimal Next.js shell (Expo for Web + custom `_document`) for SEO/OG meta tags
- URL pattern: `wayfarer.app/trip/:id`, `wayfarer.app/route/:id`, `wayfarer.app/u/:username`
- PWA manifest allows "Add to Home Screen"; no service worker offline support in v1 (future)

---

## 8. AI Enhancements

### Alternative Itinerary Generation
- Step 3 adds a "Show me a different plan" button post-generation
- Calls `generate-itinerary` Edge Function with `variant: true` parameter; GPT-4o instructed to produce meaningfully different venue selection while respecting same interests
- Both variants stored in `itinerary_alternatives` table; user picks one to save

### Budget Mode
- Optional toggle in Step 1: "Budget conscious" / "Standard" / "Luxury"
- GPT-4o prompt adjusted to weight venue recommendations by price tier
- Step 6 (Packing) extended: rough trip cost estimate breakdown (flights, accommodation, food/day, activities) inline with packing list
- `trips.budget_mode` column added

### Smarter Visa Intelligence
- Step 5 enhanced: if user has multiple nationalities in profile, show visa requirements for each
- `users.nationalities[]` replaces single `nationality`
- Edge Function caches visa summaries per `(nationality, destination)` pair for 30 days (shared cache)

### Notification Triggers
- 7 days before trip: "Your trip to X is in one week — check weather forecast"
- 1 day before: "Final checklist reminder" push notification with packing list deep link
- Post-trip (48h after return date): "How was X? Share your trip" prompt
- Implemented via Supabase cron (pg_cron) querying `trips` table nightly; triggers push via Edge Function → Expo Push API

---

## 9. Monetisation — Pro Tier

### Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Trip plans per month | 3 | Unlimited |
| AI itinerary variants | — | Yes |
| Collaboration invites | — | Up to 5 collaborators |
| Trip export (PDF) | — | Yes |
| Budget cost estimates | — | Yes |
| Offline maps | — | Yes (Mapbox offline packs) |
| Creator route publishing | — | Yes |
| Booking link integrations | — | Yes |
| Ad-free | No | Yes |

### Implementation
- RevenueCat manages subscriptions (monthly / annual)
- `users.subscription_tier` column: `free` | `pro`
- Supabase Edge Function webhook from RevenueCat updates `subscription_tier` on payment events
- Feature gates enforced server-side in Edge Functions (check `subscription_tier` on AI calls) and client-side for UI (non-blocking — degrades gracefully with upgrade prompt)
- Price: $7.99/month or $59.99/year

---

## 10. Trip Export

- Pro-only feature: "Export to PDF" button on trip detail view
- Edge Function `export-pdf`: assembles itinerary, packing list, visa summary, and weather snapshot into a formatted PDF using `pdfmake` (Deno-compatible)
- PDF stored temporarily in Supabase Storage (24h signed URL), downloaded via `expo-file-system`
- Share sheet integration: PDF can be AirDropped, emailed, or saved to Files

---

## 11. Extended Data Model

New tables added to the MVP schema (all with RLS):

| Table | Key columns |
|---|---|
| `posts` | `id`, `user_id`, `trip_id`, `caption`, `media_urls` (JSONB), `lat`, `lng`, `destination_name`, `visibility`, `likes_count`, `comments_count`, `created_at` |
| `post_likes` | `post_id`, `user_id`, `created_at` |
| `post_comments` | `id`, `post_id`, `user_id`, `body`, `created_at` |
| `creator_routes` | `id`, `user_id`, `trip_id`, `title`, `summary`, `geojson` (JSONB), `days`, `tags[]`, `published`, `view_count`, `save_count`, `created_at` |
| `community_pins` | `id`, `user_id`, `lat`, `lng`, `name`, `category`, `note`, `photo_url`, `verified`, `created_at` |
| `followers` | `follower_id`, `following_id`, `created_at` |
| `trip_collaborators` | `trip_id`, `user_id`, `role`, `invited_at`, `accepted_at` |
| `itinerary_comments` | `id`, `itinerary_day_id`, `item_index`, `user_id`, `body`, `resolved`, `created_at` |
| `itinerary_alternatives` | `id`, `trip_id`, `day_number`, `items` (JSONB), `created_at` |
| `business_listings` | `id`, `mapbox_poi_id`, `owner_user_id`, `name`, `category`, `description`, `hours` (JSONB), `cover_photo_url`, `booking_url`, `verified`, `avg_rating`, `created_at` |
| `reviews` | `id`, `user_id`, `business_id`, `rating`, `body`, `photo_urls[]`, `trip_id`, `created_at` |
| `notifications` | `id`, `user_id`, `type`, `payload` (JSONB), `read`, `created_at` |

**Modified columns:**
- `users`: add `nationalities[]`, `subscription_tier` (default `free`), `is_public` (default true), `follower_count`, `following_count`
- `trips`: add `budget_mode`, `is_public`, `collaborator_count`

---

## 12. New Edge Functions

| Function | Purpose |
|---|---|
| `generate-itinerary-variant` | Alternative itinerary generation (Pro) |
| `business-sentiment` | NLP keyword extraction for business dashboard |
| `export-pdf` | Assemble and render trip PDF |
| `route-to-geojson` | Convert itinerary JSONB → Mapbox GeoJSON LineString |
| `trip-notifications` | Nightly cron — queue pre/post-trip push notifications |
| `subscription-webhook` | RevenueCat event handler — update `subscription_tier` |
| `booking-links` | Fetch affiliate flight/hotel links from Skyscanner/Booking.com |

---

## 13. Error Handling (additions)

| Scenario | Behaviour |
|---|---|
| Collaboration conflict (concurrent edit) | Last write wins; optimistic UI with toast "Plan updated by [name]" |
| RevenueCat webhook failure | Retry 3× with exponential backoff; subscription stays active if payment confirmed |
| Media upload failure (post/route) | Client retries once; on second failure shows "Upload failed — try again" with local draft preserved |
| PDF generation timeout | Show "Export failed" with retry; PDF request is idempotent |
| Booking API unavailable | Step 7 skipped silently; user sees "Booking links unavailable right now" |
| Business claim verification failure | Show "Verification failed" with manual review request option |

---

## 14. Testing Approach (extended)

| Layer | What |
|---|---|
| Unit | All new Edge Functions (sentiment NLP, PDF export, route-to-GeoJSON, booking-links) |
| Integration | RevenueCat webhook handler; Supabase Realtime collaboration sync |
| Component | Feed post card, creator route overlay, business listing card, collaboration presence indicator |
| Manual E2E | Full Plan wizard (incl. booking step), publish creator route, claim business, export PDF — on device |
| Accessibility | VoiceOver pass on all new screens pre-release |
| Load test | Feed query with 1,000 follows; itinerary real-time sync with 5 concurrent editors |

---

## 15. Phase Roadmap

The full version is delivered in three phases after MVP:

| Phase | Focus | Key Deliverables |
|---|---|---|
| **Phase 2** | Social + Community | Feed (full), following system, trip posts (photo/video), creator routes, community pins |
| **Phase 3** | Collaboration + Business | Real-time itinerary co-editing, business listings, claim flow, sentiment dashboard, reviews |
| **Phase 4** | Platform + Monetisation | Android, Web/PWA, Pro tier (RevenueCat), PDF export, booking links, AI budget mode, notifications |

---

## 16. Success Criteria (Full Version)

- Feed loads and renders posts from followed users in <1.5s
- Creator route polylines render on Explore map within 500ms of toggle
- Real-time collaboration sync latency <500ms for itinerary edits
- Business claim verified and listing live within 24h of owner submission
- PDF export generated and downloadable in <15s
- RevenueCat subscription status correctly reflected in app within 30s of payment
- App live on Google Play Store (Android)
- Public trip/route pages indexed by Google (Web/PWA)

---

## 17. Out of Scope (deferred post-full-version)

- AI trip re-planning mid-trip (location-aware re-routing)
- Group video calls within shared itinerary
- Wayfarer-native flight/hotel booking (vs. affiliate links)
- Live trip sharing (broadcast location to followers during travel)
- Marketplace for creator route monetisation
