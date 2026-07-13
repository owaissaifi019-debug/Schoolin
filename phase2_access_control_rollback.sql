-- ============================================================
-- CAMPUSLINK SECURITY HARDENING - PHASE 2 ROLLBACK
-- ============================================================
-- Run this script in your Supabase SQL Editor to restore
-- the previous RLS policies and trigger configurations.

-- ── 1. PROFILES ROLLBACK ──

-- Drop Phase 2 SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by same school, self, reps, or super_admin" ON public.profiles;

-- Restore Phase 1 SELECT policy
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Restore enforce_role_change_permissions function to original state
CREATE OR REPLACE FUNCTION public.enforce_role_change_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    IF auth.role() = 'authenticated' AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND platform_role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Access Denied: Only super admins can change user platform roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger to profiles table
DROP TRIGGER IF EXISTS tr_enforce_role_change ON public.profiles;
CREATE TRIGGER tr_enforce_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_role_change_permissions();


-- ── 2. POSTS ROLLBACK ──

DROP POLICY IF EXISTS "Posts are viewable by same school, self, or super_admin" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);


-- ── 3. EVENTS ROLLBACK ──

DROP POLICY IF EXISTS "Events are viewable by same school, public events, or super_admin" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (school_id = public.get_auth_school_id());

-- Drop Phase 2 public visibility column
ALTER TABLE public.events DROP COLUMN IF EXISTS is_public;


-- ── 4. NETWORKING ROLLBACK (FOLLOWS & CONNECTIONS) ──

DROP POLICY IF EXISTS "Follows are viewable by same school, self, or super_admin" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Connections are viewable by same school, self, or super_admin" ON public.connections;
CREATE POLICY "Connections are viewable by everyone" ON public.connections FOR SELECT USING (true);


-- ── 5. ALUMNI ROLLBACK ──

DROP POLICY IF EXISTS "Alumni batches are viewable by same school or super_admin" ON public.alumni_batches;
CREATE POLICY "Allow authenticated users to read batches" ON public.alumni_batches FOR SELECT USING (true);

DROP POLICY IF EXISTS "School admins manage alumni" ON public.alumni;
CREATE POLICY "School admins manage alumni"
  ON public.alumni FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.schools
            WHERE schools.id = alumni.school_id
              AND schools.admin_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members
               WHERE school_members.school_id = alumni.school_id
                 AND school_members.user_id = auth.uid()
                 AND school_members.role IN ('admin','owner','school_admin','school_representative'))
  );


-- ── 6. DIRECTORY & ACADEMIC TABLES ROLLBACK ──

DROP POLICY IF EXISTS "School members are viewable by same school or super_admin" ON public.school_members;
CREATE POLICY "School members are viewable by everyone" ON public.school_members FOR SELECT USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "Alumni members are viewable by same school or super_admin" ON public.alumni_members;
CREATE POLICY "Allow authenticated users to read alumni members" ON public.alumni_members FOR SELECT USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "Classrooms are viewable by same school or super_admin" ON public.classrooms;
CREATE POLICY "Classrooms are viewable by everyone" ON public.classrooms FOR SELECT USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "Classroom teacher assignments are viewable by same school or super_admin" ON public.classroom_teacher_assignments;
CREATE POLICY "Classroom teacher assignments are viewable by everyone" ON public.classroom_teacher_assignments FOR SELECT USING (EXISTS (SELECT 1 FROM public.classrooms WHERE classrooms.id = classroom_id AND classrooms.school_id = public.get_auth_school_id()));

DROP POLICY IF EXISTS "Classroom subject teachers are viewable by same school or super_admin" ON public.classroom_subject_teachers;
CREATE POLICY "Classroom subject teachers are viewable by everyone" ON public.classroom_subject_teachers FOR SELECT USING (EXISTS (SELECT 1 FROM public.classrooms WHERE classrooms.id = classroom_id AND classrooms.school_id = public.get_auth_school_id()));

DROP POLICY IF EXISTS "Classroom student mappings are viewable by same school or super_admin" ON public.classroom_students;
CREATE POLICY "Classroom student mappings are viewable by everyone" ON public.classroom_students FOR SELECT USING (EXISTS (SELECT 1 FROM public.classrooms WHERE classrooms.id = classroom_id AND classrooms.school_id = public.get_auth_school_id()));

DROP POLICY IF EXISTS "Classes are viewable by same school or super_admin" ON public.classes;
CREATE POLICY "Classes are viewable by everyone" ON public.classes FOR SELECT USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "Academic sessions are viewable by same school or super_admin" ON public.academic_years;
CREATE POLICY "Academic sessions are viewable by everyone" ON public.academic_years FOR SELECT USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "Subjects are viewable by same school or super_admin" ON public.subjects;
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects FOR SELECT USING (school_id = public.get_auth_school_id());

DROP POLICY IF EXISTS "Subject classes are viewable by same school or super_admin" ON public.subject_classes;
CREATE POLICY "Subject classes are viewable by everyone" ON public.subject_classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_id AND classes.school_id = public.get_auth_school_id()));

DROP POLICY IF EXISTS "Allow school administrators full access to students" ON public.students;
CREATE POLICY "Allow school administrators full access to students"
  ON public.students FOR ALL TO authenticated
  USING (
      EXISTS (
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
