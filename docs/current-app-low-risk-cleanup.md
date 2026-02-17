# Low-Risk Cleanups (Current App)

Items below have **very low risk** to delete or refactor. Apply only after you are satisfied no external links or workflows depend on them.

---

## Safe to delete

### 1. `src/components/Navigation.tsx` — **Done**
- **Reason:** Dead code. Not imported anywhere; root layout uses `LayoutWithNav` only.
- **Risk:** None. Deleting the file cannot affect runtime behavior.
- **Action:** File removed.

---

## Low risk (verify first)

### 2. Redirect-only routes
These pages only redirect to another URL. Removing them will break anyone who has bookmarked or linked the old path.

| Route        | Redirects to   | Risk if deleted |
|-------------|----------------|------------------|
| `/tournament` | `/home`      | Broken link to /tournament |
| `/ring`       | `/arys`     | Broken link to /ring |
| `/matches`    | `/invitational` | Broken link to /matches |

- **Action:** Delete only if you confirm no one uses `/tournament`, `/ring`, or `/matches`. Otherwise leave as-is (they are tiny and harmless).

---

## Not recommended here (higher risk)

- **LiveContext refactor** (e.g. keyed state): Touches every overlay page; do this in the new app instead.
- **Extracting shared overlay logic** from existing overlay pages: Large refactor with regression risk; better done in the new app.
- **Splitting Invitational** into multiple files: Single large file works; restructuring is safer in the new app.
