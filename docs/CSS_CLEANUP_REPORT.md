# CSS Cleanup Report

This report documents the CSS Cleanup Phase completed on the CampusLink Network platform. It details all duplicate selectors, keyframes, variables, and empty rules removed from `style.css` to reduce codebase size and technical debt while preserving the exact layouts and behaviors of all pages.

## Performance Metrics

*   **Monolithic style.css Size (Before)**: `3,64,029 bytes` (~355.5 KB)
*   **Monolithic style.css Size (After)**: `2,60,067 bytes` (~254.0 KB)
*   **Size Reduction**: `1,03,962 bytes` (~101.5 KB)
*   **Total Cleaned Reduction Percentage**: `28.56%`

---

## Duplicate Rules Cleaned (Identical matches removed)

*   **Identical Selectors Removed**: `704`
*   **Identical Keyframes Removed**: `12`
*   **Empty Selectors Cleaned**: `0`
*   **Empty Media Queries Cleaned**: `0`

---

## Retained CSS Conflicts (Retained to preserve custom page-specific overrides)

Below are the selector overrides that differ between the modular CSS stylesheets and the monolithic `style.css`. These have been explicitly **retained** in `style.css` to maintain cascade behavior and avoid styling bugs:

### 1. Conflict in Selector `.btn-group` (linked in `components.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `gap: 12px;` (modular)
    *   `align-items: center;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `gap: 16px;` (active override)
    *   `flex-wrap: wrap;` (active override)

### 2. Conflict in Selector `.btn` (linked in `components.css`)
*   **Modular Properties**:
    *   `display: inline-flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `padding: 14px 28px;` (modular)
    *   `font-size: 1rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `border: none;` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: var(--transition-fast);` (modular)
    *   `gap: 8px;` (modular)
    *   `line-height: 1;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: inline-flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `padding: 14px 28px;` (active override)
    *   `font-size: 1rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `border: 2px solid transparent;` (active override)
    *   `cursor: pointer;` (active override)
    *   `transition: var(--transition-smooth);` (active override)
    *   `gap: 8px;` (active override)

### 3. Conflict in Selector `.btn-primary` (linked in `components.css`)
*   **Modular Properties**:
    *   `background-color: var(--primary);` (modular)
    *   `color: var(--white);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: linear-gradient(135deg, var(--primary), #00A3FF);` (active override)
    *   `color: var(--white);` (active override)
    *   `box-shadow: 0 4px 14px rgba(0, 102, 200, 0.25);` (active override)

### 4. Conflict in Selector `.btn-primary:hover` (linked in `components.css`)
*   **Modular Properties**:
    *   `background-color: var(--primary-hover);` (modular)
    *   `box-shadow: 0 8px 24px rgba(0, 102, 200, 0.25);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `transform: translateY(-2px);` (active override)
    *   `box-shadow: 0 6px 20px rgba(0, 102, 200, 0.4);` (active override)

### 5. Conflict in Selector `.btn-secondary` (linked in `components.css`)
*   **Modular Properties**:
    *   `background-color: var(--primary-light);` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--white);` (active override)
    *   `border-color: rgba(0, 102, 200, 0.3);` (active override)
    *   `color: var(--primary);` (active override)

### 6. Conflict in Selector `.btn-secondary:hover` (linked in `components.css`)
*   **Modular Properties**:
    *   `background-color: rgba(0, 102, 200, 0.15);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--primary-light);` (active override)
    *   `border-color: var(--primary);` (active override)
    *   `transform: translateY(-2px);` (active override)

### 7. Conflict in Selector `.btn-accent` (linked in `components.css`)
*   **Modular Properties**:
    *   `background-color: var(--accent);` (modular)
    *   `color: var(--dark-bg);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: linear-gradient(135deg, var(--accent), #05A8FF);` (active override)
    *   `color: var(--white);` (active override)
    *   `box-shadow: var(--shadow-glow);` (active override)

### 8. Conflict in Selector `body` (linked in `global.css`)
*   **Modular Properties**:
    *   `font-size: 16px;` (modular)
    *   `line-height: 1.6;` (modular)
    *   `overflow-x: hidden;` (modular)
    *   `padding-top: 52px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding-top: 52px;` (active override)

### 9. Conflict in Selector `.tab-btn` (linked in `profile.css`)
*   **Modular Properties**:
    *   `position: relative;` (modular)
    *   `z-index: 2;` (modular)
    *   `padding: 10px 20px;` (modular)
    *   `background: transparent;` (modular)
    *   `border: none;` (modular)
    *   `font-size: 0.9rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `cursor: pointer;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s cubic-bezier(0.4, 0, 0.2, 1), font-weight 0.25s cubic-bezier(0.4, 0, 0.2, 1);` (modular)
    *   `white-space: nowrap;` (modular)
    *   `outline: none;` (modular)
    *   `user-select: none;` (modular)
    *   `-webkit-tap-highlight-color: transparent;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: var(--white);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `padding: 10px 24px;` (active override)
    *   `font-size: 0.9rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `border-radius: var(--radius-full);` (active override)
    *   `cursor: pointer;` (active override)
    *   `transition: var(--transition-smooth);` (active override)
    *   `color: var(--text-muted);` (active override)

### 10. Conflict in Selector `.tab-btn.active` (linked in `profile.css`)
*   **Modular Properties**:
    *   `color: var(--white) !important;` (modular)
    *   `font-weight: 700;` (modular)
    *   `transform: scale(1.04);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: var(--primary);` (active override)
    *   `color: var(--white);` (active override)
    *   `border-color: var(--primary);` (active override)
    *   `box-shadow: 0 4px 10px rgba(0, 102, 200, 0.2);` (active override)

### 11. Conflict in Selector `.modal-overlay` (linked in `components.css`)
*   **Modular Properties**:
    *   `position: fixed;` (modular)
    *   `inset: 0;` (modular)
    *   `z-index: 2000;` (modular)
    *   `background-color: rgba(15, 23, 42, 0.55);` (modular)
    *   `backdrop-filter: blur(6px);` (modular)
    *   `-webkit-backdrop-filter: blur(6px);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `padding: 20px;` (modular)
    *   `opacity: 0;` (modular)
    *   `pointer-events: none;` (modular)
    *   `transition: opacity 0.3s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: fixed;` (active override)
    *   `top: 0;` (active override)
    *   `left: 0;` (active override)
    *   `right: 0;` (active override)
    *   `bottom: 0;` (active override)
    *   `background-color: rgba(15, 23, 42, 0.6);` (active override)
    *   `backdrop-filter: blur(8px);` (active override)
    *   `z-index: 2000;` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `opacity: 0;` (active override)
    *   `pointer-events: none;` (active override)
    *   `transition: var(--transition-smooth);` (active override)

### 12. Conflict in Selector `.modal-overlay.active` (linked in `components.css`)
*   **Modular Properties**:
    *   `opacity: 1;` (modular)
    *   `pointer-events: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `opacity: 1;` (active override)
    *   `pointer-events: all;` (active override)

### 13. Conflict in Selector `.modal-content` (linked in `components.css`)
*   **Modular Properties**:
    *   `background: var(--white);` (modular)
    *   `border-radius: var(--radius-lg);` (modular)
    *   `padding: 32px;` (modular)
    *   `max-width: 540px;` (modular)
    *   `width: 100%;` (modular)
    *   `position: relative;` (modular)
    *   `box-shadow: var(--shadow-lg);` (modular)
    *   `transform: translateY(20px);` (modular)
    *   `transition: transform 0.3s ease;` (modular)
    *   `max-height: 90vh;` (modular)
    *   `overflow-y: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: var(--white);` (active override)
    *   `width: 100%;` (active override)
    *   `max-width: 520px;` (active override)
    *   `border-radius: var(--radius-lg);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `box-shadow: var(--shadow-lg);` (active override)
    *   `padding: 32px;` (active override)
    *   `position: relative;` (active override)
    *   `transform: translateY(20px);` (active override)
    *   `transition: var(--transition-smooth);` (active override)

### 14. Conflict in Selector `.modal-close-btn` (linked in `components.css`)
*   **Modular Properties**:
    *   `position: absolute;` (modular)
    *   `top: 16px;` (modular)
    *   `right: 20px;` (modular)
    *   `background: transparent;` (modular)
    *   `border: none;` (modular)
    *   `font-size: 1.75rem;` (modular)
    *   `cursor: pointer;` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `transition: var(--transition-fast);` (modular)
    *   `line-height: 1;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: absolute;` (active override)
    *   `top: 20px;` (active override)
    *   `right: 20px;` (active override)
    *   `background: none;` (active override)
    *   `border: none;` (active override)
    *   `font-size: 1.5rem;` (active override)
    *   `cursor: pointer;` (active override)
    *   `color: var(--text-muted);` (active override)
    *   `transition: var(--transition-fast);` (active override)

### 15. Conflict in Selector `.form-group label` (linked in `components.css`)
*   **Modular Properties**:
    *   `display: block;` (modular)
    *   `font-weight: 600;` (modular)
    *   `font-size: 0.88rem;` (modular)
    *   `margin-bottom: 6px;` (modular)
    *   `color: var(--text-main);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: block;` (active override)
    *   `font-size: 0.85rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `margin-bottom: 6px;` (active override)
    *   `color: var(--dark-bg);` (active override)

### 16. Conflict in Selector `.form-navigation` (linked in `components.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `align-items: center;` (modular)
    *   `margin-top: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `justify-content: space-between;` (active override)
    *   `margin-top: 24px;` (active override)

### 17. Conflict in Selector `.form-row` (linked in `profile.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `gap: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: grid;` (active override)
    *   `grid-template-columns: 1fr 1fr;` (active override)
    *   `gap: 16px;` (active override)

### 18. Conflict in Selector `.profile-banner` (linked in `schools.css`)
*   **Modular Properties**:
    *   `display: none;` (modular)
    *   `width: 100%;` (modular)
    *   `height: 220px;` (modular)
    *   `background-size: cover;` (modular)
    *   `background-position: center;` (modular)
    *   `border-radius: 0 0 var(--radius-lg) var(--radius-lg);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: none;` (active override)
    *   `js shows it when cover_url exists */
  width: 100%;` (active override)
    *   `height: 220px;` (active override)
    *   `background-size: cover;` (active override)
    *   `background-position: center;` (active override)
    *   `border-radius: 0 0 var(--radius-lg) var(--radius-lg);` (active override)

