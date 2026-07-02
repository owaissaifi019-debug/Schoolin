# Feature: Academic Years (In Progress)

This document details the database definitions, access rules, and redevelopment progress of the Academic Years feature.

---

## 1. Purpose
Enables schools to define distinct academic sessions (e.g., "2024-25", "2025-26") to group student enrollments and class structures.

---

## 2. Current Status
* **Status**: In Progress / Redevelopment
* **Database status**: PostgreSQL schemas and RLS policies are fully provisioned.
* **Frontend status**: Stubbed. Frontend views (`classroom.html`, `create-classroom.html`) redirect to `dashboard.html` while interface designs are rebuilt.

---

## 3. User Roles
* **School Admin**: Can create academic year blocks, edit year statuses, and toggle which session is currently active.
* **Student / Teacher / parent**: Read-only access (helps filter classroom rosters and historical details).

---

## 4. UI Components
* **Active Session Selector**: Dropdown component in the school admin dashboard allowing admins to transition the active session (design pending).

---

## 5. Database Tables & RLS
* **Table**: `academic_years`.
* **Constraints**: Unique combinations of `(school_id, name)`.
* **Permissions**:
  * Read access is public.
  * All modification operations (insert, update, delete) are restricted to the school's admin user (`schools.admin_user_id = auth.uid()`).

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Add automated archiving routines that copy active classroom student rosters when transitioning to a new academic year.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* PostgreSQL unique constraints on `(school_id, name)` prevent administrators from inserting duplicate sessions, keeping database structures clean.
