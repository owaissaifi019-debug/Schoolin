-- =====================================================================
-- CAMPUSLINK CONVERSATION ENGINE - DATABASE SCHEMA (Phase 4D)
-- =====================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONVERSATIONS MASTER TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL, -- References profiles/schools
  classroom_id UUID NULL, -- References classrooms (NULL for DMs, School Community, etc.)
  academic_year_id UUID NULL, -- References academic_years
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  avatar_url TEXT NULL,
  type VARCHAR(50) NOT NULL, -- 'SCHOOL', 'CLASSROOM', 'DIRECT_MESSAGE', 'PARENT', 'TEACHER', 'CLUB', 'SYSTEM'
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_conversation_type CHECK (type IN ('SCHOOL', 'CLASSROOM', 'DIRECT_MESSAGE', 'PARENT', 'TEACHER', 'CLUB', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_school ON conversations(school_id);
CREATE INDEX IF NOT EXISTS idx_conversations_classroom ON conversations(classroom_id) WHERE classroom_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- 2. CONVERSATION MEMBERS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL, -- References profiles(id)
  role VARCHAR(50) DEFAULT 'Member' NOT NULL, -- 'Owner', 'Admin', 'Moderator', 'Member', 'ReadOnly'
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at TIMESTAMPTZ NULL, -- Null if currently a member
  unread_count INT DEFAULT 0 NOT NULL,
  is_muted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_member_role CHECK (role IN ('Owner', 'Admin', 'Moderator', 'Member', 'ReadOnly')),
  CONSTRAINT unique_active_member UNIQUE (conversation_id, user_id) WHERE left_at IS NULL
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_lookup ON conversation_members(conversation_id, user_id);

-- 3. UNIFIED TIMELINE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NULL, -- References profiles(id). NULL denotes SYSTEM messages
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'TEXT' NOT NULL, -- 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE', 'LOCATION', 'SYSTEM', 'HOMEWORK', 'ATTENDANCE', 'EVENT', 'POLL', 'AI'
  metadata JSONB NULL, -- Flexible payload mapping (homework_id, file_url, system_action)
  parent_message_id UUID REFERENCES messages(id) NULL, -- For nesting replies
  edited_at TIMESTAMPTZ NULL,
  edited_by UUID NULL,
  deleted_at TIMESTAMPTZ NULL, -- Soft delete support
  deleted_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_message_type CHECK (type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE', 'LOCATION', 'SYSTEM', 'HOMEWORK', 'ATTENDANCE', 'EVENT', 'POLL', 'AI'))
);

CREATE INDEX IF NOT EXISTS idx_messages_timeline ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- 4. MESSAGE READ RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL, -- References profiles(id)
  read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_message_user_read UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_lookup ON message_reads(message_id, user_id);

-- 5. MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  emoji VARCHAR(50) NOT NULL,
  CONSTRAINT unique_message_user_emoji UNIQUE(message_id, user_id, emoji)
);

-- 6. MESSAGE MENTIONS TABLE
CREATE TABLE IF NOT EXISTS message_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  CONSTRAINT unique_message_user_mention UNIQUE(message_id, user_id)
);

-- 7. CONVERSATION SETTINGS (PERMISSIONS) TABLE
CREATE TABLE IF NOT EXISTS conversation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  send_messages_threshold VARCHAR(50) DEFAULT 'Member' NOT NULL, -- 'Everyone', 'Member', 'Moderator', 'Admin', 'Owner'
  edit_info_threshold VARCHAR(50) DEFAULT 'Admin' NOT NULL,
  change_photo_threshold VARCHAR(50) DEFAULT 'Admin' NOT NULL,
  pin_messages_threshold VARCHAR(50) DEFAULT 'Moderator' NOT NULL,
  add_members_threshold VARCHAR(50) DEFAULT 'Admin' NOT NULL,
  remove_members_threshold VARCHAR(50) DEFAULT 'Admin' NOT NULL,
  mention_everyone_threshold VARCHAR(50) DEFAULT 'Moderator' NOT NULL,
  delete_messages_threshold VARCHAR(50) DEFAULT 'Admin' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_send_threshold CHECK (send_messages_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_edit_threshold CHECK (edit_info_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_photo_threshold CHECK (change_photo_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_pin_threshold CHECK (pin_messages_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_add_threshold CHECK (add_members_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_remove_threshold CHECK (remove_members_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_mention_threshold CHECK (mention_everyone_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner')),
  CONSTRAINT chk_delete_threshold CHECK (delete_messages_threshold IN ('Everyone', 'Member', 'Moderator', 'Admin', 'Owner'))
);

-- 8. CONVERSATION PINS TABLE
CREATE TABLE IF NOT EXISTS conversation_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  pinned_by UUID NOT NULL,
  pin_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_conversation_pinned_message UNIQUE(conversation_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_pins_order ON conversation_pins(conversation_id, pin_order ASC);

-- 9. CONVERSATION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS conversation_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conv_audit_timeline ON conversation_audit_logs(conversation_id, created_at DESC);
