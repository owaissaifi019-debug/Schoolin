# CampusLink Conversation Creation UI Report

## 1. Components Added & Modified
- **New Group Button Replacement**: The inbox/sidebar "+ New Group" button in `messaging.html` was renamed and hooked to the new modal workflow.
- **Create Conversation Modal**: Added a modern centered overlay dialog in `messaging.html` featuring custom-themed grids, dropdown pickers, visibility controls, category-grouped search lists, and permission selectors.
- **Visual Styles**: Appended transition triggers, hover states, selection states, and fade-in animations to `css/messaging.css`.

---

## 2. Modal Structure
The modal follows a clean, single-screen layout with structured sections that act as visual steps:
1. **Conversation Type Selection**: Selectable cards for Custom Group, Direct Message, and greyed-out coming soon types (Classroom, Announcements, Parents, Teachers, Clubs). Only one active type is highlighted at a time.
2. **Group Information**: Contains name, description, photo upload (with base64 preview rendering), and purpose mapping (e.g. general discussion, homework, study group, etc.). Dynamically hidden for Direct Messages.
3. **Visibility**: Radio inputs for choosing access level (Private, School Members Only, Invite Only).
4. **Members**: A search bar showing category-grouped school members (Teachers, Students, School Representatives). Selected members appear above as removable chip badges.
5. **Conversation Permissions**: Fine-grained controls for send, edit info, add members, pin messages, and change photo authority (Everyone, Admins, Owner).

---

## 3. Conversation Type Architecture
- **Type Selection handler (`selectConvType`)**: Changes active UI cards and toggles visibility of Step 2 (Group Details) and Step 5 (Permissions) when switching between `Custom Group` and `Direct Message`.
- **Direct Message Flow**: Automatically triggers `initNewDirectChat()` directly to open private channels.
- **Group Creation Flow**: Automates a multi-write transaction (setting name, description/purpose, and group avatar, establishing legacy participant indexes, and adding permission mappings in `conversation_members`). It initiates with a system log message.
- **Purpose Badge Integration**: Storing the group purpose maps it directly to the inbox badge for a colorful, unified categorizing system.

---

## 4. Responsive Verification
- **Desktop**: Renders as a 560px centered pop-up with structured grid alignment.
- **Tablet / Mobile**: Automatically adapts layout using media queries. The list elements, permission dropdowns, and category badge rows stack vertically. Internal body scrolling is configured to ensure all fields are accessible on smaller mobile screens.

---

## 5. Future Extensibility
The type selection container and form groups are modularly structured. Adding new types (e.g. Classroom Channels or Announcement Feeds) in the future requires:
1. Enabling cards in Step 1 by removing the `greyed` styling class.
2. Directing submission handlers to the corresponding type value. No HTML restructuring or layout changes are required.
