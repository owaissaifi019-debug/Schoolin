-- Supabase schema for CampusLink
-- Run this in the Supabase SQL Editor

-- Enable UUID extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  board text,
  contact_email text,
  website text,
  logo_url text,
  logo_letter text DEFAULT 'S',
  color_class text DEFAULT 'bg-gradient-1',
  about text,
  events_count integer DEFAULT 0,
  verification_badge text NOT NULL CHECK (verification_badge IN ('none', 'blue', 'gold')) DEFAULT 'blue',
  contact_phone text,
  created_at timestamp with time zone DEFAULT now()
);

-- Events table (references schools)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  description text,
  event_date text,
  venue text,
  deadline text,
  registration_link text,
  banner_url text,
  tag text,
  city text,
  school_name text,
  registrations text DEFAULT '0 Registered',
  logo_letter text DEFAULT '🎉',
  created_at timestamp with time zone DEFAULT now()
);

-- Admissions table (references schools)
CREATE TABLE IF NOT EXISTS admissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  school_name text,
  city text,
  board text,
  classes_open text,
  class_levels text[] DEFAULT '{}',
  eligibility text,
  start_date text,
  end_date text,
  last_date text,
  apply_link text,
  details text,
  academic_year text,
  brochure text,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;

-- ── Schools Policies ──

-- Anyone can read schools
CREATE POLICY "Schools are viewable by everyone"
  ON schools FOR SELECT
  USING (true);

-- Only the admin who owns the school can insert
CREATE POLICY "School admins can insert their own school"
  ON schools FOR INSERT
  WITH CHECK (auth.uid() = admin_user_id);

-- Super admins can insert any school
CREATE POLICY "Super admins can insert schools"
  ON schools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Only the admin who owns the school can update
CREATE POLICY "School admins can update their own school"
  ON schools FOR UPDATE
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id);

-- Super admins can update school status/details
CREATE POLICY "Super admins can update school status"
  ON schools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Only the admin who owns the school can delete
CREATE POLICY "School admins can delete their own school"
  ON schools FOR DELETE
  USING (auth.uid() = admin_user_id);

-- Super admins can delete any school
CREATE POLICY "Super admins can delete any school"
  ON schools FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- ── Events Policies ──

-- Anyone can read events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- School admins can insert events for their own school
CREATE POLICY "School admins can create events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = events.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can update their own school's events
CREATE POLICY "School admins can update their events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = events.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can delete their own school's events
CREATE POLICY "School admins can delete their events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = events.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- Super admins can update any event
CREATE POLICY "Super admins can update any event"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Super admins can delete any event
CREATE POLICY "Super admins can delete any event"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- ── Admissions Policies ──

-- Anyone can read admissions
CREATE POLICY "Admissions are viewable by everyone"
  ON admissions FOR SELECT
  USING (true);

-- School admins can insert admissions for their own school
CREATE POLICY "School admins can create admissions"
  ON admissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = admissions.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can update their own school's admissions
CREATE POLICY "School admins can update their admissions"
  ON admissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = admissions.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can delete their own school's admissions
CREATE POLICY "School admins can delete their admissions"
  ON admissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = admissions.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- Super admins can update any admission
CREATE POLICY "Super admins can update any admission"
  ON admissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Super admins can delete any admission
CREATE POLICY "Super admins can delete any admission"
  ON admissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- ============================================================
-- PROFILES TABLE & ROLE-BASED AUTHENTICATION
-- ============================================================

