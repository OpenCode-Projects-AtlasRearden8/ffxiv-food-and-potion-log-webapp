# STATUS — Raid Night Pantry (FFXIV food & potion log)

Last verified: 2026-11-03 · Author: Asdale Dynamics, LLC

## What was built

A single-page, fully **offline web app** for logging FINAL FANTASY XIV raid-night
consumables — food, potions (meds), and melds (materia):

- **Consumable log** — date, item name, type, quantity, unit cost (gil). Newest first.
- **Stock checklist** — count on hand + per-item restock threshold; "−1 use" and
  "+5 restock" quick actions; delete.
- **Restock reminders** — `aria-live` banner naming every item at or below threshold.
- **Cost per night** — per-night gil totals, grand total, and per-night average.
- **JSON export/import** — local backup file, nothing leaves the device.
- **Sample checklist seeded on first run** (tinctures, food, materia) — fully editable.

Tech: plain HTML + CSS + vanilla JS. All state in LocalStorage. No backend, no login,
no network requests, no build step, no dependencies, no secrets or personal data.

## How to run it

- Open `index.html` in any modern browser (double-click is enough), **or**
- `python3 -m http.server 8080` in this folder, then visit `http://localhost:8080`.

Data persists per browser/site via LocalStorage. First run seeds an editable
sample checklist.

## How to verify

Requires Node 18+ (tests were run on Node 20):

```
npm test                 # 17 behavior tests via a lightweight fake-DOM harness
node tests/smoke.boot.js # simulated browser boot: self-mount + LocalStorage path
node tests/contrast.audit.js  # WCAG AA contrast audit of the shipped palette
```

## Verification results (actual output this session)

- `npm test` → **17/17 tests pass, 0 fail** (TAP: `pass 17 / fail 0`).
- `node tests/smoke.boot.js` → `BROWSER BOOT OK: app self-mounted, ids = 19`.
- `node tests/contrast.audit.js` → **10/10 pairs pass**, all ≥ 7.36:1 (AA is 4.5:1;
  body text is 11.68:1).
- `node --check app.js` → clean.

## Testing approach

`tests/harness.js` is a deliberately tiny fake DOM (~100 lines) supporting exactly
what the app uses: element creation, attributes/`dataset`, `classList`, text content,
child lists, `closest()` with data-attribute selectors, and bubbling click events.
The app renders through event delegation, so real user flows (add, remove, use,
restock, clear) are exercised end-to-end without a headless browser.

## Accessibility

- Every input has a matching `<label>` ( asserted by a test).
- Every row action button has a descriptive `aria-label` (asserted by a test).
- `aria-live` polite regions for restock banner and cost summary (asserted).
- Visible focus outlines, skip link, reduced-motion media query.
- Shipped color pairs audited ≥ AA (contrast.audit.js).

## Known gaps / limitations

- No headless-browser screenshot/visual test — layout is verified by the standards
  used in the CSS, not pixel comparisons.
- JSON import uses the browser `FileReader`/`File` APIs, which the fake DOM in the
  test harness does not model, so import is intentionally not covered by tests
  (export is a no-op outside a browser; both are guarded).
- Costs are self-reported gil; there is no market-board integration (offline app
  by design).
- LocalStorage is per browser profile; clearing browser data clears the app
  (use "Export JSON backup" regularly). No auto-scheduled backups.
- No service-worker/offline-cache manifest beyond "it is already fully static".

## Legal note

Unofficial FINAL FANTASY XIV fan content, not affiliated with or endorsed by
Square Enix. MIT licensed, Copyright (c) 2026 Asdale Dynamics, LLC.
