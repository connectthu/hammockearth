ALTER TYPE content_type_enum ADD VALUE IF NOT EXISTS 'link';
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS external_url TEXT;
