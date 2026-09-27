/* Core: DOM helpers, state store, card model, router, dialogs, shared components.
   Classic script (no modules) so index.html runs from file://. Exposes window.App. */
(function(){
"use strict";
const App = window.App = {};
App.VERSION = "2.7.2";   // shown in Settings → About this app; bump with sw.js VERSION + add a CHANGELOG entry
App.UPDATED = "2026-09-27";
App.CHANGELOG = [
  ["2.7.2", "Moving a card, rating or ticking no longer jumps you back to the top of the page."],
  ["2.7.1", "Pile review: all piles open; tap a value to see its card (flip for words) and move it."],
  ["2.7.0", "Adjust my values: change a few cards from your last sort without sorting everything again."],
  ["2.6.0", "Share values between phones with a link or QR code, and compare with people on other phones. Custom cards no longer falsely match in Compare."],
  ["2.5.0", "Tap any value name (Life check, Decide, Reflect, History, Compare) to see its card; tap the card to flip, tap outside to close."],
  ["2.4.2", "Rank screen scrolls again on iPhone (only the ⠿ handle drags)."],
  ["2.4.1", "Swipe up fixed on iPhone: the sort screen no longer scrolls, so upward swipes always work."],
  ["2.4.0", "Start over: restart a sort from any step (your saved results stay in History)."],
  ["2.3.2", "Swiping a card up is smooth again (it no longer gets cut off)."],
  ["2.3.1", "Sort buttons no longer overlap when highlighted."],
  ["2.3.0", "Swipe tutorial: an animated demo before your first card, with Try it practice. Replay any time with the ? button while sorting."],
  ["2.2.1", "Sorting: cleaner screen, bigger card, slimmer buttons with swipe arrows; the matching button lights up as you swipe."],
  ["2.2.0", "Sorting is clearer: labels around the card show where each swipe goes, and each button shows its swipe direction."],
  ["2.1.0", "Safer taps: pop-ups no longer close by accident, no phone keyboard over the PIN pad, check-ins are kept as drafts, Cancel is the default on delete prompts."],
  ["2.0.4", "Deck: Cancel in search now works on iPhone."],
  ["2.0.3", "Deck: search widens when you tap it, with a Cancel button."],
  ["2.0.2", "Deck: order and A–Z buttons moved to the top bar next to Card/Grid."],
  ["2.0.1", "Deck: tapping the order menu no longer hides the bottom menu."],
  ["2.0.0", "Deck grid view: 9 cards per page, page numbers and swipe, press-and-hold to peek, A–Z jump, order by deck, your ranking or shuffle."],
  ["1.9.0", "Careful polish: better contrast, large-text layouts, no dead ends in Choose 10, no double saves, “Forgot PIN?”, tidier people lists and headers."],
  ["1.8.2", "Smoother sorting (no flicker), clearer disabled buttons, tidier card picker, “Progress saved” when leaving a sort."],
  ["1.8.1", "Deck: filter bar only shows when there is something to filter."],
  ["1.8.0", "Polish: sort screen fits every phone, Back always visible while scrolling, clearer ratings, smoother pages, tab bar hides while typing."],
  ["1.7.0", "Sort together is now for everyone on the device: start it from “Who’s using?” or Home. Each person sorts into their own profile. Old guests became people."],
  ["1.6.0", "About this app: version, what’s new, privacy and credits."],
  ["1.5.1", "Better spacing under buttons."],
  ["1.5.0", "Update button when a new version is ready. Tab bar fixed on all pages. Why values page and full booklet guidance."],
  ["1.4.0", "Edit your profile directly from Settings. Automatic updates."],
  ["1.3.0", "Install to home screen on iPhone and Android. Zoom lock. New app icon."],
  ["1.2.0", "Rename or delete any person."],
  ["1.1.0", "Multiple people on one device, with optional PIN."],
  ["1.0.0", "Sort, core values, journal, life check, decide, reflect, history, together, deck, custom cards."]
];

/* ---------- DOM ---------- */
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") for (const sk in v){ if (sk.startsWith("--")) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; }
    else if (k.slice(0,2) === "on" && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else if (k === "html") el.innerHTML = v;              // trusted static markup only
    else el.setAttribute(k, v === true ? "" : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids){
  for (const k of kids.flat(Infinity)){
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : String(k));
  }
  return el;
}
App.h = h;
App.$ = (s, r) => (r || document).querySelector(s);
App.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---------- icons (static, trusted) ---------- */
const P = {
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  cards:'<rect x="7" y="3" width="12" height="17" rx="2"/><path d="M4 7v12a2 2 0 002 2h9"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  next:'<path d="M9 5l7 7-7 7"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  up:'<path d="M6 15l6-6 6 6"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  grip:'<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  shuffle:'<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  heart:'<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 019-3 4.8 4.8 0 019 3c-2 4.6-9 9-9 9z"/>',
  minus:'<path d="M6 12h12"/>',
  x:'<path d="M7 7l10 10M17 7L7 17"/>',
  pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  scale:'<path d="M12 4v16M5 20h14M7 8h10"/><path d="M7 8l-3 6a3 3 0 006 0zM17 8l-3 6a3 3 0 006 0z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0112 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0121 19"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload:'<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  flip:'<path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
  restart:'<path d="M4 12a8 8 0 108-8 8.2 8.2 0 00-5.7 2.3L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  history:'<path d="M3 12a9 9 0 103-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>'
};
function icon(name, cls){
  const s = h("span", {class: "i" + (cls ? " " + cls : ""), "aria-hidden": "true"});
  s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || "") + "</svg>";
  return s;
}
App.icon = icon;
App.hydrateIcons = root => App.$$("[data-icon]", root).forEach(el => { const i = icon(el.dataset.icon); el.replaceWith(i); });

/* ---------- users (device registry) ---------- */
const UKEY = "values-deck-users";
const OLDKEY = "values-deck-state-v1";               // pre-multi-user single state
const skey = uid => OLDKEY + ":" + uid;
App.COLORS = ["#1f7a8c", "#c8553d", "#6a994e", "#8e6bb8", "#d08c1e", "#3d7cc9", "#b5487a", "#4f8a83"];
let U;   // {active, users:[{id, name, color, pin, share, created}]}
function saveUsers(){ try{ localStorage.setItem(UKEY, JSON.stringify(U)); }catch(e){} }
function loadUsers(){
  try{ U = JSON.parse(localStorage.getItem(UKEY) || "null"); }catch(e){ U = null; }
  if (!U || !Array.isArray(U.users) || !U.users.length){
    U = {active: "u1", users: [{id: "u1", name: "Me", color: App.COLORS[0], pin: null, share: true, created: new Date().toISOString()}]};
    try{ const old = localStorage.getItem(OLDKEY); if (old){ localStorage.setItem(skey("u1"), old); localStorage.removeItem(OLDKEY); } }catch(e){}
    saveUsers();
  }
  if (!U.users.some(u => u.id === U.active)) U.active = U.users[0].id;
  if (!U.guestsMigrated) migrateGuests();
}
// v1.7: "Together" guests used to live inside one person's state. Turn each guest with results into a device person.
function migrateGuests(){
  const add = [];
  U.users.slice().forEach(owner => {
    let st; try{ st = JSON.parse(localStorage.getItem(skey(owner.id)) || "null"); }catch(e){ st = null; }
    if (!st || !Array.isArray(st.profiles)) return;
    const guests = st.profiles.filter(p => p.id !== "me");
    if (!guests.length) return;
    guests.forEach(g => {
      const snaps = (st.snapshots || []).filter(x => x.profile === g.id);
      if (!snaps.length) return;
      let name = (g.name || "Guest").slice(0, 30);
      while (U.users.concat(add).some(u => u.name.toLowerCase() === name.toLowerCase())) name = name.slice(0, 26) + " (2)";
      const u = {id: "u" + App.uid(), name, color: g.color || App.COLORS[(U.users.length + add.length) % App.COLORS.length], pin: null, share: true, created: new Date().toISOString()};
      add.push(u);
      try{ localStorage.setItem(skey(u.id), JSON.stringify({v: 1, settings: {onboarded: true}, snapshots: snaps.map(x => Object.assign({}, x, {profile: "me"}))})); }catch(e){}
    });
    st.profiles = st.profiles.filter(p => p.id === "me");
    st.snapshots = (st.snapshots || []).filter(x => x.profile === "me");
    Object.keys(st.sorts || {}).forEach(k => { if (k !== "me") delete st.sorts[k]; });
    try{ localStorage.setItem(skey(owner.id), JSON.stringify(st)); }catch(e){}
  });
  U.users.push(...add);
  U.guestsMigrated = true;
  saveUsers();
}
// PIN is a privacy deterrent, not security (FNV-1a hash, no server).
App.hashPin = pin => { let x = 0x811c9dc5; for (const ch of "lyv:" + pin){ x ^= ch.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16); };
App.users = () => U.users;
App.user = id => U.users.find(u => u.id === (id || U.active));
App.saveUsers = saveUsers;
App.addUser = (name, color) => {
  const u = {id: "u" + App.uid(), name: name.trim().slice(0, 30), color: color || App.COLORS[U.users.length % App.COLORS.length], pin: null, share: true, created: new Date().toISOString()};
  U.users.push(u); saveUsers(); return u;
};
App.removeUser = id => {
  U.users = U.users.filter(u => u.id !== id);
  try{ localStorage.removeItem(skey(id)); }catch(e){}
  if (!U.users.length) { localStorage.removeItem(UKEY); loadUsers(); }
  if (U.active === id) { U.active = U.users[0].id; saveUsers(); load(); App.applySettings(); unlock(U.active); }
  saveUsers();
};
App.switchUser = id => {
  if (!App.user(id)) return;
  flush(); U.active = id; saveUsers(); load(); App.applySettings(); unlock(id);
};
// "Who's using?" gate: shown once per browser session when >1 user or a PIN is set.
const SESS = "values-deck-unlocked";
function unlock(id){ try{ sessionStorage.setItem(SESS, id); }catch(e){} }
App.unlock = unlock;
App.needsPicker = () => {
  let ok = null; try{ ok = sessionStorage.getItem(SESS); }catch(e){}
  if (ok === U.active) return false;
  return U.users.length > 1 || !!App.user().pin;
};
App.lock = () => { flush(); try{ sessionStorage.removeItem(SESS); }catch(e){} };
/* Any person's state (the active one from memory, others from storage). */
App.peekState = id => {
  if (id === U.active) return S;
  try{ return JSON.parse(localStorage.getItem(skey(id)) || "null"); }catch(e){ return null; }
};
App.personStatus = id => {
  const st = App.peekState(id);
  const ss = st && Array.isArray(st.snapshots) ? st.snapshots.filter(x => x.profile === "me") : [];
  const snap = ss.length ? ss[ss.length - 1] : null;
  if (st && st.sorts && st.sorts.me) return {k: "prog", t: "Sorting in progress", snap};
  return snap ? {k: "done", t: "Sorted " + App.fmtDate(snap.date, {day: "numeric", month: "short"}), snap} : {k: "none", t: "Not sorted yet", snap: null};
};
/* Sort Together: device-level group (not inside anyone's profile). */
const GKEY = "values-deck-group", GSESS = "values-deck-group-session";
App.group = () => {
  let g = null; try{ g = JSON.parse(localStorage.getItem(GKEY) || "null"); }catch(e){}
  g = Object.assign({members: null, notes: {}}, g || {});
  if (!Array.isArray(g.members)) g.members = U.users.map(u => u.id);
  g.members = g.members.filter(id => App.user(id));
  return g;
};
App.saveGroup = g => { try{ localStorage.setItem(GKEY, JSON.stringify(g)); }catch(e){} };
App.inGroup = () => { try{ return sessionStorage.getItem(GSESS) === "1"; }catch(e){ return false; } };
App.setGroup = on => { try{ on ? sessionStorage.setItem(GSESS, "1") : sessionStorage.removeItem(GSESS); }catch(e){} };

// Read another user's latest own snapshot (for Compare), respecting their share flag.
App.peekCore = id => {
  const u = App.user(id); if (!u || u.share === false || id === U.active) return null;
  try{
    const st = JSON.parse(localStorage.getItem(skey(id)) || "null");
    const ss = st && Array.isArray(st.snapshots) ? st.snapshots.filter(x => x.profile === "me") : [];
    return ss.length ? ss[ss.length - 1] : null;
  }catch(e){ return null; }
};

/* ---------- state (per user) ---------- */
const blankCustom = id => ({id, name: "", definition: "", actions: []});
function defaults(){
  return {
    v: 1,
    settings: {theme: "auto", text: 1, cadence: "weekly", onboarded: false, swipeHint: true},
    custom: [blankCustom(101), blankCustom(102)],
    profiles: [{id: "me", name: "Me"}],
    sorts: {},          // profileId -> in-progress sort
    snapshots: [],      // completed sorts {id, profile, date, top[], most[], some[], not[]}
    journal: {},        // valueId -> {meaning, why, origin, updated}
    audit: {},          // area -> valueId -> {s, n}
    decisions: [],      // {id, title, date, answers{}, a, b, tension, choice}
    reflections: [],    // {id, date, cadence, scores{}, notes{}, note}
    group: {notes: {}, selected: null},
    deck: {i: 0, order: null, filter: "all", q: "", view: "card", sort: "deck", page: 0}
  };
}
let S;
function load(){
  if (!U) loadUsers();
  const d = defaults();
  try{
    const raw = JSON.parse(localStorage.getItem(skey(U.active)) || "null");
    if (raw && typeof raw === "object"){
      S = Object.assign(d, raw);
      S.settings = Object.assign(defaults().settings, raw.settings || {});
      if (!Array.isArray(S.custom) || S.custom.length !== 2) S.custom = [blankCustom(101), blankCustom(102)];
      if (!S.profiles.some(p => p.id === "me")) S.profiles.unshift({id: "me", name: "Me"});
      return;
    }
  }catch(e){}
  S = d;
}
let saveTimer = null, warned = false;
function flush(){
  clearTimeout(saveTimer); saveTimer = null;
  if (!S || !U) return;
  try{ localStorage.setItem(skey(U.active), JSON.stringify(S)); }
  catch(e){ if (!warned){ warned = true; App.toast("Couldn't save on this device. Private browsing?"); } }
}
App.state = () => S;
App.save = (now) => { if (now) return flush(); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); };
App.flush = flush;
App.load = load;
App.reset = () => { S = defaults(); S.settings.onboarded = true; flush(); };
App.replaceState = obj => { const d = defaults(); S = Object.assign(d, obj); S.settings = Object.assign(defaults().settings, obj.settings || {}); flush(); };
addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
// another tab switched user / edited: reload to avoid overwriting
addEventListener("storage", e => { if (e.key === UKEY && U){ const n = JSON.parse(e.newValue || "null"); if (n && n.active !== U.active){ S = null; location.reload(); } } });

