-- ============================================================
-- Hammock Earth — Roles & Permissions (Phase roles)
-- Run this in: Supabase → SQL Editor
-- ============================================================

-- ============================================================
-- 1. CREATE ROLE ENUM
-- ============================================================

CREATE TYPE user_role_enum AS ENUM (
  'superadmin',
  'collaborator',
  'member',
  'event_customer'
);

-- ============================================================
-- 2. ADD NEW PROFILE COLUMNS FOR COLLABORATOR PROFILES
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio        TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT;

-- ============================================================
-- 3. DROP EXISTING ADMIN POLICIES BEFORE ALTERING COLUMN
--    (they reference role = 'admin' which breaks after type change)
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all profiles"       ON profiles;
DROP POLICY IF EXISTS "Admins can manage events"             ON events;
DROP POLICY IF EXISTS "Admins can manage all registrations"  ON event_registrations;
DROP POLICY IF EXISTS "Admins can manage memberships"        ON memberships;
DROP POLICY IF EXISTS "Admins can manage price windows"      ON membership_price_windows;
DROP POLICY IF EXISTS "Admins can manage content"            ON content_library;
DROP POLICY IF EXISTS "Admins can read facilitator inquiries" ON facilitator_inquiries;
DROP POLICY IF EXISTS "Admins can read waitlist signups"     ON waitlist_signups;
DROP POLICY IF EXISTS "Admins can manage discount codes"     ON discount_codes;

-- ============================================================
-- 4. MIGRATE EXISTING ROLE DATA
-- ============================================================

-- Drop the inline CHECK constraint (auto-named by Postgres)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE profiles SET role = 'superadmin'     WHERE role = 'admin';
UPDATE profiles SET role = 'event_customer' WHERE role = 'user';

-- ============================================================
-- 5. ALTER COLUMN FROM TEXT TO ENUM
-- ============================================================

ALTER TABLE profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE user_role_enum USING role::user_role_enum,
  ALTER COLUMN role SET DEFAULT 'event_customer';

-- ============================================================
-- 6. CREATE collaborator_events JOIN TABLE
-- ============================================================

CREATE TABLE collaborator_events (
  collaborator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collaborator_id, event_id)
);

CREATE INDEX idx_collaborator_events_collaborator ON collaborator_events(collaborator_id);
CREATE INDEX idx_collaborator_events_event        ON collaborator_events(event_id);

ALTER TABLE collaborator_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RECREATE ADMIN POLICIES — now checking 'superadmin'
-- ============================================================

-- profiles
CREATE POLICY "Superadmins can manage all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- events
CREATE POLICY "Superadmins can manage events"
  ON events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- event_registrations
CREATE POLICY "Superadmins can manage all registrations"
  ON event_registrations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- memberships
CREATE POLICY "Superadmins can manage memberships"
  ON memberships FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- membership_price_windows
CREATE POLICY "Superadmins can manage price windows"
  ON membership_price_windows FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- content_library
CREATE POLICY "Superadmins can manage content"
  ON content_library FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- facilitator_inquiries
CREATE POLICY "Superadmins can read facilitator inquiries"
  ON facilitator_inquiries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- waitlist_signups
CREATE POLICY "Superadmins can read waitlist signups"
  ON waitlist_signups FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- discount_codes
CREATE POLICY "Superadmins can manage discount codes"
  ON discount_codes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ============================================================
-- 8. NEW RLS POLICIES FOR collaborator_events
-- ============================================================

-- Collaborators can see which events they're linked to
CREATE POLICY "Collaborators can view their event links"
  ON collaborator_events FOR SELECT
  USING (auth.uid() = collaborator_id);

-- Superadmins manage all collaborator assignments
CREATE POLICY "Superadmins can manage collaborator events"
  ON collaborator_events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ============================================================
-- 9. NEW RLS POLICY: collaborators can view events they're linked to
--    (in addition to existing public + members_only policies)
-- ============================================================

CREATE POLICY "Collaborators can view their assigned events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborator_events
      WHERE event_id = events.id
        AND collaborator_id = auth.uid()
    )
  );

-- ============================================================
-- 10. TRIGGER: auto-sync member role from memberships table
--     Avoids touching billing/webhook code.
--     - active membership  → upgrade event_customer to member
--     - cancelled/expired  → downgrade member to event_customer
--                            (only if no other active memberships)
--     Never touches collaborator or superadmin roles.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_member_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE profiles
    SET role = 'member'
    WHERE id = NEW.user_id
      AND role = 'event_customer';

  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    -- Only downgrade if no other active memberships exist
    IF NOT EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = NEW.user_id
        AND status  = 'active'
        AND id     != NEW.id
    ) THEN
      UPDATE profiles
      SET role = 'event_customer'
      WHERE id = NEW.user_id
        AND role = 'member';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_membership_status_change
  AFTER INSERT OR UPDATE OF status ON memberships
  FOR EACH ROW EXECUTE FUNCTION sync_member_role();
