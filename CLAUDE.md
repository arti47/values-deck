# CLAUDE.md — Values Deck

## Purpose
Personal HTML5 viewer simulating the physical *Live Your Values* card deck. Private repo; content is copyrighted.

## Stack
- Vanilla HTML/CSS/JS, no build, no deps. Classic `<script>` files (not ES modules) so `file://` works.
- `index.html` shell → `css/app.css`, `js/core.js` (window.App: `h()` DOM helper, store, cards, router, dialogs, card component), `js/view-*.js` (one route group each), `js/app.js` (boot).
- Data: `data/cards.js` (`window.CARDS`); `cards.json` canonical.
- PWA: `manifest.webmanifest` + `sw.js` (images cache-first, code network-first; http/https only).

## Data schema (`data/cards.json`)
`[{ id:int, name:string (UPPERCASE), definition:string ("to …"), actions:string[], image:"data/images/NN_NAME.jpg" }]`
- 73 cards. Custom cards: ids 101/102, stored in state, `image:null` (generated front).

## State (localStorage `values-deck-state-v1`, single JSON)
`settings{theme,text,cadence,onboarded,swipeHint}`, `custom[2]`, `profiles[{id,name,color}]` ("me" + pass-the-phone people),
`sorts{pid:{stage:piles|pick|rank,assign{id:most|some|not},log[],picked[],ranked[]}}` (in-progress),
`snapshots[{id,profile,date,top[10],most[],some[],not[]}]` (latest "me" = core values),
`journal{id:{meaning,why,origin}}`, `audit{rel|work|leisure|health:{id:{s,n}}}`, `decisions[]`, `reflections[{date,scores{},notes{},note}]`, `group{notes,selected}`, `deck{i,order,filter,q}`.
Backup = export/import this JSON (Settings).

## Routes (hash)
`#/` home · `#/sort[/pid]` 3-step wizard · `#/values` · `#/history` · `#/journal[/id]` · `#/audit/<area|summary>` · `#/decide[/new|/id]` · `#/reflect[/new]` · `#/together` · `#/handoff/pid` · `#/compare` · `#/deck` · `#/custom` · `#/settings`.
Views return `{node, focus?, tab?, cleanup?}`; `focus` hides tab bar.

## UI spec
- Phone first; floating bottom tab bar (Home, My values, Deck, Settings).
- Warm paper theme, auto/light/dark via `data-theme`; tokens on `:root` (bg, surface, ink, teal #1f7a8c, mustard #e2a33a, rose #c8553d). Card faces always paper.
- Fonts: Josefin Sans (display), Literata (body).
- Card aspect 990:1813 (`--ratio:.546`), 3D flip, container-query text sizing.
- Sort: swipe right=most, up=some, left=not + big buttons, undo, keys 1/2/3, arrows, U, F.
- A11y: 44px+ targets, focus-visible, ARIA live, radio-group ratings, reduced-motion, forced-colors, text-size setting.
- Grid lists need `minmax(0,1fr)` columns to avoid overflow from nowrap text.

## Workflow
- Rebuild data: `python3 tools/extract_cards.py <epub> --repo .`; bump `sw.js` VERSION on any asset change.
- Always merge to main. Keep this file current with every change.

## Backlog
- Private hosting (Netlify/Cloudflare with auth); then optionally ES modules.
