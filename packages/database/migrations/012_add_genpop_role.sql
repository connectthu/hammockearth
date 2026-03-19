-- Migration 012: Add genpop role to enum
-- IMPORTANT: Run this alone first (enum additions can't be used in the same transaction they're created in)
-- Verify with: SELECT enum_range(NULL::user_role_enum);

ALTER TYPE user_role_enum ADD VALUE 'genpop' BEFORE 'event_customer';
