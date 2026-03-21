-- Phase 9c: Services + Commitment Packages

CREATE TABLE IF NOT EXISTS services (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES bookable_profiles(id) ON DELETE CASCADE,
  icon          text,
  name          text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  display_order int         NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commitment_packages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid        NOT NULL REFERENCES bookable_profiles(id) ON DELETE CASCADE,
  heading           text        NOT NULL,
  subheading        text,
  commitment_levels jsonb       NOT NULL DEFAULT '[]',
  plans             jsonb       NOT NULL DEFAULT '[]',
  billing_note      text,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Seed Thu's commitment package (only if the slug exists and no package already present)
INSERT INTO commitment_packages (
  profile_id, heading, subheading, billing_note, commitment_levels, plans
)
SELECT
  bp.id,
  'Deep Coaching Commitment',
  'Profound transformation requires consistent practice. Choose a rhythm that supports your long-term evolution.',
  'Invoiced monthly · Prices in CAD · No payment taken at booking',
  '[
    {"label":"Monthly","months":1,"discount_percent":0},
    {"label":"3 Months","months":3,"discount_percent":7},
    {"label":"6 Months","months":6,"discount_percent":10},
    {"label":"12 Months","months":12,"discount_percent":20}
  ]'::jsonb,
  '[
    {"name":"Light Support","sessions_per_month":1,"duration_minutes":60,"monthly_price_cents":25000,"per_session_cents":25000},
    {"name":"Core Coaching","sessions_per_month":2,"duration_minutes":45,"monthly_price_cents":45000,"per_session_cents":22500},
    {"name":"Weekly Coaching","sessions_per_month":4,"duration_minutes":30,"monthly_price_cents":48000,"per_session_cents":12000},
    {"name":"Deep Coaching","sessions_per_month":4,"duration_minutes":60,"monthly_price_cents":80000,"per_session_cents":20000}
  ]'::jsonb
FROM bookable_profiles bp
WHERE bp.slug = 'thu'
  AND NOT EXISTS (
    SELECT 1 FROM commitment_packages cp WHERE cp.profile_id = bp.id
  );
