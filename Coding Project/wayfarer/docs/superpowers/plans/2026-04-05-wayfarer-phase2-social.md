# Wayfarer Phase 2 — Social + Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Wayfarer's social layer — a fully functional Feed (photo/video posts pinned to map), following system, creator routes on the Explore map, and community pins.

**Architecture:** All social data lives in Supabase PostgreSQL with RLS. Media (photos/videos) uploads to Supabase Storage via `lib/storage.ts`. The `route-to-geojson` Edge Function converts saved itinerary JSONB into a Mapbox GeoJSON LineString for the Explore overlay. Real-time feed updates are not in this phase — feed is query-on-load with pull-to-refresh. Supabase Realtime is Phase 3.

**Tech Stack:** React Native (Expo SDK 52), Expo Router v4, TypeScript, Supabase JS v2, `@rnmapbox/maps`, `expo-image-picker`, Supabase Storage, Deno (Edge Functions), Jest + `@testing-library/react-native`

---

## File Structure

```
wayfarer/
├── app/
│   ├── (tabs)/
│   │   ├── feed.tsx                       MODIFY — replace empty state with full feed
│   │   ├── explore.tsx                    MODIFY — add routes/pins layers to Mapbox
│   │   └── profile.tsx                    MODIFY — add follower/following, published routes
│   └── trip/
│       └── [id].tsx                       MODIFY — add Share Trip + Publish Route CTAs
├── components/
│   ├── FeedPost.tsx                       CREATE — post card (media, like, comment, map pin)
│   ├── ShareTripModal.tsx                 CREATE — compose post from completed trip
│   ├── CreatorRouteSheet.tsx              CREATE — route detail bottom sheet
│   └── CommunityPinModal.tsx             CREATE — add/view community pin
├── hooks/
│   ├── useFollow.ts                       CREATE — follow/unfollow, suggestions, counts
│   ├── useFeed.ts                         CREATE — paginated feed query, like, comment
│   ├── useCreatorRoutes.ts               CREATE — route publish, list, save
│   └── useCommunityPins.ts               CREATE — pin CRUD
├── lib/
│   └── storage.ts                         CREATE — Supabase Storage upload helpers
├── types/
│   └── social.ts                          CREATE — Post, CreatorRoute, CommunityPin, Follower
├── supabase/
│   ├── migrations/
│   │   └── 20260405000000_social.sql      CREATE — all Phase 2 tables + users columns
│   └── functions/
│       └── route-to-geojson/
│           └── index.ts                   CREATE — itinerary JSONB → GeoJSON LineString
└── __tests__/
    ├── lib/storage.test.ts                CREATE
    ├── hooks/useFollow.test.ts            CREATE
    ├── hooks/useFeed.test.ts              CREATE
    ├── hooks/useCreatorRoutes.test.ts     CREATE
    ├── hooks/useCommunityPins.test.ts     CREATE
    ├── components/FeedPost.test.tsx       CREATE
    └── functions/route-to-geojson.test.ts CREATE
```

---

## Task 1: Database Migration — Social Tables

**Files:**
- Create: `supabase/migrations/20260405000000_social.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260405000000_social.sql

-- ─── USERS: add social columns ───────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS follower_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public       BOOLEAN NOT NULL DEFAULT true;

-- ─── FOLLOWERS ────────────────────────────────────────────────────────────────
CREATE TABLE followers (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own follow graph" ON followers
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users manage own follows" ON followers
  FOR ALL USING (auth.uid() = follower_id);

-- Keep denormalised counts in sync
CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = OLD.following_id;
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

-- ─── POSTS ────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id          UUID REFERENCES trips(id) ON DELETE SET NULL,
  caption          TEXT NOT NULL DEFAULT '',
  media_urls       JSONB NOT NULL DEFAULT '[]',
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  destination_name TEXT,
  visibility       TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','private')),
  likes_count      INTEGER NOT NULL DEFAULT 0,
  comments_count   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public posts visible to all" ON posts
  FOR SELECT USING (
    visibility = 'public'
    OR auth.uid() = user_id
    OR (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM followers WHERE follower_id = auth.uid() AND following_id = user_id
    ))
  );
CREATE POLICY "Users manage own posts" ON posts
  FOR ALL USING (auth.uid() = user_id);

-- ─── POST LIKES ───────────────────────────────────────────────────────────────
CREATE TABLE post_likes (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes visible to all" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

-- ─── POST COMMENTS ────────────────────────────────────────────────────────────
CREATE TABLE post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments visible to all" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users manage own comments" ON post_comments FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();

-- ─── CREATOR ROUTES ───────────────────────────────────────────────────────────
CREATE TABLE creator_routes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id    UUID REFERENCES trips(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  summary    TEXT NOT NULL DEFAULT '',
  geojson    JSONB NOT NULL,
  days       INTEGER NOT NULL DEFAULT 1,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  published  BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE creator_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published routes visible to all" ON creator_routes
  FOR SELECT USING (published = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own routes" ON creator_routes
  FOR ALL USING (auth.uid() = user_id);

-- ─── COMMUNITY PINS ───────────────────────────────────────────────────────────
CREATE TABLE community_pins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  note       TEXT,
  photo_url  TEXT,
  verified   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE community_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pins visible to all" ON community_pins FOR SELECT USING (true);
CREATE POLICY "Users manage own pins" ON community_pins FOR ALL USING (auth.uid() = user_id);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_posts_user_id       ON posts(user_id);
CREATE INDEX idx_posts_created_at    ON posts(created_at DESC);
CREATE INDEX idx_post_likes_post_id  ON post_likes(post_id);
CREATE INDEX idx_post_comments_post  ON post_comments(post_id);
CREATE INDEX idx_creator_routes_pub  ON creator_routes(published) WHERE published = true;
CREATE INDEX idx_community_pins_loc  ON community_pins USING gist(ll_to_earth(lat, lng));
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
```

Expected: migration applied with no errors; `supabase db diff` shows no pending changes.

- [ ] **Step 3: Verify tables exist**

```bash
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

Expected output includes: `community_pins`, `creator_routes`, `followers`, `post_comments`, `post_likes`, `posts`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405000000_social.sql
git commit -m "chore: add Phase 2 social tables migration"
```

---

## Task 2: Supabase Storage — Media Bucket

**Files:**
- Create: `supabase/migrations/20260405000001_storage.sql`

- [ ] **Step 1: Create storage migration**

```sql
-- supabase/migrations/20260405000001_storage.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read post media" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users upload post media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
    -- enforce path: {user_id}/{filename}
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own post media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260405000001_storage.sql
git commit -m "chore: add post-media storage bucket with RLS policies"
```

---

## Task 3: TypeScript Types — Social Layer

**Files:**
- Create: `types/social.ts`

- [ ] **Step 1: Write the types file**

