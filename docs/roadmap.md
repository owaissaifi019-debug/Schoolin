# Product Roadmap

This document outlines the current module statuses, active sprints, and future objectives of CampusLink.

---

## 1. Release Overview & Sprints

```text
Core Social Portal  [====================] 100% (Completed)
Realtime Messaging   [====================] 100% (Completed)
Classroom Management [====                ]  20% (In Progress / Redesign)
Parent Portal        [                    ]   0% (Planned)
```

---

## 2. Completed Features

These features are fully implemented, tested, and active in the production codebase:

- [x] **Authentication Core**
  - [x] Unified login and signup forms with responsive tab controls.
  - [x] Avatar uploads to Supabase `avatars` storage buckets.
  - [x] Onboarding profile completion checks.
  - [x] Automated profile creation triggers in PostgreSQL.
- [x] **Social Feed & Community Hub**
  - [x] Personal achievement posting filters.
  - [x] Official school announcements posting (scoped to school admins).
  - [x] Like and Comment systems with cascade deletions database triggers.
  - [x] Mentions autocomplete (`@user` or `@school`) with dynamic input positioning.
- [x] **School Profiles Directory**
  - [x] Search grid filtering schools by city, board, and search keywords.
  - [x] Cover and logo image upload integrations scoped to school representatives.
  - [x] Verified student, teacher, and alumni member directory tabs.
  - [x] Verification badges (Blue/Gold) managed by Super Admins.
- [x] **Academic Admissions**
  - [x] Active admission listings search board.
  - [x] Admissions application form submissions logging parental contact details.
  - [x] Status trackers (`pending`, `approved`, `rejected`) managed by school representatives.
- [x] **Inter-School Events**
  - [x] Academic fests calendar listings.
  - [x] Dynamic registrations for individuals and teams.
- [x] **Real-time Messaging**
  - [x] Direct message chat windows.
  - [x] Real-time message synchronization via WebSockets.
  - [x] Automated general inquiry chat routing to school pages.
- [x] **Platform Moderation**
  - [x] Post reporting trigger modal.
  - [x] Super Admin audit logs panel to resolve or ignore flagged posts.

---

## 3. In Progress / Under Redesign

These features represent modules whose database structures exist, but frontend layout systems are currently undergoing a redesign to fit the platform's social features:

- [/] **Classroom Management Redesign**
  - [x] Create PostgreSQL schemas for classrooms, grades, sections, and room capacities.
  - [ ] Implement new frontend dashboard controls (`classroom.html` and `create-classroom.html` currently redirect to the main feed).
- [/] **Academic Years**
  - [x] Set up PostgreSQL database tables for sessions (`academic_years` unique constraints).
  - [ ] Code the frontend control panels for transitioning active sessions.
- [/] **Teacher Assignments**
  - [x] Define databases mapping permanent/temporary teacher roles and subjects.
  - [ ] Build the UI roster display tabs for school admins.
- [/] **Student Management Roster**
  - [x] Define classroom student mappings with roll numbers.
  - [ ] Build the student management controls inside school admin panels.

---

## 4. Planned

Features slated for upcoming development sprints:

- [ ] **Capacitor Push Notifications**: Register native Android devices to receive notifications on message receipt or connection approval.
- [ ] **Google Calendar Sync**: Add actions to sync registered fests or competitions with external calendars.
- [ ] **Auto-School Onboarding**: Add controls to let Super Admins approve and convert suggested schools into active directory listings.

---

## 5. Future Vision

Long-term strategic roadmap goals:

- [ ] **AI Recommendation Matchmaker**: Recommend fests or connection lists based on students' achievements, sports profile tags, and certificates.
- [ ] **Parent Portal (ADR-004)**: Add grade sheets, digital report cards, attendance logs, and fee invoice payments (planned; database schemas not yet provisioned).
