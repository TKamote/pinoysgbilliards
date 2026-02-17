# Rollback reference

Use this if a recent change (e.g. nav/layout) breaks something and you want to restore previous behavior.

---

## Safe commit (before nav-hide change)

- **Commit:** `c536518` — *added other match format*
- This is the last committed state before switching the root layout to use `LayoutSwitch` and hiding the nav on `/overlay/*` and `/live-match`.

---

## Restore layout/nav only (keep your other changes)

If only the nav/layout change is the problem and you want to keep uncommitted work in `live-match/page.tsx` and `WinnerModal.tsx`:

```bash
git checkout c536518 -- src/app/layout.tsx src/components/LayoutSwitch.tsx
```

That restores the previous layout (nav on all pages) and the previous `LayoutSwitch` (only `/overlay` logic, and still unused in layout).

---

## Full revert to that commit (discard all local changes)

Only if you want to throw away every change since that commit:

```bash
git checkout c536518 -- .
```

**Warning:** This overwrites uncommitted changes. Stash or commit first if you need to keep them.

---

*Last updated when nav-hide was implemented (LayoutSwitch in root layout, no-nav for /overlay and /live-match).*
