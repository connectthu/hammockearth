-- ============================================================
-- Hammock Earth — Initial Schema (Phase 1)
-- Run this in: Supabase → SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE membership_type_enum AS ENUM (
  'none', 'farm_friend', 'season_pass', 'try_a_month', 'community_partner'
);

CREATE TYPE membership_status_enum AS ENUM (
  'active', 'cancelled', 'expired'
);

CREATE TYPE price_window_enum AS ENUM (
  'founding', 'early_bird', 'regular'
);

CREATE TYPE billing_type_enum AS ENUM ('one_time', 'monthly');

CREATE TYPE event_visibility_enum AS ENUM ('public', 'members_only');

CREATE TYPE event_status_enum AS ENUM ('draft', 'published', 'cancelled');

CREATE TYPE registration_status_enum AS ENUM (
  'confirmed', 'waitlisted', 'cancelled'
);

CREATE TYPE content_type_enum AS ENUM (
  'recipe', 'homesteading', 'nervous_system', 'meditation', 'guide'
);

CREATE TYPE content_visibility_enum AS ENUM ('public', 'members_only');

CREATE TYPE discount_type_enum AS ENUM ('percent', 'fixed');

CREATE TYPE price_window_status_enum AS ENUM ('open', 'sold_out', 'closed');

CREATE TYPE media_kind_enum AS ENUM ('video', 'audio', 'pdf');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT,
  avatar_url        TEXT,
  role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  membership_type   membership_type_enum NOT NULL DEFAULT 'none',
  membership_status membership_status_enum,
  stripe_customer_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT NOT NULL,
  slug                    TEXT UNIQUE NOT NULL,
  description             TEXT,
  event_type              TEXT,
  cover_image_url         TEXT,
  start_at                TIMESTAMPTZ NOT NULL,
  end_at                  TIMESTAMPTZ,
  location                TEXT NOT NULL,
  is_online               BOOLEAN NOT NULL DEFAULT false,
  capacity                INTEGER,
  price_cents             INTEGER NOT NULL DEFAULT 0,
  member_price_cents      INTEGER NOT NULL DEFAULT 0,
  member_ticket_allowance INTEGER NOT NULL DEFAULT 2,
  visibility              event_visibility_enum NOT NULL DEFAULT 'public',
  status                  event_status_enum NOT NULL DEFAULT 'draft',
  registration_url        TEXT,
  registration_note       TEXT,
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_at ON events(start_at);

-- ============================================================
-- EVENT REGISTRATIONS
-- ============================================================

CREATE TABLE event_registrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity                 INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 2),
  stripe_payment_intent_id TEXT,
  status                   registration_status_enum NOT NULL DEFAULT 'confirmed',
  discount_code_id         UUID,
  amount_paid_cents        INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(status);

-- Capacity view
CREATE VIEW event_capacity AS
SELECT
  e.id AS event_id,
  e.slug,
  e.capacity,
  COALESCE(
    SUM(r.quantity) FILTER (WHERE r.status = 'confirmed'), 0
  ) AS tickets_sold,
  CASE
    WHEN e.capacity IS NULL THEN NULL
    ELSE e.capacity - COALESCE(
      SUM(r.quantity) FILTER (WHERE r.status = 'confirmed'), 0
    )
  END AS spots_remaining
FROM events e
LEFT JOIN event_registrations r ON r.event_id = e.id
GROUP BY e.id, e.slug, e.capacity;

-- ============================================================
-- MEMBERSHIPS
-- ============================================================

CREATE TABLE memberships (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_type        TEXT NOT NULL CHECK (
    membership_type IN ('farm_friend', 'season_pass', 'try_a_month', 'community_partner')
  ),
  price_window           price_window_enum,
  billing_type           billing_type_enum NOT NULL,
  stripe_payment_id      TEXT,
  stripe_subscription_id TEXT,
  status                 membership_status_enum NOT NULL DEFAULT 'active',
  valid_from             TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until            TIMESTAMPTZ,
  trial_credited         BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);

-- ============================================================
-- MEMBERSHIP PRICE WINDOWS
-- ============================================================

CREATE TABLE membership_price_windows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            price_window_enum UNIQUE NOT NULL,
  label           TEXT NOT NULL,
  price_cents     INTEGER NOT NULL,
  max_spots       INTEGER,
  spots_taken     INTEGER NOT NULL DEFAULT 0,
  status          price_window_status_enum NOT NULL DEFAULT 'open',
  closes_at       TIMESTAMPTZ,
  stripe_price_id TEXT
);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================

CREATE TABLE discount_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE NOT NULL,
  description    TEXT,
  discount_type  discount_type_enum NOT NULL,
  discount_value INTEGER NOT NULL,
  max_uses       INTEGER,
  used_count     INTEGER NOT NULL DEFAULT 0,
  valid_from     TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until    TIMESTAMPTZ,
  members_only   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code);

-- ============================================================
-- CONTENT LIBRARY
-- ============================================================

