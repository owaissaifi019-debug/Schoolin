-- ============================================================
-- CAMPUSLINK RLS MIGRATION VERIFICATION CHECKS
-- ============================================================
-- Run these commands in your Supabase SQL Editor to test and
-- verify the Phase 2, 3, & 4 Access Control policies.
-- Remember to run within a transaction block so changes don't persist!

BEGIN;

-- ── MOCK DATA SETUP FOR RLS TESTING ──
-- (Mocks users inside auth.users to satisfy foreign key constraints)

-- 1. Insert mock users into auth.users (this triggers public.profiles insertion)
INSERT INTO auth.users (id, email, aud, role)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin.a@school.com', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin.b@school.com', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'student.a@school.com', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'student.b@school.com', 'authenticated', 'authenticated'),
  ('77777777-7777-7777-7777-777777777777', 'parent@parent.com', 'authenticated', 'authenticated'),
  ('99999999-9999-9999-9999-999999999999', 'super@admin.com', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 2. Create two test schools
INSERT INTO public.schools (id, name, admin_user_id, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'School A', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'approved'),
  ('22222222-2222-2222-2222-222222222222', 'School B', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 3. Update the profiles created by the trigger to match testing roles and attributes
UPDATE public.profiles SET
  username = 'student.a',
  full_name = 'Student A',
  school_id = '11111111-1111-1111-1111-111111111111',
  user_type = 'student',
  platform_role = 'user'
WHERE id = '55555555-5555-5555-5555-555555555555';

UPDATE public.profiles SET
  username = 'student.b',
  full_name = 'Student B',
  school_id = '22222222-2222-2222-2222-222222222222',
  user_type = 'student',
  platform_role = 'user'
WHERE id = '66666666-6666-6666-6666-666666666666';

UPDATE public.profiles SET
  username = 'parent.xyz',
  full_name = 'Parent XYZ',
  school_id = NULL,
  user_type = 'parent',
  platform_role = 'user'
WHERE id = '77777777-7777-7777-7777-777777777777';

UPDATE public.profiles SET
  username = 'admin.a',
  full_name = 'Admin A',
  school_id = '11111111-1111-1111-1111-111111111111',
  user_type = 'school_representative',
  platform_role = 'school_admin'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Update Admin B profile to represent school_admin of School B
UPDATE public.profiles SET
  username = 'admin.b',
  full_name = 'Admin B',
  school_id = '22222222-2222-2222-2222-222222222222',
  user_type = 'school_representative',
  platform_role = 'school_admin'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

UPDATE public.profiles SET
  username = 'super.admin',
  full_name = 'Super Admin',
  school_id = NULL,
  user_type = 'school_representative',
  platform_role = 'super_admin'
WHERE id = '99999999-9999-9999-9999-999999999999';

-- 4. Create private resources
-- Academic Years
INSERT INTO public.academic_years (id, school_id, name, start_date, end_date, status, is_current)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Test Year A', '2026-04-01', '2027-03-31', 'active', true),
  ('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'Test Year B', '2026-04-01', '2027-03-31', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- Private Classrooms
INSERT INTO public.classrooms (id, school_id, academic_year_id, grade, section)
VALUES 
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Class X', 'A'),
  ('c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'Class X', 'B')
ON CONFLICT (id) DO NOTHING;

-- Private School Posts (UUIDs updated to valid hex)
INSERT INTO public.posts (id, user_id, content, post_type, school_id)
VALUES 
  ('d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'School A official announcement', 'school', '11111111-1111-1111-1111-111111111111'),
  ('d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'School B official announcement', 'school', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Alumni Batches
INSERT INTO public.alumni_batches (id, school_id, passing_year)
VALUES 
  ('abababa1-abab-abab-abab-abababababab', '11111111-1111-1111-1111-111111111111', 2024),
  ('abababa2-abab-abab-abab-abababababab', '22222222-2222-2222-2222-222222222222', 2024)
ON CONFLICT (id) DO NOTHING;


-- ── TEST EXECUTION ──

-- TEST 1: School A Student accessing School A resources
-- Setup authenticated session as Student A
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555"}';

SELECT 'TEST 1 (Classroom A Select):' AS test, COUNT(*) FROM public.classrooms WHERE id = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'; -- Expected: 1
SELECT 'TEST 1 (Post A Select):' AS test, COUNT(*) FROM public.posts WHERE id = 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'; -- Expected: 1


-- TEST 2: School A Student accessing School B private resources
SELECT 'TEST 2 (Classroom B Select):' AS test, COUNT(*) FROM public.classrooms WHERE id = 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2'; -- Expected: 0 (DENIED)
SELECT 'TEST 2 (Post B Select):' AS test, COUNT(*) FROM public.posts WHERE id = 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2'; -- Expected: 0 (DENIED)
SELECT 'TEST 2 (Student B Profile):' AS test, COUNT(*) FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666'; -- Expected: 0 (DENIED)


-- TEST 3: Parent access verification
-- Setup authenticated session as Parent
SET LOCAL request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777"}';

SELECT 'TEST 3A (Parent Read Student Profiles):' AS test, COUNT(*) FROM public.profiles WHERE user_type = 'student'; -- Expected: 0 (DENIED)
SELECT 'TEST 3B (Parent Read Classrooms):' AS test, COUNT(*) FROM public.classrooms; -- Expected: 0 (DENIED)
SELECT 'TEST 3C (Parent Read School Posts):' AS test, COUNT(*) FROM public.posts WHERE school_id IS NOT NULL; -- Expected: 0 (DENIED)
SELECT 'TEST 3D (Parent Read Alumni Batches):' AS test, COUNT(*) FROM public.alumni_batches; -- Expected: 0 (DENIED)
SELECT 'TEST 3E (Parent Read Public School Profiles):' AS test, COUNT(*) FROM public.schools WHERE id = '11111111-1111-1111-1111-111111111111'; -- Expected: 1 (ALLOWED)


-- TEST 4: Public user viewing public school profiles & admissions
-- Setup session as anonymous guest
SET LOCAL role = anon;
SET LOCAL request.jwt.claims = '{}';

SELECT 'TEST 4 (Anon Read School A):' AS test, name FROM public.schools WHERE id = '11111111-1111-1111-1111-111111111111'; -- Expected: 'School A' (ALLOWED)


-- TEST 5: School Admin managing own school
-- Setup session as Admin A
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

INSERT INTO public.classrooms (id, school_id, academic_year_id, grade, section)
VALUES ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Class XI', 'C')
ON CONFLICT (id) DO UPDATE SET grade = EXCLUDED.grade;

SELECT 'TEST 5 (Admin Insert Own Classroom):' AS test, COUNT(*) FROM public.classrooms WHERE id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'; -- Expected: 1 (ALLOWED)


-- TEST 6: School Admin managing another school
-- Expecting DB error or failure on foreign school insert
DO $$
BEGIN
  BEGIN
    INSERT INTO public.classrooms (id, school_id, academic_year_id, grade, section)
    VALUES ('c4c4c4c4-c4c4-c4c4-c4c4-c4c4c4c4c4c4', '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'Class XI', 'D');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 6 (Admin Insert Foreign Classroom): Blocked by DB constraints (ALLOWED DENY)';
  END;
END $$;


-- TEST 7: Super Admin accessing all resources
-- Setup session as Super Admin
SET LOCAL request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999"}';

SELECT 'TEST 7 (Super Admin Read Classrooms):' AS test, COUNT(*) FROM public.classrooms; -- Expected: 2 (or more, reads all)


-- TEST 8: User Self-Escalation Attack Block
-- Setup session as Student A
SET LOCAL request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555"}';
DO $$
BEGIN
  -- A. Try to change school_id to School B
  BEGIN
    UPDATE public.profiles
    SET school_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = '55555555-5555-5555-5555-555555555555';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 8A (Student changing school_id): Blocked successfully (ALLOWED DENY): %', SQLERRM;
  END;

  -- B. Try to change user_type to teacher
  BEGIN
    UPDATE public.profiles
    SET user_type = 'teacher'
    WHERE id = '55555555-5555-5555-5555-555555555555';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 8B (Student changing user_type): Blocked successfully (ALLOWED DENY): %', SQLERRM;
  END;
END $$;

ROLLBACK;