### 19. Conflict in Selector `.profile-header-wrapper` (linked in `schools.css`)
*   **Modular Properties**:
    *   `margin-top: 30px;` (modular)
    *   `position: relative;` (modular)
    *   `z-index: 10;` (modular)
    *   `margin-bottom: 0;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `margin-top: 30px;` (active override)
    *   `/* reduced gap (≈50% of previous) */
  position: relative;` (active override)
    *   `z-index: 10;` (active override)
    *   `margin-bottom: 0;` (active override)

### 20. Conflict in Selector `.admission-card-item` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border-radius: var(--radius-lg);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
    *   `border-top: 4px solid var(--accent);` (modular)
    *   `/* top accent border */
  overflow: hidden;` (modular)
    *   `box-shadow: var(--shadow-sm);` (modular)
    *   `transition: var(--transition-smooth);` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--white);` (active override)
    *   `border-radius: var(--radius-lg);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `border-top: 4px solid var(--accent);` (active override)
    *   `/* top accent border */
  overflow: hidden;` (active override)
    *   `box-shadow: var(--shadow-sm);` (active override)
    *   `transition: var(--transition-smooth);` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)

### 21. Conflict in Selector `.dashboard-layout` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `min-height: 100vh;` (modular)
    *   `background-color: var(--light-bg);` (modular)
    *   `color: var(--text-main);` (modular)
    *   `overflow: hidden;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `min-height: 100vh;` (active override)
    *   `background-color: var(--light-bg);` (active override)
    *   `color: var(--text-main);` (active override)

### 22. Conflict in Selector `.dashboard-sidebar` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `width: 260px;` (modular)
    *   `min-width: 260px;` (modular)
    *   `background-color: var(--white);` (modular)
    *   `border-right: 1px solid var(--border-color);` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `position: fixed;` (modular)
    *   `top: 0;` (modular)
    *   `left: 0;` (modular)
    *   `bottom: 0;` (modular)
    *   `z-index: 100;` (modular)
    *   `overflow-y: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 260px;` (active override)
    *   `background-color: #0F172A;` (active override)
    *   `/* slate 900 */
  border-right: 1px solid rgba(255, 255, 255, 0.05);` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `padding: 30px 20px;` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `z-index: 100;` (active override)

### 23. Conflict in Selector `.dashboard-main-content` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `flex: 1;` (modular)
    *   `margin-left: 260px;` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `min-height: 100vh;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `flex-grow: 1;` (active override)
    *   `padding: 40px;` (active override)
    *   `overflow-y: auto;` (active override)

### 24. Conflict in Selector `.dashboard-top-bar` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `padding: 16px 32px;` (modular)
    *   `background-color: var(--white);` (modular)
    *   `border-bottom: 1px solid var(--border-color);` (modular)
    *   `position: sticky;` (modular)
    *   `top: 0;` (modular)
    *   `z-index: 50;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `justify-content: space-between;` (active override)
    *   `align-items: center;` (active override)
    *   `margin-bottom: 40px;` (active override)

### 25. Conflict in Selector `.dash-stat-card` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `padding: 20px;` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `transition: var(--transition-fast);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--white);` (active override)
    *   `border-radius: var(--radius-lg);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `padding: 24px;` (active override)
    *   `box-shadow: var(--shadow-sm);` (active override)
    *   `display: flex;` (active override)
    *   `justify-content: space-between;` (active override)
    *   `align-items: center;` (active override)

### 26. Conflict in Selector `.dash-stat-icon` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `width: 44px;` (modular)
    *   `height: 44px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `font-size: 1.4rem;` (modular)
    *   `flex-shrink: 0;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 50px;` (active override)
    *   `height: 50px;` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `background-color: var(--primary-light);` (active override)
    *   `color: var(--primary);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `font-size: 1.5rem;` (active override)

### 27. Conflict in Selector `.dash-stat-icon.teal` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: rgba(0, 210, 196, 0.1);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--accent-light);` (active override)
    *   `color: var(--accent-hover);` (active override)

### 28. Conflict in Selector `.dash-table-wrapper` (linked in `components.css`)
*   **Modular Properties**:
    *   `overflow-x: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `overflow-x: auto;` (active override)
    *   `margin-top: 10px;` (active override)

### 29. Conflict in Selector `.toast-alert` (linked in `profile.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `padding: 14px 22px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `font-size: 0.9rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--white);` (modular)
    *   `background: linear-gradient(135deg, hsl(217, 71%, 48%), hsl(217, 71%, 38%));` (modular)
    *   `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);` (modular)
    *   `pointer-events: auto;` (modular)
    *   `opacity: 0;` (modular)
    *   `transform: translateX(40px);` (modular)
    *   `transition: opacity 0.35s ease, transform 0.35s ease;` (modular)
    *   `min-width: 280px;` (modular)
    *   `max-width: 420px;` (modular)
    *   `backdrop-filter: blur(8px);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: fixed;` (active override)
    *   `bottom: 30px;` (active override)
    *   `right: 30px;` (active override)
    *   `background-color: var(--dark-bg);` (active override)
    *   `color: var(--white);` (active override)
    *   `padding: 16px 24px;` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `box-shadow: var(--shadow-lg);` (active override)
    *   `font-size: 0.9rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 12px;` (active override)
    *   `transform: translateY(100px);` (active override)
    *   `opacity: 0;` (active override)
    *   `transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);` (active override)
    *   `z-index: 2000;` (active override)

### 30. Conflict in Selector `.toast-alert.show` (linked in `profile.css`)
*   **Modular Properties**:
    *   `opacity: 1;` (modular)
    *   `transform: translateX(0);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `transform: translateY(0);` (active override)
    *   `opacity: 1;` (active override)

### 31. Conflict in Selector `.dashboard-sidebar` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `width: 260px;` (modular)
    *   `min-width: 260px;` (modular)
    *   `background-color: var(--white);` (modular)
    *   `border-right: 1px solid var(--border-color);` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `position: fixed;` (modular)
    *   `top: 0;` (modular)
    *   `left: 0;` (modular)
    *   `bottom: 0;` (modular)
    *   `z-index: 100;` (modular)
    *   `overflow-y: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 260px;` (active override)
    *   `background-color: var(--dark-bg);` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `transition: var(--transition-smooth);` (active override)
    *   `border-right: 1px solid rgba(255, 255, 255, 0.05);` (active override)

### 32. Conflict in Selector `.dashboard-logo-section` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `padding: 20px 16px;` (modular)
    *   `border-bottom: 1px solid var(--border-color);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 24px;` (active override)
    *   `border-bottom: 1px solid rgba(255, 255, 255, 0.05);` (active override)

### 33. Conflict in Selector `.dashboard-nav` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `gap: 2px;` (modular)
    *   `padding: 8px;` (modular)
    *   `flex: 1;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `list-style: none;` (active override)
    *   `padding: 24px 16px;` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `gap: 8px;` (active override)
    *   `flex-grow: 1;` (active override)

### 34. Conflict in Selector `.dashboard-nav-link` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `gap: 12px;` (modular)
    *   `padding: 10px 14px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `font-size: 0.88rem;` (modular)
    *   `font-weight: 500;` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: var(--transition-fast);` (modular)
    *   `text-decoration: none;` (modular)
    *   `user-select: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 12px;` (active override)
    *   `padding: 12px 16px;` (active override)
    *   `color: #94A3B8;` (active override)
    *   `font-weight: 500;` (active override)
    *   `border-radius: var(--radius-sm);` (active override)
    *   `transition: var(--transition-fast);` (active override)
    *   `cursor: pointer;` (active override)

### 35. Conflict in Selector `.dashboard-nav-link:hover` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: var(--light-bg);` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `color: var(--white);` (active override)
    *   `background-color: rgba(255, 255, 255, 0.03);` (active override)

### 36. Conflict in Selector `.dashboard-nav-link.active` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background: linear-gradient(135deg, rgba(0, 102, 200, 0.08), rgba(0, 163, 255, 0.06));` (modular)
    *   `color: var(--primary);` (modular)
    *   `font-weight: 700;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `color: var(--white);` (active override)
    *   `background: linear-gradient(90deg, rgba(0, 102, 200, 0.25) 0%, rgba(0, 210, 196, 0.1) 100%);` (active override)
    *   `border-left: 4px solid var(--accent);` (active override)
    *   `padding-left: 12px;` (active override)

### 37. Conflict in Selector `.dashboard-nav-link .icon` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `width: 20px;` (modular)
    *   `height: 20px;` (modular)
    *   `flex-shrink: 0;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.2rem;` (active override)
    *   `display: inline-flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `width: 24px;` (active override)

### 38. Conflict in Selector `.dashboard-sidebar-footer` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `padding: 12px 8px;` (modular)
    *   `border-top: 1px solid var(--border-color);` (modular)
    *   `margin-top: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 20px 24px;` (active override)
    *   `border-top: 1px solid rgba(255, 255, 255, 0.05);` (active override)

### 39. Conflict in Selector `.dashboard-main-content` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `flex: 1;` (modular)
    *   `margin-left: 260px;` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `min-height: 100vh;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `flex-grow: 1;` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `height: 100vh;` (active override)
    *   `overflow-y: auto;` (active override)

### 40. Conflict in Selector `.dashboard-top-bar` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `padding: 16px 32px;` (modular)
    *   `background-color: var(--white);` (modular)
    *   `border-bottom: 1px solid var(--border-color);` (modular)
    *   `position: sticky;` (modular)
    *   `top: 0;` (modular)
    *   `z-index: 50;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--white);` (active override)
    *   `padding: 16px 32px;` (active override)
    *   `display: flex;` (active override)
    *   `justify-content: space-between;` (active override)
    *   `align-items: center;` (active override)
    *   `border-bottom: 1px solid var(--border-color);` (active override)
    *   `position: sticky;` (active override)
    *   `top: 0;` (active override)
    *   `z-index: 10;` (active override)

### 41. Conflict in Selector `.dashboard-avatar` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `width: 40px;` (modular)
    *   `height: 40px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `font-weight: 800;` (modular)
    *   `font-size: 1rem;` (modular)
    *   `color: var(--white);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 40px;` (active override)
    *   `height: 40px;` (active override)
    *   `border-radius: var(--radius-full);` (active override)
    *   `background-color: var(--primary-light);` (active override)
    *   `color: var(--primary);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `font-weight: 700;` (active override)
    *   `font-size: 1.1rem;` (active override)
    *   `box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25), 0 4px 12px rgba(59, 130, 246, 0.35);` (active override)
    *   `flex-shrink: 0;` (active override)

### 42. Conflict in Selector `.dashboard-workspace` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `padding: 28px 32px;` (modular)
    *   `flex: 1;` (modular)
    *   `overflow-y: auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 12px 20px 20px 20px;` (active override)
    *   `max-width: 1200px;` (active override)
    *   `width: 100%;` (active override)
    *   `margin: 0 auto;` (active override)
    *   `flex-grow: 1;` (active override)

### 43. Conflict in Selector `.dashboard-tab-panel` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: none;` (active override)
    *   `animation: dashFadeUp 0.4s ease forwards;` (active override)

