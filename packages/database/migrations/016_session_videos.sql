CREATE TYPE video_type_enum AS ENUM (
  'main_recording', 'meditation', 'bonus', 'tutorial', 'supplementary'
);

CREATE TABLE session_videos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid        NOT NULL REFERENCES event_series_sessions(id) ON DELETE CASCADE,
  series_id        uuid        NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  video_type       video_type_enum NOT NULL DEFAULT 'main_recording',
  bunny_url        text        NOT NULL,
  bunny_video_id   text,
  description      text,
  facilitator      text,
  duration_minutes int,
  display_order    int         NOT NULL DEFAULT 0,
  is_published     boolean     NOT NULL DEFAULT false,
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_session_videos"
  ON session_videos FOR ALL TO service_role USING (true) WITH CHECK (true);
