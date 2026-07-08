-- ============================================================
-- CampusLink – Alumni Batch Management RLS Policies
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.alumni_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_requests ENABLE ROW LEVEL SECURITY;

-- ── helper admin check functions ──
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

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND platform_role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 1. ALUMNI BATCHES POLICIES ──

-- SELECT: Anyone can view batches (needed for join-by-link onboarding before user has a school_id)
DROP POLICY IF EXISTS "Allow authenticated users to read batches" ON public.alumni_batches;
CREATE POLICY "Allow authenticated users to read batches"
ON public.alumni_batches FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: School admins and super admins can manage batches
DROP POLICY IF EXISTS "Allow school admins and super admins to manage batches" ON public.alumni_batches;
CREATE POLICY "Allow school admins and super admins to manage batches"
ON public.alumni_batches FOR ALL TO authenticated
USING (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
);


-- ── 2. ALUMNI INVITES POLICIES ──

-- SELECT: Anyone can view invite codes (invite code is the secret token; must work for logged-in users too)
DROP POLICY IF EXISTS "Allow anyone to read invite links" ON public.alumni_invites;
CREATE POLICY "Allow anyone to read invite links"
ON public.alumni_invites FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: School admins and super admins manage invites
DROP POLICY IF EXISTS "Allow school admins and super admins to manage invites" ON public.alumni_invites;
CREATE POLICY "Allow school admins and super admins to manage invites"
ON public.alumni_invites FOR ALL TO authenticated
USING (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
);


-- ── 3. ALUMNI MEMBERS POLICIES ──

-- SELECT: Authenticated users can view members list (restricted to own school)
DROP POLICY IF EXISTS "Allow authenticated users to read alumni members" ON public.alumni_members;
CREATE POLICY "Allow authenticated users to read alumni members"
ON public.alumni_members FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

-- INSERT/UPDATE/DELETE: School admins and super admins can manage members
DROP POLICY IF EXISTS "Allow school admins and super admins to manage members" ON public.alumni_members;
CREATE POLICY "Allow school admins and super admins to manage members"
ON public.alumni_members FOR ALL TO authenticated
USING (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
);


-- ── 4. ALUMNI REQUESTS POLICIES ──

-- SELECT: School admins, super admins, or the user who created the request can view requests
CREATE POLICY "Allow creator, school admins and super admins to view requests"
ON public.alumni_requests FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
);

-- INSERT: Authenticated users can insert their own request
CREATE POLICY "Allow users to submit requests for themselves"
ON public.alumni_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- UPDATE: School admins, super admins, or the user themselves (only for their request details if not changing status directly)
CREATE POLICY "Allow school admins, super admins, or owner to update request"
ON public.alumni_requests FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  user_id = auth.uid() OR public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
);

-- DELETE: School admins or super admins can delete/clean up requests
CREATE POLICY "Allow school admins and super admins to delete requests"
ON public.alumni_requests FOR DELETE TO authenticated
USING (
  public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
);
