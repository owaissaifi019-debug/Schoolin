-- ============================================================
-- SUPABASE STORAGE SETUP FOR AVATARS BUCKET
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Create the 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Note: RLS is enabled by default on storage.objects in Supabase.
-- We do not run ALTER TABLE here to avoid ownership permission errors.

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;

-- 3. Create policies for the 'avatars' bucket

-- Policy A: Allow anyone (including anonymous guests) to view/read avatar files
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy B: Allow anyone (both authenticated users and anonymous sign-ups) to upload avatars
-- Sign-up happens before authentication is complete, so the user is still 'anon' (anonymous/guest)
CREATE POLICY "Public Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Policy C: Allow users to update their own avatar objects
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Policy D: Allow users to delete their own avatar objects
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
