# Design System Tokens

This document details the visual design tokens, color swatches, shadows, border-radiuses, and transitions used in CampusLink.

---

## 1. Color System

CampusLink uses a professional, high-contrast, modern color palette:

### Primary Colors

| Token | Color Sample | HEX | Usage |
| :--- | :--- | :--- | :--- |
| `var(--primary)` | ![#0066C8](https://via.placeholder.com/15/0066C8/000000?text=+) | `#0066C8` | Brand Royal Blue. Principal action buttons and icons. |
| `var(--primary-hover)` | ![#0050A0](https://via.placeholder.com/15/0050A0/000000?text=+) | `#0050A0` | Hover states for primary actions. |
| `var(--primary-light)` | ![#EBF5FF](https://via.placeholder.com/15/EBF5FF/000000?text=+) | `#EBF5FF` | Light blue background tints. |

### Accent Colors

| Token | Color Sample | HEX | Usage |
| :--- | :--- | :--- | :--- |
| `var(--accent)` | ![#00D2C4](https://via.placeholder.com/15/00D2C4/000000?text=+) | `#00D2C4` | Brand Mint/Teal. Secondary highlights. |
| `var(--accent-hover)` | ![#00B3A7](https://via.placeholder.com/15/00B3A7/000000?text=+) | `#00B3A7` | Hover states for accent actions. |
| `var(--accent-light)` | ![#E0FAF8](https://via.placeholder.com/15/E0FAF8/000000?text=+) | `#E0FAF8` | Light mint background tints. |

### Neutral Colors

| Token | Color Sample | HEX | Usage |
| :--- | :--- | :--- | :--- |
| `var(--dark-bg)` | ![#0F172A](https://via.placeholder.com/15/0F172A/000000?text=+) | `#0F172A` | Primary background color. |
| `var(--dark-surface)` | ![#1E293B](https://via.placeholder.com/15/1E293B/000000?text=+) | `#1E293B` | Card/panel surface backgrounds. |
| `var(--light-bg)` | ![#F8FAFC](https://via.placeholder.com/15/F8FAFC/000000?text=+) | `#F8FAFC` | Light mode page backgrounds. |
| `var(--white)` | ![#FFFFFF](https://via.placeholder.com/15/FFFFFF/000000?text=+) | `#FFFFFF` | Core layouts background. |

---

## 2. Brand Gradients

Linear gradients are used for backgrounds, headers, and verified school banners:

```css
.bg-gradient-1 { background: linear-gradient(135deg, #0066C8 0%, #00D2C4 100%); }
.bg-gradient-2 { background: linear-gradient(135deg, #7C3AED 0%, #0066C8 100%); }
.bg-gradient-3 { background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); }
.bg-gradient-4 { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
.bg-gradient-5 { background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); }
```

---

## 3. Shadows & Glows

To elevate component cards and callout alerts:

* **Shadow Small** (`--shadow-sm`): `0 2px 8px rgba(0, 0, 0, 0.04)`
* **Shadow Medium** (`--shadow-md`): `0 12px 24px -6px rgba(15, 23, 42, 0.08)`
* **Shadow Large** (`--shadow-lg`): `0 20px 40px -12px rgba(15, 23, 42, 0.12)`
* **Shadow Glow** (`--shadow-glow`): `0 0 20px rgba(0, 210, 196, 0.25)`

---

## 4. Border Radius

* **Radius Small** (`--radius-sm`): `8px` (used for badges and tags).
* **Radius Medium** (`--radius-md`): `12px` (used for cards, buttons, and inputs).
* **Radius Large** (`--radius-lg`): `20px` (used for modals and feed wrappers).
* **Radius Full** (`--radius-full`): `9999px` (used for circular profile pictures).

---

## 5. Transitions

* **Smooth Transition** (`--transition-smooth`): `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
* **Fast Transition** (`--transition-fast`): `all 0.15s ease`
