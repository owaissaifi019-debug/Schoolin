# Feature: Teacher Management (In Progress)

This document details the database definitions, access rules, and redevelopment progress of the Teacher Management feature.

---

## 1. Purpose
Tracks the assignment of teachers to classrooms, audits temporary vs permanent status changes, and manages subject teachers (e.g. mapping "Mr. Kumar" to teach "Physics" in "Class IX-A").

---

## 2. Current Status
* **Status**: In Progress / Redevelopment
* **Database status**: PostgreSQL schemas and RLS policies are fully provisioned.
* **Frontend status**: Stubbed. Frontend views (`classroom.html`, `create-classroom.html`) redirect to `dashboard.html` while interface designs are rebuilt.

---

## 3. User Roles
* **School Admin**: Can assign or update class teachers and map subject teachers.
* **Teacher**: Read-only access to their assignments (design pending).

---

## 4. UI Components
* **Teacher Assignment Panel**: Grid interface inside the school profile editor listing all verified teachers and their assigned classes/subjects (design pending).

---

## 5. Database Tables & RLS
* **Tables**: `classroom_teacher_assignments`, `classroom_subject_teachers`, `school_members`.
* **Permissions**:
  * Read access is public.
  * Modification permissions are restricted to the school's admin user (`schools.admin_user_id = auth.uid()`).

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Add a scheduling conflict checker to alert school admins if a teacher is booked for two classes in the same period.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* The `classroom_teacher_assignments` table logs start dates, end dates, and assignment reasons to keep an audit trail of temporary replacements (e.g., when a teacher is on leave).
