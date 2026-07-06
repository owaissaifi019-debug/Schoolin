-- =====================================================================
-- CAMPUSLINK CONVERSATION ENGINE - AUTOMATIC TRIGGERS (Phase 4D)
-- =====================================================================

-- ── 1. AUTOMATIC CONVERSATION CREATION ON CLASSROOM INSERT ─────────────
CREATE OR REPLACE FUNCTION trigger_create_classroom_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
  v_school_name VARCHAR(255);
BEGIN
  -- Fetch school details for name
  SELECT name INTO v_school_name FROM profiles WHERE id = NEW.school_id;
  IF v_school_name IS NULL THEN
    v_school_name := 'School';
  END IF;

  -- 1. Create Classroom Conversation
  INSERT INTO conversations (
    school_id,
    classroom_id,
    academic_year_id,
    name,
    description,
    type,
    is_archived
  ) VALUES (
    NEW.school_id,
    NEW.id,
    NEW.academic_year_id,
    'Class ' || NEW.class_id || '-' || NEW.section_id,
    'Official communication channel for Class ' || NEW.class_id || '-' || NEW.section_id || ' (' || v_school_name || ')',
    'CLASSROOM',
    FALSE
  ) RETURNING id INTO v_conv_id;

  -- 2. Create Default Permission Settings
  INSERT INTO conversation_settings (
    conversation_id,
    send_messages_threshold,
    edit_info_threshold,
    change_photo_threshold,
    pin_messages_threshold,
    add_members_threshold,
    remove_members_threshold,
    mention_everyone_threshold,
    delete_messages_threshold
  ) VALUES (
    v_conv_id,
    'Member',      -- Everyone/Members can message by default
    'Admin',       -- Only admins (teachers) can edit info
    'Admin',
    'Moderator',   -- Moderators or higher can pin messages
    'Admin',
    'Admin',
    'Moderator',
    'Admin'
  );

  -- 3. Log System Announcement in Message Timeline
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    metadata
  ) VALUES (
    v_conv_id,
    NULL, -- SYSTEM
    'Welcome to the Classroom Channel! Communication settings initialized.',
    'SYSTEM',
    json_build_object('event', 'CHANNEL_CREATED')
  );

  -- 4. Automatically add School Representative (Owner) as a member
  INSERT INTO conversation_members (
    conversation_id,
    user_id,
    role
  ) VALUES (
    v_conv_id,
    NEW.school_id, -- Rep's user profile ID matches school ID
    'Owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_classroom_created
  AFTER INSERT ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_classroom_conversation();


-- ── 2. AUTOMATIC MEMBER ASSIGNMENT ON STUDENT CLASS REGISTRATION ───────
CREATE OR REPLACE FUNCTION trigger_sync_student_conversation_membership()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Find conversation ID associated with classroom
  SELECT id INTO v_conv_id FROM conversations WHERE classroom_id = NEW.classroom_id LIMIT 1;
  
  IF v_conv_id IS NOT NULL THEN
    -- If student is verified/active, add them
    IF NEW.status = 'active' THEN
      INSERT INTO conversation_members (conversation_id, user_id, role)
      VALUES (v_conv_id, NEW.user_id, 'Member')
      ON CONFLICT (conversation_id, user_id) WHERE left_at IS NULL DO NOTHING;

      -- Post system message
      INSERT INTO messages (conversation_id, sender_id, content, type, metadata)
      VALUES (
        v_conv_id, 
        NULL, 
        'Student ' || (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' joined the channel.',
        'SYSTEM', 
        json_build_object('event', 'MEMBER_JOIN', 'user_id', NEW.user_id)
      );

    -- If student status changed to suspended, restrict to ReadOnly
    ELSIF NEW.status = 'suspended' THEN
      UPDATE conversation_members
      SET role = 'ReadOnly'
      WHERE conversation_id = v_conv_id AND user_id = NEW.user_id AND left_at IS NULL;

      INSERT INTO messages (conversation_id, sender_id, content, type, metadata)
      VALUES (
        v_conv_id, 
        NULL, 
        'Access restricted for ' || (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' (Suspended).',
        'SYSTEM', 
        json_build_object('event', 'MEMBER_RESTRICT', 'user_id', NEW.user_id)
      );

    -- If transferred or inactive, remove them (set left_at)
    ELSIF NEW.status IN ('transferred', 'graduated', 'inactive') THEN
      UPDATE conversation_members
      SET left_at = NOW()
      WHERE conversation_id = v_conv_id AND user_id = NEW.user_id AND left_at IS NULL;

      INSERT INTO messages (conversation_id, sender_id, content, type, metadata)
      VALUES (
        v_conv_id, 
        NULL, 
        (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' left the channel.',
        'SYSTEM', 
        json_build_object('event', 'MEMBER_LEAVE', 'user_id', NEW.user_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Assuming a student mapping table exists, e.g. student_classroom_mappings
CREATE TRIGGER trg_student_mapping_sync
  AFTER INSERT OR UPDATE OF status ON student_classroom_mappings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_student_conversation_membership();


-- ── 3. AUTOMATIC CONVERSATION ARCHIVE ON CLASSROOM DELETE ──────────────
CREATE OR REPLACE FUNCTION trigger_archive_classroom_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the conversation as archived instead of deleting it, preserving history
  UPDATE conversations
  SET is_archived = TRUE
  WHERE classroom_id = OLD.id;

  -- Append announcement in timeline
  INSERT INTO messages (conversation_id, sender_id, content, type, metadata)
  SELECT 
    id, 
    NULL, 
    'This classroom has been deleted/closed. The channel has been archived and history preserved.', 
    'SYSTEM', 
    json_build_object('event', 'CHANNEL_ARCHIVED')
  FROM conversations 
  WHERE classroom_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_classroom_deleted
  BEFORE DELETE ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_archive_classroom_conversation();
