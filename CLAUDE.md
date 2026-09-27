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

## Users (multi-user on one device)
- Registry `values-deck-users` = `{active, users:[{id,name,color,pin(hash|null),share,created}]}`; per-user state key `values-deck-state-v1:<uid>`.
- Legacy single key `values-deck-state-v1` auto-migrates to user `u1` ("Me").
- "Who's using?" picker (`#/who`) gates every route once per browser session (sessionStorage `values-deck-unlocked`) when >1 user or PIN set. Home avatar = switch.
- Rename/recolour/delete any person: Edit on `#/users` rows or "Rename or delete people" mode on `#/who` (`App.editUser`); other people's PIN required; names unique; last person can't be deleted.
- PIN: 4 digits, FNV hash, deterrent only. `share` = include my top 10 in others' Compare (`App.peekCore`).
- Settings (theme, text, cadence) are per user. Backup/erase = current user only. Storage event from another tab switching user → reload.

## State (per user, single JSON)
`settings{theme,text,cadence,onboarded,swipeHint}`, `custom[2]`, `profiles[{id,name,color}]` ("me" + pass-the-phone people),
`sorts{pid:{stage:piles|pick|rank,assign{id:most|some|not},log[],picked[],ranked[]}}` (in-progress),
`snapshots[{id,profile,date,top[10],most[],some[],not[]}]` (latest "me" = core values),
`journal{id:{meaning,why,origin}}`, `audit{rel|work|leisure|health:{id:{s,n}}}`, `decisions[]`, `reflections[{date,scores{},notes{},note}]`, `group{notes,selected}`, `deck{i,order,filter,q}`.
Backup = export/import this JSON (Settings).

## Routes (hash)
`#/` home · `#/sort[/pid]` 3-step wizard · `#/values` · `#/history` · `#/journal[/id]` · `#/audit/<area|summary>` · `#/decide[/new|/id]` · `#/reflect[/new]` · `#/together` · `#/handoff/pid` · `#/compare` · `#/deck` · `#/custom` · `#/settings` · `#/users` · `#/who`.
Views return `{node, focus?, tab?, cleanup?}`; `focus` hides tab bar.

## UI spec
- Phone first; floating bottom tab bar (Home, My values, Deck, Settings).
- Warm paper theme, auto/light/dark via `data-theme`; tokens on `:root` (bg, surface, ink, teal #1f7a8c, mustard #e2a33a, rose #c8553d). Card faces always paper.
- Fonts: Josefin Sans (display), Literata (body).
- Card aspect 990:1813 (`--ratio:.546`), 3D flip, container-query text sizing.
- Sort: swipe right=most, up=some, left=not + big buttons, undo, keys 1/2/3, arrows, U, F.
- A11y: 44px+ targets, focus-visible, ARIA live, radio-group ratings, reduced-motion, forced-colors, text-size setting.
- Grid lists need `minmax(0,1fr)` columns to avoid overflow from nowrap text.

## Install / native feel
- `manifest.webmanifest` (standalone, portrait, maskable icon). Icons generated from `icons/icon.svg` (192, 512, maskable-512, apple-touch 180, favicon-32).
- `js/install.js`: zoom lock (viewport `user-scalable=no` + iOS gesture/pinch/ctrl-wheel blocking, CSS `touch-action:manipulation`, inputs ≥16px), `beforeinstallprompt` button, iOS/Android step-by-step instructions (Settings → Home screen app), dismissible Home banner on mobile (`settings.installDismissed`).
- Install needs https (or localhost); file:// shows a hint instead.

## Workflow
- Rebuild data: `python3 tools/extract_cards.py <epub> --repo .`; bump `sw.js` VERSION on any asset change.
- Always merge to main. Keep this file current with every change.

## Hosting
- GitHub Pages via `.github/workflows/pages.yml` on push to main (copies index.html, manifest, sw.js, robots.txt, css, js, icons, data minus cards.json). Add new top-level app files to that copy list.
- noindex meta + robots.txt. Site is public by URL.

## Backlog
- Optional: auth-protected host if privacy needed.
