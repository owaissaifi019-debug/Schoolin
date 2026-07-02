# Architecture Decision Record (ADR)
## Title: 2026-07 Classroom Redesign & Redirection

* **Date**: July 2026
* **Status**: Approved / Implemented

---

## 1. Problem
The legacy classroom administration modules (academic schedules, subject logs, and class roster managers) were coupled with page logic and layout frameworks, which led to synchronization conflicts. A complete redesign is necessary to match the platform's social features, but we must keep other features stable during development.

---

## 2. Decision
Decouple and temporarily deactivate the Classroom frontend views:
* Stub out `classroom.html` and `create-classroom.html` to execute client-side redirects (`window.location.replace('dashboard.html')`) immediately upon page load.
* Keep classroom database structures (`academic_years`, `classrooms`, `classroom_students`, etc.) and RLS policies active in PostgreSQL to serve as the foundation for the redesign.
* Display the Classroom feature status as **In Progress / Slated for Rebuild** in roadmap documentation.

---

## 3. Reasoning
* **Stable Deployment**: Redirecting users prevents access to broken or half-implemented legacy views while we rebuild the frontend.
* **No Database Regression**: Preserving database schemas avoids data migration headaches. Development teams can build and test the new UI against active, standard database schemas.
* **UI Cleanliness**: Keeps user routing clean without removing navigation nodes, which would require extensive HTML file rewrites.

---

## 4. Alternatives Considered
* **Keeping Legacy Classroom UI Active**: Rejected as it caused console errors, RLS sync failures, and negative user feedback.
* **Completely Dropping Classroom Database Tables**: Rejected as it would destroy the foundation we want to build upon and require a complex database migration rollback.

---

## 5. Future Implications
* The redirection blocks must be removed from `classroom.html` and `create-classroom.html` once the new frontend views are completed.
* School admins will not be able to manage academic years or teacher allocations until the new interfaces are live.