/* ---------- cards ---------- */
const BASE = (window.CARDS || []).map(c => Object.assign({}, c));
App.hasData = () => BASE.length > 0;
App.cards = () => BASE.concat(S.custom.filter(c => c.name.trim()).map(c => ({
  id: c.id, name: c.name.trim().toUpperCase(), definition: c.definition.trim(),
  actions: c.actions.filter(a => a.trim()), image: null, custom: true
})));
App.card = id => App.cards().find(c => c.id === +id) || null;
App.title = n => n.toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase());
App.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* snapshots / core values */
App.latest = (pid = "me") => {
  const ss = S.snapshots.filter(s => s.profile === pid);
  return ss.length ? ss[ss.length - 1] : null;
};
App.core = (pid = "me") => {
  const s = App.latest(pid);
  return s ? s.top.map(App.card).filter(Boolean) : [];
};
App.pileOf = (id, pid = "me") => {
  const s = App.latest(pid); if (!s) return null;
  if (s.top.includes(id)) return "core";
  if (s.most.includes(id)) return "most";
  if (s.some.includes(id)) return "some";
  if (s.not.includes(id)) return "not";
  return null;
};
App.profile = pid => S.profiles.find(p => p.id === pid);

/* dates */
App.fmtDate = (iso, opts) => new Date(iso).toLocaleDateString(undefined, opts || {day: "numeric", month: "short", year: "numeric"});
App.daysSince = iso => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
App.CADENCE = {daily: 1, weekly: 7, monthly: 30};
App.checkinDue = () => {
  if (!App.core().length) return false;
  const r = S.reflections[S.reflections.length - 1];
  return !r || App.daysSince(r.date) >= App.CADENCE[S.settings.cadence];
};