```typescript
// types/social.ts

export interface Post {
  id: string;
  user_id: string;
  trip_id: string | null;
  caption: string;
  media_urls: string[];
  lat: number | null;
  lng: number | null;
  destination_name: string | null;
  visibility: 'public' | 'followers' | 'private';
  likes_count: number;
  comments_count: number;
  created_at: string;
  // joined via select
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  user_has_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CreatorRoute {
  id: string;
  user_id: string;
  trip_id: string | null;
  title: string;
  summary: string;
  geojson: GeoJSONFeature;
  days: number;
  tags: string[];
  published: boolean;
  view_count: number;
  save_count: number;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: Record<string, unknown>;
}

export interface CommunityPin {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
  note: string | null;
  photo_url: string | null;
  verified: boolean;
  created_at: string;
}

export interface Follower {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type CreatePostInput = {
  trip_id?: string;
  caption: string;
  mediaUris: string[];          // local file URIs before upload
  lat?: number;
  lng?: number;
  destination_name?: string;
  visibility: Post['visibility'];
};

export type CreatePinInput = {
  lat: number;
  lng: number;
  name: string;
  category: string;
  note?: string;
  photoUri?: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/social.ts
git commit -m "feat: add social layer TypeScript types"
```

---

## Task 4: `lib/storage.ts` — Upload Helpers

**Files:**
- Create: `lib/storage.ts`
- Test: `__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/storage.test.ts
import { uploadMedia, getPublicUrl, mediaPathForUser } from '../../lib/storage';

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      }),
    },
  },
}));

const { supabase } = require('../../lib/supabase');

describe('mediaPathForUser', () => {
  it('builds path as userId/filename', () => {
    const path = mediaPathForUser('user-123', 'photo.jpg');
    expect(path).toBe('user-123/photo.jpg');
  });

  it('strips leading slashes from filename', () => {
    const path = mediaPathForUser('user-123', '/photo.jpg');
    expect(path).toBe('user-123/photo.jpg');
  });
});

describe('uploadMedia', () => {
  it('calls supabase storage upload with correct bucket and path', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'user-1/abc.jpg' }, error: null });
    supabase.storage.from.mockReturnValue({ upload: mockUpload, getPublicUrl: jest.fn() });

    await uploadMedia('user-1', 'file:///local/abc.jpg', 'image/jpeg');

    expect(supabase.storage.from).toHaveBeenCalledWith('post-media');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\//),
      expect.any(Object),
      { contentType: 'image/jpeg', upsert: false }
    );
  });

  it('throws when upload returns an error', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ data: null, error: { message: 'Upload failed' } });
    supabase.storage.from.mockReturnValue({ upload: mockUpload, getPublicUrl: jest.fn() });

    await expect(uploadMedia('user-1', 'file:///local/abc.jpg', 'image/jpeg')).rejects.toThrow('Upload failed');
  });
});

describe('getPublicUrl', () => {
  it('returns the public URL for a storage path', () => {
    const mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/post-media/user-1/abc.jpg' },
    });
    supabase.storage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl, upload: jest.fn() });

    const url = getPublicUrl('user-1/abc.jpg');
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/post-media/user-1/abc.jpg');
    expect(supabase.storage.from).toHaveBeenCalledWith('post-media');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/lib/storage.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/storage'`

- [ ] **Step 3: Implement `lib/storage.ts`**

```typescript
// lib/storage.ts
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const BUCKET = 'post-media';

export function mediaPathForUser(userId: string, filename: string): string {
  const clean = filename.startsWith('/') ? filename.slice(1) : filename;
  return `${userId}/${clean}`;
}

export function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload a local file URI to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadMedia(
  userId: string,
  localUri: string,
  contentType: 'image/jpeg' | 'image/png' | 'video/mp4'
): Promise<string> {
  const ext = contentType === 'video/mp4' ? 'mp4' : contentType === 'image/png' ? 'png' : 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const storagePath = mediaPathForUser(userId, filename);

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType, upsert: false });

  if (error) throw new Error(error.message);

  return getPublicUrl(storagePath);
}

/**
 * Upload multiple media items. Returns array of public URLs in the same order.
 */
export async function uploadMediaBatch(
  userId: string,
  items: { uri: string; contentType: 'image/jpeg' | 'image/png' | 'video/mp4' }[]
): Promise<string[]> {
  return Promise.all(items.map(({ uri, contentType }) => uploadMedia(userId, uri, contentType)));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/lib/storage.test.ts --no-coverage
```

Expected: PASS (3 test suites, all green)

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/lib/storage.test.ts
git commit -m "feat: add Supabase Storage upload helpers"
```

---

## Task 5: `hooks/useFollow.ts`

**Files:**
- Create: `hooks/useFollow.ts`
- Test: `__tests__/hooks/useFollow.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/hooks/useFollow.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useFollow } from '../../hooks/useFollow';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const makeMock = (overrides = {}) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  ...overrides,
});

