# Architecture Decision Record (ADR)
## Title: ADR-002 Posting Permissions Validation Trigger

* **Date**: July 2026
* **Status**: Approved / Implemented

---

## 1. Problem
To maintain feed quality, students and general members must be blocked from posting official announcements under a school's name. Only verified school representatives and school admins should be allowed to publish official school posts.

---

## 2. Decision
Implement a PostgreSQL trigger (`tr_validate_post_permissions` calling `validate_post_permissions()`) on the `posts` table that intercepts all INSERT and UPDATE operations to enforce posting rules:
* If the creator is a student, the post type must be `'personal'`, and the associated `school_id` must be NULL.
* If the creator is a school admin, the post type must be `'school'`.

---

## 3. Alternatives Considered
* **Client-Side Validation Only**: Rejected as it can be bypassed.
* **Separating Tables**: Splitting posts into `personal_posts` and `school_posts` tables. Rejected because it complicates feed queries.

---

## 4. Reasoning
* **Guaranteed Enforcement**: Database triggers intercept all SQL queries, blocking unauthorized inserts before rows are written.
* **Unified Feed Queries**: Keeping all posts in a single table keeps feed loading fast and simple.

---

## 5. Consequences
* Errors triggered by validation policies return database exceptions to the client, which must be caught and displayed as user-friendly toast notifications.

---

## 6. Future Impact
* Simplifies adding new post types or topic constraints in the future, as validation rules are centralized in a single trigger function.