### 44. Conflict in Selector `.dashboard-tab-panel.active` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: block;` (modular)
    *   `animation: fadeInTab 0.25s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: block;` (active override)

### 45. Conflict in Selector `.dash-stats-grid` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: grid;` (modular)
    *   `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));` (modular)
    *   `gap: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: grid;` (active override)
    *   `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));` (active override)
    *   `gap: 24px;` (active override)
    *   `margin-bottom: 32px;` (active override)

### 46. Conflict in Selector `.dash-stat-card` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `padding: 20px;` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `transition: var(--transition-fast);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--white);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `padding: 24px;` (active override)
    *   `box-shadow: var(--shadow-sm);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `display: flex;` (active override)
    *   `justify-content: space-between;` (active override)
    *   `align-items: center;` (active override)
    *   `transition: var(--transition-smooth);` (active override)

### 47. Conflict in Selector `.dash-stat-card:hover` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `box-shadow: var(--shadow-md);` (modular)
    *   `transform: translateY(-2px);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `transform: translateY(-4px);` (active override)
    *   `box-shadow: var(--shadow-md);` (active override)
    *   `border-color: rgba(0, 102, 200, 0.15);` (active override)

### 48. Conflict in Selector `.dash-stat-info h4` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `font-size: 0.78rem;` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `font-weight: 600;` (modular)
    *   `text-transform: uppercase;` (modular)
    *   `letter-spacing: 0.04em;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.875rem;` (active override)
    *   `color: var(--text-muted);` (active override)
    *   `text-transform: uppercase;` (active override)
    *   `letter-spacing: 0.05em;` (active override)
    *   `margin-bottom: 8px;` (active override)

### 49. Conflict in Selector `.dash-stat-icon` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `width: 44px;` (modular)
    *   `height: 44px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `font-size: 1.4rem;` (modular)
    *   `flex-shrink: 0;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 54px;` (active override)
    *   `height: 54px;` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `font-size: 1.5rem;` (active override)

### 50. Conflict in Selector `.dash-stat-icon.blue` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: rgba(59, 130, 246, 0.1);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--primary-light);` (active override)
    *   `color: var(--primary);` (active override)

### 51. Conflict in Selector `.dash-stat-icon.teal` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: rgba(0, 210, 196, 0.1);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--accent-light);` (active override)
    *   `color: var(--accent-hover);` (active override)

### 52. Conflict in Selector `.dash-stat-icon.orange` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `background-color: rgba(245, 158, 11, 0.1);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: #FFF3E0;` (active override)
    *   `color: #EF6C00;` (active override)

### 53. Conflict in Selector `.dash-table-card` (linked in `components.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `overflow: hidden;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--white);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `box-shadow: var(--shadow-sm);` (active override)
    *   `overflow: hidden;` (active override)
    *   `margin-bottom: 32px;` (active override)

### 54. Conflict in Selector `.dash-table` (linked in `components.css`)
*   **Modular Properties**:
    *   `width: 100%;` (modular)
    *   `border-collapse: collapse;` (modular)
    *   `font-size: 0.88rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 100%;` (active override)
    *   `border-collapse: collapse;` (active override)
    *   `text-align: left;` (active override)
    *   `font-size: 0.9rem;` (active override)

### 55. Conflict in Selector `.dash-table th` (linked in `components.css`)
*   **Modular Properties**:
    *   `padding: 12px 16px;` (modular)
    *   `text-align: left;` (modular)
    *   `font-size: 0.78rem;` (modular)
    *   `font-weight: 700;` (modular)
    *   `text-transform: uppercase;` (modular)
    *   `letter-spacing: 0.04em;` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `border-bottom: 1px solid var(--border-color);` (modular)
    *   `white-space: nowrap;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--light-bg);` (active override)
    *   `padding: 14px 24px;` (active override)
    *   `font-weight: 600;` (active override)
    *   `color: var(--text-muted);` (active override)
    *   `border-bottom: 1px solid var(--border-color);` (active override)

### 56. Conflict in Selector `.dash-table td` (linked in `components.css`)
*   **Modular Properties**:
    *   `padding: 14px 16px;` (modular)
    *   `border-bottom: 1px solid var(--border-color);` (modular)
    *   `vertical-align: middle;` (modular)
    *   `color: var(--text-main);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 16px 24px;` (active override)
    *   `border-bottom: 1px solid var(--border-color);` (active override)
    *   `color: var(--text-main);` (active override)
    *   `vertical-align: middle;` (active override)

### 57. Conflict in Selector `.badge-status` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: inline-flex;` (modular)
    *   `align-items: center;` (modular)
    *   `padding: 4px 12px;` (modular)
    *   `font-size: 0.72rem;` (modular)
    *   `font-weight: 700;` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `text-transform: uppercase;` (modular)
    *   `letter-spacing: 0.04em;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: inline-flex;` (active override)
    *   `align-items: center;` (active override)
    *   `padding: 4px 10px;` (active override)
    *   `border-radius: var(--radius-full);` (active override)
    *   `font-size: 0.75rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `text-transform: uppercase;` (active override)
    *   `letter-spacing: 0.03em;` (active override)

### 58. Conflict in Selector `.toast-container` (linked in `profile.css`)
*   **Modular Properties**:
    *   `position: fixed;` (modular)
    *   `top: 24px;` (modular)
    *   `right: 24px;` (modular)
    *   `z-index: 99999;` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `gap: 10px;` (modular)
    *   `pointer-events: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: fixed;` (active override)
    *   `top: 24px;` (active override)
    *   `right: 24px;` (active override)
    *   `z-index: 9999;` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `gap: 10px;` (active override)

### 59. Conflict in Selector `.toast-alert` (linked in `profile.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `padding: 14px 22px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `font-size: 0.9rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--white);` (modular)
    *   `background: linear-gradient(135deg, hsl(217, 71%, 48%), hsl(217, 71%, 38%));` (modular)
    *   `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);` (modular)
    *   `pointer-events: auto;` (modular)
    *   `opacity: 0;` (modular)
    *   `transform: translateX(40px);` (modular)
    *   `transition: opacity 0.35s ease, transform 0.35s ease;` (modular)
    *   `min-width: 280px;` (modular)
    *   `max-width: 420px;` (modular)
    *   `backdrop-filter: blur(8px);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--dark-bg);` (active override)
    *   `color: var(--white);` (active override)
    *   `padding: 16px 24px;` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `box-shadow: var(--shadow-lg);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 12px;` (active override)
    *   `border-left: 4px solid var(--accent);` (active override)
    *   `transform: translateX(120%);` (active override)
    *   `transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);` (active override)

### 60. Conflict in Selector `.toast-alert.show` (linked in `profile.css`)
*   **Modular Properties**:
    *   `opacity: 1;` (modular)
    *   `transform: translateX(0);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `transform: translateX(0);` (active override)

### 61. Conflict in Selector `.toast-alert-success` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background: linear-gradient(135deg, hsl(150, 60%, 42%), hsl(150, 60%, 32%));` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-left-color: var(--accent);` (active override)

### 62. Conflict in Selector `.toast-alert-info` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background: linear-gradient(135deg, hsl(217, 71%, 48%), hsl(217, 71%, 38%));` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-left-color: var(--primary);` (active override)

### 63. Conflict in Selector `.toast-alert-error` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background: linear-gradient(135deg, hsl(0, 65%, 50%), hsl(0, 65%, 40%));` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-left-color: #EF4444;` (active override)

### 64. Conflict in Selector `.auth-bg-shape-1` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 600px;` (modular)
    *   `height: 600px;` (modular)
    *   `background: linear-gradient(135deg, rgba(0, 102, 200, 0.2), rgba(0, 210, 196, 0.15));` (modular)
    *   `top: -200px;` (modular)
    *   `right: -100px;` (modular)
    *   `animation: authFloat1 20s ease-in-out infinite;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 600px;` (active override)
    *   `height: 600px;` (active override)
    *   `background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.2), rgba(var(--accent-rgb), 0.15));` (active override)
    *   `top: -200px;` (active override)
    *   `right: -100px;` (active override)
    *   `animation: authFloat1 20s ease-in-out infinite;` (active override)

### 65. Conflict in Selector `.auth-bg-shape-2` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 400px;` (modular)
    *   `height: 400px;` (modular)
    *   `background: rgba(0, 210, 196, 0.12);` (modular)
    *   `bottom: -100px;` (modular)
    *   `left: -80px;` (modular)
    *   `animation: authFloat2 25s ease-in-out infinite;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 400px;` (active override)
    *   `height: 400px;` (active override)
    *   `background: rgba(var(--accent-rgb), 0.12);` (active override)
    *   `bottom: -100px;` (active override)
    *   `left: -80px;` (active override)
    *   `animation: authFloat2 25s ease-in-out infinite;` (active override)

### 66. Conflict in Selector `.auth-bg-shape-3` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 300px;` (modular)
    *   `height: 300px;` (modular)
    *   `background: rgba(0, 102, 200, 0.08);` (modular)
    *   `top: 50%;` (modular)
    *   `left: 40%;` (modular)
    *   `animation: authFloat3 18s ease-in-out infinite;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 300px;` (active override)
    *   `height: 300px;` (active override)
    *   `background: rgba(var(--primary-rgb), 0.08);` (active override)
    *   `top: 50%;` (active override)
    *   `left: 40%;` (active override)
    *   `animation: authFloat3 18s ease-in-out infinite;` (active override)

### 67. Conflict in Selector `.auth-brand-panel::before` (linked in `login.css`)
*   **Modular Properties**:
    *   `content: '';` (modular)
    *   `position: absolute;` (modular)
    *   `top: -50%;` (modular)
    *   `right: -30%;` (modular)
    *   `width: 500px;` (modular)
    *   `height: 500px;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `background: rgba(0, 210, 196, 0.06);` (modular)
    *   `pointer-events: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `content: '';` (active override)
    *   `position: absolute;` (active override)
    *   `top: -50%;` (active override)
    *   `right: -30%;` (active override)
    *   `width: 500px;` (active override)
    *   `height: 500px;` (active override)
    *   `border-radius: 50%;` (active override)
    *   `background: rgba(var(--accent-rgb), 0.06);` (active override)
    *   `pointer-events: none;` (active override)

