# Tour Manager — Add-Back Guide

Use this after you’ve restored the working nav-hide behavior in OBS. Add Tour Manager back in small steps and verify (including “nav hides in OBS”) at each step.

---

## Current state (updated)

- **Nav-hide:** Fixed. GO LIVE button **per page** hides the nav only on that page; other pages are unaffected. Root layout uses `LayoutWithNav` only (no `LayoutSwitch`). No route-based hiding.
- **Home overlay list:** Live Match, PBS Live, PBS Tour, Pinoy Sargo, Ring Games, Arys. Manager sees all; non-manager sees Pinoy Sargo + Arys only. **Tour Manager is not in the list.**
- **Tour Manager page:** `src/app/tour-manager/page.tsx` does **not** exist. `src/app/overlay/tour-manager/page.tsx` exists and imports from it, so `/overlay/tour-manager` would break until the main page exists.
- **LiveContext:** Has no `tourManagerIsLive`. So for Tour Manager to hide the nav when its GO LIVE is pressed, we need to add it and wire it in `LayoutWithNav`.

---

## Will reverting code affect Firestore?

**No.** Reverting or resetting your git repo only changes code on your machine. It does **not** change anything in Firebase/Firestore. All of this stays as-is:

- **`config/tour-manager`** — logos (logo1URL, logo2URL), tourManagerIsLive
- **`current_match/tour-manager`** — match state (players, scores, raceTo, etc.)
- **`matches`** — 4-de-m1 … 4-de-m7 (4 Double bracket) and any other match docs

When you re-add the Tour Manager feature later, the app will read the same Firestore data. You don’t lose any Firestore work by reverting code.

---

## What the Tour Manager feature is

- **Tab:** “Tour Manager” in the main nav (and on Home), visible to managers only.
- **Page `/tour-manager`:** Setup view with nav — pick players, replace logos, set race-to, use GO LIVE.
- **Overlay (no nav):** Same UI but with **no nav bar** for OBS or when “live” — so the stream only sees the overlay (logos, GO LIVE pill, score bar, 4 Double bracket in top-right).
- **4 Double bracket:** Top-right panel on Tour Manager showing 4 Double matches in play order (WB R1 → … → Grand Final, Bracket Reset), no M1/M2 labels; reads from Firestore `matches` (4-de-*).
- **Invitational:** “Update Tour Manager” button on Invitational 4 Double tab — pushes Grand Final (4-de-m6) to `current_match/tour-manager` so the overlay shows that match.

---

## What was built (for reference when re-adding)

### New files (you can re-create or copy from a branch)

- **`src/app/tour-manager/page.tsx`** — Main Tour Manager page (logos, GO LIVE, score bar, balls, 4 Double bracket panel, winner modal, player selection).
- **`src/app/overlay/tour-manager/page.tsx`** — Same UI at `/overlay/tour-manager` (exists now; imports main Tour Manager page). With current nav-hide (GO LIVE per page), we don’t rely on this route for “no nav”; GO LIVE on `/tour-manager` hides the nav.
- **`src/components/LayoutSwitch.tsx`** — Exists but is **not** used in the root layout anymore. Layout uses `LayoutWithNav` only; nav hides only when a page’s GO LIVE is on.

### Modified files (when adding back)

- **`src/app/layout.tsx`** — Stays as `LayoutWithNav` (no LayoutSwitch).
- **`src/components/LayoutWithNav.tsx`** — Add `(pathname === "/tour-manager" && tourManagerIsLive)` to the per-page “hide nav” condition. Optional: Tour Manager nav item in the bar when `isManager` (or rely on Home link only).
- **`src/contexts/LiveContext.tsx`** — Add `tourManagerIsLive` / `setTourManagerIsLive` (and optionally game mode for Tour Manager) so the page can toggle live and the layout can hide the nav on that page only.
- **`src/app/home/page.tsx`** — Tour Manager link in overlay list (for managers).
- **`src/app/invitational/page.tsx`** — “Update Tour Manager” button (4 Double only), `handleUpdateTourManager`, constants `TOUR_MANAGER_MATCH_ID`, `FOUR_DOUBLE_GRAND_FINAL_ID`.

### Firestore (unchanged by revert)

- **`config/tour-manager`** — logo1URL, logo2URL, tourManagerIsLive.
- **`current_match/tour-manager`** — player1Id, player2Id, names, photoURLs, scores, raceTo, currentTurn, pocketedBalls, gameMode, updatedAt.
- **`matches`** — 4-de-m1 … 4-de-m7 (and other formats). Invitational “Update Tour Manager” writes Grand Final into `current_match/tour-manager`.

---

## Plan: Add Tour Manager tab in the Home tab

