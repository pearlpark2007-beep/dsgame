// voyage.js — moving from one island to the next, as one film: the island fades to black, the
// structure just learned turns into the next one (a match cut drawn in a few lines), one typed card,
// then the next island opens behind the same black (its loading screen is its chapter card).
// It reads the saved progress only; it never unlocks anything. Esc or a click skips it.
import { sound } from "../engine/sound.js";
import { chapter } from "./progress.js";

// the structures as four boxes: where each box sits (x, y) and what joins them
const SHAPES = {
  harbour: { boxes: [[180, 150], [180, 108], [180, 66], [180, 24]], label: "STACK", join: "none" },
  cave: { boxes: [[20, 80], [120, 80], [220, 80], [320, 80]], label: "ARRAY", join: "index" },
  circe: { boxes: [[0, 80], [120, 80], [240, 80], [360, 80]], label: "LINKED LIST", join: "arrow" },
  underworld: { boxes: [[20, 80], [120, 80], [220, 80], [320, 80]], label: "QUEUE", join: "rope" }
};
// the one line between islands (NEW lines, proposed in the art-direction doc; Circe and the Underworld
// already have their own words, so their transition is silent and lets those speak)
const CARDS = {
  "harbour>cave": "One ship left. Past the harbour of the giants, smoke was rising from a cave.",
  "cave>circe": "He told the giant his name was Nobody. The sea heard the real one.",
  "circe>underworld": "Home was still a long way off."
};

function svgFor(from) {
  const s = SHAPES[from] || SHAPES.harbour;
  const box = (i, [x, y]) => `<g class="bx" style="transform: translate(${x}px, ${y}px); transition: transform 1.1s var(--ease) ${i * 0.08}s">
      <rect width="80" height="36" rx="2" fill="none" stroke="#f4ead2" stroke-width="2"/><text class="ix" x="40" y="58" fill="#8a7a5a" font-size="13" text-anchor="middle" font-family="Courier Prime, monospace">[${i}]</text></g>`;
  return `<svg viewBox="0 0 440 200" aria-hidden="true">
    <g class="rope" opacity="0" style="transition: opacity .6s .9s"><path d="M10 136 Q 110 150 210 136 T 430 136" fill="none" stroke="#c8261e" stroke-width="5"/></g>
    <g class="arrows" opacity="0" style="transition: opacity .5s .9s">${[0, 1, 2].map(i => `<path d="M${80 + i * 120} 98 h34" stroke="#f2c230" stroke-width="2"/><path d="M${110 + i * 120} 93 l6 5 -6 5" fill="none" stroke="#f2c230" stroke-width="2"/>`).join("")}</g>
    ${s.boxes.map((p, i) => box(i, p)).join("")}
    <text class="lbl" x="220" y="196" fill="#f2c230" font-size="13" letter-spacing="5" text-anchor="middle" font-family="Courier Prime, monospace">${s.label}</text>
  </svg>`;
}

let going = false;
// go to a chapter (an entry of CHAPTERS, or its id) or to the title screen's map ("map")
export async function voyageTo(to, { from = null } = {}) {
  if (going) return; going = true;
  const target = typeof to === "string" && to !== "map" ? chapter(to) : to;
  const href = to === "map" ? "index.html#map" : target.page;
  try { sessionStorage.setItem("odyssey.arrive", to === "map" ? "map" : target.id); } catch { /* storage off */ }
  const el = document.createElement("div"); el.id = "odx-voyage"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Travelling");
  const card = from && target && target.id ? CARDS[`${from}>${target.id}`] : null;
  const morph = from && target && SHAPES[from] && SHAPES[target.id];
  el.innerHTML = (morph ? svgFor(from) : "") + `<p></p><span class="skip">Esc · skip</span>`;
  document.body.appendChild(el);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let skipped = false;
  const go = () => { if (skipped) return; skipped = true; location.href = href; };
  const onKey = e => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  addEventListener("keydown", onKey); el.addEventListener("click", go);
  const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 300) : ms));
  sound.ambience(null);
  requestAnimationFrame(() => el.classList.add("on"));
  await wait(650);
  if (morph && !skipped) {                                       // the match cut: this structure becomes the next one
    await wait(300);
    const s = SHAPES[target.id];
    el.querySelectorAll(".bx").forEach((g, i) => { g.style.transform = `translate(${s.boxes[i][0]}px, ${s.boxes[i][1]}px)`; });
    if (s.join === "arrow") el.querySelector(".arrows").setAttribute("opacity", "1");
    if (s.join === "rope") el.querySelector(".rope").setAttribute("opacity", "1");
    if (s.join !== "index") el.querySelectorAll(".ix").forEach(t => t.setAttribute("opacity", "0"));
    el.querySelector(".lbl").textContent = s.label;
    await wait(1500);
  }
  if (card && !skipped) {                                         // one typed card
    const p = el.querySelector("p");
    for (let i = 1; i <= card.length && !skipped; i++) { p.textContent = card.slice(0, i); if (card[i - 1] !== " ") sound.cue("type"); await wait(32); }
    await wait(1600);
  }
  go();
}

// on arrival: was this page opened by a voyage? (the page's loading screen then shows the chapter card)
export function arriving() {
  try { const a = sessionStorage.getItem("odyssey.arrive"); sessionStorage.removeItem("odyssey.arrive"); return a; } catch { return null; }
}
