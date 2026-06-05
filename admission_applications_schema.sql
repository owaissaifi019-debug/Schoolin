-- ============================================================
-- ADMISSION APPLICATIONS SYSTEM SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  applicant_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  parent_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  grade_applied text NOT NULL,
  previous_school text,
  dob date,
  address text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

-- DROP Policies if they already exist
DROP POLICY IF EXISTS "Anyone can submit admission applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.admission_applications;
DROP POLICY IF EXISTS "School admins can view their applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Super admins can view all applications" ON public.admission_applications;
DROP POLICY IF EXISTS "School admins can update application status" ON public.admission_applications;
DROP POLICY IF EXISTS "Super admins can update/delete any application" ON public.admission_applications;

-- 1. Anyone (authenticated user) can insert their own application
CREATE POLICY "Anyone can submit admission applications"
  ON public.admission_applications FOR INSERT
  WITH CHECK (true);

-- 2. Users can view their own submitted applications
CREATE POLICY "Users can view their own applications"
  ON public.admission_applications FOR SELECT
  USING (auth.uid() = applicant_user_id);

-- 3. School admins can view/select applications for their own school
CREATE POLICY "School admins can view their applications"
  ON public.admission_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = admission_applications.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- 4. Super admins can view all applications
CREATE POLICY "Super admins can view all applications"
  ON public.admission_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- 5. School admins can update status of applications for their own school
CREATE POLICY "School admins can update application status"
  ON public.admission_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = admission_applications.school_id
      AND schools.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = admission_applications.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- 6. Super admins can update/delete any application
CREATE POLICY "Super admins can update/delete any application"
  ON public.admission_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );
