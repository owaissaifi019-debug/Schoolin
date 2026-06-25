-- Migration: Add School Posting System Columns and Constraints to posts table
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to public.posts if they don't exist
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- 2. Migrate existing post data: copy post_type to topic (for achievements, fests, etc.)
UPDATE public.posts SET topic = post_type WHERE topic IS NULL;

-- 3. Drop the old check constraint limiting post_type
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

-- 4. Set post_type column type, default, and data migration
ALTER TABLE public.posts ALTER COLUMN post_type SET DATA TYPE text;
ALTER TABLE public.posts ALTER COLUMN post_type SET DEFAULT 'personal';

-- Update previous types ('achievement', 'competition_win', etc.) to 'personal' in post_type
UPDATE public.posts SET post_type = 'personal' WHERE post_type IN ('achievement', 'competition_win', 'project', 'event');

-- Set topic default value to 'general' for new posts
ALTER TABLE public.posts ALTER COLUMN topic SET DEFAULT 'general';
UPDATE public.posts SET topic = 'general' WHERE topic IS NULL;

-- 5. Create trigger function to enforce posting permissions
CREATE OR REPLACE FUNCTION public.validate_post_permissions()
RETURNS TRIGGER AS $$
DECLARE
  v_user_type text;
  v_platform_role text;
BEGIN
  -- Get user type and role from profiles
  SELECT user_type, platform_role INTO v_user_type, v_platform_role
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Block if profile not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- Enforce default post_type if null
  IF NEW.post_type IS NULL THEN
    NEW.post_type := 'personal';
  END IF;

  -- Enforce default topic if null
  IF NEW.topic IS NULL THEN
    NEW.topic := 'general';
  END IF;

  -- 1. Super admins can post anything (personal or school)
  IF v_platform_role = 'super_admin' THEN
    IF NEW.post_type = 'school' AND NEW.school_id IS NULL THEN
      SELECT school_id INTO NEW.school_id FROM public.profiles WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  -- 2. School admins can only create school posts
  IF v_platform_role = 'school_admin' THEN
    IF NEW.post_type IS DISTINCT FROM 'school' THEN
      RAISE EXCEPTION 'School admins are only allowed to create official school posts.';
    END IF;
    -- Fetch and set the school_id from their admin profile
    SELECT school_id INTO NEW.school_id FROM public.profiles WHERE id = NEW.user_id;
    IF NEW.school_id IS NULL THEN
      RAISE EXCEPTION 'School admin profile is not associated with any school.';
    END IF;
    RETURN NEW;
  END IF;

  -- 3. School representatives can create personal and school posts
  IF v_user_type = 'school_representative' THEN
    IF NEW.post_type = 'school' THEN
      -- Fetch and set the school_id from their profile
      SELECT school_id INTO NEW.school_id FROM public.profiles WHERE id = NEW.user_id;
      IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'School representative profile is not associated with any school.';
      END IF;
    ELSIF NEW.post_type = 'personal' THEN
      -- Personal posts don't have school_id
      NEW.school_id := NULL;
    ELSE
      RAISE EXCEPTION 'Invalid post type. Must be personal or school.';
    END IF;
    RETURN NEW;
  END IF;

  -- 4. Students & all other users can only create personal posts
  IF NEW.post_type IS DISTINCT FROM 'personal' THEN
    RAISE EXCEPTION 'Students and general users are only allowed to create personal posts.';
  END IF;
  
  NEW.school_id := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to public.posts table
DROP TRIGGER IF EXISTS tr_validate_post_permissions ON public.posts;
CREATE TRIGGER tr_validate_post_permissions
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_post_permissions();
