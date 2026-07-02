# Coding Standards & Guidelines

This document outlines the coding standards, folder structures, and code review guidelines for CampusLink.

---

## 1. Naming Conventions

### Files & Folders
* **HTML/JS/CSS Files**: Use lowercase kebab-case for page files (e.g. `school-profile.html`, `school-profile.js`, `complete-profile.js`).
* **SQL Migration Files**: Use lowercase snake_case (e.g. `classroom_management_migration.sql`, `school_members_schema.sql`).
* **Directories**: Use short, lowercase names (e.g. `admin`, `docs`, `scratch`).

### JavaScript Variables and Functions
* **Variables and Objects**: Use `camelCase` for variable names (e.g. `currentUser`, `localAdmissions`, `avatarUrl`).
* **Constants**: Use `UPPER_SNAKE_CASE` (e.g. `SUPABASE_URL`, `VALID_USER_TYPES`).
* **Functions**: Use `camelCase` starting with descriptive verbs (e.g. `loadAdmissions()`, `toggleLike()`, `sendConnectionRequest()`).
* **Classes**: Use `PascalCase` (e.g. `MentionAutocomplete`).

### CSS Classes and IDs
* **Classes**: Use lowercase kebab-case (e.g. `.feed-card`, `.btn-primary`, `.me-dropdown-avatar`).
* **IDs**: Use lowercase kebab-case (e.g. `#toast-container`, `#nav-me-btn`, `#login-email`).

---

## 2. Presentation Layer Standards (HTML & CSS)

### HTML
* Follow HTML5 semantic markup guidelines (`<header>`, `<main>`, `<section>`, `<footer>`, `<article>`).
* Ensure all interactive elements have unique, descriptive IDs for browser testing.
* Check that all input fields have descriptive `<label>` elements.

### CSS Organization
* Group variables under `:root` at the beginning of the file.
* Organize files logically by block layout:
  1. Base resets & fonts
  2. Variables
  3. Typography & core components (buttons, cards, forms)
  4. Global layouts (headers, mobile bars)
  5. Page-specific sections (using comments to demarcate)
* Use custom properties (CSS variables) for colors, radiuses, shadows, and spacing to guarantee UI changes remain synchronized.

---

## 3. Logic Layer Standards (JavaScript)

* Wrap scripts in `'use strict'` scopes or standard `DOMContentLoaded` listeners to prevent polluting the global window space.
* Clearly isolate Supabase client API calls from direct UI rendering loops.
* Validate parameters in API functions before dispatching database transactions.

---

## 4. Git Commit Guidelines

CampusLink follows the standard semantic commit message format. Commit headers must be descriptive, keeping text under 72 characters:

```text
<type>(<scope>): <subject>

[optional body description]
```

### Commit Types
* `feat`: A new feature (e.g., `feat(networking): add mutual follower profiles tab`)
* `fix`: A bug fix (e.g., `fix(auth): prevent signup bypass when terms are rejected`)
* `docs`: Documentation changes only (e.g., `docs(db): schema details markdown`)
* `style`: Code layout adjustments, formatting, colors (no feature change)
* `refactor`: Restructuring code (no feature change)
* `test`: Adding or updating tests
* `chore`: Maintenance edits (updating package versions, configuration adjustments)

---

## 5. Code Review Checklist

Reviewers must check the following list before approving code merges:

- [ ] **Auth Check**: Confirm that all new protected pages are guarded by `requireAuth()`.
- [ ] **RLS Consistency**: Verify that any new database tables have RLS enabled and corresponding policies created.
- [ ] **Capacitor Portability**: Confirm that no Node.js server dependencies or server-side functions are added to the frontend code.
- [ ] **CSS Variable Usage**: Ensure that any new styling classes use the variables defined in `style.css`.
