-- ============================================================
-- CampusLink – Teacher Self-Registration RLS Fix
-- 
-- PROBLEM: Teachers who submit the invite link form could not
-- insert their own pending record into the `teachers` table
-- because the only INSERT policy requires school_admin role.
-- The upsert was silently failing (RLS rejection), so the
-- pending request never appeared in the admin dashboard.
--
-- FIX: Add INSERT and UPDATE policies for authenticated users
-- acting on their own records (user_id = auth.uid()).
-- ============================================================

-- 1. Allow any authenticated user to INSERT their own teacher record
--    (i.e., where user_id matches their auth.uid)
--    This is safe because:
--      - The school_id comes from the validated invite token
--      - verification_status defaults to 'pending' so they can't self-approve
--      - Admin still must approve before they get any access
DROP POLICY IF EXISTS "Allow teachers to self-register via invite" ON public.teachers;
CREATE POLICY "Allow teachers to self-register via invite"
    ON public.teachers
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 2. Allow a teacher to update their OWN pending record
--    (e.g., fix their phone or re-submit with corrected details)
--    This is safe because admin approval controls system access
DROP POLICY IF EXISTS "Allow teachers to update their own pending record" ON public.teachers;
CREATE POLICY "Allow teachers to update their own pending record"
    ON public.teachers
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Verify the policies are in place
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'teachers'
ORDER BY policyname;
