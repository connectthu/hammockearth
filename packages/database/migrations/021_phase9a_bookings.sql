-- Phase 9a: Bookable profiles — built-in Calendly-like booking system

-- ── bookable_profiles ─────────────────────────────────────────────────────
CREATE TABLE bookable_profiles (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  slug                      text UNIQUE NOT NULL,
  headline                  text NOT NULL DEFAULT '',
  subheading                text NOT NULL DEFAULT '',
  about                     text NOT NULL DEFAULT '',
  avatar_url                text,
  is_published              boolean NOT NULL DEFAULT false,
  google_calendar_id        text,
  google_refresh_token      text,
  cancellation_notice_hours int NOT NULL DEFAULT 0,
  buffer_minutes            int NOT NULL DEFAULT 15,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE bookable_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published profiles"
  ON bookable_profiles FOR SELECT USING (is_published = true);
-- Service role bypasses RLS for admin operations

-- ── session_types ─────────────────────────────────────────────────────────
CREATE TABLE session_types (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       uuid REFERENCES bookable_profiles(id) ON DELETE CASCADE NOT NULL,
  name             text NOT NULL,
  description      text,
  duration_minutes int NOT NULL,
  location_type    text NOT NULL CHECK (location_type IN ('zoom', 'in_person', 'phone')),
  location_detail  text,
  price_cents      int NOT NULL DEFAULT 0,
  is_free          boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  display_order    int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active session types"
  ON session_types FOR SELECT USING (is_active = true);

-- ── availability_schedules ────────────────────────────────────────────────
-- Weekly recurring windows per day_of_week (0=Sunday … 6=Saturday)
CREATE TABLE availability_schedules (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id   uuid REFERENCES bookable_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week  int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  timezone     text NOT NULL DEFAULT 'America/Toronto'
);

ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read schedules"
  ON availability_schedules FOR SELECT USING (true);

-- ── availability_overrides ────────────────────────────────────────────────
-- Block specific dates or add one-off windows
CREATE TABLE availability_overrides (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      uuid REFERENCES bookable_profiles(id) ON DELETE CASCADE NOT NULL,
  date            date NOT NULL,
  is_unavailable  boolean NOT NULL DEFAULT true,
  start_time      time,
  end_time        time,
  note            text
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read overrides"
  ON availability_overrides FOR SELECT USING (true);

-- ── bookings ──────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id          uuid REFERENCES bookable_profiles(id) ON DELETE CASCADE NOT NULL,
  session_type_id     uuid REFERENCES session_types(id) NOT NULL,
  booker_name         text NOT NULL,
  booker_email        text NOT NULL,
  booker_notes        text,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NOT NULL,
  timezone            text NOT NULL,
  location_type       text NOT NULL CHECK (location_type IN ('zoom', 'in_person', 'phone')),
  zoom_link           text,
  google_event_id     text,
  status              text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  cancellation_token  text UNIQUE NOT NULL,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- All booking access goes through service role (NestJS handles public/admin gating)
