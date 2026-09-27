/* Sort together: device-level group. Participants are the device's people; each sorts into their own profile. */
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

/* ---------- group home ---------- */
App.route("together", () => {
  const g = App.group();
  const me = App.needsPicker() ? null : App.user();
  const people = App.users();
  const rows = people.map(u => {
    const st = App.personStatus(u.id);
    const on = g.members.includes(u.id);
    const priv = u.share === false;
    return h("li", {class: "person" + (on ? "" : " off")},
      h("label", {class: "pick"},
        h("input", {type: "checkbox", checked: on, "aria-label": "Include " + u.name, onchange: e => {
          g.members = e.target.checked ? g.members.concat(u.id) : g.members.filter(x => x !== u.id);
          App.saveGroup(g); App.render();
        }}),
        App.avatar(u)),
      h("span", {class: "pinfo"}, h("strong", null, u.name + (me && me.id === u.id ? " (you)" : "")),
        h("span", {class: "pst " + st.k}, st.t + (priv ? " · values private" : ""), u.pin ? h("span", {class: "sr"}, ", PIN protected") : null)),
      on ? h("a", {class: "btn sm " + (st.k === "done" ? "ghost" : "primary"), href: "#/handoff/" + u.id},
        st.k === "prog" ? "Resume" : st.k === "done" ? "Redo" : "Start") : null);
  });
  const contacts = me ? App.contacts() : [];
  const gc = g.contacts || [];
  const ready = g.members.map(id => App.user(id)).filter(u => u && u.share !== false && App.personStatus(u.id).snap)
    .concat(contacts.filter(c => gc.includes(c.id)));

  const input = h("input", {id: "pname", type: "text", placeholder: "Name", autocomplete: "off", maxlength: 30, enterkeyhint: "done"});
  const addP = e => {
    e.preventDefault();
    const n = input.value.trim(); if (!n){ input.focus(); App.toast("Type a name first."); return; }
    if (people.some(u => u.name.toLowerCase() === n.toLowerCase())){ App.toast("That name is already used."); return; }
    const u = App.addUser(n);
    g.members.push(u.id); App.saveGroup(g);
    App.toast(n + " added"); App.render();
  };
  const inGroup = App.inGroup();
  return h("div", null,
    App.head("Sort together", {back: me ? "#/" : "#/who", sub: "Sort with family or friends on this phone. Everyone’s values are saved in their own profile."}),
    h("ol", {class: "howto small"},
      h("li", null, "Tick who’s taking part. Add anyone new."),
      h("li", null, "Tap Start and pass the phone. Each person sorts privately."),
      h("li", null, "Compare your values and talk them through.")),
    h("ul", {class: "people group"}, rows),
    h("form", {class: "add-person", onsubmit: addP},
      h("label", {for: "pname", class: "sr"}, "Add someone new"), input,
      h("button", {class: "btn primary", type: "submit"}, icon("plus"), "Add")),
    me ? h("section", null, h("h2", {class: "h3"}, "Shared from other phones"),
      contacts.length ? h("ul", {class: "people group"}, contacts.map(c => h("li", {class: "person" + (gc.includes(c.id) ? "" : " off")},
        h("label", {class: "pick"},
          h("input", {type: "checkbox", checked: gc.includes(c.id), "aria-label": "Include " + c.name, onchange: e => {
            g.contacts = e.target.checked ? gc.concat(c.id) : gc.filter(x => x !== c.id); App.saveGroup(g); App.render(); }}),
          h("span", {class: "avatar", style: {background: c.color}, "aria-hidden": "true"}, c.name.slice(0, 1).toUpperCase())),
        h("span", {class: "pinfo"}, h("strong", null, c.name, " ", icon("upload", "shared-ic")), h("span", {class: "pst done"}, c.date ? "Shared · sorted " + App.fmtDate(c.date + "T12:00:00", {day: "numeric", month: "short"}) : "Shared")),
        h("button", {class: "icon-btn sm", "aria-label": "Remove " + c.name, onclick: async () => {
          if (await App.confirm("Remove " + c.name + "?", c.name + "’s shared values will be removed from " + App.user().name + "’s profile.", {ok: "Remove", danger: true})){
            const S = App.state(); S.contacts = App.contacts().filter(x => x.id !== c.id); App.save(); App.render(); }
        }}, icon("trash"))))) : h("p", {class: "muted small"}, "Someone on another phone can send you their values."),
      h("div", {class: "row wrap gap-sm"},
        h("button", {class: "btn ghost", onclick: () => App.pasteShared()}, icon("plus"), "Add shared values"),
        App.latest() ? h("button", {class: "btn ghost", onclick: () => App.shareMine()}, icon("upload"), "Share mine") : null)) : null,
    h("a", {class: "btn primary block lg" + (ready.length < 2 ? " disabled" : ""), href: ready.length < 2 ? null : "#/compare",
      "aria-disabled": ready.length < 2 ? "true" : null, onclick: e => { if (ready.length < 2){ e.preventDefault(); App.toast("At least 2 people need to finish their sort."); } }},
      icon("people"), ready.length >= 2 ? "Compare " + ready.length + " people" : "Compare values"),
    ready.length < 2 ? h("p", {class: "muted small center"}, "Compare unlocks when 2 or more people have finished.") : null,
    inGroup || !me ? h("button", {class: "btn ghost block", style: {marginTop: "12px"}, onclick: () => { App.setGroup(false); App.lock(); App.go("#/who"); }},
      icon("check"), "Finish & hand back") : null);
});

