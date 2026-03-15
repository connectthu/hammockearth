-- Phase 2a — Part 1: Schema changes
-- Run this first, then run 003_capacity_view.sql in a new query

-- Add 'pending' to registration status enum
-- NOTE: This must be committed before the new value can be used in views.
-- Run 003_capacity_view.sql as a separate query after this one completes.
ALTER TYPE registration_status_enum ADD VALUE IF NOT EXISTS 'pending';

-- Guest checkout: make user_id nullable, add name/email fields
ALTER TABLE event_registrations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS guest_email TEXT;
