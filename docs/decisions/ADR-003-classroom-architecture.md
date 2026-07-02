# Architecture Decision Record (ADR)
## Title: ADR-003 Classroom Workspace Decoupling

* **Date**: July 2026
* **Status**: Approved / Implemented

---

## 1. Problem
The legacy classroom administration modules (academic schedules, rosters, and subject logs) were tightly coupled with page logic and layout frameworks, leading to console errors and RLS sync conflicts. We need to redesign the frontend from scratch while keeping the rest of the application stable.

---

## 2. Decision
Decouple and temporarily deactivate the Classroom frontend views:
* Add JavaScript redirection (`window.location.replace('dashboard.html')`) to `classroom.html` and `create-classroom.html` to run immediately on page load.
* Keep classroom database structures (`academic_years`, `classrooms`, `classroom_students`, etc.) active in PostgreSQL to serve as the foundation for the redesign.
* Mark the feature status as **In Progress / Slated for Rebuild** in product roadmaps.

---

## 3. Alternatives Considered
* **Keeping Legacy Classroom UI Active**: Rejected as it caused console errors, RLS sync failures, and negative user feedback.
* **Completely Dropping Classroom Database Tables**: Rejected as it would destroy the database foundation we want to build upon.

---

## 4. Reasoning
* **Stable Deployments**: Redirecting users prevents access to broken or half-implemented legacy views while we rebuild the frontend.
* **No Database Regression**: Preserving database schemas avoids data migration headaches. Development teams can build and test the new UI against active, standard database schemas.

---

## 5. Consequences
* The redirection blocks must be removed from `classroom.html` and `create-classroom.html` once the new frontend views are completed.
* School admins will not be able to manage academic years or teacher allocations until the new interfaces are live.

---

## 6. Future Impact
* Rebuilding the classroom dashboard from scratch enables us to design a modern, responsive layout that fits the rest of the application.
