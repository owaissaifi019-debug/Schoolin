-- ============================================================
-- USER BLOCKING & SCHOOL PRIVACY HARDENING
-- ============================================================
-- Drops the overly broad select policies introduced during blocking setup
-- and combines block filters directly into the same-school policies.

-- 1. Hardened Profiles SELECT Policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone except blocked/blockers" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by same school, self, reps, or super_admin" ON public.profiles;

CREATE POLICY "Profiles are viewable by same school, self, reps, or super_admin"
  ON public.profiles FOR SELECT
  USING (
    (
      id = auth.uid()
      OR school_id = public.get_auth_school_id()
      OR user_type = 'school_representative'
      OR public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.conversation_participants cp_my
        JOIN public.conversation_participants cp_their 
          ON cp_my.conversation_id = cp_their.conversation_id
        WHERE (cp_my.user_id = auth.uid() OR cp_my.school_id = public.get_auth_school_id())
          AND cp_their.user_id = profiles.id
      )
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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE blocker_id = id AND blocked_id = auth.uid()
    )
  );


-- 2. Hardened Posts SELECT Policy
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone except blocked/blockers" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by same school, self, or super_admin" ON public.posts;

CREATE POLICY "Posts are viewable by same school, self, or super_admin"
  ON public.posts FOR SELECT
  USING (
    (
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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE blocker_id = user_id AND blocked_id = auth.uid()
    )
  );


-- 3. Hardened Connections SELECT Policy
DROP POLICY IF EXISTS "Connections are viewable by everyone" ON public.connections;
DROP POLICY IF EXISTS "Connections are viewable by everyone except blocked/blockers" ON public.connections;
DROP POLICY IF EXISTS "Connections are viewable by same school, self, or super_admin" ON public.connections;

CREATE POLICY "Connections are viewable by same school, self, or super_admin"
  ON public.connections FOR SELECT
  USING (
    (
      public.is_super_admin()
      OR requester_id = auth.uid()
      OR receiver_id = auth.uid()
      OR (
        (SELECT school_id FROM public.profiles WHERE id = requester_id) = public.get_auth_school_id()
        AND (SELECT school_id FROM public.profiles WHERE id = receiver_id) = public.get_auth_school_id()
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = requester_id AND blocked_id = auth.uid())
         OR (blocker_id = receiver_id AND blocked_id = auth.uid())
    )
  );


-- 4. Hardened Follows SELECT Policy
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Follows are viewable by same school, self, or super_admin" ON public.follows;

CREATE POLICY "Follows are viewable by same school, self, or super_admin"
  ON public.follows FOR SELECT
  USING (
    (
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
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = follower_id AND blocked_id = auth.uid())
         OR (following_id IS NOT NULL AND blocker_id = following_id AND blocked_id = auth.uid())
    )
  );
