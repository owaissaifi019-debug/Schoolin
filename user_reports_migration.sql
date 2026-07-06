-- user_reports_migration.sql
-- Create user reports table to track flagged profiles/accounts

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'Inappropriate profile / behavior',
  details text,
  status text NOT NULL CHECK (status IN ('pending', 'dismissed', 'action_taken')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- ── Policies ──

-- Authenticated users can insert user reports
CREATE POLICY "Authenticated users can insert user reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only super admins can view user reports
CREATE POLICY "Super admins can select user reports"
  ON public.user_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_role = 'super_admin'
    )
  );

-- Only super admins can update/resolve user reports
CREATE POLICY "Super admins can update user reports"
  ON public.user_reports FOR UPDATE
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
