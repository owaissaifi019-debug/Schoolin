# Feature: Connections & Profiles Follow

This document details the networking directory, connection request lifecycles, and user/school follow systems.

---

## 1. Purpose
Allows users to build their academic networks by sending connection requests, managing incoming requests, and following profiles or schools.

---

## 2. Current Status
* **Status**: Completed / Active
* **Frontend Components**: `networking.html`
* **Controller Logic**: `networking.js`

---

## 3. User Roles
* **Student / Teacher / Alumni / parent**: Can browse profiles, search, send connection requests, and follow people or schools.
* **School Representative / Admin**: Can follow school pages and users.

---

## 4. UI Components
* **Networking Dashboard** (`networking.html`): Search input and directory grid showing cards with user profiles, titles, and connection state buttons.
* **Connections Tabs**: Toggles view between:
  * **People Directory**: Browse all users.
  * **Pending Requests**: Displays incoming requests with Accept/Ignore actions.
  * **My Connections**: Renders list of mutual connections.
  * **Schools Directory**: Directory of schools.

---

## 5. Database Tables & RLS
* **Tables**: `connections` (mutual user-to-user links), `follows` (unidirectional user-to-user or user-to-school links).
* **Permissions**:
  * Connections and follows are readable by everyone.
  * Authenticated users can send connection requests or follow targets.
  * The recipient must approve requests (`receiver_id = auth.uid()`).
  * Either user can delete a connection.

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Add connection recommendations based on mutual friends or shared school affiliations.
* Add CSV export utilities for personal connection networks.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* Connections require reciprocal approval to change status from `'pending'` to `'accepted'`.
* Follow triggers allow users to receive updates in their feed without needing reciprocal approvals.