### 68. Conflict in Selector `.auth-brand-panel::after` (linked in `login.css`)
*   **Modular Properties**:
    *   `content: '';` (modular)
    *   `position: absolute;` (modular)
    *   `bottom: -30%;` (modular)
    *   `left: -20%;` (modular)
    *   `width: 400px;` (modular)
    *   `height: 400px;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `background: rgba(0, 102, 200, 0.08);` (modular)
    *   `pointer-events: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `content: '';` (active override)
    *   `position: absolute;` (active override)
    *   `bottom: -30%;` (active override)
    *   `left: -20%;` (active override)
    *   `width: 400px;` (active override)
    *   `height: 400px;` (active override)
    *   `border-radius: 50%;` (active override)
    *   `background: rgba(var(--primary-rgb), 0.08);` (active override)
    *   `pointer-events: none;` (active override)

### 69. Conflict in Selector `.auth-feature-item` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: flex-start;` (modular)
    *   `gap: 14px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `gap: 14px;` (active override)
    *   `align-items: flex-start;` (active override)

### 70. Conflict in Selector `.auth-feature-icon` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 32px;` (modular)
    *   `height: 32px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `background-color: rgba(255, 255, 255, 0.05);` (modular)
    *   `border: 1px solid rgba(255, 255, 255, 0.08);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `color: var(--accent);` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `font-size: 0.95rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 42px;` (active override)
    *   `height: 42px;` (active override)
    *   `border-radius: var(--radius-sm);` (active override)
    *   `background: rgba(255, 255, 255, 0.08);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `font-size: 1.2rem;` (active override)
    *   `flex-shrink: 0;` (active override)

### 71. Conflict in Selector `.auth-brand-stats` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `gap: 32px;` (modular)
    *   `border-top: 1px solid rgba(255, 255, 255, 0.08);` (modular)
    *   `padding-top: 30px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `gap: 28px;` (active override)
    *   `padding-top: 28px;` (active override)
    *   `border-top: 1px solid rgba(255, 255, 255, 0.1);` (active override)

### 72. Conflict in Selector `.auth-stat strong` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 1.35rem;` (modular)
    *   `font-weight: 800;` (modular)
    *   `color: var(--white);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.3rem;` (active override)
    *   `font-weight: 800;` (active override)
    *   `color: var(--accent);` (active override)

### 73. Conflict in Selector `.auth-tab-toggle` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `position: relative;` (modular)
    *   `background: rgba(0, 102, 200, 0.06);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `padding: 4px;` (modular)
    *   `margin-bottom: 32px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `position: relative;` (active override)
    *   `background: rgba(var(--primary-rgb), 0.06);` (active override)
    *   `border-radius: var(--radius-full);` (active override)
    *   `padding: 4px;` (active override)
    *   `margin-bottom: 32px;` (active override)

### 74. Conflict in Selector `.input-icon-wrapper` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `gap: 10px;` (modular)
    *   `padding: 0 14px;` (modular)
    *   `background: var(--white);` (modular)
    *   `border: 1.5px solid var(--border-color);` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `transition: var(--transition-smooth);` (modular)
    *   `width: 100%;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 10px;` (active override)
    *   `padding: 0 14px;` (active override)
    *   `background: var(--white);` (active override)
    *   `border: 1.5px solid var(--border-color);` (active override)
    *   `border-radius: var(--radius-sm);` (active override)
    *   `transition: var(--transition-smooth);` (active override)

### 75. Conflict in Selector `.input-icon-wrapper:focus-within` (linked in `login.css`)
*   **Modular Properties**:
    *   `border-color: var(--primary);` (modular)
    *   `box-shadow: 0 0 0 3px rgba(0, 102, 200, 0.1);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-color: var(--primary);` (active override)
    *   `box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);` (active override)

### 76. Conflict in Selector `.strength-bar` (linked in `login.css`)
*   **Modular Properties**:
    *   `flex: 1;` (modular)
    *   `height: 4px;` (modular)
    *   `background: rgba(0, 102, 200, 0.1);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `overflow: hidden;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `flex: 1;` (active override)
    *   `height: 4px;` (active override)
    *   `background: rgba(var(--primary-rgb), 0.1);` (active override)
    *   `border-radius: var(--radius-full);` (active override)
    *   `overflow: hidden;` (active override)

### 77. Conflict in Selector `.spinner` (linked in `profile.css`)
*   **Modular Properties**:
    *   `width: 48px;` (modular)
    *   `height: 48px;` (modular)
    *   `border: 4px solid var(--border-color);` (modular)
    *   `border-top-color: var(--primary);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `animation: spin 1s linear infinite;` (modular)
    *   `margin-bottom: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 20px;` (active override)
    *   `height: 20px;` (active override)
    *   `border: 2.5px solid rgba(255, 255, 255, 0.3);` (active override)
    *   `border-top-color: white;` (active override)
    *   `border-radius: 50%;` (active override)
    *   `animation: authSpin 0.6s linear infinite;` (active override)
    *   `display: inline-block;` (active override)

### 78. Conflict in Selector `.auth-toast-icon` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 1.25rem;` (modular)
    *   `color: #EF4444;` (modular)
    *   `flex-shrink: 0;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.2rem;` (active override)
    *   `color: #EF4444;` (active override)
    *   `flex-shrink: 0;` (active override)

### 79. Conflict in Selector `.auth-toast-close` (linked in `login.css`)
*   **Modular Properties**:
    *   `background: none;` (modular)
    *   `border: none;` (modular)
    *   `font-size: 1.25rem;` (modular)
    *   `color: #991B1B;` (modular)
    *   `cursor: pointer;` (modular)
    *   `padding: 0 2px;` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `opacity: 0.6;` (modular)
    *   `transition: opacity 0.2s;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: none;` (active override)
    *   `border: none;` (active override)
    *   `font-size: 1.2rem;` (active override)
    *   `color: #991B1B;` (active override)
    *   `cursor: pointer;` (active override)
    *   `padding: 0 2px;` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `opacity: 0.6;` (active override)
    *   `transition: opacity 0.2s;` (active override)

### 80. Conflict in Selector `@media (max-width: 1024px) -> .auth-brand-panel` (linked in `login.css`)
*   **Modular Properties**:
    *   `1 {
    font-size: 1.6rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h1 {
    font-size: 1.6rem;` (active override)

### 81. Conflict in Selector `@media (max-width: 768px) -> .auth-brand-panel` (linked in `login.css`)
*   **Modular Properties**:
    *   `1 {
    font-size: 1.4rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h1 {
    font-size: 1.4rem;` (active override)

### 82. Conflict in Selector `@media (max-width: 768px) -> .auth-form-header` (linked in `login.css`)
*   **Modular Properties**:
    *   `p {
    font-size: 0.82rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 1.3rem;` (active override)

### 83. Conflict in Selector `@media (max-width: 480px) -> .auth-brand-panel` (linked in `login.css`)
*   **Modular Properties**:
    *   `1 {
    font-size: 1.2rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h1 {
    font-size: 1.2rem;` (active override)

### 84. Conflict in Selector `@media (max-width: 480px) -> .auth-brand-panel` (linked in `login.css`)
*   **Modular Properties**:
    *   `1 {
    font-size: 1.2rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `p {
    font-size: 0.85rem;` (active override)

### 85. Conflict in Selector `.auth-toast` (linked in `login.css`)
*   **Modular Properties**:
    *   `position: fixed;` (modular)
    *   `top: 24px;` (modular)
    *   `right: 24px;` (modular)
    *   `display: none;` (modular)
    *   `align-items: center;` (modular)
    *   `gap: 10px;` (modular)
    *   `padding: 14px 20px;` (modular)
    *   `background: #FEF2F2;` (modular)
    *   `border: 1px solid #FECACA;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `box-shadow: var(--shadow-md);` (modular)
    *   `z-index: 9999;` (modular)
    *   `max-width: 400px;` (modular)
    *   `opacity: 0;` (modular)
    *   `transform: translateY(-10px);` (modular)
    *   `transition: opacity 0.3s ease, transform 0.3s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: fixed;` (active override)
    *   `top: 24px;` (active override)
    *   `right: 24px;` (active override)
    *   `background: rgba(255, 255, 255, 0.95);` (active override)
    *   `backdrop-filter: blur(12px);` (active override)
    *   `-webkit-backdrop-filter: blur(12px);` (active override)
    *   `border: 1px solid rgba(239, 68, 68, 0.2);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `padding: 16px 20px;` (active override)
    *   `box-shadow: var(--shadow-lg);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 12px;` (active override)
    *   `z-index: 100000;` (active override)
    *   `max-width: 400px;` (active override)
    *   `transform: translateY(-20px);` (active override)
    *   `opacity: 0;` (active override)
    *   `transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;` (active override)
    *   `pointer-events: none;` (active override)

### 86. Conflict in Selector `.auth-toast.show` (linked in `login.css`)
*   **Modular Properties**:
    *   `opacity: 1;` (modular)
    *   `transform: translateY(0);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `transform: translateY(0);` (active override)
    *   `opacity: 1;` (active override)
    *   `pointer-events: auto;` (active override)

### 87. Conflict in Selector `.auth-toast-icon` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 1.25rem;` (modular)
    *   `color: #EF4444;` (modular)
    *   `flex-shrink: 0;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.25rem;` (active override)
    *   `color: #EF4444;` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)

### 88. Conflict in Selector `.auth-toast-msg` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.85rem;` (modular)
    *   `color: #991B1B;` (modular)
    *   `font-weight: 500;` (modular)
    *   `line-height: 1.4;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.9rem;` (active override)
    *   `font-weight: 500;` (active override)
    *   `color: var(--text-main);` (active override)
    *   `line-height: 1.4;` (active override)
    *   `flex-grow: 1;` (active override)

### 89. Conflict in Selector `.auth-toast-close` (linked in `login.css`)
*   **Modular Properties**:
    *   `background: none;` (modular)
    *   `border: none;` (modular)
    *   `font-size: 1.25rem;` (modular)
    *   `color: #991B1B;` (modular)
    *   `cursor: pointer;` (modular)
    *   `padding: 0 2px;` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `opacity: 0.6;` (modular)
    *   `transition: opacity 0.2s;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: none;` (active override)
    *   `border: none;` (active override)
    *   `color: var(--text-muted);` (active override)
    *   `font-size: 1.25rem;` (active override)
    *   `cursor: pointer;` (active override)
    *   `padding: 0 4px;` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `transition: var(--transition-fast);` (active override)