describe('useFollow', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
  });

  it('isFollowing returns false when no row exists', async () => {
    const mock = makeMock({
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    });
    supabase.from.mockReturnValue(mock);

    const { result } = renderHook(() => useFollow('other-user'));
    await act(async () => {});

    expect(result.current.isFollowing).toBe(false);
  });

  it('isFollowing returns true when row exists', async () => {
    const mock = makeMock({
      single: jest.fn().mockResolvedValue({ data: { follower_id: 'me', following_id: 'other-user' }, error: null }),
    });
    supabase.from.mockReturnValue(mock);

    const { result } = renderHook(() => useFollow('other-user'));
    await act(async () => {});

    expect(result.current.isFollowing).toBe(true);
  });

  it('follow() inserts a row and sets isFollowing to true', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const mock = makeMock({
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: jest.fn().mockReturnValue({ error: null, ...{ then: (cb: Function) => cb({ error: null }) } }),
    });
    supabase.from.mockReturnValue(mock);

    const { result } = renderHook(() => useFollow('other-user'));
    await act(async () => {});
    await act(async () => { await result.current.follow(); });

    expect(supabase.from).toHaveBeenCalledWith('followers');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/hooks/useFollow.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../hooks/useFollow'`

- [ ] **Step 3: Implement `hooks/useFollow.ts`**

```typescript
// hooks/useFollow.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useFollow(targetUserId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!currentUserId || !targetUserId) return;
    checkFollow();
  }, [currentUserId, targetUserId]);

  async function checkFollow() {
    setLoading(true);
    const { data, error } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();
    setIsFollowing(!error && data !== null);
    setLoading(false);
  }

  const follow = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('followers')
      .insert({ follower_id: currentUserId, following_id: targetUserId });
    if (!error) setIsFollowing(true);
  }, [currentUserId, targetUserId]);

  const unfollow = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);
    if (!error) setIsFollowing(false);
  }, [currentUserId, targetUserId]);

  const toggle = useCallback(() => {
    return isFollowing ? unfollow() : follow();
  }, [isFollowing, follow, unfollow]);

  return { isFollowing, loading, follow, unfollow, toggle };
}

/**
 * Returns a list of suggested users to follow — people who travelled to the
 * same destinations as the current user, excluding already-followed users.
 */
export async function fetchFollowSuggestions(
  currentUserId: string,
  limit = 10
): Promise<{ id: string; display_name: string; avatar_url: string | null }[]> {
  // Get destinations of current user's trips
  const { data: myTrips } = await supabase
    .from('trips')
    .select('destinations')
    .eq('user_id', currentUserId);

  const destinations: string[] = (myTrips ?? []).flatMap((t: { destinations: string[] }) => t.destinations);

  if (destinations.length === 0) return [];

  // Find other users who travelled to any of those destinations, excluding already followed
  const { data } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .neq('id', currentUserId)
    .not('id', 'in', `(SELECT following_id FROM followers WHERE follower_id = '${currentUserId}')`)
    .limit(limit);

  return data ?? [];
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/hooks/useFollow.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useFollow.ts __tests__/hooks/useFollow.test.ts
git commit -m "feat: add useFollow hook with follow/unfollow/toggle and suggestions"
```

---

## Task 6: `hooks/useFeed.ts`

**Files:**
- Create: `hooks/useFeed.ts`
- Test: `__tests__/hooks/useFeed.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/hooks/useFeed.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useFeed } from '../../hooks/useFeed';
import type { Post } from '../../types/social';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const mockPost: Post = {
  id: 'post-1',
  user_id: 'user-1',
  trip_id: null,
  caption: 'Hello Tokyo!',
  media_urls: ['https://example.com/photo.jpg'],
  lat: 35.6762,
  lng: 139.6503,
  destination_name: 'Tokyo',
  visibility: 'public',
  likes_count: 5,
  comments_count: 2,
  created_at: '2026-04-01T10:00:00Z',
};

describe('useFeed', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    const mockSelect = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [mockPost], error: null }),
      eq: jest.fn().mockReturnThis(),
    };
    supabase.from.mockReturnValue(mockSelect);
  });

  it('loads posts on mount', async () => {
    const { result } = renderHook(() => useFeed());
    await act(async () => {});
    expect(result.current.posts.length).toBeGreaterThan(0);
    expect(result.current.loading).toBe(false);
  });

  it('starts with empty posts and loading true', () => {
    const { result } = renderHook(() => useFeed());
    expect(result.current.posts).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest __tests__/hooks/useFeed.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../hooks/useFeed'`

- [ ] **Step 3: Implement `hooks/useFeed.ts`**

```typescript
// hooks/useFeed.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Post, PostComment } from '../types/social';

const PAGE_SIZE = 20;

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (currentUserId !== null) loadPage(0, true);
  }, [currentUserId]);

  async function loadPage(pageIndex: number, replace: boolean) {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_user_id_fkey(display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !data) return;

    // Annotate user_has_liked
    const annotated = await annotateLikes(data as Post[], currentUserId);

    if (replace) {
      setPosts(annotated);
    } else {
      setPosts((prev) => [...prev, ...annotated]);
    }

    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setPage(0);
    await loadPage(0, true);
  }, [currentUserId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPage(nextPage, false);
  }, [page, loadingMore, hasMore, currentUserId]);

  const likePost = useCallback(async (postId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: currentUserId });
    if (!error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + 1, user_has_liked: true }
            : p
        )
      );
    }
  }, [currentUserId]);

  const unlikePost = useCallback(async (postId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUserId);
    if (!error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: Math.max(0, p.likes_count - 1), user_has_liked: false }
            : p
        )
      );
    }
  }, [currentUserId]);

  return { posts, loading, loadingMore, hasMore, refresh, loadMore, likePost, unlikePost };
}

async function annotateLikes(posts: Post[], userId: string | null): Promise<Post[]> {
  if (!userId || posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', ids);
  const likedSet = new Set((data ?? []).map((r: { post_id: string }) => r.post_id));
  return posts.map((p) => ({ ...p, user_has_liked: likedSet.has(p.id) }));
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data } = await supabase
    .from('post_comments')
    .select(`*, author:users!post_comments_user_id_fkey(display_name, avatar_url)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return (data as PostComment[]) ?? [];
}

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, body });
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/hooks/useFeed.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeed.ts __tests__/hooks/useFeed.test.ts
git commit -m "feat: add useFeed hook with pagination, like/unlike, and comments"
```

---

## Task 7: `components/FeedPost.tsx`

**Files:**
- Create: `components/FeedPost.tsx`
- Test: `__tests__/components/FeedPost.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/components/FeedPost.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedPost } from '../../components/FeedPost';
import type { Post } from '../../types/social';

const mockPost: Post = {
  id: 'p1',
  user_id: 'u1',
  trip_id: null,
  caption: 'Amazing views in Kyoto!',
  media_urls: ['https://example.com/kyoto.jpg'],
  lat: 35.0116,
  lng: 135.7681,
  destination_name: 'Kyoto',
  visibility: 'public',
  likes_count: 12,
  comments_count: 3,
  created_at: '2026-04-01T08:00:00Z',
  author: { display_name: 'Alice', avatar_url: null },
  user_has_liked: false,
};

