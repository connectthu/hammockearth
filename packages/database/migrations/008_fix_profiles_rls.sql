-- ============================================================
-- Fix: infinite recursion in profiles RLS policy
--
-- The "Superadmins can manage all profiles" policy used:
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
-- This queries profiles from within a profiles policy → infinite recursion.
--
-- Fix: SECURITY DEFINER function reads role without triggering RLS.
-- ============================================================

-- Helper function: returns current user's role, bypasses RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$;

-- Drop the recursive policy and recreate using the function
DROP POLICY IF EXISTS "Superadmins can manage all profiles" ON profiles;

CREATE POLICY "Superadmins can manage all profiles"
  ON profiles FOR ALL
  USING (get_auth_role() = 'superadmin');
