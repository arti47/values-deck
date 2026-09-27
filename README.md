# Values Deck

Phone-first app for the *Live Your Values* deck (73 cards): find, rank and live your core values.

## Features
- **Sort** (3 steps): swipe/tap into Matters most / some / doesn't matter, pick 10, rank 1-10. Undo, resume, review piles.
- **My values**: ranked top 10, "also matters" list, tap to flip for ideas.
- **Journal**: meaning / why / origin per value.
- **Life check**: rate relationships, work, free time, body & mind per value; heatmap + focus suggestions.
- **Decide**: per-value prompts, value-conflict helper, final decision.
- **Reflect**: daily/weekly/monthly check-ins, trend sparklines, Home nudge when due.
- **History**: dated sorts with rank changes; yearly re-sort nudge.
- **Together**: pass-the-phone group sorts, compare shared/unique, discussion questions.
- **Deck**: browse, search, filter by pile, shuffle.
- **My own cards**: 2 blank cards.
- **Multiple users**: "Who's using?" picker, per-person private data, optional 4-digit PIN, compare with others on the device.
- **Settings**: theme, text size, check-in frequency, backup/restore JSON, erase.

## Run
- **Local:** open `index.html` directly in a browser (no server needed).
- **Local server (enables offline cache):** `python3 -m http.server 8000` → http://localhost:8000
- **iPhone/iPad:** serve over https (see below), open in Safari → Share → Add to Home Screen.

## Controls
| Where | Input |
|---|---|
| Sort | swipe right/up/left, buttons, keys 3/2/1 or arrows, U undo, F flip |
| Deck | tap/Enter/F flip, arrows or swipe, S shuffle |

All data stays in `localStorage`, separate per person; each person backs up from Settings.

## Structure
```
index.html              app shell
css/app.css             styles
js/core.js              core: DOM helper, state, router, dialogs, card component
js/view-*.js            views (home, sort, values, tools, together, deck, settings)
js/app.js               boot
data/cards.json         canonical data
data/cards.js           same data as window.CARDS (file:// support)
data/images/NN_NAME.jpg card fronts, 990x1813
manifest.webmanifest    PWA manifest
sw.js                   offline cache (http/https only)
icons/                  app icons
tools/extract_cards.py  rebuild data/ from the EPUB
CLAUDE.md               project spec
```

## Rebuild data
```bash
python3 tools/extract_cards.py path/to/book.epub --repo .
```
Then bump `VERSION` in `sw.js`.

## Content notice
Card text and artwork © Lisa Congdon & Andreea Niculescu / Chronicle Books. For personal use only. **Keep this repository private**; do not publish via public GitHub Pages.
