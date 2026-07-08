-- ============================================================
-- CAMPUSLINK ACADEMIC MANAGEMENT SCHEMA (SUPABASE READY)
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ACADEMIC YEARS TABLE
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure start_date is before end_date
    CONSTRAINT chk_dates CHECK (start_date < end_date)
);

-- Safely add missing columns to academic_years if table already existed from other migrations
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Index for school filter
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON public.academic_years(school_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_academic_years_modtime ON public.academic_years;
CREATE TRIGGER update_academic_years_modtime
    BEFORE UPDATE ON public.academic_years
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- 2. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(100),
    class_teacher VARCHAR(150),
    display_order INT NOT NULL DEFAULT 1 CHECK (display_order > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add missing columns to classes if table already existed from other migrations
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_teacher VARCHAR(150);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS section VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON public.classes(academic_year_id);

DROP TRIGGER IF EXISTS update_classes_modtime ON public.classes;
CREATE TRIGGER update_classes_modtime
    BEFORE UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- 3. SECTIONS TABLE REMOVED


-- 4. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'core' CHECK (category IN ('core', 'elective', 'optional', 'co-curricular')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON public.subjects(school_id);

DROP TRIGGER IF EXISTS update_subjects_modtime ON public.subjects;
CREATE TRIGGER update_subjects_modtime
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- 5. MANY-TO-MANY RELATIONSHIP: SUBJECT APPLICABILITY
CREATE TABLE IF NOT EXISTS public.subject_classes (
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    PRIMARY KEY (subject_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_classes_class ON public.subject_classes(class_id);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;

-- 1. Academic Years Policies
DROP POLICY IF EXISTS "School Admins can select academic years" ON public.academic_years;
DROP POLICY IF EXISTS "Academic years are viewable by everyone" ON public.academic_years;
CREATE POLICY "Academic years are viewable by everyone" ON public.academic_years
    FOR SELECT USING (
        school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "School Admins can insert academic years" ON public.academic_years;
CREATE POLICY "School Admins can insert academic years" ON public.academic_years
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = academic_years.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

DROP POLICY IF EXISTS "School Admins can update academic years" ON public.academic_years;
CREATE POLICY "School Admins can update academic years" ON public.academic_years
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = academic_years.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

DROP POLICY IF EXISTS "School Admins can delete academic years" ON public.academic_years;
CREATE POLICY "School Admins can delete academic years" ON public.academic_years
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = academic_years.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );


-- 2. Classes Policies
DROP POLICY IF EXISTS "School Admins can select classes" ON public.classes;
DROP POLICY IF EXISTS "Classes are viewable by everyone" ON public.classes;
CREATE POLICY "Classes are viewable by everyone" ON public.classes
    FOR SELECT USING (
        school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "School Admins can insert classes" ON public.classes;
CREATE POLICY "School Admins can insert classes" ON public.classes
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

DROP POLICY IF EXISTS "School Admins can update classes" ON public.classes;
CREATE POLICY "School Admins can update classes" ON public.classes
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

DROP POLICY IF EXISTS "School Admins can delete classes" ON public.classes;
CREATE POLICY "School Admins can delete classes" ON public.classes
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );


-- 4. Subjects Policies
DROP POLICY IF EXISTS "School Admins can select subjects" ON public.subjects;
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects
    FOR SELECT USING (
        school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "School Admins can insert subjects" ON public.subjects;
CREATE POLICY "School Admins can insert subjects" ON public.subjects
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = subjects.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

DROP POLICY IF EXISTS "School Admins can update subjects" ON public.subjects;
CREATE POLICY "School Admins can update subjects" ON public.subjects
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = subjects.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

DROP POLICY IF EXISTS "School Admins can delete subjects" ON public.subjects;
CREATE POLICY "School Admins can delete subjects" ON public.subjects
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = subjects.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
    );

-- 5. Subject Classes Policies
DROP POLICY IF EXISTS "Subject classes are viewable by everyone" ON public.subject_classes;
CREATE POLICY "Subject classes are viewable by everyone" ON public.subject_classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_id
              AND classes.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "School Admins can insert subject_classes" ON public.subject_classes;
CREATE POLICY "School Admins can insert subject_classes" ON public.subject_classes
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_id
              AND (
                  EXISTS (SELECT 1 FROM public.schools WHERE id = classes.school_id AND admin_user_id = auth.uid())
                  OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
              )
        )
    );

DROP POLICY IF EXISTS "School Admins can delete subject_classes" ON public.subject_classes;
CREATE POLICY "School Admins can delete subject_classes" ON public.subject_classes
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_id
              AND (
                  EXISTS (SELECT 1 FROM public.schools WHERE id = classes.school_id AND admin_user_id = auth.uid())
                  OR EXISTS (SELECT 1 FROM public.school_members WHERE school_id = classes.school_id AND user_id = auth.uid() AND role IN ('admin', 'owner', 'school_admin', 'school_representative'))
              )
        )
    );
