# CLAUDE.md — Values Deck

## Purpose
Personal HTML5 viewer simulating the physical *Live Your Values* card deck. Private repo; content is copyrighted.

## Stack
- Vanilla HTML/CSS/JS, single `index.html`, no build, no dependencies.
- Data loaded via `<script src="data/cards.js">` (`window.CARDS`) so `file://` works; `cards.json` is canonical.
- PWA: `manifest.webmanifest` + `sw.js` (cache-first, registered only on http/https).

## Data schema (`data/cards.json`)
`[{ id:int, name:string (UPPERCASE), definition:string ("to …"), actions:string[], image:"data/images/NN_NAME.jpg" }]`
- 73 cards. Source typos fixed in extractor: LOYALITY→LOYALTY, OPENESS→OPENNESS.
- EPUB lacks: 2 blank cards, 3 sort-header cards (Matters Most / Some / Doesn't Matter).

## UI spec
- Card aspect 990:1813 (`--ratio:0.546`), height ≈ full viewport.
- Front: image. Back: name, italic definition, mustard rule, action bullets (scroll on overflow).
- 3D flip (rotateY, 0.6s); slide-in on nav; reduced-motion respected.
- Tokens: table #22313b/#2b3d48 (light: #d9cdb8/#e6dcc9), paper #fbf3e3, ink #1e2a30, teal #1f7a8c, mustard #e2a33a.
- Fonts: Josefin Sans (display), Literata (body), Google Fonts with system fallbacks.
- Persist `{i, order}` in localStorage key `values-deck-pos`.

## Workflow
- Rebuild data: `python3 tools/extract_cards.py <epub> --repo .`; bump `sw.js` VERSION on any asset change.
- Always merge to main. Keep this file current with every change.

## Backlog
- Sort mode: Most/Some/Not piles → top 10 → rank 1–10 (book's core method).
- Core-10 filter view; decision-matrix view; periodic re-sort history.
