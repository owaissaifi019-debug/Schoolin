# CampusLink: Teacher Classroom Access & Workspace (Phase 4C)

This report details the implementation of **Phase 4C – Teacher Classroom Access & Workspace**, separating the teacher workspace from the School Admin dashboard, verifying backend capabilities, and specifying permission boundaries.

---

## 1. Workspace Segregation & New Page (`classroom.html`)

Instead of trying to force teachers into the School Admin Dashboard (`dashboard.html`), which throws an **Access Denied** alert due to platform-role restrictions (`role === 'user'`), we have created a dedicated, lightweight, and fully integrated **Teacher Classroom Page** at `classroom.html`.

- **Redirect Flow**:
  - When a teacher logs in or clicks the **🏫 Classroom** nav link/icon, they are routed to `classroom.html`.
  - The security check in `dashboard.js` has been updated to bypass the platform-role check specifically for pages containing `classroom.html`.
- **Default View**:
  - Direct navigation to `classroom.html` automatically initializes the profile switcher to `'teacher'`, hides the administrator dropdown, and triggers the **Teacher Classroom Hub** panel directly.
  - The sidebar displays only the **Classroom Hub** nav tab and the **Logout** button.

---

## 2. Teacher Verification Status & Headers

The system supports two distinct states depending on whether the teacher has been verified by the school:

### A. Unverified Teachers
- **Topbar Link**: Displays a locked, greyed-out classroom icon (50% opacity, 🔒 badge) that redirects to the Schools directory (`schools.html`) on click, reminding the teacher to request school affiliation.
- **Dropdown Warnings**: A notice is displayed in the "Me" avatar dropdown: `"Join school to access classroom hub."`
- **Workspace Placeholder**: A premium warning card is rendered in the hub indicating:
  - `"Access Locked: Verification Pending"`
  - Description: *"Your account has not been verified by any school. Please contact your school administrator to complete your verification and assign you to a classroom."*

### B. Verified Teachers
- **Topbar Link**: Displays an active **🏫 Classroom** link (with live classrooms count badge) that points to `classroom.html`.
- **Workspace Hub**: Automatically displays a grid of classroom cards representing classes assigned to the teacher.

---

## 3. Classroom Cards & Quick Actions

Verified teachers can see classroom cards on the hub grid containing:
1. **Academic Metrics**: Total students, attendance status (e.g. *Taken (95.2%)* or *Pending*), homework status, and upcoming events.
2. **Teacher Role Badge**:
   - `Class Teacher`: For the class teacher designated to lead that section.
   - `Subject Teacher`: For teachers assigned only to teach a specific subject in that section.
3. **Quick Actions**:
   - **Open Workspace**: Enters the Classroom Workspace.
   - **Mark Attendance**: Directly launches the attendance marking modal (if permitted).

---

## 4. Role-based Attendance Permission Boundaries

In the Classroom Workspace, clicking the **Attendance** tab renders role-specific permissions:
- **Class Teacher (or Administrator)**:
  - Can view previous attendance records.
  - Can click **Mark Attendance** to launch the interactive student roster modal, toggle *Present/Absent* checkboxes, and save attendance.
- **Subject Teacher**:
  - Restricted to read-only access.
  - Displays: **"Class Attendance Log (View Only)"**.
  - Roster checkboxes and action buttons are omitted, preventing subject teachers from modifying class attendance sheets.

---

## 5. School Admin Verification & Class Assignment

School administrators manage teacher verifications and class mappings directly inside `dashboard.html`'s **Teachers** panel:
1. **Verification Toggle**: Selecting a teacher profile and clicking **Approve** updates their status to `verified` and `active`.
2. **Classroom Mapping**: Modifying a teacher profile opens a modal where the administrator can:
   - Mark the teacher as `Class Teacher` for a specific grade/section.
   - Map them as `Subject Teacher` for other classroom periods.
3. **Mock Sync**: All updates are persisted directly inside localStorage (`campuslink_teachers`, `campuslink_classrooms`, `campuslink_classroom_subjects`) and synced instantly to the community members list.
