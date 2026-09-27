/* Share values between phones (no server): link + QR carry a small encoded payload.
   Receiving saves a read-only "shared contact" in the current person's profile; Compare can include it. */
(function(){
"use strict";
const {h, icon} = App;

/* ---------- encoding ---------- */
const b64u = str => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));

App.shareId = () => {   // stable per person, so re-sharing updates the same contact on the other phone
  const u = App.user();
  if (!u.sid){ u.sid = Math.random().toString(36).slice(2, 10); App.saveUsers(); }
  return u.sid;
};
App.encodeShare = ({most = false, some = false} = {}) => {
  const u = App.user(), snap = App.latest();
  if (!snap) return null;
  const p = {v: 1, i: App.shareId(), n: u.name, c: u.color, d: snap.date.slice(0, 10), t: snap.top.slice()};
  if (most) p.m = snap.most.slice();
  if (some) p.s = snap.some.slice();
  const ids = [].concat(p.t, p.m || [], p.s || []).filter(id => id > 100);
  if (ids.length){ p.x = {}; ids.forEach(id => { const c = App.card(id); if (c) p.x[id] = [App.title(c.name), c.definition]; }); }
  return b64u(JSON.stringify(p));
};
App.decodeShare = text => {
  if (!text) return null;
  const m = String(text).trim().match(/(?:#\/add\/|^)([A-Za-z0-9_-]{16,})\s*$/) || String(text).match(/#\/add\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try{
    const p = JSON.parse(unb64u(m[1]));
    if (!p || p.v !== 1 || !Array.isArray(p.t) || !p.n) return null;
    const ok = id => Number.isInteger(id) && ((id >= 1 && id <= 100 && App.card(id) && !App.card(id).custom) || (id > 100 && p.x && p.x[id]));
    return {sid: String(p.i || ""), name: String(p.n).slice(0, 30), color: /^#[0-9a-f]{6}$/i.test(p.c) ? p.c : "#8e6bb8", date: String(p.d || ""),
      top: p.t.filter(ok).slice(0, 10), most: (p.m || []).filter(ok), some: (p.s || []).filter(ok), x: p.x || {}};
  }catch(e){ return null; }
};
App.shareUrl = code => {
  const base = location.protocol.startsWith("http") ? location.origin + location.pathname : "https://arti47.github.io/values-deck/";
  return base + "#/add/" + code;
};
App.contacts = () => { const S = App.state(); return S.contacts || (S.contacts = []); };

/* ---------- Share my values (modal) ---------- */
App.shareMine = () => {
  const snap = App.latest();
  if (!snap){ App.toast("Sort your values first, then you can share them."); return; }
  const opts = {most: false, some: false};
  const qrBox = h("div", {class: "qr-box", role: "img", "aria-label": "QR code with your values"});
  const linkOut = h("input", {type: "text", readonly: true, class: "share-link", "aria-label": "Share link", onfocus: e => e.target.select()});
  const draw = () => {
    const url = App.shareUrl(App.encodeShare(opts));
    linkOut.value = url;
    try{
      const q = window.qrcode(0, "M"); q.addData(url); q.make();
      qrBox.innerHTML = q.createSvgTag({cellSize: 4, margin: 2, scalable: true});
    }catch(e){ qrBox.textContent = "QR unavailable. Use Send link."; }
  };
  const tick = (key, label) => h("label", {class: "toggle"},
    h("input", {type: "checkbox", onchange: e => { opts[key] = e.target.checked; draw(); }}),
    h("span", null, h("strong", null, label)));
  const send = async () => {
    const url = linkOut.value;
    const text = App.user().name + "’s values (Live Your Values app)";
    if (navigator.share){ try{ await navigator.share({title: text, text, url}); return; }catch(e){ if (e && e.name === "AbortError") return; } }
    copy(url);
  };
  const copy = async url => {
    try{ await navigator.clipboard.writeText(url); App.toast("Link copied"); }
    catch(e){ linkOut.focus(); linkOut.select(); App.toast("Select the link and copy it"); }
  };
  const body = h("div", {class: "share"},
    h("h2", null, "Share my values"),
    h("p", {class: "muted small"}, "Only your name, colour and the values you pick are shared. No notes, journal or check-ins."),
    h("div", {class: "share-opts"},
      h("label", {class: "toggle"}, h("input", {type: "checkbox", checked: true, disabled: true}), h("span", null, h("strong", null, "My top 10"), h("span", {class: "muted small"}, "Always included"))),
      tick("most", "Also: rest of Matters most"),
      tick("some", "Also: Matters some")),
    qrBox,
    h("p", {class: "muted small center"}, "Let them scan this with their phone camera, or send the link."),
    h("div", {class: "row wrap gap-sm share-btns"},
      h("button", {class: "btn primary", onclick: send}, icon("upload"), "Send link…"),
      h("button", {class: "btn ghost", onclick: () => copy(linkOut.value)}, "Copy link")),
    linkOut);
  App.modal(body, {label: "Share my values", cls: "small share-modal"});
  draw();
};

/* ---------- Add from someone else ---------- */
App.addContact = (c) => {
  const list = App.contacts();
  const i = c.sid ? list.findIndex(x => x.sid === c.sid) : -1;
  const rec = Object.assign({id: i >= 0 ? list[i].id : "c" + App.uid(), added: new Date().toISOString()}, c);
  if (i >= 0) list[i] = rec; else list.push(rec);
  // make sure they're ticked in Compare
  const g = App.group(); g.contacts = Array.from(new Set((g.contacts || []).concat(rec.id))); App.saveGroup(g);
  App.save(true);
  return {rec, updated: i >= 0};
};

function preview(c){
  return h("div", {class: "contact-preview"},
    h("div", {class: "row"}, h("span", {class: "avatar", style: {background: c.color}, "aria-hidden": "true"}, c.name.slice(0, 1).toUpperCase()),
      h("span", {class: "pinfo"}, h("strong", null, c.name), h("span", {class: "pst"}, c.date ? "Sorted " + App.fmtDate(c.date + "T12:00:00") : ""))),
    h("ol", {class: "hranks"}, c.top.map((id, k) => h("li", null, h("span", {class: "rnum"}, k + 1),
      id <= 100 ? App.vname(App.card(id), c.top.filter(x => x <= 100)) : h("span", null, (c.x[id] || [""])[0])))),
    c.most.length || c.some.length ? h("p", {class: "muted small"}, "Also shared: " + [c.most.length ? c.most.length + " more that matter most" : "", c.some.length ? c.some.length + " that matter some" : ""].filter(Boolean).join(" · ")) : null);
}

App.route("add", (params) => {
  const c = App.decodeShare("#/add/" + (params[0] || ""));
  const standalone = App.isStandalone && App.isStandalone();
  const iosBrowser = /iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone;
  if (!c) return h("div", null, App.head("Shared values", {back: "#/"}),
    App.empty("This link doesn’t work", "It may be incomplete. Ask them to send it again, or paste it in Sort together → Add shared values.", h("a", {class: "btn primary", href: "#/"}, "Go home")));
  const exists = App.contacts().find(x => x.sid && x.sid === c.sid);
  return h("div", null,
    App.head(c.name + "’s values", {back: "#/"}),
    iosBrowser ? h("div", {class: "callout"}, icon("info"), h("div", null,
      h("p", null, h("strong", null, "Using the home-screen app? "), "Links open in Safari, which keeps separate data. Copy this link, open your Values app, then go to Sort together → ", h("strong", null, "Add shared values"), " and tap Paste."),
      h("button", {class: "btn ghost sm", onclick: async () => { try{ await navigator.clipboard.writeText(location.href); App.toast("Link copied"); }catch(e){ App.toast("Copy the address from the browser bar"); } }}, "Copy link"))) : null,
    preview(c),
    h("button", {class: "btn primary block lg", onclick: () => {
      const {updated} = App.addContact(c);
      App.toast(updated ? c.name + " updated" : c.name + " added to Compare");
      offerBack(c);
    }}, icon("plus"), exists ? "Update " + c.name + "’s values" : "Add to Compare"),
    h("p", {class: "muted small center"}, "Saved in " + App.user().name + "’s profile on this phone. You can remove it any time in Sort together."));
});

async function offerBack(c){
  if (!App.latest()){ App.go("#/together"); return; }
  const ok = await App.confirm("Send " + c.name + " your values too?", "Then you can both compare on your own phones.", {ok: "Share mine", cancel: "Not now"});
  App.go("#/together");
  if (ok) setTimeout(App.shareMine, 250);
}

/* paste box (used in Sort together) */
App.pasteShared = () => {
  const input = h("textarea", {rows: 3, placeholder: "Paste the link they sent you", "aria-label": "Shared link"});
  const msg = h("p", {class: "muted small", "aria-live": "polite"});
  const tryAdd = () => {
    const c = App.decodeShare(input.value);
    if (!c){ msg.textContent = "That doesn’t look like a Values link. Check you copied all of it."; return; }
    close();
    location.hash = "#/add/" + input.value.trim().match(/([A-Za-z0-9_-]{16,})\s*$/)[1];
  };
  const body = h("div", {class: "confirm"},
    h("h2", null, "Add shared values"),
    h("p", {class: "muted small"}, "Got a link from someone’s Values app? Paste it here."),
    input, msg,
    h("div", {class: "row between", style: {marginTop: "10px"}},
      navigator.clipboard && navigator.clipboard.readText ? h("button", {class: "btn ghost", onclick: async () => {
        try{ input.value = await navigator.clipboard.readText(); tryAdd(); }catch(e){ msg.textContent = "Couldn’t read the clipboard. Long-press the box and choose Paste."; }
      }}, "Paste") : h("span"),
      h("button", {class: "btn primary", onclick: tryAdd}, "Add")));
  const close = App.modal(body, {label: "Add shared values", cls: "small"});
};
})();
