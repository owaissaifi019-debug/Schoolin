-- ============================================================
-- CAMPUSLINK – TEACHERS & CLASSROOMS SCHEMA FIX (DEADLOCK-SAFE)
-- Run in Supabase SQL Editor → splits work to avoid lock conflicts
-- ============================================================

-- ── STEP 0: Extension ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── STEP 1: shared trigger function (no table locks) ─────────
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── STEP 2: academic_years – create table if missing ─────────
CREATE TABLE IF NOT EXISTS public.academic_years (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID        NOT NULL,
  name          TEXT        NOT NULL,
  start_date    DATE,
  end_date      DATE,
  status        TEXT        DEFAULT 'active' CHECK (status IN ('active','inactive')),
  is_current    BOOLEAN     DEFAULT FALSE,
  is_active     BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT academic_years_school_name_unique UNIQUE (school_id, name)
);

-- Add missing columns to existing academic_years (each ALTER is a separate short lock)
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS start_date  DATE;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS end_date    DATE;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'active';
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS is_current  BOOLEAN DEFAULT FALSE;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT FALSE;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();


-- ── STEP 3: classrooms – create table if missing ─────────────
-- (No FK to profiles/classes yet – added in STEP 5 to avoid circular locks)
CREATE TABLE IF NOT EXISTS public.classrooms (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID        NOT NULL,
  academic_year_id UUID        NOT NULL,
  class_id         UUID,
  section_id       TEXT,
  class_teacher_id UUID,
  grade            TEXT,
  section          TEXT,
  room_number      TEXT,
  room             TEXT,
  building         TEXT,
  floor            TEXT,
  capacity         INTEGER     DEFAULT 40,
  is_archived      BOOLEAN     DEFAULT FALSE,
  status           TEXT        DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing classrooms
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS class_id         UUID;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS section_id       TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS class_teacher_id UUID;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS room_number      TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS building         TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS floor            TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS is_archived      BOOLEAN DEFAULT FALSE;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();


-- ── STEP 4: teachers – relax NOT NULL constraints ────────────
ALTER TABLE public.teachers ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN email       DROP NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN phone       DROP NOT NULL;

-- Ensure upsert conflict target index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_school_username'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT unique_school_username UNIQUE (school_id, username);
  END IF;
END $$;


-- ── STEP 5: FK constraints – added AFTER both tables exist ───
-- academic_years → schools
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_academic_years_school'
      AND conrelid = 'public.academic_years'::regclass
  ) THEN
    ALTER TABLE public.academic_years
      ADD CONSTRAINT fk_academic_years_school
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

-- classrooms → schools
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_classrooms_school'
      AND conrelid = 'public.classrooms'::regclass
  ) THEN
    ALTER TABLE public.classrooms
      ADD CONSTRAINT fk_classrooms_school
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

-- classrooms → academic_years
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_classrooms_academic_year'
      AND conrelid = 'public.classrooms'::regclass
  ) THEN
    ALTER TABLE public.classrooms
      ADD CONSTRAINT fk_classrooms_academic_year
      FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;
  END IF;
END $$;

-- classrooms → classes (class_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_classrooms_class'
      AND conrelid = 'public.classrooms'::regclass
  ) THEN
    ALTER TABLE public.classrooms
      ADD CONSTRAINT fk_classrooms_class
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- classrooms → profiles (class_teacher_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_classrooms_class_teacher'
      AND conrelid = 'public.classrooms'::regclass
  ) THEN
    ALTER TABLE public.classrooms
      ADD CONSTRAINT fk_classrooms_class_teacher
      FOREIGN KEY (class_teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- classes – add school_id if missing
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_classes_school'
      AND conrelid = 'public.classes'::regclass
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT fk_classes_school
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ── STEP 6: Triggers ─────────────────────────────────────────
DROP TRIGGER IF EXISTS update_academic_years_modtime ON public.academic_years;
CREATE TRIGGER update_academic_years_modtime
    BEFORE UPDATE ON public.academic_years
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_classrooms_modtime ON public.classrooms;
CREATE TRIGGER update_classrooms_modtime
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_teachers_modtime ON public.teachers;
CREATE TRIGGER update_teachers_modtime
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


-- ── STEP 7: Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_academic_years_school    ON public.academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_school        ON public.classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_year          ON public.classrooms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_class         ON public.classrooms(class_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher       ON public.classrooms(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school          ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_username        ON public.teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_verification    ON public.teachers(verification_status);


-- ── STEP 8: RLS – Enable ─────────────────────────────────────
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms     ENABLE ROW LEVEL SECURITY;


-- ── STEP 9: RLS Policies ─────────────────────────────────────

-- academic_years: public read
DROP POLICY IF EXISTS "Academic sessions are viewable by everyone" ON public.academic_years;
CREATE POLICY "Academic sessions are viewable by everyone"
  ON public.academic_years FOR SELECT USING (true);

-- academic_years: admin write (checks both admin_user_id AND school_members)
DROP POLICY IF EXISTS "School admins can manage academic years" ON public.academic_years;
CREATE POLICY "School admins can manage academic years"
  ON public.academic_years FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.schools
            WHERE schools.id = academic_years.school_id
              AND schools.admin_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members
               WHERE school_members.school_id = academic_years.school_id
                 AND school_members.user_id = auth.uid()
                 AND school_members.role IN ('admin','owner','school_admin','school_representative'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools
            WHERE schools.id = academic_years.school_id
              AND schools.admin_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members
               WHERE school_members.school_id = academic_years.school_id
                 AND school_members.user_id = auth.uid()
                 AND school_members.role IN ('admin','owner','school_admin','school_representative'))
  );

-- classrooms: public read
DROP POLICY IF EXISTS "Classrooms are viewable by everyone" ON public.classrooms;
CREATE POLICY "Classrooms are viewable by everyone"
  ON public.classrooms FOR SELECT USING (true);

-- classrooms: admin write (same dual-check)
DROP POLICY IF EXISTS "School admins can manage classrooms" ON public.classrooms;
CREATE POLICY "School admins can manage classrooms"
  ON public.classrooms FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.schools
            WHERE schools.id = classrooms.school_id
              AND schools.admin_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members
               WHERE school_members.school_id = classrooms.school_id
                 AND school_members.user_id = auth.uid()
                 AND school_members.role IN ('admin','owner','school_admin','school_representative'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools
            WHERE schools.id = classrooms.school_id
              AND schools.admin_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members
               WHERE school_members.school_id = classrooms.school_id
                 AND school_members.user_id = auth.uid()
                 AND school_members.role IN ('admin','owner','school_admin','school_representative'))
  );

-- teachers: admin write (fixed role names)
DROP POLICY IF EXISTS "Allow school administrators full access to teachers" ON public.teachers;
CREATE POLICY "Allow school administrators full access to teachers"
    ON public.teachers FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.school_members
                WHERE school_members.school_id = teachers.school_id
                  AND school_members.user_id = auth.uid()
                  AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.school_members
                WHERE school_members.school_id = teachers.school_id
                  AND school_members.user_id = auth.uid()
                  AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    );

-- teachers: teacher self-read
DROP POLICY IF EXISTS "Allow teachers to view their own profile details" ON public.teachers;
CREATE POLICY "Allow teachers to view their own profile details"
    ON public.teachers FOR SELECT TO authenticated
    USING (user_id = auth.uid());
