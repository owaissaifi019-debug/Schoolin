-- ============================================================
-- CAMPUSLINK SECURITY HARDENING: RLS MIGRATIONS
-- ============================================================
-- Copy and run this entire script inside a new Supabase SQL Editor
-- to apply the RLS updates and Representative Access fixes.

-- 0. Helper functions to safely fetch current user's school_id and platform_role without recursion
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS uuid
SECURITY DEFINER -- Runs with superuser bypass RLS permissions
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
SECURITY DEFINER -- Runs with superuser bypass RLS permissions
AS $$
  SELECT COALESCE(platform_role = 'super_admin', false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

-- ── 1. CLASSROOM MANAGEMENT POLICIES ──
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

-- ── 2. ACADEMIC & SUBJECT MANAGEMENT POLICIES ──
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

DROP POLICY IF EXISTS "School Admins can insert subject_classes" ON public.subject_classes;
CREATE POLICY "School Admins can insert subject_classes" ON public.subject_classes
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_id
              AND (
                  EXISTS (SELECT 1 FROM public.schools WHERE id = classes.school_id AND admin_user_id = auth.uid())
                  OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
              )
        )
    );

DROP POLICY IF EXISTS "School Admins can delete subject_classes" ON public.subject_classes;
CREATE POLICY "School Admins can delete subject_classes" ON public.subject_classes
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_id
              AND (
                  EXISTS (SELECT 1 FROM public.schools WHERE id = classes.school_id AND admin_user_id = auth.uid())
                  OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
              )
        )
    );

-- ── 3. ALUMNI POLICIES ──
DROP POLICY IF EXISTS "Allow authenticated users to read batches" ON public.alumni_batches;
CREATE POLICY "Allow authenticated users to read batches"
ON public.alumni_batches FOR SELECT USING (true);

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

-- ── 4. SCHOOL MEMBERS POLICIES ──
DROP POLICY IF EXISTS "School members are viewable by everyone" ON public.school_members;
CREATE POLICY "School members are viewable by everyone"
  ON public.school_members FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
  );

-- ── 5. EVENTS & PROFILES POLICIES ──
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    school_id = public.get_auth_school_id()
  );

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- ── 6. INVITATION POLICIES ──
DROP POLICY IF EXISTS "Public can validate teacher invitations" ON public.teacher_invitations;
CREATE POLICY "Public can validate teacher invitations" 
  ON public.teacher_invitations FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public can validate invitations by code" ON public.student_invitations;
CREATE POLICY "Public can validate invitations by code" 
  ON public.student_invitations FOR SELECT 
  USING (true);

-- ── 7. CONVERSATION & REPRESENTATIVE POLICIES ──
DROP POLICY IF EXISTS school_rep_conversations ON conversations;
CREATE POLICY school_rep_conversations ON conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.user_type = 'school_representative' 
        AND profiles.school_id = conversations.school_id
    )
  );

DROP POLICY IF EXISTS school_rep_members ON conversation_members;
CREATE POLICY school_rep_members ON conversation_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_members.conversation_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'school_representative' 
            AND profiles.school_id = conversations.school_id
        )
    )
  );

DROP POLICY IF EXISTS school_rep_messages ON messages;
CREATE POLICY school_rep_messages ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'school_representative' 
            AND profiles.school_id = conversations.school_id
        )
    )
  );

DROP POLICY IF EXISTS school_rep_settings ON conversation_settings;
CREATE POLICY school_rep_settings ON conversation_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_settings.conversation_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'school_representative' 
            AND profiles.school_id = conversations.school_id
        )
    )
  );
