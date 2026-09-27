/* Boot: load state, apply settings, route, onboarding, service worker. */
(function(){
"use strict";
if (!App.hasData()){
  document.getElementById("main").innerHTML = '<p style="padding:24px">data/cards.js missing or empty. Run tools/extract_cards.py --repo.</p>';
  return;
}
App.load();
App.applySettings();
App.hydrateIcons(document);
addEventListener("hashchange", App.render);
App.render();
if (!App.state().settings.onboarded) App.onboard();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
