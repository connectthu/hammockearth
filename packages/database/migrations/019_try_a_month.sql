-- Add try_a_month to membership_type_enum if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'try_a_month'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'membership_type_enum')
  ) THEN
    ALTER TYPE membership_type_enum ADD VALUE 'try_a_month';
  END IF;
END$$;
