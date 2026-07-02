# Architecture Decision Record (ADR)
## Title: 2026-07 School Profile Layout Customization

* **Date**: July 2026
* **Status**: Approved / Implemented

---

## 1. Problem
Schools want custom branding on their profiles to stand out. We need a way to support dynamic visual designs (colors, logos, cover photos) on school profiles without compiling separate stylesheets per school.

---

## 2. Decision
Implement database-driven branding columns inside the `schools` table:
* `logo_url` and `cover_url` store paths to images uploaded in Supabase Storage.
* `color_class` stores a class name referencing preset linear gradients (e.g. `bg-gradient-1` to `bg-gradient-5`) defined in [style.css](file:///e:/Owais/School%20Idea/SchoolIn/style.css).
* Javascript dynamically maps these properties into DOM element properties during page initialization.

---

## 3. Reasoning
* **Performance**: Standardizes layout styling. The client loads the single main stylesheet, applying gradients dynamically using simple CSS class assignments.
* **No Code-Churn**: School representatives can update their logos, covers, and theme gradients directly from their profile settings without developer intervention.
* **Storage Isolation**: Storage bucket RLS policies restrict file changes to verified school admins, protecting resources.

---

## 4. Alternatives Considered
* **User-Defined CSS Injection**: Rejected as it poses security risks (CSS injection attacks) and could easily break page responsiveness.
* **Static School-specific Subdomains & Stylesheets**: Rejected as it increases DNS routing overhead and complicates deployments.

---

## 5. Future Implications
* As new gradient combinations are requested, they must be appended to the global [style.css](file:///e:/Owais/School%20Idea/SchoolIn/style.css) variables list so school profiles can reference them.
