-- ============================================================
-- SCHOOLIN MESSAGING SYSTEM TABLES AND POLICIES
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'ignored')) DEFAULT 'pending',
  initiator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL, -- populated if contacting a school page
  inquiry_type text CHECK (inquiry_type IN ('admissions', 'events', 'general_inquiry')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create conversation participants join table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT participant_exclusive CHECK (
    (user_id IS NOT NULL AND school_id IS NULL) OR
    (school_id IS NOT NULL AND user_id IS NULL)
  ),
  UNIQUE (conversation_id, user_id),
  UNIQUE (conversation_id, school_id)
);

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- nullable if sent to school
  receiver_school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE, -- nullable if sent to user
  message text NOT NULL,
  read_status boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT receiver_exclusive CHECK (
    (receiver_id IS NOT NULL AND receiver_school_id IS NULL) OR
    (receiver_school_id IS NOT NULL AND receiver_id IS NULL) OR
    (receiver_id IS NULL AND receiver_school_id IS NULL)
  )
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies

-- Conversations SELECT policy: Users can only view their own conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = initiator_id OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      JOIN public.profiles p ON cp.school_id = p.school_id
      WHERE cp.conversation_id = conversations.id AND p.id = auth.uid() AND p.user_type = 'school_representative'
    )
  );

-- Conversations INSERT policy: Only authenticated users can create conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND auth.uid() = initiator_id
  );

-- Conversations UPDATE policy: Participants can update conversation status (accept/ignore)
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() = initiator_id OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      JOIN public.profiles p ON cp.school_id = p.school_id
      WHERE cp.conversation_id = conversations.id AND p.id = auth.uid() AND p.user_type = 'school_representative'
    )
  );

-- Conversation Participants SELECT policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Conversation Participants INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert participants" ON public.conversation_participants;
CREATE POLICY "Authenticated users can insert participants" ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Messages SELECT policy: Users can only view messages of their conversations
DROP POLICY IF EXISTS "Users can view messages of their conversations" ON public.messages;
CREATE POLICY "Users can view messages of their conversations" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.initiator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          JOIN public.profiles p ON cp.school_id = p.school_id
          WHERE cp.conversation_id = c.id AND p.id = auth.uid() AND p.user_type = 'school_representative'
        )
      )
    )
  );

-- Messages INSERT policy: Only authenticated participants can insert messages
DROP POLICY IF EXISTS "Authenticated users can insert messages into their conversations" ON public.messages;
CREATE POLICY "Authenticated users can insert messages into their conversations" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.initiator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          JOIN public.profiles p ON cp.school_id = p.school_id
          WHERE cp.conversation_id = c.id AND p.id = auth.uid() AND p.user_type = 'school_representative'
        )
      )
    )
  );

-- Messages UPDATE policy: Participants can update message read status
DROP POLICY IF EXISTS "Participants can update message read status" ON public.messages;
CREATE POLICY "Participants can update message read status" ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.initiator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          JOIN public.profiles p ON cp.school_id = p.school_id
          WHERE cp.conversation_id = c.id AND p.id = auth.uid() AND p.user_type = 'school_representative'
        )
      )
    )
  );

-- Messages DELETE policy: Senders or conversation owners can delete messages
DROP POLICY IF EXISTS "Users can delete their own messages or conversation owners can delete any message" ON public.messages;
CREATE POLICY "Users can delete their own messages or conversation owners can delete any message" ON public.messages
  FOR DELETE
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.created_by = auth.uid() OR
        c.initiator_id = auth.uid()
      )
    )
  );

-- 6. Enable Realtime Publications (Supabase Realtime listens to these)
-- Note: In Supabase, if the tables are already in the publication, these might return notifications or run.
-- We safely try to add them.
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
