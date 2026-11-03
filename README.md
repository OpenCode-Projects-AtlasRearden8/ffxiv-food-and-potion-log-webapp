# Raid Night Pantry

A warm, one-column, fully **offline web app** for FINAL FANTASY XIV players: log the
consumables you burn through on raid night (food, tinctures/potions, melds/materia),
keep a stock checklist with restock reminders, and see what each raid night costs you.
All data stays in your browser's LocalStorage — no backend, no login, no tracking.

Built and tested by **Asdale Dynamics, LLC** as part of a beginner-friendly,
local-first tools collection.

## Features

- **Consumable log** — record the date, item, type (food / potion (meds) / meld (materia)),
  quantity used, and unit cost in gil. Entries are listed newest-first.
- **Stock checklist** — track how many of each item you have on hand and a personal
  restock threshold. Items at or below threshold get a friendly "restock soon" badge.
- **Restock reminders** — an `aria-live` banner summarizes everything that's running low
  so you notice it before the raid starts, not during it.
- **Cost per night** — a running summary of gil spent per raid night, grand total,
  and average per night.
- **One-click helpers** — "−1" (use one) and "+5" (restock five) buttons on every row.
- **Export/import** — save your whole log and checklist as a JSON backup file, or
  restore one later. It's just a local file; nothing is uploaded anywhere.

## How to run it

No build step, no install, no dependencies. Either:

1. Double-click `index.html` (or open it in any modern browser), **or**
2. Serve the folder statically if you prefer: `python3 -m http.server 8080`,
   then visit `http://localhost:8080`.

Everything works offline. Your data is stored in your browser's LocalStorage for
the site you opened it from, so use the same browser/location to keep your history.

## Verify / test

The logic is verified with a lightweight DOM harness (a tiny fake DOM — no headless
browser, no libraries). Run the tests with Node 18+:

```
npm test
```

or equivalently: `node --test tests/`

## Accessibility (WCAG AA care)

- Warm cream panels with dark text sized for comfortable contrast (AA or better).
- Every input has a real `<label>`; the test suite checks this.
- Icon-free, plain-language buttons with descriptive `aria-label` on each row action.
- `aria-live` regions announce restock reminders and cost summaries politely.
- Visible focus outlines on all interactive elements, plus a skip link.

## Privacy

There is no account, no server, no analytics, and no network request. The app never
asks for real money or personal data — "cost" is in-game gil you type yourself.

## Fan-content disclaimer

This is unofficial *FINAL FANTASY XIV* fan content. Not affiliated with or endorsed by
Square Enix. FINAL FANTASY and FINAL FANTASY XIV are trademarks or registered trademarks
of Square Enix Holdings Co., Ltd. Sample stock items are examples you can edit or delete.

## Project structure

```
index.html        static shell (title, footer, disclaimers)
styles.css        warm one-column theme
app.js            all logic: state, LocalStorage, rendering, actions
tests/harness.js  tiny fake-DOM test harness
tests/app.test.js behavior tests for every user flow
package.json      npm test entry point
```

## License

MIT — see [`LICENSE`](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC.
