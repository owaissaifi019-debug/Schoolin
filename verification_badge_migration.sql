-- ============================================================
-- VERIFICATION BADGE SYSTEM MIGRATION
-- ============================================================

-- Add is_verified column to public.profiles if it does not exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Function to prevent non-owaissaifi019@gmail.com from changing verification badges
CREATE OR REPLACE FUNCTION public.enforce_verification_badge_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF auth.role() = 'authenticated' AND COALESCE(auth.jwt()->>'email', '') <> 'owaissaifi019@gmail.com' THEN
      RAISE EXCEPTION 'Access Denied: Only owaissaifi019@gmail.com can change verification badges.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for verification badge restriction
DROP TRIGGER IF EXISTS tr_enforce_verification_badge ON public.profiles;
CREATE TRIGGER tr_enforce_verification_badge
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verification_badge_permissions();
