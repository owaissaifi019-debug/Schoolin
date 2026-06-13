-- ============================================================
-- SCHOOL GOLD VERIFICATION BADGE MIGRATION
-- ============================================================

-- Add verification_badge column to public.schools if it does not exist
-- Allowed values: 'none', 'blue', 'gold'
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS verification_badge text NOT NULL CHECK (verification_badge IN ('none', 'blue', 'gold')) DEFAULT 'blue';

-- Function to prevent non-owaissaifi019@gmail.com from changing school verification badges
CREATE OR REPLACE FUNCTION public.enforce_school_verification_badge_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.verification_badge IS DISTINCT FROM OLD.verification_badge THEN
    IF auth.role() = 'authenticated' AND COALESCE(auth.jwt()->>'email', '') <> 'owaissaifi019@gmail.com' THEN
      RAISE EXCEPTION 'Access Denied: Only owaissaifi019@gmail.com can change school verification badges.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for verification badge restriction
DROP TRIGGER IF EXISTS tr_enforce_school_verification_badge ON public.schools;
CREATE TRIGGER tr_enforce_school_verification_badge
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_verification_badge_permissions();
