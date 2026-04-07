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
