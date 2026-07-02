# Responsive Design Guidelines

This document outlines screen breakpoints, grid structures, and mobile layout rules in CampusLink.

---

## 1. Breakpoints

CampusLink styles adapt dynamically based on screen widths:

| Breakpoint Name | Range | Stylesheet target |
| :--- | :--- | :--- |
| **Mobile** | `< 768px` | `@media (max-width: 768px)` |
| **Tablet** | `768px` to `1024px` | `@media (min-width: 768px) and (max-width: 1024px)` |
| **Desktop** | `> 1024px` | Standard styling rules |

---

## 2. Desktop Navigation Layout

On screen widths larger than `768px`:
* The main navigation bar is fixed at the top of the viewport.
* Navigation links (`Admissions`, `Events`, `Schools`, `Networking`) are displayed inline.
* User settings are accessed via the profile dropdown (`me-dropdown`).
* Mobile-specific elements (`.mobile-bottom-nav`) are hidden.

---

## 3. Mobile Bottom Navigation Layout

On screen widths smaller than `768px`:
* The top navigation bar collapses, hiding inline links and displaying only the logo.
* The mobile bottom nav bar (`.mobile-bottom-nav`) becomes visible, fixed at the bottom of the viewport.
* Nav items are centered vertically with SVG icons and text labels.

```css
@media (max-width: 768px) {
  .mobile-bottom-nav {
    display: flex;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: var(--white);
    border-top: 1px solid var(--border-color);
    z-index: 1000;
  }
}
```

---

## 4. Responsive Grid Systems

Grid layouts adjust column counts automatically based on viewport size:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 480px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
```
* **Desktop**: Displays 3 to 4 cards per row.
* **Tablet**: Displays 2 cards per row.
* **Mobile**: Grid columns stretch to full width (`1fr`), stacking elements vertically.
