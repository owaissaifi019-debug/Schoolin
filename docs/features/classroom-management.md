# Feature: Classroom Management (In Progress)

This document details the database definitions, access rules, and redevelopment progress of the Classroom Management feature.

---

## 1. Purpose
Provides schools with a tool to structure classrooms by grade and section (e.g. "Class IX - Section A"), track student capacities, assign class teachers, and archive historical cohorts.

---

## 2. Current Status
* **Status**: In Progress / Redevelopment
* **Database status**: PostgreSQL schemas and RLS policies are fully provisioned.
* **Frontend status**: Stubbed. Frontend views (`classroom.html`, `create-classroom.html`) redirect to `dashboard.html` while interface designs are rebuilt.

---

## 3. User Roles
* **School Admin**: Can create, update, and archive classrooms.
* **Class Teacher**: Can manage student assignments within their assigned classroom.
* **Student / Parent**: Read-only access to their active classroom roster and schedules.

---

## 4. UI Components
* **Classroom Grid View**: Panel showing all active classrooms with student counts, capacity meters, and designated class teachers (design pending).
* **Classroom wizard**: Setup flow to define grades, sections, room numbers, and capacity limits (design pending).

---

## 5. Database Tables & RLS
* **Table**: `classrooms` (references `schools`, `academic_years`).
* **Constraints**: Unique combinations of `(school_id, academic_year_id, grade, section)`.
* **Permissions**:
  * Read access is public.
  * All modification operations (insert, update, delete) are restricted to the school's admin user (`schools.admin_user_id = auth.uid()`).

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Add attendance trackers and digital grade sheet grids.
* Support syllabus calendar shares.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* Unique constraints prevent duplicate sections within the same academic year.
* Archived columns (`is_archived`) help hide historical cohorts from active drop-down lists while preserving registration history.