**Goal:** Show a “Tour Manager” entry in the Home page overlay list (like Live Match, PBS Live, etc.) so you can open Tour Manager from Home. Manager-only. GO LIVE on that page should hide the nav for that page only (same behavior as other overlays).

**Current gap:** The main Tour Manager page (`src/app/tour-manager/page.tsx`) is missing. The overlay route `/overlay/tour-manager` exists but imports that page, so it would error until the page exists. So we have two paths:

- **Path A — Only add the link (page already exists elsewhere):** If you have the Tour Manager page in another branch or can restore it from git history first, then the only change is: add “Tour Manager” to the Home overlay list, manager-only, linking to `/tour-manager`. Optionally wire `tourManagerIsLive` in LiveContext + LayoutWithNav so GO LIVE on that page hides the nav.
- **Path B — Restore page then add link:** (1) Restore or create `src/app/tour-manager/page.tsx` (from history or the add-back steps below). (2) Add `tourManagerIsLive` / `setTourManagerIsLive` to LiveContext. (3) In LayoutWithNav, add `(pathname === "/tour-manager" && tourManagerIsLive)` to the per-page “hide nav” condition so Tour Manager’s GO LIVE hides the nav on that page only. (4) Add “Tour Manager” to the Home overlay list (manager-only), e.g. in `allOverlayLinks` in `src/app/home/page.tsx`. Non-managers already don’t see `allOverlayLinks`; they see `userOverlayLinks`, so Tour Manager would only show for managers.

**Recommendation:** Use Path B so the link works and Tour Manager behaves like other overlays (nav visible until GO LIVE on that page). Order: restore/create the Tour Manager page → add LiveContext + LayoutWithNav wiring for `tourManagerIsLive` → add “Tour Manager” to the Home overlay list (manager-only). No coding until you say go.

---

## Why nav-hide failed before

We tried:

1. **URL param `?overlay=1`** — Layout hides nav when `pathname === "/tour-manager" && searchParams.get("overlay") === "1"`. In your environment the nav did not hide (layout may not have re-rendered when only query changed, or something else).
2. **Custom event** — Tour Manager dispatched an event; layout listened and set “hide nav”. Still did not hide.
3. **Route-based fix** — New route `/overlay/tour-manager` and `LayoutSwitch` so that for `/overlay/*` we don’t render `LayoutWithNav` at all. Nav still did not hide in your setup.

So the issue may be environment-specific (Next version, OBS browser source, caching, or something else). When you add back, **first** get a minimal “overlay route with no nav” working (e.g. a single route under `/overlay/` and LayoutSwitch), confirm in browser and OBS that the nav is gone, then add Tour Manager UI and GO LIVE.

---

## Suggested order when adding back (aligned with current nav-hide)

Nav-hide is now **GO LIVE per page** (no LayoutSwitch). So Tour Manager should follow the same pattern: nav visible by default; when you click GO LIVE on Tour Manager, nav hides on that page only.

1. **Restore or create the Tour Manager page**  
   - Add `src/app/tour-manager/page.tsx` (full UI: logos, GO LIVE, score bar, 4 Double bracket panel, etc.). Restore from a commit that had it, or re-create from the “What was built” section.  
   - Confirm `/tour-manager` loads with nav visible.
2. **Wire Tour Manager GO LIVE to nav-hide (per-page)**  
   - Add `tourManagerIsLive` / `setTourManagerIsLive` to `LiveContext.tsx`.  
   - In `LayoutWithNav.tsx`, add `(pathname === "/tour-manager" && tourManagerIsLive)` to the “hide nav” condition so only that page hides the nav when its GO LIVE is on.  
   - On the Tour Manager page, GO LIVE button toggles `setTourManagerIsLive`.  
   - Confirm: on `/tour-manager`, nav shows until you click GO LIVE; then it hides; click again to show nav.
3. **Add Tour Manager to the Home overlay list**  
   - In `src/app/home/page.tsx`, add `{ name: "Tour Manager", href: "/tour-manager" }` to `allOverlayLinks` (or a manager-only list). Non-managers use `userOverlayLinks`, so they won’t see it.  
   - Confirm: as a manager, Home shows “Tour Manager”; clicking it goes to `/tour-manager`.
4. **Optional:** Keep `/overlay/tour-manager` as an alias that renders the same page (already exists; just ensure `src/app/tour-manager/page.tsx` exists so the import works). No need to use it for nav-hide anymore; GO LIVE on `/tour-manager` already hides the nav.
5. **Add 4 Double bracket panel, logos, Invitational “Update Tour Manager”** as needed, testing after each step.

---

## Commit to revert to (no Tour Manager)

- **`c536518`** — “added other match format” (last commit before Tour Manager was introduced).

Revert/reset to that commit to get back the app without the Tour Manager tab. Firestore data is unaffected.
