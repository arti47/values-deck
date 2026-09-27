/* Browse deck: flip viewer with search + pile filters. */
(function(){
"use strict";
const {h, icon} = App;

App.route("deck", () => {
  const S = App.state();
  const D = S.deck;
  const hasSnap = !!App.latest();
  const FILTERS = [["all", "All"]].concat(hasSnap ? [["core", "My top 10"], ["most", "Most"], ["some", "Some"], ["not", "Not"]] : [])
    .concat(App.cards().some(c => c.custom) ? [["custom", "Mine"]] : []);
  if (!FILTERS.some(f => f[0] === D.filter)) D.filter = "all";

  function list(){
    let cs = App.cards();
    if (D.filter === "core") cs = App.core();
    else if (D.filter === "custom") cs = cs.filter(c => c.custom);
    else if (D.filter !== "all") cs = cs.filter(c => App.pileOf(c.id) === D.filter);
    if (D.q) { const q = D.q.toLowerCase(); cs = cs.filter(c => c.name.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q)); }
    if (D.order && D.filter !== "core"){ const pos = {}; D.order.forEach((id, k) => pos[id] = k); cs = cs.slice().sort((a, b) => (pos[a.id] ?? 1e9) - (pos[b.id] ?? 1e9)); }
    return cs;
  }
  let cards = list();
  D.i = Math.min(D.i || 0, Math.max(0, cards.length - 1));

  const stage = h("div", {class: "deck-stage"});
  const count = h("span", {class: "count", "aria-live": "polite"});
  const prev = h("button", {class: "icon-btn nav", "aria-label": "Previous card", onclick: () => go(-1)}, icon("back"));
  const next = h("button", {class: "icon-btn nav", "aria-label": "Next card", onclick: () => go(1)}, icon("next"));
  const shuffle = h("button", {class: "btn ghost sm", "aria-pressed": String(!!D.order), onclick: () => {
    if (D.order) D.order = null;
    else { const ids = App.cards().map(c => c.id); for (let k = ids.length - 1; k > 0; k--){ const r = Math.floor(Math.random() * (k + 1)); [ids[k], ids[r]] = [ids[r], ids[k]]; } D.order = ids; }
    shuffle.setAttribute("aria-pressed", String(!!D.order));
    App.save(); cards = list(); D.i = 0; show(1);
    App.announce(D.order ? "Shuffled" : "In order");
  }}, icon("shuffle"), "Shuffle");

  function show(dir){
    if (!cards.length){
      stage.replaceChildren(h("p", {class: "muted center"}, "No cards match."));
      count.textContent = "0"; return;
    }
    const c = cards[D.i];
    const el = App.cardEl(c);
    const pile = App.pileOf(c.id);
    if (pile){
      const lbl = {core: "Top 10 #" + (App.latest().top.indexOf(c.id) + 1), most: "Matters most", some: "Matters some", not: "Doesn’t matter"}[pile];
      el.append(h("span", {class: "pile-tag " + pile}, lbl));
    }
    if (dir && !App.reduced()) el.classList.add(dir > 0 ? "in-next" : "in-prev");
    stage.replaceChildren(el);
    count.textContent = (D.i + 1) + " / " + cards.length;
    App.save();
    [1, -1].forEach(d => { const n = cards[(D.i + d + cards.length) % cards.length]; if (n && n.image) new Image().src = n.image; });
    // swipe
    let x0 = null, y0 = 0;
    el.addEventListener("pointerdown", e => { x0 = e.clientX; y0 = e.clientY; });
    el.addEventListener("pointerup", e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)){ el.dataset.dragged = "1"; setTimeout(() => delete el.dataset.dragged, 30); go(dx < 0 ? 1 : -1); }
    });
  }
  function go(d){ if (!cards.length) return; D.i = (D.i + d + cards.length) % cards.length; show(d); }

  const search = h("input", {type: "search", id: "dq", placeholder: "Search values", value: D.q || "", autocomplete: "off",
    oninput: e => { D.q = e.target.value.trim(); cards = list(); D.i = 0; show(0); }});
  const filters = App.segmented("flt", FILTERS, D.filter, v => { D.filter = v; cards = list(); D.i = 0; show(0); App.save(); }, "Filter cards");
  filters.classList.add("scroll");

  const onKey = e => {
    if (e.target.closest("input,textarea,select,dialog")) return;
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "f" || e.key === "ArrowUp" || e.key === "ArrowDown"){ const b = stage.querySelector(".vbox"); if (b){ e.preventDefault(); b.flip(); } }
    else if (e.key === "s") shuffle.click();
  };
  document.addEventListener("keydown", onKey);

  const node = h("div", {class: "deck"},
    h("h1", {class: "sr", tabindex: "-1"}, "Deck"),
    h("div", {class: "deck-tools"},
      h("label", {class: "search"}, icon("search"), h("span", {class: "sr"}, "Search values"), search),
      FILTERS.length > 1 ? filters : null),   // only "All" (no sort yet, no own cards) → nothing to filter
    h("div", {class: "deck-main"}, prev, stage, next),
    h("div", {class: "deck-bar"}, shuffle, count, h("span", {class: "muted small"}, "Tap to flip")));
  show(0);
  return {node, cleanup: () => document.removeEventListener("keydown", onKey)};
});
})();
