# Feature: Notifications Center

This document details the notifications feed dropdown, unread count badge, and link routing actions.

---

## 1. Purpose
Provides real-time notifications for user actions (likes, comments, connection requests, connection approvals, messages, mentions, follows).

---

## 2. Current Status
* **Status**: Completed / Active
* **JS Code module**: `notifications.js`

---

## 3. User Roles
* **Member / Rep / Admin**: Receive notifications triggered by other users' activities.

---

## 4. UI Components
* **Bell Action Button**: Header button displaying a red count badge (`notif-count-badge`) for unread items. Clicking it toggles the notifications tray overlay.
* **Notifications Dropdown**: Popover list of notifications with timestamps, actions, and custom icon indicators (e.g. ❤️ for likes, 💬 for comments). Includes a "Mark all as read" button.

---

## 5. Database Tables & RLS
* **Table**: `notifications`.
* **Database Indexes**: Optimized for recipient views (`idx_notifications_user_id`, `idx_notifications_user_unread`).
* **Permissions**:
  * Users can only read, update (mark as read), or delete notifications sent to them (`auth.uid() = user_id`).
  * Any authenticated user can insert notifications.

---

## 6. Dependencies
* **Libraries**: Supabase SDK.

---

## 7. Future Improvements
* Set up Web Push notifications for push alerts on Android devices.
* Allow users to configure email delivery schedules for notifications.

---

## 8. Known Issues
* None reported.

---

## 9. Implementation Notes
* Clicking a notification automatically calls an update query marking it as read and redirects the user to the associated content (e.g. dynamic event pages or chat tabs).
* Indexing configurations prioritize unread notifications (`idx_notifications_user_unread` where `is_read = false`) to speed up header badge load times.