/* ---------- a11y + feedback ---------- */
App.announce = msg => { const l = App.$("#live"); l.textContent = ""; setTimeout(() => l.textContent = msg, 30); };
App.toast = (msg, opts = {}) => {
  const t = h("div", {class: "toast", role: "status"}, h("span", null, msg));
  if (opts.action){ t.append(h("button", {class: "toast-act", onclick: () => { opts.action.fn(); t.remove(); }}, opts.action.label)); }
  // toasts must sit above modal dialogs (top layer): render inside the open dialog when there is one
  const dlg = App.$$("dialog[open]").pop();
  let box = App.$("#toasts");
  if (dlg){ box = dlg.querySelector(":scope > .toasts-in") || dlg.appendChild(h("div", {class: "toasts-in"})); }
  box.removeAttribute("aria-hidden"); box.append(t);
  App.announce(msg);
  if (opts.id){ const prev = document.getElementById(opts.id); if (prev) prev.remove(); t.id = opts.id; }
  if (opts.sticky){ t.classList.add("sticky"); t.append(h("button", {class: "toast-x", "aria-label": "Dismiss", onclick: () => t.remove()}, icon("close"))); return t; }
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, opts.ms || 3200);
  return t;
};
App.reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
App.vibrate = ms => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };

/* ---------- dialogs ---------- */
App.modal = (content, {label = "Dialog", cls = ""} = {}) => {
  const d = h("dialog", {class: "modal " + cls, "aria-label": label});
  const close = () => { d.classList.add("closing"); setTimeout(() => { d.close(); d.remove(); }, App.reduced() ? 0 : 180); };
  d.append(h("button", {class: "icon-btn modal-x", "aria-label": "Close", onclick: close}, icon("close")), content);
  // close on backdrop only: a tap on the dialog's own padding also targets <dialog>, so check the coordinates
  d.addEventListener("click", e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  d.addEventListener("cancel", e => { e.preventDefault(); close(); });
  document.body.append(d); d.showModal();
  return close;
};
App.confirm = (title, body, {ok = "OK", cancel = "Cancel", danger = false} = {}) => new Promise(res => {
  let done = false;
  const fin = v => { if (done) return; done = true; res(v); close(); };
  const box = h("div", {class: "confirm"},
    h("h2", null, title), body ? h("p", null, body) : null,
    h("div", {class: "row end"},
      h("button", {class: "btn ghost", onclick: () => fin(false), autofocus: danger}, cancel),   // destructive: safe choice has focus
      h("button", {class: "btn " + (danger ? "danger" : "primary"), onclick: () => fin(true), autofocus: !danger}, ok)));
  const close = App.modal(box, {label: title, cls: "small"});
  box.closest("dialog").addEventListener("close", () => { if (!done){ done = true; res(false); } });
});

/* ---------- card component ---------- */
App.cardEl = (c, {flip = true} = {}) => {
  const front = c.image
    ? h("img", {src: c.image, alt: "", draggable: "false", decoding: "async"})
    : h("div", {class: "vcustom"}, h("small", null, "My value"), h("strong", null, App.title(c.name)), h("em", null, c.definition));
  const card = h("div", {class: "vcard", tabindex: flip ? "0" : null, role: flip ? "button" : null,
      "aria-label": flip ? App.title(c.name) + ". " + c.definition + ". Tap to flip for ideas." : null},
    h("div", {class: "vface vfront"}, front),
    h("div", {class: "vface vback"},
      h("h3", null, App.title(c.name)),
      h("p", {class: "def"}, c.definition),
      c.actions.length ? h("ul", null, c.actions.map(a => h("li", null, a))) : h("p", {class: "muted"}, "No ideas added yet.")));
  const box = h("div", {class: "vbox"}, card);
  if (flip){
    const toggle = () => { card.classList.toggle("flipped"); App.announce(card.classList.contains("flipped") ? "Showing ideas for " + App.title(c.name) : "Showing artwork"); };
    card.addEventListener("click", e => { if (!box.dataset.dragged) toggle(); });
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(); } });
    box.flip = toggle;
  }
  box.card = card;
  return box;
};
App.thumb = (c, cls) => c.image
  ? h("img", {class: "thumb " + (cls || ""), src: c.image, alt: "", loading: "lazy", decoding: "async", draggable: "false"})
  : h("span", {class: "thumb custom " + (cls || ""), "aria-hidden": "true"}, App.title(c.name).slice(0, 1));

