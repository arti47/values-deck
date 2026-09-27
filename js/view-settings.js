/* Settings + custom (blank) cards. */
(function(){
"use strict";
const {h, icon} = App;

App.route("settings", (params, q) => {
  const S = App.state();
  const set = (k, v) => { S.settings[k] = v; App.save(); App.applySettings(); };
  const file = h("input", {type: "file", accept: "application/json,.json", class: "sr", id: "imp", onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try{
      const obj = JSON.parse(await f.text());
      if (!obj || obj.v !== 1 || !Array.isArray(obj.snapshots)) throw new Error("bad");
      if (await App.confirm("Replace your data?", "This will replace everything on this phone with the backup from " + (obj.exported ? App.fmtDate(obj.exported) : "the file") + ".", {ok: "Replace", danger: true})){
        delete obj.exported; App.replaceState(obj); App.applySettings(); App.toast("Backup restored"); App.go("#/");
      }
    }catch(err){ App.toast("That file isn’t a valid backup."); }
    e.target.value = "";
  }});
  if (q && q.get("install")) setTimeout(() => { const el = document.getElementById("install"); if (el){ el.scrollIntoView({behavior: App.reduced() ? "auto" : "smooth", block: "start"}); el.classList.add("flash"); } }, 50);
  return h("div", null,
    App.head("Settings"),
    h("a", {class: "list-row user-row", href: "#/users"}, App.avatar(App.user()),
      h("span", {class: "lr-txt"}, h("strong", null, App.user().name), h("span", null, App.users().length > 1 ? App.users().length + " people on this device · switch or manage" : "Add people who share this device")), icon("next")),
    App.installSection(),
    h("section", {class: "set-group"}, h("h2", {class: "h3"}, "Look & feel"),
      h("div", {class: "field"}, h("span", {class: "label"}, "Theme"),
        App.segmented("theme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], S.settings.theme, v => set("theme", v), "Theme")),
      h("div", {class: "field"}, h("span", {class: "label"}, "Text size"),
        App.segmented("text", [["1", "Standard"], ["1.12", "Large"], ["1.25", "Largest"]], String(S.settings.text), v => set("text", +v), "Text size"),
        h("p", {class: "hint", style: {marginTop: "8px"}}, "Pinch-zoom is off so the app feels native. Use this to make text bigger."))),
    h("section", {class: "set-group"}, h("h2", {class: "h3"}, "Check-ins"),
      h("div", {class: "field"}, h("span", {class: "label"}, "Remind me on Home"),
        App.segmented("cad2", [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]], S.settings.cadence, v => set("cadence", v), "Check-in frequency"))),
    h("section", {class: "set-group"}, h("h2", {class: "h3"}, "Cards"),
      h("a", {class: "list-row", href: "#/custom"}, icon("plus"), h("span", {class: "lr-txt"}, h("strong", null, "My own cards"), h("span", null, "Add up to 2 values not in the deck")), icon("next")),
      h("button", {class: "list-row", onclick: () => { S.settings.swipeHint = true; App.save(); App.onboard(); }}, icon("info"), h("span", {class: "lr-txt"}, h("strong", null, "Show the intro again")), icon("next"))),
    h("section", {class: "set-group"}, h("h2", {class: "h3"}, "Your data"),
      h("p", {class: "muted small"}, "Your data stays on this device. Backups cover your profile only. Save one now and then, especially before clearing your browser."),
      h("div", {class: "row wrap gap"},
        h("button", {class: "btn ghost", onclick: exportData}, icon("download"), "Save backup"),
        h("label", {class: "btn ghost", for: "imp"}, icon("upload"), "Restore backup"), file),
      h("button", {class: "btn ghost danger block", onclick: async () => {
        if (await App.confirm("Erase " + App.user().name + "’s data?", "All of " + App.user().name + "’s sorts, notes, decisions and check-ins will be deleted. Other people on this device are not affected. This can’t be undone.", {ok: "Erase all", danger: true})){
          App.reset(); App.applySettings(); App.toast("All data erased"); App.go("#/");
        }
      }}, icon("trash"), "Erase my data")),
    h("p", {class: "muted small center notice"}, "Card text and artwork © Lisa Congdon & Andreea Niculescu / Chronicle Books. Personal use only."));
});

function exportData(){
  const S = App.state();
  const data = Object.assign({}, S, {exported: new Date().toISOString()});
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const a = h("a", {href: URL.createObjectURL(blob), download: "values-backup-" + App.user().name.replace(/[^\w-]+/g, "_") + "-" + new Date().toISOString().slice(0, 10) + ".json"});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  App.toast("Backup saved");
}

/* ---------- custom cards ---------- */
App.route("custom", () => {
  const S = App.state();
  const previews = [];
  const editor = (c, k) => {
    const pv = h("div", {class: "custom-preview"});
    const draw = () => {
      const card = {id: c.id, name: (c.name.trim() || "Your value").toUpperCase(), definition: c.definition.trim() || "to …", actions: c.actions.filter(a => a.trim()), image: null, custom: true};
      pv.replaceChildren(App.cardEl(card));
    };
    previews.push(draw); draw();
    const nameId = "cn" + k, defId = "cd" + k, actId = "ca" + k;
    const inUse = App.state().snapshots.some(s => [].concat(s.top, s.most, s.some, s.not).includes(c.id));
    return h("section", {class: "custom-ed"},
      h("h2", {class: "h3"}, "Blank card " + (k + 1)),
      h("div", {class: "custom-grid"}, pv,
        h("div", null,
          h("div", {class: "field"}, h("label", {for: nameId}, "Value name"),
            h("input", {id: nameId, type: "text", value: c.name, maxlength: 24, placeholder: "e.g. Faith", autocomplete: "off",
              oninput: e => { c.name = e.target.value; App.save(); draw(); }})),
          h("div", {class: "field"}, h("label", {for: defId}, "What it means"),
            h("input", {id: defId, type: "text", value: c.definition, maxlength: 90, placeholder: "to …", autocomplete: "off",
              oninput: e => { c.definition = e.target.value; App.save(); draw(); }})),
          App.field("Ways to live it (one per line)", {id: actId, value: c.actions.join("\n"), rows: 4, placeholder: "One idea per line",
            oninput: v => { c.actions = v.split("\n"); draw(); }}),
          c.name ? h("button", {class: "link danger sm", onclick: async () => {
            if (await App.confirm("Clear this card?", inUse ? "It’s part of a saved sort. Past results will simply skip it." : null, {ok: "Clear", danger: true})){
              c.name = ""; c.definition = ""; c.actions = []; App.save(); App.render();
            }
          }}, icon("trash"), "Clear card") : null)));
  };
  return h("div", null,
    App.head("My own cards", {back: "#/settings", sub: "Missing a value? Add it here. It will appear in the deck and in your next sort."}),
    S.custom.map(editor));
});
})();
