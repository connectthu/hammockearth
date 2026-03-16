-- Phase 2b: Add confirmation_details rich text field to events
ALTER TABLE events ADD COLUMN confirmation_details text;
