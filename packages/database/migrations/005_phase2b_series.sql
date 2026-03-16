-- Phase 2b: Series ticketing

CREATE TABLE event_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_image_url text,
  is_online boolean NOT NULL DEFAULT true,
  location text,
  duration_weeks int NOT NULL,
  session_count int NOT NULL,
  price_cents int NOT NULL DEFAULT 0,
  member_price_cents int NOT NULL DEFAULT 0,
  drop_in_enabled boolean NOT NULL DEFAULT false,
  drop_in_price_cents int,
  drop_in_member_price_cents int,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','members_only')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled')),
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_series_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
  title text,
  session_number int NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text,
  meeting_url text,
  capacity int,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE event_registrations ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE event_registrations ADD COLUMN series_id uuid REFERENCES event_series(id);
ALTER TABLE event_registrations ADD COLUMN session_id uuid REFERENCES event_series_sessions(id);
ALTER TABLE event_registrations ADD COLUMN registration_type text NOT NULL DEFAULT 'single_event'
  CHECK (registration_type IN ('single_event','full_series','drop_in_session'));
ALTER TABLE event_registrations ADD CONSTRAINT registrations_one_target_check CHECK (
  (event_id IS NOT NULL AND series_id IS NULL AND session_id IS NULL) OR
  (event_id IS NULL AND series_id IS NOT NULL AND session_id IS NULL) OR
  (event_id IS NULL AND series_id IS NULL AND session_id IS NOT NULL)
);
