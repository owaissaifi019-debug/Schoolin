# COLLEGE_SUPPORT_PHASE_C0_REPORT.md

This report details the implementation of Phase C0: Institution Type Management for CampusLink.

## 1. Files Modified / Created

- **[supabase_schema.sql](file:///e:/Owais/School%20Idea/SchoolIn/supabase_schema.sql)**:
  - Added the check constraint and new column `institution_type` to `public.schools` table (defaults to `'school'`).
  - Added SQL Security Definer trigger `tr_enforce_school_institution_type` to prevent non-super_admin accounts from updating `institution_type`.
- **[admin/index.html](file:///e:/Owais/School%20Idea/SchoolIn/admin/index.html)**:
  - Added "Institution Type" header column to the School Registry table.
- **[admin/admin.js](file:///e:/Owais/School%20Idea/SchoolIn/admin/admin.js)**:
  - Implemented client rendering for the Institution Type dropdown selector.
  - Bound dropdown change events to call the new `updateInstitutionType` Supabase database update handler.
- **[login.js](file:///e:/Owais/School%20Idea/SchoolIn/login.js)**:
  - Added logic during regular login, session recovery, and password updates to check the institution's type.
  - Redirects college-associated admins to `college-dashboard.html` instead of `dashboard.html`.
- **[dashboard.js](file:///e:/Owais/School%20Idea/SchoolIn/dashboard.js)**:
  - Added guard check to redirect to `college-dashboard.html` if the authenticated user's institution is a college.
- **[scratch/generate_college_dashboard.js](file:///e:/Owais/School%20Idea/SchoolIn/scratch/generate_college_dashboard.js)**:
  - Script created to copy and translate UI terminology for the College Admin Dashboard (`college-dashboard.html` and `college-dashboard.js`).

---

## 2. Database Changes

The following schema migration was added to `supabase_schema.sql` and must be executed in the Supabase SQL editor:

```sql
-- Add institution_type column to public.schools if it does not exist
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS institution_type text NOT NULL CHECK (institution_type IN ('school', 'college')) DEFAULT 'school';

-- Function to prevent non-super_admin from changing school institution_type
CREATE OR REPLACE FUNCTION public.enforce_school_institution_type_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.institution_type IS DISTINCT FROM OLD.institution_type THEN
    IF auth.role() = 'authenticated' AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND platform_role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Access Denied: Only super admins can change school institution type.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for school institution_type restriction
DROP TRIGGER IF EXISTS tr_enforce_school_institution_type ON public.schools;
CREATE TRIGGER tr_enforce_school_institution_type
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.enforce_school_institution_type_permissions();
```

---

## 3. Super Admin Changes

- Super Admins now have an **Institution Type** selector column in the registry table.
- They can switch any institution between **School** and **College** on-the-fly.
- A toast notification confirms success, and the registry data reloads instantly.
- Non-super admins will see the selector disabled, and Supabase RLS/trigger checks will reject any unauthorized attempts to edit it.

---

## 4. Institution Routing Logic

- **Login Redirection**: During authentication, if the user role is `school_admin`, their associated institution record is fetched. If `institution_type === 'college'`, they are routed to `college-dashboard.html`, otherwise to `dashboard.html`.
- **Dashboard Guarding**:
  - `dashboard.html` checks `school.institution_type`. If it is a college, it redirects to `college-dashboard.html`.
  - `college-dashboard.html` checks `school.institution_type`. If it is a school, it redirects to `dashboard.html`.
- This ensures users cannot access the wrong dashboard view.

---

## 5. Future Expansion Notes

- Phase C0 focuses on terminology adjustments without adding separate functionality.
- Future phases can use the `institution_type` field to toggle college-specific modules (e.g., Degree courses, semesters, credits) instead of class/grades.
