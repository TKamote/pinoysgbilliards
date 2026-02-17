# Tournament & Overlay Platform — Product & Architecture Spec

> **Status:** On hold. This spec will be revisited and updated once revisions to the current app are complete. Use it as reference when starting the new platform.

---

A web platform for managing billiards tournaments, players, and **broadcast overlays**. Multiple users can use the site at once; each overlay is independent so one user’s changes do not affect another’s session, except where they share data (e.g. player profiles).

---

## 1. Purpose & audience

- **Organizers / managers:** Manage players, run brackets (e.g. invitational formats), control tour branding.
- **Stream operators / multiple users:** Open different overlay tabs (e.g. Live Match, PBS Tour, Ring Games). Each person can run their own overlay without interfering with others.
- **Viewers:** See overlays in OBS or on stream; data is driven by the open overlay tab.

Overlays are used in different contexts (different shows, events, or devices). The system must keep **per-overlay state** and **per-overlay “live”** so that:
- User A can run “PBS Tour” overlay while User B runs “Live Match” overlay.
- Changing scores or going live in one overlay does not affect the other.

---

## 2. Overlay independence (critical)

### 2.1 What must be independent

- **Live state:** Each overlay has its own “Go Live” and game mode. One overlay going live must not force another to go live or change its game mode.
- **Match state:** Each overlay reads/writes its own match document (or match id). No shared in-memory match state across overlays.
- **UI state:** Score inputs, selected players, and winner flows are local to the open overlay tab. Refreshing or closing one tab does not affect others.

Implementation approach:
- **Keyed live state:** Store live flag and game mode by overlay id (e.g. `liveState[overlayId]`). Each overlay page uses only its own id.
- **Match documents:** Each overlay type (or instance) uses a distinct Firestore path or document id for “current match” so two overlays never write to the same document.
- **No global “current match”:** Avoid a single global current match that all overlays share.

### 2.2 Shared data and rules

**Players** are shared across the app: overlays select from the same player list, and the Players page edits the same profiles.

- **Rule:** Do not change a player’s profile (name, photo, etc.) while that player is selected in an active overlay. Otherwise the overlay can show stale or inconsistent data until it refreshes.
- **Practice:** Either:
  - Show a warning when editing a player who is currently selected in any overlay, or
  - Document that editing a player updates everywhere once overlays refresh or re-fetch.
- **Reads:** Overlays and Players page read from the same Firestore `players` collection. Real-time listeners will see updates; avoid editing a player in use if you want to avoid mid-stream changes.

**Invitational brackets** use their own match documents per format (e.g. 8 Double, 8 Single). Those are independent per format; changing one format does not affect another.

---

## 3. Core features

- **Home:** Entry point; list of overlay links and any other main actions. Access to overlays can be gated by role or login if required.
- **Players:** List and edit player profiles (photo, name, contact, etc.). Shared data; respect the “do not edit while in use” rule above.
- **Overlays:** Each overlay is a separate tab/route. Types include:
  - Two-player match (e.g. Live Match, PBS Tour, PBS Live, Pinoy Sargo, Arys).
  - Three-player / ring games.
  - Tour Manager (e.g. two replaceable logos + same two-player match logic).
- **Invitational:** Bracket management with multiple formats (e.g. 8 Double, 8 Single, 4 Double, 4 Single). Each format has its own tab and its own match data.
- **Auth:** Login/logout; optional roles (e.g. manager) for Tour Manager or sensitive actions.

---

## 4. Architecture (new platform)

### 4.1 Single main navigation

- One top bar: logo, main links (Home, Players, Invitational, and optionally Tour Manager for managers), and login/logout.
- No duplicate top navs. Pages that need sub-navigation (e.g. Invitational) use a **local tab bar** on the page (e.g. 8 Double, 8 Single, 4 Double, 4 Single).

### 4.2 Overlay engine (shared, not duplicated)

- **One hook** (e.g. `useOverlayMatch(matchId, liveKey)`):
  - Binds to a specific match document and overlay id.
  - Handles load/save of scores, race-to, turn, winner; optional keyboard shortcuts.
  - Uses keyed live state for “Go Live” and game mode for that overlay only.
- **Shared UI component** (e.g. two-player overlay layout):
  - Consumes the hook and renders scoreboard, player slots, and controls.
  - Accepts variant props (e.g. two logos for Tour Manager, or “team” labels for Live Match).
- **Per-overlay routes:** Each overlay is a thin page that picks `matchId` and `liveKey`, passes variant props, and renders the shared component. Adding a new overlay = new route + config, no new context fields or duplicated logic.

### 4.3 Keyed live state

- Store state by overlay id: e.g. `Record<overlayId, { isLive: boolean; gameMode: GameMode }>`.
- API: e.g. `useLiveOverlay(overlayId)` returns `{ isLive, setLive, gameMode, setGameMode }` for that id only.
- New overlays get a new id; no changes to a central context type.

### 4.4 Data and types

- **Shared types:** Player, Match, and any common shapes in a single place (e.g. `types/` or `lib/types.ts`).
- **Firestore:** Central path/config (e.g. `lib/firestore-paths.ts`) for collections and document ids. Overlays use distinct document ids so they do not clash.
- **Hooks:** `usePlayers()` for the shared list; `useMatchDoc(matchId)` or the overlay hook for match data. Avoid duplicating Firestore logic in every page.

### 4.5 Invitational

- **Config per format:** Match ids, advancement rules, and round labels per format (e.g. 8 Double, 8 Single, 4 Double, 4 Single) in separate modules or one config file with per-format exports.
- **Shared bracket UI:** One component that takes config (matches, round labels, advancement) and renders the bracket. Each format tab supplies its config.
- Keeps the Invitational page maintainable and keeps format data independent.

### 4.6 Permissions

- Single place for permission checks (e.g. “can access Tour Manager”, “can edit players”). Use it from layout and pages so role changes don’t require scattered edits.

---

## 5. Enhancements

- **Overlay independence:** Keyed live state and per-overlay match documents so multiple users and tabs can run different overlays safely.
- **Shared overlay engine:** One hook + one (or a few) layout components for overlays to avoid duplicated logic and large per-route files.
- **Shared data rules:** Document and optionally enforce “do not edit a player while they are in use in an overlay” to avoid confusing or inconsistent updates.
- **Clear nav model:** One main nav; page-level tabs only where needed (e.g. Invitational).
- **Config-driven overlays:** New overlay = new route + config (match id, overlay id, variant props); no new context or global state.
- **Config-driven Invitational:** New format = new config + tab; shared bracket component.
- **Centralized types and Firestore paths:** Easier to evolve and keep overlays and Players in sync with the same data shape.

---

## 6. Tech outline

- **Framework:** Next.js (App Router).
- **Data:** Firestore for players, match documents, and any config (e.g. tour manager logos).
- **Auth:** Firebase Auth; optional role or custom claims for manager-only features.
- **State:** Keyed live state (by overlay id); overlay-specific match state via hook + Firestore.

---

## 7. Summary

- **Multiple users:** Supported; each overlay tab is independent.
- **Overlay isolation:** Per-overlay live state and match documents; no cross-overlay side effects.
- **Shared data:** Players are shared; avoid editing a player while they are in use in another overlay (or document the behavior and allow it with refresh).
- **Structure:** One main nav, shared overlay engine, keyed live state, shared types and Firestore paths, config-driven overlays and Invitational formats.

This spec is intended to guide implementation of the new platform from scratch, with no dependency on any existing codebase.
