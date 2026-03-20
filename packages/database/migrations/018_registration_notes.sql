-- Add notes field to event_registrations for dietary restrictions / anything we should know
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS notes TEXT;
