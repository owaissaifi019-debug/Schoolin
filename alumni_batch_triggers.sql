-- ============================================================
-- CampusLink – Alumni Batch Management Triggers
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Trigger for update timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_timestamp_alumni_batches ON public.alumni_batches;
CREATE TRIGGER tr_update_timestamp_alumni_batches
  BEFORE UPDATE ON public.alumni_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();

DROP TRIGGER IF EXISTS tr_update_timestamp_alumni_requests ON public.alumni_requests;
CREATE TRIGGER tr_update_timestamp_alumni_requests
  BEFORE UPDATE ON public.alumni_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


-- 2. Trigger function to handle Alumni Request Approvals
CREATE OR REPLACE FUNCTION public.handle_alumni_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if request is being updated to approved
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    
    -- A. Update the User's Profile
    UPDATE public.profiles
    SET 
      user_type = 'alumni',
      school_id = NEW.school_id,
      passing_year = NEW.passing_year,
      department = NEW.department
    WHERE id = NEW.user_id;

    -- B. Join Alumni Community (Insert or Update school_members)
    INSERT INTO public.school_members (school_id, user_id, role, assigned_by)
    VALUES (NEW.school_id, NEW.user_id, 'alumni', auth.uid())
    ON CONFLICT (school_id, user_id) 
    DO UPDATE SET 
      role = 'alumni',
      assigned_by = COALESCE(auth.uid(), school_members.assigned_by),
      assigned_at = NOW();

    -- C. Join Alumni Batch (Insert into alumni_members)
    IF NEW.batch_id IS NOT NULL THEN
      INSERT INTO public.alumni_members (school_id, batch_id, user_id, joined_at)
      VALUES (NEW.school_id, NEW.batch_id, NEW.user_id, NOW())
      ON CONFLICT (batch_id, user_id) DO NOTHING;
    END IF;

    -- D. Increment uses_count on the Invitation link used
    IF NEW.invite_id IS NOT NULL THEN
      UPDATE public.alumni_invites
      SET uses_count = uses_count + 1
      WHERE id = NEW.invite_id;
    END IF;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind request trigger
DROP TRIGGER IF EXISTS tr_on_alumni_request_status_change ON public.alumni_requests;
CREATE TRIGGER tr_on_alumni_request_status_change
  AFTER UPDATE ON public.alumni_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_alumni_request_status_change();
