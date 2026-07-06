-- ============================================================
-- Experience Section Migration
-- Adds experience[] JSONB column to profiles table
-- Works for Students, Teachers, and Alumni
-- ============================================================

-- 1. Add experience column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb;

-- 2. Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'experience';