/* ---------- pass the phone ---------- */
App.route("handoff", (params) => {
  const u = App.user(params[0]);
  if (!u) { App.go("#/together"); return h("div"); }
  const go = async () => {
    const same = !App.needsPicker() && App.user().id === u.id;
    if (!same && u.pin){
      const ok = await App.pinPad("Hi " + u.name, {check: p => App.hashPin(p) === u.pin, forgot: () => App.forgotPin(u)});
      if (!ok) return;
    }
    App.setGroup(true);
    App.switchUser(u.id);
    App.go("#/sort");
  };
  return {focus: true, node: h("div", {class: "handoff"},
    App.avatar(u, "xl"),
    h("h1", {tabindex: "-1"}, "Pass the phone to " + u.name),
    h("p", {class: "lead"}, "Your answers are saved to your own profile and stay private until you compare."),
    h("button", {class: "btn primary lg block", onclick: go}, u.pin ? icon("lock") : null, "I’m " + u.name + ", let’s go"),
    h("a", {class: "btn ghost block", href: "#/together"}, "Cancel"))};
});

App.route("compare", () => {
  const g = App.group();
  // group members who have sorted and share their top 10
  const all = g.members.map(id => App.user(id)).filter(u => u && u.share !== false)
    .map(u => ({u, st: App.personStatus(u.id)})).filter(x => x.st.snap)
    .map(({u, st}) => ({id: u.id, name: u.name, color: u.color, top: st.snap.top}))
    .concat(App.needsPicker() ? [] : App.contacts().filter(c => (g.contacts || []).includes(c.id)).map(c => ({id: c.id, name: c.name, color: c.color, top: c.top, contact: c})));
  // custom cards (id > 100) are personal: give each person's its own key so different people's customs never "match"
  const ext = {};
  all.forEach((p, pi) => { p.top = p.top.map(id => {
    if (id <= 100) return id;
    const key = -(pi * 1000 + id);
    if (p.contact){ const x = p.contact.x[id]; if (x) ext[key] = {id: key, name: x[0].toUpperCase(), definition: x[1], actions: [], image: null, custom: true}; }
    else { const st = App.peekState(p.id); const c = st && (st.custom || []).find(v => v.id === id); if (c && c.name) ext[key] = {id: key, name: c.name.toUpperCase(), definition: c.definition, actions: c.actions || [], image: null, custom: true, own: p.id === App.user().id ? id : null}; }
    return key; }); });
  if (all.length < 2) { App.go("#/together"); return h("div"); }
  let sel = (g.selected || all.map(p => p.id)).filter(id => all.some(p => p.id === id));
  if (sel.length < 2) sel = all.map(p => p.id);
  const name = p => p.name;
  const color = p => p.color;

  const picks = h("fieldset", {class: "who"}, h("legend", null, "Comparing"),
    all.map(p => h("label", {class: "who-chip"},
      h("input", {type: "checkbox", checked: sel.includes(p.id), onchange: e => {
        const next = e.target.checked ? sel.concat(p.id) : sel.filter(x => x !== p.id);
        if (next.length < 2){ e.target.checked = true; App.toast("Pick at least 2 people."); return; }
        g.selected = next; App.saveGroup(g); App.render();
      }}), h("span", {class: "dot", style: {background: color(p)}}), name(p))));

  const ppl = all.filter(p => sel.includes(p.id));
  const tops = ppl.map(p => ({p, top: p.top}));
  const count = {};
  tops.forEach(({top}) => top.forEach(id => count[id] = (count[id] || 0) + 1));
  const shared = Object.keys(count).filter(id => count[id] === ppl.length).map(Number);
  const some = Object.keys(count).filter(id => count[id] > 1 && count[id] < ppl.length).map(Number);
  const who = id => ppl.filter(p => p.top.includes(id));
  const cardOf = id => id > 0 ? App.card(id) : ext[id] || null;
  const chip = id => { const c = cardOf(id); return c ? h("button", {class: "chip", onclick: () => id > 0 ? App.showCard(id) : c.own ? App.showCard(c.own) : App.toast(App.title(c.name) + ": " + c.definition)}, App.title(c.name)) : null; };

  return h("div", null,
    App.head("Compare", {back: "#/together"}),
    h("p", {class: "muted small"}, "Only people who chose “Show my top 10 in Compare” appear here."),
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
        h("div", {role: "row", class: "side-row head"}, h("span", {role: "columnheader"}, "#"), tops.map(({p}) => h("span", {role: "columnheader"}, h("span", {class: "dot", style: {background: color(p)}, "aria-hidden": "true"}), " ", name(p)))),
        Array.from({length: 10}, (_, k) => h("div", {role: "row", class: "side-row"}, h("span", {role: "rowheader"}, k + 1),
          tops.map(({p, top}) => { const c = cardOf(top[k]); const sh = count[top[k]] > 1; return h("span", {role: "cell", class: sh ? "sh" : ""}, c ? (c.id > 0 ? App.vname(c) : App.title(c.name)) : ""); }))))),
    h("section", {class: "cmp"}, h("h2", {class: "h3"}, "Talk about it"),
      h("ol", {class: "qs"}, QUESTIONS.map((q, k) => h("li", null,
        App.field(q, {value: g.notes[k] || "", rows: 2, placeholder: "Notes (optional)", oninput: v => { g.notes[k] = v; App.saveGroup(g); }}))))));
});
})();
