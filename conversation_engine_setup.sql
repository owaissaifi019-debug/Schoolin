-- =====================================================================
-- CAMPUSLINK CONVERSATION ENGINE – COMPLETE SETUP (Schema + RLS)
-- Run THIS single file in Supabase SQL Editor.
-- Combines conversation_schema.sql + conversation_rls.sql in safe order.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- PART 1: TABLES (must exist before RLS or any ALTER TABLE)
-- =====================================================================

-- 1. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL,
  classroom_id     UUID        NULL,
  academic_year_id UUID        NULL,
  name             VARCHAR(255) NOT NULL,
  description      TEXT        NULL,
  avatar_url       TEXT        NULL,
  type             VARCHAR(50) NOT NULL,
  is_archived      BOOLEAN     DEFAULT FALSE NOT NULL,
  created_by       UUID        NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_conversation_type CHECK (type IN (
    'SCHOOL','CLASSROOM','DIRECT_MESSAGE','PARENT','TEACHER','CLUB','SYSTEM'
  ))
);

-- Add missing columns if conversations table already existed from an earlier migration
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS name             VARCHAR(255) NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS type             VARCHAR(50) NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS classroom_id     UUID        NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS academic_year_id UUID        NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS description      TEXT        NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS avatar_url       TEXT        NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_archived      BOOLEAN     DEFAULT FALSE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by       UUID        NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Update existing NULL types and names to direct messaging defaults so constraints don't fail
UPDATE public.conversations SET type = 'DIRECT_MESSAGE' WHERE type IS NULL;
UPDATE public.conversations SET name = 'Direct Message' WHERE name IS NULL;

-- Safely apply check constraints to conversations
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS chk_conversation_type;
ALTER TABLE public.conversations ADD CONSTRAINT chk_conversation_type CHECK (type IN (
  'SCHOOL','CLASSROOM','DIRECT_MESSAGE','PARENT','TEACHER','CLUB','SYSTEM'
));

CREATE INDEX IF NOT EXISTS idx_conversations_school ON public.conversations(school_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type   ON public.conversations(type);
-- Partial index on classroom_id only created after column guaranteed to exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'conversations'
      AND indexname  = 'idx_conversations_classroom'
  ) THEN
    EXECUTE 'CREATE INDEX idx_conversations_classroom ON public.conversations(classroom_id) WHERE classroom_id IS NOT NULL';
  END IF;
END $$;


-- 2. CONVERSATION MEMBERS  ← was missing when RLS ran
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL,
  role            VARCHAR(50) DEFAULT 'Member' NOT NULL,
  joined_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at         TIMESTAMPTZ NULL,
  unread_count    INT         DEFAULT 0 NOT NULL,
  is_muted        BOOLEAN     DEFAULT FALSE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_member_role CHECK (role IN ('Owner','Admin','Moderator','Member','ReadOnly')),
  CONSTRAINT unique_active_member UNIQUE (conversation_id, user_id)
);

-- Add missing columns if conversation_members already existed
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS left_at      TIMESTAMPTZ NULL;
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS unread_count INT         DEFAULT 0;
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS is_muted     BOOLEAN     DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conv_members_user   ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_lookup ON public.conversation_members(conversation_id, user_id);


-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id         UUID        NULL,
  content           TEXT        NOT NULL,
  type              VARCHAR(50) DEFAULT 'TEXT' NOT NULL,
  metadata          JSONB       NULL,
  parent_message_id UUID        NULL REFERENCES public.messages(id),
  edited_at         TIMESTAMPTZ NULL,
  edited_by         UUID        NULL,
  deleted_at        TIMESTAMPTZ NULL,
  deleted_by        UUID        NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_message_type CHECK (type IN (
    'TEXT','IMAGE','VIDEO','DOCUMENT','VOICE','LOCATION',
    'SYSTEM','HOMEWORK','ATTENDANCE','EVENT','POLL','AI'
  ))
);

-- Add missing columns if messages already existed
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content           TEXT        NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type              VARCHAR(50) NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata          JSONB       NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS parent_message_id UUID        NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at         TIMESTAMPTZ NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_by         UUID        NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by        UUID        NULL;

