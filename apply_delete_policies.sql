-- =====================================================================
-- CAMPUSLINK CONVERSATION ENGINE - RECURSION-PROOF DELETE POLICIES
-- =====================================================================
-- Run this script in your Supabase SQL Editor to allow Group Admins 
-- to remove members and allow members to exit groups successfully.

-- 1. Helper function to check if user is group admin (SECURITY DEFINER to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_admin(conv_id UUID, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = conv_id 
      AND user_id = user_id 
      AND role IN ('Admin', 'Owner')
      AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Policies for conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete participants from their conversations" ON public.conversation_participants;
CREATE POLICY "Users can delete participants from their conversations" ON public.conversation_participants
  FOR DELETE
  TO authenticated
  USING (
    -- User is deleting themselves (exiting group)
    user_id = auth.uid()
    OR
    -- User is the initiator of the conversation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id AND c.initiator_id = auth.uid()
    )
    -- User is a group admin/owner
    OR public.is_group_admin(conversation_participants.conversation_id, auth.uid())
    -- User is a school representative/admin
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.user_type = 'school_representative' 
        OR p.platform_role = 'school_admin'
      )
    )
  );

-- 3. Policies for conversation_members
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group admins and members can delete members" ON public.conversation_members;
CREATE POLICY "Group admins and members can delete members" ON public.conversation_members
  FOR DELETE
  TO authenticated
  USING (
    -- User is leaving the group themselves
    user_id = auth.uid()
    OR
    -- User is the initiator of the conversation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_members.conversation_id AND c.initiator_id = auth.uid()
    )
    -- User is a group admin/owner
    OR public.is_group_admin(conversation_members.conversation_id, auth.uid())
    -- User is a school representative/admin
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.user_type = 'school_representative' 
        OR p.platform_role = 'school_admin'
      )
    )
  );
