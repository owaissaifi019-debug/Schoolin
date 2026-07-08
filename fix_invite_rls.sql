-- ============================================================
-- CampusLink – Fix: Full Alumni RLS Policies (v3)
-- Run this in your Supabase SQL Editor
-- ============================================================
--
-- Fixes:
--   1. Invite links disappear on refresh (missing INSERT policy)
--   2. "Submit Request" fails (missing alumni_requests INSERT policy)
--   3. Join-by-link fails for logged-in users (old anon-only SELECT)
--   4. Dashboard shows 0 pending requests (missing SELECT for admins)
--   5. [NEW] Cross-school access: alumni_requests INSERT now validates
--      that the invite_id matches the school_id being requested
-- ============================================================

-- ── Helper function (idempotent) ────────────────────────────
CREATE OR REPLACE FUNCTION public.is_school_admin(school_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = school_id AND admin_user_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_members.school_id = is_school_admin.school_id
      AND school_members.user_id = is_school_admin.user_id
      AND school_members.role IN ('admin', 'owner', 'school_admin', 'school_representative')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════
-- 1. alumni_invites
-- ════════════════════════════════════════════════════════════

-- SELECT: anyone (invite code is the access token; randomness is security)
DROP POLICY IF EXISTS "Allow anyone to read invite links" ON public.alumni_invites;
CREATE POLICY "Allow anyone to read invite links"
  ON public.alumni_invites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read alumni invite codes" ON public.alumni_invites;
CREATE POLICY "Anyone can read alumni invite codes"
  ON public.alumni_invites FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: school admins only
DROP POLICY IF EXISTS "Allow school admins and super admins to manage invites" ON public.alumni_invites;
CREATE POLICY "Allow school admins and super admins to manage invites"
  ON public.alumni_invites FOR ALL TO authenticated
  USING (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  )
  WITH CHECK (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  );

-- ════════════════════════════════════════════════════════════
-- 2. alumni_batches
-- ════════════════════════════════════════════════════════════

-- SELECT: anyone (batch year/name is public; needed during onboarding)
DROP POLICY IF EXISTS "Allow authenticated users to read batches" ON public.alumni_batches;
CREATE POLICY "Allow authenticated users to read batches"
  ON public.alumni_batches FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: school admins only
DROP POLICY IF EXISTS "Allow school admins and super admins to manage batches" ON public.alumni_batches;
CREATE POLICY "Allow school admins and super admins to manage batches"
  ON public.alumni_batches FOR ALL TO authenticated
  USING (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  )
  WITH CHECK (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  );

-- ════════════════════════════════════════════════════════════
-- 3. alumni_requests
-- ════════════════════════════════════════════════════════════

-- SELECT: requester or school admin only
DROP POLICY IF EXISTS "Allow creator, school admins and super admins to view requests" ON public.alumni_requests;
CREATE POLICY "Allow creator, school admins and super admins to view requests"
  ON public.alumni_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  );

-- INSERT: SECURE version — validates that the invite belongs to the claimed school
--   • If invite_id is provided: the invite MUST belong to the same school_id in the request
--   • The user must not already be a full member of a different school
DROP POLICY IF EXISTS "Allow users to submit requests for themselves" ON public.alumni_requests;
CREATE POLICY "Allow users to submit requests for themselves"
  ON public.alumni_requests FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be submitting on their own behalf
    user_id = auth.uid()
    AND (
      -- Option A: tied to a valid active invite that matches the school
      (
        invite_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.alumni_invites ai
          WHERE ai.id = invite_id
            AND ai.school_id = alumni_requests.school_id
            AND ai.status = 'active'
        )
      )
      -- Option B: no invite (direct/manual request; school admin still approves)
      OR invite_id IS NULL
    )
    -- Must NOT already be an approved member of a DIFFERENT school
    AND NOT EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id <> alumni_requests.school_id
        AND sm.role IN ('alumni', 'student', 'teacher', 'admin', 'owner', 'school_representative')
    )
  );

-- UPDATE: school admin approves/rejects; or user updates their own pending info
DROP POLICY IF EXISTS "Allow school admins, super admins, or owner to update request" ON public.alumni_requests;
CREATE POLICY "Allow school admins, super admins, or owner to update request"
  ON public.alumni_requests FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  );

-- DELETE: school admin can clean up
DROP POLICY IF EXISTS "Allow school admins and super admins to delete requests" ON public.alumni_requests;
CREATE POLICY "Allow school admins and super admins to delete requests"
  ON public.alumni_requests FOR DELETE TO authenticated
  USING (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  );

-- ════════════════════════════════════════════════════════════
-- 4. alumni_members
-- ════════════════════════════════════════════════════════════

-- SELECT: school members only (no cross-school leakage)
DROP POLICY IF EXISTS "Allow authenticated users to read alumni members" ON public.alumni_members;
CREATE POLICY "Allow authenticated users to read alumni members"
  ON public.alumni_members FOR SELECT TO authenticated
  USING (school_id = public.get_auth_school_id());

-- INSERT/UPDATE/DELETE: school admins or SECURITY DEFINER triggers
DROP POLICY IF EXISTS "Allow school admins and super admins to manage members" ON public.alumni_members;
CREATE POLICY "Allow school admins and super admins to manage members"
  ON public.alumni_members FOR ALL TO authenticated
  USING (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  )
  WITH CHECK (
    public.is_school_admin(school_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'super_admin')
  );

-- ════════════════════════════════════════════════════════════
-- 5. student_invitations & teacher_invitations SELECT (public)
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public can validate invitations by code" ON public.student_invitations;
CREATE POLICY "Public can validate invitations by code"
  ON public.student_invitations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can validate teacher invitations" ON public.teacher_invitations;
CREATE POLICY "Public can validate teacher invitations"
  ON public.teacher_invitations FOR SELECT USING (true);
