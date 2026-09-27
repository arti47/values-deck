# CLAUDE.md — Values Deck

## Purpose
Personal HTML5 viewer simulating the physical *Live Your Values* card deck. Private repo; content is copyrighted.

## Stack
- Vanilla HTML/CSS/JS, no build, no deps. Classic `<script>` files (not ES modules) so `file://` works.
- `index.html` shell → `css/app.css`, `js/core.js` (window.App: `h()` DOM helper, store, cards, router, dialogs, card component), `js/view-*.js` (one route group each), `js/app.js` (boot).
- Data: `data/cards.js` (`window.CARDS`); `cards.json` canonical.
- PWA: `manifest.webmanifest` + `sw.js` (images cache-first, code network-first with `no-cache`; http/https only). `updateViaCache:'none'`, update check on app focus, new SW waits → sticky "A new version is ready [Update]" toast → postMessage `skipWaiting` → reload on `controllerchange` (one-time auto takeover from caches v1–v5). `App.VERSION` (core.js) shown in Settings with "Check for updates"; bump it with sw.js VERSION.

## Data schema (`data/cards.json`)
`[{ id:int, name:string (UPPERCASE), definition:string ("to …"), actions:string[], image:"data/images/NN_NAME.jpg" }]`
- 73 cards. Custom cards: ids 101/102, stored in state, `image:null` (generated front).

## Users (multi-user on one device)
- Registry `values-deck-users` = `{active, users:[{id,name,color,pin(hash|null),share,created}]}`; per-user state key `values-deck-state-v1:<uid>`.
- Legacy single key `values-deck-state-v1` auto-migrates to user `u1` ("Me").
- "Who's using?" picker (`#/who`) gates every route once per browser session (sessionStorage `values-deck-unlocked`) when >1 user or PIN set. Home avatar = switch.
- Rename/recolour/delete any person: Edit on Settings user row, `#/users` rows or "Rename or delete people" mode on `#/who` (`App.editUser`); other people's PIN required; names unique; last person can't be deleted.
- PIN: 4 digits, FNV hash, deterrent only. `share` = include my top 10 in others' Compare (`App.peekCore`).
- **Sort together is device-level** (not per profile): `#/together` (tick members, add people = `App.addUser`), `#/handoff/<uid>` (PIN if set → `App.switchUser` + sessionStorage `values-deck-group-session`) → `#/sort` in that person's own profile → on finish/exit: `App.lock()` + back to `#/together`. `#/compare` = members with results and `share !== false`; custom cards resolved per owner. Group state in localStorage `values-deck-group` `{members, selected, notes}`. `together/handoff/compare/who` bypass the picker gate. Entry: "Sort together" on `#/who` and Home tile. "Finish & hand back" → lock → picker.
- Legacy per-profile guests (`profiles[] != me` with snapshots) auto-migrate to device people once (`U.guestsMigrated`).
- Settings (theme, text, cadence) are per user. Backup/erase = current user only. Storage event from another tab switching user → reload.

## State (per user, single JSON)
`settings{theme,text,cadence,onboarded,swipeHint}`, `custom[2]`, `profiles[{id,name,color}]` ("me" only; legacy guests migrated),
`sorts{pid:{stage:piles|pick|rank,assign{id:most|some|not},log[],picked[],ranked[]}}` (in-progress),
`snapshots[{id,profile,date,top[10],most[],some[],not[]}]` (latest "me" = core values),
`journal{id:{meaning,why,origin}}`, `audit{rel|work|leisure|health:{id:{s,n}}}`, `decisions[]`, `reflections[{date,scores{},notes{},note}]`, `group{notes,selected}`, `deck{i,order,filter,q,view:card|grid,sort:deck|rank|shuffle,page,from}`.
Backup = export/import this JSON (Settings).

