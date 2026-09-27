/* Multiple users on one device: "Who's using?" picker (#/who) + manage people (#/users). */
(function(){
"use strict";
const {h, icon} = App;

App.avatar = (u, cls) => h("span", {class: "avatar " + (cls || ""), style: {background: u.color}, "aria-hidden": "true"}, (u.name || "?").slice(0, 1).toUpperCase());

/* PIN pad; resolves true when the entered PIN matches (or on set: resolves the new PIN) */
App.pinPad = (title, {check, set} = {}) => new Promise(res => {
  let val = "", done = false, first = null;
  const dots = h("div", {class: "pin-dots", "aria-hidden": "true"});
  const msg = h("p", {class: "pin-msg", "aria-live": "assertive"});
  const hidden = h("input", {class: "sr", type: "password", inputmode: "numeric", autocomplete: "off", maxlength: 4, "aria-label": "4-digit PIN",
    oninput: e => { val = e.target.value.replace(/\D/g, "").slice(0, 4); e.target.value = val; draw(); if (val.length === 4) submit(); }});
  const draw = () => dots.replaceChildren(...[0, 1, 2, 3].map(k => h("i", {class: k < val.length ? "on" : ""})));
  const fin = v => { if (done) return; done = true; res(v); close(); };
  function submit(){
    if (set){
      if (first == null){ first = val; val = ""; hidden.value = ""; msg.textContent = "Enter it again to confirm"; draw(); return; }
      if (val === first) return fin(val);
      first = null; val = ""; hidden.value = ""; msg.textContent = "PINs didn’t match. Try again."; shake(); draw(); return;
    }
    if (check(val)) return fin(true);
    val = ""; hidden.value = ""; msg.textContent = "Wrong PIN. Try again."; shake(); draw(); App.vibrate(60);
  }
  const shake = () => { dots.classList.remove("shake"); void dots.offsetWidth; dots.classList.add("shake"); };
  const key = d => h("button", {class: "pin-key", type: "button", onclick: () => {
    if (d === "del") val = val.slice(0, -1); else if (val.length < 4) val += d;
    hidden.value = val; draw(); if (val.length === 4) submit();
  }, "aria-label": d === "del" ? "Delete" : d}, d === "del" ? icon("back") : d);
  const box = h("div", {class: "pin"},
    h("h2", null, title), msg, dots, hidden,
    h("div", {class: "pin-grid"}, ["1","2","3","4","5","6","7","8","9"].map(key), h("span"), key("0"), key("del")));
  msg.textContent = set ? "Choose a 4-digit PIN" : "Enter your PIN";
  const close = App.modal(box, {label: title, cls: "small"});
  box.closest("dialog").addEventListener("close", () => { if (!done){ done = true; res(false); } });
  box.addEventListener("keydown", e => { if (/^\d$/.test(e.key) && e.target !== hidden){ hidden.focus(); } });
  draw(); hidden.focus();
});

async function enter(u){
  if (u.pin){
    const ok = await App.pinPad("Hi " + u.name, {check: p => App.hashPin(p) === u.pin});
    if (!ok) return;
  }
  App.switchUser(u.id);
  const back = sessionStorage.getItem("values-deck-return");
  sessionStorage.removeItem("values-deck-return");
  App.go(back && back !== "#/who" ? back : "#/");
  if (!App.state().settings.onboarded) App.onboard();
  else App.toast("Hi " + u.name);
}

function addForm(after){
  const input = h("input", {id: "uname", type: "text", placeholder: "Name", autocomplete: "off", maxlength: 30, enterkeyhint: "done"});
  let color = App.COLORS[App.users().length % App.COLORS.length];
  const sw = h("div", {class: "swatches", role: "radiogroup", "aria-label": "Colour"});
  const drawSw = () => sw.replaceChildren(...App.COLORS.map(c => h("button", {type: "button", class: "swatch" + (c === color ? " on" : ""), style: {background: c},
    role: "radio", "aria-checked": String(c === color), "aria-label": "Colour", onclick: () => { color = c; drawSw(); }})));
  drawSw();
  return h("form", {class: "add-user", onsubmit: e => {
    e.preventDefault();
    const n = input.value.trim(); if (!n){ input.focus(); App.toast("Type a name first."); return; }
    if (App.users().some(u => u.name.toLowerCase() === n.toLowerCase())){ App.toast("That name is already used."); return; }
    const u = App.addUser(n, color); after(u);
  }},
    h("div", {class: "field"}, h("label", {for: "uname"}, "Name"), input),
    h("div", {class: "field"}, h("span", {class: "label"}, "Colour"), sw),
    h("button", {class: "btn primary block", type: "submit"}, icon("plus"), "Add person"));
}

/* ---------- Who's using? ---------- */
App.route("who", () => {
  const raw = location.hash;
  if (raw && !raw.startsWith("#/who")) try{ sessionStorage.setItem("values-deck-return", raw); }catch(e){}
  const us = App.users();
  const node = h("div", {class: "who-page"},
    h("p", {class: "eyebrow center"}, "Live Your Values"),
    h("h1", {tabindex: "-1", class: "center"}, "Who’s using this?"),
    h("ul", {class: "who-grid"},
      us.map(u => h("li", null, h("button", {class: "who-tile", onclick: () => enter(u)},
        App.avatar(u, "xl"), h("strong", null, u.name),
        u.pin ? h("span", {class: "muted small"}, icon("lock"), "PIN") : h("span", {class: "muted small"}, " "),
        App.peekCoreSelf(u.id)))),
      h("li", null, h("button", {class: "who-tile add", onclick: () => {
        const close = App.modal(h("div", {class: "confirm"}, h("h2", null, "Add a person"),
          h("p", {class: "muted small"}, "Each person gets their own private values, journal and check-ins."),
          addForm(u => { close(); enter(u); })), {label: "Add a person", cls: "small"});
      }}, h("span", {class: "avatar xl ghost"}, icon("plus")), h("strong", null, "Add person"), h("span", {class: "muted small"}, " ")))),
    h("p", {class: "muted small center"}, "Everyone’s data stays on this device."));
  return {node, focus: true};
});
// small subtitle on picker tiles: "3 values sorted"
App.peekCoreSelf = id => {
  let n = "";
  try{
    const st = id === App.user().id ? App.state() : JSON.parse(localStorage.getItem("values-deck-state-v1:" + id) || "null");
    const has = st && st.snapshots && st.snapshots.some(x => x.profile === "me");
    n = has ? "Values sorted" : "New";
  }catch(e){}
  return h("span", {class: "who-sub"}, n);
};

/* ---------- Manage people ---------- */
App.route("users", () => {
  const me = App.user();
  const list = h("ul", {class: "people"}, App.users().map(u => {
    const isMe = u.id === me.id;
    return h("li", {class: "person"},
      App.avatar(u),
      h("span", {class: "pinfo"}, h("strong", null, u.name + (isMe ? " (you)" : "")),
        h("span", {class: "pst"}, [u.pin ? "PIN on" : "No PIN", u.share === false ? "hidden from Compare" : null].filter(Boolean).join(" · "))),
      isMe ? null : h("button", {class: "btn sm ghost", onclick: () => enter(u)}, "Switch"),
      isMe ? null : h("button", {class: "icon-btn sm", "aria-label": "Delete " + u.name, onclick: async () => {
        if (u.pin){ const ok = await App.pinPad(u.name + "’s PIN", {check: p => App.hashPin(p) === u.pin}); if (!ok) return; }
        if (await App.confirm("Delete " + u.name + "?", "All of " + u.name + "’s data will be permanently deleted from this device.", {ok: "Delete", danger: true})){
          App.removeUser(u.id); App.toast(u.name + " deleted"); App.render();
        }
      }}, icon("trash")));
  }));

  const nameIn = h("input", {id: "myname", type: "text", value: me.name, maxlength: 30, autocomplete: "off",
    onchange: e => { const v = e.target.value.trim(); if (!v){ e.target.value = me.name; return; } me.name = v; App.saveUsers(); App.toast("Name saved"); App.render(); }});
  let color = me.color;
  const sw = h("div", {class: "swatches", role: "radiogroup", "aria-label": "Your colour"}, App.COLORS.map(c => h("button", {type: "button", class: "swatch" + (c === color ? " on" : ""), style: {background: c},
    role: "radio", "aria-checked": String(c === color), "aria-label": "Colour", onclick: () => { me.color = c; App.saveUsers(); App.render(); }})));

  return h("div", null,
    App.head("People on this device", {back: "#/settings", sub: "Each person has their own private values, journal, decisions and check-ins."}),
    list,
    h("section", {class: "set-group"}, h("h2", {class: "h3"}, App.avatar(me, "sm"), "Your profile"),
      h("div", {class: "field"}, h("label", {for: "myname"}, "Your name"), nameIn),
      h("div", {class: "field"}, h("span", {class: "label"}, "Your colour"), sw),
      h("div", {class: "field"}, h("span", {class: "label"}, "PIN lock"),
        h("p", {class: "hint"}, "Stops others on this device opening your profile. Not bank-level security."),
        me.pin
          ? h("div", {class: "row wrap"},
              h("button", {class: "btn ghost", onclick: async () => { const p = await App.pinPad("New PIN", {set: true}); if (p){ me.pin = App.hashPin(p); App.saveUsers(); App.toast("PIN changed"); } }}, "Change PIN"),
              h("button", {class: "btn ghost danger", onclick: async () => { const ok = await App.pinPad("Current PIN", {check: p => App.hashPin(p) === me.pin}); if (ok){ me.pin = null; App.saveUsers(); App.toast("PIN removed"); App.render(); } }}, "Remove PIN"))
          : h("button", {class: "btn ghost", onclick: async () => { const p = await App.pinPad("Set a PIN", {set: true}); if (p){ me.pin = App.hashPin(p); App.saveUsers(); App.unlock(me.id); App.toast("PIN set"); App.render(); } }}, icon("lock"), "Set a PIN")),
      h("label", {class: "toggle"},
        h("input", {type: "checkbox", checked: me.share !== false, onchange: e => { me.share = e.target.checked; App.saveUsers(); }}),
        h("span", null, h("strong", null, "Show my top 10 in Compare"), h("span", {class: "muted small"}, "Lets others on this device compare values with you in Together."))),
      App.users().length > 1 ? h("button", {class: "btn ghost danger block", onclick: async () => {
        if (me.pin){ const ok = await App.pinPad("Confirm with PIN", {check: p => App.hashPin(p) === me.pin}); if (!ok) return; }
        if (await App.confirm("Delete " + me.name + "?", "All of " + me.name + "’s values, notes, decisions and check-ins will be permanently deleted from this device.", {ok: "Delete profile", danger: true})){
          App.removeUser(me.id); App.lock(); App.go("#/who");
        }
      }}, icon("trash"), "Delete my profile") : null),
    h("section", {class: "set-group"}, h("h2", {class: "h3"}, "Add someone"), addForm(u => { App.toast(u.name + " added"); App.render(); })),
    h("button", {class: "btn ghost block", onclick: () => { App.lock(); App.go("#/who"); }}, icon("people"), "Switch person"));
});
})();
