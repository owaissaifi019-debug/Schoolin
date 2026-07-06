-- =========================================================================
-- CampusLink School Management System
-- Phase 4 & 4A – Student Onboarding, Student Management & Promotions
-- =========================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. STUDENT INVITATIONS TABLE (Phase 4A)
-- =========================================================================
-- Stores generated onboarding invite links for classrooms
CREATE TABLE IF NOT EXISTS public.student_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    class_id UUID NOT NULL,
    section_id VARCHAR(50), -- Optional section override
    invite_code     VARCHAR(100) NOT NULL UNIQUE,
    invite_type     VARCHAR(50)  DEFAULT 'student' CHECK (invite_type IN ('student', 'parent')),
    status          VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_by      UUID,
    expires_at      TIMESTAMPTZ,
    max_uses        INTEGER      DEFAULT 9999,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_creator FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_invitations_school ON public.student_invitations(school_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.student_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.student_invitations(status);

-- =========================================================================
-- 2. STUDENTS TABLE (Phase 4)
-- =========================================================================
-- Stores student profiles, academic enrollments, and status details.
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    class_id UUID NOT NULL,
    section_id VARCHAR(50),
    username VARCHAR(150) NOT NULL, -- Link to student user profile username
    campuslink_id VARCHAR(50) UNIQUE, -- Unique CampusLink registration id
    admission_number VARCHAR(100), -- Nullable/Optional!
    roll_number VARCHAR(100), -- Nullable/Optional!
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    blood_group VARCHAR(20),
    religion VARCHAR(100),
    nationality VARCHAR(100) DEFAULT 'Indian',
    address TEXT,
    emergency_contact VARCHAR(50),
    guardian_name VARCHAR(255),
    guardian_id UUID, -- Link to parent/guardian profile if linked
    transport_id UUID,
    house VARCHAR(100),
    -- Status lifecycle:
    --   pending     = submitted via invite link, waiting for admin approval
    --   active      = approved by admin (counted in class, eligible to promote)
    --   inactive    = deactivated but still enrolled
    --   suspended   = disciplinary suspension
    --   graduated   = completed all classes
    --   transferred = moved to another school
    status            VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'transferred', 'graduated', 'suspended', 'inactive')),
    invite_code VARCHAR(100), -- Invitation code used during onboarding
    admission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite FOREIGN KEY (invite_code) REFERENCES public.student_invitations(invite_code) ON DELETE SET NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_username ON public.students(username);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON public.students(class_id);

-- =========================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ── Invitation Table Policies ──

-- Anyone can select an invitation by its code to validate it during onboarding
DROP POLICY IF EXISTS "Public can validate invitations by code" ON public.student_invitations;
CREATE POLICY "Public can validate invitations by code" 
  ON public.student_invitations FOR SELECT 
  USING (true);

-- School admins can manage invitations for their school
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.student_invitations;
CREATE POLICY "Admins can manage invitations" 
  ON public.student_invitations FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = student_invitations.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- ── Student Table RLS Policies ──

-- Admins can view/update all student records for their school
DROP POLICY IF EXISTS "Admins can manage student records" ON public.students;
CREATE POLICY "Admins can manage student records" 
  ON public.students FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = students.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- Students can read their own record
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
CREATE POLICY "Students can view own profile" 
  ON public.students FOR SELECT 
  USING (
    username = (SELECT username FROM public.profiles WHERE id = auth.uid())
  );

-- =========================================================================
-- 4. TRIGGERS FOR TIMESTAMP SYNCHRONIZATION
-- =========================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_invitations_timestamp ON public.student_invitations;
CREATE TRIGGER tr_update_invitations_timestamp
    BEFORE UPDATE ON public.student_invitations
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS tr_update_students_timestamp ON public.students;
CREATE TRIGGER tr_update_students_timestamp
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =========================================================================
-- 5. STUDENT PROMOTIONS LOG (Phase 4B)
-- =========================================================================
-- Audit trail: every time a student is promoted, a record is inserted here.
CREATE TABLE IF NOT EXISTS public.student_promotions (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id     UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id    UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_class_id UUID        NOT NULL,     -- Source class UUID
    to_class_id   UUID        NOT NULL,     -- Target class UUID  (auto-created if needed)
    from_year_id  UUID        NOT NULL,     -- Source academic year UUID
    to_year_id    UUID        NOT NULL,     -- Target academic year UUID
    promoted_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    promoted_at   TIMESTAMPTZ DEFAULT NOW(),
    notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_promotions_student   ON public.student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_promotions_school    ON public.student_promotions(school_id);
CREATE INDEX IF NOT EXISTS idx_promotions_from_year ON public.student_promotions(from_year_id);
CREATE INDEX IF NOT EXISTS idx_promotions_to_year   ON public.student_promotions(to_year_id);

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage promotions" ON public.student_promotions;
CREATE POLICY "Admins can manage promotions"
    ON public.student_promotions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.schools
            WHERE schools.id = student_promotions.school_id
            AND schools.admin_user_id = auth.uid()
        )
    );

-- =========================================================================
-- 6. RPC: approve_student  (set status = active)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.approve_student(
    p_student_id UUID,
    p_admin_id   UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.students
    SET status = 'active', updated_at = NOW()
    WHERE id = p_student_id
      AND school_id IN (
          SELECT school_id FROM public.school_members
          WHERE user_id = p_admin_id
            AND role IN ('admin','owner','school_admin','school_representative')
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 7. RPC: promote_students  (batch promote + log)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.promote_students(
    p_student_ids   UUID[],
    p_to_class_id   UUID,
    p_to_year_id    UUID,
    p_from_class_id UUID,
    p_from_year_id  UUID,
    p_promoted_by   UUID,
    p_school_id     UUID
)
RETURNS INTEGER AS $$
DECLARE
    promoted_count INTEGER := 0;
    sid UUID;
BEGIN
    FOREACH sid IN ARRAY p_student_ids LOOP
        UPDATE public.students
        SET class_id = p_to_class_id,
            academic_year_id = p_to_year_id,
            updated_at = NOW()
        WHERE id = sid AND school_id = p_school_id;

        INSERT INTO public.student_promotions
            (school_id, student_id, from_class_id, to_class_id,
             from_year_id, to_year_id, promoted_by)
        VALUES
            (p_school_id, sid, p_from_class_id, p_to_class_id,
             p_from_year_id, p_to_year_id, p_promoted_by);

        promoted_count := promoted_count + 1;
    END LOOP;
    RETURN promoted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
