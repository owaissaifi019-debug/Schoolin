-- =========================================================================
-- CampusLink School Management System
-- Phase 5 – Attendance Management Schema
-- Includes: attendance_records, attendance_entries, leave_requests
-- =========================================================================

-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. ATTENDANCE RECORDS TABLE
-- Represents a single attendance session (one class, one date)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id          UUID NOT NULL,
    academic_year_id   UUID,
    class_id           UUID,
    section_id         VARCHAR(20),
    teacher_id         UUID,
    date               DATE NOT NULL,
    status             VARCHAR(20) DEFAULT 'draft'
                           CHECK (status IN ('draft', 'finalized')),
    present_count      INTEGER DEFAULT 0,
    absent_count       INTEGER DEFAULT 0,
    late_count         INTEGER DEFAULT 0,
    leave_count        INTEGER DEFAULT 0,
    remarks            TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_att_school
        FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL,
    CONSTRAINT fk_att_class
        FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_att_teacher
        FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL,

    -- One record per class+section+date
    CONSTRAINT unique_class_date_attendance
        UNIQUE (school_id, class_id, section_id, date)
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_att_records_school   ON public.attendance_records(school_id);
CREATE INDEX IF NOT EXISTS idx_att_records_class    ON public.attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_att_records_date     ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_att_records_teacher  ON public.attendance_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_att_records_year     ON public.attendance_records(academic_year_id);

-- =========================================================================
-- 2. ATTENDANCE ENTRIES TABLE
-- Individual student status within a given attendance record/session
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.attendance_entries (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id      UUID NOT NULL,
    school_id          UUID NOT NULL,
    academic_year_id   UUID,
    class_id           UUID,
    section_id         VARCHAR(20),
    student_id         UUID NOT NULL,
    teacher_id         UUID,
    date               DATE NOT NULL,
    status             VARCHAR(20) DEFAULT 'present'
                           CHECK (status IN ('present', 'absent', 'late', 'leave')),
    remarks            TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign Keys
    CONSTRAINT fk_entry_record
        FOREIGN KEY (attendance_id) REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_entry_school
        FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_entry_year
        FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL,
    CONSTRAINT fk_entry_class
        FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_entry_student
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
    CONSTRAINT fk_entry_teacher
        FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL,

    -- One entry per student per attendance record
    CONSTRAINT unique_student_attendance
        UNIQUE (attendance_id, student_id)
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_att_entries_attendance ON public.attendance_entries(attendance_id);
CREATE INDEX IF NOT EXISTS idx_att_entries_student    ON public.attendance_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_att_entries_class      ON public.attendance_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_att_entries_date       ON public.attendance_entries(date);
CREATE INDEX IF NOT EXISTS idx_att_entries_status     ON public.attendance_entries(status);
CREATE INDEX IF NOT EXISTS idx_att_entries_school     ON public.attendance_entries(school_id);

-- =========================================================================
-- 3. LEAVE REQUESTS TABLE
-- Student leave applications submitted by parents/guardians or school admin
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id       UUID NOT NULL,
    student_id      UUID NOT NULL,
    class_id        UUID,
    section_id      VARCHAR(20),
    leave_type      VARCHAR(50) NOT NULL
                        CHECK (leave_type IN ('Medical','Family Event','Sports','Religious','Emergency','Other')),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    reason          TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     UUID,
    reviewed_at     TIMESTAMPTZ,
    review_note     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_leave_school
        FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_student
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_class
        FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_leave_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Dates must be valid
    CONSTRAINT leave_date_order CHECK (to_date >= from_date)
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_leave_requests_school   ON public.leave_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student  ON public.leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status   ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates    ON public.leave_requests(from_date, to_date);

-- =========================================================================
-- 4. TIMESTAMP AUTO-UPDATE TRIGGERS
-- =========================================================================

-- Reuse the shared trigger function (already exists from teacher_management_schema.sql)
-- CREATE OR REPLACE FUNCTION public.update_modified_column() ...
-- (Already created in teacher_management_schema.sql, safe to skip if already run)

DROP TRIGGER IF EXISTS update_att_records_modtime ON public.attendance_records;
CREATE TRIGGER update_att_records_modtime
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_att_entries_modtime ON public.attendance_entries;
CREATE TRIGGER update_att_entries_modtime
    BEFORE UPDATE ON public.attendance_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_leave_requests_modtime ON public.leave_requests;
CREATE TRIGGER update_leave_requests_modtime
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests     ENABLE ROW LEVEL SECURITY;

-- ── attendance_records ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "School admins can manage attendance records" ON public.attendance_records;
CREATE POLICY "School admins can manage attendance records"
    ON public.attendance_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.school_members
            WHERE school_members.school_id = attendance_records.school_id
              AND school_members.user_id   = auth.uid()
              AND school_members.role IN ('school_admin', 'school_representative')
        )
    );

