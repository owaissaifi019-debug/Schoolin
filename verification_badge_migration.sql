-- ============================================================
-- VERIFICATION BADGE SYSTEM MIGRATION
-- ============================================================

-- Add is_verified column to public.profiles if it does not exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Function to prevent non-super_admin from changing verification badges
CREATE OR REPLACE FUNCTION public.enforce_verification_badge_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF auth.role() = 'authenticated' AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND platform_role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Access Denied: Only super admins can change verification badges.';
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
