# UI Component Library

This document outlines the standard HTML markup templates and styling classes used for core UI components in CampusLink.

---

## 1. Buttons

Buttons use specific styles depending on the hierarchy of the action:

```html
<!-- Primary CTA Button -->
<button class="primary-btn">
  <span>Create Account</span>
</button>

<!-- Secondary Outline Action -->
<button class="btn-secondary">
  <span>Cancel</span>
</button>

<!-- Auth Tab Controls -->
<button class="auth-tab-btn active">
  <span>Sign In</span>
</button>
```

* **Primary Button**: Uses solid `--primary` background with a scale transition (`transform: translateY(-2px)`) on hover.
* **Secondary Button**: Uses an outline border with `--text-muted` styles, shifting to `--primary` on hover.

---

## 2. Cards

Cards are the foundation of the feeds board and search grids:

```html
<article class="feed-card">
  <div class="card-header">
    <div class="user-avatar">U</div>
    <div>
      <h4>User Name</h4>
      <span class="timestamp">2 hours ago</span>
    </div>
  </div>
  <div class="card-body">
    <p>Post content goes here...</p>
  </div>
</article>
```

* **Cards Grid**: Cards are arranged in a grid (`display: grid`) with auto-fit layouts (`grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`).

---

## 3. Forms

Form components wrap labels and inputs for readability:

```html
<div class="form-group">
  <label for="user-email">Email Address</label>
  <div class="input-icon-wrapper">
    <svg class="icon">...</svg>
    <input type="email" id="user-email" placeholder="you@example.com" required>
  </div>
  <span class="error-msg">Please enter a valid email.</span>
</div>
```

* **Focus State**: Inputs transition to a border glow (`border-color: var(--primary)`) on focus.
* **Icons**: Inline SVG icons are positioned absolutely within inputs.

---

## 4. Tables

Tables are used in admin dashboards to display applicants and roster databases:

```html
<table class="admin-data-table">
  <thead>
    <tr>
      <th>Applicant Name</th>
      <th>Applied Grade</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Student Name</td>
      <td>Grade XI</td>
      <td><span class="badge status-pending">Pending</span></td>
      <td><button class="action-btn">Review</button></td>
    </tr>
  </tbody>
</table>
```

---

## 5. Modals

Modals use backdrop filters to separate overlay cards from background text:

```html
<div class="modal-backdrop active" id="modal-container">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3>Title</h3>
      <button class="close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Form elements -->
    </div>
  </div>
</div>
```

---

## 6. Toasts & Alert Messages

Toast notifications are created dynamically in the DOM via the global helper function:

```javascript
// Triggers alert toast banner in DOM
showToast("Connection Request Sent Successfully!", "success");
```

---

## 7. Empty & Loading States

### Empty State Template
Used when search queries or filters yield zero results:

```html
<div class="empty-state">
  <div class="empty-icon">🔍</div>
  <h3>No listings found</h3>
  <p>Try adjusting your search keywords or removing filters.</p>
</div>
```

### Loading State Template
CSS skeleton loaders are applied to cards during data fetching operations:

```html
<div class="skeleton-card">
  <div class="skeleton-avatar loading-shimmer"></div>
  <div class="skeleton-title loading-shimmer"></div>
  <div class="skeleton-text loading-shimmer"></div>
</div>
```
