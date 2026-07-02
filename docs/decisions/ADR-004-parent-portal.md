# Architecture Decision Record (ADR)
## Title: ADR-004 Parent Portal Module Design

* **Date**: July 2026
* **Status**: Proposed / Planned

---

## 1. Problem
Parents need a simple way to track their child's academic performance, attendance, fee invoices, and communicate with class teachers, without cluttering the main social feed.

---

## 2. Decision
Implement a dedicated **Parent Portal** module:
* Add a `child_id` column to the `profiles` table to link parent profiles with student profiles.
* Create a dedicated view (`parent-portal.html`) that loads the child's academic progress, attendance records, and teacher contacts.
* Restrict access to these views using RLS policies, ensuring only linked parents and school administrators can view a student's data.

---

## 3. Alternatives Considered
* **Single Dashboard View**: Merging parent features into the main student dashboard. Rejected because it complicates the UI and raises child safety concerns.
* **Separating Platforms**: Building a separate application for parents. Rejected because it increases development costs and maintenance overhead.

---

## 4. Reasoning
* **Data Security & Privacy**: Storing parent-child relations directly in the database enables us to write RLS rules that protect student records.
* **Tailored User Experience**: A dedicated view provides parents with the specific tools and info they need, without social feed clutter.

---

## 5. Consequences
* We must create a verification workflow to approve parent-child link requests before they are written to the database.
* RLS rules on student performance tables must check parent-child link relations.

---

## 6. Future Impact
* Provides a secure foundation for future parent-teacher communication tools and online payment integrations.
