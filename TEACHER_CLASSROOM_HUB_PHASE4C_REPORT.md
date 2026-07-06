# CampusLink School Management
## Phase 4C – Teacher Classroom Hub Report

This report summarizes the design, implementation, and verification of the **Teacher Classroom Hub** workspace designed for teachers.

---

### 1. Components & UI Elements Added
* **Simulated Profile Switcher (Topbar Header)**:
  * Dropdown in the header toolbar (`#header-profile-role-switcher`) that toggles the global logged-in session between **School Admin** and **Teacher**.
* **Profile-Specific Classroom Hub Buttons**:
  * Desktop and mobile buttons (`#header-classroom-hub-btn`, `#mobile-classroom-hub-btn`) showing a school icon (`🏫`) and a live badge of active classrooms.
* **Teacher Classroom Hub Tab Panel**:
  * Dedicated dashboard view (`#teacher-classroom-hub-tab`) showing the teacher's overview, classroom statistics, and a grid of classroom cards.
* **Assigned Classroom Cards**:
  * Individual high-fidelity card component detailing academic year, class/section, subjects taught, teacher's role (Class vs Subject), student count, today's attendance status, next period schedule, pending homework, and unread announcements.
* **Timetable Schedule Widget**:
  * Section inside each card displaying today's periods, next class, room number, subject, and teacher.

---

### 2. Teacher Navigation & Authorization Control
* **Restricted Sidebar Access**:
  * When switched to the **Teacher** profile, all school administration menu items (e.g. Admissions, Registrations, Students, Teachers, Settings) are automatically hidden from the sidebar.
  * The sidebar is replaced by a single **Classroom Hub** workspace link, ensuring the teacher cannot access administrative features.
* **Profile Header Sync**:
  * Switching to a Teacher profile dynamically replaces the header brand name with the teacher's name (e.g. *Ali Ahmad*) and displays their active department.

---

### 3. Classroom Workspace & Auto-Role Selection
* Clicking **Open Workspace** on a card routes the teacher directly to the classroom workspace.
* The system automatically detects and applies their classroom role:
  * **Class Teacher**: Access to all student records, daily attendance log, behaviour notes, and class reports.
  * **Subject Teacher**: Limited to homework assignments, announcements, resources, and timetable.
* Quick-action buttons (e.g. *Take Attendance*, *Add Homework*) route the user straight to the respective workspace submodule.

---

### 4. Responsive Layout Verification
* The cards utilize CSS Grid layout (`repeat(auto-fill, minmax(320px, 1fr))`) to adapt dynamically to desktop monitors, tablets, and mobile screens.
* Sidebar transitions and mobile drawers scale smoothly and preserve visibility of the new teacher shortcuts.
