# API Reference & Data Integrations

This document describes the interface functions between the frontend JavaScript controllers and the Supabase API gateways.

---

## 1. Authentication & Session Management

### Function: `signUp(email, password, fullName, userType, avatarFile, termsAccepted)`
* **Purpose**: Registers a new user, uploads their avatar image, and creates their user profile.
* **JS Code File**: [auth.js](file:///e:/Owais/School%20Idea/SchoolIn/auth.js)
* **API Endpoint**: `supabase.auth.signUp()`
* **Inputs**:
  * `email` (string)
  * `password` (string)
  * `fullName` (string)
  * `userType` (string: `'student'`, `'teacher'`, etc.)
  * `avatarFile` (File object, optional)
  * `termsAccepted` (boolean, must be true)
* **Outputs**: `{ user, session, emailConfirmationRequired: boolean }`
* **Permissions**: Anonymous public access.
* **Error Handling**: Throws an error if terms are rejected, user type is invalid, or signup is blocked by database validation triggers.

---

### Function: `signIn(email, password)`
* **Purpose**: Authenticates a user and starts a secure session.
* **JS Code File**: [auth.js](file:///e:/Owais/School%20Idea/SchoolIn/auth.js)
* **API Endpoint**: `supabase.auth.signInWithPassword()`
* **Inputs**:
  * `email` (string)
  * `password` (string)
* **Outputs**: `{ user, session }`
* **Permissions**: Anonymous public access.
* **Error Handling**: Throws an error on incorrect password or unregistered email.

---

### Function: `signOut()`
* **Purpose**: Ends the current session and clears local storage tokens.
* **JS Code File**: [auth.js](file:///e:/Owais/School%20Idea/SchoolIn/auth.js)
* **API Endpoint**: `supabase.auth.signOut()`
* **Inputs**: None.
* **Outputs**: Void. Redirects to `index.html`.
* **Permissions**: Authenticated users.
* **Error Handling**: Fails silently and redirects if no session is active.

---

## 2. Feeds & Posts System

### Function: `loadPosts(searchQuery, selectedTopic, selectedPostType)`
* **Purpose**: Loads feed posts matching search keywords and filters.
* **JS Code File**: [dashboard.js](file:///e:/Owais/School%20Idea/SchoolIn/dashboard.js)
* **API Endpoint**: `supabase.from('posts').select('*, profiles(*)')`
* **Inputs**:
  * `searchQuery` (string, optional)
  * `selectedTopic` (string, optional)
  * `selectedPostType` (string, e.g. `'personal'`, `'school'`, optional)
* **Outputs**: Array of posts, sorted by `created_at DESC`.
* **Permissions**: Viewable by anyone.
* **Error Handling**: Logs warning and displays empty state message if query fails.

---

### Function: `createPost(content, topic, postType)`
* **Purpose**: Submits a new text post to the feeds board.
* **JS Code File**: [dashboard.js](file:///e:/Owais/School%20Idea/SchoolIn/dashboard.js)
* **API Endpoint**: `supabase.from('posts').insert()`
* **Inputs**:
  * `content` (string, not empty)
  * `topic` (string, default `'general'`)
  * `postType` (string: `'personal'` or `'school'`)
* **Outputs**: Array containing the inserted post object.
* **Permissions**: Authenticated users. Database trigger validates role permissions.
* **Error Handling**: Throws database exception if a student attempts to create a `'school'` post type.

---

## 3. Directory Search

### Function: `loadSchools(searchQuery, selectedCity, selectedBoard)`
* **Purpose**: Queries the school listings directory.
* **JS Code File**: [schools.js](file:///e:/Owais/School%20Idea/SchoolIn/schools.js)
* **API Endpoint**: `supabase.from('schools').select('*')`
* **Inputs**:
  * `searchQuery` (string)
  * `selectedCity` (string)
  * `selectedBoard` (string)
* **Outputs**: Array of schools.
* **Permissions**: Viewable by everyone.
* **Error Handling**: Logs errors and displays fallback school cards.

---

## 4. Connections & Follows

### Function: `sendConnectionRequest(receiverId)`
* **Purpose**: Sends a connection request to another user.
* **JS Code File**: [networking.js](file:///e:/Owais/School%20Idea/SchoolIn/networking.js)
* **API Endpoint**: `supabase.from('connections').insert()`
* **Inputs**:
  * `receiver_id` (uuid)
* **Outputs**: Connection row object.
* **Permissions**: Authenticated users.
* **Error Handling**: Blocks duplicate requests using PostgreSQL unique constraints.

---

### Function: `respondToConnection(connectionId, action)`
* **Purpose**: Accept or reject a pending connection request.
* **JS Code File**: [networking.js](file:///e:/Owais/School%20Idea/SchoolIn/networking.js)
* **API Endpoint**: `supabase.from('connections').update().eq()`
* **Inputs**:
  * `connectionId` (uuid)
  * `action` (string: `'accepted'` or `'rejected'`)
* **Outputs**: Updated connection row.
* **Permissions**: Recipient of request (`receiver_id = auth.uid()`).
* **Error Handling**: RLS blocks updates if user is not the receiver of the request.

---

### Function: `followSchool(schoolId)`
* **Purpose**: Follows a school's feed.
* **JS Code File**: [networking.js](file:///e:/Owais/School%20Idea/SchoolIn/networking.js)
* **API Endpoint**: `supabase.from('follows').insert()`
* **Inputs**:
  * `schoolId` (uuid)
* **Outputs**: Follow object.
* **Permissions**: Authenticated users.
* **Error Handling**: Fails silently if duplicate follows exist.

---

## 5. Admissions & Events

### Function: `submitAdmissionApplication(applicationData)`
* **Purpose**: Submits a school admission application.
* **JS Code File**: [apply-admission.js](file:///e:/Owais/School%20Idea/SchoolIn/apply-admission.js)
* **API Endpoint**: `supabase.from('admission_applications').insert()`
* **Inputs**:
  * `school_id` (uuid)
  * `student_name` (string)
  * `parent_name` (string)
  * `email` (string)
  * `phone` (string)
  * `grade_applied` (string)
  * `previous_school` (string, optional)
  * `dob` (date string)
  * `address` (string)
* **Outputs**: Inserted application row.
* **Permissions**: Authenticated users.
* **Error Handling**: Validates input formats; throws error on insert failure.

---

### Function: `registerForEvent(registrationData)`
* **Purpose**: Registers a user for an inter-school fest competition.
* **JS Code File**: [event-detail.js](file:///e:/Owais/School%20Idea/SchoolIn/event-detail.js)
* **API Endpoint**: `supabase.from('event_registrations').insert()`
* **Inputs**:
  * `event_id` (uuid)
  * `school_id` (uuid)
  * `student_name` (string)
  * `student_email` (string)
  * `student_phone` (string)
  * `student_grade` (string)
  * `student_school_name` (string)
  * `is_team` (boolean)
  * `team_name` (string, optional)
  * `team_size` (integer, optional)
  * `parent_consent` (boolean, must be true)
* **Outputs**: Registration record.
* **Permissions**: Authenticated users.
* **Error Handling**: Throws validation error if parent consent is false.

---

## 6. Realtime Messaging

### Function: `sendMessage(conversationId, text, receiverId, receiverSchoolId)`
* **Purpose**: Sends a chat message.
* **JS Code File**: [messaging.js](file:///e:/Owais/School%20Idea/SchoolIn/messaging.js)
* **API Endpoint**: `supabase.from('messages').insert()`
* **Inputs**:
  * `conversation_id` (uuid)
  * `message` (string)
  * `receiver_id` (uuid, optional)
  * `receiver_school_id` (uuid, optional)
* **Outputs**: Message row.
* **Permissions**: Conversation participants.
* **Error Handling**: RLS blocks inserts if user is not a participant in the conversation.

---

### Function: `listenForMessages(conversationId, callback)`
* **Purpose**: Subscribes to real-time chat updates using WebSockets.
* **JS Code File**: [messaging.js](file:///e:/Owais/School%20Idea/SchoolIn/messaging.js)
* **API Endpoint**: `supabase.channel().on(postgres_changes).subscribe()`
* **Inputs**:
  * `conversationId` (uuid)
  * `callback` (function)
* **Outputs**: Realtime subscription channel.
* **Permissions**: Authenticated participants.
* **Error Handling**: Disconnects channel if WebSocket connection is lost.
