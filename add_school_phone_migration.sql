-- ============================================================
-- ADD CONTACT PHONE COLUMN TO SCHOOLS TABLE
-- ============================================================

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS contact_phone text;
