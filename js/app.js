/* Boot: load state, apply settings, route, onboarding, service worker. */
(function(){
"use strict";
if (!App.hasData()){
  document.getElementById("main").innerHTML = '<p style="padding:24px">data/cards.js missing or empty. Run tools/extract_cards.py --repo.</p>';
  return;
}
App.load();
App.applySettings();
if (!App.needsPicker()) App.unlock(App.user().id);
App.hydrateIcons(document);
addEventListener("hashchange", App.render);
App.render();
if (!App.needsPicker() && !App.state().settings.onboarded) App.onboard();
// Offline cache + updates: a new version installs in the background, then a toast offers "Update".
if ("serviceWorker" in navigator && location.protocol.startsWith("http")){
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return; reloading = true; App.flush(); location.reload();
  });
  const offer = w => {
    if (!w || !navigator.serviceWorker.controller) return;   // first install: nothing to replace
    App.toast("A new version is ready.", {id: "update-toast", sticky: true, action: {label: "Update", fn: () => {
      App.flush(); w.postMessage("skipWaiting");
      setTimeout(() => { if (!reloading) location.reload(); }, 1500);
    }}});
  };
  navigator.serviceWorker.register("sw.js", {updateViaCache: "none"}).then(reg => {
    App.swReg = reg;
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w && w.addEventListener("statechange", () => { if (w.state === "installed") offer(w); });
    });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(() => {});
}
})();
