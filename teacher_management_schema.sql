-- =========================================================================
-- CampusLink School Management System
-- Phase 2 – Teacher Management Foundation Schema
-- Database migrations for teachers, verification, and academic assignments.
-- =========================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TEACHERS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    user_id UUID, -- Optional link to platform user profiles table
    employee_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    qualification TEXT,
    experience INTEGER DEFAULT 0,
    department VARCHAR(100),
    joining_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_school_employee UNIQUE (school_id, employee_id),
    CONSTRAINT unique_school_username UNIQUE (school_id, username),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indices for Lookup Performance
CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_username ON public.teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON public.teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_verification ON public.teachers(verification_status);

-- =========================================================================
-- 2. TEACHER ACADEMIC ASSIGNMENTS TABLE
-- =========================================================================
-- Relates teachers to specific classes and subjects
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    class_id UUID NOT NULL,
    subject_id UUID, -- NULL means they are assigned as class teacher/general duties for the class
    is_class_teacher BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_assignment UNIQUE (school_id, teacher_id, class_id, subject_id),
    CONSTRAINT fk_assignment_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- Indices for Assignment Lookups
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.teacher_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON public.teacher_assignments(subject_id);

-- =========================================================================
-- 3. TIMESTAMP UPDATE TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teachers_modtime ON public.teachers;
CREATE TRIGGER update_teachers_modtime
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_assignments_modtime ON public.teacher_assignments;
CREATE TRIGGER update_assignments_modtime
    BEFORE UPDATE ON public.teacher_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers Table Policies
DROP POLICY IF EXISTS "Allow school administrators full access to teachers" ON public.teachers;
CREATE POLICY "Allow school administrators full access to teachers"
    ON public.teachers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.school_members
            WHERE school_members.school_id = teachers.school_id
              AND school_members.user_id = auth.uid()
              AND school_members.role IN ('school_admin', 'school_representative')
        )
    );

DROP POLICY IF EXISTS "Allow teachers to view their own profile details" ON public.teachers;
CREATE POLICY "Allow teachers to view their own profile details"
    ON public.teachers
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Assignments Table Policies
DROP POLICY IF EXISTS "Allow school administrators full access to teacher assignments" ON public.teacher_assignments;
CREATE POLICY "Allow school administrators full access to teacher assignments"
    ON public.teacher_assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.school_members
            WHERE school_members.school_id = teacher_assignments.school_id
              AND school_members.user_id = auth.uid()
              AND school_members.role IN ('school_admin', 'school_representative')
        )
    );

DROP POLICY IF EXISTS "Allow teachers to view their own academic assignments" ON public.teacher_assignments;
CREATE POLICY "Allow teachers to view their own academic assignments"
    ON public.teacher_assignments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.teachers
            WHERE teachers.id = teacher_assignments.teacher_id
              AND teachers.user_id = auth.uid()
        )
    );

-- =========================================================================
-- 5. ADMINISTRATIVE RPC FUNCTIONS
-- =========================================================================
-- Securely link profiles to schools upon admin approval/verification
CREATE OR REPLACE FUNCTION public.link_teacher_to_school(
    teacher_username TEXT,
    target_school_id UUID,
    assigned_by_id UUID
)
RETURNS VOID AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Find user profile ID
    SELECT id INTO target_user_id 
    FROM public.profiles 
    WHERE LOWER(username) = LOWER(teacher_username);

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Username % does not exist', teacher_username;
    END IF;

    -- 2. Update profiles table to associate with school and assign teacher role
    UPDATE public.profiles
    SET school_id = target_school_id,
        user_type = 'teacher'
    WHERE id = target_user_id;

    -- 3. Upsert entry in school_members table
    INSERT INTO public.school_members (school_id, user_id, role, assigned_by)
    VALUES (target_school_id, target_user_id, 'teacher', assigned_by_id)
    ON CONFLICT (school_id, user_id)
    DO UPDATE SET role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 6. TEACHER INVITATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teacher_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invite_code VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_invitations_school ON public.teacher_invitations(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_code ON public.teacher_invitations(invite_code);

ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can validate teacher invitations" ON public.teacher_invitations;
CREATE POLICY "Public can validate teacher invitations" 
  ON public.teacher_invitations FOR SELECT 
  USING (
    school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    OR auth.role() = 'anon'
  );

DROP POLICY IF EXISTS "Admins can manage teacher invitations" ON public.teacher_invitations;
CREATE POLICY "Admins can manage teacher invitations" 
  ON public.teacher_invitations FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.school_members
      WHERE school_id = teacher_invitations.school_id
      AND user_id = auth.uid()
      AND role IN ('school_admin', 'school_representative')
    )
  );

DROP TRIGGER IF EXISTS tr_update_teacher_invitations_timestamp ON public.teacher_invitations;
CREATE TRIGGER tr_update_teacher_invitations_timestamp
    BEFORE UPDATE ON public.teacher_invitations
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


