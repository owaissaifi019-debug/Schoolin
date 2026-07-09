-- ============================================================
-- CAMPUSLINK HOTFIX: MAKE PROFILES VIEWABLE BY EVERYONE
-- ============================================================
-- Run this script in your Supabase SQL Editor to fix the issue where
-- users from other schools show as "Anonymous User" in posts and
-- disappear from the Network / People You May Know suggestions.
-- ============================================================

-- Drop the restrictive select policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Re-create the SELECT policy to allow anyone to read basic profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);