### 90. Conflict in Selector `.auth-toast-close:hover` (linked in `login.css`)
*   **Modular Properties**:
    *   `opacity: 1;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `color: var(--dark-bg);` (active override)

### 91. Conflict in Selector `.input-icon-wrapper select` (linked in `login.css`)
*   **Modular Properties**:
    *   `cursor: pointer;` (modular)
    *   `-webkit-appearance: none;` (modular)
    *   `-moz-appearance: none;` (modular)
    *   `appearance: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 100%;` (active override)
    *   `padding: 14px 16px 14px 44px;` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `font-size: 0.95rem;` (active override)
    *   `background-color: var(--white);` (active override)
    *   `color: var(--text-main);` (active override)
    *   `outline: none;` (active override)
    *   `cursor: pointer;` (active override)
    *   `appearance: none;` (active override)
    *   `-webkit-appearance: none;` (active override)
    *   `-moz-appearance: none;` (active override)
    *   `transition: var(--transition-smooth);` (active override)

### 92. Conflict in Selector `.avatar-upload-area` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `gap: 14px;` (modular)
    *   `padding: 12px 14px;` (modular)
    *   `background: var(--white);` (modular)
    *   `border: 1.5px dashed var(--border-color);` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: border-color 0.2s ease, background 0.2s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 16px;` (active override)
    *   `border: 2px dashed var(--border-color);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `padding: 16px;` (active override)
    *   `background-color: var(--white);` (active override)
    *   `cursor: pointer;` (active override)
    *   `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` (active override)
    *   `position: relative;` (active override)

### 93. Conflict in Selector `.avatar-preview` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 48px;` (modular)
    *   `height: 48px;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `background: rgba(0, 102, 200, 0.08);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `overflow: hidden;` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 56px;` (active override)
    *   `height: 56px;` (active override)
    *   `border-radius: 50%;` (active override)
    *   `background-color: var(--light-bg);` (active override)
    *   `border: 1px solid var(--border-color);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `overflow: hidden;` (active override)
    *   `color: var(--text-muted);` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `transition: all 0.3s ease;` (active override)

### 94. Conflict in Selector `.avatar-upload-text` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `gap: 2px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `gap: 4px;` (active override)

### 95. Conflict in Selector `.avatar-upload-label` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.88rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.95rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `color: var(--text-main);` (active override)
    *   `transition: color 0.2s ease;` (active override)

### 96. Conflict in Selector `.avatar-upload-hint` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.75rem;` (modular)
    *   `color: var(--text-muted);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.8rem;` (active override)
    *   `color: var(--text-muted);` (active override)

### 97. Conflict in Selector `.dashboard-layout` (linked in `dashboard.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `min-height: 100vh;` (modular)
    *   `background-color: var(--light-bg);` (modular)
    *   `color: var(--text-main);` (modular)
    *   `overflow: hidden;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `min-height: 100vh;` (active override)
    *   `background-color: var(--light-bg);` (active override)

### 98. Conflict in Selector `.toast-container` (linked in `profile.css`)
*   **Modular Properties**:
    *   `position: fixed;` (modular)
    *   `top: 24px;` (modular)
    *   `right: 24px;` (modular)
    *   `z-index: 99999;` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `gap: 10px;` (modular)
    *   `pointer-events: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: fixed;` (active override)
    *   `bottom: 24px;` (active override)
    *   `right: 24px;` (active override)
    *   `z-index: 3000;` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `gap: 10px;` (active override)
    *   `max-width: 380px;` (active override)

### 99. Conflict in Selector `.toast-alert` (linked in `profile.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `padding: 14px 22px;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `font-size: 0.9rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--white);` (modular)
    *   `background: linear-gradient(135deg, hsl(217, 71%, 48%), hsl(217, 71%, 38%));` (modular)
    *   `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);` (modular)
    *   `pointer-events: auto;` (modular)
    *   `opacity: 0;` (modular)
    *   `transform: translateX(40px);` (modular)
    *   `transition: opacity 0.35s ease, transform 0.35s ease;` (modular)
    *   `min-width: 280px;` (modular)
    *   `max-width: 420px;` (modular)
    *   `backdrop-filter: blur(8px);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 12px;` (active override)
    *   `padding: 14px 20px;` (active override)
    *   `border-radius: var(--radius-sm);` (active override)
    *   `font-size: 0.88rem;` (active override)
    *   `font-weight: 500;` (active override)
    *   `box-shadow: var(--shadow-lg);` (active override)
    *   `opacity: 0;` (active override)
    *   `transform: translateX(30px);` (active override)
    *   `transition: all 0.35s ease;` (active override)

### 100. Conflict in Selector `.toast-alert-success` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background: linear-gradient(135deg, hsl(150, 60%, 42%), hsl(150, 60%, 32%));` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: #ECFDF5;` (active override)
    *   `color: #065F46;` (active override)
    *   `border: 1px solid rgba(16, 185, 129, 0.25);` (active override)

### 101. Conflict in Selector `.toast-alert-error` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background: linear-gradient(135deg, hsl(0, 65%, 50%), hsl(0, 65%, 40%));` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: #FEF2F2;` (active override)
    *   `color: #991B1B;` (active override)
    *   `border: 1px solid rgba(239, 68, 68, 0.25);` (active override)

### 102. Conflict in Selector `.about-meta-list` (linked in `schools.css`)
*   **Modular Properties**:
    *   `list-style: none;` (modular)
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `gap: 12px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `list-style: none;` (active override)

### 103. Conflict in Selector `.about-meta-item` (linked in `schools.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `font-size: 0.9rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `justify-content: space-between;` (active override)
    *   `align-items: center;` (active override)
    *   `font-size: 0.88rem;` (active override)
    *   `padding: 8px 0;` (active override)

### 104. Conflict in Selector `.about-meta-item span:last-child` (linked in `schools.css`)
*   **Modular Properties**:
    *   `font-weight: 600;` (modular)
    *   `color: var(--dark-bg);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-weight: 600;` (active override)
    *   `color: var(--text-main);` (active override)

### 105. Conflict in Selector `.success-screen` (linked in `components.css`)
*   **Modular Properties**:
    *   `text-align: center;` (modular)
    *   `padding: 20px 0;` (modular)
    *   `display: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: none;` (active override)
    *   `flex-direction: column;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `text-align: center;` (active override)
    *   `padding: 40px 20px;` (active override)

### 106. Conflict in Selector `.success-screen.active` (linked in `components.css`)
*   **Modular Properties**:
    *   `display: block;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)

### 107. Conflict in Selector `.success-icon` (linked in `components.css`)
*   **Modular Properties**:
    *   `width: 72px;` (modular)
    *   `height: 72px;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `background-color: var(--accent-light);` (modular)
    *   `color: var(--accent-hover);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `font-size: 2.2rem;` (modular)
    *   `margin: 0 auto 20px auto;` (modular)
    *   `animation: pulse-ring 2s infinite;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 64px;` (active override)
    *   `height: 64px;` (active override)
    *   `border-radius: 50%;` (active override)
    *   `background: rgba(16, 185, 129, 0.1);` (active override)
    *   `color: #10B981;` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `font-size: 2rem;` (active override)
    *   `font-weight: bold;` (active override)
    *   `margin-bottom: 16px;` (active override)

### 108. Conflict in Selector `.spinner` (linked in `profile.css`)
*   **Modular Properties**:
    *   `width: 48px;` (modular)
    *   `height: 48px;` (modular)
    *   `border: 4px solid var(--border-color);` (modular)
    *   `border-top-color: var(--primary);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `animation: spin 1s linear infinite;` (modular)
    *   `margin-bottom: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 18px;` (active override)
    *   `height: 18px;` (active override)
    *   `border: 2px solid rgba(255, 255, 255, 0.3);` (active override)
    *   `border-top-color: var(--white);` (active override)
    *   `border-radius: 50%;` (active override)
    *   `animation: spin 0.7s linear infinite;` (active override)
    *   `display: inline-block;` (active override)

### 109. Conflict in Selector `.profile-avatar-container` (linked in `profile.css`)
*   **Modular Properties**:
    *   `width: 140px !important;` (modular)
    *   `height: 140px !important;` (modular)
    *   `margin-top: -70px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: relative;` (active override)
    *   `margin-top: -80px;` (active override)
    *   `width: 150px;` (active override)
    *   `height: 150px;` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `margin-bottom: 16px;` (active override)

### 110. Conflict in Selector `.profile-avatar-large` (linked in `profile.css`)
*   **Modular Properties**:
    *   `width: 140px !important;` (modular)
    *   `height: 140px !important;` (modular)
    *   `border: 5px solid var(--white) !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 150px;` (active override)
    *   `height: 150px;` (active override)
    *   `border-radius: var(--radius-full);` (active override)
    *   `border: 5px solid var(--white);` (active override)
    *   `background-color: var(--primary-light);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `box-shadow: var(--shadow-md);` (active override)
    *   `overflow: hidden;` (active override)

### 111. Conflict in Selector `.profile-name` (linked in `profile.css`)
*   **Modular Properties**:
    *   `font-size: 2.2rem !important;` (modular)
    *   `font-weight: 800 !important;` (modular)
    *   `color: var(--dark-bg) !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 2rem;` (active override)
    *   `font-weight: 800;` (active override)
    *   `color: var(--dark-bg);` (active override)
    *   `line-height: 1.2;` (active override)

### 112. Conflict in Selector `.verified-badge` (linked in `profile.css`)
*   **Modular Properties**:
    *   `display: inline-block;` (modular)
    *   `vertical-align: middle;` (modular)
    *   `margin-left: 6px;` (modular)
    *   `color: #1D9BF0;` (modular)
    *   `fill: currentColor;` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `width: 16px;` (modular)
    *   `height: 16px;` (modular)
    *   `transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.25s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: inline-block;` (active override)
    *   `vertical-align: middle;` (active override)
    *   `margin-left: 6px;` (active override)
    *   `color: #1D9BF0;` (active override)
    *   `/* x/twitter electric blue */
  fill: currentColor;` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `width: 16px;` (active override)
    *   `height: 16px;` (active override)
    *   `transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.25s ease;` (active override)

### 113. Conflict in Selector `.profile-actions` (linked in `schools.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `gap: 12px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `margin-top: 24px;` (active override)

### 114. Conflict in Selector `.achievements-timeline` (linked in `schools.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `gap: 24px;` (modular)
    *   `position: relative;` (modular)
    *   `padding-left: 32px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: relative;` (active override)
    *   `padding-left: 28px;` (active override)
    *   `border-left: 2px solid var(--border-color);` (active override)
    *   `margin-left: 12px;` (active override)
    *   `display: flex;` (active override)
    *   `flex-direction: column;` (active override)
    *   `gap: 28px;` (active override)