-- Drop old profiles table if migrating (comment out if running fresh)
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with new user system
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  user_type text NOT NULL CHECK (user_type IN ('student', 'teacher', 'parent', 'alumni', 'school_representative')) DEFAULT 'student',
  platform_role text NOT NULL CHECK (platform_role IN ('user', 'school_admin', 'super_admin')) DEFAULT 'user',
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can update any user profile (change roles)
CREATE POLICY "Super admins can update any user profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Super admins can delete any user profile
CREATE POLICY "Super admins can delete any user profile"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Trigger function to automatically create a profile for new users
-- IMPORTANT: platform_role is ALWAYS set to 'user' on signup — no escalation from client
-- Uses ON CONFLICT to gracefully handle re-signups (unconfirmed email retries, backfill conflicts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_type, platform_role, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', CASE WHEN new.email = 'owaissaifi019@gmail.com' THEN 'school_representative' ELSE 'student' END),
    CASE WHEN new.email = 'owaissaifi019@gmail.com' THEN 'super_admin' ELSE 'user' END,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MIGRATION: Convert existing profiles from old schema to new
-- Run this ONCE if you have existing data with the old 'role' column
-- ============================================================

-- Step 1: Add new columns if they don't exist (for migration from old schema)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'student';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_role text NOT NULL DEFAULT 'user';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Step 2: Migrate old role values to new columns
-- UPDATE public.profiles SET
--   platform_role = CASE
--     WHEN role = 'super_admin' THEN 'super_admin'
--     WHEN role = 'school_admin' THEN 'school_admin'
--     ELSE 'user'
--   END,
--   user_type = CASE
--     WHEN role = 'super_admin' THEN 'school_representative'
--     WHEN role = 'school_admin' THEN 'school_representative'
--     ELSE 'student'
--   END
-- WHERE role IS NOT NULL;

-- Step 3: Drop old column after verifying migration
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ============================================================
-- POPULATE PROFILES: Backfill for existing auth users
-- ============================================================
INSERT INTO public.profiles (id, full_name, email, user_type, platform_role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', COALESCE(raw_user_meta_data->>'school_name', '')),
  email,
  COALESCE(raw_user_meta_data->>'user_type', 'student'),
  'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Alter schools table to add status column with check constraint
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

-- Seed existing schools to approved status
UPDATE public.schools SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- Seed existing owaissaifi019@gmail.com user to super_admin and school_representative
UPDATE public.profiles
SET platform_role = 'super_admin', user_type = 'school_representative'
WHERE email = 'owaissaifi019@gmail.com';

-- ============================================================
-- ENFORCE WRITE/UPDATE PERMISSIONS FOR SUPER ADMIN PRIVILEGES
-- ============================================================

-- Function to prevent non-owaissaifi019@gmail.com from changing platform roles
CREATE OR REPLACE FUNCTION public.enforce_role_change_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    IF auth.role() = 'authenticated' AND COALESCE(auth.jwt()->>'email', '') <> 'owaissaifi019@gmail.com' THEN
      RAISE EXCEPTION 'Access Denied: Only owaissaifi019@gmail.com can change user platform roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for role change restriction
CREATE OR REPLACE TRIGGER tr_enforce_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_role_change_permissions();

-- Function to prevent non-owaissaifi019@gmail.com from changing school status (approve/reject)
CREATE OR REPLACE FUNCTION public.enforce_school_status_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.role() = 'authenticated' AND COALESCE(auth.jwt()->>'email', '') <> 'owaissaifi019@gmail.com' THEN
      RAISE EXCEPTION 'Access Denied: Only owaissaifi019@gmail.com can approve or reject schools.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for school status change restriction
CREATE OR REPLACE TRIGGER tr_enforce_school_status
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_status_permissions();

-- ============================================================
-- SCHOOL SYSTEM UPDATES (JOIN SCHOOL & SUGGEST SCHOOL)
-- ============================================================

-- Add school_id column to profiles table referencing schools
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- Create school suggestions table
CREATE TABLE IF NOT EXISTS public.school_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  board text,
  suggested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on school_suggestions
ALTER TABLE public.school_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow insert access to anyone (authenticated or anonymous)
CREATE POLICY "Anyone can suggest a school"
  ON public.school_suggestions FOR INSERT
  WITH CHECK (true);

-- Allow super admins to view suggestions
CREATE POLICY "Super admins can view suggestions"
  ON public.school_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Allow super admins to delete suggestions
CREATE POLICY "Super admins can delete suggestions"
  ON public.school_suggestions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );
-- Add LinkedIn-style student profile columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS achievements text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sports text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certificates text[] DEFAULT '{}';

-- Add established year and campus size columns to public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS est_year text,
  ADD COLUMN IF NOT EXISTS campus_size text;

-- ============================================================
-- SOCIAL FEED SYSTEM: POSTS, LIKES, AND COMMENTS
-- ============================================================

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('achievement', 'competition_win', 'project', 'event')),
  created_at timestamp with time zone DEFAULT now()
);

-- Create post likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ── Posts Policies ──
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can delete any post"
  ON public.posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );


-- ── Post Likes Policies ──
CREATE POLICY "Post likes are viewable by everyone"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Comments Policies ──
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- FOLLOW SYSTEM: FOLLOW USERS & SCHOOLS
-- ============================================================

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  follow_type text NOT NULL CHECK (follow_type IN ('user', 'school')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT follows_unique_user UNIQUE (follower_id, following_id),
  CONSTRAINT follows_unique_school UNIQUE (follower_id, following_school_id),
  CONSTRAINT follows_has_target CHECK (
    (follow_type = 'user' AND following_id IS NOT NULL AND following_school_id IS NULL) OR
    (follow_type = 'school' AND following_school_id IS NOT NULL AND following_id IS NULL)
  )
);

-- Enable RLS on follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Follows Policies
CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================
-- CONNECTION SYSTEM: LINKEDIN-STYLE MUTUAL CONNECTIONS
-- ============================================================

-- Create connections table (user-to-user only, requires accept/reject)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT connections_unique UNIQUE (requester_id, receiver_id),
  CONSTRAINT connections_no_self CHECK (requester_id != receiver_id)
);

-- Enable RLS on connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Connections Policies
CREATE POLICY "Connections are viewable by everyone"
  ON public.connections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Receiver can update connection status"
  ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Either party can delete a connection"
  ON public.connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- ============================================================
-- VERIFICATION BADGE SYSTEM
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

-- Trigger for school verification badge restriction
DROP TRIGGER IF EXISTS tr_enforce_school_verification_badge ON public.schools;
CREATE TRIGGER tr_enforce_school_verification_badge
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_verification_badge_permissions();



-- ============================================================
-- CASCADE DELETE TRIGGER FOR POSTS
-- ============================================================
-- Using a BEFORE DELETE trigger with SECURITY DEFINER to bypass RLS on child tables
-- (post_likes and comments) so that when a Post Owner or Super Admin deletes a post,
-- the child records are successfully removed without foreign key constraint violations.

CREATE OR REPLACE FUNCTION public.cascade_delete_post_dependencies()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete all post_likes and comments associated with the post being deleted
  DELETE FROM public.post_likes WHERE post_id = OLD.id;
  DELETE FROM public.comments WHERE post_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_cascade_delete_post_dependencies ON public.posts;
CREATE TRIGGER tr_cascade_delete_post_dependencies
BEFORE DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_post_dependencies();
