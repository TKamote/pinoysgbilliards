# Standalone App: Players + Ring + Pinoy Sargo (3 Tabs)

This guide describes how to create a **separate website** with **3 tabs**: **Players**, **Ring** (overlay), and **Pinoy Sargo** (overlay). It uses the same overlay scheme and authentication as the main Pinoy SG Billiards app so you can control and view overlays from **any device** (phone, tablet, laptop) via a single URL. Both overlays support **game mode**: 9-ball, 10-ball, or 15-ball.

---

## 1. Goals of the New App

- **Three tabs:** Players | Ring | Pinoy Sargo (Ring and Pinoy Sargo are OBS-ready overlays).
- **Same overlay behaviour:** Ring and Pinoy Sargo each have GO LIVE, **increment/decrement player scores**, **increment/decrement Race To X**, **ball tracking (9/10-ball) with pocketed balls disappearing from the strip**, **“your turn” arrow (or highlight)** showing whose turn it is, player selection, and winner modal.
- **Game mode:** Manager can switch between **9-ball**, **10-ball**, and **15-ball** (per overlay). Stored in Firestore; 9-ball shows balls 1–9, 10-ball shows 1–10, 15-ball shows no ball icons.
- **Authentication:** Only logged-in managers can add/edit players and control overlays (scores, player selection, Race To, game mode). Viewing overlays (e.g. in OBS or on another device) works without login (read-only).
- **Access from any device:** Deploy as a web app (e.g. Vercel); open the URL on any device to manage players or run either overlay.

---

## 2. Tech Stack (Same as Current App)

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Firebase
  - **Authentication:** Email/password (for managers)
  - **Firestore:** `players` collection + `current_match` collection (one document for the overlay state)
- **State:** React Context (Auth + Live)

---

## 3. Firebase: Same Project vs New Project

**Option A – Same Firebase project (recommended for shared data)**  
- Use the **same** Firebase project as the main app.  
- Same `players`; for overlays use same docs: `current_match/live_generic` (Ring) and `current_match/pbs-tour-2` (Pinoy Sargo), or new docs like `current_match/ring-standalone` and `current_match/pinoy-sargo-standalone` if you want this app’s overlays independent.  
- Any device opening this new app’s URL will read/write the same data (same roster, same overlay state if you use the same docs).

**Option B – New Firebase project**  
- Create a new project in Firebase Console.  
- New `players` and new `current_match` documents (one per overlay).  
- Data is independent from the main app; you’ll need to add players again or migrate.

**For “access from any device”:** In both cases, you deploy this new app to a URL (e.g. `pinoy-sargo-app.vercel.app`). Anyone with the link can open it; managers log in to control, others can view.

---

## 4. Firestore Collections and Rules

**Collections:**

| Collection       | Purpose |
|------------------|--------|
| `players`        | Player list (name, photoURL, points, etc.). Used by Players tab and by Ring + Pinoy Sargo for player selection. |
| `current_match`   | One document **per overlay**. Recommended: `live_generic` (Ring) and `pbs-tour-2` (Pinoy Sargo). Each doc stores: player1Id, player2Id, **player1Name**, **player2Name**, **player1PhotoURL**, **player2PhotoURL** (for display when players collection not yet loaded), **player1Score**, **player2Score** (increment/decrement; do not allow negative), **currentTurn** (player1 | player2 | null; persist and **restore on load**), **pocketedBalls** (array of ball numbers pocketed), **gameMode**, **raceTo** (1–50), updatedAt. |