### 115. Conflict in Selector `.modal-tabs` (linked in `profile.css`)
*   **Modular Properties**:
    *   `position: relative;` (modular)
    *   `display: flex;` (modular)
    *   `background-color: var(--light-bg);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `padding: 6px;` (modular)
    *   `margin-bottom: 24px;` (modular)
    *   `gap: 6px;` (modular)
    *   `overflow-x: auto;` (modular)
    *   `scrollbar-width: none;` (modular)
    *   `-webkit-overflow-scrolling: touch;` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `position: relative;` (active override)
    *   `display: flex;` (active override)
    *   `background-color: var(--light-bg);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `padding: 6px;` (active override)
    *   `margin-bottom: 24px;` (active override)
    *   `gap: 6px;` (active override)
    *   `overflow-x: auto;` (active override)
    *   `scrollbar-width: none;` (active override)
    *   `/* hide scrollbar for firefox */
  -webkit-overflow-scrolling: touch;` (active override)
    *   `border: 1px solid var(--border-color);` (active override)

### 116. Conflict in Selector `.profile-sidebar-card` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `padding: 30px;` (modular)
    *   `box-shadow: var(--shadow-md);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `text-align: center;` (active override)

### 117. Conflict in Selector `.spinner` (linked in `profile.css`)
*   **Modular Properties**:
    *   `width: 48px;` (modular)
    *   `height: 48px;` (modular)
    *   `border: 4px solid var(--border-color);` (modular)
    *   `border-top-color: var(--primary);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `animation: spin 1s linear infinite;` (modular)
    *   `margin-bottom: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 32px;` (active override)
    *   `height: 32px;` (active override)
    *   `border: 3px solid var(--light-bg);` (active override)
    *   `border-top-color: var(--primary);` (active override)
    *   `border-radius: 50%;` (active override)
    *   `animation: spin 0.8s linear infinite;` (active override)
    *   `margin-bottom: 12px;` (active override)

### 118. Conflict in Selector `.net-hero-content h1` (linked in `networking.css`)
*   **Modular Properties**:
    *   `font-size: 2.4rem;` (modular)
    *   `font-weight: 800;` (modular)
    *   `color: var(--white);` (modular)
    *   `letter-spacing: -0.5px;` (modular)
    *   `margin-bottom: 8px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 2.4rem;` (active override)
    *   `font-weight: 800;` (active override)
    *   `color: var(--white);` (active override)
    *   `margin-bottom: 12px;` (active override)
    *   `letter-spacing: -0.5px;` (active override)

### 119. Conflict in Selector `.net-hero-content p` (linked in `networking.css`)
*   **Modular Properties**:
    *   `font-size: 1.05rem;` (modular)
    *   `color: rgba(255, 255, 255, 0.7);` (modular)
    *   `max-width: 600px;` (modular)
    *   `margin: 0 auto;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.05rem;` (active override)
    *   `color: hsla(0, 0%, 100%, 0.65);` (active override)
    *   `max-width: 520px;` (active override)
    *   `margin: 0 auto;` (active override)
    *   `line-height: 1.6;` (active override)

### 120. Conflict in Selector `.net-search-wrapper` (linked in `networking.css`)
*   **Modular Properties**:
    *   `margin-bottom: 24px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `max-width: 600px;` (active override)
    *   `margin: 0 auto;` (active override)
    *   `position: relative;` (active override)
    *   `z-index: 1;` (active override)

### 121. Conflict in Selector `.net-search-bar` (linked in `networking.css`)
*   **Modular Properties**:
    *   `background: var(--white) !important;` (modular)
    *   `border: 1px solid rgba(15, 23, 42, 0.08) !important;` (modular)
    *   `border-radius: var(--radius-md) !important;` (modular)
    *   `box-shadow: 0 4px 15px rgba(15, 23, 42, 0.02) !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `gap: 12px;` (active override)
    *   `background: hsla(0, 0%, 100%, 0.1);` (active override)
    *   `border: 1.5px solid hsla(0, 0%, 100%, 0.15);` (active override)
    *   `border-radius: var(--radius-md);` (active override)
    *   `padding: 14px 20px;` (active override)
    *   `backdrop-filter: blur(12px);` (active override)
    *   `transition: var(--transition-fast);` (active override)

### 122. Conflict in Selector `.net-search-bar:focus-within` (linked in `networking.css`)
*   **Modular Properties**:
    *   `background: var(--white) !important;` (modular)
    *   `border-color: var(--primary) !important;` (modular)
    *   `box-shadow: 0 0 0 4px var(--primary-light) !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: hsla(0, 0%, 100%, 0.15);` (active override)
    *   `border-color: hsla(217, 90%, 60%, 0.5);` (active override)
    *   `box-shadow: 0 0 0 4px hsla(217, 90%, 60%, 0.12);` (active override)

### 123. Conflict in Selector `.net-search-bar svg` (linked in `networking.css`)
*   **Modular Properties**:
    *   `color: var(--text-muted) !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `color: hsla(0, 0%, 100%, 0.5);` (active override)
    *   `flex-shrink: 0;` (active override)

### 124. Conflict in Selector `.net-search-bar input` (linked in `networking.css`)
*   **Modular Properties**:
    *   `color: var(--text-main) !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: transparent;` (active override)
    *   `border: none;` (active override)
    *   `outline: none;` (active override)
    *   `color: var(--white);` (active override)
    *   `font-size: 0.95rem;` (active override)
    *   `flex-grow: 1;` (active override)
    *   `font-weight: 500;` (active override)

### 125. Conflict in Selector `.net-search-bar input::placeholder` (linked in `networking.css`)
*   **Modular Properties**:
    *   `color: var(--text-muted) !important;` (modular)
    *   `opacity: 0.7;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `color: hsla(0, 0%, 100%, 0.4);` (active override)

