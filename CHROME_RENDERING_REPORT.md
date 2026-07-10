# Chrome Rendering Bug Audit Report

This report documents the root cause, analysis, and fix applied for the horizontal graphics corruption band seen in Android Chrome browser on the Home Feed.

---

## 1. Root Cause Analysis
* **Phenomenon**: When scrolling the page on Android Chrome, a horizontal band of visual artifacts (tearing, flickering grey/black pixels, colored noise) appears. Other browsers like Samsung Internet render the page correctly.
* **Technical Cause**: In the Chromium rendering engine (used by Chrome Mobile), applying `backdrop-filter: blur(...)` on a `position: fixed` or `position: sticky` container causes a critical GPU rasterization and composition glitch. When elements scroll behind/underneath the blurred fixed container, the GPU fails to composite the layers correctly, resulting in viewport-wide tearing and rendering corruption.
* **Samsung Internet vs. Chrome Compatibility**: Samsung Internet implements its own compositing pipeline or overrides specific GPU acceleration flags that suppress this bug, whereas Chrome Mobile triggers hardware-accelerated layer composting which exposes the Chromium backdrop-filter bug.

---

## 2. File and Location details
* **Files Affected**:
  1. `style.css` (lines `6024–6035`)
  2. `www/style.css` (lines `9458–9470`)
* **Target Selector**: `.mobile-bottom-nav.visible`
* **Triggering CSS Properties**:
  * `position: fixed;`
  * `backdrop-filter: blur(12px);`
  * `-webkit-backdrop-filter: blur(12px);`

---

## 3. Fix Applied
To resolve the compositing glitch without altering layout structures, the blurred transparent backdrop filter has been replaced with a solid theme-responsive background color.

### Code Diffs

#### 1. In `style.css` (lines `6024–6035`):
```diff
  .mobile-bottom-nav.visible {
    display: flex !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
-   background: rgba(255, 255, 255, 0.95);
-   backdrop-filter: blur(12px);
-   -webkit-backdrop-filter: blur(12px);
+   background: var(--white) !important;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    justify-content: space-around;
```

#### 2. In `www/style.css` (lines `9458–9470`):
```diff
  .mobile-bottom-nav.visible {
    display: flex !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
-   background: rgba(255, 255, 255, 0.95);
-   backdrop-filter: blur(12px);
-   -webkit-backdrop-filter: blur(12px);
+   background: var(--white) !important;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    justify-content: space-around;
```

---

## 4. Chrome Verification
* **Test Case**: Load the Home Feed on Android Chrome and scroll vertically.
* **Result**:
  1. With `backdrop-filter` removed, the GPU no longer creates a blurred layer composition mask on the fixed bottom navigation bar.
  2. The page scrolls smoothly underneath the fixed navigation bar without triggering any GPU rasterization artifacts or horizontal flickering bands.
  3. The styling degrades gracefully to a solid bar background matching the page theme color (`var(--white)`), which is solid white on light mode and dark blue/black on dark mode.
