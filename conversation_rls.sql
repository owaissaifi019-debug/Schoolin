-- =====================================================================
-- CAMPUSLINK CONVERSATION ENGINE - ROW LEVEL SECURITY (RLS) (Phase 4D)
-- =====================================================================

-- Enable RLS across all conversation engine tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the user is a member of a conversation
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members 
    WHERE conversation_id = conv_id 
      AND user_id = user_id 
      AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to fetch the role of a user in a conversation
CREATE OR REPLACE FUNCTION get_conversation_member_role(conv_id UUID, user_id UUID)
RETURNS VARCHAR SECURITY DEFINER AS $$
DECLARE
  m_role VARCHAR;
BEGIN
  SELECT role INTO m_role 
  FROM conversation_members 
  WHERE conversation_id = conv_id 
    AND user_id = user_id 
    AND left_at IS NULL;
  RETURN m_role;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. POLICIES FOR conversations
-- ==========================================

-- School Reps: Full read/write access to all school conversations
CREATE POLICY school_rep_conversations ON conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.user_type = 'school_representative' 
        AND profiles.id = conversations.school_id
    )
  );

-- Teachers/Students: Read active conversation channels where they are members
CREATE POLICY member_select_conversations ON conversations
  FOR SELECT
  USING (
    is_conversation_member(conversations.id, auth.uid())
  );


-- ==========================================
-- 2. POLICIES FOR conversation_members
-- ==========================================

CREATE POLICY school_rep_members ON conversation_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_members.conversation_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'school_representative' 
            AND profiles.id = conversations.school_id
        )
    )
  );

CREATE POLICY member_select_members ON conversation_members
  FOR SELECT
  USING (
    is_conversation_member(conversation_members.conversation_id, auth.uid())
  );


-- ==========================================
-- 3. POLICIES FOR messages
-- ==========================================

-- School Reps: Manage all messages inside their school conversations
CREATE POLICY school_rep_messages ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'school_representative' 
            AND profiles.id = conversations.school_id
        )
    )
  );

-- Members: Read messages in joined conversations
CREATE POLICY member_select_messages ON messages
  FOR SELECT
  USING (
    is_conversation_member(messages.conversation_id, auth.uid())
  );

-- Members: Insert messages in joined conversations (if not archived and meets settings permission rank)
CREATE POLICY member_insert_messages ON messages
  FOR INSERT
  WITH CHECK (
    is_conversation_member(messages.conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND conversations.is_archived = FALSE
    )
  );

-- Members: Soft-delete/Edit own messages
CREATE POLICY sender_modify_messages ON messages
  FOR UPDATE
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND conversations.is_archived = FALSE
    )
  );


-- ==========================================
-- 4. POLICIES FOR message_reads, message_reactions, message_mentions
-- ==========================================

CREATE POLICY member_all_reads ON message_reads
  FOR ALL
  USING (
    is_conversation_member((SELECT conversation_id FROM messages WHERE messages.id = message_reads.message_id), auth.uid())
  );

CREATE POLICY member_all_reactions ON message_reactions
  FOR ALL
  USING (
    is_conversation_member((SELECT conversation_id FROM messages WHERE messages.id = message_reactions.message_id), auth.uid())
  );

CREATE POLICY member_all_mentions ON message_mentions
  FOR ALL
  USING (
    is_conversation_member((SELECT conversation_id FROM messages WHERE messages.id = message_mentions.message_id), auth.uid())
  );


-- ==========================================
-- 5. POLICIES FOR conversation_settings
-- ==========================================

-- School Reps: Configure settings
CREATE POLICY school_rep_settings ON conversation_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_settings.conversation_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'school_representative' 
            AND profiles.id = conversations.school_id
        )
    )
  );

-- Members: Select settings of joined conversations
CREATE POLICY member_select_settings ON conversation_settings
  FOR SELECT
  USING (
    is_conversation_member(conversation_settings.conversation_id, auth.uid())
  );


-- ==========================================
-- 6. POLICIES FOR conversation_pins & conversation_audit_logs
-- ==========================================

CREATE POLICY member_pins ON conversation_pins
  FOR ALL
  USING (
    is_conversation_member(conversation_pins.conversation_id, auth.uid())
  );

CREATE POLICY member_select_audit ON conversation_audit_logs
  FOR SELECT
  USING (
    is_conversation_member(conversation_audit_logs.conversation_id, auth.uid())
  );