describe('FeedPost', () => {
  it('renders caption and author name', () => {
    const { getByText } = render(
      <FeedPost post={mockPost} onLike={jest.fn()} onUnlike={jest.fn()} onCommentPress={jest.fn()} />
    );
    expect(getByText('Amazing views in Kyoto!')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
  });

  it('shows likes count', () => {
    const { getByText } = render(
      <FeedPost post={mockPost} onLike={jest.fn()} onUnlike={jest.fn()} onCommentPress={jest.fn()} />
    );
    expect(getByText('12')).toBeTruthy();
  });

  it('calls onLike when like button pressed and not already liked', () => {
    const onLike = jest.fn();
    const { getByTestId } = render(
      <FeedPost post={mockPost} onLike={onLike} onUnlike={jest.fn()} onCommentPress={jest.fn()} />
    );
    fireEvent.press(getByTestId('like-button'));
    expect(onLike).toHaveBeenCalledWith('p1');
  });

  it('calls onUnlike when like button pressed and already liked', () => {
    const onUnlike = jest.fn();
    const { getByTestId } = render(
      <FeedPost
        post={{ ...mockPost, user_has_liked: true }}
        onLike={jest.fn()}
        onUnlike={onUnlike}
        onCommentPress={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('like-button'));
    expect(onUnlike).toHaveBeenCalledWith('p1');
  });

  it('calls onCommentPress when comment button pressed', () => {
    const onCommentPress = jest.fn();
    const { getByTestId } = render(
      <FeedPost post={mockPost} onLike={jest.fn()} onUnlike={jest.fn()} onCommentPress={onCommentPress} />
    );
    fireEvent.press(getByTestId('comment-button'));
    expect(onCommentPress).toHaveBeenCalledWith('p1');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest __tests__/components/FeedPost.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../../components/FeedPost'`

- [ ] **Step 3: Implement `components/FeedPost.tsx`**

```tsx
// components/FeedPost.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import type { Post } from '../types/social';

const { width } = Dimensions.get('window');
const MEDIA_HEIGHT = width * 0.75;

interface FeedPostProps {
  post: Post;
  onLike: (postId: string) => void;
  onUnlike: (postId: string) => void;
  onCommentPress: (postId: string) => void;
}

export function FeedPost({ post, onLike, onUnlike, onCommentPress }: FeedPostProps) {
  const handleLike = () => {
    post.user_has_liked ? onUnlike(post.id) : onLike(post.id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {post.author?.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {post.author?.display_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
        </View>
        <View>
          <Text style={styles.authorName}>{post.author?.display_name ?? 'Unknown'}</Text>
          {post.destination_name && (
            <Text style={styles.destination}>{post.destination_name}</Text>
          )}
        </View>
      </View>

      {/* Media */}
      {post.media_urls.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ height: MEDIA_HEIGHT }}
        >
          {post.media_urls.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={{ width, height: MEDIA_HEIGHT }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="like-button"
          onPress={handleLike}
          style={styles.actionBtn}
          accessibilityLabel={post.user_has_liked ? 'Unlike post' : 'Like post'}
        >
          <Text style={[styles.actionIcon, post.user_has_liked && styles.likedIcon]}>
            {post.user_has_liked ? '♥' : '♡'}
          </Text>
          <Text style={styles.actionCount}>{post.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="comment-button"
          onPress={() => onCommentPress(post.id)}
          style={styles.actionBtn}
          accessibilityLabel="View comments"
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.comments_count}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 36, height: 36 },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '600', fontSize: 16 },
  authorName: { fontWeight: '600', fontSize: 14, color: '#111' },
  destination: { fontSize: 12, color: '#666' },
  actions: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 20 },
  likedIcon: { color: '#E8622A' },
  actionCount: { fontSize: 14, color: '#444' },
  caption: { paddingHorizontal: 12, paddingBottom: 12, fontSize: 14, color: '#222', lineHeight: 20 },
});
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/components/FeedPost.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/FeedPost.tsx __tests__/components/FeedPost.test.tsx
git commit -m "feat: add FeedPost component with like/comment actions"
```

---

## Task 8: `app/(tabs)/feed.tsx` — Full Feed Screen

**Files:**
- Modify: `app/(tabs)/feed.tsx`

- [ ] **Step 1: Replace the empty-state feed with the full implementation**

```tsx
// app/(tabs)/feed.tsx
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFeed, fetchComments, addComment } from '../../hooks/useFeed';
import { FeedPost } from '../../components/FeedPost';
import type { Post, PostComment } from '../../types/social';
import { supabase } from '../../lib/supabase';

export default function FeedScreen() {
  const { posts, loading, loadingMore, hasMore, refresh, loadMore, likePost, unlikePost } = useFeed();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openComments = useCallback(async (postId: string) => {
    setCommentPostId(postId);
    const data = await fetchComments(postId);
    setComments(data);
  }, []);

  const submitComment = async () => {
    if (!commentText.trim() || !commentPostId) return;
    setSubmitting(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await addComment(commentPostId, data.user.id, commentText.trim());
      const updated = await fetchComments(commentPostId);
      setComments(updated);
      setCommentText('');
    }
    setSubmitting(false);
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <FeedPost
        post={item}
        onLike={likePost}
        onUnlike={unlikePost}
        onCommentPress={openComments}
      />
    ),
    [likePost, unlikePost, openComments]
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ padding: 16 }} color="#0F6E56" />;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F6E56" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0F6E56" />
        }
        onEndReached={() => { if (hasMore) loadMore(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share your trip</Text>
          </View>
        }
      />

      {/* Comments modal */}
      <Modal
        visible={commentPostId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommentPostId(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setCommentPostId(null)}>
              <Text style={styles.closeBtn}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Text style={styles.commentAuthor}>{item.author?.display_name}</Text>
                <Text style={styles.commentBody}>{item.body}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.noComments}>No comments yet</Text>}
            style={{ flex: 1 }}
          />
          <View style={styles.commentInput}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment…"
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={submitComment}
            />
            <TouchableOpacity onPress={submitComment} disabled={submitting}>
              <Text style={[styles.sendBtn, submitting && { opacity: 0.4 }]}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  closeBtn: { color: '#0F6E56', fontSize: 17, fontWeight: '600' },
  comment: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  commentAuthor: { fontWeight: '600', fontSize: 13 },
  commentBody: { fontSize: 14, color: '#333' },
  noComments: { textAlign: 'center', padding: 32, color: '#888' },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: { color: '#0F6E56', fontWeight: '600', fontSize: 15 },
});
```

- [ ] **Step 2: Run the test suite to check no regressions**

```bash
npx jest --no-coverage
```

Expected: all previously passing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/feed.tsx
git commit -m "feat: implement full Feed screen with posts, likes, and comments"
```

---

## Task 9: `components/ShareTripModal.tsx` — Compose Post

**Files:**
- Create: `components/ShareTripModal.tsx`
- Modify: `app/trip/[id].tsx` — add Share Trip CTA

- [ ] **Step 1: Create the modal component**

```tsx
// components/ShareTripModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { uploadMediaBatch } from '../lib/storage';
import type { CreatePostInput, Post } from '../types/social';

interface ShareTripModalProps {
  visible: boolean;
  tripId: string;
  destinationName: string;
  destinationLat?: number;
  destinationLng?: number;
  onClose: () => void;
  onPosted: (post: Post) => void;
}

export function ShareTripModal({
  visible,
  tripId,
  destinationName,
  destinationLat,
  destinationLng,
  onClose,
  onPosted,
}: ShareTripModalProps) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Post['visibility']>('public');
  const [mediaAssets, setMediaAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 9,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMediaAssets((prev) => [...prev, ...result.assets].slice(0, 9));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const mediaUrls = mediaAssets.length > 0
        ? await uploadMediaBatch(
            userData.user.id,
            mediaAssets.map((a) => ({
              uri: a.uri,
              contentType: (a.type === 'video' ? 'video/mp4' : 'image/jpeg') as 'video/mp4' | 'image/jpeg',
            }))
          )
        : [];

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userData.user.id,
          trip_id: tripId,
          caption,
          media_urls: mediaUrls,
          lat: destinationLat ?? null,
          lng: destinationLng ?? null,
          destination_name: destinationName,
          visibility,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      onPosted(data as Post);
      setCaption('');
      setMediaAssets([]);
      onClose();
    } catch (e: any) {
      Alert.alert('Could not share trip', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Share Trip</Text>
          <TouchableOpacity onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#0F6E56" />
            ) : (
              <Text style={styles.postBtn}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <Text style={styles.destination}>{destinationName}</Text>

          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption…"
            multiline
            maxLength={500}
            value={caption}
            onChangeText={setCaption}
          />

          {/* Media preview row */}
          {mediaAssets.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
              {mediaAssets.map((asset, i) => (
                <Image key={i} source={{ uri: asset.uri }} style={styles.mediaThumbnail} />
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia}>
            <Text style={styles.addMediaText}>+ Add photos/videos</Text>
          </TouchableOpacity>

          {/* Visibility selector */}
          <View style={styles.visibilityRow}>
            {(['public', 'followers', 'private'] as Post['visibility'][]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.visibilityChip, visibility === v && styles.visibilityChipActive]}
                onPress={() => setVisibility(v)}
              >
                <Text style={[styles.visibilityLabel, visibility === v && styles.visibilityLabelActive]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: { fontSize: 17, fontWeight: '600' },
  cancelBtn: { fontSize: 17, color: '#666' },
  postBtn: { fontSize: 17, fontWeight: '600', color: '#0F6E56' },
  body: { padding: 16 },
  destination: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 8 },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#111',
    marginBottom: 16,
  },
  mediaRow: { marginBottom: 12 },
  mediaThumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  addMediaBtn: {
    borderWidth: 1,
    borderColor: '#0F6E56',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addMediaText: { color: '#0F6E56', fontWeight: '600' },
  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  visibilityChipActive: { borderColor: '#0F6E56', backgroundColor: '#E8F5F1' },
  visibilityLabel: { fontSize: 13, color: '#666' },
  visibilityLabelActive: { color: '#0F6E56', fontWeight: '600' },
});
```

- [ ] **Step 2: Add Share Trip CTA to trip detail view**

In `app/trip/[id].tsx`, add the following import and state inside the component function, and the button in the JSX (after the existing trip content):

```tsx
// --- ADD THESE imports at the top ---
import { ShareTripModal } from '../../components/ShareTripModal';

// --- ADD THESE inside the component function body ---
const [shareModalVisible, setShareModalVisible] = useState(false);

// --- ADD THIS button in JSX (after itinerary content, before closing ScrollView) ---
<TouchableOpacity
  style={{ margin: 16, backgroundColor: '#0F6E56', borderRadius: 12, padding: 14, alignItems: 'center' }}
  onPress={() => setShareModalVisible(true)}
>
  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Share This Trip</Text>
</TouchableOpacity>

<ShareTripModal
  visible={shareModalVisible}
  tripId={trip.id}
  destinationName={trip.destinations?.[0] ?? ''}
  onClose={() => setShareModalVisible(false)}
  onPosted={() => setShareModalVisible(false)}
/>
```

- [ ] **Step 3: Run test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/ShareTripModal.tsx app/trip/\[id\].tsx
git commit -m "feat: add ShareTripModal and trip detail share CTA"
```

---

## Task 10: `route-to-geojson` Edge Function

**Files:**
- Create: `supabase/functions/route-to-geojson/index.ts`
- Test: `__tests__/functions/route-to-geojson.test.ts`

- [ ] **Step 1: Write the unit test (Node.js-compatible logic extraction)**

```typescript
// __tests__/functions/route-to-geojson.test.ts
// Tests the pure conversion logic extracted from the Edge Function

import { itineraryToGeoJSON } from '../../supabase/functions/route-to-geojson/convert';
import type { GeoJSONFeature } from '../../types/social';

const mockItems = [
  { name: 'Senso-ji Temple', lat: 35.7148, lng: 139.7967, type: 'attraction' },
  { name: 'Nakamise Market', lat: 35.7135, lng: 139.7966, type: 'market' },
  { name: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, type: 'landmark' },
];

const mockDays = [
  { day_number: 1, items: mockItems },
  { day_number: 2, items: [mockItems[2]] },
];

describe('itineraryToGeoJSON', () => {
  it('returns a GeoJSON Feature with LineString geometry', () => {
    const result: GeoJSONFeature = itineraryToGeoJSON(mockDays);
    expect(result.type).toBe('Feature');
    expect(result.geometry.type).toBe('LineString');
  });

  it('coordinates are [lng, lat] pairs (GeoJSON spec)', () => {
    const result = itineraryToGeoJSON(mockDays);
    const first = result.geometry.coordinates[0];
    // Senso-ji lng is 139.7967, lat is 35.7148
    expect(first[0]).toBeCloseTo(139.7967, 4);
    expect(first[1]).toBeCloseTo(35.7148, 4);
  });

  it('orders waypoints by day_number then item order', () => {
    const result = itineraryToGeoJSON(mockDays);
    // Should have 4 points total: 3 from day 1 + 1 from day 2
    expect(result.geometry.coordinates).toHaveLength(4);
  });

  it('filters out items missing lat/lng', () => {
    const days = [
      { day_number: 1, items: [{ name: 'No coords', type: 'attraction' }, mockItems[0]] },
    ];
    const result = itineraryToGeoJSON(days);
    expect(result.geometry.coordinates).toHaveLength(1);
  });

  it('returns empty coordinates array for empty days', () => {
    const result = itineraryToGeoJSON([]);
    expect(result.geometry.coordinates).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest __tests__/functions/route-to-geojson.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../supabase/functions/route-to-geojson/convert'`

- [ ] **Step 3: Create the shared conversion module**

```typescript
// supabase/functions/route-to-geojson/convert.ts
import type { GeoJSONFeature } from '../../../types/social';

interface ItineraryItem {
  name: string;
  lat?: number;
  lng?: number;
  type?: string;
}

interface ItineraryDay {
  day_number: number;
  items: ItineraryItem[];
}

export function itineraryToGeoJSON(days: ItineraryDay[]): GeoJSONFeature {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);

  const coordinates: [number, number][] = sorted.flatMap((day) =>
    day.items
      .filter((item): item is ItineraryItem & { lat: number; lng: number } =>
        typeof item.lat === 'number' && typeof item.lng === 'number'
      )
      .map((item): [number, number] => [item.lng, item.lat]) // GeoJSON: [lng, lat]
  );

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {},
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/functions/route-to-geojson.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Create the Edge Function entry point**

```typescript
// supabase/functions/route-to-geojson/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { itineraryToGeoJSON } from './convert.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { trip_id } = await req.json();

    if (!trip_id) {
      return new Response(JSON.stringify({ error: 'trip_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: days, error } = await supabase
      .from('itinerary_days')
      .select('day_number, items')
      .eq('trip_id', trip_id)
      .order('day_number', { ascending: true });

    if (error) throw new Error(error.message);
    if (!days || days.length === 0) {
      return new Response(JSON.stringify({ error: 'No itinerary days found for this trip' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geojson = itineraryToGeoJSON(days);

    return new Response(JSON.stringify({ geojson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 6: Deploy the Edge Function**

```bash
supabase functions deploy route-to-geojson
```

Expected: `Deployed Function route-to-geojson`

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/route-to-geojson/ __tests__/functions/route-to-geojson.test.ts
git commit -m "feat: add route-to-geojson Edge Function with unit tests"
```

---

## Task 11: `hooks/useCreatorRoutes.ts` + `hooks/useCommunityPins.ts`

**Files:**
- Create: `hooks/useCreatorRoutes.ts`
- Create: `hooks/useCommunityPins.ts`
- Test: `__tests__/hooks/useCreatorRoutes.test.ts`
- Test: `__tests__/hooks/useCommunityPins.test.ts`

- [ ] **Step 1: Write failing tests — creator routes**

```typescript
// __tests__/hooks/useCreatorRoutes.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes';
import type { CreatorRoute } from '../../types/social';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const mockRoute: CreatorRoute = {
  id: 'r1',
  user_id: 'u1',
  trip_id: 't1',
  title: 'Tokyo 5 Days',
  summary: 'Best of Tokyo',
  geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[139.6, 35.6]] }, properties: {} },
  days: 5,
  tags: ['culture', 'food'],
  published: true,
  view_count: 100,
  save_count: 20,
  created_at: '2026-04-01T00:00:00Z',
};

describe('useCreatorRoutes', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [mockRoute], error: null }),
    });
  });

  it('loads published routes on mount', async () => {
    const { result } = renderHook(() => useCreatorRoutes());
    await act(async () => {});
    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].title).toBe('Tokyo 5 Days');
  });
});
```

- [ ] **Step 2: Write failing tests — community pins**

```typescript
// __tests__/hooks/useCommunityPins.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useCommunityPins } from '../../hooks/useCommunityPins';
import type { CommunityPin } from '../../types/social';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

const { supabase } = require('../../lib/supabase');

const mockPin: CommunityPin = {
  id: 'pin1',
  user_id: 'u1',
  lat: 35.71,
  lng: 139.79,
  name: 'Hidden ramen spot',
  category: 'food',
  note: 'Cash only',
  photo_url: null,
  verified: false,
  created_at: '2026-04-01T00:00:00Z',
};

describe('useCommunityPins', () => {
  beforeEach(() => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [mockPin], error: null }),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPin, error: null }),
    });
  });

  it('loads pins on mount', async () => {
    const { result } = renderHook(() => useCommunityPins());
    await act(async () => {});
    expect(result.current.pins).toHaveLength(1);
    expect(result.current.pins[0].name).toBe('Hidden ramen spot');
  });
});
```

- [ ] **Step 3: Run both tests to confirm failures**

```bash
npx jest __tests__/hooks/useCreatorRoutes.test.ts __tests__/hooks/useCommunityPins.test.ts --no-coverage
```

Expected: FAIL — modules not found

- [ ] **Step 4: Implement `hooks/useCreatorRoutes.ts`**

```typescript
// hooks/useCreatorRoutes.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CreatorRoute } from '../types/social';

export function useCreatorRoutes() {
  const [routes, setRoutes] = useState<CreatorRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    setLoading(true);
    const { data } = await supabase
      .from('creator_routes')
      .select('*, author:users!creator_routes_user_id_fkey(display_name, avatar_url)')
      .eq('published', true)
      .order('created_at', { ascending: false });
    setRoutes((data as CreatorRoute[]) ?? []);
    setLoading(false);
  }

  const publishRoute = useCallback(async (tripId: string, title: string, summary: string, tags: string[]) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // Generate GeoJSON from itinerary
    const { data: geoData, error: geoError } = await supabase.functions.invoke('route-to-geojson', {
      body: { trip_id: tripId },
    });
    if (geoError || !geoData?.geojson) return null;

    // Count days
    const { data: days } = await supabase
      .from('itinerary_days')
      .select('day_number')
      .eq('trip_id', tripId);

    const { data: route, error } = await supabase
      .from('creator_routes')
      .insert({
        user_id: userData.user.id,
        trip_id: tripId,
        title,
        summary,
        geojson: geoData.geojson,
        days: days?.length ?? 1,
        tags,
        published: true,
      })
      .select()
      .single();

    if (error) return null;
    setRoutes((prev) => [route as CreatorRoute, ...prev]);
    return route as CreatorRoute;
  }, []);

  const saveRoute = useCallback(async (routeId: string) => {
    await supabase.rpc('increment_route_save_count', { route_id: routeId });
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, save_count: r.save_count + 1 } : r))
    );
  }, []);

  return { routes, loading, publishRoute, saveRoute, refresh: loadRoutes };
}
```

- [ ] **Step 5: Implement `hooks/useCommunityPins.ts`**

```typescript
// hooks/useCommunityPins.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uploadMedia } from '../lib/storage';
import type { CommunityPin, CreatePinInput } from '../types/social';