App.showCard = (id, list) => {
  let ids = list && list.length ? list : [id], k = Math.max(0, ids.indexOf(id));
  const wrap = h("div", {class: "cardmodal"});
  const render = () => {
    const c = App.card(ids[k]); if (!c) return;
    const el = App.cardEl(c);
    wrap.replaceChildren(
      el,
      h("p", {class: "hint"}, "Tap the card to flip it"),
      ids.length > 1 ? h("div", {class: "row center"},
        h("button", {class: "icon-btn", "aria-label": "Previous", onclick: () => { k = (k - 1 + ids.length) % ids.length; render(); }}, icon("back")),
        h("span", {class: "muted"}, (k + 1) + " / " + ids.length),
        h("button", {class: "icon-btn", "aria-label": "Next", onclick: () => { k = (k + 1) % ids.length; render(); }}, icon("next"))) : null);
    el.card.focus();
  };
  App.modal(wrap, {label: "Card", cls: "cardview"});
  render();
};

/* tappable value name → card pop-up (picture first, tap to flip, tap outside/✕ to close) */
App.vname = (c, ids, text) => c ? h("button", {type: "button", class: "vname", "aria-label": (text || App.title(c.name)) + ", show card",
    onclick: e => { e.preventDefault(); e.stopPropagation(); App.showCard(c.id, ids && ids.length ? ids : null); }},
  h("span", {class: "vn-txt"}, text || App.title(c.name)), icon("cards", "vn-ic")) : null;

