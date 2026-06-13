-- =========================================================================
-- CAMPUSLINK SUPER ADMIN MESSAGING RLS POLICIES MIGRATION
-- Run this script in the Supabase SQL Editor to grant Super Admins access
-- to read all conversations and messages on the platform.
-- =========================================================================

-- 1. Conversations SELECT policy
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
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.platform_role = 'super_admin'
    )
  );

-- 2. Conversations UPDATE policy
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
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.platform_role = 'super_admin'
    )
  );

-- 3. Messages SELECT policy
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
        ) OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.platform_role = 'super_admin'
        )
      )
    )
  );
