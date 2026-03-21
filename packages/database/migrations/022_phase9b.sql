-- Phase 9b: Google Calendar + Zoom integration columns

-- bookable_profiles: store Google OAuth tokens
ALTER TABLE bookable_profiles
  ADD COLUMN IF NOT EXISTS google_refresh_token  text,
  ADD COLUMN IF NOT EXISTS google_calendar_id    text,
  ADD COLUMN IF NOT EXISTS google_account_email  text;

-- bookings: store Google Calendar event ID and Zoom meeting info
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS google_event_id  text,
  ADD COLUMN IF NOT EXISTS zoom_meeting_id  text;

-- zoom_link already exists from 021; this is a no-op guard
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS zoom_link text;