/* ---------- shared UI bits ---------- */
App.head = (title, {back, sub, right} = {}) => {
  const h1 = h("h1", {tabindex: "-1", class: String(title).length > 26 ? "long" : null}, title);
  // compact bar that slides in once the big title scrolls away, so Back is always reachable
  const mini = h("div", {class: "minibar", "aria-hidden": "true"},
    back ? h("a", {class: "icon-btn", href: back, tabindex: "-1"}, icon("back")) : h("span", {class: "icon-btn ghost-slot"}),
    h("span", {class: "mini-title"}, title),
    h("span", {class: "icon-btn ghost-slot"}));
  if (App._headObs) App._headObs.disconnect();
  if ("IntersectionObserver" in window){
    App._headObs = new IntersectionObserver(([e]) => { mini.classList.toggle("on", !e.isIntersecting && e.boundingClientRect.top < 0); mini.querySelector(".mini-title").textContent = h1.textContent; }, {threshold: 0});
    requestAnimationFrame(() => App._headObs && App._headObs.observe(h1));
  }
  return h("header", {class: "phead"},
    mini,
    h("div", {class: "phead-row"},
      back ? h("a", {class: "icon-btn", href: back, "aria-label": "Back"}, icon("back")) : null,
      h1, right || null),
    sub ? h("p", {class: "sub"}, sub) : null);
};