### 126. Conflict in Selector `.connection-request-card:hover` (linked in `networking.css`)
*   **Modular Properties**:
    *   `transform: translateY(-2px);` (modular)
    *   `box-shadow: var(--shadow-sm);` (modular)
    *   `border-color: rgba(0, 102, 200, 0.2);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `transform: translateY(-2px);` (active override)
    *   `box-shadow: var(--shadow-sm);` (active override)
    *   `border-color: rgba(var(--primary-rgb), 0.2);` (active override)

### 127. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `body {
    padding-top: 52p;` (active override)

### 128. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h1 {
    font-size: 1.5rem !important;` (active override)
    *   `line-height: 1.25 !important;` (active override)
    *   `letter-spacing: -0.02e;` (active override)

### 129. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 1.25rem !important;` (active override)
    *   `line-height: 1.3 !importan;` (active override)

### 130. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h3 {
    font-size: 1.1rem !important;` (active override)
    *   `line-height: 1.3 !importan;` (active override)

### 131. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h4 {
    font-size: 0.95rem !important;` (active override)
    *   `line-height: 1.3 !importan;` (active override)

### 132. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `abel {
    font-size: 0.8rem !importan;` (active override)

### 133. Conflict in Selector `.avatar-upload-area:hover` (linked in `login.css`)
*   **Modular Properties**:
    *   `border-color: var(--primary);` (modular)
    *   `background: rgba(0, 102, 200, 0.03);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-color: var(--primary);` (active override)
    *   `background: rgba(var(--primary-rgb), 0.03);` (active override)

### 134. Conflict in Selector `.avatar-preview` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 48px;` (modular)
    *   `height: 48px;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `background: rgba(0, 102, 200, 0.08);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `overflow: hidden;` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 48px;` (active override)
    *   `height: 48px;` (active override)
    *   `border-radius: 50%;` (active override)
    *   `background: rgba(var(--primary-rgb), 0.08);` (active override)
    *   `display: flex;` (active override)
    *   `align-items: center;` (active override)
    *   `justify-content: center;` (active override)
    *   `flex-shrink: 0;` (active override)
    *   `overflow: hidden;` (active override)
    *   `color: var(--primary);` (active override)

### 135. Conflict in Selector `.role-card:hover` (linked in `login.css`)
*   **Modular Properties**:
    *   `border-color: var(--primary);` (modular)
    *   `background: rgba(0, 102, 200, 0.04);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-color: var(--primary);` (active override)
    *   `background: rgba(var(--primary-rgb), 0.04);` (active override)

### 136. Conflict in Selector `.role-card.selected` (linked in `login.css`)
*   **Modular Properties**:
    *   `border-color: var(--primary);` (modular)
    *   `background: rgba(0, 102, 200, 0.08);` (modular)
    *   `box-shadow: 0 0 0 3px rgba(0, 102, 200, 0.12);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `border-color: var(--primary);` (active override)
    *   `background: rgba(var(--primary-rgb), 0.08);` (active override)
    *   `box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.12);` (active override)

### 137. Conflict in Selector `.auth-forgot-link` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: block;` (modular)
    *   `text-align: right;` (modular)
    *   `font-size: 0.8rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--primary);` (modular)
    *   `text-decoration: none;` (modular)
    *   `margin-top: 8px;` (modular)
    *   `margin-bottom: 4px;` (modular)
    *   `transition: opacity 0.2s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: block;` (active override)
    *   `text-align: right;` (active override)
    *   `font-size: 0.8rem;` (active override)
    *   `font-weight: 600;` (active override)
    *   `color: var(--primary);` (active override)
    *   `text-decoration: none;` (active override)
    *   `margin-top: -4px;` (active override)
    *   `margin-bottom: 4px;` (active override)
    *   `transition: opacity 0.2s ease;` (active override)

### 138. Conflict in Selector `@media (max-width: 1024px) -> .auth-brand-panel` (linked in `login.css`)
*   **Modular Properties**:
    *   `1 {
    font-size: 1.6rem;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h1 {
    font-size: 1.65rem;` (active override)

### 139. Conflict in Selector `@media (max-width: 768px) -> .auth-form-head` (linked in `login.css`)
*   **Modular Properties**:
    *   `r {
    margin-bottom: 16px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `r h2 {
    font-size: 1.3rem !important;` (active override)
    *   `font-weight: 800;` (active override)
    *   `margin-bottom: 4p;` (active override)

### 140. Conflict in Selector `@media (max-width: 480px) -> .auth-form-header` (linked in `login.css`)
*   **Modular Properties**:
    *   `2 {
    font-size: 1.15rem !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 1.15rem !important;` (active override)

### 141. Conflict in Selector `.auth-form-panel` (linked in `login.css`)
*   **Modular Properties**:
    *   `flex: 1;` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `padding: 40px;` (modular)
    *   `position: relative;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `flex: 1;` (active override)
    *   `padding: 20px 20px 32px;` (active override)
    *   `align-items: flex-start;` (active override)
    *   `overflow-y: auto;` (active override)
    *   `-webkit-overflow-scrolling: touch;` (active override)

### 142. Conflict in Selector `.auth-form-container` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 100%;` (modular)
    *   `max-width: 480px;` (modular)
    *   `position: relative;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `max-width: 100%;` (active override)
    *   `width: 100%;` (active override)

### 143. Conflict in Selector `.auth-tab-toggle` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `position: relative;` (modular)
    *   `background: rgba(0, 102, 200, 0.06);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `padding: 4px;` (modular)
    *   `margin-bottom: 32px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `margin-bottom: 20px;` (active override)

### 144. Conflict in Selector `.auth-tab-btn` (linked in `login.css`)
*   **Modular Properties**:
    *   `flex: 1;` (modular)
    *   `padding: 12px 20px;` (modular)
    *   `border: none;` (modular)
    *   `background: none;` (modular)
    *   `font-size: 0.9rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `cursor: pointer;` (modular)
    *   `z-index: 2;` (modular)
    *   `position: relative;` (modular)
    *   `transition: var(--transition-fast);` (modular)
    *   `border-radius: var(--radius-full);` (modular)
    *   `font-family: inherit;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 10px 12px;` (active override)
    *   `font-size: 0.84rem;` (active override)

### 145. Conflict in Selector `.auth-form-header` (linked in `login.css`)
*   **Modular Properties**:
    *   `margin-bottom: 28px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `margin-bottom: 16px;` (active override)

### 146. Conflict in Selector `.auth-form-header h2` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 1.6rem;` (modular)
    *   `font-weight: 800;` (modular)
    *   `color: var(--dark-bg);` (modular)
    *   `margin-bottom: 6px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.3rem !important;` (active override)
    *   `font-weight: 800;` (active override)
    *   `margin-bottom: 4px;` (active override)

### 147. Conflict in Selector `.auth-form-header p` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.9rem;` (modular)
    *   `color: var(--text-muted);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.82rem;` (active override)

### 148. Conflict in Selector `.auth-submit-btn` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 100%;` (modular)
    *   `padding: 14px;` (modular)
    *   `font-size: 1rem;` (modular)
    *   `font-weight: 700;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `margin-top: 8px;` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `gap: 8px;` (modular)
    *   `transition: var(--transition-smooth);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 12px !important;` (active override)
    *   `font-size: 0.92rem !important;` (active override)
    *   `min-height: 46px;` (active override)
    *   `margin-top: 4px;` (active override)

### 149. Conflict in Selector `.auth-form-footer` (linked in `login.css`)
*   **Modular Properties**:
    *   `text-align: center;` (modular)
    *   `margin-top: 20px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `margin-top: 12px;` (active override)

### 150. Conflict in Selector `.auth-form-footer p` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.85rem;` (modular)
    *   `color: var(--text-muted);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.8rem;` (active override)

### 151. Conflict in Selector `.role-card-grid` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: grid;` (modular)
    *   `grid-template-columns: repeat(3, 1fr);` (modular)
    *   `gap: 10px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `grid-template-columns: repeat(2, 1fr);` (active override)
    *   `gap: 8px;` (active override)

### 152. Conflict in Selector `.role-card` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `flex-direction: column;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `gap: 6px;` (modular)
    *   `padding: 12px 8px;` (modular)
    *   `border: 1.5px solid var(--border-color);` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `background: var(--white);` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;` (modular)
    *   `text-align: center;` (modular)
    *   `user-select: none;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 10px 6px;` (active override)

### 153. Conflict in Selector `.role-card-icon` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 1.4rem;` (modular)
    *   `line-height: 1;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.2rem;` (active override)

### 154. Conflict in Selector `.role-card-label` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.72rem;` (modular)
    *   `font-weight: 700;` (modular)
    *   `color: var(--text-main);` (modular)
    *   `line-height: 1.2;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.68rem;` (active override)

### 155. Conflict in Selector `.avatar-upload-area` (linked in `login.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `gap: 14px;` (modular)
    *   `padding: 12px 14px;` (modular)
    *   `background: var(--white);` (modular)
    *   `border: 1.5px dashed var(--border-color);` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: border-color 0.2s ease, background 0.2s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 10px 12px;` (active override)
    *   `gap: 10px;` (active override)

### 156. Conflict in Selector `.avatar-preview` (linked in `login.css`)
*   **Modular Properties**:
    *   `width: 48px;` (modular)
    *   `height: 48px;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `background: rgba(0, 102, 200, 0.08);` (modular)
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: center;` (modular)
    *   `flex-shrink: 0;` (modular)
    *   `overflow: hidden;` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `width: 40px;` (active override)
    *   `height: 40px;` (active override)

### 157. Conflict in Selector `.avatar-upload-label` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.88rem;` (modular)
    *   `font-weight: 600;` (modular)
    *   `color: var(--primary);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.82rem;` (active override)

### 158. Conflict in Selector `.avatar-upload-hint` (linked in `login.css`)
*   **Modular Properties**:
    *   `font-size: 0.75rem;` (modular)
    *   `color: var(--text-muted);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 0.68rem;` (active override)

### 159. Conflict in Selector `.auth-toast` (linked in `login.css`)
*   **Modular Properties**:
    *   `position: fixed;` (modular)
    *   `top: 24px;` (modular)
    *   `right: 24px;` (modular)
    *   `display: none;` (modular)
    *   `align-items: center;` (modular)
    *   `gap: 10px;` (modular)
    *   `padding: 14px 20px;` (modular)
    *   `background: #FEF2F2;` (modular)
    *   `border: 1px solid #FECACA;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `box-shadow: var(--shadow-md);` (modular)
    *   `z-index: 9999;` (modular)
    *   `max-width: 400px;` (modular)
    *   `opacity: 0;` (modular)
    *   `transform: translateY(-10px);` (modular)
    *   `transition: opacity 0.3s ease, transform 0.3s ease;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `left: 16px;` (active override)
    *   `right: 16px;` (active override)
    *   `max-width: none;` (active override)
    *   `top: 12px;` (active override)

### 160. Conflict in Selector `.auth-bg-shape` (linked in `login.css`)
*   **Modular Properties**:
    *   `position: absolute;` (modular)
    *   `border-radius: 50%;` (modular)
    *   `filter: blur(120px);` (modular)
    *   `opacity: 0.4;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `filter: blur(60px) !important;` (active override)
    *   `opacity: 0.15 !important;` (active override)

### 161. Conflict in Selector `@media (max-width: 480px) -> .auth-form-header` (linked in `login.css`)
*   **Modular Properties**:
    *   `2 {
    font-size: 1.15rem !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 1.15rem !important;` (active override)

### 162. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h1 {
    font-size: 24px !important;` (active override)

### 163. Conflict in Selector `@media (max-width: 768px) -> ` (linked in `admissions.css`)
*   **Modular Properties**:
    *   `] {
    display: flex !important;` (modular)
    *   `width: 100% !important;` (modular)
    *   `justify-content: space-between !important;` (modular)
    *   `align-items: center !important;` (modular)
    *   `margin-top: 4px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 20px !important;` (active override)

### 164. Conflict in Selector `@media (max-width: 768px) -> .suggest-school-banner` (linked in `schools.css`)
*   **Modular Properties**:
    *   `p {
    font-size: 0.72rem !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h4 {
    font-size: 0.95rem !important;` (active override)

### 165. Conflict in Selector `@media (max-width: 768px) -> .event-detail-section` (linked in `event-detail.css`)
*   **Modular Properties**:
    *   `2 {
    font-size: 1.05rem !important;` (modular)
    *   `margin-bottom: 12px !important;` (modular)
    *   `padding-bottom: 6px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 1.05rem !important;` (active override)
    *   `margin-bottom: 12px !important;` (active override)
    *   `padding-bottom: 6px !important;` (active override)

### 166. Conflict in Selector `@media (max-width: 768px) -> .event-detail-section p, .event-detail-section` (linked in `event-detail.css`)
*   **Modular Properties**:
    *   `i {
    font-size: 0.85rem !important;` (modular)
    *   `line-height: 1.5 !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `li {
    font-size: 0.85rem !important;` (active override)
    *   `line-height: 1.5 !important;` (active override)

### 167. Conflict in Selector `@media (max-width: 768px) -> .net-card-b` (linked in `networking.css`)
*   **Modular Properties**:
    *   `o {
    font-size: 0.65rem !important;` (modular)
    *   `margin-bottom: 2px !important;` (modular)
    *   `line-height: 1.2 !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `dy {
    padding: 2px 6px 2px !important;` (active override)

### 168. Conflict in Selector `.btn-reject-request` (linked in `networking.css`)
*   **Modular Properties**:
    *   `background: var(--white);` (modular)
    *   `color: var(--text-muted);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `padding: 8px 12px;` (modular)
    *   `font-size: 0.8rem;` (modular)
    *   `font-weight: 700;` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: var(--transition-fast);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: transparent;` (active override)
    *   `border: 1.5px solid var(--text-muted) !important;` (active override)
    *   `color: var(--text-muted) !important;` (active override)

### 169. Conflict in Selector `.btn-reject-request:hover` (linked in `networking.css`)
*   **Modular Properties**:
    *   `background: #fee2e2;` (modular)
    *   `color: #ef4444;` (modular)
    *   `border-color: #fca5a5;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background-color: var(--light-bg);` (active override)
    *   `border-color: var(--text-main) !important;` (active override)
    *   `color: var(--text-main) !important;` (active override)

### 170. Conflict in Selector `.btn-accept-request` (linked in `networking.css`)
*   **Modular Properties**:
    *   `background: var(--primary);` (modular)
    *   `color: var(--white);` (modular)
    *   `border: none;` (modular)
    *   `border-radius: var(--radius-sm);` (modular)
    *   `padding: 8px 12px;` (modular)
    *   `font-size: 0.8rem;` (modular)
    *   `font-weight: 700;` (modular)
    *   `cursor: pointer;` (modular)
    *   `transition: var(--transition-fast);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: var(--primary) !important;` (active override)
    *   `border: 1.5px solid var(--primary) !important;` (active override)
    *   `color: var(--white) !important;` (active override)

### 171. Conflict in Selector `.btn-accept-request:hover` (linked in `networking.css`)
*   **Modular Properties**:
    *   `background: var(--primary-hover);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `background: var(--primary-hover) !important;` (active override)
    *   `border-color: var(--primary-hover) !important;` (active override)
    *   `box-shadow: 0 4px 12px rgba(0, 102, 200, 0.2);` (active override)

### 172. Conflict in Selector `header:not(.mobile-fixed-header):not(.dashboard-top-bar) .container` (linked in `layout.css`)
*   **Modular Properties**:
    *   `display: flex;` (modular)
    *   `align-items: center;` (modular)
    *   `justify-content: space-between;` (modular)
    *   `height: 100%;` (modular)
    *   `max-width: 1128px;` (modular)
    *   `margin: 0 auto;` (modular)
    *   `padding: 0 16px;` (modular)
    *   `width: 100%;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding-left: 12px !important;` (active override)
    *   `padding-right: 12px !important;` (active override)

### 173. Conflict in Selector `@media (max-width: 768px) -> .suggestions-header-row` (linked in `networking.css`)
*   **Modular Properties**:
    *   `2 {
    font-size: 18px !important;` (modular)
    *   `font-weight: 600 !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `h2 {
    font-size: 18px !important;` (active override)
    *   `font-weight: 600 !important;` (active override)

### 174. Conflict in Selector `@media (max-width: 768px) -> .net-card-b` (linked in `networking.css`)
*   **Modular Properties**:
    *   `o {
    font-size: 0.65rem !important;` (modular)
    *   `margin-bottom: 2px !important;` (modular)
    *   `line-height: 1.2 !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `dy {
    padding: 2px 6px 2px !important;` (active override)
    *   `display: flex !important;` (active override)
    *   `flex-direction: column !important;` (active override)
    *   `align-items: center !important;` (active override)
    *   `text-align: center !important;` (active override)
    *   `gap: 0 !important;` (active override)
    *   `flex-grow: 1 !important;` (active override)

### 175. Conflict in Selector `@media (max-width: 768px) -> .btn-mobile-network s` (linked in `networking.css`)
*   **Modular Properties**:
    *   `g {
    color: var(--text-main) !important;` (modular)
    *   `width: 14px !important;` (modular)
    *   `height: 14px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `an {
    display: none !important;` (active override)

### 176. Conflict in Selector `@media (max-width: 768px) -> .net-card-b` (linked in `networking.css`)
*   **Modular Properties**:
    *   `o {
    font-size: 0.65rem !important;` (modular)
    *   `margin-bottom: 2px !important;` (modular)
    *   `line-height: 1.2 !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `dy {
    padding: 0 !important;` (active override)
    *   `display: flex !important;` (active override)
    *   `flex-direction: column !important;` (active override)
    *   `align-items: center !important;` (active override)
    *   `text-align: center !important;` (active override)
    *   `flex-grow: 1 !important;` (active override)
    *   `width: 100% !important;` (active override)
    *   `justify-content: center !important;` (active override)

### 177. Conflict in Selector `@media (max-width: 992px) -> .nav-list` (linked in `profile.css`)
*   **Modular Properties**:
    *   `i {
    display: none !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `li {
    display: none !important;` (active override)

### 178. Conflict in Selector `@media (max-width: 992px) -> #edit-profile-btn s` (linked in `profile.css`)
*   **Modular Properties**:
    *   `g {
    width: 18px !important;` (modular)
    *   `height: 18px !important;` (modular)
    *   `margin: 0 !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `an {
    display: none !important;` (active override)

### 179. Conflict in Selector `.profile-grid` (linked in `profile.css`)
*   **Modular Properties**:
    *   `display: grid;` (modular)
    *   `grid-template-columns: 1fr;` (modular)
    *   `gap: 24px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `display: grid !important;` (active override)
    *   `grid-template-columns: 1fr !important;` (active override)
    *   `gap: 16px !important;` (active override)

### 180. Conflict in Selector `.profile-sidebar-card` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `padding: 30px;` (modular)
    *   `box-shadow: var(--shadow-md);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 16px !important;` (active override)
    *   `margin-bottom: 0 !important;` (active override)
    *   `border-radius: 10px !important;` (active override)
    *   `background-color: var(--white) !important;` (active override)
    *   `border: 1px solid var(--border-color) !important;` (active override)
    *   `box-shadow: var(--shadow-sm) !important;` (active override)

### 181. Conflict in Selector `.profile-section` (linked in `profile.css`)
*   **Modular Properties**:
    *   `background-color: var(--white);` (modular)
    *   `border-radius: var(--radius-md);` (modular)
    *   `padding: 36px;` (modular)
    *   `box-shadow: var(--shadow-md);` (modular)
    *   `border: 1px solid var(--border-color);` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `padding: 16px !important;` (active override)
    *   `margin-bottom: 0 !important;` (active override)
    *   `border-radius: 10px !important;` (active override)
    *   `border: 1px solid var(--border-color) !important;` (active override)
    *   `box-shadow: var(--shadow-sm) !important;` (active override)

### 182. Conflict in Selector `.section-title` (linked in `profile.css`)
*   **Modular Properties**:
    *   `font-size: 1.3rem;` (modular)
    *   `font-weight: 800;` (modular)
    *   `color: var(--dark-bg);` (modular)
    *   `margin-bottom: 24px;` (modular)
    *   `border-bottom: 1.5px solid var(--border-color);` (modular)
    *   `padding-bottom: 12px;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `font-size: 1.1rem !important;` (active override)
    *   `font-weight: 700 !important;` (active override)
    *   `margin-bottom: 12px !important;` (active override)

### 183. Conflict in Selector `@media (max-width: 768px) -> .suggested-grid .net-ca` (linked in `networking.css`)
*   **Modular Properties**:
    *   `d {
    height: 240px !important;` (modular)
    *   `padding: 12px 10px !important;` (modular)
*   **Active Override Properties** (retained in `style.css`):
    *   `d {
    flex: 0 0 220px;` (active override)
    *   `margin-bottom: 4px;` (active override)
    *   `scroll-snap-align: start;` (active override)

---

## Dead CSS Detection (Selectors with no proven usage in HTML/JS)

As per the safety guidelines, **no selectors with unproven usage were deleted**. They are listed below as **POTENTIALLY UNUSED** for developer review:

*   `.academic-pulse-card,
.recent-activity-section` (POTENTIALLY UNUSED)
*   `.activity-content` (POTENTIALLY UNUSED)
*   `.activity-item` (POTENTIALLY UNUSED)
*   `.activity-marker` (POTENTIALLY UNUSED)
*   `.activity-text` (POTENTIALLY UNUSED)
*   `.activity-time` (POTENTIALLY UNUSED)
*   `.activity-timeline` (POTENTIALLY UNUSED)
*   `.activity-timeline::before` (POTENTIALLY UNUSED)
*   `.btn-profile-follow` (POTENTIALLY UNUSED)
*   `.btn-profile-follow.follow-state` (POTENTIALLY UNUSED)
*   `.btn-profile-follow.follow-state:hover` (POTENTIALLY UNUSED)
*   `.btn-profile-follow.following-state` (POTENTIALLY UNUSED)
*   `.btn-profile-follow.following-state:hover` (POTENTIALLY UNUSED)
*   `.comment-item-author-role.student` (POTENTIALLY UNUSED)
*   `.cta-content` (POTENTIALLY UNUSED)
*   `.cta-content .btn-group` (POTENTIALLY UNUSED)
*   `.cta-content h2` (POTENTIALLY UNUSED)
*   `.cta-content p` (POTENTIALLY UNUSED)
*   `.cta-wrapper` (POTENTIALLY UNUSED)
*   `.cta-wrapper::after` (POTENTIALLY UNUSED)
*   `.dash-stat-value` (POTENTIALLY UNUSED)
*   `.dash-view-panel` (POTENTIALLY UNUSED)
*   `.dash-view-panel.active` (POTENTIALLY UNUSED)
*   `.feature-card` (POTENTIALLY UNUSED)
*   `.feature-card h3` (POTENTIALLY UNUSED)
*   `.feature-card p` (POTENTIALLY UNUSED)
*   `.feature-card::before` (POTENTIALLY UNUSED)
*   `.feature-card:hover` (POTENTIALLY UNUSED)
*   `.feature-card:hover .feature-icon` (POTENTIALLY UNUSED)
*   `.feature-card:hover::before` (POTENTIALLY UNUSED)
*   `.feature-icon` (POTENTIALLY UNUSED)
*   `.features-grid` (POTENTIALLY UNUSED)
*   `.feed-badge.official-school-badge` (POTENTIALLY UNUSED)
*   `.feed-filter-btn` (POTENTIALLY UNUSED)
*   `.feed-filter-btn.active` (POTENTIALLY UNUSED)
*   `.feed-filter-btn:hover` (POTENTIALLY UNUSED)
*   `.feed-filter-toggle` (POTENTIALLY UNUSED)
*   `.floating-card` (POTENTIALLY UNUSED)
*   `.floating-card-1` (POTENTIALLY UNUSED)
*   `.floating-card-2` (POTENTIALLY UNUSED)
*   `.floating-icon` (POTENTIALLY UNUSED)
*   `.floating-icon.blue` (POTENTIALLY UNUSED)
*   `.floating-icon.teal` (POTENTIALLY UNUSED)
*   `.floating-text h4` (POTENTIALLY UNUSED)
*   `.floating-text p` (POTENTIALLY UNUSED)
*   `.guest-actions` (POTENTIALLY UNUSED)
*   `.guest-actions .btn-block` (POTENTIALLY UNUSED)
*   `.guest-card-content` (POTENTIALLY UNUSED)
*   `.guest-card-content h3` (POTENTIALLY UNUSED)
*   `.guest-card-content p` (POTENTIALLY UNUSED)
*   *...and 696 more selectors.*

---

## Safe CSS Selectors Retained (Due to dynamic usage uncertainty)

The following selectors have been retained in `style.css` because their usage status is uncertain (e.g. dynamic state changes or complex parent/child rules):

*   `#connect-profile-btn` (RETAINED)
*   `#edit-profile-form` (RETAINED)
*   `#follow-profile-btn` (RETAINED)
*   `#message-profile-btn` (RETAINED)
*   `#section-achievements-card` (RETAINED)
*   `#section-bio-card` (RETAINED)
*   `#section-certificates-card` (RETAINED)
*   `#section-skills-card` (RETAINED)
*   `#section-sports-card` (RETAINED)
*   `#share-post-modal .modal-content` (RETAINED)
*   `#share-profile-btn` (RETAINED)
*   `#sidebar-cta-card` (RETAINED)
*   `*/

.me-dropdown-avatar` (RETAINED)
*   `.action-icon` (RETAINED)
*   `.action-svg-icon` (RETAINED)
*   `.activity-timeline-empty` (RETAINED)
*   `.activity-timeline-empty .empty-section-msg` (RETAINED)
*   `.animate-pulse` (RETAINED)
*   `.auth-feature-item h4` (RETAINED)
*   `.auth-feature-item p` (RETAINED)
*   `.auth-form .form-group` (RETAINED)
*   `.auth-form .input-icon-wrapper input,
  .auth-form .input-icon-wrapper select` (RETAINED)
*   `.auth-form label` (RETAINED)
*   `.auth-loading-overlay` (RETAINED)
*   `.auth-loading-overlay.fade-out` (RETAINED)
*   `.auth-loading-spinner` (RETAINED)
*   `.auth-loading-text` (RETAINED)
*   `.auth-mobile-logo` (RETAINED)
*   `.auth-mobile-logo .logo-dot` (RETAINED)
*   `.auth-mobile-tagline` (RETAINED)
*   *...and 514 more selectors.*

