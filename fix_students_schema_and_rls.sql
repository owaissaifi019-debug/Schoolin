-- ============================================================
-- CampusLink – Student Schema and RLS Policy Updates
-- ============================================================

-- 1. Ensure user_id column exists on public.students table
ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Ensure unique constraint on (school_id, username) exists for upsert capability
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_school_student_username'
    ) THEN
        ALTER TABLE public.students 
            ADD CONSTRAINT unique_school_student_username UNIQUE (school_id, username);
    END IF;
END $$;

-- 3. Enable Row Level Security (RLS) on public.students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Admin Management Policy (Owner + Admin members + School Admin profiles check)
DROP POLICY IF EXISTS "Admins can manage student records" ON public.students;
DROP POLICY IF EXISTS "Allow school administrators full access to students" ON public.students;
CREATE POLICY "Allow school administrators full access to students"
    ON public.students
    FOR ALL
    TO authenticated
    USING (
        -- School owner (admin_user_id)
        EXISTS (
            SELECT 1 FROM public.schools
            WHERE schools.id = students.school_id
            AND schools.admin_user_id = auth.uid()
        )
        OR
        -- Profiles role check
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.school_id = students.school_id
            AND profiles.platform_role IN ('school_admin', 'super_admin')
        )
        OR
        -- School member with admin role
        EXISTS (
            SELECT 1 FROM public.school_members
            WHERE school_members.school_id = students.school_id
            AND school_members.user_id = auth.uid()
            AND school_members.role = 'admin'
        )
    );

-- 5. Allow students to self-register via invite (INSERT)
DROP POLICY IF EXISTS "Allow students to self-register via invite" ON public.students;
CREATE POLICY "Allow students to self-register via invite"
    ON public.students
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Enforce user_id is the authenticated user
        user_id = auth.uid()
    );

-- 6. Allow students to update their own pending record (UPDATE)
DROP POLICY IF EXISTS "Allow students to update their own pending record" ON public.students;
CREATE POLICY "Allow students to update their own pending record"
    ON public.students
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );
-- 7. Allow students to view their own profile details (SELECT)
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
DROP POLICY IF EXISTS "Allow students to view their own profile details" ON public.students;
CREATE POLICY "Allow students to view their own profile details"
    ON public.students
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        username = (SELECT username FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================
-- 8. TRIGGER FIX: Ensure new user profiles save username on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, user_type, platform_role, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', CASE WHEN new.email = 'owaissaifi003@gmail.com' THEN 'school_representative' ELSE 'student' END),
    CASE WHEN new.email = 'owaissaifi003@gmail.com' THEN 'super_admin' ELSE 'user' END,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. TRIGGER: Auto-link students to school_members & profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_student_to_school_members()
RETURNS trigger AS $$
DECLARE
    target_user_id UUID;
    target_username TEXT;
BEGIN
    -- Only trigger when status is updated/inserted as 'active'
    IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active' OR OLD.status IS NULL) THEN
        
        -- 1. Find user profile ID by username
        SELECT id, username INTO target_user_id, target_username 
        FROM public.profiles 
        WHERE LOWER(username) = LOWER(NEW.username);

        -- Fallback to NEW.user_id if not found by username
        IF target_user_id IS NULL THEN
            target_user_id := NEW.user_id;
            SELECT username INTO target_username FROM public.profiles WHERE id = target_user_id;
        END IF;

        IF target_user_id IS NOT NULL THEN
            -- 2. Update profiles table to associate with school and assign student role
            BEGIN
                UPDATE public.profiles
                SET school_id = NEW.school_id,
                    user_type = 'student',
                    username = COALESCE(profiles.username, NEW.username), -- Sync username backfill
                    class = NEW.class_id, -- store program/class name
                    passing_year = NULLIF(REGEXP_REPLACE(NEW.academic_year_id, '\D', '', 'g'), '')::INTEGER -- store batch/academic year
                WHERE id = target_user_id;
            EXCEPTION WHEN OTHERS THEN
                -- Gracefully catch any exception so it doesn't block status update
                RAISE WARNING 'Failed to update student profile: %', SQLERRM;
            END;

            -- 3. Upsert entry in school_members table
            BEGIN
                INSERT INTO public.school_members (school_id, user_id, role, assigned_by)
                VALUES (NEW.school_id, target_user_id, 'student', auth.uid())
                ON CONFLICT (school_id, user_id)
                DO UPDATE SET 
                  role = 'student',
                  assigned_by = COALESCE(auth.uid(), school_members.assigned_by),
                  assigned_at = NOW();
            EXCEPTION WHEN OTHERS THEN
                -- Gracefully catch any exception so it doesn't block status update
                RAISE WARNING 'Failed to update school_members: %', SQLERRM;
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_student_to_school_members ON public.students;
CREATE TRIGGER tr_sync_student_to_school_members
    AFTER INSERT OR UPDATE OF status ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.sync_student_to_school_members();

-- ============================================================
-- 10. DIAGNOSTIC FUNCTION & RETROACTIVE SYNC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fix_and_sync_all_profiles()
RETURNS text AS $$
DECLARE
    r RECORD;
    target_uid UUID;
    synced_count INT := 0;
BEGIN
    -- A. Backfill profiles.username from auth.users metadata if null
    FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        BEGIN
            UPDATE public.profiles
            SET username = COALESCE(profiles.username, r.raw_user_meta_data->>'username', SPLIT_PART(r.email, '@', 1))
            WHERE id = r.id AND username IS NULL;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip duplicate username constraint violations
        END;
    END LOOP;

    -- B. Backfill profiles.username from public.students if null
    FOR r IN SELECT * FROM public.students LOOP
        BEGIN
            UPDATE public.profiles
            SET username = COALESCE(profiles.username, r.username)
            WHERE (id = r.user_id OR LOWER(email) = LOWER(r.email)) AND username IS NULL;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip duplicate username constraint violations
        END;
    END LOOP;

    -- C. Sync active students to profiles and school_members
    FOR r IN SELECT * FROM public.students WHERE status = 'active' LOOP
        -- Find target profile ID using 4-way fallback resolver
        SELECT id INTO target_uid FROM public.profiles WHERE id = r.user_id;
        
        IF target_uid IS NULL THEN
            SELECT id INTO target_uid FROM public.profiles WHERE LOWER(username) = LOWER(r.username);
        END IF;

        IF target_uid IS NULL THEN
            SELECT id INTO target_uid FROM public.profiles WHERE LOWER(email) = LOWER(r.email);
        END IF;

        IF target_uid IS NULL THEN
            SELECT id INTO target_uid FROM auth.users WHERE LOWER(email) = LOWER(r.email);
        END IF;

        IF target_uid IS NOT NULL THEN
            UPDATE public.profiles
            SET school_id = r.school_id,
                user_type = 'student',
                username = COALESCE(profiles.username, r.username),
                class = r.class_id,
                passing_year = NULLIF(REGEXP_REPLACE(r.academic_year_id, '\D', '', 'g'), '')::INTEGER
            WHERE id = target_uid;

            -- Upsert school membership
            INSERT INTO public.school_members (school_id, user_id, role)
            VALUES (r.school_id, target_uid, 'student')
            ON CONFLICT (school_id, user_id) DO NOTHING;

            synced_count := synced_count + 1;
        END IF;
    END LOOP;

    RETURN 'Success: Synced ' || synced_count || ' students.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the sync function retroactively immediately
SELECT public.fix_and_sync_all_profiles();
