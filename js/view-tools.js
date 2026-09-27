/* Journal, Life check (audit), Decide, Reflect. All use the "me" core values. */
(function(){
"use strict";
const {h, icon} = App;

/* ---------- Journal ---------- */
const JQ = [
  ["meaning", "What does this value mean to me?", "In my own words…"],
  ["why", "Why is it so important to me?", "Because…"],
  ["origin", "Where did it come from?", "A family member, a mentor, a life experience…"]
];
App.route("journal", (params) => {
  const core = App.core();
  if (!core.length) return h("div", null, App.head("Journal", {back: "#/"}), App.needCore());
  const J = App.state().journal;
  if (params[0]){
    const k = core.findIndex(c => c.id === +params[0]);
    const c = core[k];
    if (!c) { App.go("#/journal"); return h("div"); }
    const e = J[c.id] || (J[c.id] = {});
    const prev = core[(k - 1 + core.length) % core.length], next = core[(k + 1) % core.length];
    return h("div", {class: "journal"},
      App.head(App.title(c.name), {back: "#/journal", sub: "Value #" + (k + 1) + " · " + c.definition}),
      h("button", {class: "mini-card", onclick: () => App.showCard(c.id)}, App.thumb(c, "sm"), h("span", null, "View card & ideas"), icon("next")),
      JQ.map(([key, q, ph]) => App.field(q, {value: e[key] || "", placeholder: ph, rows: 3, oninput: v => { e[key] = v; e.updated = new Date().toISOString(); }})),
      h("nav", {class: "row between pager", "aria-label": "Other values"},
        h("a", {class: "btn ghost", href: "#/journal/" + prev.id}, icon("back"), App.title(prev.name)),
        h("a", {class: "btn ghost", href: "#/journal/" + next.id}, App.title(next.name), icon("next"))));
  }
  const done = c => JQ.filter(([k]) => (J[c.id] || {})[k] && J[c.id][k].trim()).length;
  return h("div", null,
    App.head("Journal", {back: "#/", sub: "Dig deeper. Write what each value means to you, why it matters, and where it came from. Your meaning can differ from the card’s definition."}),
    h("ol", {class: "list"}, core.map((c, k) => {
      const n = done(c);
      return h("li", null, h("a", {class: "list-row", href: "#/journal/" + c.id},
        h("span", {class: "rank-badge"}, k + 1),
        h("span", {class: "lr-txt"}, h("strong", null, App.title(c.name)), h("span", null, n === 3 ? "Complete" : n ? n + " of 3 answered" : "Not started")),
        h("span", {class: "dots", "aria-hidden": "true"}, [0, 1, 2].map(i => h("i", {class: i < n ? "on" : ""}))),
        icon("next")));
    })));
});

/* ---------- Life check (audit) ---------- */
const AREAS = [
  {id: "rel", short: "People", name: "Relationships", q: "How do my values show up in my relationships? Where is there tension, and could it come from different values?",
    tip: "People with complementary values tend to make close relationships easier. Notice who lifts these values up."},
  {id: "work", short: "Work", name: "Work", q: "How well does my work (or how I show up as a parent, volunteer or caregiver) match these values?",
    tip: "Small changes count: one project, one boundary, one conversation."},
  {id: "leisure", short: "Free time", name: "Free time", q: "Do I have free time? Do I spend it in ways that honor my values?",
    tip: "Put your top values into your calendar: time for yourself, friends, creativity, whatever matters most."},
  {id: "health", short: "Health", name: "Body & mind", q: "How do my values support my physical and mental health? Where is there conflict?",
    tip: "Pick one daily habit that serves a top value."}
];
const ALABELS = ["Not at all", "A little", "Somewhat", "Mostly", "Fully"];
App.route("audit", (params) => {
  const core = App.core();
  if (!core.length) return h("div", null, App.head("Life check", {back: "#/"}), App.needCore());
  const A = App.state().audit;
  const tab = params[0] || "rel";
  const tabs = h("nav", {class: "tabs", "aria-label": "Life areas"},
    AREAS.map(a => h("a", {href: "#/audit/" + a.id, "aria-current": tab === a.id ? "page" : null}, a.name, h("span", {class: "tab-n"}, filled(a.id) + "/" + core.length))),
    h("a", {href: "#/audit/summary", "aria-current": tab === "summary" ? "page" : null}, "Summary"));
  function filled(aid){ const m = A[aid] || {}; return core.filter(c => m[c.id] && m[c.id].s).length; }

  if (tab === "summary") return h("div", null, App.head("Life check", {back: "#/"}), tabs, summary(core, A));
  const area = AREAS.find(a => a.id === tab) || AREAS[0];
  const m = A[area.id] || (A[area.id] = {});
  const idx = AREAS.indexOf(area);
  return h("div", null,
    App.head("Life check", {back: "#/", sub: "Rate how well each area of life lines up with your values."}),
    tabs,
    h("div", {class: "callout"}, icon("compass"), h("div", null, h("p", null, h("strong", null, area.name + ". "), area.q), h("p", {class: "muted small"}, area.tip))),
    h("ol", {class: "rate-list"}, core.map(c => {
      const e = m[c.id] || {};
      const noteId = "n-" + area.id + "-" + c.id;
      const note = h("div", {class: "note", hidden: !e.n},
        App.field("Note on " + App.title(c.name), {value: e.n || "", rows: 2, id: noteId, placeholder: "What’s working? What could change?",
          oninput: v => { (m[c.id] = m[c.id] || {}).n = v; }}));
      return h("li", {class: "rate-row"},
        h("div", {class: "rr-head"}, h("strong", {id: "l-" + area.id + c.id}, App.title(c.name)),
          h("button", {class: "link sm", onclick: () => { note.hidden = !note.hidden; if (!note.hidden) note.querySelector("textarea").focus(); }}, icon("pen"), "Note")),
        (() => { const r = App.rating("r-" + area.id + "-" + c.id, e.s, v => { (m[c.id] = m[c.id] || {}).s = v; App.save(); }, ALABELS); r.setAttribute("aria-labelledby", "l-" + area.id + c.id); return r; })(),
        h("div", {class: "scale-legend", "aria-hidden": "true"}, h("span", null, "Not at all"), h("span", null, "Fully")),
        note);
    })),
    h("div", {class: "row end"},
      h("a", {class: "btn primary", href: "#/audit/" + (AREAS[idx + 1] ? AREAS[idx + 1].id : "summary")}, AREAS[idx + 1] ? "Next: " + AREAS[idx + 1].name : "See summary", icon("next"))));
});

function summary(core, A){
  const cells = [];
  const grid = h("div", {class: "heat", role: "table", "aria-label": "Alignment by value and life area", style: {"--cols": AREAS.length}},
    h("div", {role: "row", class: "heat-row head"}, h("span", {role: "columnheader"}, ""), AREAS.map(a => h("span", {role: "columnheader", title: a.name}, a.short))),
    core.map(c => h("div", {role: "row", class: "heat-row"},
      h("span", {role: "rowheader"}, App.title(c.name)),
      AREAS.map(a => {
        const s = ((A[a.id] || {})[c.id] || {}).s;
        if (s) cells.push({c, a, s});
        return h("span", {role: "cell", class: "hc s" + (s || 0), "aria-label": a.name + ": " + (s ? ALABELS[s - 1] : "not rated")}, s || "–");
      }))));
  const avg = AREAS.map(a => {
    const v = core.map(c => ((A[a.id] || {})[c.id] || {}).s).filter(Boolean);
    return {a, v: v.length ? v.reduce((x, y) => x + y, 0) / v.length : null};
  });
  const low = cells.filter(x => x.s <= 2).sort((x, y) => x.s - y.s).slice(0, 3);
  if (!cells.length) return h("div", null, App.empty("Nothing rated yet", "Rate each life area first. It takes about 5 minutes.", h("a", {class: "btn primary", href: "#/audit/rel"}, "Start with Relationships")));
  return h("div", null,
    h("div", {class: "area-bars"}, avg.map(({a, v}) => h("div", {class: "abar"},
      h("span", null, a.name),
      h("span", {class: "abar-track"}, h("span", {style: {width: v ? (v / 5 * 100) + "%" : "0"}})),
      h("b", null, v ? v.toFixed(1) : "–")))),
    grid,
    h("div", {class: "heat-legend", "aria-hidden": "true"}, [1, 2, 3, 4, 5].map(n => h("span", {class: "hc s" + n}, n)), h("span", {class: "muted small"}, "1 = not at all · 5 = fully")),
    low.length ? h("section", null, h("h2", {class: "h3"}, "Where to focus"),
      h("ul", {class: "focus-list"}, low.map(({c, a}) => h("li", {class: "focus-item"},
        h("p", {class: "fhead"}, h("strong", null, App.title(c.name)), " in ", a.name.toLowerCase()),
        c.actions.length ? h("p", null, h("span", {class: "muted"}, "Try this: "), c.actions[(c.id + a.id.length) % c.actions.length]) : null,
        h("button", {class: "link sm", onclick: () => App.showCard(c.id)}, "More ideas", icon("next")))))) :
      h("div", {class: "celebrate"}, icon("sparkle"), h("p", null, "No low scores. Your life and values are well aligned.")));
}

/* ---------- Decide ---------- */
App.route("decide", (params) => {
  const core = App.core();
  if (!core.length) return h("div", null, App.head("Decide", {back: "#/"}), App.needCore());
  const S = App.state();
  if (params[0] === "new"){
    const d = {id: App.uid(), title: "", date: new Date().toISOString(), answers: {}, a: "", b: "", tension: "", choice: ""};
    S.decisions.unshift(d); App.save(true);
    location.replace("#/decide/" + d.id); return h("div");
  }
  if (params[0]){
    const d = S.decisions.find(x => x.id === params[0]);
    if (!d){ App.go("#/decide"); return h("div"); }
    const touch = () => { d.date = new Date().toISOString(); };
    const opt = sel => [h("option", {value: ""}, "Choose a value")].concat(core.map(c => h("option", {value: c.id, selected: String(c.id) === String(sel)}, App.title(c.name))));
    const selA = h("select", {id: "va", onchange: e => { d.a = e.target.value; touch(); App.save(); }}, opt(d.a));
    const selB = h("select", {id: "vb", onchange: e => { d.b = e.target.value; touch(); App.save(); }}, opt(d.b));
    return h("div", {class: "decide"},
      App.head(d.title || "New decision", {back: "#/decide"}),
      h("div", {class: "field big"}, h("label", {for: "dt"}, "What are you deciding?"),
        h("input", {id: "dt", type: "text", value: d.title, placeholder: "e.g. Should I take the new job?", autocomplete: "off",
          oninput: e => { d.title = e.target.value; touch(); App.save(); App.$(".phead h1").textContent = d.title || "New decision"; }})),
      h("h2", {class: "h3"}, "Go through your values"),
      h("p", {class: "muted small"}, "For each one: how could you make this choice in a way that honors it? Skip any that don’t apply."),
      h("ol", {class: "dlist"}, core.map((c, k) => h("li", null,
        App.field(h("span", null, h("span", {class: "rank-badge sm"}, k + 1), " ", App.title(c.name)), {value: d.answers[c.id] || "", rows: 2,
          placeholder: "How can I honor " + App.title(c.name).toLowerCase() + " here?", oninput: v => { d.answers[c.id] = v; touch(); }})))),
      h("section", {class: "card-sec"},
        h("h2", {class: "h3"}, "Values pulling in different directions?"),
        h("p", {class: "muted small"}, "Example: Adventure says “go on the trip”, Solitude says “stay home”. There’s no perfect decision. Honor what you need most right now: you could go, and tell friends ahead of time that you’ll need some time alone."),
        h("div", {class: "row wrap gap"}, h("label", {class: "sel"}, h("span", null, "This value"), selA), h("span", {class: "vs"}, "vs"), h("label", {class: "sel"}, h("span", null, "that value"), selB)),
        App.field("What matters most right now? How could you honor both?", {value: d.tension, rows: 2, oninput: v => { d.tension = v; touch(); }})),
      App.field("My decision", {value: d.choice, rows: 2, placeholder: "I’ve decided to…", oninput: v => { d.choice = v; touch(); }}),
      h("div", {class: "row between"},
        h("button", {class: "btn ghost danger", onclick: async () => {
          if (await App.confirm("Delete this decision?", null, {ok: "Delete", danger: true})){ S.decisions = S.decisions.filter(x => x.id !== d.id); App.save(); App.go("#/decide"); }
        }}, icon("trash"), "Delete"),
        h("a", {class: "btn primary", href: "#/decide"}, icon("check"), "Done")));
  }
  return h("div", null,
    App.head("Decide", {back: "#/", sub: "Facing a choice, especially one with mixed feelings? Lay out your 10 values and ask how you can decide in a way that honors each."}),
    h("a", {class: "btn primary block lg", href: "#/decide/new"}, icon("plus"), "New decision"),
    S.decisions.length ? h("ul", {class: "list"}, S.decisions.map(d => {
      const n = Object.values(d.answers).filter(v => v && v.trim()).length;
      return h("li", null, h("a", {class: "list-row", href: "#/decide/" + d.id},
        h("span", {class: "lr-txt"}, h("strong", null, d.title || "Untitled decision"),
          h("span", null, App.fmtDate(d.date) + " · " + (d.choice && d.choice.trim() ? "Decided" : n + " of " + core.length + " values considered"))),
        icon("next")));
    })) : h("p", {class: "muted center"}, "Your decisions will be saved here."));
});

/* ---------- Reflect ---------- */
const RLABELS = ["Barely", "A little", "Somewhat", "Mostly", "Fully"];
App.route("reflect", (params) => {
  const core = App.core();
  if (!core.length) return h("div", null, App.head("Reflect", {back: "#/"}), App.needCore());
  const S = App.state();
  if (params[0] === "new"){
    const r = {scores: {}, notes: {}, note: ""};
    const per = {daily: "today", weekly: "this week", monthly: "this month"}[S.settings.cadence];
    const save = h("button", {class: "btn primary lg", onclick: () => {
      if (!Object.keys(r.scores).length){ App.toast("Rate at least one value first."); return; }
      S.reflections.push(Object.assign({id: App.uid(), date: new Date().toISOString(), cadence: S.settings.cadence}, r));
      App.save(true); App.confetti(); App.toast("Check-in saved"); App.go("#/reflect");
    }}, icon("check"), "Save check-in");
    return {focus: false, tab: "home", node: h("div", null,
      App.head("Check-in", {back: "#/reflect", sub: "How fully did you live each value " + per + "?"}),
      h("ol", {class: "rate-list"}, core.map(c => {
        const note = h("div", {class: "note", hidden: true}, App.field("Note on " + App.title(c.name), {rows: 2, placeholder: "What helped or got in the way?", oninput: v => r.notes[c.id] = v}));
        const rt = App.rating("rf-" + c.id, null, v => r.scores[c.id] = v, RLABELS);
        rt.setAttribute("aria-labelledby", "rl-" + c.id);
        return h("li", {class: "rate-row"},
          h("div", {class: "rr-head"}, h("strong", {id: "rl-" + c.id}, App.title(c.name)),
            h("button", {class: "link sm", onclick: () => { note.hidden = !note.hidden; if (!note.hidden) note.querySelector("textarea").focus(); }}, icon("pen"), "Note")),
          rt, h("div", {class: "scale-legend", "aria-hidden": "true"}, h("span", null, "Barely"), h("span", null, "Fully")), note);
      })),
      App.field("Anything to change going forward?", {rows: 3, placeholder: "Next " + per.replace("this ", "").replace("today", "day") + " I will…", oninput: v => r.note = v}),
      h("div", {class: "wiz-foot sticky"}, h("a", {class: "btn ghost", href: "#/reflect"}, "Cancel"), save))};
  }
  const R = S.reflections;
  const last = R[R.length - 1];
  const due = App.checkinDue();
  const recent = R.slice(-12);
  return h("div", null,
    App.head("Reflect", {back: "#/", sub: "Use your values as a filter to look back on your day, week or month. Living your values is a daily or weekly habit, not a once-a-year thing."}),
    h("div", {class: "field"}, h("span", {class: "label"}, "How often?"),
      App.segmented("cad", [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]], S.settings.cadence, v => { S.settings.cadence = v; App.save(); App.render(); }, "Check-in frequency")),
    h("div", {class: "checkin-cta" + (due ? " due" : "")},
      h("p", null, due ? h("strong", null, "Your check-in is due.") : h("span", null, "Last check-in: " + App.fmtDate(last.date) + ".")),
      h("a", {class: "btn primary block lg", href: "#/reflect/new"}, icon("sun"), due ? "Start check-in" : "Check in again")),
    R.length ? h("section", null,
      h("h2", {class: "h3"}, "Trends"),
      h("ul", {class: "trends"}, core.map(c => {
        const vals = recent.map(r => r.scores[c.id]).filter(Boolean);
        const lastV = vals[vals.length - 1];
        return h("li", null, h("span", {class: "tn"}, App.title(c.name)), App.spark(vals),
          h("b", {"aria-label": lastV ? "latest " + lastV + " of 5" : "no data"}, lastV || "–"));
      })),
      h("h2", {class: "h3"}, "Past check-ins"),
      h("ul", {class: "list"}, R.slice().reverse().map(r => {
        const v = Object.values(r.scores); const avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
        return h("li", null, h("details", {class: "list-row col"},
          h("summary", null, h("strong", null, App.fmtDate(r.date)), h("span", {class: "muted"}, " · average " + avg.toFixed(1) + " / 5")),
          h("ul", {class: "mini"}, Object.keys(r.scores).map(id => { const c = App.card(id); return c ? h("li", null, App.title(c.name) + ": " + r.scores[id] + (r.notes && r.notes[id] ? " — " + r.notes[id] : "")) : null; })),
          r.note ? h("p", {class: "quote"}, r.note) : null,
          h("button", {class: "link danger sm", onclick: async () => { if (await App.confirm("Delete this check-in?", null, {ok: "Delete", danger: true})){ S.reflections = S.reflections.filter(x => x.id !== r.id); App.save(); App.render(); } }}, "Delete")));
      }))) : h("p", {class: "muted center"}, "Your trends appear after your first check-in."));
});
})();