## Routes (hash)
`#/` home · `#/sort` 3-step wizard (active person) · `#/values` · `#/history` · `#/journal[/id]` · `#/audit/<area|summary>` · `#/decide[/new|/id]` · `#/reflect[/new]` · `#/together` · `#/handoff/pid` · `#/compare` · `#/deck` · `#/custom` · `#/settings` · `#/users` · `#/who` · `#/about` (why values + all booklet uses, linked).
Views return a Node or `{node, focus?, tab?, cleanup?}`; only `focus === true` hides the tab bar (Node#focus is a method: never read options off a bare Node).

## UI spec
- Phone first; floating bottom tab bar (Home, My values, Deck, Settings).
- Warm paper theme, auto/light/dark via `data-theme`; tokens on `:root` (bg, surface, ink, teal #1f7a8c, mustard #e2a33a, rose #c8553d). Card faces always paper.
- Fonts: Josefin Sans (display), Literata (body).
- Card aspect 990:1813 (`--ratio:.546`), 3D flip, container-query text sizing.
- Sort: swipe right=most, up=some, left=not + big buttons, undo, keys 1/2/3, arrows, U, F.
- A11y: 44px+ targets, focus-visible, ARIA live, radio-group ratings, reduced-motion, forced-colors, text-size setting.
- Grid lists need `minmax(0,1fr)` columns to avoid overflow from nowrap text.
- Polish (1.8): sort step 1 fits one screen (wizard fixed to 100dvh, `.sort-stage` container-query sizes the card); `App.head` adds a `.minibar` (fixed compact title + Back, shown via IntersectionObserver when h1 scrolls away); page-enter fade; `App.scrollHint` fades edges of `.seg.scroll`/`.tabs` and scrolls the current item into view; `body.typing` hides tab bar while a text input/textarea is focused (not selects); `App.rating(name, value, onchange, labels, labelledby)` shows chosen label (`.rating-out`); 44px min targets for chips/links/small icon buttons.

## Deck (2.0)
- Top bar: search · order icon button (icon = current order: list/star/shuffle; invisible native select on top; tinted when not Deck order; toast on change) · A–Z · Card|Grid switch (`.view-sw`, key G). Shared: search, pile filters, order select (Deck order · My ranking [needs a sort] · Shuffle; re-choosing Shuffle reshuffles; `D.order` keeps the shuffle).
- Grid: 9 per page (`PER`), pager ‹ 1 … n › (compact with ellipsis >5 pages), swipe/arrow keys/PageUp/Down, sticky pager above tab bar. Tiles: artwork + badge (gold rank for top 10, teal dot Most, mustard dot Some). `fitGrid()` sizes tiles: fit 3 rows when possible, else ≥~120px wide and scroll.
- Tap tile → card view (`D.from="grid"` shows a Grid button that returns to the page containing the card). Long-press 450ms → peek modal that auto-flips to ideas. A–Z sheet jumps to first card per letter in the current list.
- Card view is height-fitted (container query) so its bar is always visible.

## UX safety rules (1.9)
- Text tokens meet WCAG AA 4.5:1 on all surfaces (light `--ink-2 #4f5d64`, `--ink-3 #5c686e`, `--rose-ink` for red text; never use `--rose` for text). Verify with an automated contrast/tap-target/overflow audit across 375×560 + 390×664, light/dark, text 1 and 1.25.
- No dead ends: Choose 10 offers Matters some, and Doesn't matter when Most+Some < 10.
- No double saves: `finish()` returns if the sort was already saved; check-in Save disables itself.
- Empty decisions (opened, never filled) are pruned when the Decide list renders.
- "Forgot PIN?" on the PIN pad → confirm → delete that profile (`App.forgotPin`); PINs are unrecoverable by design.
- Long `App.head` titles (>26 chars) get `.long` (smaller headline). Tab bar labels fixed 11px nowrap. People rows wrap with `.pbtns` kept together.

## Booklet guidance coverage
All booklet uses/rules are in-app: sort prep (quiet, breaths), "who you are today, not aspirational, independent of job/relationships", first instinct, own-definition OK, 3-step sort, top 10/3/1, card-back ideas, 2 blank cards, Matters Some view, journal (meaning/why/origin), 4-area life check (incl. no-job note), decision chart + conflict handling, together + 7 questions, reflection daily/weekly/monthly, re-sort yearly/5 years, benefits, people/schedule tips, quotes (`App.quote`).
Toasts render inside an open `<dialog>` (`.toasts-in`) so they stay above modals.

## Install / native feel
- `manifest.webmanifest` (standalone, portrait, maskable icon). Icons generated from `icons/icon.svg` (192, 512, maskable-512, apple-touch 180, favicon-32).
- `js/install.js`: zoom lock (viewport `user-scalable=no` + iOS gesture/pinch/ctrl-wheel blocking, CSS `touch-action:manipulation`, inputs ≥16px), `beforeinstallprompt` button, iOS/Android step-by-step instructions (Settings → Home screen app), dismissible Home banner on mobile (`settings.installDismissed`).
- Install needs https (or localhost); file:// shows a hint instead.

## Workflow
- Rebuild data: `python3 tools/extract_cards.py <epub> --repo .`; bump `sw.js` VERSION on any asset change.
- Every release: bump `App.VERSION` + `App.UPDATED` + add `App.CHANGELOG` entry (core.js) and bump `sw.js` VERSION. Settings → "About this app" shows version, updated date, Check for updates, What's new, privacy, credits.
- Always merge to main. Keep this file current with every change.

## Hosting
- GitHub Pages via `.github/workflows/pages.yml` on push to main (copies index.html, manifest, sw.js, robots.txt, css, js, icons, data minus cards.json). Add new top-level app files to that copy list.
- noindex meta + robots.txt. Site is public by URL.

## Backlog
- Optional: auth-protected host if privacy needed.
