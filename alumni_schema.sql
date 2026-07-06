-- ============================================================
-- CampusLink – Alumni Management Schema
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Alumni Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alumni (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id           UUID        NOT NULL,
    user_id             UUID,                           -- linked platform profile (optional)
    employee_id         VARCHAR(50),                    -- reused as alumni record ID
    full_name           VARCHAR(255) NOT NULL,
    username            VARCHAR(150) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(50),
    gender              VARCHAR(20)  CHECK (gender IN ('Male','Female','Other')),
    graduating_year     INTEGER,                        -- e.g. 2024
    graduating_class    VARCHAR(100),                   -- e.g. "Class XII"
    section             VARCHAR(20),
    admission_number    VARCHAR(100),
    roll_number         VARCHAR(50),
    date_of_birth       DATE,
    current_occupation  VARCHAR(255),
    current_location    VARCHAR(255),
    achievements        TEXT,
    status              VARCHAR(20)  DEFAULT 'verified' CHECK (status IN ('pending','verified','inactive')),
    verification_status VARCHAR(20)  DEFAULT 'pending'  CHECK (verification_status IN ('pending','verified')),
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW(),

    CONSTRAINT unique_school_alumni_username UNIQUE (school_id, username),
    CONSTRAINT fk_alumni_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_alumni_user   FOREIGN KEY (user_id)   REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alumni_school       ON public.alumni(school_id);
CREATE INDEX IF NOT EXISTS idx_alumni_username     ON public.alumni(username);
CREATE INDEX IF NOT EXISTS idx_alumni_year         ON public.alumni(graduating_year);
CREATE INDEX IF NOT EXISTS idx_alumni_status       ON public.alumni(status);
CREATE INDEX IF NOT EXISTS idx_alumni_verification ON public.alumni(verification_status);

-- ── Alumni Invite Links Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alumni_invites (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id       UUID        NOT NULL,
    invite_code     VARCHAR(50) NOT NULL UNIQUE,
    graduating_year INTEGER,
    graduating_class VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','disabled')),
    uses_count      INTEGER     DEFAULT 0,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,

    CONSTRAINT fk_alumni_invite_school   FOREIGN KEY (school_id)   REFERENCES public.schools(id)   ON DELETE CASCADE,
    CONSTRAINT fk_alumni_invite_creator  FOREIGN KEY (created_by)  REFERENCES public.profiles(id)  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alumni_invites_school ON public.alumni_invites(school_id);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_code   ON public.alumni_invites(invite_code);

-- ── Timestamp Trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_alumni_modtime ON public.alumni;
CREATE TRIGGER update_alumni_modtime
    BEFORE UPDATE ON public.alumni
    FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.alumni         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_invites ENABLE ROW LEVEL SECURITY;

-- Admin: full access (school owner OR school_members admin role)
DROP POLICY IF EXISTS "School admins manage alumni" ON public.alumni;
CREATE POLICY "School admins manage alumni"
    ON public.alumni FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.schools
                WHERE schools.id = alumni.school_id
                  AND schools.admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members
                   WHERE school_members.school_id = alumni.school_id
                     AND school_members.user_id = auth.uid()
                     AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.schools
                WHERE schools.id = alumni.school_id
                  AND schools.admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members
                   WHERE school_members.school_id = alumni.school_id
                     AND school_members.user_id = auth.uid()
                     AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    );

-- Alumni self-register via invite link (INSERT own record)
DROP POLICY IF EXISTS "Alumni self-register via invite" ON public.alumni;
CREATE POLICY "Alumni self-register via invite"
    ON public.alumni FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Alumni view & update own record
DROP POLICY IF EXISTS "Alumni view own profile" ON public.alumni;
CREATE POLICY "Alumni view own profile"
    ON public.alumni FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Alumni update own profile" ON public.alumni;
CREATE POLICY "Alumni update own profile"
    ON public.alumni FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admin manage invite links
DROP POLICY IF EXISTS "School admins manage alumni invites" ON public.alumni_invites;
CREATE POLICY "School admins manage alumni invites"
    ON public.alumni_invites FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.schools
                WHERE schools.id = alumni_invites.school_id
                  AND schools.admin_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_members
                   WHERE school_members.school_id = alumni_invites.school_id
                     AND school_members.user_id = auth.uid()
                     AND school_members.role IN ('admin','owner','school_admin','school_representative'))
    );

-- Alumni can read invite links (to validate on join)
DROP POLICY IF EXISTS "Anyone can read alumni invite codes" ON public.alumni_invites;
CREATE POLICY "Anyone can read alumni invite codes"
    ON public.alumni_invites FOR SELECT USING (true);

-- Verify
SELECT policyname, tablename, cmd FROM pg_policies
WHERE tablename IN ('alumni','alumni_invites')
ORDER BY tablename, policyname;
