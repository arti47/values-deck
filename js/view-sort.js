/* Sort wizard: Step 1 piles (swipe/buttons) → Step 2 pick 10 → Step 3 rank → save snapshot.
   Route: #/sort (always the active person). */
(function(){
"use strict";
const {h, icon} = App;
const PILES = {
  most: {label: "Matters most", short: "Most", icon: "heart", key: "3"},
  some: {label: "Matters some", short: "Some", icon: "minus", key: "2"},
  not:  {label: "Doesn't matter", short: "Not", icon: "x", key: "1"}
};

function sortFor(pid){ return App.state().sorts[pid]; }
function newSort(){ return {stage: "piles", assign: {}, log: [], picked: [], ranked: [], started: new Date().toISOString()}; }
function pileIds(s, p){ return App.cards().map(c => c.id).filter(id => s.assign[id] === p); }
function pending(s){ return App.cards().filter(c => !s.assign[c.id]); }

function frame(pid, step, body, {onExit, right} = {}){
  const prof = App.profile(pid);
  const who = pid === "me" ? "" : prof ? prof.name + " · " : "";
  return h("div", {class: "wizard"},
    h("header", {class: "wiz-head"},
      h("button", {class: "icon-btn", "aria-label": "Save and exit", onclick: onExit || (() => { App.flush(); App.toast("Progress saved. Continue any time."); if (App.inGroup()){ App.lock(); App.go("#/together"); } else App.go("#/"); })}, icon("close")),
      h("div", {class: "steps", "aria-label": "Step " + step + " of 3"},
        [1, 2, 3].map(n => h("span", {class: n < step ? "done" : n === step ? "on" : ""}, n)),
        h("p", {class: "steps-label"}, who + ["Sort", "Choose 10", "Rank"][step - 1])),
      right || h("span", {class: "icon-btn ghost-slot"})),
    body);
}

/* ---------- intro ---------- */
function intro(pid){
  const prof = App.profile(pid);
  const had = App.latest(pid);
  return h("div", {class: "wizard intro"},
    h("header", {class: "wiz-head"},
      h("button", {class: "icon-btn", "aria-label": "Back", onclick: () => history.back()}, icon("back")), h("span"), h("span", {class: "icon-btn ghost-slot"})),
    h("div", {class: "intro-body"},
      h("div", {class: "fan", "aria-hidden": "true"}, [12, 27, 52].map(n => { const c = App.card(n); return c ? h("img", {src: c.image, alt: ""}) : null; })),
      h("h1", {tabindex: "-1"}, App.inGroup() ? "Hi " + App.user().name + ", find your core values" : "Find your core values"),
      h("p", {class: "lead"}, "Three quick steps. About 10–15 minutes."),
      h("ol", {class: "howto"},
        h("li", null, h("strong", null, "Sort every card "), "into Matters most, Matters some or Doesn’t matter."),
        h("li", null, h("strong", null, "Choose 10 "), "from your Matters most pile."),
        h("li", null, h("strong", null, "Rank them "), "from 1 to 10.")),
      h("div", {class: "callout"}, icon("info"),
        h("div", null,
          h("p", null, "Choose ", h("em", null, "who you are today"), " at your core, not who you think you should be or wish you were. Leave out your job, relationships and circumstances."),
          h("p", null, "Go with your first instinct. Don’t overthink it."))),
      h("div", {class: "callout"}, icon("sun"),
        h("p", null, "Find a quiet moment and take a few slow, deep breaths before you start.")),
      h("p", {class: "muted small center"}, "If a card’s definition doesn’t quite match yours, that’s OK. What matters is what the value means to you."),
      had ? h("p", {class: "muted small center"}, "Your last result from " + App.fmtDate(had.date) + " stays in History.") : null),
    h("div", {class: "wiz-foot"},
      h("button", {class: "btn primary block lg", onclick: () => { App.state().sorts[pid] = newSort(); App.save(true); App.render(); }}, "Start sorting")));
}

/* ---------- step 1: piles ---------- */
function piles(pid, s){
  const left = pending(s);
  const total = App.cards().length;
  const doneN = total - left.length;
  if (!left.length) return pilesReview(pid, s);
  const c = left[0];
  const cardBox = App.cardEl(c);
  cardBox.classList.add("swipe");
  const stamp = h("div", {class: "stamp", "aria-hidden": "true"});
  cardBox.append(stamp);

  const undoBtn = h("button", {class: "icon-btn", "aria-label": "Undo last card", disabled: !s.log.length, onclick: undo}, icon("undo"));
  function undo(){
    const id = s.log.pop(); if (id == null) return;
    delete s.assign[id]; App.save(); App.render(); App.announce("Undone");
  }
  function put(p, dir){
    if (busy) return; busy = true;
    s.assign[c.id] = p; s.log.push(c.id); App.save();
    App.vibrate(10);
    App.announce(App.title(c.name) + ": " + PILES[p].label);
    const fly = {most: "fly-right", not: "fly-left", some: "fly-up"}[p];
    if (App.reduced()) return App.render();
    cardBox.style.transition = "transform .28s ease-in, opacity .28s ease-in";
    cardBox.classList.add(fly); lean(p);
    setTimeout(App.render, 260);
  }
  let busy = false;

  // swipe
  let x0 = null, y0 = 0, dx = 0, dy = 0, moved = false;
  cardBox.addEventListener("pointerdown", e => { if (e.button) return; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; moved = false; cardBox.setPointerCapture(e.pointerId); cardBox.style.transition = "none"; });
  cardBox.addEventListener("pointermove", e => {
    if (x0 === null) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
    if (!moved) return;
    cardBox.style.transform = `translate(${dx}px, ${Math.min(dy, 40)}px) rotate(${dx / 18}deg)`;
    const p = dir(dx, dy, 50);
    stamp.className = "stamp" + (p ? " on " + p : "");
    stamp.textContent = p ? PILES[p].label : "";
    lean(dir(dx, dy, 20));
  });
  const end = () => {
    if (x0 === null) return; x0 = null;
    const p = moved ? dir(dx, dy, 90) : null;
    if (moved){ cardBox.dataset.dragged = "1"; setTimeout(() => delete cardBox.dataset.dragged, 50); }
    if (p) return put(p);
    cardBox.style.transition = ""; cardBox.style.transform = ""; stamp.className = "stamp"; lean(null);
  };
  cardBox.addEventListener("pointerup", end);
  cardBox.addEventListener("pointercancel", end);
  function dir(dx, dy, t){
    if (dy < -t && Math.abs(dy) > Math.abs(dx)) return "some";
    if (dx > t) return "most";
    if (dx < -t) return "not";
    return null;
  }

  const ARROW = {not: "back", some: "up", most: "next"};
  // compact one-line buttons; the arrow shows the matching swipe direction (← not · ↑ some · most →)
  const btn = p => h("button", {class: "pile-btn " + p, onclick: () => put(p), "aria-keyshortcuts": PILES[p].key, title: "Or swipe " + {not: "left", some: "up", most: "right"}[p]},
    p !== "most" ? h("span", {class: "pb-arrow", "aria-hidden": "true"}, icon(ARROW[p])) : null,
    h("span", {class: "pl"}, PILES[p].label),
    p === "most" ? h("span", {class: "pb-arrow", "aria-hidden": "true"}, icon(ARROW[p])) : null,
    h("span", {class: "pc", "aria-label": pileIds(s, p).length + " cards"}, pileIds(s, p).length));

  // while dragging, the matching button lights up (and the stamp on the card names the pile)
  function lean(p){ App.$$(".pile-btn", row).forEach(b => b.classList.toggle("lean", !!p && b.classList.contains(p))); }

  const onKey = e => {
    if (e.target.closest("input,textarea")) return;
    if (e.key === "ArrowRight" || e.key === "3") put("most");
    else if (e.key === "ArrowUp" || e.key === "2"){ e.preventDefault(); put("some"); }
    else if (e.key === "ArrowLeft" || e.key === "1") put("not");
    else if (e.key === "u" || (e.key === "z" && (e.metaKey || e.ctrlKey))) undo();
    else if (e.key === "f") cardBox.flip();
  };
  document.addEventListener("keydown", onKey);


  const pct = Math.round(doneN / total * 100);
  const row = h("div", {class: "pile-row"}, btn("not"), btn("some"), btn("most"));
  const node = frame(pid, 1, h("div", {class: "sort-body"},
    h("div", {class: "progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": doneN, "aria-label": "Cards sorted"},
      h("span", {style: {width: pct + "%"}})),
    h("p", {class: "count"}, h("b", null, doneN + 1), " of " + total),
    h("div", {class: "sort-stage"}, cardBox),
    h("div", {class: "caption"}, h("h2", null, App.title(c.name)), h("p", null, c.definition),
      h("button", {class: "link", onclick: () => cardBox.flip()}, icon("flip"), "Flip for ideas")),
    row), {right: h("span", {class: "head-btns"},
      h("button", {class: "icon-btn", "aria-label": "How to sort", title: "How to sort", onclick: () => App.swipeTutorial()}, h("span", {class: "q-mark", "aria-hidden": "true"}, "?")),
      undoBtn)});
  // first time this person reaches step 1: show the swipe tutorial once
  const st = App.state().settings;
  if (!st.swipeTutorialSeen) setTimeout(() => { if (location.hash.startsWith("#/sort") && !document.querySelector("dialog[open]")) App.swipeTutorial(); }, 250);

  // preload next images
  left.slice(1, 3).forEach(n => { if (n.image) new Image().src = n.image; });
  return {node, focus: true, cleanup: () => document.removeEventListener("keydown", onKey)};
}

function pilesReview(pid, s){
  const lists = ["most", "some", "not"].map(p => {
    const ids = pileIds(s, p);
    return h("details", {class: "pile-list " + p, open: p === "most"},
      h("summary", null, icon(PILES[p].icon), h("span", null, PILES[p].label), h("span", {class: "badge"}, ids.length)),
      ids.length ? h("ul", {class: "chips"}, ids.map(id => {
        const c = App.card(id);
        return h("li", null, h("button", {class: "chip", onclick: () => move(id)}, App.title(c.name)));
      })) : h("p", {class: "muted small"}, "Empty"));
  });
  function move(id){
    const c = App.card(id);
    const body = h("div", {class: "confirm"}, h("h2", null, "Move " + App.title(c.name)),
      h("p", {class: "muted"}, c.definition),
      h("div", {class: "stack"}, Object.keys(PILES).map(p => h("button", {class: "btn " + (s.assign[id] === p ? "primary" : "ghost") + " block", onclick: () => { s.assign[id] = p; App.save(); close(); App.render(); }}, icon(PILES[p].icon), PILES[p].label))));
    const close = App.modal(body, {label: "Move card", cls: "small"});
  }
  const most = pileIds(s, "most").length;
  const msg = most >= 10
    ? `You have ${most} in Matters most. Next, you’ll narrow them to your top 10.`
    : `You have ${most} in Matters most. That’s fewer than 10, so next you can add some from Matters some.`;
  return frame(pid, 1, h("div", {class: "sort-body review"},
    h("div", {class: "done-badge", "aria-hidden": "true"}, icon("check")),
    h("h1", {tabindex: "-1"}, "All cards sorted"),
    h("p", {class: "lead"}, msg),
    h("p", {class: "muted small"}, "Tap any value to move it to another pile."),
    lists,
    h("div", {class: "wiz-foot"},
      h("button", {class: "btn ghost", onclick: () => { const id = s.log.pop(); delete s.assign[id]; App.save(); App.render(); }}, icon("undo"), "Undo last"),
      h("button", {class: "btn primary lg", onclick: () => {
        s.stage = "pick";
        const m = pileIds(s, "most");
        s.picked = m.length <= 10 ? m.slice() : [];
        App.save(); App.render();
      }}, "Continue", icon("next")))));
}

/* ---------- step 2: pick 10 ---------- */
function pick(pid, s){
  const most = pileIds(s, "most");
  const some = pileIds(s, "some");
  s.picked = s.picked.filter(id => App.card(id));
  let showSome = most.length < 10 || s.picked.some(id => some.includes(id));

  const counter = h("p", {class: "pick-count", "aria-live": "polite"});
  const cont = h("button", {class: "btn primary lg", onclick: () => {
    s.stage = "rank";
    const prev = s.ranked.filter(id => s.picked.includes(id));
    s.ranked = prev.concat(s.picked.filter(id => !prev.includes(id)));
    App.save(); App.render();
  }}, "Continue", icon("next"));
  function upd(){
    const n = s.picked.length;
    counter.replaceChildren(h("b", null, n), " of 10 chosen",
      h("span", {class: "muted"}, n < 10 ? ` · pick ${10 - n} more` : n > 10 ? ` · remove ${n - 10}` : " · perfect!"));
    cont.disabled = n !== 10;
    counter.classList.toggle("ok", n === 10);
  }
  const tile = id => {
    const c = App.card(id);
    const on = s.picked.includes(id);
    const b = h("button", {class: "tile" + (on ? " on" : ""), "aria-pressed": String(on), onclick: () => {
      const k = s.picked.indexOf(id);
      if (k >= 0) s.picked.splice(k, 1);
      else { if (s.picked.length >= 10) { App.toast("You already have 10. Unselect one first."); return; } s.picked.push(id); }
      const now = s.picked.includes(id);
      b.classList.toggle("on", now); b.setAttribute("aria-pressed", String(now));
      App.vibrate(6); App.save(); upd();
    }},
      App.thumb(c), h("span", {class: "tick", "aria-hidden": "true"}, icon("check")),
      h("span", {class: "tname"}, App.title(c.name)));
    const info = h("button", {class: "tile-info", "aria-label": "View " + App.title(c.name), onclick: () => App.showCard(id)}, icon("info"));
    return h("li", null, b, info);
  };
  const someSec = h("section", {class: "pick-some"},
    h("h2", {class: "h3"}, "From Matters some"),
    h("ul", {class: "tiles"}, some.map(tile)));
  // never a dead end: if Most + Some can't make 10, the Doesn't-matter pile is offered too
  const not = pileIds(s, "not");
  const needNot = most.length + some.length < 10 || s.picked.some(id => not.includes(id));
  const notSec = needNot && not.length ? h("section", {class: "pick-some"},
    h("h2", {class: "h3"}, "From Doesn’t matter"),
    h("ul", {class: "tiles"}, not.map(tile))) : null;
  const toggleSome = h("button", {class: "btn ghost block", onclick: () => { showSome = !showSome; someSec.hidden = !showSome; toggleSome.textContent = showSome ? "Hide Matters some" : "Show Matters some too"; }},
    showSome ? "Hide Matters some" : "Show Matters some too");
  someSec.hidden = !showSome;
  const node = frame(pid, 2, h("div", {class: "sort-body pick"},
    h("h1", {tabindex: "-1"}, "Choose your top 10"),
    h("p", {class: "lead"}, most.length > 10 ? "Tap to choose the 10 that feel most like you." : "These are pre-selected. Add or swap to make exactly 10."),
    h("ul", {class: "tiles"}, most.map(tile)),
    some.length ? toggleSome : null,
    someSec,
    notSec,
    h("div", {class: "wiz-foot sticky"},
      h("button", {class: "btn ghost", onclick: () => { s.stage = "piles"; App.save(); App.render(); }}, icon("back"), "Back"),
      counter, cont)));
  upd();
  return {node, focus: true};
}

/* ---------- step 3: rank ---------- */
function rank(pid, s){
  const list = h("ol", {class: "ranklist", "aria-label": "Your top 10, most important first"});
  function row(id, k){
    const c = App.card(id);
    const up = h("button", {class: "icon-btn sm", "aria-label": "Move " + App.title(c.name) + " up", disabled: k === 0, onclick: () => mv(k, k - 1, "up")}, icon("up"));
    const dn = h("button", {class: "icon-btn sm", "aria-label": "Move " + App.title(c.name) + " down", disabled: k === s.ranked.length - 1, onclick: () => mv(k, k + 1, "down")}, icon("down"));
    const grip = h("span", {class: "grip", "aria-hidden": "true"}, icon("grip"));
    const li = h("li", {class: "rrow" + (k < 3 ? " top" : ""), "data-id": id},
      grip, h("span", {class: "rnum"}, k + 1), App.thumb(c, "sm"),
      h("button", {class: "rtext", onclick: () => App.showCard(id, s.ranked)}, h("strong", null, App.title(c.name)), h("span", null, c.definition)),
      h("span", {class: "rbtns"}, up, dn));
    grip.addEventListener("pointerdown", e => drag(e, li));
    return li;
  }
  function draw(focusSel){
    list.replaceChildren(...s.ranked.map(row));
    if (focusSel){ const b = list.querySelector(focusSel); if (b && !b.disabled) b.focus(); else { const any = list.querySelector(focusSel.replace(/\.(up|down)$/, "")); any && any.focus(); } }
  }
  function mv(a, b, which){
    const [x] = s.ranked.splice(a, 1); s.ranked.splice(b, 0, x); App.save();
    draw();
    const btns = list.children[b].querySelectorAll(".rbtns button");
    const t = which === "up" ? btns[0] : btns[1];
    (t && !t.disabled ? t : btns[which === "up" ? 1 : 0]).focus();
    App.announce(App.title(App.card(x).name) + " moved to number " + (b + 1));
  }
  function drag(e, li){
    e.preventDefault();
    const rows = Array.from(list.children);
    const start = rows.indexOf(li);
    const rects = rows.map(r => r.getBoundingClientRect());
    const hgt = rects[0].height + 8;
    const y0 = e.clientY;
    let to = start;
    li.classList.add("dragging");
    const move = ev => {
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px)`;
      to = Math.max(0, Math.min(rows.length - 1, start + Math.round(dy / hgt)));
      rows.forEach((r, k) => {
        if (r === li) return;
        let off = 0;
        if (start < to && k > start && k <= to) off = -hgt;
        if (start > to && k < start && k >= to) off = hgt;
        r.style.transform = off ? `translateY(${off}px)` : "";
      });
    };
    const up = () => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      rows.forEach(r => r.style.transform = "");
      li.classList.remove("dragging");
      if (to !== start){ const [x] = s.ranked.splice(start, 1); s.ranked.splice(to, 0, x); App.save(); App.vibrate(10); App.announce(App.title(App.card(x).name) + " moved to number " + (to + 1)); }
      draw();
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  }
  draw();
  const node = frame(pid, 3, h("div", {class: "sort-body rank"},
    h("h1", {tabindex: "-1"}, "Rank your top 10"),
    h("p", {class: "lead"}, "Put the most important at number 1. Drag the handle or use the arrows."),
    list,
    h("div", {class: "wiz-foot sticky"},
      h("button", {class: "btn ghost", onclick: () => { s.stage = "pick"; App.save(); App.render(); }}, icon("back"), "Back"),
      h("button", {class: "btn primary lg", onclick: () => finish(pid, s)}, icon("check"), "Save my values"))));
  return {node, focus: true};
}

function finish(pid, s){
  const S = App.state();
  if (S.sorts[pid] !== s) return;   // already saved (double tap)
  const snap = {
    id: App.uid(), profile: pid, date: new Date().toISOString(),
    top: s.ranked.slice(),
    most: pileIds(s, "most").filter(id => !s.ranked.includes(id)),
    some: pileIds(s, "some").filter(id => !s.ranked.includes(id)),
    not: pileIds(s, "not")
  };
  S.snapshots.push(snap);
  delete S.sorts[pid];
  App.save(true);
  App.confetti();
  if (App.inGroup()){ App.lock(); App.go("#/together"); App.toast("Saved to " + App.user().name + "’s profile. Pass the phone on."); }
  else App.go("#/values?new=1");
}


/* ---------- swipe tutorial: looping demo + "Try it" practice ---------- */
App.swipeTutorial = () => {
  const S = App.state();
  const STEPS = [["most", "next", "Swipe right", "Matters most"], ["some", "up", "Swipe up", "Matters some"], ["not", "back", "Swipe left", "Doesn’t matter"]];
  const demoCard = App.card(27) || App.cards()[0];
  const card = h("div", {class: "demo-card"}, h("img", {src: demoCard.image, alt: "", draggable: "false"}), h("div", {class: "stamp", "aria-hidden": "true"}));
  const stamp = card.querySelector(".stamp");
  const cap = h("p", {class: "demo-cap", "aria-live": "polite"});
  const mini = STEPS.map(([p]) => h("span", {class: "mini-btn pile-btn " + p}, p === "not" ? icon("back") : p === "some" ? icon("up") : null, h("span", {class: "pl"}, PILES[p].label), p === "most" ? icon("next") : null));
  const miniRow = h("div", {class: "mini-row", "aria-hidden": "true"}, mini[2], mini[1], mini[0]);
  let k = 0, timer = null, trying = false;
  const tried = new Set();

  function show(i){
    const [p, , how, what] = STEPS[i];
    card.className = "demo-card go-" + p;
    stamp.className = "stamp on " + p; stamp.textContent = what;
    mini.forEach((m, j) => m.classList.toggle("lean", j === i));
    cap.replaceChildren(h("strong", null, how), " = " + what);
  }
  function rest(){ card.className = "demo-card"; stamp.className = "stamp"; mini.forEach(m => m.classList.remove("lean")); }
  function loop(){
    if (trying) return;
    show(k);
    timer = setTimeout(() => { rest(); timer = setTimeout(() => { k = (k + 1) % 3; loop(); }, 500); }, 1500);
  }
  function stopLoop(){ clearTimeout(timer); rest(); }

  // practice: drag the demo card in any direction
  let x0 = null, y0 = 0, dx = 0, dy = 0;
  card.addEventListener("pointerdown", e => { if (!trying) return; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
  card.addEventListener("pointermove", e => {
    if (x0 === null) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    card.style.transform = `translate(${dx}px, ${Math.min(dy, 30)}px) rotate(${dx / 16}deg)`;
    const p = dirOf(dx, dy, 35);
    stamp.className = "stamp" + (p ? " on " + p : ""); stamp.textContent = p ? PILES[p].label : "";
    mini.forEach((m, j) => m.classList.toggle("lean", !!p && STEPS[j][0] === p));
  });
  const end = () => {
    if (x0 === null) return; x0 = null;
    const p = dirOf(dx, dy, 60);
    card.style.transition = ""; card.style.transform = "";
    if (p){
      tried.add(p); App.vibrate(10);
      cap.replaceChildren(h("strong", null, "✓ " + PILES[p].label), tried.size < 3 ? " · now try the other ways" : " · you’ve got it!");
      if (tried.size === 3) startBtn.classList.add("pulse");
    }
    setTimeout(() => { stamp.className = "stamp"; mini.forEach(m => m.classList.remove("lean")); }, 600);
  };
  card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
  function dirOf(dx, dy, t){ if (dy < -t && Math.abs(dy) > Math.abs(dx)) return "some"; if (dx > t) return "most"; if (dx < -t) return "not"; return null; }

  const tryBtn = h("button", {class: "btn ghost", onclick: () => {
    trying = !trying;
    if (trying){ stopLoop(); card.classList.add("try"); tryBtn.textContent = "Show me again"; cap.replaceChildren(h("strong", null, "Your turn:"), " drag the card right, up or left"); }
    else { card.classList.remove("try"); tryBtn.textContent = "Try it"; loop(); }
  }}, "Try it");
  const startBtn = h("button", {class: "btn primary", onclick: () => close()}, "Start sorting");
  const body = h("div", {class: "tut"},
    h("h2", null, "How to sort"),
    h("p", {class: "muted small"}, "Swipe the card, or tap a button. You can undo any time."),
    h("div", {class: "demo-stage"}, card),
    cap, miniRow,
    h("div", {class: "row between"}, tryBtn, startBtn));
  const close = App.modal(body, {label: "How to sort", cls: "tut-modal"});
  body.closest("dialog").addEventListener("close", () => { clearTimeout(timer); S.settings.swipeTutorialSeen = true; App.save(); });
  if (App.reduced()){
    // no motion: show all three at once
    cap.replaceChildren(h("strong", null, "Swipe right"), " = Matters most · ", h("strong", null, "up"), " = Matters some · ", h("strong", null, "left"), " = Doesn’t matter");
  } else loop();
};

App.route("sort", (params) => {
  const pid = "me";   // everyone sorts in their own profile (Sort together switches person first)
  const s = sortFor(pid);
  if (!s) return {node: intro(pid), focus: true};
  if (s.stage === "pick") return pick(pid, s);
  if (s.stage === "rank") return rank(pid, s);
  const r = piles(pid, s);
  return r.node ? r : {node: r, focus: true};
});

App.PILES = PILES;
})();
