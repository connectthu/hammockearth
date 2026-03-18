-- ============================================================
-- Phase 4 — The Living Room (Content Library)
-- Replaces content_type_enum; updates content_library table;
-- adds content_hearts and content_comments tables.
-- ============================================================

-- 1. Drop old content_library columns (CASCADE removes any dependent policies/indexes)
ALTER TABLE content_library DROP COLUMN IF EXISTS content_type CASCADE;
ALTER TABLE content_library DROP COLUMN IF EXISTS visibility CASCADE;
ALTER TABLE content_library DROP COLUMN IF EXISTS tags CASCADE;

-- 4. Drop old enums now that columns are gone
DROP TYPE IF EXISTS content_type_enum;
DROP TYPE IF EXISTS content_visibility_enum;

-- 3. Recreate content_type_enum with full Phase 4 set
CREATE TYPE content_type_enum AS ENUM (
  'blog_post', 'meditation', 'video', 'recipe', 'reflection', 'guide', 'audio'
);

-- 4. Add new columns to content_library
--    (Need a DEFAULT for NOT NULL columns; we'll drop it after)
ALTER TABLE content_library
  ADD COLUMN content_type          content_type_enum NOT NULL DEFAULT 'guide',
  ADD COLUMN topics                TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN visible_to            TEXT[]    NOT NULL DEFAULT ARRAY['public'],
  ADD COLUMN is_featured           BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN heart_count           INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN read_time_minutes     INTEGER,
  ADD COLUMN watch_listen_minutes  INTEGER;

-- Remove the placeholder DEFAULT (content_type should be set explicitly)
ALTER TABLE content_library ALTER COLUMN content_type DROP DEFAULT;

-- 5. Drop old index (now replaced)
DROP INDEX IF EXISTS idx_content_library_visibility;

-- 6. New index
CREATE INDEX IF NOT EXISTS idx_content_library_type     ON content_library(content_type);
CREATE INDEX IF NOT EXISTS idx_content_library_featured ON content_library(is_featured) WHERE is_featured = true;

-- 7. New RLS policies for content_library
--    API and SSR use service_role (bypasses RLS); anon/authed users are restricted.
CREATE POLICY "Public content visible to all"
  ON content_library FOR SELECT
  USING (
    published_at IS NOT NULL
    AND 'public' = ANY(visible_to)
  );

CREATE POLICY "Registered content visible to logged-in users"
  ON content_library FOR SELECT
  USING (
    published_at IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND 'registered' = ANY(visible_to)
  );

CREATE POLICY "Member content visible to active members"
  ON content_library FOR SELECT
  USING (
    published_at IS NOT NULL
    AND 'member' = ANY(visible_to)
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND membership_type IN ('farm_friend', 'season_pass', 'try_a_month')
        AND membership_status = 'active'
    )
  );

CREATE POLICY "Collaborator content visible to collaborators and admins"
  ON content_library FOR SELECT
  USING (
    published_at IS NOT NULL
    AND 'collaborator' = ANY(visible_to)
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('collaborator', 'superadmin')
    )
  );

CREATE POLICY "Admins can manage all content"
  ON content_library FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ============================================================
-- 8. content_hearts table
-- ============================================================

CREATE TABLE content_hearts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_library(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, user_id)
);

CREATE INDEX idx_content_hearts_content_id ON content_hearts(content_id);
CREATE INDEX idx_content_hearts_user_id    ON content_hearts(user_id);

ALTER TABLE content_hearts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON content_hearts FOR ALL USING (false);

-- ============================================================
-- 9. content_comments table
-- ============================================================

CREATE TABLE content_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_library(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_comments_content_id ON content_comments(content_id);

ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON content_comments FOR ALL USING (false);
