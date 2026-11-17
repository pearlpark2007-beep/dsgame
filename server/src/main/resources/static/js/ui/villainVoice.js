// villainVoice.js — the villain's voice box, the same blue box as "CIRCE · ALL SPEAKERS" on Circe's island:
// one line as each trial opens, one when it is solved. Antiphates in the Harbour, Polyphemus in the Cave,
// the Keeper in the Underworld. (Circe keeps her own, in circeTrials.js.)
import { sound } from "../engine/sound.js";

export const VOICES = {
  harbour: { who: "ANTIPHATES · FROM THE CLIFFS", lines: {
    "harbour-practice": ["Load your little boat, captain. We like them full.", "Water, bread, wine. Now we know what's on board."],
    "harbour-finale": ["The axe at the bottom of the pile? Of course it is.", "You reached it. Pity. Run, then."] } },
  cave: { who: "POLYPHEMUS · IN THE DARK", lines: {
    "cave-1": ["Count them. I count them every night.", "None missing. Yet."],
    "cave-2": ["Where is my black ram? He wanders.", "There he is. Don't touch him."],
    "cave-3": ["The biggest one is mine. They are all mine.", "My favourite. Heavy. Warm."],
    "cave-4": ["The thin ones hide nothing. I check.", "Thin, thin, thin. Nothing under them."],
    "cave-5": ["Lambs. More for the morning.", "Two more mouths. Two more suppers."],
    "cave-6": ["At dawn they go out in order. Always in order.", "In order. Good. I like order."],
    "cave-7": ["Pen two. I'm hungry.", "Gone. Close the gap. Nobody will notice."],
    "cave-8": ["Back to front? Why would anyone want that?", "Strange. Still all there."],
    "cave-bonus": ["Sorted, the way I keep them. Don't look at all of them.", "Four pens. Clever little thing."],
    "cave-finale": ["Dawn. I will feel every back that goes out.", null] } },
  underworld: { who: "THE KEEPER · ALL STATIONS", lines: {
    "underworld-1": ["Now serving: the front of the line. Only the front.", "Two served. The line moves on."],
    "underworld-2": ["Looking is free. Serving is not.", "Nobody moved. Good."],
    "underworld-3": ["No one cuts in. Not even prophets.", "He waited his turn. Eventually."],
    "underworld-4": ["Five seats. Everyone else waits outside.", "Full is full. They'll be back."],
    "underworld-finale": ["Closing time. Everyone is served before the doors shut.", null] } }
};

const CSS = `
#villain-pa { position: fixed; z-index: 29; left: calc((100vw - var(--pw, 0px)) / 2); top: 16px; transform: translate(-50%, -8px); opacity: 0; pointer-events: none;
  display: flex; align-items: center; gap: 10px; max-width: min(640px, calc(92vw - var(--pw, 0px))); padding: 9px 16px 9px 12px; border-radius: 4px;
  background: #1d3fd1; color: #fff4cf; box-shadow: 0 6px 22px rgba(0,0,0,.35); font: italic 700 16px/1.35 'Courier Prime', monospace;
  transition: opacity .25s cubic-bezier(.22,.61,.36,1), transform .25s cubic-bezier(.22,.61,.36,1); }
#villain-pa.on { opacity: 1; transform: translate(-50%, 0); }
#villain-pa svg { flex: none; }
#villain-pa .pa-who { font: normal 11px/1 'Courier Prime', monospace; letter-spacing: 2px; color: #ffd21a; font-style: normal; display: block; margin-bottom: 3px; }
@media (prefers-reduced-motion: reduce) { #villain-pa { transition: none; } }
`;

export class VillainVoice {
  // chapter: "harbour" | "cave" | "underworld"; skipping(): true while a film is being fast-forwarded
  constructor(chapter, { skipping = () => false } = {}) {
    this.v = VOICES[chapter]; this.skipping = skipping; this.heard = new Set();
    if (!document.getElementById("villain-pa-css")) { const s = document.createElement("style"); s.id = "villain-pa-css"; s.textContent = CSS; document.head.appendChild(s); }
    const el = this.el = document.createElement("div"); el.id = "villain-pa"; el.setAttribute("role", "status");
    el.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffd21a" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l6-4v14l-6-4H4z"/><path d="M17.5 9.5a4 4 0 0 1 0 5M20 7a7.5 7.5 0 0 1 0 10"/></svg><span><span class="pa-who"></span><span class="pa-t"></span></span>`;
    el.querySelector(".pa-who").textContent = this.v.who;
    document.body.appendChild(el);
  }
  say(text, seconds = 3.6) {
    if (!text || this.skipping()) return;
    const el = this.el, id = (this.id = (this.id || 0) + 1);
    el.querySelector(".pa-t").textContent = `"${text}"`;
    // below Athena's code box when it is up, so the two never cover each other
    const box = document.getElementById("athena-line");
    el.style.top = box && box.classList.contains("on") ? `${box.getBoundingClientRect().bottom + 12}px` : "16px";
    el.classList.add("on"); sound.chime && sound.chime();
    setTimeout(() => { if (this.id === id) el.classList.remove("on"); }, seconds * 1000);
  }
  // as a trial opens (once per trial per visit, as on Circe's island), and when it is solved
  opened(id) { const l = this.v.lines[id]; if (l && !this.heard.has(id)) { this.heard.add(id); setTimeout(() => this.say(l[0]), 1700); } }   // after the trial card
  solved(id) { const l = this.v.lines[id]; if (l && l[1]) this.say(l[1]); }
}
