-- ============================================================
-- SCHOOL VERIFIED MEMBERS SYSTEM
-- Allows schools to assign roles to their connected users
-- ============================================================

-- Create school_members table
CREATE TABLE IF NOT EXISTS public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN (
    'student', 'teacher', 'alumni', 'staff', 'faculty', 'counselor'
  )),
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT school_members_unique UNIQUE (school_id, user_id)
);

-- Enable RLS
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──

-- Anyone can read members (public profiles)
CREATE POLICY "School members are viewable by everyone"
  ON public.school_members FOR SELECT
  USING (true);

-- School admin can add members
CREATE POLICY "School admins can add members"
  ON public.school_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_members.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admin can update member roles
CREATE POLICY "School admins can update members"
  ON public.school_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_members.school_id
      AND schools.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_members.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admin can remove members
CREATE POLICY "School admins can remove members"
  ON public.school_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_members.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- Super admins can manage all members (SELECT/INSERT/UPDATE/DELETE)
CREATE POLICY "Super admins can manage all school members"
  ON public.school_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- ── Triggers: Sync profiles.school_id ──

-- On INSERT: set user's school_id if not already set
CREATE OR REPLACE FUNCTION public.sync_school_member_insert()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET school_id = NEW.school_id
  WHERE id = NEW.user_id AND school_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_sync_school_member_insert
  AFTER INSERT ON public.school_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_school_member_insert();

-- On DELETE: clear user's school_id (only if it matches the removed school)
CREATE OR REPLACE FUNCTION public.sync_school_member_delete()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET school_id = NULL
  WHERE id = OLD.user_id AND school_id = OLD.school_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_sync_school_member_delete
  AFTER DELETE ON public.school_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_school_member_delete();
