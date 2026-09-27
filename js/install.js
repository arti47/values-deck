/* Install as a home-screen app (iOS / Android / desktop) + zoom lock. */
(function(){
"use strict";
const {h, icon} = App;

/* ---------- zoom lock ----------
   viewport meta disables zoom on Android; iOS Safari ignores it, so block gestures here.
   Double-tap zoom is disabled via `touch-action: manipulation` in CSS. The in-app Text size setting replaces zoom. */
["gesturestart", "gesturechange", "gestureend"].forEach(t => document.addEventListener(t, e => e.preventDefault(), {passive: false}));
document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, {passive: false});
document.addEventListener("wheel", e => { if (e.ctrlKey) e.preventDefault(); }, {passive: false});
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
});

/* ---------- platform ---------- */
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const iosSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
App.isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
App.canInstallHere = () => location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
App.isMobile = () => isIOS || isAndroid;

let deferred = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event("installable")); });
addEventListener("appinstalled", () => { deferred = null; App.toast("Installed! Open it from your home screen."); });
if (App.isStandalone()) document.documentElement.classList.add("standalone");

async function promptInstall(){
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => null);
  deferred = null;
  return r && r.outcome === "accepted";
}

const shareIcon = () => h("span", {class: "i", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>'});
const plusBox = () => h("span", {class: "i", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>'});
const dots = () => h("span", {class: "i", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>'});

/* Steps / button for the current device. */
App.installBody = () => {
  if (App.isStandalone()) return h("p", {class: "inst-ok"}, icon("check"), "Installed. You’re using the app.");
  if (!App.canInstallHere()) return h("div", null,
    h("p", null, "To install, open this app from its web address (starting with https://) in your phone’s browser."),
    h("p", {class: "muted small"}, "It can’t be installed when opened as a file."));
  if (deferred) return h("div", null,
    h("p", null, "Add Values to your home screen. It opens full screen and works offline."),
    h("button", {class: "btn primary block", onclick: async () => { if (await promptInstall()) App.render(); }}, icon("download"), "Install app"));
  if (isIOS) return h("div", null,
    !iosSafari ? h("p", {class: "muted small"}, "Tip: this works best in Safari.") : null,
    h("ol", {class: "inst-steps"},
      h("li", null, "Tap ", h("span", {class: "kbd"}, shareIcon(), "Share"), " in the browser bar", isIOS && navigator.maxTouchPoints > 1 && !/iPhone/.test(ua) ? " (top right)" : " (bottom)", "."),
      h("li", null, "Scroll down and tap ", h("span", {class: "kbd"}, plusBox(), "Add to Home Screen"), "."),
      h("li", null, "Tap ", h("b", null, "Add"), ". Open Values from your home screen.")));
  if (isAndroid) return h("div", null,
    h("ol", {class: "inst-steps"},
      h("li", null, "Tap the browser menu ", h("span", {class: "kbd"}, dots()), " (top right)."),
      h("li", null, "Tap ", h("b", null, "Install app"), " or ", h("b", null, "Add to Home screen"), "."),
      h("li", null, "Tap ", h("b", null, "Install"), ". Open Values from your home screen.")));
  return h("p", null, "In Chrome or Edge, click the install icon in the address bar, or use the browser menu → ", h("b", null, "Install Values"), ".");
};

App.installSection = () => {
  const sec = h("section", {class: "set-group", id: "install"}, h("h2", {class: "h3"}, "Home screen app"), App.installBody());
  const upd = () => sec.replaceChildren(h("h2", {class: "h3"}, "Home screen app"), App.installBody());
  document.addEventListener("installable", upd, {once: true});
  return sec;
};

/* Gentle banner on Home for mobile browsers (not installed, not dismissed). */
App.installBanner = () => {
  const S = App.state();
  if (App.isStandalone() || !App.canInstallHere() || !App.isMobile() || S.settings.installDismissed) return null;
  const b = h("div", {class: "banner install", role: "note"},
    h("img", {src: "icons/apple-touch-icon.png", alt: "", class: "inst-ic"}),
    h("span", null, h("strong", null, "Add Values to your home screen"), h("span", null, "Full screen, works offline.")),
    h("a", {class: "btn sm primary", href: "#/settings?install=1"}, "How"),
    h("button", {class: "icon-btn sm", "aria-label": "Dismiss", onclick: () => { S.settings.installDismissed = true; App.save(); b.remove(); }}, icon("close")));
  return b;
};
})();