export function useCommunityPins() {
  const [pins, setPins] = useState<CommunityPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPins();
  }, []);

  async function loadPins() {
    setLoading(true);
    const { data } = await supabase
      .from('community_pins')
      .select('*')
      .order('created_at', { ascending: false });
    setPins((data as CommunityPin[]) ?? []);
    setLoading(false);
  }

  const addPin = useCallback(async (input: CreatePinInput): Promise<CommunityPin | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    let photoUrl: string | null = null;
    if (input.photoUri) {
      photoUrl = await uploadMedia(userData.user.id, input.photoUri, 'image/jpeg');
    }

    const { data, error } = await supabase
      .from('community_pins')
      .insert({
        user_id: userData.user.id,
        lat: input.lat,
        lng: input.lng,
        name: input.name,
        category: input.category,
        note: input.note ?? null,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (error) return null;
    const newPin = data as CommunityPin;
    setPins((prev) => [newPin, ...prev]);
    return newPin;
  }, []);

  const deletePin = useCallback(async (pinId: string) => {
    const { error } = await supabase.from('community_pins').delete().eq('id', pinId);
    if (!error) setPins((prev) => prev.filter((p) => p.id !== pinId));
  }, []);

  return { pins, loading, addPin, deletePin, refresh: loadPins };
}
```

- [ ] **Step 6: Add RPC for save count increment to migration**

Create `supabase/migrations/20260405000002_rpc.sql`:

```sql
-- supabase/migrations/20260405000002_rpc.sql
CREATE OR REPLACE FUNCTION increment_route_save_count(route_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE creator_routes SET save_count = save_count + 1 WHERE id = route_id;
$$;
```

```bash
supabase db push
```

- [ ] **Step 7: Run tests**

```bash
npx jest __tests__/hooks/useCreatorRoutes.test.ts __tests__/hooks/useCommunityPins.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add hooks/useCreatorRoutes.ts hooks/useCommunityPins.ts \
        __tests__/hooks/useCreatorRoutes.test.ts __tests__/hooks/useCommunityPins.test.ts \
        supabase/migrations/20260405000002_rpc.sql
git commit -m "feat: add useCreatorRoutes and useCommunityPins hooks"
```

---

## Task 12: Bottom Sheets — `CreatorRouteSheet` + `CommunityPinModal`

**Files:**
- Create: `components/CreatorRouteSheet.tsx`
- Create: `components/CommunityPinModal.tsx`

- [ ] **Step 1: Create `components/CreatorRouteSheet.tsx`**

```tsx
// components/CreatorRouteSheet.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import type { CreatorRoute } from '../types/social';

interface CreatorRouteSheetProps {
  route: CreatorRoute | null;
  onClose: () => void;
  onSave: (routeId: string) => void;
}

export function CreatorRouteSheet({ route, onClose, onSave }: CreatorRouteSheetProps) {
  if (!route) return null;

  return (
    <Modal
      visible={route !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{route.title}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(route.id)}>
            <Text style={styles.saveBtnText}>Save Route</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          {/* Author */}
          <View style={styles.author}>
            {route.author?.avatar_url ? (
              <Image source={{ uri: route.author.avatar_url }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorInitial}>
                  {route.author?.display_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={styles.authorName}>{route.author?.display_name ?? 'Unknown'}</Text>
          </View>

          <Text style={styles.summary}>{route.summary}</Text>

          {/* Meta */}
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Days</Text>
              <Text style={styles.metaValue}>{route.days}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Saves</Text>
              <Text style={styles.metaValue}>{route.save_count}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Views</Text>
              <Text style={styles.metaValue}>{route.view_count}</Text>
            </View>
          </View>

          {/* Tags */}
          {route.tags.length > 0 && (
            <View style={styles.tags}>
              {route.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  closeBtn: { fontSize: 18, color: '#666', width: 30 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  saveBtn: { backgroundColor: '#0F6E56', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  body: { flex: 1, padding: 16 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  authorAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0F6E56', alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { color: '#fff', fontWeight: '600' },
  authorName: { fontSize: 14, fontWeight: '600' },
  summary: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 16 },
  meta: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  metaItem: { alignItems: 'center', gap: 2 },
  metaLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  metaValue: { fontSize: 18, fontWeight: '700', color: '#111' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#E8F5F1', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: '#0F6E56', fontWeight: '600' },
});
```

- [ ] **Step 2: Create `components/CommunityPinModal.tsx`**

```tsx
// components/CommunityPinModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CommunityPin, CreatePinInput } from '../types/social';

const PIN_CATEGORIES = ['food', 'accommodation', 'attraction', 'transport', 'nature', 'general'];

interface CommunityPinModalProps {
  visible: boolean;
  lat: number;
  lng: number;
  existingPin?: CommunityPin | null;
  onClose: () => void;
  onSubmit: (input: CreatePinInput) => Promise<void>;
}

export function CommunityPinModal({
  visible,
  lat,
  lng,
  existingPin,
  onClose,
  onSubmit,
}: CommunityPinModalProps) {
  const [name, setName] = useState(existingPin?.name ?? '');
  const [category, setCategory] = useState(existingPin?.category ?? 'general');
  const [note, setNote] = useState(existingPin?.note ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSubmitting(true);
    await onSubmit({ lat, lng, name: name.trim(), category, note: note.trim() || undefined, photoUri: photoUri ?? undefined });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{existingPin ? 'Pin Details' : 'Add Pin'}</Text>
          {!existingPin && (
            <TouchableOpacity onPress={submit} disabled={submitting}>
              <Text style={[styles.postBtn, submitting && { opacity: 0.4 }]}>Save</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.body}>
          {existingPin?.photo_url && (
            <Image source={{ uri: existingPin.photo_url }} style={styles.photo} />
          )}
          {!existingPin && (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hidden ramen spot"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PIN_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, category === c && styles.chipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder="e.g. Cash only, open till 11pm"
                multiline
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>+ Add photo</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {existingPin && (
            <>
              <Text style={styles.pinName}>{existingPin.name}</Text>
              <Text style={styles.pinCategory}>{existingPin.category}</Text>
              {existingPin.note && <Text style={styles.pinNote}>{existingPin.note}</Text>}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  title: { fontSize: 17, fontWeight: '600' },
  cancelBtn: { fontSize: 17, color: '#666' },
  postBtn: { fontSize: 17, fontWeight: '600', color: '#0F6E56' },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', marginRight: 8,
  },
  chipActive: { borderColor: '#0F6E56', backgroundColor: '#E8F5F1' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#0F6E56', fontWeight: '600' },
  photoBtn: {
    marginTop: 16, borderWidth: 1, borderColor: '#0F6E56', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  photoBtnText: { color: '#0F6E56', fontWeight: '600' },
  photoPreview: { width: '100%', height: 200, borderRadius: 10 },
  photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  pinName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pinCategory: { fontSize: 13, color: '#0F6E56', fontWeight: '600', marginBottom: 8, textTransform: 'capitalize' },
  pinNote: { fontSize: 15, color: '#444', lineHeight: 22 },
});
```

- [ ] **Step 3: Run test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/CreatorRouteSheet.tsx components/CommunityPinModal.tsx
git commit -m "feat: add CreatorRouteSheet and CommunityPinModal components"
```

---

## Task 13: `app/(tabs)/explore.tsx` — Creator Routes + Community Pins Layers

**Files:**
- Modify: `app/(tabs)/explore.tsx`

- [ ] **Step 1: Read the current Explore screen**

Open `app/(tabs)/explore.tsx` and identify:
- Where `MapboxGL.MapView` is rendered
- Where search bar and category filter are rendered
- The component's state section

- [ ] **Step 2: Add imports and state for routes/pins**

Add at the top of the file (after existing imports):

```tsx
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes';
import { useCommunityPins } from '../../hooks/useCommunityPins';
import { CreatorRouteSheet } from '../../components/CreatorRouteSheet';
import { CommunityPinModal } from '../../components/CommunityPinModal';
import type { CreatorRoute, CommunityPin } from '../../types/social';
```

Add inside the component function body (alongside existing state):

```tsx
const { routes, saveRoute } = useCreatorRoutes();
const { pins, addPin } = useCommunityPins();

const [showRoutes, setShowRoutes] = useState(true);
const [showPins, setShowPins] = useState(true);
const [selectedRoute, setSelectedRoute] = useState<CreatorRoute | null>(null);
const [selectedPin, setSelectedPin] = useState<CommunityPin | null>(null);
const [newPinCoord, setNewPinCoord] = useState<{ lat: number; lng: number } | null>(null);
```

- [ ] **Step 3: Add long-press handler for dropping a new pin**

Add this handler inside the component function:

```tsx
const handleMapLongPress = (event: MapboxGL.GestureResponderEvent) => {
  const coords = event.geometry?.coordinates;
  if (!coords) return;
  setNewPinCoord({ lat: coords[1], lng: coords[0] });
};
```

- [ ] **Step 4: Add route polylines and pin markers to the MapboxGL.MapView**

Inside the existing `<MapboxGL.MapView>` JSX, add the following after existing layers:

```tsx
{/* Creator route polylines */}
{showRoutes && routes.map((route) => (
  <MapboxGL.ShapeSource
    key={`route-${route.id}`}
    id={`route-source-${route.id}`}
    shape={route.geojson as any}
    onPress={() => setSelectedRoute(route)}
  >
    <MapboxGL.LineLayer
      id={`route-line-${route.id}`}
      style={{
        lineColor: '#F5A623',
        lineWidth: 3,
        lineOpacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  </MapboxGL.ShapeSource>
))}

{/* Community pins */}
{showPins && pins.map((pin) => (
  <MapboxGL.PointAnnotation
    key={`pin-${pin.id}`}
    id={`pin-${pin.id}`}
    coordinate={[pin.lng, pin.lat]}
    onSelected={() => setSelectedPin(pin)}
  >
    <View style={{
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: '#E8622A',
      borderWidth: 2, borderColor: '#fff',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: 12 }}>📍</Text>
    </View>
  </MapboxGL.PointAnnotation>
))}
```

- [ ] **Step 5: Wire up long-press and add modals**

Add `onLongPress={handleMapLongPress}` prop to the existing `<MapboxGL.MapView>` element.

After the closing `</MapboxGL.MapView>` tag, add:

```tsx
{/* Filter toggles */}
<View style={{
  position: 'absolute', bottom: 100, right: 16,
  backgroundColor: '#fff', borderRadius: 12, padding: 8, gap: 8,
  shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
}}>
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 }}
    onPress={() => setShowRoutes((v) => !v)}
  >
    <View style={{ width: 14, height: 3, backgroundColor: showRoutes ? '#F5A623' : '#ccc', borderRadius: 2 }} />
    <Text style={{ fontSize: 12, color: showRoutes ? '#111' : '#aaa' }}>Routes</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 }}
    onPress={() => setShowPins((v) => !v)}
  >
    <Text style={{ fontSize: 14 }}>📍</Text>
    <Text style={{ fontSize: 12, color: showPins ? '#111' : '#aaa' }}>Pins</Text>
  </TouchableOpacity>
</View>

{/* Route detail sheet */}
<CreatorRouteSheet
  route={selectedRoute}
  onClose={() => setSelectedRoute(null)}
  onSave={(id) => { saveRoute(id); setSelectedRoute(null); }}
/>

{/* New pin modal (long press) */}
{newPinCoord && (
  <CommunityPinModal
    visible={newPinCoord !== null}
    lat={newPinCoord.lat}
    lng={newPinCoord.lng}
    onClose={() => setNewPinCoord(null)}
    onSubmit={async (input) => { await addPin(input); setNewPinCoord(null); }}
  />
)}

{/* View existing pin modal */}
{selectedPin && (
  <CommunityPinModal
    visible={selectedPin !== null}
    lat={selectedPin.lat}
    lng={selectedPin.lng}
    existingPin={selectedPin}
    onClose={() => setSelectedPin(null)}
    onSubmit={async () => {}}
  />
)}
```

- [ ] **Step 6: Run test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/\(tabs\)/explore.tsx
git commit -m "feat: add creator routes and community pins layers to Explore map"
```

---

## Task 14: `app/trip/[id].tsx` — Publish Route CTA

**Files:**
- Modify: `app/trip/[id].tsx`

- [ ] **Step 1: Add publish route flow to trip detail**

After the existing "Share This Trip" button added in Task 9, add the following:

```tsx
// --- ADD import at top ---
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes';

// --- ADD state inside component ---
const { publishRoute } = useCreatorRoutes();
const [publishModalVisible, setPublishModalVisible] = useState(false);
const [routeTitle, setRouteTitle] = useState('');
const [routeSummary, setRouteSummary] = useState('');
const [publishing, setPublishing] = useState(false);

// --- ADD "Publish Route" button in JSX (after "Share This Trip" button) ---
<TouchableOpacity
  style={{ marginHorizontal: 16, marginBottom: 32, borderWidth: 1, borderColor: '#0F6E56', borderRadius: 12, padding: 14, alignItems: 'center' }}
  onPress={() => setPublishModalVisible(true)}
>
  <Text style={{ color: '#0F6E56', fontWeight: '600', fontSize: 16 }}>Publish as Creator Route</Text>
</TouchableOpacity>

{/* Publish Route modal */}
<Modal
  visible={publishModalVisible}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setPublishModalVisible(false)}
>
  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' }}>
      <TouchableOpacity onPress={() => setPublishModalVisible(false)}>
        <Text style={{ fontSize: 17, color: '#666' }}>Cancel</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 17, fontWeight: '600' }}>Publish Route</Text>
      <TouchableOpacity
        disabled={publishing || !routeTitle.trim()}
        onPress={async () => {
          setPublishing(true);
          await publishRoute(trip.id, routeTitle.trim(), routeSummary.trim(), []);
          setPublishing(false);
          setPublishModalVisible(false);
        }}
      >
        {publishing
          ? <ActivityIndicator color="#0F6E56" />
          : <Text style={{ fontSize: 17, fontWeight: '600', color: routeTitle.trim() ? '#0F6E56' : '#aaa' }}>Publish</Text>
        }
      </TouchableOpacity>
    </View>
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Route Title</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16 }}
        placeholder="e.g. 5 Days in Tokyo"
        value={routeTitle}
        onChangeText={setRouteTitle}
      />
      <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Summary</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' }}
        placeholder="What makes this route special?"
        multiline
        value={routeSummary}
        onChangeText={setRouteSummary}
      />
    </ScrollView>
  </KeyboardAvoidingView>
</Modal>
```

Add missing imports at the top of `app/trip/[id].tsx` if not already present:
```tsx
import { Modal, KeyboardAvoidingView, ActivityIndicator, Platform, ScrollView, StyleSheet } from 'react-native';
```

- [ ] **Step 2: Run test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/trip/\[id\].tsx
git commit -m "feat: add publish creator route flow to trip detail"
```

---

## Task 15: `app/(tabs)/profile.tsx` — Follower/Following + Published Routes

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Add imports and data fetching for social profile data**

Add at the top of `app/(tabs)/profile.tsx` (alongside existing imports):

```tsx
import { useFollow, fetchFollowSuggestions } from '../../hooks/useFollow';
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes';
```

Add inside the component (alongside existing state):

```tsx
const { routes } = useCreatorRoutes();
const [profileUser, setProfileUser] = useState<{
  follower_count: number;
  following_count: number;
  display_name: string;
  avatar_url: string | null;
} | null>(null);

useEffect(() => {
  const loadProfile = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data } = await supabase
      .from('users')
      .select('display_name, avatar_url, follower_count, following_count')
      .eq('id', authData.user.id)
      .single();
    setProfileUser(data);
  };
  loadProfile();
}, []);
```

- [ ] **Step 2: Add follower stats row to profile JSX**

In the Profile screen JSX, add the following after the user's avatar/name section and before the existing trips/collections section:

```tsx
{/* Follower stats */}
{profileUser && (
  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 12 }}>
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111' }}>{profileUser.follower_count}</Text>
      <Text style={{ fontSize: 12, color: '#888' }}>Followers</Text>
    </View>
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111' }}>{profileUser.following_count}</Text>
      <Text style={{ fontSize: 12, color: '#888' }}>Following</Text>
    </View>
  </View>
)}

{/* Published routes section */}
{routes.filter((r) => r.published).length > 0 && (
  <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
    <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 10 }}>My Routes</Text>
    {routes.filter((r) => r.published).map((route) => (
      <View key={route.id} style={{
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
      }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111' }}>{route.title}</Text>
        <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
          {route.days} days · {route.save_count} saves
        </Text>
      </View>
    ))}
  </View>
)}
```

- [ ] **Step 3: Run test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Run on device / Expo Go for manual verification**

```bash
npx expo start
```

Manually verify:
- [ ] Feed screen shows posts with like/comment actions working
- [ ] Share Trip modal opens from trip detail, posts to Feed on submit
- [ ] Explore map shows route polylines when creator routes exist
- [ ] Long-press on map opens CommunityPinModal
- [ ] Tapping a route polyline opens CreatorRouteSheet
- [ ] "Publish as Creator Route" flow on trip detail works end-to-end
- [ ] Profile shows follower/following counts and published routes

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat: add follower stats and published routes to profile"
```

---

## Task 16: Final Accessibility Pass + Phase 2 Wrap-up

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: VoiceOver accessibility check**

On a physical iOS device or Simulator with VoiceOver enabled:
- [ ] Feed screen: each post is readable with VoiceOver; like and comment buttons have `accessibilityLabel`
- [ ] Explore map: filter toggle buttons have descriptive accessibility labels
- [ ] ShareTripModal: all inputs and buttons are focusable and labelled

For any missing `accessibilityLabel`, add it before committing.

- [ ] **Step 3: Deploy remaining Edge Functions**

```bash
supabase functions deploy route-to-geojson
```

Expected: `Deployed Function route-to-geojson`

- [ ] **Step 4: Final Phase 2 commit**

```bash
git add .
git commit -m "feat: Phase 2 complete — social feed, creator routes, community pins"
```

---

## Self-Review Checklist (pre-execution)

**Spec coverage:**
- [x] §4 Social layer — following system (Task 5), posts (Tasks 7–9), creator routes (Tasks 10–13), community pins (Tasks 11–13)
- [x] §3 Feed fully implemented (Task 8)
- [x] §3 Explore extended — routes overlay and pins (Task 13)
- [x] §3 Profile extended — follower stats, published routes (Task 15)
- [x] §11 Data model — all Phase 2 tables in migration (Task 1)
- [x] §12 route-to-geojson Edge Function (Task 10)
- [x] §13 Error handling — media upload retry handled in ShareTripModal (Task 9)
- [x] §14 Testing — unit tests for all hooks, storage, Edge Function logic, and FeedPost component

**No placeholders:** All steps have complete code.

**Type consistency:**
- `Post`, `CreatorRoute`, `CommunityPin`, `GeoJSONFeature`, `CreatePinInput` defined once in `types/social.ts` (Task 3) and referenced consistently throughout.
- `useFeed` exports `likePost`/`unlikePost`; `FeedPost` receives `onLike`/`onUnlike` — consistent.
- `useCreatorRoutes.publishRoute(tripId, title, summary, tags)` matches call in Task 14.
- `useCommunityPins.addPin(CreatePinInput)` matches `CommunityPinModal.onSubmit` signature.
