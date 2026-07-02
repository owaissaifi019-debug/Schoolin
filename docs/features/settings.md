# Feature: User Settings & Profile Editing

This document details the student profile settings customization, skills and certificates inputs, and account deletion procedures.

---

## 1. Purpose
Allows users to customize their profiles, update bio details, log certificates/skills/achievements/sports portfolios, and request permanent account deletions.

---

## 2. Current Status
* **Status**: Completed / Active
* **Frontend Files**: Integrated inside `profile.html` / `profile.js`, `delete-account.html`

---

## 3. User Roles
* **Student / Teacher / Alumni**: Can edit their own bio information, list achievements, certificates, skills, and sports, and submit account deletion requests.
* **School Representative**: Guided to manage settings directly via their School Profile page.

---

## 4. UI Components
* **Profile Header View**: Displays user's name, user type, school link, bio, and portfolio sections.
* **Edit Profile Modal**: Interactive panel showing text boxes, skills checklist tags, and multi-field inputs for sports and certificates.
* **Settings Page Link**: Quick links in the header profile card to edit settings.
* **Delete Account Page** (`delete-account.html`): Displays instructions and guidelines for account cancellations.

---

## 5. Database Tables & RLS
* **Table**: `profiles` (contains LinkedIn-style fields like `bio`, `skills`, `certificates`, etc.).
* **Permissions**:
  * Anyone can read profile details.
  * Only the profile owner can modify their profile properties (`auth.uid() = id`).

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Add security tabs for password changes and MFA token setup.
* Support document upload for physical paper certificates validation.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* Portfolio fields (`skills`, `achievements`, `sports`, `certificates`) are stored as array columns (`text[]`) in PostgreSQL, allowing rapid updates without requiring separate join tables.