-- Migrate legacy message column data to content, and set default type to TEXT
UPDATE public.messages SET content = message WHERE content IS NULL AND message IS NOT NULL;
UPDATE public.messages SET type = 'TEXT' WHERE type IS NULL;

-- Safely apply constraints to messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS chk_message_type;
ALTER TABLE public.messages ADD CONSTRAINT chk_message_type CHECK (type IN (
  'TEXT','IMAGE','VIDEO','DOCUMENT','VOICE','LOCATION',
  'SYSTEM','HOMEWORK','ATTENDANCE','EVENT','POLL','AI'
));

CREATE INDEX IF NOT EXISTS idx_messages_timeline ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON public.messages(sender_id);


-- 4. MESSAGE READS
CREATE TABLE IF NOT EXISTS public.message_reads (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  read_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_message_user_read UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_lookup ON public.message_reads(message_id, user_id);


-- 5. MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  emoji      VARCHAR(50) NOT NULL,
  CONSTRAINT unique_message_user_emoji UNIQUE(message_id, user_id, emoji)
);


-- 6. MESSAGE MENTIONS
CREATE TABLE IF NOT EXISTS public.message_mentions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  CONSTRAINT unique_message_user_mention UNIQUE(message_id, user_id)
);


-- 7. CONVERSATION SETTINGS
CREATE TABLE IF NOT EXISTS public.conversation_settings (
  id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id             UUID        NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  send_messages_threshold     VARCHAR(50) DEFAULT 'Member'    NOT NULL,
  edit_info_threshold         VARCHAR(50) DEFAULT 'Admin'     NOT NULL,
  change_photo_threshold      VARCHAR(50) DEFAULT 'Admin'     NOT NULL,
  pin_messages_threshold      VARCHAR(50) DEFAULT 'Moderator' NOT NULL,
  add_members_threshold       VARCHAR(50) DEFAULT 'Admin'     NOT NULL,
  remove_members_threshold    VARCHAR(50) DEFAULT 'Admin'     NOT NULL,
  mention_everyone_threshold  VARCHAR(50) DEFAULT 'Moderator' NOT NULL,
  delete_messages_threshold   VARCHAR(50) DEFAULT 'Admin'     NOT NULL,
  created_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- 8. CONVERSATION PINS
CREATE TABLE IF NOT EXISTS public.conversation_pins (
  id              UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID  NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id      UUID  NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by       UUID  NOT NULL,
  pin_order       INT   NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_conversation_pinned_message UNIQUE(conversation_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_pins_order ON public.conversation_pins(conversation_id, pin_order ASC);


-- 9. CONVERSATION AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.conversation_audit_logs (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID         NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  actor_id        UUID         NULL,
  action          VARCHAR(100) NOT NULL,
  details         JSONB        NULL,
  created_at      TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conv_audit_timeline ON public.conversation_audit_logs(conversation_id, created_at DESC);


-- =====================================================================
-- PART 2: HELPER FUNCTIONS (needed by RLS policies)
-- =====================================================================

-- BUG FIX: The original function had a parameter name collision:
--   WHERE user_id = user_id  ← always TRUE (compares column to itself)
-- Fixed by renaming the parameter to p_user_id.
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id
      AND user_id = p_user_id
      AND left_at IS NULL
  );
END;
$$;

-- BUG FIX: Same parameter name collision fixed here too.
CREATE OR REPLACE FUNCTION public.get_conversation_member_role(conv_id UUID, p_user_id UUID)
RETURNS VARCHAR SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  m_role VARCHAR;
BEGIN
  SELECT role INTO m_role
  FROM public.conversation_members
  WHERE conversation_id = conv_id
    AND user_id = p_user_id
    AND left_at IS NULL;
  RETURN m_role;
END;
$$;


-- =====================================================================
-- PART 3: ENABLE ROW LEVEL SECURITY (after tables exist)
-- =====================================================================

ALTER TABLE public.conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_pins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_audit_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- PART 4: RLS POLICIES (idempotent – drops before re-creating)
-- =====================================================================

-- ── conversations ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS school_rep_conversations    ON public.conversations;
DROP POLICY IF EXISTS member_select_conversations ON public.conversations;

-- School Reps / Admins: full access
CREATE POLICY school_rep_conversations ON public.conversations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = conversations.school_id
        AND sm.role IN ('admin','owner','school_admin','school_representative')
    )
  );

-- Members: read active conversations they belong to
CREATE POLICY member_select_conversations ON public.conversations
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(conversations.id, auth.uid())
    AND conversations.is_archived = FALSE
  );


