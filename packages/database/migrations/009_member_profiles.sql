-- ============================================================
-- Migration 009: Member Profiles
-- ============================================================

-- Ensure helper function exists (defined in 008; safe to re-run)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$;

-- 1. Add columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username            TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS location            TEXT,
  ADD COLUMN IF NOT EXISTS region              TEXT,
  ADD COLUMN IF NOT EXISTS social_links        JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS profile_visibility  TEXT NOT NULL DEFAULT 'members_only'
                             CHECK (profile_visibility IN ('public', 'members_only')),
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 2. Migrate public_url → social_links
UPDATE profiles SET social_links = jsonb_build_object('website', public_url)
WHERE public_url IS NOT NULL AND public_url <> '';
ALTER TABLE profiles DROP COLUMN IF EXISTS public_url;

-- 3. superpowers
CREATE TABLE superpowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE superpowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read superpowers" ON superpowers FOR SELECT USING (true);
CREATE POLICY "Auth users can add custom superpowers" ON superpowers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true AND created_by = auth.uid());
CREATE POLICY "Owner can delete own custom superpowers" ON superpowers FOR DELETE
  USING (is_custom = true AND created_by = auth.uid());
CREATE POLICY "Superadmins can manage superpowers" ON superpowers FOR ALL
  USING (get_auth_role() = 'superadmin');

-- 4. profile_superpowers join table
CREATE TABLE profile_superpowers (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  superpower_id UUID NOT NULL REFERENCES superpowers(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, superpower_id)
);
ALTER TABLE profile_superpowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view profile superpowers" ON profile_superpowers FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own profile superpowers" ON profile_superpowers FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete own profile superpowers" ON profile_superpowers FOR DELETE
  USING (auth.uid() = profile_id);
CREATE POLICY "Superadmins manage profile superpowers" ON profile_superpowers FOR ALL
  USING (get_auth_role() = 'superadmin');

-- 5. offerings
CREATE TABLE offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view offerings" ON offerings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view offerings on public profiles" ON offerings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = offerings.profile_id AND profiles.profile_visibility = 'public'));
CREATE POLICY "Users can insert own offerings" ON offerings FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own offerings" ON offerings FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own offerings" ON offerings FOR DELETE USING (auth.uid() = profile_id);
CREATE POLICY "Superadmins manage offerings" ON offerings FOR ALL USING (get_auth_role() = 'superadmin');

-- 6. Profile visibility RLS (additive — OR'd with existing policies)
CREATE POLICY "Public profiles visible to all" ON profiles FOR SELECT
  USING (profile_visibility = 'public');
CREATE POLICY "Members_only profiles visible to logged-in members" ON profiles FOR SELECT
  USING (profile_visibility = 'members_only' AND get_auth_role() IN ('member', 'collaborator', 'superadmin'));

-- 7. Seed 25 predefined superpowers
INSERT INTO superpowers (label, is_custom, created_by) VALUES
('Seed saving', false, NULL),
  ('Fermentation', false, NULL),
  ('Herbalism', false, NULL),
  ('Sourdough & bread baking', false, NULL),
  ('Foraging', false, NULL),
  ('Soil building', false, NULL),
  ('Composting', false, NULL),
  ('Coaching', false, NULL),
  ('Woodworking & carpentry', false, NULL),
  ('Textile arts & natural dyeing', false, NULL),
  ('Beekeeping', false, NULL),
  ('Small-scale animal husbandry', false, NULL),
  ('Market gardening', false, NULL),
  ('Permaculture design', false, NULL),
  ('Water harvesting & earthworks', false, NULL),
  ('Mycology & mushroom growing', false, NULL),
  ('Food preservation & canning', false, NULL),
  ('Holistic nutrition', false, NULL),
  ('Nervous system regulation', false, NULL),
  ('Facilitation & hosting', false, NULL),
  ('Community organizing', false, NULL),
  ('Nature-based education', false, NULL),
  ('Storytelling & writing', false, NULL),
  ('Photography & visual arts', false, NULL),
  ('Technology & software engineering', false, NULL),  
  ('Teaching', false, NULL),  
  ('Cooking', false, NULL),
  ('Hosting', false, NULL),
  ('Meditation', false, NULL),
  ('Regenerative land stewardship', false, NULL);

