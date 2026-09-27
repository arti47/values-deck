/* Browse deck: Card view (flip one card) or Grid view (3×3 pages of thumbnails).
   Shared: search, pile filters, order (Deck order · My ranking · Shuffle). Grid: pager, swipe, A–Z jump, long-press peek. */
(function(){
"use strict";
const {h, icon} = App;
const PER = 9;
const ORDERS = [["deck", "Deck order"], ["rank", "My ranking"], ["shuffle", "Shuffle"]];
const RANK = {core: 0, most: 1, some: 2, not: 3};

function shuffled(ids){ ids = ids.slice(); for (let k = ids.length - 1; k > 0; k--){ const r = Math.floor(Math.random() * (k + 1)); [ids[k], ids[r]] = [ids[r], ids[k]]; } return ids; }

App.route("deck", () => {
  const S = App.state();
  const D = S.deck;
  // defaults / migration from the old shuffle-only viewer
  if (!D.sort) D.sort = D.order ? "shuffle" : "deck";
  if (!D.view) D.view = "card";
  if (D.page == null) D.page = 0;
  const snap = App.latest();
  const hasSnap = !!snap;
  const FILTERS = [["all", "All"]].concat(hasSnap ? [["core", "My top 10"], ["most", "Most"], ["some", "Some"], ["not", "Not"]] : [])
    .concat(App.cards().some(c => c.custom) ? [["custom", "Mine"]] : []);
  if (!FILTERS.some(f => f[0] === D.filter)) D.filter = "all";
  if (D.sort === "rank" && !hasSnap) D.sort = "deck";

  function list(){
    let cs = App.cards();
    if (D.filter === "core") cs = App.core();
    else if (D.filter === "custom") cs = cs.filter(c => c.custom);
    else if (D.filter !== "all") cs = cs.filter(c => App.pileOf(c.id) === D.filter);
    if (D.q){ const q = D.q.toLowerCase(); cs = cs.filter(c => c.name.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q)); }
    const base = {}; App.cards().forEach((c, k) => base[c.id] = k);
    if (D.sort === "shuffle"){
      if (!D.order || D.order.length !== App.cards().length) D.order = shuffled(App.cards().map(c => c.id));
      const pos = {}; D.order.forEach((id, k) => pos[id] = k);
      cs = cs.slice().sort((a, b) => (pos[a.id] ?? 1e9) - (pos[b.id] ?? 1e9));
    } else if (D.sort === "rank" && snap){
      const key = c => { const p = App.pileOf(c.id); return p === "core" ? snap.top.indexOf(c.id) : 100 + (p ? RANK[p] : 4) * 1000 + base[c.id]; };
      cs = cs.slice().sort((a, b) => key(a) - key(b));
    } else {
      cs = cs.slice().sort((a, b) => base[a.id] - base[b.id]);
    }
    return cs;
  }
  let cards = list();
  const clampI = () => { D.i = Math.min(Math.max(0, D.i || 0), Math.max(0, cards.length - 1)); };
  const pages = () => Math.max(1, Math.ceil(cards.length / PER));
  const clampP = () => { D.page = Math.min(Math.max(0, D.page || 0), pages() - 1); };
  clampI(); clampP();

  const body = h("div", {class: "deck-body"});
  const refilter = () => { cards = list(); D.i = 0; D.page = 0; draw(); App.save(); };

  /* ---------- shared controls ---------- */
  const search = h("input", {type: "search", id: "dq", placeholder: "Search values", value: D.q || "", autocomplete: "off", enterkeyhint: "search",
    oninput: e => { D.q = e.target.value.trim(); refilter(); }});
  const viewSw = h("div", {class: "view-sw", role: "radiogroup", "aria-label": "View"},
    [["card", "cards", "Card view"], ["grid", "grid", "Grid view"]].map(([v, ic, lbl]) =>
      h("button", {type: "button", role: "radio", "aria-checked": String(D.view === v), "aria-label": lbl, title: lbl, class: D.view === v ? "on" : "",
        onclick: () => { if (D.view === v) return; if (v === "grid") D.page = Math.floor(D.i / PER); D.from = null; D.view = v; App.save(); App.render(); }}, icon(ic))));
  const filters = App.segmented("flt", FILTERS, D.filter, v => { D.filter = v; refilter(); }, "Filter cards");
  filters.classList.add("scroll");
  const orderSel = h("select", {id: "dsort", "aria-label": "Order", onchange: e => {
      D.sort = e.target.value;
      if (D.sort === "shuffle") D.order = shuffled(App.cards().map(c => c.id));   // re-choosing Shuffle reshuffles
      cards = list(); D.i = 0; D.page = 0; draw(); App.save();
      App.announce(ORDERS.find(o => o[0] === D.sort)[1]);
    }},
    ORDERS.filter(([v]) => v !== "rank" || hasSnap).map(([v, l]) => h("option", {value: v, selected: D.sort === v}, l)));
  // whole pill is the tap target: an invisible native select covers it (native picker = easiest on phones)
  const orderTxt = h("span", {class: "order-txt", "aria-hidden": "true"}, ORDERS.find(o => o[0] === D.sort)[1]);
  orderSel.addEventListener("change", () => { orderTxt.textContent = ORDERS.find(o => o[0] === D.sort)[1]; orderSel.blur(); });
  const orderBox = h("div", {class: "order"}, icon("shuffle"), orderTxt, h("span", {class: "chev", "aria-hidden": "true"}, icon("down")), orderSel);
  const azBtn = h("button", {type: "button", class: "btn ghost sm az-btn", onclick: openAZ, "aria-label": "Jump to letter"}, "A–Z");

  /* ---------- card view ---------- */
  function cardView(dir){
    clampI();
    const stage = h("div", {class: "deck-stage"});
    const count = h("span", {class: "count", "aria-live": "polite"});
    const prev = h("button", {class: "icon-btn nav", "aria-label": "Previous card", onclick: () => go(-1)}, icon("back"));
    const next = h("button", {class: "icon-btn nav", "aria-label": "Next card", onclick: () => go(1)}, icon("next"));
    function show(d){
      if (!cards.length){ stage.replaceChildren(h("p", {class: "muted center"}, "No cards match.")); count.textContent = "0"; return; }
      const c = cards[D.i];
      const el = App.cardEl(c);
      const pile = App.pileOf(c.id);
      if (pile){
        const lbl = {core: "Top 10 #" + (snap.top.indexOf(c.id) + 1), most: "Matters most", some: "Matters some", not: "Doesn’t matter"}[pile];
        el.append(h("span", {class: "pile-tag " + pile}, lbl));
      }
      if (d && !App.reduced()) el.classList.add(d > 0 ? "in-next" : "in-prev");
      stage.replaceChildren(el);
      count.textContent = (D.i + 1) + " / " + cards.length;
      App.save();
      [1, -1].forEach(k => { const n = cards[(D.i + k + cards.length) % cards.length]; if (n && n.image) new Image().src = n.image; });
      let x0 = null, y0 = 0;
      el.addEventListener("pointerdown", e => { x0 = e.clientX; y0 = e.clientY; });
      el.addEventListener("pointerup", e => {
        if (x0 === null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)){ el.dataset.dragged = "1"; setTimeout(() => delete el.dataset.dragged, 30); go(dx < 0 ? 1 : -1); }
      });
    }
    function go(d){ if (!cards.length) return; D.i = (D.i + d + cards.length) % cards.length; show(d); }
    cardView.go = go;
    cardView.flip = () => { const b = stage.querySelector(".vbox"); b && b.flip(); };
    show(dir || 0);
    return h("div", {class: "deck-card"},
      h("div", {class: "deck-main"}, prev, stage, next),
      h("div", {class: "deck-bar"},
        D.from === "grid"
          ? h("button", {class: "btn ghost sm", onclick: () => { D.view = "grid"; D.page = Math.floor(D.i / PER); D.from = null; App.save(); App.render(); }}, icon("grid"), "Grid")
          : h("span", {class: "bar-spacer"}),
        count, h("span", {class: "muted small"}, "Tap to flip")));
  }

  /* ---------- grid view ---------- */
  function gridView(dir){
    clampP();
    const n = pages();
    const start = D.page * PER;
    const items = cards.slice(start, start + PER);
    const grid = h("ul", {class: "g-grid", "aria-label": "Cards " + (start + 1) + " to " + (start + items.length) + " of " + cards.length});
    items.forEach((c, k) => {
      const idx = start + k;
      const pile = App.pileOf(c.id);
      const rank = pile === "core" ? snap.top.indexOf(c.id) + 1 : 0;
      const label = App.title(c.name) + (rank ? ", top 10 number " + rank : pile === "most" ? ", matters most" : pile === "some" ? ", matters some" : pile === "not" ? ", doesn’t matter" : "");
      const btn = h("button", {class: "g-item", "aria-label": label + ". Tap to open, press and hold to peek."},
        c.image ? h("img", {src: c.image, alt: "", loading: k < 9 ? "eager" : "lazy", decoding: "async", draggable: "false"})
                : h("span", {class: "g-custom"}, h("small", null, "My value"), h("strong", null, App.title(c.name))),
        rank ? h("span", {class: "g-badge rank", "aria-hidden": "true"}, rank)
          : pile === "most" ? h("span", {class: "g-badge dot most", "aria-hidden": "true"})
          : pile === "some" ? h("span", {class: "g-badge dot some", "aria-hidden": "true"}) : null);
      // tap = open in card view; long-press = peek
      let t = null, peeked = false, sx = 0, sy = 0;
      btn.addEventListener("pointerdown", e => { peeked = false; sx = e.clientX; sy = e.clientY; clearTimeout(t); t = setTimeout(() => { peeked = true; App.vibrate(12); peek(c); }, 450); });
      btn.addEventListener("pointermove", e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clearTimeout(t); });
      ["pointerup", "pointercancel", "pointerleave"].forEach(ev => btn.addEventListener(ev, () => clearTimeout(t)));
      btn.addEventListener("contextmenu", e => e.preventDefault());
      btn.addEventListener("click", e => { if (peeked || grid.dataset.swiped){ e.preventDefault(); return; } D.i = idx; D.view = "card"; D.from = "grid"; App.save(); App.render(); });
      grid.append(h("li", null, btn));
    });
    if (!items.length) grid.append(h("li", {class: "g-empty"}, h("p", {class: "muted center"}, "No cards match.")));
    if (dir && !App.reduced()) grid.classList.add(dir > 0 ? "in-next" : "in-prev");
    // swipe between pages
    let x0 = null, y0 = 0;
    grid.addEventListener("pointerdown", e => { x0 = e.clientX; y0 = e.clientY; });
    grid.addEventListener("pointerup", e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2){ grid.dataset.swiped = "1"; setTimeout(() => delete grid.dataset.swiped, 50); page(dx < 0 ? 1 : -1); }
    });
    const wrapEl = h("div", {class: "deck-grid"}, h("div", {class: "g-wrap"}, grid), pager(n));
    requestAnimationFrame(() => fitGrid(grid));
    return wrapEl;
  }
  /* tile size: fit 3 rows when the screen allows, otherwise stay readable (min ~120px) and scroll under a sticky pager */
  function fitGrid(grid){
    if (!grid.isConnected) return;
    const gap = 10, ratio = 0.546;
    const wrap = grid.parentElement, pg = wrap.nextElementSibling;
    const tb = document.getElementById("tabbar");
    const bottomUI = tb && getComputedStyle(tb).display !== "none" ? innerHeight - tb.getBoundingClientRect().top + 8 : 12;
    const top = wrap.getBoundingClientRect().top + scrollY;
    const avail = innerHeight - top - (pg ? pg.offsetHeight : 0) - bottomUI - 12;
    const byW = (wrap.clientWidth - 2 * gap) / 3;
    const byH = (avail - 2 * gap) / 3 * ratio;
    // phones: fill the width (readable art) and let the sticky pager stay in reach; big screens: fit all 3 rows
    const w = Math.min(byW, Math.max(byH, Math.min(byW, 120)), 170);
    grid.style.setProperty("--w", Math.floor(w) + "px");
  }
  const onResize = () => { const g = body.querySelector(".g-grid"); if (g) fitGrid(g); };
  addEventListener("resize", onResize);
  function page(d){ const n = pages(); const p = Math.min(n - 1, Math.max(0, D.page + d)); if (p === D.page) return; D.page = p; App.save(); draw(d); App.announce("Page " + (p + 1) + " of " + n); }
  function goPage(p){ const d = p > D.page ? 1 : -1; if (p === D.page) return; D.page = p; App.save(); draw(d); App.announce("Page " + (p + 1) + " of " + pages()); }
  function pager(n){
    const cur = D.page;
    const nums = [];
    if (n <= 5) for (let k = 0; k < n; k++) nums.push(k);
    else {
      const set = new Set([0, n - 1, cur - 1, cur, cur + 1].filter(k => k >= 0 && k < n));
      if (cur <= 1) set.add(2); if (cur >= n - 2) set.add(n - 3);
      [...set].sort((a, b) => a - b).forEach((k, j, arr) => { if (j && k - arr[j - 1] > 1) nums.push("…"); nums.push(k); });
    }
    return h("nav", {class: "pager-g", "aria-label": "Pages"},
      h("button", {class: "icon-btn pg-arrow", "aria-label": "Previous page", disabled: cur === 0, onclick: () => page(-1)}, icon("back")),
      h("ol", {class: "pg-nums"}, nums.map(k => h("li", null, k === "…"
        ? h("span", {class: "pg-gap", "aria-hidden": "true"}, "…")
        : h("button", {class: "pg-num" + (k === cur ? " on" : ""), "aria-current": k === cur ? "page" : null, "aria-label": "Page " + (k + 1), onclick: () => goPage(k)}, k + 1)))),
      h("button", {class: "icon-btn pg-arrow", "aria-label": "Next page", disabled: cur >= n - 1, onclick: () => page(1)}, icon("next")),
      h("p", {class: "pg-of"}, "Page " + (cur + 1) + " of " + n));
  }

  /* long-press peek: card pops up and turns to its ideas; tap anywhere to close */
  function peek(c){
    const el = App.cardEl(c);
    const box = h("div", {class: "cardmodal peek"}, el, h("p", {class: "hint"}, "Tap outside to close"));
    App.modal(box, {label: App.title(c.name), cls: "cardview"});
    setTimeout(() => { if (!el.card.classList.contains("flipped")) el.flip(); }, App.reduced() ? 0 : 350);
  }

  /* A–Z jump: letters that exist in the current list are active */
  function openAZ(){
    const first = {};
    cards.forEach((c, k) => { const L = App.title(c.name).charAt(0).toUpperCase(); if (!(L in first)) first[L] = k; });
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let close;
    const body = h("div", {class: "confirm az"}, h("h2", null, "Jump to letter"),
      h("div", {class: "az-grid"}, letters.map(L => h("button", {class: "az-key", disabled: !(L in first), "aria-label": L in first ? "Jump to " + L : L + ", no cards",
        onclick: () => { close(); const k = first[L]; if (D.view === "grid") goPage(Math.floor(k / PER)); else { D.i = k; draw(0); } }}, L))),
      D.sort !== "deck" ? h("p", {class: "muted small center"}, "Tip: use Deck order to keep letters together.") : null);
    close = App.modal(body, {label: "Jump to letter", cls: "small"});
  }

  /* ---------- assemble ---------- */
  function draw(dir){
    const toolbar = h("div", {class: "deck-toolbar"}, orderBox, azBtn);
    body.replaceChildren(toolbar, D.view === "grid" ? gridView(dir) : cardView(dir));
  }

  const onKey = e => {
    if (e.target.closest("input,textarea,select,dialog")) return;
    if (D.view === "grid"){
      if (e.key === "ArrowRight" || e.key === "PageDown") page(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") page(-1);
    } else {
      if (e.key === "ArrowRight") cardView.go(1);
      else if (e.key === "ArrowLeft") cardView.go(-1);
      else if (e.key === "f" || e.key === "ArrowUp" || e.key === "ArrowDown"){ e.preventDefault(); cardView.flip(); }
    }
    if (e.key === "g"){ viewSw.querySelector(D.view === "grid" ? "[aria-label='Card view']" : "[aria-label='Grid view']").click(); }
  };
  document.addEventListener("keydown", onKey);

  const node = h("div", {class: "deck view-" + D.view},
    h("h1", {class: "sr", tabindex: "-1"}, "Deck"),
    h("div", {class: "deck-tools"},
      h("div", {class: "deck-top"}, h("label", {class: "search"}, icon("search"), h("span", {class: "sr"}, "Search values"), search), viewSw),
      FILTERS.length > 1 ? filters : null),   // only "All" (no sort yet, no own cards) → nothing to filter
    body);
  draw(0);
  return {node, cleanup: () => { document.removeEventListener("keydown", onKey); removeEventListener("resize", onResize); }};
});
})();