-- ── conversation_members ───────────────────────────────────────────────

DROP POLICY IF EXISTS school_rep_members     ON public.conversation_members;
DROP POLICY IF EXISTS member_select_members  ON public.conversation_members;

CREATE POLICY school_rep_members ON public.conversation_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.school_members sm ON sm.school_id = c.school_id
      WHERE c.id = conversation_members.conversation_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('admin','owner','school_admin','school_representative')
    )
  );

CREATE POLICY member_select_members ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  );


-- ── messages ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS school_rep_messages    ON public.messages;
DROP POLICY IF EXISTS member_select_messages ON public.messages;
DROP POLICY IF EXISTS member_insert_messages ON public.messages;
DROP POLICY IF EXISTS sender_modify_messages ON public.messages;

CREATE POLICY school_rep_messages ON public.messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.school_members sm ON sm.school_id = c.school_id
      WHERE c.id = messages.conversation_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('admin','owner','school_admin','school_representative')
    )
  );

CREATE POLICY member_select_messages ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(messages.conversation_id, auth.uid())
  );

CREATE POLICY member_insert_messages ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_conversation_member(messages.conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.is_archived = FALSE
    )
  );

-- Soft-delete / edit own messages only
CREATE POLICY sender_modify_messages ON public.messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.is_archived = FALSE
    )
  );


-- ── message_reads / reactions / mentions ───────────────────────────────

DROP POLICY IF EXISTS member_all_reads     ON public.message_reads;
DROP POLICY IF EXISTS member_all_reactions ON public.message_reactions;
DROP POLICY IF EXISTS member_all_mentions  ON public.message_mentions;

CREATE POLICY member_all_reads ON public.message_reads
  FOR ALL TO authenticated
  USING (
    public.is_conversation_member(
      (SELECT conversation_id FROM public.messages WHERE messages.id = message_reads.message_id),
      auth.uid()
    )
  );

CREATE POLICY member_all_reactions ON public.message_reactions
  FOR ALL TO authenticated
  USING (
    public.is_conversation_member(
      (SELECT conversation_id FROM public.messages WHERE messages.id = message_reactions.message_id),
      auth.uid()
    )
  );

CREATE POLICY member_all_mentions ON public.message_mentions
  FOR ALL TO authenticated
  USING (
    public.is_conversation_member(
      (SELECT conversation_id FROM public.messages WHERE messages.id = message_mentions.message_id),
      auth.uid()
    )
  );


-- ── conversation_settings ──────────────────────────────────────────────

DROP POLICY IF EXISTS school_rep_settings    ON public.conversation_settings;
DROP POLICY IF EXISTS member_select_settings ON public.conversation_settings;

CREATE POLICY school_rep_settings ON public.conversation_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.school_members sm ON sm.school_id = c.school_id
      WHERE c.id = conversation_settings.conversation_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('admin','owner','school_admin','school_representative')
    )
  );

CREATE POLICY member_select_settings ON public.conversation_settings
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(conversation_settings.conversation_id, auth.uid())
  );


-- ── conversation_pins & audit_logs ─────────────────────────────────────

DROP POLICY IF EXISTS member_pins         ON public.conversation_pins;
DROP POLICY IF EXISTS member_select_audit ON public.conversation_audit_logs;

CREATE POLICY member_pins ON public.conversation_pins
  FOR ALL TO authenticated
  USING (
    public.is_conversation_member(conversation_pins.conversation_id, auth.uid())
  );

CREATE POLICY member_select_audit ON public.conversation_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(conversation_audit_logs.conversation_id, auth.uid())
  );
