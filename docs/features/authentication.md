# Feature: Authentication & Profile System

This document outlines the user registration, session verification, and automatic profile creation features of CampusLink.

---

## 1. Purpose
Provides secure email-and-password signups, logins, and logouts. Automatically creates matching profile details inside the database, synchronises user metadata, and manages user role checks.

---

## 2. Current Status
* **Status**: Completed / Active
* **Frontend files**: `login.html`, `login.js`, `complete-profile.html`, `complete-profile.js`
* **JS Code module**: `auth.js`

---

## 3. User Roles
* **Anonymous Guest**: Can view public profiles, landing pages, school listings, admissions, and event directories. Can submit login/signup request forms.
* **Member / Representative / Admin**: Authenticated user session.

---

## 4. UI Components
* **Login Form** (`login.html`): Toggleable Sign In / Sign Up panels. Shows password toggles. Checks email forms and blocks submissions if terms consent is missing.
* **Profile Completion Wizard** (`complete-profile.html`): Prompts new signups to verify user types and key metadata (school board/city references for reps, grade references for students).
* **Profile Card Dropdown** (`me-dropdown`): Premium header card displaying current avatar initials, full name, platforms roles, and quick navigation menu.

---

## 5. Database Tables & RLS
* **Table**: `profiles` (references `auth.users`)
* **Triggers**:
  * `on_auth_user_created`: Fires after `auth.users` row creation, automatically transferring name/user_type and provisioning a `profiles` row.
  * `tr_enforce_role_change`: Checks updates to `profiles.platform_role` and blocks changes from non-super_admin accounts.
* **Permissions**:
  * Anyone can read profile details.
  * Users can only edit their own profile contents (`auth.uid() = id`).
  * Only super admins can update `platform_role`.

---

## 6. Dependencies
* **Libraries**: Supabase JS Client (loaded via CDN).
* **Storage Bucket**: `avatars` bucket (holds user avatars with public read access).

---

## 7. Future Improvements
* Bind password-reset forms via email recovery channels.
* Implement Google and third-party OAuth signin modules.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* To prevent client escalation, the frontend never sends `platform_role` when calling `signUp()`. The database trigger automatically forces `'user'` roles, preventing malicious requests from asserting administrative rights.
* If a school representative logs in but does not have a matching `schools` row, `getSchoolForUser()` auto-provisions a blank school profile matching their email settings.
