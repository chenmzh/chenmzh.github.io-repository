# Two-Game Gaming Hall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish Iron Dawn beside Chroma Drop and make the Gaming Lab landing page expose both games as independent playable entries.

**Architecture:** Keep each game self-contained under its own stable path: `gaming/chroma-drop/` and `gaming/iron-dawn/`. The `gaming/index.html` page acts only as a catalog, so future games can be added without moving or overwriting existing game files.

**Tech Stack:** Static HTML5, CSS, JavaScript, Canvas/WebGL, GitHub Pages.

---

### Task 1: Add the Iron Dawn deployable

**Files:**
- Create: `gaming/iron-dawn/index.html`
- Create: `gaming/iron-dawn/css/style.css`
- Create: `gaming/iron-dawn/js/*.js`
- Create: `gaming/iron-dawn/assets/art/**/*.png`
- Create: `gaming/iron-dawn/favicon.svg`
- Create: `gaming/iron-dawn/manifest.webmanifest`

**Step 1:** Copy only the browser runtime files from the verified local Iron Dawn build.

**Step 2:** Check that every HTML, stylesheet, script, manifest, and art reference is relative to `gaming/iron-dawn/`.

**Step 3:** Serve the repository root locally and request `gaming/iron-dawn/` plus representative assets.

Expected: all requests return HTTP 200 and the game exposes `window.__IRON_DAWN__`.

### Task 2: Convert Gaming Lab to a two-game catalog

**Files:**
- Modify: `gaming/index.html`

**Step 1:** Replace the single-game layout with a responsive two-card grid.

**Step 2:** Keep the existing Chroma Drop URL stable at `./chroma-drop/`.

**Step 3:** Add Iron Dawn at `./iron-dawn/`, with a distinct title, genre, description, and accent color.

**Step 4:** Verify both links resolve uniquely and neither game directory was modified by the other.

Expected: the hall shows two visually distinct entries and each opens its own game.

### Task 3: Validate and publish

**Files:**
- Test: `gaming/iron-dawn/tests/*.test.js` in the source build before packaging
- Test: deployed HTML, JS, CSS, manifest, and representative PNG URLs

**Step 1:** Run `node --test tests/*.test.js` in the Iron Dawn source directory.

Expected: 102 tests pass.

**Step 2:** Commit the scoped `gaming/iron-dawn/`, `gaming/index.html`, and this plan.

**Step 3:** Push the feature branch, open and merge a pull request into `master`.

**Step 4:** Wait for GitHub Pages and verify the hall and both games in a real browser.

Expected: all three public URLs return HTTP 200; both game loops start without console errors.
