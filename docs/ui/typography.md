# Typography System

This document outlines the font configurations, type hierarchy, and line-height variables used in CampusLink.

---

## 1. Font Family

CampusLink uses the **Plus Jakarta Sans** font, loaded via Google Fonts CDN at the beginning of [style.css](file:///e:/Owais/School%20Idea/SchoolIn/style.css):

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

* {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

---

## 2. Type Scale Hierarchy

Heading sizes use CSS `clamp()` to scale smoothly between mobile and desktop screen sizes:

| Element | CSS Size Rule | Mobile Size | Desktop Size | Font Weight | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `h1` | `clamp(2.5rem, 5vw, 3.75rem)` | `2.5rem` | `3.75rem` | `800` (Extra Bold) | Hero headers and onboarding titles. |
| `h2` | `clamp(2rem, 3.5vw, 2.5rem)` | `2.0rem` | `2.5rem` | `700` (Bold) | Main page section titles. |
| `h3` | `1.5rem` | `1.25rem` | `1.5rem` | `700` (Bold) | Card titles. |
| `h4` | `1.15rem` | `1.05rem` | `1.15rem` | `600` (Semi Bold) | Dashboard card names. |
| **Body** | `1rem` (`16px`) | `1rem` | `1rem` | `400` / `500` | Paragraph text. |
| **Small** | `0.875rem` (`14px`) | `0.875rem` | `0.875rem` | `400` | Muted metadata and tags. |

---

## 3. Font Weights

* **Light** (`300`): Used for large decorative values or stats cards labels.
* **Regular** (`400`): Standard body paragraphs.
* **Medium** (`500`): List item text and form input fields.
* **Semi-Bold** (`600`): Buttons and card names.
* **Bold** (`700`): Sub-headers and card titles.
* **Extra-Bold** (`800`): Page titles and visual hero elements.

---

## 4. Spacings & Margins

* **Header Margins**: Headings (`h1`, `h2`, `h3`) default to a bottom margin of `1rem` (`margin-bottom: 1rem`) to maintain readable text layouts.
* **Line Heights**:
  * Headings (`h1`, `h2`, `h3`): `1.25` (keeps tight heading text blocks).
  * Body text: `1.6` (provides readable line pacing for body copy).
