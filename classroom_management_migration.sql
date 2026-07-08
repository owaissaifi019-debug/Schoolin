-- ============================================================
-- CLASSROOM OWNERSHIP & TEACHER TRANSFER SYSTEM SCHEMA
-- ============================================================

-- 1. Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- e.g., "2024-25", "2025-26", "2026-27"
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academic_years_school_name_unique UNIQUE (school_id, name)
);

-- 2. Classrooms Table
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE NOT NULL,
  grade text NOT NULL, -- e.g., "Class IX", "Class X"
  section text NOT NULL, -- e.g., "A", "B"
  room text, -- e.g., "Room 102"
  is_archived boolean DEFAULT false,
  capacity integer DEFAULT 40,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classrooms_school_year_grade_section_unique UNIQUE (school_id, academic_year_id, grade, section)
);

-- 3. Classroom Teacher Assignments Table (Audit History & Temp Roles)
CREATE TABLE IF NOT EXISTS public.classroom_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assignment_type text NOT NULL DEFAULT 'permanent' CHECK (assignment_type IN ('permanent', 'temporary')),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone, -- NULL for permanent assignments
  is_active boolean DEFAULT true,
  reason text, -- For temporary assignments
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Classroom Subject Teacher Assignments Table
CREATE TABLE IF NOT EXISTS public.classroom_subject_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL, -- e.g., "Mathematics", "Physics"
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classroom_subject_teachers_unique UNIQUE (classroom_id, teacher_id, subject)
);

-- 5. Classroom Students Table
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  roll_number text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classroom_students_unique UNIQUE (classroom_id, student_id)
);

-- 6. Add is_class_teacher Designation Column to school_members
ALTER TABLE public.school_members ADD COLUMN IF NOT EXISTS is_class_teacher boolean DEFAULT true;

-- ── Enable Row Level Security ──
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──

-- Everyone can read academic sessions & classrooms (restricted to their school)
DROP POLICY IF EXISTS "Academic sessions are viewable by everyone" ON public.academic_years;
CREATE POLICY "Academic sessions are viewable by everyone" ON public.academic_years FOR SELECT USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Classrooms are viewable by everyone" ON public.classrooms;
CREATE POLICY "Classrooms are viewable by everyone" ON public.classrooms FOR SELECT USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

-- School admins can manage academic years
DROP POLICY IF EXISTS "School admins can manage academic years" ON public.academic_years;
CREATE POLICY "School admins can manage academic years" ON public.academic_years
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = academic_years.school_id AND schools.admin_user_id = auth.uid())
  );

-- School admins can manage classrooms
DROP POLICY IF EXISTS "School admins can manage classrooms" ON public.classrooms;
CREATE POLICY "School admins can manage classrooms" ON public.classrooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = classrooms.school_id AND schools.admin_user_id = auth.uid())
  );

-- Teacher assignments are viewable by everyone in the school (restricted to their school)
DROP POLICY IF EXISTS "Teacher assignments are viewable by everyone" ON public.classroom_teacher_assignments;
CREATE POLICY "Teacher assignments are viewable by everyone" ON public.classroom_teacher_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_teacher_assignments.classroom_id
      AND c.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- School admins can manage teacher assignments
DROP POLICY IF EXISTS "School admins can manage teacher assignments" ON public.classroom_teacher_assignments;
CREATE POLICY "School admins can manage teacher assignments" ON public.classroom_teacher_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      JOIN public.schools s ON s.id = c.school_id
      WHERE c.id = classroom_teacher_assignments.classroom_id
        AND s.admin_user_id = auth.uid()
    )
  );

-- Subject teachers mapping viewable by everyone (restricted to their school)
DROP POLICY IF EXISTS "Subject teachers are viewable by everyone" ON public.classroom_subject_teachers;
CREATE POLICY "Subject teachers are viewable by everyone" ON public.classroom_subject_teachers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_subject_teachers.classroom_id
      AND c.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- School admins can manage subject teachers
DROP POLICY IF EXISTS "School admins can manage subject teachers" ON public.classroom_subject_teachers;
CREATE POLICY "School admins can manage subject teachers" ON public.classroom_subject_teachers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      JOIN public.schools s ON s.id = c.school_id
      WHERE c.id = classroom_subject_teachers.classroom_id
        AND s.admin_user_id = auth.uid()
    )
  );

-- Classroom students viewable by everyone (restricted to their school)
DROP POLICY IF EXISTS "Classroom students are viewable by everyone" ON public.classroom_students;
CREATE POLICY "Classroom students are viewable by everyone" ON public.classroom_students FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_students.classroom_id
      AND c.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- School admins can manage classroom students
DROP POLICY IF EXISTS "School admins can manage classroom students" ON public.classroom_students;
CREATE POLICY "School admins can manage classroom students" ON public.classroom_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      JOIN public.schools s ON s.id = c.school_id
      WHERE c.id = classroom_students.classroom_id
        AND s.admin_user_id = auth.uid()
    )
  );

