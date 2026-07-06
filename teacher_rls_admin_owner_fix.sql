-- ============================================================
-- CampusLink – Teachers Table RLS Admin Fix
-- 
-- PROBLEM: The "Allow school administrators full access to teachers"
-- policy only checked school_members, missing the school OWNER
-- (stored in schools.admin_user_id). School owners could not
-- read/write the teachers table even though they could manage
-- classrooms (which correctly checks both conditions).
--
-- FIX: Add schools.admin_user_id check — matching the pattern
-- already used by classrooms, academic_years, etc.
-- ============================================================

-- Fix: teachers admin policy — add school owner check
DROP POLICY IF EXISTS "Allow school administrators full access to teachers" ON public.teachers;
CREATE POLICY "Allow school administrators full access to teachers"
    ON public.teachers FOR ALL TO authenticated
    USING (
        -- School owner (admin_user_id)
        EXISTS (SELECT 1 FROM public.schools
                WHERE schools.id = teachers.school_id
                  AND schools.admin_user_id = auth.uid())
        OR
        -- School members with admin-level role
        EXISTS (SELECT 1 FROM public.school_members
                WHERE school_members.school_id = teachers.school_id
                  AND school_members.user_id = auth.uid()
                  AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.schools
                WHERE schools.id = teachers.school_id
                  AND schools.admin_user_id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM public.school_members
                WHERE school_members.school_id = teachers.school_id
                  AND school_members.user_id = auth.uid()
                  AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    );

-- Verify all 4 teacher policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'teachers' ORDER BY policyname;