**Rules (same pattern as main app):**

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{playerId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /current_match/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

- **Read:** Public (so overlay and player list can be viewed from any device without login).  
- **Write:** Only authenticated users (managers).

---

## 5. Authentication

- **Method:** Firebase Auth, Email/Password.
- **Who is “manager”:** Any authenticated user (same as current app). You can later restrict by email or custom claims if needed.
- **Usage:**
  - **Players tab:** Add / Edit / Delete only if `isManager`; list and search work for everyone.
  - **Ring & Pinoy Sargo tabs:** Select players, change scores, Race To, **game mode (9/10/15-ball)**, GO LIVE, reset, etc. only if `isManager`; overlay view (scores, names, balls) is read-only for non-managers.
- **Login UI:** A “Manager Login” modal (email + password). Show it when a non-manager tries to add/edit a player or control the overlay (or show a login button in the nav for managers).
- **Implementation:** Copy `AuthContext` and `LoginModal` from the main app; wrap the app in `AuthProvider`.

---

## 6. “Live” Overlay Behaviour (Ring & Pinoy Sargo)

- **GO LIVE button:** On each overlay page, toggles “live” mode. When live, the **navigation bar is hidden** so the overlay is clean for OBS or full-screen on any device.
- **State:** Two overlay contexts: Ring (`ringIsLive`, `ringGameMode`) and Pinoy Sargo (`pinoySargoIsLive`, `pinoySargoGameMode`). Implement a minimal `LiveContext` with these four (or reuse names like `isLive`/`gameMode` for Ring and `pbsTour2IsLive`/`pbsTour2GameMode` for Pinoy Sargo).
- **Game mode (9 / 10 / 15-ball):** Each overlay has its own game mode. Stored in Firestore as `gameMode: "9-ball" | "10-ball" | "15-ball"`. Manager changes it via a **Game Mode** dropdown in the nav when on that overlay’s tab (or on the page). **9-ball:** show ball icons 1–9; **10-ball:** 1–10; **15-ball:** no ball icons (only scores / Race To).
- **Persistence:** Overlay state (players, names, photoURLs, scores, raceTo, **currentTurn**, pocketedBalls, **gameMode**) is stored in Firestore so that refreshing or opening on another device shows the same state. **Restore currentTurn** (and all other fields) when loading the match doc.
- **Loading state:** Show a loading state until match data (and players) are loaded from Firestore; then render the overlay and enable saves. Avoid triggering winner detection or writing until loading is false.
- **Transparent background:** Use a transparent background (e.g. `bg-transparent`) on the overlay container so OBS can composite it over video.
- **Player selection when not live:** Allow manager to select players (click name/photo) only when **not** live; when GO LIVE is on, disable player selection so the overlay does not change during broadcast.

---

## 7. Project Structure (Suggested)

```text
src/
├── app/
│   ├── layout.tsx          # AuthProvider, LiveProvider, Navigation, main
│   ├── page.tsx            # Redirect to /players, /ring, or /pinoy-sargo
│   ├── players/
│   │   └── page.tsx        # Players tab (list, search, add/edit, 150 in 3 columns)
│   ├── ring/
│   │   └── page.tsx        # Ring overlay page (Firestore: current_match/live_generic)
│   └── pinoy-sargo/        # or pbs-tour-2
│       └── page.tsx        # Pinoy Sargo overlay page (Firestore: current_match/pbs-tour-2)
├── components/
│   ├── Navigation.tsx      # 3 links: Players | Ring | Pinoy Sargo; hide when Ring or Pinoy Sargo is live; Game Mode dropdown when on Ring or Pinoy Sargo; login/logout
│   ├── LoginModal.tsx      # Email/password login
│   ├── PlayerSelectionModal.tsx
│   └── WinnerModal.tsx
├── contexts/
│   ├── AuthContext.tsx     # user, signIn, signOut, isManager
│   └── LiveContext.tsx     # ringIsLive, ringGameMode, pinoySargoIsLive, pinoySargoGameMode (or isLive/gameMode for Ring, pbsTour2IsLive/pbsTour2GameMode for Pinoy Sargo)
└── lib/
    └── firebase.ts         # init app, auth, firestore
```

---

## 8. Players Tab (Summary)

- **Data:** `collection(db, "players")`; sort by points descending.
- **Display:** Up to 150 players in 3 columns (50 per column); search by name; scrollable columns.
- **Actions (manager only):** Add player, Edit player (click row), Delete (in edit modal). **Duplicate name check** when adding or editing (warn if name already exists). Non-managers see list and search only; show login prompt or login button when they try to add/edit.
- **Fields (minimal):** name, points, skillLevel, photoURL (optional). Same `Player` interface as main app if you copy from there (email, phone, rating, etc. can be optional or defaulted).

---

## 9. Ring Tab (Overlay) – What to Implement

Copy behaviour from the main app’s **Ring** page (`src/app/ring/page.tsx`). Ring uses Firestore document **`current_match/live_generic`** (same as main app if you share data).

- **GO LIVE button:** Toggles live; when true, hide nav (e.g. `ringIsLive` in LiveContext).
- **Game mode:** 9-ball, 10-ball, 15-ball. Store in Firestore as `gameMode`; restore on load. Show **Game Mode** dropdown in the nav when the user is on the Ring tab (manager only). 9-ball → balls 1–9; 10-ball → 1–10; 15-ball → no ball icons.
- **Player ribbon (bottom):** Same layout as Pinoy Sargo: Photo | Name | Score (P1), Score | Name | Photo (P2). **70% width** on desktop (md+), full width on mobile. Ribbon colour can be red (e.g. red-700 / red-800) or indigo; same player selection from `players` collection (PlayerSelectionModal). Player selection only when **not** live.
- **“Your turn” arrow (or highlight):** Show whose turn it is—e.g. an arrow or a visual highlight (scale/glow) on the active player’s side (left = P1, right = P2). Driven by **currentTurn** (player1 | player2 | null). Persist `currentTurn` in Firestore; restore on load. Manager can cycle turn with Z (P1’s turn), X (no turn), C (P2’s turn), or Tab. When reset (double-press R), clear turn to null.
- **Player score increment/decrement:** P1 and P2 scores can be **incremented** (+1) and **decremented** (-1). Expose via on-screen +/- or keyboard (Q/A for P1, E/D for P2). **Scores must not go negative** (clamp at 0). Persist to Firestore on each change.
- **Race To X increment/decrement:** “Race to X” value is editable: **increment/decrement** via +/- keyboard keys, and by **clicking** the “Race X” label to show an inline number input (range **1–50**); Enter to save, Escape to cancel. Persist `raceTo` in Firestore when changed.
- **Ball icons & disappearance when pocketed:** Driven by `ringGameMode`: show balls 1–9 (9-ball) or 1–10 (10-ball). Manager can **click a ball icon** or use **number keys (1–9, 0=10)** to toggle pocketed. When pocketed, the ball **disappears** from the strip (or shows with reduced opacity). Store in `pocketedBalls` in Firestore. 15-ball mode shows no ball icons.
- **Reset behaviour:** **Double-press R:** reset **scores and turn** (not pocketed balls). **Delete/Backspace:** if winner modal is open → close modal and full reset (scores, turn, pocketed balls); otherwise → reset **pocketed balls** only. Provide an on-screen **“Reset balls”** button (icon) to clear all pocketed balls.
- **Winner modal:** When a player reaches Race To, show a **Winner modal**: “WINNER” title, winner photo and name, **Final Score** (both players’ names and scores), and a **“Reset Match”** button. On close (or button click): reset scores, turn, and pocketed balls and **persist** to Firestore.
- **Keyboard shortcuts (manager):** Ignore shortcuts when focus is in an input (e.g. Race To inline edit). Q/A, E/D (scores), Z/X/C, Tab (turn), number keys 1–9 and 0 (ball 10), double-press R (scores + turn), Delete/Backspace (balls or full reset), +/- (raceTo).
- **Persistence:** All state (including **currentTurn**) read/write to `current_match/live_generic`; **restore currentTurn** (and all fields) when loading the match doc.

---

## 10. Pinoy Sargo Tab (Overlay) – What to Implement

Copy behaviour from the main app’s **PBS Tour 2 / Pinoy Sargo** page (`src/app/pbs-tour-2/page.tsx`), with Firestore document **`current_match/pbs-tour-2`** (or `pinoy-sargo`). Include:

- **Logo:** PinoySargo.png (top left).
- **GO LIVE button:** Toggles live; when true, hide nav (e.g. `pinoySargoIsLive` in LiveContext).
- **Game mode:** 9-ball, 10-ball, 15-ball. Store in Firestore as `gameMode`; restore on load. Show **Game Mode** dropdown in the nav when the user is on the Pinoy Sargo tab (manager only). 9-ball → balls 1–9; 10-ball → 1–10; 15-ball → no ball icons.
- **Player ribbon (bottom):**  
  - Layout: Photo | Name | Score (P1), Score | Name | Photo (P2).  
  - Dark indigo (e.g. indigo-900 / indigo-800).  
  - **Width:** 90% on desktop.  
  - **Photos:** 96px → 120px → 144px → 168px (responsive).  
  - **Name font:** ~20% smaller (e.g. 11px → 16px → 18px → 30px → 35px).  
  - Click name/photo to open PlayerSelectionModal (manager only); list from same `players` collection.
- **“Your turn” arrow (or highlight):** Show whose turn it is—e.g. an arrow or a visual highlight (scale/glow) on the active player’s side (left = P1, right = P2). Driven by **currentTurn** (player1 | player2 | null). Persist `currentTurn` in Firestore; restore on load. Manager can cycle with Z (P1’s turn), X (no turn), C (P2’s turn), or Tab. On reset (double-press R), set turn to null.
- **Player score increment/decrement:** P1 and P2 scores support **increment** (+1) and **decrement** (-1) via keyboard (Q/A, E/D) or on-screen controls. **Scores must not go negative** (clamp at 0). Persist to Firestore on each change.
- **Race To X increment/decrement:** “Race to X” is editable: **+/- keys** and **click** the “Race X” label to show inline input (range **1–50**); Enter to save, Escape to cancel. Persist `raceTo` in Firestore when updated.
- **Ball icons & disappearance when pocketed:** Driven by `pinoySargoGameMode`. Show ball icons 1–9 or 1–10. Manager **clicks ball icon** or uses **number keys (1–9, 0=10)** to toggle pocketed; when pocketed, ball **disappears** (or shows with reduced opacity). Store in `pocketedBalls` in Firestore. 15-ball: no ball icons.
- **Reset behaviour:** **Double-press R:** reset **scores and turn** (not balls). **Delete/Backspace:** if winner modal open → full reset (scores, turn, balls); else → reset **pocketed balls** only. On-screen **“Reset balls”** button (icon) to clear pocketed balls.
- **Center:** Race To (editable by manager; stored in Firestore).
- **Winner modal:** When a player reaches Race To, show **Winner modal**: “WINNER” title, winner photo and name, **Final Score** (both players’ names and scores), **“Reset Match”** button. On close: reset scores, turn, pocketed balls and persist to Firestore.
- **Keyboard shortcuts (manager):** Ignore shortcuts when focus is in an input (e.g. Race To inline edit). Q/A, E/D (scores), Z/X/C, Tab (turn), number keys 1–9 and 0 (ball toggle), double-press R (scores + turn), Delete/Backspace (balls or full reset when winner modal open), +/- (raceTo).
- **Persistence:** All state (including **currentTurn**) read/write to one `current_match` doc; **restore currentTurn** and all other fields when loading so any device sees the same overlay.

Use the **same** Firestore document path as the main app if you want the standalone app to drive the same overlay (e.g. `current_match/pbs-tour-2`). Use a **different** document name if you want a separate overlay for this app only.

---

## 11. Navigation (3 Tabs + Game Mode)

- **Links:** “Players” → `/players`, “Ring” → `/ring`, “Pinoy Sargo” → `/pinoy-sargo` (or `/pbs-tour-2`).
- **When Ring or Pinoy Sargo is live:** Hide the entire nav so the overlay is full-screen/OBS-ready (check both `ringIsLive` and `pinoySargoIsLive`).
- **Game Mode selector:** When the manager is on the Ring tab, show a dropdown “Game Mode: 9-ball | 10-ball | 15-ball” that updates `ringGameMode` and persist to `current_match/live_generic`. When on the Pinoy Sargo tab, show the same for `pinoySargoGameMode` and persist to `current_match/pbs-tour-2`. Only visible to managers.
- **Auth:** Show “Login” when not authenticated and “Logout” (and maybe username) when authenticated. Optionally show a login button that opens LoginModal.

---

## 12. Access from Any Device

- **Deploy** the app (e.g. Vercel, Netlify) and get a public URL.
- **Viewers:** Open URL on any device to see the overlay (read-only from Firestore); no login required.
- **Managers:** Open same URL on any device, log in, then use Players tab (add/edit), Ring tab (scores, players, Race To, game mode, GO LIVE), and Pinoy Sargo tab (same). Changes sync via Firestore so OBS or another tab/device sees updates immediately.
- **OBS:** Add a Browser Source with the Ring or Pinoy Sargo tab URL; when “GO LIVE” is on, nav is hidden and the overlay is clean.

---

## 13. Environment / Config

- **Firebase:** Put Firebase config (apiKey, authDomain, projectId, etc.) in environment variables (e.g. `NEXT_PUBLIC_FIREBASE_*`) or in `src/lib/firebase.ts` for a quick start. Prefer env vars in production.
- **Same project:** Use the same `firebaseConfig` as the main app if you want shared data.

---

## 14. Dependencies (package.json)

Same as main app (Next.js 14, React 18, Firebase, Tailwind, TypeScript):

```json
{
  "dependencies": {
    "firebase": "^12.5.0",
    "next": "^14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.18",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 15. Step-by-Step Build Checklist

1. Create a new Next.js 14 app (TypeScript, Tailwind, App Router).
2. Install Firebase and configure `src/lib/firebase.ts` (same project or new).
3. Add `AuthProvider` and `AuthContext` (copy from main app); add `LoginModal`.
4. Add `LiveContext` with **Ring** and **Pinoy Sargo** state: `ringIsLive`, `ringGameMode`, `pinoySargoIsLive`, `pinoySargoGameMode` (type `GameMode = "9-ball" | "10-ball" | "15-ball"`).
5. Implement **Navigation** with 3 items (Players, Ring, Pinoy Sargo); hide nav when `ringIsLive` or `pinoySargoIsLive` is true; add **Game Mode** dropdown when on Ring or Pinoy Sargo tab (manager only); add Login/Logout.
6. Implement **Players** page: fetch `players` from Firestore, 3 columns × 50, search; add/edit/delete (manager only); show login prompt or modal when non-manager tries to edit.
7. Implement **Ring** page: copy logic and UI from `ring/page.tsx`; Firestore doc `current_match/live_generic`; **load match doc on mount** and **restore** player1/2, scores, **currentTurn**, pocketedBalls, gameMode, raceTo (and player names/photoURLs for fallback); **loading state** until loaded; **transparent** overlay container; **“your turn”** arrow/highlight; **player score +/-** (no negative); **Race To** click-to-edit (1–50) + +/- keys; **pocketed balls** (click ball or number keys), **Reset balls** button, double-press R (scores + turn), Delete (balls or full reset); **Winner modal** (WINNER, photo, name, final score, “Reset Match”); player selection **only when not live**; persist **gameMode** and all state.
8. Implement **Pinoy Sargo** page: same as Ring (load/restore, loading state, transparent bg, currentTurn, score +/- , Race To 1–50, balls, Reset balls button, R/Delete, Winner modal, player selection when not live); Firestore doc `current_match/pbs-tour-2`; logo; 90% ribbon; persist **gameMode** and all state.
9. Copy **PlayerSelectionModal** and **WinnerModal** from main app.
10. Deploy Firestore rules (read: true, write: if request.auth != null for `players` and `current_match`).
11. Deploy the app (e.g. Vercel), test on multiple devices and with OBS (both Ring and Pinoy Sargo overlays, and game mode 9/10/15-ball).

---

## 16. Assets to Copy from Main App

- `public/PinoySargo.png` (logo for overlay).
- `public/avatar-placeholder-1.svg` … `avatar-placeholder-6.svg`, `avatar-placeholder-yellow.svg` (player placeholders).
- `public/ballicons/ball-1.png` … `ball-10.png` (if you use ball icons).
- Favicon if desired.

---

## 17. Reference Files (Current App)

When building the standalone app, use these as reference:

| What              | File / path |
|-------------------|-------------|
| Auth              | `src/contexts/AuthContext.tsx`, `src/components/LoginModal.tsx` |
| Live + GameMode   | `src/contexts/LiveContext.tsx` (keep Ring + Pinoy Sargo state and `GameMode` type) |
| Firebase          | `src/lib/firebase.ts` |
| Players page      | `src/app/players/page.tsx` |
| **Ring page**     | `src/app/ring/page.tsx` (Firestore: `current_match/live_generic`; 70% ribbon; game mode 9/10/15) |
| Pinoy Sargo page  | `src/app/pbs-tour-2/page.tsx` (Firestore: `current_match/pbs-tour-2`; 90% ribbon; game mode 9/10/15) |
| Navigation        | `src/components/Navigation.tsx` (reduce to 3 items: Players, Ring, Pinoy Sargo; add Game Mode dropdown per overlay tab) |
| Modals            | `src/components/PlayerSelectionModal.tsx`, `src/components/WinnerModal.tsx` (WinnerModal: isOpen, onClose, winner, getPlayerPlaceholder(playerId), player1Score, player2Score, player1Name, player2Name) |
| Layout            | `src/app/layout.tsx` |
| Firestore rules   | `firestore.rules` |

---

You can open this guide in any editor after closing the project and build the 3-tab (Players + Ring + Pinoy Sargo) app independently, with **game mode (9-ball / 10-ball / 15-ball)** on both overlays and the same overlay scheme and authentication for control and multi-device access.
