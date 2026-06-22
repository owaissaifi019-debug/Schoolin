-- ============================================================
-- EVENT REGISTRATIONS SYSTEM SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL, -- Hosting school
  student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Student's profile ID
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_phone text NOT NULL,
  student_grade text NOT NULL,
  student_school_name text NOT NULL,
  student_school_board text,
  student_school_city text,
  is_team boolean NOT NULL DEFAULT false,
  team_name text,
  team_size integer,
  team_members text, -- Description/details of other team members
  competition_category text NOT NULL,
  project_details text, -- Synopsis, video links, etc.
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- DROP Policies if they already exist
DROP POLICY IF EXISTS "Anyone can submit event registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "School admins can view registrations for their school" ON public.event_registrations;
DROP POLICY IF EXISTS "Super admins can view all registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "School admins can update registration status" ON public.event_registrations;
DROP POLICY IF EXISTS "Super admins can update/delete any registration" ON public.event_registrations;

-- 1. Anyone (authenticated user) can insert their own registration
CREATE POLICY "Anyone can submit event registrations"
  ON public.event_registrations FOR INSERT
  WITH CHECK (true);

-- 2. Users can view their own submitted registrations
CREATE POLICY "Users can view their own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = student_id);

-- 3. School admins can view registrations for events hosted by their school
CREATE POLICY "School admins can view registrations for their school"
  ON public.event_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = event_registrations.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- 4. Super admins can view all registrations
CREATE POLICY "Super admins can view all registrations"
  ON public.event_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- 5. School admins can update status of registrations for events hosted by their school
CREATE POLICY "School admins can update registration status"
  ON public.event_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = event_registrations.school_id
      AND schools.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = event_registrations.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- 6. Super admins can update/delete any registration
CREATE POLICY "Super admins can update/delete any registration"
  ON public.event_registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );
