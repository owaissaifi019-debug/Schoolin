# Architecture Decision Record (ADR)
## Title: ADR-001 Role-Based Permissions Architecture

* **Date**: July 2026
* **Status**: Approved / Implemented

---

## 1. Problem
CampusLink requires a secure permission system that controls access based on both the user's role on the platform (`user`, `school_admin`, `super_admin`) and their membership status within a school. This system must prevent unauthorized data modification, even if client-side code is decompiled or modified.

---

## 2. Decision
Implement role-based security rules directly in the database using **PostgreSQL Row-Level Security (RLS)**, supported by a `platform_role` column in the `profiles` table. The frontend JavaScript client will query Supabase directly, sending the user's JWT. The database checks RLS policies on each query.

---

## 3. Alternatives Considered
* **Client-Side Authorization Check**: Rejected because client-side code can be modified by users to bypass checks.
* **Server-Side API Gateway**: Rejected because it increases hosting costs and setup complexity.

---

## 4. Reasoning
* **Database-Level Protection**: RLS policies are executed inside the database, making them impossible for clients to bypass.
* **Declarative Security**: Policies are defined directly in SQL schemas alongside tables, simplifying updates.
* **Low Latency**: Queries are checked inline as they execute, avoiding extra network roundtrips.

---

## 5. Consequences
* Every new table must have RLS enabled and corresponding policies defined for SELECT, INSERT, UPDATE, and DELETE.
* Developing and testing requires running SQL migration files locally or in a staging environment.

---

## 6. Future Impact
* Supports scaling up to millions of users, as RLS policies scale directly with PostgreSQL query execution.
