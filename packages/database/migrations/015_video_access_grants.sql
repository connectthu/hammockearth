-- Video access grants for events and series
-- Allows admins to grant individual users access regardless of membership/purchase

CREATE TABLE event_video_access_grants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by  uuid        REFERENCES profiles(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE series_video_access_grants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id   uuid        NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by  uuid        REFERENCES profiles(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series_id, user_id)
);

ALTER TABLE event_video_access_grants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_video_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_event_video_access_grants"
  ON event_video_access_grants  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_series_video_access_grants"
  ON series_video_access_grants FOR ALL TO service_role USING (true) WITH CHECK (true);
