/* Home + first-run onboarding. */
(function(){
"use strict";
const {h, icon} = App;

function greet(){
  const hr = new Date().getHours();
  return hr < 5 ? "Hello" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
}

function brand(){
  const u = App.user();
  const multi = App.users().length > 1;
  return h("header", {class: "brand"},
    h("div", null, h("p", {class: "eyebrow"}, greet() + (multi || u.name !== "Me" ? ", " + u.name : "")), h("h1", {tabindex: "-1"}, "Live Your Values")),
    h("button", {class: "me-btn", "aria-label": "Signed in as " + u.name + ". Switch person", onclick: () => { App.lock(); App.go("#/who"); }},
      App.avatar(u), multi ? h("span", {class: "sr"}, "Switch") : null));
}

App.route("", () => {
  const S = App.state();
  const core = App.core();
  const snap = App.latest();
  const inProg = S.sorts.me;

  if (!core.length){
    return h("div", {class: "home"},
      brand(),
      inProg ? App.resumeBanner() : null,
      App.installBanner(),
      h("section", {class: "hero"},
        h("div", {class: "fan big", "aria-hidden": "true"}, [2, 13, 41].map(n => { const c = App.card(n); return c ? h("img", {src: c.image, alt: ""}) : null; })),
        h("h2", null, "Discover what matters most to you"),
        h("p", null, "Sort 73 value cards into three piles, choose your top 10, then rank them. No right or wrong answers."),
        h("a", {class: "btn primary lg block", href: "#/sort"}, inProg ? "Continue sorting" : "Start the sort"),
        h("p", {class: "muted small center"}, "About 10–15 minutes · saved as you go · stays on this phone")),
      h("section", null, h("h2", {class: "h3"}, "Or explore"),
        h("div", {class: "tiles-2"},
          App.tool("#/deck", "cards", "Browse the deck", "Flip through all 73 cards"),
          App.tool("#/together", "people", "Sort together", "Pass the phone with friends"),
          App.tool("#/custom", "plus", "Add your own", "2 blank cards for your values"),
          App.tool("#/settings", "gear", "Settings", "Theme, text size, backup"))));
  }

  const due = App.checkinDue();
  const old = snap && App.daysSince(snap.date) >= 365;
  const top3 = core.slice(0, 3);
  return h("div", {class: "home"},
    brand(),
    inProg ? App.resumeBanner() : null,
    App.installBanner(),
    due ? h("a", {class: "banner warm", href: "#/reflect/new"}, icon("sun"),
      h("span", null, h("strong", null, "Time for your " + S.settings.cadence +" check-in"), h("span", null, "Two minutes. How did you live your values?")), icon("next")) : null,
    old ? h("a", {class: "banner", href: "#/sort"}, icon("history"),
      h("span", null, h("strong", null, "It’s been a year"), h("span", null, "Sort again to see how you’ve changed")), icon("next")) : null,
    h("section", {class: "top3"},
      h("div", {class: "row between"}, h("h2", {class: "h3"}, "Your top values"), h("a", {class: "link", href: "#/values"}, "See all 10", icon("next"))),
      h("ol", {class: "top3-row"}, top3.map((c, k) => h("li", null, h("button", {class: "t3", onclick: () => App.showCard(c.id, core.map(x => x.id))},
        App.thumb(c), h("span", {class: "rank-badge"}, k + 1), h("strong", null, App.title(c.name))))))),
    h("section", null, h("h2", {class: "h3"}, "Live them"),
      h("div", {class: "tiles-2"},
        App.tool("#/reflect", "sun", "Reflect", due ? "Check-in due" : "Daily, weekly or monthly"),
        App.tool("#/decide", "scale", "Decide", "Weigh a choice by your values"),
        App.tool("#/audit", "compass", "Life check", "Relationships, work, free time, health"),
        App.tool("#/journal", "pen", "Journal", "What each value means to you"))),
    h("section", null, h("h2", {class: "h3"}, "More"),
      h("div", {class: "tiles-2"},
        App.tool("#/together", "people", "Together", "Compare with others"),
        App.tool("#/history", "history", "History", "How your values change"),
        App.tool("#/deck", "cards", "Browse deck", "All 73 cards"),
        App.tool("#/custom", "plus", "My own cards", "Add missing values"))));
});

/* ---------- onboarding ---------- */
App.onboard = () => {
  const S = App.state();
  const slides = [
    {art: [30, 12, 41], t: "Welcome", p: "Your values are the principles that matter most to you. Knowing them makes decisions easier and life feel more like yours."},
    {art: [23, 66, 2], t: "Sort, choose, rank", p: "Sort 73 cards into three piles, pick your top 10, and rank them. Go with your gut. Choose who you are today."},
    {art: [26, 43, 27], t: "Then live them", p: "Journal, check your life, make decisions and reflect, all guided by your values. Everything stays private on this phone."}
  ];
  let k = 0;
  const body = h("div", {class: "onboard"});
  const draw = () => {
    const s = slides[k];
    body.replaceChildren(
      h("div", {class: "fan", "aria-hidden": "true"}, s.art.map(n => { const c = App.card(n); return c ? h("img", {src: c.image, alt: ""}) : null; })),
      h("h2", {tabindex: "-1"}, s.t), h("p", null, s.p),
      h("div", {class: "dots", "aria-label": "Page " + (k + 1) + " of 3"}, slides.map((_, i) => h("i", {class: i === k ? "on" : ""}))),
      h("div", {class: "row between"},
        k < 2 ? h("button", {class: "btn ghost", onclick: done}, "Skip") : h("span"),
        h("button", {class: "btn primary", onclick: () => { if (k < 2){ k++; draw(); } else done(); }}, k < 2 ? "Next" : "Get started")));
    body.querySelector("h2").focus();
  };
  let close;
  function done(){ S.settings.onboarded = true; App.save(true); close(); }
  close = App.modal(body, {label: "Welcome", cls: "onboard-modal"});
  body.closest("dialog").addEventListener("close", () => { S.settings.onboarded = true; App.save(true); });
  draw();
};
})();
