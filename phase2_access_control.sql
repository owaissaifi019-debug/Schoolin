-- ============================================================
-- CAMPUSLINK SECURITY HARDENING - PHASE 2 MIGRATION
-- ============================================================
-- Apply this script in your Supabase SQL Editor to enforce
-- school membership access boundaries and profile security.

-- ── 0. ENSURE CORE DEPENDENCIES EXIST ──
-- (Creates tables if they have not been run from other migrations yet)

CREATE TABLE IF NOT EXISTS public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  applicant_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  parent_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  grade_applied text NOT NULL,
  previous_school text,
  dob date,
  address text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'ignored')) DEFAULT 'pending',
  initiator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  inquiry_type text CHECK (inquiry_type IN ('admissions', 'events', 'general_inquiry')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT participant_exclusive CHECK (
    (user_id IS NOT NULL AND school_id IS NULL) OR
    (school_id IS NOT NULL AND user_id IS NULL)
  ),
  UNIQUE (conversation_id, user_id),
  UNIQUE (conversation_id, school_id)
);


-- ── 1. HELPERS & GLOBAL CONTROLS ──

-- Recreate or update helper function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
SECURITY DEFINER
AS $$
  SELECT COALESCE(platform_role = 'super_admin', false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

-- Recreate or update helper function to get current user's school_id
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS uuid
SECURITY DEFINER
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;


-- ── 2. SCHEMA UPDATE (EVENTS PUBLIC VISIBILITY FLAG) ──

-- Add is_public column to events table to support cross-school visibility of public events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;


-- ── 3. PROFILES PRIVACY & SECURITY ──

-- Ensure Row Level Security (RLS) is enabled on all secured tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create hardened SELECT policy for profiles
CREATE POLICY "Profiles are viewable by same school, self, reps, or super_admin"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR school_id = public.get_auth_school_id()
    OR user_type = 'school_representative'
    OR public.is_super_admin()
    -- Allow viewing if in a mutual conversation
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp_my
      JOIN public.conversation_participants cp_their 
        ON cp_my.conversation_id = cp_their.conversation_id
      WHERE (cp_my.user_id = auth.uid() OR cp_my.school_id = public.get_auth_school_id())
        AND cp_their.user_id = profiles.id
    )
    -- Allow school representatives to view profiles of users applying to their school
    OR (
      (user_type = 'student' OR user_type = 'parent' OR user_type = 'alumni')
      AND EXISTS (
        SELECT 1 FROM public.admission_applications aa
        WHERE aa.applicant_user_id = profiles.id
          AND (
            aa.school_id = public.get_auth_school_id()
            OR EXISTS (
              SELECT 1 FROM public.schools s
              WHERE s.id = aa.school_id AND s.admin_user_id = auth.uid()
            )
          )
      )
    )
  );

-- Recreate function to prevent self-escalation of school_id and user_type
CREATE OR REPLACE FUNCTION public.enforce_role_change_permissions()
RETURNS trigger AS $$
BEGIN
  -- A. Restrict platform_role changes to super admins only
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Access Denied: Only super admins can change user platform roles.';
    END IF;
  END IF;

  -- B. Prevent user self-escalation once school_id or custom roles are set
  IF auth.uid() = NEW.id AND NOT public.is_super_admin() THEN
    -- Prevent changing school_id once it is set (non-null)
    IF OLD.school_id IS NOT NULL AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Access Denied: You cannot change your school affiliation once it is set. Please contact your school administrator.';
    END IF;

    -- Prevent changing user_type once school_id is set
    IF OLD.school_id IS NOT NULL AND NEW.user_type IS DISTINCT FROM OLD.user_type THEN
      RAISE EXCEPTION 'Access Denied: You cannot change your role type once your school affiliation is set.';
    END IF;

    -- Prevent parent users (school_id is NULL) from changing role type after setup
    IF OLD.user_type = 'parent' AND NEW.user_type IS DISTINCT FROM OLD.user_type THEN
      RAISE EXCEPTION 'Access Denied: You cannot change your role type once it has been established.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to profiles table
DROP TRIGGER IF EXISTS tr_enforce_role_change ON public.profiles;
CREATE TRIGGER tr_enforce_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_role_change_permissions();


-- ── 4. POSTS SECURITY HARDENING ──

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Posts are viewable by same school, self, or super_admin"
  ON public.posts FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR (
      school_id IS NOT NULL AND school_id = public.get_auth_school_id()
    )
    OR (
      school_id IS NULL AND (
        SELECT school_id FROM public.profiles WHERE id = posts.user_id
      ) = public.get_auth_school_id()
    )
  );


-- ── 5. EVENTS SECURITY HARDENING ──

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

CREATE POLICY "Events are viewable by same school, public events, or super_admin"
  ON public.events FOR SELECT
  USING (
    is_public = true
    OR school_id = public.get_auth_school_id()
    OR public.is_super_admin()
  );


-- ── 6. NETWORKING HARDENING (FOLLOWS & CONNECTIONS) ──

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;

