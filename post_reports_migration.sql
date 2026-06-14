-- post_reports_migration.sql
-- Run this in the Supabase SQL Editor to enable Post Reporting and Moderation.

-- Create post reports table
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL, -- Keep raw UUID to preserve audit logs if the post is deleted
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('Spam', 'Harassment / Bullying', 'Inappropriate Content', 'Fake Information', 'Copyright Violation', 'Other')),
  details text,
  status text NOT NULL CHECK (status IN ('pending', 'ignored', 'deleted')) DEFAULT 'pending',
  post_content text, -- snapshot of post content for audit records
  post_author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- snapshot of author ID
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- ── Policies ──

-- Authenticated users can insert reports
CREATE POLICY "Authenticated users can insert reports"
  ON public.post_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only super admins can view reports
CREATE POLICY "Super admins can select reports"
  ON public.post_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Only super admins can update/resolve reports
CREATE POLICY "Super admins can update reports"
  ON public.post_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );
