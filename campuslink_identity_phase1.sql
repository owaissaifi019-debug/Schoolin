-- ============================================================
-- SQL Migration: CampusLink Identity System - Phase 1
-- ============================================================

-- 1. Create helper function to generate unique random CL-XXXXXX IDs
CREATE OR REPLACE FUNCTION public.generate_unique_campuslink_id()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  new_id text;
  is_unique boolean;
BEGIN
  LOOP
    new_id := 'CL-' || 
              substr(chars, floor(random() * 36)::integer + 1, 1) ||
              substr(chars, floor(random() * 36)::integer + 1, 1) ||
              substr(chars, floor(random() * 36)::integer + 1, 1) ||
              substr(chars, floor(random() * 36)::integer + 1, 1) ||
              substr(chars, floor(random() * 36)::integer + 1, 1) ||
              substr(chars, floor(random() * 36)::integer + 1, 1);
    
    SELECT NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE campuslink_id = new_id
    ) INTO is_unique;
    
    EXIT WHEN is_unique;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add username and campuslink_id columns to profiles if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS campuslink_id text;

-- 3. Backfill campuslink_id for existing users
UPDATE public.profiles
SET campuslink_id = public.generate_unique_campuslink_id()
WHERE campuslink_id IS NULL;

-- 4. Enforce constraints
-- Ensure username is unique case-insensitively using a unique index
DROP INDEX IF EXISTS public.profiles_username_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (LOWER(username));

-- Ensure campuslink_id is unique and not null (with generator default)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_campuslink_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_campuslink_id_key UNIQUE (campuslink_id);
ALTER TABLE public.profiles ALTER COLUMN campuslink_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN campuslink_id SET DEFAULT public.generate_unique_campuslink_id();

-- 5. Update handle_new_user() trigger function to also insert username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    user_type, 
    platform_role, 
    avatar_url, 
    terms_accepted, 
    terms_accepted_at,
    username
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', CASE WHEN new.email = 'owaissaifi003@gmail.com' THEN 'school_representative' ELSE 'student' END),
    CASE WHEN new.email = 'owaissaifi003@gmail.com' THEN 'super_admin' ELSE 'user' END,
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false),
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone,
    COALESCE(LOWER(new.raw_user_meta_data->>'username'), NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    terms_accepted = COALESCE(EXCLUDED.terms_accepted, public.profiles.terms_accepted),
    terms_accepted_at = COALESCE(EXCLUDED.terms_accepted_at, public.profiles.terms_accepted_at),
    username = COALESCE(LOWER(EXCLUDED.username), public.profiles.username);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
