/* Why values matter + every way to use the deck (paraphrased from the booklet), each linked to its feature. */
(function(){
"use strict";
const {h, icon} = App;

const QUOTES = [
  ["Knowledge is power.", "Francis Bacon"],
  ["When you know better, you do better.", "Maya Angelou"],
  ["I have learned that as long as I hold fast to my beliefs and values, and follow my own moral compass, then the only expectations I need to live up to are my own.", "Michelle Obama"]
];
App.quote = () => {
  const [q, a] = QUOTES[new Date().getDate() % QUOTES.length];
  return h("figure", {class: "quote-card"}, h("blockquote", null, "“" + q + "”"), h("figcaption", null, "— " + a));
};

const WAYS = [
  ["Sort your core values", "Three piles, then your top 10, then rank 1–10.", "#/sort", "shuffle"],
  ["Add your own values", "Two blank cards for values the deck doesn’t include.", "#/custom", "plus"],
  ["See what else matters", "Your “Matters some” pile can be enlightening too.", "#/values", "star"],
  ["Live them every day", "The back of each card has ideas to bring the value into your life.", "#/deck", "cards"],
  ["Dig deeper", "Write what each value means to you, why, and where it came from.", "#/journal", "pen"],
  ["Check your life", "Relationships, work, free time, body & mind: where do they line up?", "#/audit", "compass"],
  ["Make decisions", "Ask how each core value can shape the choice. Handle values in tension.", "#/decide", "scale"],
  ["Reflect regularly", "Look back on your day, week or month through your values.", "#/reflect", "sun"],
  ["Do it together", "Sort with friends, family or colleagues and talk it through.", "#/together", "people"],
  ["Track change over time", "Re-sort yearly, like on your birthday, or every five years.", "#/history", "history"]
];

App.route("about", () => h("div", {class: "about"},
  App.head("Why values matter", {back: "#/"}),
  h("section", {class: "card-sec pad"},
    h("p", null, "Your ", h("strong", null, "values"), " are the principles you hold as most important. Every choice you make comes from one, whether you notice it or not. We learn them from family, culture, role models and life experience."),
    h("p", null, "Your ", h("strong", null, "core values"), " are the ones that matter most. They usually stay steady through life, though they can shift as you grow and your circumstances change.")),
  h("h2", {class: "h3"}, "Why it helps"),
  h("p", {class: "muted small"}, "Research links living with awareness of your core values to:"),
  h("ul", {class: "benefits"}, [
    ["sun", "Lower stress"], ["scale", "More confident decisions and problem-solving"], ["heart", "Better attention to health"],
    ["sparkle", "More willpower for hard things"], ["people", "More assertive, compassionate communication"],
    ["compass", "Wiser career and work choices"], ["star", "Stronger confidence and closer relationships"]
  ].map(([i, t]) => h("li", null, icon(i), h("span", null, t)))),
  h("p", null, "Knowing your values also helps you choose people with complementary values, and shape your days around what matters: more time for yourself, friends, or creativity."),
  App.quote(),
  h("h2", {class: "h3"}, "Ways to use the deck"),
  h("ol", {class: "ways"}, WAYS.map(([t, d, href, ic]) => h("li", null, h("a", {class: "list-row", href},
    h("span", {class: "tool-ic"}, icon(ic)), h("span", {class: "lr-txt"}, h("strong", null, t), h("span", null, d)), icon("next"))))),
  h("p", {class: "muted small center"}, "For ages 12 to 112.")));
})();
