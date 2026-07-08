-- ============================================================
-- CAMPUSLINK SECURITY HOTFIX: RESOLVE PROFILE RLS RECURSION
-- ============================================================
-- Copy and run this entire script inside a new Supabase SQL Editor
-- to fix the infinite recursion/access denied issue on login.

-- 1. Helper function to safely fetch current user's school_id without recursion
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS uuid
SECURITY DEFINER -- Runs with superuser bypass RLS permissions
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

-- 2. Helper function to safely check if the current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
SECURITY DEFINER -- Runs with superuser bypass RLS permissions
AS $$
  SELECT COALESCE(platform_role = 'super_admin', false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

-- ── 3. UPDATE PROFILES POLICIES TO BE RECURSION-FREE ──
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
    OR auth.uid() = id
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Super admins can update any user profile" ON public.profiles;
CREATE POLICY "Super admins can update any user profile"
  ON public.profiles FOR UPDATE
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Super admins can delete any user profile" ON public.profiles;
CREATE POLICY "Super admins can delete any user profile"
  ON public.profiles FOR DELETE
  USING (
    public.is_super_admin()
  );


-- ── 4. RE-APPLY CLASSROOM & ACADEMIC POLICIES WITH THE NEW FUNCTION ──
DROP POLICY IF EXISTS "Classrooms are viewable by everyone" ON public.classrooms;
CREATE POLICY "Classrooms are viewable by everyone"
  ON public.classrooms FOR SELECT USING (
    school_id = public.get_auth_school_id()
  );

DROP POLICY IF EXISTS "Classroom teacher assignments are viewable by everyone" ON public.classroom_teacher_assignments;
CREATE POLICY "Classroom teacher assignments are viewable by everyone"
  ON public.classroom_teacher_assignments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_id
        AND classrooms.school_id = public.get_auth_school_id()
    )
  );

DROP POLICY IF EXISTS "Classroom subject teachers are viewable by everyone" ON public.classroom_subject_teachers;
CREATE POLICY "Classroom subject teachers are viewable by everyone"
  ON public.classroom_subject_teachers FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_id
        AND classrooms.school_id = public.get_auth_school_id()
    )
  );

DROP POLICY IF EXISTS "Classroom student mappings are viewable by everyone" ON public.classroom_students;
CREATE POLICY "Classroom student mappings are viewable by everyone"
  ON public.classroom_students FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_id
        AND classrooms.school_id = public.get_auth_school_id()
    )
  );

DROP POLICY IF EXISTS "Academic sessions are viewable by everyone" ON public.academic_years;
CREATE POLICY "Academic sessions are viewable by everyone" ON public.academic_years
    FOR SELECT USING (
        school_id = public.get_auth_school_id()
    );

DROP POLICY IF EXISTS "Classes are viewable by everyone" ON public.classes;
CREATE POLICY "Classes are viewable by everyone" ON public.classes
    FOR SELECT USING (
        school_id = public.get_auth_school_id()
    );

DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects
    FOR SELECT USING (
        school_id = public.get_auth_school_id()
    );

DROP POLICY IF EXISTS "Subject classes are viewable by everyone" ON public.subject_classes;
CREATE POLICY "Subject classes are viewable by everyone" ON public.subject_classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_id
              AND classes.school_id = public.get_auth_school_id()
        )
    );


-- ── 5. RE-APPLY ALUMNI POLICIES WITH THE NEW FUNCTION ──
DROP POLICY IF EXISTS "Allow authenticated users to read batches" ON public.alumni_batches;
CREATE POLICY "Allow authenticated users to read batches"
ON public.alumni_batches FOR SELECT TO authenticated
USING (
  school_id = public.get_auth_school_id()
);

DROP POLICY IF EXISTS "Allow anyone to read invite links" ON public.alumni_invites;
CREATE POLICY "Allow anyone to read invite links"
ON public.alumni_invites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read alumni members" ON public.alumni_members;
CREATE POLICY "Allow authenticated users to read alumni members"
ON public.alumni_members FOR SELECT TO authenticated
USING (
  school_id = public.get_auth_school_id()
);

DROP POLICY IF EXISTS "Anyone can read alumni invite codes" ON public.alumni_invites;
CREATE POLICY "Anyone can read alumni invite codes"
    ON public.alumni_invites FOR SELECT USING (true);


-- ── 6. RE-APPLY SCHOOL MEMBERS & EVENTS POLICIES ──
DROP POLICY IF EXISTS "School members are viewable by everyone" ON public.school_members;
CREATE POLICY "School members are viewable by everyone"
  ON public.school_members FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
  );

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
  );


-- ── 7. RE-APPLY INVITATION POLICIES ──
DROP POLICY IF EXISTS "Public can validate teacher invitations" ON public.teacher_invitations;
CREATE POLICY "Public can validate teacher invitations" 
  ON public.teacher_invitations FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public can validate invitations by code" ON public.student_invitations;
CREATE POLICY "Public can validate invitations by code" 
  ON public.student_invitations FOR SELECT 
  USING (true);
