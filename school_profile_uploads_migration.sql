-- ============================================================
-- SCHOOL PROFILE LOGO & COVER PHOTO UPLOAD SYSTEM
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Add logo_url and cover_url columns to schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 2. Create the 'school-logos' and 'school-covers' storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('school-logos', 'school-logos', true),
  ('school-covers', 'school-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public Read Access for School Logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for School Covers" ON storage.objects;
DROP POLICY IF EXISTS "Insert School Logos" ON storage.objects;
DROP POLICY IF EXISTS "Update School Logos" ON storage.objects;
DROP POLICY IF EXISTS "Delete School Logos" ON storage.objects;
DROP POLICY IF EXISTS "Insert School Covers" ON storage.objects;
DROP POLICY IF EXISTS "Update School Covers" ON storage.objects;
DROP POLICY IF EXISTS "Delete School Covers" ON storage.objects;
DROP POLICY IF EXISTS "School representatives can update their own school" ON public.schools;

-- 4. Create policies for public read access
CREATE POLICY "Public Read Access for School Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

CREATE POLICY "Public Read Access for School Covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-covers');

-- 5. Create storage write policies (Insert/Update/Delete) for 'school-logos' bucket
CREATE POLICY "Insert School Logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
      AND profiles.school_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Update School Logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
      AND profiles.school_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Delete School Logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
      AND profiles.school_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 6. Create storage write policies (Insert/Update/Delete) for 'school-covers' bucket
CREATE POLICY "Insert School Covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-covers'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
      AND profiles.school_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Update School Covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-covers'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
      AND profiles.school_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Delete School Covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-covers'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
      AND profiles.school_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 7. Add UPDATE policy on public.schools to allow representatives of that school to update details
CREATE POLICY "School representatives can update their own school"
ON public.schools FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = schools.id
    AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.school_id = schools.id
    AND (profiles.user_type = 'school_representative' OR profiles.platform_role = 'school_admin')
  )
);
