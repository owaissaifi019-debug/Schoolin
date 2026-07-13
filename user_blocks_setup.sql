-- ============================================================
-- USER BLOCKING SYSTEM SETUP
-- ============================================================

-- 1. Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocker_blocked_different CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for user_blocks
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view their own blocks" 
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON public.user_blocks;
CREATE POLICY "Users can block others" 
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock others" ON public.user_blocks;
CREATE POLICY "Users can unblock others" 
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);


-- 3. Modify Profiles SELECT Policy to hide blocked/blockers
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone except blocked/blockers" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone except blocked/blockers" 
  ON public.profiles FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE (blocker_id = id AND blocked_id = auth.uid()) 
         OR (blocker_id = auth.uid() AND blocked_id = id)
    )
  );


-- 4. Modify Posts SELECT Policy to hide blocker/blocked posts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone except blocked/blockers" ON public.posts;
CREATE POLICY "Posts are viewable by everyone except blocked/blockers" 
  ON public.posts FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE (blocker_id = user_id AND blocked_id = auth.uid()) 
         OR (blocker_id = auth.uid() AND blocked_id = user_id)
    )
  );


-- 5. Modify Comments SELECT Policy to hide blocker/blocked comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone except blocked/blockers" ON public.comments;
CREATE POLICY "Comments are viewable by everyone except blocked/blockers" 
  ON public.comments FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE (blocker_id = user_id AND blocked_id = auth.uid()) 
         OR (blocker_id = auth.uid() AND blocked_id = user_id)
    )
  );


-- 6. Modify Likes SELECT Policy to hide blocker/blocked likes
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;
DROP POLICY IF EXISTS "Post likes are viewable by everyone except blocked/blockers" ON public.post_likes;
CREATE POLICY "Post likes are viewable by everyone except blocked/blockers" 
  ON public.post_likes FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks 
      WHERE (blocker_id = user_id AND blocked_id = auth.uid()) 
         OR (blocker_id = auth.uid() AND blocked_id = user_id)
    )
  );


-- 7. Modify Connections SELECT & INSERT Policies
DROP POLICY IF EXISTS "Connections are viewable by everyone" ON public.connections;
DROP POLICY IF EXISTS "Connections are viewable by everyone except blocked/blockers" ON public.connections;
CREATE POLICY "Connections are viewable by everyone except blocked/blockers" 
  ON public.connections FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = requester_id AND blocked_id = auth.uid())
         OR (blocker_id = auth.uid() AND blocked_id = requester_id)
         OR (blocker_id = receiver_id AND blocked_id = auth.uid())
         OR (blocker_id = auth.uid() AND blocked_id = receiver_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can send connection requests" ON public.connections;
DROP POLICY IF EXISTS "Authenticated users can send connection requests except if blocked" ON public.connections;
CREATE POLICY "Authenticated users can send connection requests except if blocked" 
  ON public.connections FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id AND
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = requester_id AND blocked_id = receiver_id)
         OR (blocker_id = receiver_id AND blocked_id = requester_id)
    )
  );


-- 8. Modify Messages INSERT Policy
DROP POLICY IF EXISTS "Messages cannot be sent/received between blocked users" ON public.messages;
CREATE POLICY "Messages cannot be sent/received between blocked users" 
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    (
      (receiver_id IS NULL) OR
      NOT EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = sender_id AND blocked_id = receiver_id)
           OR (blocker_id = receiver_id AND blocked_id = sender_id)
      )
    )
  );