App.empty = (title, text, action) => h("div", {class: "empty"},
  h("div", {class: "empty-art", "aria-hidden": "true"}, h("span"), h("span"), h("span")),
  h("h2", null, title), h("p", null, text), action || null);

App.needCore = () => App.empty("First, find your core values",
  "This tool uses your top 10 values. The sort takes about 10–15 minutes.",
  h("a", {class: "btn primary", href: "#/sort"}, "Start the sort"));

App.segmented = (name, options, value, onchange, label) => {
  const g = h("div", {class: "seg", role: "radiogroup", "aria-label": label || name});
  options.forEach(([v, l]) => {
    const id = name + "-" + v;
    g.append(h("input", {type: "radio", name, id, value: v, checked: v === value, onchange: () => onchange(v)}),
      h("label", {for: id}, l));
  });
  return g;
};

App.rating = (name, value, onchange, labels, labelledby) => {
  labels = labels || ["Not at all", "A little", "Somewhat", "Mostly", "Fully"];
  const g = h("div", {class: "rating", role: "radiogroup", "aria-labelledby": labelledby || null});
  const out = h("output", {class: "rating-out", "aria-hidden": "true"});
  const show = v => { out.textContent = v ? v + " · " + labels[v - 1] : ""; out.classList.toggle("on", !!v); };
  for (let n = 1; n <= 5; n++){
    const id = name + "-" + n;
    g.append(h("input", {type: "radio", name, id, value: n, checked: value === n,
        onchange: () => { onchange(n); show(n); App.vibrate(8); }}),
      h("label", {for: id, title: labels[n - 1]}, h("span", {class: "sr"}, labels[n - 1] + " "), String(n)));
  }
  show(value);
  return h("div", {class: "rating-wrap"}, g, out);
};

