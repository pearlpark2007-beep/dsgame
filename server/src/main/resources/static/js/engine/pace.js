// pace.js — how fast Odysseus (and the whole scene) moves, picked by the player.
// Five gears, named like he would name them. Push past either end and he answers back.
const GEARS = [
  { name: "STATUE", k: 0.5 },
  { name: "STROLL", k: 0.75 },
  { name: "MARCH", k: 1 },
  { name: "HUSTLE", k: 1.5 },
  { name: "SPRINT", k: 2.2 }
];
const TOO_FAST = [
  "No, bro. I'm made of marble. Marble doesn't sprint faster.",
  "Ten years at sea and you want me to RUN?",
  "This is my top speed. Take it up with Poseidon.",
  "Any faster and I leave my legs behind."
];
const TOO_SLOW = [
  "Any slower and I'm a statue again.",
  "Slower? Penelope will have remarried.",
  "I've seen glaciers with more ambition.",
  "If I go any slower, the seagulls will move in."
];

const css = `
#pace { position: fixed; left: 16px; top: 16px; z-index: 30; display: flex; align-items: center; gap: 6px; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; }
#pace .lbl { font-size: 11px; letter-spacing: 3px; color: #b9a684; margin-right: 4px; }
#pace button { width: 40px; height: 40px; background: rgba(8, 12, 15, 0.75); color: #f2c230; border: 1px solid #4a3a28; border-radius: 4px; font: inherit; font-size: 18px; cursor: pointer; }
#pace .gear { min-width: 92px; text-align: center; font-family: Anton, Impact, sans-serif; font-size: 20px; letter-spacing: 2px; color: #f2c230; text-shadow: 2px 2px 0 #7e1a0f; }
#pace-quip { position: fixed; left: 16px; top: 66px; z-index: 30; max-width: 420px; padding: 10px 14px; background: rgba(239, 225, 194, 0.95); color: #1d140c;
             font-family: 'Courier Prime', monospace; font-size: 15px; border-left: 4px solid #7e1a0f; opacity: 0; transform: translateY(-6px); transition: opacity 0.2s, transform 0.2s; pointer-events: none; }
#pace-quip.on { opacity: 1; transform: none; }
#pace-quip b { display: block; font-family: Anton, Impact, sans-serif; font-weight: 400; letter-spacing: 2px; color: #7e1a0f; font-size: 14px; }
`;

export class Pace {
  constructor(world, { start = 2 } = {}) {
    this.world = world; this.i = start;
    if (!document.getElementById("pace-css")) { const s = document.createElement("style"); s.id = "pace-css"; s.textContent = css; document.head.appendChild(s); }
    const el = document.createElement("div"); el.id = "pace";
    el.innerHTML = `<span class="lbl">HIS PACE</span><button class="dn" aria-label="Slower">−</button><span class="gear" aria-live="polite"></span><button class="up" aria-label="Faster">+</button>`;
    document.body.appendChild(el);
    this.quip = document.createElement("div"); this.quip.id = "pace-quip"; this.quip.setAttribute("role", "status"); document.body.appendChild(this.quip);
    this.gearEl = el.querySelector(".gear");
    el.querySelector(".dn").onclick = () => this.shift(-1);
    el.querySelector(".up").onclick = () => this.shift(+1);
    addEventListener("keydown", e => { if (e.key === "[") this.shift(-1); if (e.key === "]") this.shift(+1); });
    this.apply();
  }
  shift(d) {
    const n = this.i + d;
    if (n < 0) return this.say(TOO_SLOW);
    if (n >= GEARS.length) return this.say(TOO_FAST);
    this.i = n; this.apply();
  }
  apply() { this.world.pace = GEARS[this.i].k; this.gearEl.textContent = GEARS[this.i].name; }
  say(lines) {
    this.q = ((this.q ?? -1) + 1) % lines.length;
    this.quip.innerHTML = `<b>ODYSSEUS</b>${lines[this.q]}`;
    this.quip.classList.add("on");
    clearTimeout(this.t); this.t = setTimeout(() => this.quip.classList.remove("on"), 3200);
  }
}
