# Feature: Student Management (In Progress)

This document details the database definitions, access rules, and redevelopment progress of the Student Management feature.

---

## 1. Purpose
Allows schools to enroll verified student profiles into classrooms, assign roll numbers, and view student lists.

---

## 2. Current Status
* **Status**: In Progress / Redevelopment
* **Database status**: PostgreSQL schemas and RLS policies are fully provisioned.
* **Frontend status**: Stubbed. Frontend views (`classroom.html`, `create-classroom.html`) redirect to `dashboard.html` while interface designs are rebuilt.

---

## 3. User Roles
* **School Admin**: Can add or remove students from classrooms and assign roll numbers.
* **Class Teacher**: Can view the roster of their assigned classroom.
* **Student / Parent**: Read-only access to their own classroom assignments.

---

## 4. UI Components
* **Roster Table**: List of students inside classroom workspaces showing roll numbers and names (design pending).

---

## 5. Database Tables & RLS
* **Tables**: `classroom_students`, `school_members`, `profiles`.
* **Permissions**:
  * Read access is public.
  * Modification permissions are restricted to the school's admin user (`schools.admin_user_id = auth.uid()`).

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Add batch-import tools using CSV file uploads to let school admins assign student lists quickly.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* The `classroom_students` table uses a unique constraint on `(classroom_id, student_id)` to prevent a student from being enrolled in the same classroom multiple times.