CREATE POLICY "Follows are viewable by same school, self, or super_admin"
  ON public.follows FOR SELECT
  USING (
    public.is_super_admin()
    OR follower_id = auth.uid()
    OR following_id = auth.uid()
    OR (
      SELECT school_id FROM public.profiles WHERE id = follower_id
    ) = public.get_auth_school_id()
    OR (
      following_id IS NOT NULL AND (
        SELECT school_id FROM public.profiles WHERE id = following_id
      ) = public.get_auth_school_id()
    )
    OR (
      following_school_id IS NOT NULL AND following_school_id = public.get_auth_school_id()
    )
  );

DROP POLICY IF EXISTS "Connections are viewable by everyone" ON public.connections;

CREATE POLICY "Connections are viewable by same school, self, or super_admin"
  ON public.connections FOR SELECT
  USING (
    public.is_super_admin()
    OR requester_id = auth.uid()
    OR receiver_id = auth.uid()
    OR (
      (SELECT school_id FROM public.profiles WHERE id = requester_id) = public.get_auth_school_id()
      AND (SELECT school_id FROM public.profiles WHERE id = receiver_id) = public.get_auth_school_id()
    )
  );


-- ── 7. ALUMNI SECURITY HARDENING ──

DROP POLICY IF EXISTS "Allow authenticated users to read batches" ON public.alumni_batches;

CREATE POLICY "Alumni batches are viewable by same school or super_admin"
  ON public.alumni_batches FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "School admins manage alumni" ON public.alumni;

CREATE POLICY "School admins manage alumni"
  ON public.alumni FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.schools
            WHERE schools.id = alumni.school_id
              AND schools.admin_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members
               WHERE school_members.school_id = alumni.school_id
                 AND school_members.user_id = auth.uid()
                 AND school_members.role IN ('admin','owner','school_admin','school_representative'))
  );


-- ── 8. DIRECTORY & ACADEMIC TABLES HARDENING (SUPER ADMIN BYPASS) ──

DROP POLICY IF EXISTS "School members are viewable by everyone" ON public.school_members;
CREATE POLICY "School members are viewable by same school or super_admin"
  ON public.school_members FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Allow authenticated users to read alumni members" ON public.alumni_members;
CREATE POLICY "Alumni members are viewable by same school or super_admin"
  ON public.alumni_members FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Classrooms are viewable by everyone" ON public.classrooms;
CREATE POLICY "Classrooms are viewable by same school or super_admin"
  ON public.classrooms FOR SELECT USING (
    school_id = public.get_auth_school_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Classroom teacher assignments are viewable by everyone" ON public.classroom_teacher_assignments;
CREATE POLICY "Classroom teacher assignments are viewable by same school or super_admin"
  ON public.classroom_teacher_assignments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_id
        AND classrooms.school_id = public.get_auth_school_id()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Classroom subject teachers are viewable by everyone" ON public.classroom_subject_teachers;
CREATE POLICY "Classroom subject teachers are viewable by same school or super_admin"
  ON public.classroom_subject_teachers FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_id
        AND classrooms.school_id = public.get_auth_school_id()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Classroom student mappings are viewable by everyone" ON public.classroom_students;
CREATE POLICY "Classroom student mappings are viewable by same school or super_admin"
  ON public.classroom_students FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_id
        AND classrooms.school_id = public.get_auth_school_id()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Classes are viewable by everyone" ON public.classes;
CREATE POLICY "Classes are viewable by same school or super_admin" ON public.classes
  FOR SELECT USING (
      school_id = public.get_auth_school_id()
      OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Academic sessions are viewable by everyone" ON public.academic_years;
CREATE POLICY "Academic sessions are viewable by same school or super_admin" ON public.academic_years
  FOR SELECT USING (
      school_id = public.get_auth_school_id()
      OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
CREATE POLICY "Subjects are viewable by same school or super_admin" ON public.subjects
  FOR SELECT USING (
      school_id = public.get_auth_school_id()
      OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Subject classes are viewable by everyone" ON public.subject_classes;
CREATE POLICY "Subject classes are viewable by same school or super_admin" ON public.subject_classes
  FOR SELECT USING (
      EXISTS (
          SELECT 1 FROM public.classes
          WHERE classes.id = class_id
            AND classes.school_id = public.get_auth_school_id()
      )
      OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Allow school administrators full access to students" ON public.students;
CREATE POLICY "Allow school administrators full access to students"
  ON public.students FOR ALL TO authenticated
  USING (
      public.is_super_admin()
      OR EXISTS (
          SELECT 1 FROM public.schools
          WHERE schools.id = students.school_id
          AND schools.admin_user_id = auth.uid()
      )
      OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.school_id = students.school_id
          AND profiles.platform_role IN ('school_admin', 'super_admin')
      )
      OR EXISTS (
          SELECT 1 FROM public.school_members
          WHERE school_members.school_id = students.school_id
          AND school_members.user_id = auth.uid()
          AND school_members.role = 'admin'
      )
  );
