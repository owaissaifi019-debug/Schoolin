-- SQL Migration: Add Terms and Conditions / Privacy Policy Consent Support

-- 1. Add terms_accepted and terms_accepted_at columns to public.profiles table if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- 2. Update trigger function to populate terms_accepted and terms_accepted_at from auth metadata on signup
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
    terms_accepted_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', CASE WHEN new.email = 'owaissaifi003@gmail.com' THEN 'school_representative' ELSE 'student' END),
    CASE WHEN new.email = 'owaissaifi003@gmail.com' THEN 'super_admin' ELSE 'user' END,
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false),
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    terms_accepted = COALESCE(EXCLUDED.terms_accepted, public.profiles.terms_accepted),
    terms_accepted_at = COALESCE(EXCLUDED.terms_accepted_at, public.profiles.terms_accepted_at);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
