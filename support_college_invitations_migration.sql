-- Migration to support both School UUIDs and custom College Batch Years / Program names in student invitations and profiles.

-- 1. Alter public.student_invitations columns
ALTER TABLE public.student_invitations ALTER COLUMN academic_year_id TYPE VARCHAR(100) USING academic_year_id::VARCHAR;
ALTER TABLE public.student_invitations ALTER COLUMN class_id TYPE VARCHAR(100) USING class_id::VARCHAR;

-- 2. Alter public.students columns
ALTER TABLE public.students ALTER COLUMN academic_year_id TYPE VARCHAR(100) USING academic_year_id::VARCHAR;
ALTER TABLE public.students ALTER COLUMN class_id TYPE VARCHAR(100) USING class_id::VARCHAR;
