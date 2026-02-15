# Invitational – Multi-format implementation plan

## 1. Overview

- **One Invitational page** with **4 bracket formats**.
- **Tabs** to switch: **8 Double** | **8 Single** | **4 Double** | **4 Single**.
- **URL reflects active tab** (e.g. `?tab=8-double`). Shared link opens that tab; refresh keeps the same tab.
- **Each format is independent (Option B):** own match IDs, layout, advancement, Firebase data. Reuse only: modal (score entry, winner confirm), player list, manager auth.

---

## 2. Tabs and URL

- Tab bar at top of Invitational (below or beside title).
- Labels: **8 Double** | **8 Single** | **4 Double** | **4 Single**.
- **URL:** `/invitational?tab=8-double` (or `8-single`, `4-double`, `4-single`).
  - On load: read `tab` from URL → set active tab (default `8-double` if missing/invalid).
  - On tab change: update URL so the link is shareable and refresh-safe.

---

## 3. Data (Option B – independent per format)

- **Match IDs per format:**
  - 8 Double: `8-de-m1` … `8-de-m15`
  - 8 Single: `8-se-m1` … `8-se-m7`
  - 4 Double: `4-de-m1` … `4-de-m6` (or m7 if bracket reset)
  - 4 Single: `4-se-m1` … `4-se-m3`
- **Firebase:** One `matches` collection. Each document id is format-specific (e.g. `8-de-m1`). No sharing between formats.
- **Load/save:** Active tab → load/save only that format’s matches. Switching tab → load that format’s matches.

---

## 4. Per-format specs

| Tab        | Matches | Structure |
|-----------|---------|-----------|
| **8 Double** | 15 | 7 WB + 6 LB + Grand Final + optional M15 (bracket reset). Current logic. |
| **8 Single** | 7  | 4 R1 + 2 semis + 1 final. Winner-only advancement. |
| **4 Double** | 6 or 7 | 2 WB R1 + 1 WB final + 1 LB R1 + 1 LB final + 1 GF + optional bracket reset. |
| **4 Single** | 3  | 2 semis + 1 final. Winner-only advancement. |

Each format has its own **advancement map** (winner → next match/slot; for double elim, loser → next match/slot and GF/reset rules).

---

## 5. Per-tab behaviour

- **Reset:** “Reset tournament” only resets the **current tab’s** bracket. Other tabs unchanged.
- **Champion:** Each tab has its own champion (or none). Champion derived only from that tab’s matches.
- **View results / progress modal:**
  - **Button:** Shown whenever the current tab has matches (or always). Not only when there is a champion.
  - **Content:** Receipt-style UI. Header; **Champion** (name + 🏆 if exists, else “Champion: TBD”); **all matchups** for this format with current scores and ✓ for completed. Audience can open anytime to see progress.

---

## 6. Reuse vs independent

- **Reused:** Tab bar + URL sync; single match modal (players, Race to X, scores, winner confirm, Save); player list; manager auth; “View results” modal layout (data is per-tab).
- **Independent per tab:** Match IDs, bracket layout, advancement map, init, champion logic. Change one format without affecting others.

---

## 7. Implementation order

1. **Phase 1 – Tabs + URL + 8 Double as first tab**  
   Tab bar; URL read/write; refactor current 8 Double to use `8-de-m1`…`8-de-m15`; “View results” available anytime (Champion: TBD when none).

2. **Phase 2 – 8 Single**  
   Match IDs, layout, advancement (winner only), init, load, save, champion, “View results”.

3. **Phase 3 – 4 Double**  
   Match IDs, layout, advancement (winner + loser, GF, reset), init, load, save, champion, “View results”.

4. **Phase 4 – 4 Single**  
   Match IDs, layout, advancement (winner only), init, load, save, champion, “View results”.

5. **Throughout**  
   Reset only current tab; winner modal can auto-open when champion is set; “View results” openable anytime.

---

## 8. Checklist

- [ ] Tabs: 8 Double | 8 Single | 4 Double | 4 Single
- [ ] URL: `?tab=8-double` (etc.); shareable and refresh-safe
- [ ] Option B: separate match IDs and data per format
- [ ] Separate reset per tab
- [ ] Separate champion per tab
- [ ] “View results” available anytime; shows progress + champion or “Champion: TBD”
- [ ] 8 Double refactored to `8-de-*` IDs and tab system
- [ ] 8 Single, 4 Double, 4 Single added with own layout and advancement
