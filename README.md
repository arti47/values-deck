# Values Deck

Personal HTML5 card-deck viewer for the *Live Your Values* deck (73 cards). Click to flip: image front, text back.

## Run
- **Local:** open `index.html` directly in a browser (no server needed).
- **Local server (enables offline cache):** `python3 -m http.server 8000` → http://localhost:8000
- **iPhone/iPad:** serve over https (see below), open in Safari → Share → Add to Home Screen.

## Controls
| Action | Input |
|---|---|
| Flip | click/tap card, Enter, Space, F, ↑/↓ |
| Next / prev | ‹ › buttons, ← →, swipe |
| Shuffle | button or S |

Position and shuffle order persist in `localStorage`.

## Structure
```
index.html              app (single file, no build step)
data/cards.json         canonical data: {id, name, definition, actions[], image}
data/cards.js           same data as window.CARDS (lets index.html run from file://)
data/images/NN_NAME.jpg card fronts, 990×1813
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
