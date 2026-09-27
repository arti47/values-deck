/* Together: pass-the-phone group sorts + comparison + discussion. */
(function(){
"use strict";
const {h, icon} = App;
const QUESTIONS = [
  "What values do we share? Which are similar?",
  "Where do our values differ?",
  "Where might our values clash, and how can we work through that?",
  "How do our values show up in our relationships?",
  "How do our values support the work we do?",
  "How do our values complement one another?",
  "What can we learn from each other’s perspectives?"
];
const COLORS = ["#1f7a8c", "#c8553d", "#6a994e", "#8e6bb8", "#d08c1e", "#3d7cc9", "#b5487a", "#4f8a83"];

function status(pid){
  const S = App.state();
  if (S.sorts[pid]) return {k: "prog", t: "In progress"};
  const l = App.latest(pid);
  return l ? {k: "done", t: "Done " + App.fmtDate(l.date, {day: "numeric", month: "short"})} : {k: "none", t: "Not started"};
}

App.route("together", () => {
  const S = App.state();
  const people = S.profiles;
  const done = people.filter(p => App.latest(p.id));
  const input = h("input", {id: "pname", type: "text", placeholder: "Their name", autocomplete: "off", maxlength: 30, enterkeyhint: "done"});
  const addP = e => {
    e.preventDefault();
    const n = input.value.trim(); if (!n) { input.focus(); return; }
    const p = {id: "p" + App.uid(), name: n, color: COLORS[(people.length - 1) % COLORS.length]};
    S.profiles.push(p); App.save(true); App.render();
    App.toast(n + " added");
  };
  return h("div", null,
    App.head("Together", {back: "#/", sub: "Do the sort with friends, family or colleagues on this phone, then compare."}),
    h("ol", {class: "howto small"},
      h("li", null, "Add everyone taking part."),
      h("li", null, "Pass the phone. Each person sorts privately."),
      h("li", null, "Compare your values and talk them through.")),
    h("ul", {class: "people"}, people.map(p => {
      const st = status(p.id);
      const col = p.id === "me" ? "var(--teal)" : p.color;
      return h("li", {class: "person"},
        h("span", {class: "avatar", style: {background: col}, "aria-hidden": "true"}, p.name.slice(0, 1).toUpperCase()),
        h("span", {class: "pinfo"}, h("strong", null, p.id === "me" ? "Me" : p.name), h("span", {class: "pst " + st.k}, st.t)),
        h("a", {class: "btn sm " + (st.k === "done" ? "ghost" : "primary"), href: p.id === "me" ? "#/sort" : "#/handoff/" + p.id},
          st.k === "prog" ? "Resume" : st.k === "done" ? "Redo" : "Start"),
        p.id !== "me" ? h("button", {class: "icon-btn sm", "aria-label": "Remove " + p.name, onclick: async () => {
          if (await App.confirm("Remove " + p.name + "?", "Their sort results will be deleted from this phone.", {ok: "Remove", danger: true})){
            S.profiles = S.profiles.filter(x => x.id !== p.id);
            S.snapshots = S.snapshots.filter(x => x.profile !== p.id);
            delete S.sorts[p.id]; App.save(); App.render();
          }
        }}, icon("trash")) : null);
    })),
    h("form", {class: "add-person", onsubmit: addP},
      h("label", {for: "pname", class: "sr"}, "Add a person"), input,
      h("button", {class: "btn primary", type: "submit"}, icon("plus"), "Add")),
    h("a", {class: "btn primary block lg" + (done.length < 2 ? " disabled" : ""), href: done.length < 2 ? null : "#/compare",
      "aria-disabled": done.length < 2 ? "true" : null, onclick: e => { if (done.length < 2){ e.preventDefault(); App.toast("At least 2 people need to finish their sort."); } }},
      icon("people"), "Compare values"),
    done.length < 2 ? h("p", {class: "muted small center"}, "Compare unlocks when 2 or more people have finished.") : null);
});

App.route("handoff", (params) => {
  const p = App.profile(params[0]);
  if (!p) { App.go("#/together"); return h("div"); }
  return {focus: true, node: h("div", {class: "handoff"},
    h("div", {class: "avatar xl", style: {background: p.color}, "aria-hidden": "true"}, p.name.slice(0, 1).toUpperCase()),
    h("h1", {tabindex: "-1"}, "Pass the phone to " + p.name),
    h("p", {class: "lead"}, "Your answers stay private until you all compare."),
    h("a", {class: "btn primary lg block", href: "#/sort/" + p.id}, "I’m " + p.name + ", let’s go"),
    h("a", {class: "btn ghost block", href: "#/together"}, "Cancel"))};
});

App.route("compare", () => {
  const S = App.state();
  const all = S.profiles.filter(p => App.latest(p.id));
  if (all.length < 2) { App.go("#/together"); return h("div"); }
  let sel = (S.group.selected || all.map(p => p.id)).filter(id => all.some(p => p.id === id));
  if (sel.length < 2) sel = all.map(p => p.id);
  const name = p => p.id === "me" ? "Me" : p.name;
  const color = p => p.id === "me" ? "var(--teal)" : p.color;

  const picks = h("fieldset", {class: "who"}, h("legend", null, "Comparing"),
    all.map(p => h("label", {class: "who-chip"},
      h("input", {type: "checkbox", checked: sel.includes(p.id), onchange: e => {
        const next = e.target.checked ? sel.concat(p.id) : sel.filter(x => x !== p.id);
        if (next.length < 2){ e.target.checked = true; App.toast("Pick at least 2 people."); return; }
        S.group.selected = next; App.save(); App.render();
      }}), h("span", {class: "dot", style: {background: color(p)}}), name(p))));

  const ppl = all.filter(p => sel.includes(p.id));
  const tops = ppl.map(p => ({p, top: App.latest(p.id).top}));
  const count = {};
  tops.forEach(({top}) => top.forEach(id => count[id] = (count[id] || 0) + 1));
  const shared = Object.keys(count).filter(id => count[id] === ppl.length).map(Number);
  const some = Object.keys(count).filter(id => count[id] > 1 && count[id] < ppl.length).map(Number);
  const who = id => ppl.filter(p => App.latest(p.id).top.includes(id));
  const chip = id => { const c = App.card(id); return c ? h("button", {class: "chip", onclick: () => App.showCard(id)}, App.title(c.name)) : null; };

  return h("div", null,
    App.head("Compare", {back: "#/together"}),
    picks,
    h("section", {class: "cmp shared"}, h("h2", {class: "h3"}, icon("heart"), "Shared by everyone"),
      shared.length ? h("ul", {class: "chips"}, shared.map(id => h("li", null, chip(id)))) : h("p", {class: "muted small"}, "No value is in everyone’s top 10. That’s OK. Look at what overlaps below.")),
    some.length ? h("section", {class: "cmp"}, h("h2", {class: "h3"}, "Shared by some"),
      h("ul", {class: "overlap"}, some.map(id => h("li", null, chip(id),
        h("span", {class: "dots"}, who(id).map(p => h("span", {class: "dot", style: {background: color(p)}, title: name(p)}))),
        h("span", {class: "muted small"}, who(id).map(name).join(", ")))))) : null,
    h("section", {class: "cmp"}, h("h2", {class: "h3"}, "Unique to each person"),
      h("div", {class: "uniq"}, tops.map(({p, top}) => {
        const u = top.filter(id => count[id] === 1);
        return h("div", {class: "ucol", style: {"--pc": color(p)}}, h("h3", null, name(p)),
          u.length ? h("ul", {class: "chips"}, u.map(id => h("li", null, chip(id)))) : h("p", {class: "muted small"}, "Nothing unique"));
      }))),
    h("section", {class: "cmp"}, h("h2", {class: "h3"}, "Side by side"),
      h("div", {class: "side", role: "table", "aria-label": "Rankings side by side"},
        h("div", {role: "row", class: "side-row head"}, h("span", {role: "columnheader"}, "#"), tops.map(({p}) => h("span", {role: "columnheader", style: {color: color(p)}}, name(p)))),
        Array.from({length: 10}, (_, k) => h("div", {role: "row", class: "side-row"}, h("span", {role: "rowheader"}, k + 1),
          tops.map(({top}) => { const c = App.card(top[k]); const sh = count[top[k]] > 1; return h("span", {role: "cell", class: sh ? "sh" : ""}, c ? App.title(c.name) : ""); }))))),
    h("section", {class: "cmp"}, h("h2", {class: "h3"}, "Talk about it"),
      h("ol", {class: "qs"}, QUESTIONS.map((q, k) => h("li", null,
        App.field(q, {value: S.group.notes[k] || "", rows: 2, placeholder: "Notes (optional)", oninput: v => S.group.notes[k] = v}))))));
});
})();
