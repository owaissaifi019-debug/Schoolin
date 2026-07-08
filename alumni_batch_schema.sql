-- ============================================================
-- CampusLink – Alumni Batch Management Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop existing tables to ensure a clean installation and avoid column mismatches
DROP TABLE IF EXISTS public.alumni_requests CASCADE;
DROP TABLE IF EXISTS public.alumni_members CASCADE;
DROP TABLE IF EXISTS public.alumni_invites CASCADE;
DROP TABLE IF EXISTS public.alumni_batches CASCADE;

-- 1. Extend Profiles Table for Alumni Metadata
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS passing_year INTEGER,
ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Alumni Batches Table
CREATE TABLE IF NOT EXISTS public.alumni_batches (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID            NOT NULL,
    passing_year        INTEGER         NOT NULL,
    department          TEXT,                           -- e.g. "Science", "Commerce" (optional)
    program             TEXT,                           -- e.g. "Class XII", "B.Tech" (optional)
    description         TEXT,
    cover_image         TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_batch_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_creator FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Unique index to prevent duplicate batches for the same school, year, department, and program
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_school_batch 
ON public.alumni_batches (school_id, passing_year, COALESCE(department, ''), COALESCE(program, ''));

CREATE INDEX IF NOT EXISTS idx_alumni_batches_school ON public.alumni_batches(school_id);
CREATE INDEX IF NOT EXISTS idx_alumni_batches_year ON public.alumni_batches(passing_year);

-- 3. Alumni Invite Links Table
CREATE TABLE IF NOT EXISTS public.alumni_invites (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID,                           -- nullable for general/any year invites
    school_id       UUID            NOT NULL,
    invite_code     VARCHAR(50)     UNIQUE NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    expires_at      TIMESTAMPTZ,
    uses_count      INTEGER         NOT NULL DEFAULT 0,
    created_by      UUID,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invite_batch FOREIGN KEY (batch_id) REFERENCES public.alumni_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_creator FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alumni_invites_code ON public.alumni_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_batch ON public.alumni_invites(batch_id);
CREATE INDEX IF NOT EXISTS idx_alumni_invites_school ON public.alumni_invites(school_id);

-- 4. Alumni Members Table (linking users to batches)
CREATE TABLE IF NOT EXISTS public.alumni_members (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID            NOT NULL,
    batch_id        UUID,                           -- nullable
    user_id         UUID            NOT NULL,
    joined_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_member_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_batch FOREIGN KEY (batch_id) REFERENCES public.alumni_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT unique_batch_member UNIQUE (batch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_members_batch ON public.alumni_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_alumni_members_user ON public.alumni_members(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_members_school ON public.alumni_members(school_id);

-- 5. Alumni Joining Requests Table
CREATE TABLE IF NOT EXISTS public.alumni_requests (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id               UUID            NOT NULL,
    batch_id                UUID,                           -- nullable
    invite_id               UUID,
    user_id                 UUID            NOT NULL,
    full_name               TEXT            NOT NULL,
    email                   TEXT            NOT NULL,
    username                TEXT            NOT NULL,
    passing_year            INTEGER         NOT NULL,
    department              TEXT,
    program                 TEXT,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
    info_request_details    TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_request_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_batch FOREIGN KEY (batch_id) REFERENCES public.alumni_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_invite FOREIGN KEY (invite_id) REFERENCES public.alumni_invites(id) ON DELETE SET NULL,
    CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT unique_batch_request UNIQUE (batch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_requests_school ON public.alumni_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_alumni_requests_batch ON public.alumni_requests(batch_id);
CREATE INDEX IF NOT EXISTS idx_alumni_requests_user ON public.alumni_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_requests_status ON public.alumni_requests(status);
