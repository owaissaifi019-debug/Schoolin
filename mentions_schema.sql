-- ============================================================
-- MENTIONS TABLE & POLICIES
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Create mentions table
CREATE TABLE IF NOT EXISTS public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioned_school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  mentioned_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  -- Ensure exactly one target (user or school) is set
  CONSTRAINT mentions_target_check CHECK (
    (mentioned_user_id IS NOT NULL AND mentioned_school_id IS NULL) OR
    (mentioned_user_id IS NULL AND mentioned_school_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON public.mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id ON public.mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON public.mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_school_id ON public.mentions(mentioned_school_id);
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_by ON public.mentions(mentioned_by);

-- Enable Row Level Security
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view mentions"
  ON public.mentions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert mentions"
  ON public.mentions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentioned_by);

CREATE POLICY "Users can delete own mentions"
  ON public.mentions FOR DELETE
  TO authenticated
  USING (auth.uid() = mentioned_by);

-- Update notifications table type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN ('like', 'comment', 'connection_request', 'connection_accepted', 'message', 'admission_application', 'follow', 'mention')
);