DROP POLICY IF EXISTS "Teachers can view and create attendance records for their classes" ON public.attendance_records;
CREATE POLICY "Teachers can view and create attendance records for their classes"
    ON public.attendance_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.teachers
            WHERE teachers.id      = attendance_records.teacher_id
              AND teachers.user_id = auth.uid()
        )
    );

-- ── attendance_entries ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "School admins can manage attendance entries" ON public.attendance_entries;
CREATE POLICY "School admins can manage attendance entries"
    ON public.attendance_entries
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.school_members
            WHERE school_members.school_id = attendance_entries.school_id
              AND school_members.user_id   = auth.uid()
              AND school_members.role IN ('school_admin', 'school_representative')
        )
    );

DROP POLICY IF EXISTS "Students can view their own attendance entries" ON public.attendance_entries;
CREATE POLICY "Students can view their own attendance entries"
    ON public.attendance_entries
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.students
            JOIN public.profiles ON profiles.username = students.username
            WHERE students.id   = attendance_entries.student_id
              AND profiles.id   = auth.uid()
        )
    );

-- ── leave_requests ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "School admins can manage all leave requests" ON public.leave_requests;
CREATE POLICY "School admins can manage all leave requests"
    ON public.leave_requests
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.school_members
            WHERE school_members.school_id = leave_requests.school_id
              AND school_members.user_id   = auth.uid()
              AND school_members.role IN ('school_admin', 'school_representative')
        )
    );

DROP POLICY IF EXISTS "Students or guardians can view their own leave requests" ON public.leave_requests;
CREATE POLICY "Students or guardians can view their own leave requests"
    ON public.leave_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.students
            JOIN public.profiles ON profiles.username = students.username
            WHERE students.id = leave_requests.student_id
              AND profiles.id = auth.uid()
        )
    );

-- =========================================================================
-- 6. HELPER RPC FUNCTIONS
-- =========================================================================

-- Get attendance percentage for a class in a given date range
CREATE OR REPLACE FUNCTION public.get_class_attendance_rate(
    p_school_id        UUID,
    p_class_id         UUID,
    p_section_id       VARCHAR DEFAULT NULL,
    p_from_date        DATE DEFAULT NULL,
    p_to_date          DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_total   INTEGER := 0;
    v_present INTEGER := 0;
BEGIN
    SELECT
        COALESCE(SUM(present_count + absent_count + late_count + leave_count), 0),
        COALESCE(SUM(present_count), 0)
    INTO v_total, v_present
    FROM public.attendance_records
    WHERE school_id = p_school_id
      AND class_id  = p_class_id
      AND (p_section_id IS NULL OR section_id = p_section_id)
      AND (p_from_date IS NULL OR date >= p_from_date)
      AND (p_to_date   IS NULL OR date <= p_to_date);

    IF v_total = 0 THEN RETURN 0; END IF;
    RETURN ROUND((v_present::NUMERIC / v_total::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get individual student attendance percentage
CREATE OR REPLACE FUNCTION public.get_student_attendance_rate(
    p_school_id    UUID,
    p_student_id   UUID,
    p_from_date    DATE DEFAULT NULL,
    p_to_date      DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_total   INTEGER := 0;
    v_present INTEGER := 0;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'present')
    INTO v_total, v_present
    FROM public.attendance_entries
    WHERE school_id  = p_school_id
      AND student_id = p_student_id
      AND (p_from_date IS NULL OR date >= p_from_date)
      AND (p_to_date   IS NULL OR date <= p_to_date);

    IF v_total = 0 THEN RETURN 0; END IF;
    RETURN ROUND((v_present::NUMERIC / v_total::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve a leave request and record reviewer
CREATE OR REPLACE FUNCTION public.review_leave_request(
    p_leave_id    UUID,
    p_status      VARCHAR,   -- 'approved' | 'rejected'
    p_reviewer_id UUID,
    p_note        TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid leave status: %. Must be approved or rejected.', p_status;
    END IF;

    UPDATE public.leave_requests
    SET
        status      = p_status,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        review_note = p_note,
        updated_at  = NOW()
    WHERE id = p_leave_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request % not found.', p_leave_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 7. SAMPLE/SEED DATA (Optional — for development/testing only)
-- Remove or comment out before running in production.
-- =========================================================================

-- NOTE: The in-app attendance UI uses localStorage for mock data.
-- Run this section ONLY if you want to seed Supabase for production testing.

/*
-- Seed an attendance record for Class 9A on today
INSERT INTO public.attendance_records
    (school_id, academic_year_id, class_id, section_id, date, status, present_count, absent_count)
SELECT
    s.id,
    ay.id,
    cl.id,
    'A',
    CURRENT_DATE,
    'finalized',
    30,
    2
FROM public.schools s
JOIN public.academic_years ay ON ay.school_id = s.id AND ay.is_current = TRUE
JOIN public.classes cl ON cl.school_id = s.id AND cl.name = 'Class 9'
LIMIT 1
ON CONFLICT DO NOTHING;
*/
