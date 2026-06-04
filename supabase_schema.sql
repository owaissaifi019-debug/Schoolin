-- Supabase schema for CampusLink
-- Run this in the Supabase SQL Editor

-- Enable UUID extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  board text,
  contact_email text,
  website text,
  logo_url text,
  logo_letter text DEFAULT 'S',
  color_class text DEFAULT 'bg-gradient-1',
  about text,
  events_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Events table (references schools)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  description text,
  event_date text,
  venue text,
  deadline text,
  registration_link text,
  banner_url text,
  tag text,
  city text,
  school_name text,
  registrations text DEFAULT '0 Registered',
  logo_letter text DEFAULT '🎉',
  created_at timestamp with time zone DEFAULT now()
);

-- Admissions table (references schools)
CREATE TABLE IF NOT EXISTS admissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  school_name text,
  city text,
  board text,
  classes_open text,
  class_levels text[] DEFAULT '{}',
  eligibility text,
  start_date text,
  end_date text,
  last_date text,
  apply_link text,
  details text,
  academic_year text,
  brochure text,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;

-- ── Schools Policies ──

-- Anyone can read schools
CREATE POLICY "Schools are viewable by everyone"
  ON schools FOR SELECT
  USING (true);

-- Only the admin who owns the school can insert
CREATE POLICY "School admins can insert their own school"
  ON schools FOR INSERT
  WITH CHECK (auth.uid() = admin_user_id);

-- Only the admin who owns the school can update
CREATE POLICY "School admins can update their own school"
  ON schools FOR UPDATE
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id);

-- Only the admin who owns the school can delete
CREATE POLICY "School admins can delete their own school"
  ON schools FOR DELETE
  USING (auth.uid() = admin_user_id);

-- ── Events Policies ──

-- Anyone can read events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- School admins can insert events for their own school
CREATE POLICY "School admins can create events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = events.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can update their own school's events
CREATE POLICY "School admins can update their events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = events.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can delete their own school's events
CREATE POLICY "School admins can delete their events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = events.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- ── Admissions Policies ──

-- Anyone can read admissions
CREATE POLICY "Admissions are viewable by everyone"
  ON admissions FOR SELECT
  USING (true);

-- School admins can insert admissions for their own school
CREATE POLICY "School admins can create admissions"
  ON admissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = admissions.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can update their own school's admissions
CREATE POLICY "School admins can update their admissions"
  ON admissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = admissions.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );

-- School admins can delete their own school's admissions
CREATE POLICY "School admins can delete their admissions"
  ON admissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schools
      WHERE schools.id = admissions.school_id
      AND schools.admin_user_id = auth.uid()
    )
  );
