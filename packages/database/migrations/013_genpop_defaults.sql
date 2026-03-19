-- Migration 013: Apply genpop defaults + update triggers
-- Run AFTER 012_add_genpop_role.sql has been committed

-- New profiles default to genpop
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'genpop';

-- Explicitly insert genpop on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'genpop'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update sync_member_role:
-- Upgrade: genpop OR event_customer → member when membership becomes active
-- Downgrade: member → event_customer (not genpop) when membership lapses
CREATE OR REPLACE FUNCTION public.sync_member_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE profiles
    SET role = 'member'
    WHERE id = NEW.user_id
      AND role IN ('genpop', 'event_customer');
  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    IF NOT EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = NEW.user_id AND status = 'active' AND id != NEW.id
    ) THEN
      UPDATE profiles
      SET role = 'event_customer'
      WHERE id = NEW.user_id AND role = 'member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
