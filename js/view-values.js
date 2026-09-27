/* My values (core dashboard) + History of sorts. */
(function(){
"use strict";
const {h, icon} = App;

App.route("values", (params, q) => {
  const S = App.state();
  const snap = App.latest();
  const inProg = S.sorts.me;
  if (!snap){
    return h("div", null, App.head("My values"),
      inProg ? resume() : App.empty("No values yet", "Sort the deck to discover your top 10 core values.", h("a", {class: "btn primary", href: "#/sort"}, "Start the sort")));
  }
  const core = App.core();
  const ids = core.map(c => c.id);
  const fresh = q.get("new");
  const [one, ...rest] = core;

  const hero = h("button", {class: "hero-card", onclick: () => App.showCard(one.id, ids)},
    App.thumb(one, "lg"),
    h("span", {class: "hero-txt"},
      h("span", {class: "rank-badge big"}, "1"),
      h("strong", null, App.title(one.name)),
      h("em", null, one.definition)));

  const grid = h("ol", {class: "core-grid", start: 2}, rest.map((c, k) =>
    h("li", {class: k < 2 ? "top" : ""}, h("button", {class: "core-item", onclick: () => App.showCard(c.id, ids)},
      h("span", {class: "rank-badge"}, k + 2), App.thumb(c, "sm"),
      h("span", {class: "ci-txt"}, h("strong", null, App.title(c.name)), h("span", null, c.definition))))));

  const someIds = snap.some.concat(snap.most).filter(id => App.card(id));
  const someList = h("details", {class: "card-sec"},
    h("summary", null, h("span", null, "Also matters to me"), h("span", {class: "badge"}, someIds.length)),
    h("p", {class: "muted small"}, "Values that are important to you, just not your top 10."),
    h("ul", {class: "chips"}, someIds.map(id => h("li", null, h("button", {class: "chip", onclick: () => App.showCard(id, someIds)}, App.title(App.card(id).name))))));

  return h("div", null,
    App.head(fresh ? "Your core values" : "My values", {sub: "Sorted " + App.fmtDate(snap.date) + ". Tap any value for ideas.",
      right: h("a", {class: "icon-btn", href: "#/history", "aria-label": "History"}, icon("history"))}),
    fresh ? h("div", {class: "celebrate", role: "status"}, icon("sparkle"), h("p", null, h("strong", null, "Beautiful. "), "You now know your top 10 core values, and even your top 3 and your number 1. Use them as a filter for decisions big and small.")) : null,
    inProg ? resume() : null,
    hero, grid,
    h("section", {class: "next-steps"},
      h("h2", {class: "h3"}, "Put them to work"),
      h("div", {class: "tiles-2"},
        tool("#/journal", "pen", "Journal", "What each value means to you"),
        tool("#/audit", "compass", "Life check", "Are you living them?"),
        tool("#/decide", "scale", "Decide", "Make a choice with your values"),
        tool("#/reflect", "sun", "Reflect", "Quick check-in"))),
    someList,
    h("div", {class: "row center gap"},
      h("button", {class: "btn ghost", onclick: () => App.adjustSort()}, icon("pen"), "Adjust"),
      h("button", {class: "btn ghost", onclick: () => App.shareMine()}, icon("upload"), "Share"),
      h("a", {class: "btn ghost", href: "#/history"}, icon("history"), "History"),
      h("a", {class: "btn ghost", href: "#/sort"}, icon("shuffle"), "Sort again")));
});

function resume(){
  const s = App.state().sorts.me;
  const step = {piles: 1, pick: 2, rank: 3}[s.stage] || 1;
  return h("a", {class: "banner", href: "#/sort"}, icon("undo"),
    h("span", null, h("strong", null, "Continue your sort"), h("span", null, "You’re on step " + step + " of 3")), icon("next"));
}
App.resumeBanner = resume;

function tool(href, ic, title, sub){
  return h("a", {class: "tool", href}, h("span", {class: "tool-ic"}, icon(ic)), h("strong", null, title), h("span", null, sub));
}
App.tool = tool;

/* ---------- history ---------- */
App.route("history", (params) => {
  const S = App.state();
  const snaps = S.snapshots.filter(s => s.profile === "me").slice().reverse();
  if (!snaps.length) return h("div", null, App.head("History", {back: "#/values"}), App.needCore());
  const last = snaps[0];
  const age = App.daysSince(last.date);
  const list = h("ol", {class: "hist"});
  snaps.forEach((s, k) => {
    const prev = snaps[k + 1];
    const changes = prev ? diff(prev, s) : null;
    list.append(h("li", null, h("details", {open: k === 0},
      h("summary", null,
        h("span", {class: "hdate"}, App.fmtDate(s.date)),
        h("span", {class: "htop"}, s.top.slice(0, 3).map(id => App.card(id)).filter(Boolean).map(c => App.title(c.name)).join(" · "))),
      h("ol", {class: "hranks"}, s.top.map((id, r) => {
        const c = App.card(id); if (!c) return null;
        const ch = changes && changes.rank[id];
        return h("li", null, h("span", {class: "rnum"}, r + 1), App.vname(c, s.top),
          ch == null ? null : ch === "new" ? h("span", {class: "delta new"}, "New") :
          ch > 0 ? h("span", {class: "delta up", "aria-label": "up " + ch}, "▲" + ch) :
          ch < 0 ? h("span", {class: "delta down", "aria-label": "down " + -ch}, "▼" + -ch) : null);
      })),
      changes && changes.left.length ? h("p", {class: "muted small"}, "Left your top 10: " + changes.left.map(id => App.card(id) ? App.title(App.card(id).name) : "").join(", ")) : null,
      snaps.length > 1 ? h("button", {class: "link danger", onclick: async () => {
        if (await App.confirm("Delete this result?", "Sorted " + App.fmtDate(s.date) + ". This can’t be undone.", {ok: "Delete", danger: true})){
          S.snapshots = S.snapshots.filter(x => x.id !== s.id); App.save(); App.render();
        }
      }}, "Delete this result") : null)));
  });
  return h("div", null,
    App.head("History", {back: "#/values", sub: "See how your values shift over time."}),
    h("div", {class: "callout"}, icon("clock"), h("p", null,
      age >= 365 ? "It’s been over a year since your last sort. A great time to sort again." :
      "Tip: sort again once a year (like on your birthday) or every five years to see how you’ve grown. Core values mostly stay stable, but they can shift with life.")),
    list,
    h("a", {class: "btn primary block", href: "#/sort"}, "Sort again"));
});

function diff(prev, cur){
  const rank = {};
  cur.top.forEach((id, k) => { const p = prev.top.indexOf(id); rank[id] = p < 0 ? "new" : p - k; });
  return {rank, left: prev.top.filter(id => !cur.top.includes(id))};
}
})();