App.autosize = ta => { const f = () => { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 2) + "px"; }; ta.addEventListener("input", f); requestAnimationFrame(f); return ta; };

App.field = (label, {value = "", placeholder = "", rows = 3, oninput, hint, id} = {}) => {
  id = id || "f-" + App.uid();
  const ta = App.autosize(h("textarea", {id, rows, placeholder, value}));
  let t;
  ta.addEventListener("input", () => { oninput && oninput(ta.value); App.save(); clearTimeout(t); status.textContent = "Saving…"; t = setTimeout(() => status.textContent = "Saved", 500); });
  const status = h("span", {class: "saved", "aria-hidden": "true"});
  return h("div", {class: "field"}, h("label", {for: id}, label), hint ? h("p", {class: "hint"}, hint) : null, ta, status);
};

/* confetti */
App.confetti = () => {
  if (App.reduced()) return;
  const box = h("div", {class: "confetti", "aria-hidden": "true"});
  const cols = ["#1f7a8c", "#e2a33a", "#c8553d", "#6a994e", "#f2cc8f"];
  for (let n = 0; n < 60; n++){
    const s = h("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.background = cols[n % cols.length];
    s.style.animationDelay = Math.random() * .4 + "s";
    s.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
    s.style.setProperty("--x", (Math.random() * 160 - 80) + "px");
    s.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3800);
};

/* sparkline svg */
App.spark = (vals, {w = 120, hgt = 28, max = 5} = {}) => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${hgt}`); svg.setAttribute("class", "spark"); svg.setAttribute("aria-hidden", "true");
  if (vals.length){
    const step = vals.length > 1 ? (w - 6) / (vals.length - 1) : 0;
    const pts = vals.map((v, k) => [3 + k * step, hgt - 3 - (v - 1) / (max - 1) * (hgt - 6)]);
    const pl = document.createElementNS(ns, "polyline");
    pl.setAttribute("points", pts.map(p => p.join(",")).join(" "));
    svg.append(pl);
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", pts[pts.length - 1][0]); c.setAttribute("cy", pts[pts.length - 1][1]); c.setAttribute("r", 3);
    svg.append(c);
  }
  return svg;
};

/* ---------- router ---------- */
const routes = {};
let cleanup = null;
App.route = (name, fn) => { routes[name] = fn; };
App.go = hash => { if (location.hash === hash) App.render(); else location.hash = hash; };
App.render = () => {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const name = parts[0] || "";
  const OPEN = ["who", "together", "handoff", "compare"];   // "add" stays gated: a shared link is saved into the chosen person's profile   // device-level screens, usable before picking a person
  const gated = App.needsPicker() && !OPEN.includes(name);
  const fn = gated ? routes.who : (routes[name] || routes[""]);
  if (cleanup){ try{ cleanup(); }catch(e){} cleanup = null; }
  App.$$("dialog.modal").forEach(d => { d.close(); d.remove(); });
  const main = App.$("#main");
  const samePage = path === App._lastPath, keepY = scrollY;   // in-place redraw (e.g. after moving a card) keeps the scroll position
  const res = fn(parts.slice(1), new URLSearchParams(qs || "")) || {};
  // a view returns either a Node or {node, focus, tab, cleanup}; a bare Node must not be read as options (Node#focus is a method)
  const view = res instanceof Node ? {node: res} : res;
  main.replaceChildren(view.node || h("div"));
  main.className = "view view-" + (name || "home") + (view.focus === true ? " focus" : "");
  document.body.classList.toggle("focus-mode", view.focus === true);
  cleanup = view.cleanup || null;
  const tab = view.tab || name || "home";
  App.$$("#tabbar a").forEach(a => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  App.$$(".seg.scroll, .tabs", main).forEach(App.scrollHint);
  // fade in only when the page actually changes (not on in-page re-renders such as each sorted card)
  if (path !== App._lastPath && !App.reduced()){ main.classList.remove("enter"); void main.offsetWidth; main.classList.add("enter"); }
  else if (path !== App._lastPath) main.classList.remove("enter");
  App._lastPath = path;
  const t = main.querySelector("h1");
  document.title = (t ? t.textContent + " · " : "") + "Live Your Values";
  if (samePage) window.scrollTo(0, keepY);
  else { window.scrollTo(0, 0); if (App._navigated && t) t.focus({preventScroll: true}); }
  App._navigated = true;
};

/* horizontal scrollers: fade the edge that has more content */
App.scrollHint = el => {
  const upd = () => {
    const more = el.scrollWidth - el.clientWidth > 2;
    el.classList.toggle("more-r", more && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    el.classList.toggle("more-l", more && el.scrollLeft > 2);
  };
  el.addEventListener("scroll", upd, {passive: true}); requestAnimationFrame(upd);
  const cur = el.querySelector("[aria-current], input:checked + label");
  if (cur) requestAnimationFrame(() => { const r = cur.getBoundingClientRect(), b = el.getBoundingClientRect(); if (r.right > b.right || r.left < b.left) el.scrollLeft += r.left - b.left - 16; upd(); });
};
/* hide the tab bar while typing so it never covers the field or keyboard */
// only real keyboard fields; dropdowns (select) open a picker, not a keyboard, so the tab bar stays
const TYPING = "input[type=text], input[type=search], input:not([type]), textarea";
document.addEventListener("focusin", e => { if (e.target.matches(TYPING)) document.body.classList.add("typing"); });
document.addEventListener("focusout", () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches(TYPING)) document.body.classList.remove("typing"); }, 50));

/* ---------- theme / text size ---------- */
App.applySettings = () => {
  const r = document.documentElement;
  if (S.settings.theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", S.settings.theme);
  r.style.setProperty("--text-scale", S.settings.text);
};
})();