CREATE TABLE content_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  summary         TEXT,
  body            TEXT,
  cover_image_url TEXT,
  content_type    content_type_enum NOT NULL,
  media_url       TEXT,
  media_kind      media_kind_enum,
  visibility      content_visibility_enum NOT NULL DEFAULT 'members_only',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  published_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_library_slug ON content_library(slug);
CREATE INDEX idx_content_library_visibility ON content_library(visibility);

-- ============================================================
-- FACILITATOR INQUIRIES
-- ============================================================

CREATE TABLE facilitator_inquiries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- WAITLIST SIGNUPS (newsletter / program waitlists)
-- ============================================================

CREATE TABLE waitlist_signups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  first_name TEXT,
  source     TEXT NOT NULL DEFAULT 'homepage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_signups_source ON waitlist_signups(source);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_price_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilitator_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own; admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Events: published public events visible to all; members see members_only; admins see all
CREATE POLICY "Public can view published public events"
  ON events FOR SELECT
  USING (status = 'published' AND visibility = 'public');

CREATE POLICY "Members can view members_only events"
  ON events FOR SELECT
  USING (
    status = 'published' AND visibility = 'members_only' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND membership_type IN ('season_pass', 'try_a_month')
        AND membership_status = 'active'
    )
  );

CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Registrations: users see their own
CREATE POLICY "Users can view own registrations"
  ON event_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own registrations"
  ON event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own registrations"
  ON event_registrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations"
  ON event_registrations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Memberships: users see their own; admins see all
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage memberships"
  ON memberships FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Price windows: public read
CREATE POLICY "Public can view price windows"
  ON membership_price_windows FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage price windows"
  ON membership_price_windows FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Content library: visibility gating
CREATE POLICY "Public can view public content"
  ON content_library FOR SELECT
  USING (visibility = 'public' AND published_at IS NOT NULL);

CREATE POLICY "Members can view members_only content"
  ON content_library FOR SELECT
  USING (
    published_at IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND membership_type IN ('farm_friend', 'season_pass', 'try_a_month')
        AND membership_status = 'active'
    )
  );

CREATE POLICY "Admins can manage content"
  ON content_library FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Facilitator inquiries: insert-only for public; admins can read
CREATE POLICY "Anyone can submit facilitator inquiry"
  ON facilitator_inquiries FOR INSERT
  WITH CHECK (
    name IS NOT NULL AND name <> ''
    AND email IS NOT NULL AND email <> ''
    AND message IS NOT NULL AND message <> ''
  );

CREATE POLICY "Admins can read facilitator inquiries"
  ON facilitator_inquiries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Waitlist signups: insert-only for public
CREATE POLICY "Anyone can sign up for waitlist"
  ON waitlist_signups FOR INSERT
  WITH CHECK (
    email IS NOT NULL AND email <> ''
    AND source IS NOT NULL AND source <> ''
  );

CREATE POLICY "Admins can read waitlist signups"
  ON waitlist_signups FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Discount codes: only admins manage; validation done server-side
CREATE POLICY "Admins can manage discount codes"
  ON discount_codes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SEED DATA
-- ============================================================

-- Membership price windows
INSERT INTO membership_price_windows (slug, label, price_cents, max_spots, spots_taken, status, closes_at)
VALUES
  ('founding',   'Founding',   80000,  22,   0, 'open', NULL),
  ('early_bird', 'Early Bird', 108000, NULL, 0, 'open', '2026-06-21T04:00:00Z'),
  ('regular',    'Regular',    135000, NULL, 0, 'open', NULL);

-- Seed events
INSERT INTO events (
  title, slug, event_type, start_at, end_at, location,
  is_online, price_cents, member_price_cents, visibility, status,
  registration_url, registration_note, tags
) VALUES
(
  'Embodiment Circle Retreat: Celebrating Our Becoming',
  'embodiment-circle-retreat-april-2026',
  'Full Day Retreat',
  '2026-04-18T15:00:00Z',
  '2026-04-18T22:00:00Z',
  'Hammock Hills, Hillsdale, Ontario',
  false, 17700, 8850, 'public', 'published',
  'https://next.waveapps.com/checkouts/2d106067f7944ef0bbb3c78d888df15a',
  NULL,
  ARRAY['retreat', 'embodiment', 'nervous-system']
),
(
  'Earth Day Garden Workshop',
  'earth-day-garden-workshop-2026',
  'Workshop',
  '2026-04-22T14:00:00Z',
  '2026-04-22T19:00:00Z',
  'Hammock Hills, Hillsdale, Ontario',
  false, 14900, 7450, 'public', 'published',
  NULL,
  'Registration opening soon',
  ARRAY['workshop', 'garden', 'earth-day']
),
(
  'Mushroom Log Inoculation Workshop',
  'mushroom-log-inoculation-workshop-may-2026',
  'Workshop',
  '2026-05-09T14:00:00Z',
  '2026-05-09T19:00:00Z',
  'Hammock Hills, Hillsdale, Ontario',
  false, 14900, 7450, 'public', 'published',
  NULL,
  'Registration opening soon',
  ARRAY['workshop', 'mushrooms', 'homesteading']
);
