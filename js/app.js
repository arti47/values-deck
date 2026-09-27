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
// Offline cache. Auto-reload once when a new version takes over so phones never stay on stale code.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")){
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true; App.flush(); location.reload();
  });
  navigator.serviceWorker.register("sw.js", {updateViaCache: "none"}).then(reg => {
    App.swReg = reg;
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
}
})();
