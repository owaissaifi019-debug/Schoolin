### Impact
Because of this syntax error, the browser's JavaScript engine rejected `dashboard.js` on load. The entire script failed to parse:
* The `DOMContentLoaded` callback was never executed.
* The `setupAcademicEventListeners()` function was never called.
* None of the UI click events (including "+ Add New") were attached.
* Clicking the "+ Add New" button did nothing.

### File and Line Number
* **File**: `dashboard.js`
* **Line Number**: Around `3703` (Subject Form Submit block)

### Exact Fix Applied
1. Restored the full, valid syntax for the event listener:
   ```javascript
   const subjectForm = document.getElementById('academic-subject-form');
   if (subjectForm) {
     subjectForm.addEventListener('submit', (e) => {
       ...
     });
   }
   ```
2. Implemented defensive, null-safe DOM querying across all other event listeners inside `setupAcademicEventListeners()` to prevent potential runtime `TypeErrors` on load.
3. Added cache-busting version headers (`?v=1.3`) to all script imports in `dashboard.html` to force browsers to reload fresh assets.

---

## 2. Supabase Migration SQL Policy Collision

### Root Cause
When executing the SQL schema queries in the Supabase console, Postgres thrown the following error:
`ERROR: 42710: policy "School Admins can select academic years" for table "academic_years" already exists`

This occurred because:
1. An older RLS policy with the same name was already bound to the table.
2. The drop statement (`DROP POLICY IF EXISTS ... ON academic_years;`) lacked explicit schema qualification (`public.academic_years`), failing to drop the policy before recreation.

### File and Line Number
* **File**: `academic_management_schema.sql`
* **Line Number**: Lines `137–138` (and similar RLS block definitions)

### Exact Fix Applied
Prefixed all table targets and drop statements in `academic_management_schema.sql` with explicit `public.` schema qualifiers:
```sql
DROP POLICY IF EXISTS "School Admins can select academic years" ON public.academic_years;
CREATE POLICY "School Admins can select academic years" ON public.academic_years
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM public.school_members WHERE school_id = academic_years.school_id AND role IN ('admin', 'owner')
    ));
```
This forces Postgres to match and cleanly drop the existing policies before attempting to create the new ones.

---

## 3. Verification

* **JavaScript compilation**: The syntax check passed successfully.
* **UI Responsiveness**: Opening and switching between Academic sub-tabs runs smoothly.
* **Modal Trigger**: Clicking the "+ Add New" button correctly targets the active subtab (Years, Classes, Sections, or Subjects) and sets `display: flex` on the respective modal overlay.
