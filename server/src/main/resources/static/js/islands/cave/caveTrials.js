// caveTrials.js — the Cave trials (arrays). The player writes C; Java runs it (POST /api/levels/{id}/play)
// and answers with an outcome and the steps it took on the flock: READ, WRITE, JUNK (a pen past n),
// OUT_OF_BOUNDS (a pen past the last one carved), LENGTH (n changed), OVERFLOW (no pen left).
// This file acts those steps out on the pens, one by one, with a camera that stays on the pens being
// used. The browser never decides if the code is right: Java does.
// Each trial opens on a black hour card (NOON ... DAWN): the cave chapter runs on a clock.
import { sound } from "../../engine/sound.js";
import * as THREE from "three";
import { TRIAL_CSS } from "../../learn/trialPanelCss.js";
import { ArrayBoard } from "../../learn/arrayBoard.js";
import { Codex } from "../../learn/codex.js";
import { CAVE_CODEX } from "../../learn/codexContent.js";
import { icon } from "../../ui/icons.js";
import { AthenaLine } from "../../learn/athenaLine.js";
import { VillainVoice } from "../../ui/villainVoice.js";

const STORE = "odyssey.cave.done";
const done = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const markDone = id => { try { const d = done(); if (!d.includes(id)) { d.push(id); localStorage.setItem(STORE, JSON.stringify(d)); } } catch { /* storage off */ } };

// the clock of the chapter: one hour card per trial
const HOURS = {
  "cave-1": ["NOON.", "The giant is out with the flock. The men are counting wool."],
  "cave-2": ["1 PM.", "One ram is black. Black hides a man in the dark."],
  "cave-3": ["2 PM.", "The biggest ram carries the king."],
  "cave-4": ["3 PM.", "Some sheep are too thin to hide anyone."],
  "cave-5": ["4 PM.", "Two lambs, born in the straw. He'll count them tonight."],
  "cave-6": ["5 PM.", "Whoever leads the flock out goes first past the hand."],
  "cave-7": ["6 PM.", "Supper. He ate the sheep in pen 2."],
  "cave-8": ["7 PM.", "Turn the line around. The big ones go out last."],
  "cave-bonus": ["MIDNIGHT.", "One torch left. Four looks, no more."],
  "cave-finale": ["DAWN.", "The boulder moves in a minute. The line had better be ready."]
};

// THE LAB: no story, no goal. The player sets the pens and writes anything; Java runs it (POST /api/sandbox).
// The examples are the classic array algorithms, ready to run on whatever flock the player typed.
const LAB_EXAMPLES = {
  "Sum": `// add up every weight
int total = 0;
for (int i = 0; i < n; i++) {
    total = total + flock[i];
}`,
  "Biggest (max)": `// the pen of the heaviest sheep
int big = 0;
for (int i = 1; i < n; i++) {
    if (flock[i] > flock[big]) { big = i; }
}`,
  "Linear search": `// where is the sheep weighing 60? (-1 = not here)
int want = 60;
int pos = -1;
for (int i = 0; i < n; i++) {
    if (flock[i] == want) { pos = i; break; }
}`,
  "Reverse": `// two pointers walk inward, swapping
int l = 0;
int r = n - 1;
while (l < r) {
    int t = flock[l];
    flock[l] = flock[r];
    flock[r] = t;
    l++;
    r--;
}`,
  "Bubble sort": `// the heaviest sheep bubbles to the end, pass after pass
for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - 1 - i; j++) {
        if (flock[j] > flock[j + 1]) {
            int t = flock[j];
            flock[j] = flock[j + 1];
            flock[j + 1] = t;
        }
    }
}`,
  "Insertion sort": `// take each sheep and slide it left into place
for (int i = 1; i < n; i++) {
    int key = flock[i];
    int j = i - 1;
    while (j >= 0 && flock[j] > key) {
        flock[j + 1] = flock[j];
        j--;
    }
    flock[j + 1] = key;
}`,
  "Binary search": `// needs a SORTED flock (press Sorted first)
int want = 60;
int pos = -1;
int lo = 0;
int hi = n - 1;
while (lo <= hi) {
    int mid = (lo + hi) / 2;
    if (flock[mid] == want) { pos = mid; break; }
    if (flock[mid] < want) { lo = mid + 1; } else { hi = mid - 1; }
}`,
  "Insert at front": `// shift everyone right, then put 15 in pen 0
for (int i = n; i > 0; i--) {
    flock[i] = flock[i - 1];
}
flock[0] = 15;
n++;`,
  "Delete pen 2": `// close the gap: everyone after pen 2 shifts left
for (int i = 2; i < n - 1; i++) {
    flock[i] = flock[i + 1];
}
n--;`
};
const LAB = {
  id: "lab", tier: "LAB", title: "The Lab",
  story: "No giant. No clock. Your flock, your code: Athena only watches.",
  goal: "Type your own flock, write any C (or pick an example), and press GUIDE HIM.",
  hint: "Every example works on any flock you type. Binary search needs a sorted flock: press Sorted first.",
  starterCode: LAB_EXAMPLES["Bubble sort"], maxMoves: 0,
  structures: [{ name: "flock", kind: "array", capacity: 10, initial: [34, 52, 18, 77, 45, 60, 23, 81], lengthVar: "n" }]
};
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const PRESETS = {
  Random: () => Array.from({ length: rnd(5, 9) }, () => rnd(10, 99)),
  Sorted: () => Array.from({ length: rnd(6, 9) }, () => rnd(10, 99)).sort((a, b) => a - b),
  "Full (10)": () => Array.from({ length: 10 }, () => rnd(10, 99)),
  Three: () => Array.from({ length: 3 }, () => rnd(10, 99)),
  Empty: () => []
};
// "34 52, 18" -> [34, 52, 18], or an error in plain words
function parseFlock(text) {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length > 10) return { error: `That's ${parts.length} sheep: the cave has 10 pens.` };
  const vals = [];
  for (const p of parts) {
    if (!/^-?\d{1,3}$/.test(p)) return { error: `"${p}" isn't a whole number from -999 to 999.` };
    vals.push(parseInt(p, 10));
  }
  return { vals };
}

const css = `
#hour-card { position: fixed; inset: 0; z-index: 33; background: #050403; display: none; flex-direction: column; justify-content: center; padding-left: 9vw;
  font-family: Anton, Impact, sans-serif; color: #f2c230; pointer-events: none; }
#hour-card.on { display: flex; }
#hour-card .h { font-size: clamp(56px, 11vw, 150px); line-height: 0.9; letter-spacing: 2px; text-shadow: 5px 5px 0 #7e1a0f; }
#hour-card .s { margin-top: 18px; font-family: 'Courier Prime', monospace; font-size: clamp(15px, 1.6vw, 22px); color: #efe1c2; letter-spacing: 1px; }
#trial-panel .trial-hour { font-family: Anton, Impact, sans-serif; color: #e0644a; letter-spacing: 2px; font-size: 14px; margin-right: 8px; }
#trial-panel .lab { display: none; border: 1px solid #5a4422; border-radius: 4px; padding: 8px 10px; background: #1a130c; }
#trial-panel .lab.on { display: block; }
#trial-panel .lab label { display: block; font-size: 12.5px; color: #f2c230; letter-spacing: 1px; margin-bottom: 4px; }
#trial-panel .lab label small { color: #9c8a6c; letter-spacing: 0; }
#trial-panel .lab input { width: 100%; box-sizing: border-box; background: #0d0a07; color: #f4ead2; border: 1px solid #6b5432; border-radius: 3px; padding: 6px 8px; font: 15px 'Courier Prime', monospace; }
#trial-panel .lab input.bad { border-color: #e0442a; }
#trial-panel .lab .labbtns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; align-items: center; }
#trial-panel .lab .labbtns button, #trial-panel .lab select { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font: 12.5px 'Courier Prime', monospace; padding: 3px 8px; min-height: 28px; cursor: pointer; }
#trial-panel .lab .labbtns button:hover { border-color: #f2c230; }
#trial-panel .lab .labmsg { font-size: 12.5px; margin-top: 5px; color: #9c8a6c; min-height: 16px; }
#trial-panel .lab .labmsg.bad { color: #ff7a5c; }
#trial-panel .tab.labtab { border-color: #3f7a52; color: #8fe3a0; }
#trial-panel .tab.done:not(.on) { color: #9fd08a; }
#trial-panel .tab { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
`;

export class CaveTrials {
  // ctx: { world, pens, director, comic, panelView(on), onLesson(), onFinale(), fast: { on(), off() } }
  constructor(ctx) {
    this.athenaLine = new AthenaLine();                                    // Athena's code box, as on Circe's island
    this.voice = new VillainVoice("cave", { skipping: () => ctx.skipping() });   // the villain's voice box, as on Circe's island
    this.ctx = ctx; this.levels = []; this.level = null; this.busy = false;
    if (!document.getElementById("trial-css")) { const s = document.createElement("style"); s.id = "trial-css"; s.textContent = TRIAL_CSS; document.head.appendChild(s); }
    if (!document.getElementById("cave-trial-css")) { const s = document.createElement("style"); s.id = "cave-trial-css"; s.textContent = css; document.head.appendChild(s); }
    this.card = document.createElement("div"); this.card.id = "hour-card"; this.card.innerHTML = "<div class='h'></div><div class='s'></div>";
    document.body.appendChild(this.card);
    const el = this.el = document.createElement("aside");
    el.id = "trial-panel"; el.setAttribute("aria-label", "Athena: the trials");
    el.innerHTML = `<div class="who">ATHENA · THE TRIALS</div><div class="tabs"></div><h2></h2><p class="story"></p><p class="goal"></p>
      <div class="lab"><label for="labflock">YOUR FLOCK <small>(up to 10 whole numbers, pen 0 first)</small></label>
        <input id="labflock" class="labin" autocomplete="off" spellcheck="false">
        <div class="labbtns"></div><div class="labmsg" aria-live="polite"></div></div>
      <div class="meta"><span class="moves"></span><span class="hintArea"></span></div>
      <div class="editor"><div class="gutter">1</div><div class="wrap"><div class="hl"></div><label class="sr" style="position:absolute;left:-9999px" for="ccode">Your C code</label><textarea id="ccode" spellcheck="false" autocomplete="off"></textarea></div></div>
      <button class="run">GUIDE HIM</button>
      <div class="row"><button class="reset">Reset trial</button><button class="lessonb">Athena's lesson</button><button class="closeb">Close</button></div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="words">Words Athena understands: <code>flock[i]</code> <code>n</code> <code>int x = ...;</code> <code>x = ...;</code> <code>x++</code> <code>if</code> <code>else</code> <code>for</code> <code>while</code> <code>break</code></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    this.code = this.$("textarea"); this.gutter = this.$(".gutter"); this.hl = this.$(".hl");
    this.code.addEventListener("input", () => this.updateGutter());
    this.code.addEventListener("scroll", () => { this.gutter.scrollTop = this.code.scrollTop; this.hl.style.display = "none"; });
    this.code.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); const s = this.code.selectionStart; this.code.setRangeText("    ", s, this.code.selectionEnd, "end"); this.updateGutter(); } });
    this.$(".run").onclick = () => this.run();
    this.$(".reset").onclick = () => { if (!this.busy && this.level) this.select(this.level); };
    this.$(".lessonb").onclick = () => { if (!this.busy && ctx.onLesson) ctx.onLesson(); };
    this.$(".closeb").onclick = () => { if (!this.busy) this.close(); };
    this.board = new ArrayBoard();
    this.buildLab();
    this.codex = new Codex(el, CAVE_CODEX, part => this.runPart(part));
  }
  // the Codex's "run this part": the part's steps, in the Lab, on its own flock
  async runPart(part) {
    if (this.busy || !part.run) return;
    if (!this.levels.length) await this.open();
    LAB.structures[0].initial = part.run.flock.slice();
    await this.select(LAB);
    this.code.value = part.run.code; this.updateGutter();
    this.codex.say(part);
    await this.run();
    if (!this.busy) this.status(`${part.name}: that's the part from the whole program, run on the board. Step back with ◀ to see any moment again.`, "good");
  }

  // the Lab's controls: the flock box, the presets, the examples
  buildLab() {
    const box = this.$(".labbtns"), input = this.$(".labin");
    for (const [name, make] of Object.entries(PRESETS)) {
      const b = document.createElement("button"); b.textContent = name;
      b.onclick = () => { if (this.busy) return; input.value = make().join(" "); this.labInput(); };
      box.appendChild(b);
    }
    const sel = document.createElement("select"); sel.className = "examples"; sel.setAttribute("aria-label", "Load an example algorithm");
    sel.innerHTML = `<option value="">Examples…</option>` + Object.keys(LAB_EXAMPLES).map(k => `<option>${k}</option>`).join("");
    sel.onchange = () => { if (!sel.value || this.busy) return; this.code.value = LAB_EXAMPLES[sel.value]; this.updateGutter(); this.mark(0); this.status(`${sel.value} loaded. Press GUIDE HIM.`); sel.value = ""; };
    box.appendChild(sel);
    input.addEventListener("input", () => this.labInput());
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); this.run(); } });
  }
  // the typed flock goes straight into the pens (and is what Java will start from)
  labInput() {
    const input = this.$(".labin"), msg = this.$(".labmsg"), r = parseFlock(input.value);
    input.classList.toggle("bad", !!r.error);
    msg.classList.toggle("bad", !!r.error);
    this.$(".run").disabled = !!r.error || this.busy;
    if (r.error) { msg.textContent = r.error; return; }
    LAB.structures[0].initial = r.vals;
    msg.textContent = `n = ${r.vals.length}` + (r.vals.length ? `   ·   pens 0 to ${r.vals.length - 1} in use` : "   ·   the cave is empty");
    if (!this.busy) { this.ctx.pens.clearMarkers(); this.board.close(); this.ctx.pens.set(r.vals); }
  }
  // open straight onto the Lab
  async openLab() { await this.open(); if (this.levels.length) await this.select(LAB); }

  async open() {
    this.el.classList.add("on"); this.ctx.panelView(true);
    if (!this.levels.length) {
      try {
        const r = await fetch("/api/levels?island=cave");
        if (!r.ok) throw new Error("server answered " + r.status);
        this.levels = await r.json();
      } catch (e) { this.status("Can't reach the game server (" + e.message + "). Run the Spring Boot app in IntelliJ, then open http://localhost:8081/cave_env.html (not IntelliJ's browser preview).", "bad"); return; }
    }
    const d = done();
    await this.select(this.levels.find(l => !d.includes(l.id) && !this.locked(l)) || this.levels[0], false, true);
  }
  close() {
    this.el.classList.remove("on"); this.ctx.panelView(false); this.board.close();
    if (this.ctx.onClose) this.ctx.onClose();
  }
  // the finale opens once every practice trial is done (the bonus is optional)
  locked(l) { const d = done(); return l.tier === "FINALE" && this.levels.some(p => p.tier === "PRACTICE" && p.id !== "cave-bonus" && !d.includes(p.id)); }

  updateGutter() { const n = this.code.value.split("\n").length; this.gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n"); this.gutter.scrollTop = this.code.scrollTop; }
  mark(line, err = false) {
    if (!line || line < 1) { this.hl.style.display = "none"; return; }
    this.hl.style.display = "block"; this.hl.classList.toggle("err", err);
    this.hl.style.top = (10 + (line - 1) * 20 - this.code.scrollTop) + "px";
  }
  status(t, kind = "") { const s = this.$(".status"); s.textContent = t; s.className = "status " + kind; }
  moves(n) { const m = this.level.maxMoves; this.$(".moves").innerHTML = m ? `PENS LOOKED AT <b>${n}</b> / ${m}` : `PENS LOOKED AT <b>${n}</b>`; }

  renderTabs() {
    const d = done(), tabs = this.$(".tabs"); tabs.innerHTML = "";
    tabs.style.flexWrap = "wrap";
    [...this.levels, LAB].forEach((l, i) => {
      const b = document.createElement("button");
      b.className = "tab" + (l === this.level ? " on" : "");
      b.style.flex = "1 0 30%"; b.style.minHeight = "34px"; b.style.fontSize = "12px";
      const locked = this.locked(l);
      const hour = l === LAB ? "LAB" : (HOURS[l.id] || [String(i + 1)])[0].replace(".", "");
      if (l === LAB) b.classList.add("labtab");
      b.innerHTML = (locked ? icon("lock", { size: 14 }) + " " : l === LAB ? icon("flask", { size: 14 }) + " " : "") + hour + (d.includes(l.id) ? " " + icon("check", { size: 14 }) : "");
      if (d.includes(l.id)) b.classList.add("done");
      b.title = l.title;
      b.setAttribute("aria-pressed", l === this.level);
      b.setAttribute("aria-label", l.title + (locked ? " (locked)" : "") + (d.includes(l.id) ? " (done)" : ""));
      b.onclick = () => { if (this.busy) return; if (locked) { this.status("Finish the day first: dawn comes after every other hour.", "bad"); return; } this.select(l, false, true); };
      tabs.appendChild(b);
    });
  }

  // the camera stays on the pens in use: a window of five pens around the one being read or written,
  // or the whole row (and the dark past it) between runs
  view(snap = false) {
    const { pens, director } = this.ctx;
    director.frame(() => {
      const lo = this.focusI == null ? 0 : Math.max(0, this.focusI - 2), hi = this.focusI == null ? pens.cap : Math.min(pens.cap, this.focusI + 2);
      const a = pens.spot(lo), b = pens.spot(hi);
      return [a.clone().add(new THREE.Vector3(-1.0, 0, 1.6)), b.clone().add(new THREE.Vector3(1.0, 2.9, -0.8))];
    }, { dir: [0, 0.42, 1], fov: 40, margin: 1.12, minDist: 4, lag: 3, snap });
  }

  async hourCard(l) {
    const h = HOURS[l.id]; if (!h || this.ctx.skipping()) return;
    this.card.querySelector(".h").textContent = h[0];
    this.card.querySelector(".s").textContent = h[1];
    this.card.classList.add("on");
    await this.ctx.pens.wait(1.6);
    this.card.classList.remove("on");
  }

  // set the pens up exactly as the trial starts
  async select(l, keepCode = false, card = false) {
    this.athenaLine.clear();
    if (!keepCode && l !== LAB && !l.lesson) this.voice.opened(l.id);
    const { pens } = this.ctx;
    this.level = l;
    const lab = l === LAB;
    this.$("h2").innerHTML = `<span class="trial-hour">${lab ? "LAB" : (HOURS[l.id] || [""])[0]}</span>`; this.$("h2").append(l.title);
    this.$(".lab").classList.toggle("on", lab);
    this.$(".goal").style.display = lab ? "none" : "";
    this.$(".story").textContent = l.story;
    this.$(".goal").innerHTML = "<b>THE TRIAL</b>"; this.$(".goal").append(l.goal);
    const ha = this.$(".hintArea"); ha.innerHTML = "";
    if (l.hint) { const b = document.createElement("button"); b.className = "linkb"; b.textContent = "ask for a hint"; b.onclick = () => this.status(l.hint); ha.appendChild(b); }
    if (!keepCode) { this.code.value = l.starterCode; if (this.codex) this.codex.say(null); }
    this.updateGutter(); this.mark(0);
    this.moves(0); this.status("");
    const spec = (l.structures || [])[0] || { initial: [] };
    pens.clearMarkers();
    if (!keepCode) this.board.close();
    if (pens.eye.visible) await pens.sleep();
    pens.set(spec.initial);
    this.focusI = null; this.view(true);
    this.renderTabs();
    if (lab && !keepCode) { this.$(".labin").value = spec.initial.join(" "); this.labInput(); }
    if (card) await this.hourCard(l);
  }

  async run() {
    if (this.busy || !this.level) return;
    this.busy = true; this.$(".run").disabled = true;
    const code = this.code.value;
    await this.select(this.level, true);         // every run starts from the trial's starting state
    this.status("Athena speaks…");
    let res;
    try {
      const lab = this.level === LAB;
      const r = lab
        ? await fetch("/api/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ island: "cave", code, structures: LAB.structures }) })
        : await fetch(`/api/levels/${this.level.id}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (lab && r.status === 400) {          // the Lab's own setup was refused: say why, in Java's words
        let why = "The server refused this flock."; try { why = (await r.json()).message || why; } catch { /* no body */ }
        this.status(why.replace(/^\d+ BAD_REQUEST\s*"?|^BAD_REQUEST:\s*|"$/g, ""), "bad"); this.busy = false; this.$(".run").disabled = false; return;
      }
      if (!r.ok) throw new Error("server answered " + r.status);
      res = await r.json();
    } catch (e) { this.status("Can't reach the server (" + e.message + ").", "bad"); this.busy = false; this.$(".run").disabled = false; return; }
    this.ctx.fast.begin();
    try { await this.play(res, code.split("\n")); }
    finally { this.ctx.fast.end(); this.ctx.world.timeScale = 1; this.busy = false; this.$(".run").disabled = false; this.mark(0); if (this.el.classList.contains("on")) { this.focusI = null; this.view(); } }
  }

  // ---------- acting out Java's steps: on the pens (3D) and on the board (2D), together.
  // The board holds every frame, so the player can pause, step forward, or step BACK; going back
  // (or jumping) snaps the pens to that frame instead of animating.
  async play(res, lines) {
    const { pens, world } = this.ctx;
    this.lines = lines;
    if (res.outcome === "COMPILE_ERROR") return this.endCompile(res);
    const arr = (this.level.structures[0] || {}).name || "flock";
    let steps = (res.steps || []).filter(s => s.target === arr || s.action === "VAR");
    // a loop that never ends: show its first rounds, then the ending (no need to watch a thousand)
    if (res.outcome === "INFINITE_LOOP") steps = steps.slice(0, 30);
    const board = this.board, spec = (this.level.structures || [])[0] || { initial: [] };
    board.load({ name: arr, initial: spec.initial, cap: pens.cap, steps, code: lines.join("\n") });
    board.open();
    // long runs play faster (the finale moves dozens of sheep); the failure itself is always at normal speed
    const acting = steps.filter(s => s.action !== "VAR").length;
    // 1x is a calm, readable pace; only very long runs (the dawn finale) are sped up a little
    const pace = 0.6 * Math.min(2.5, Math.max(1, acting / 40));
    const P = this.player = { k: 0, playing: true, speed: 1, wake: null, junk: false, looked: 0, lastRead: -1, ended: false, gen: 0 };
    const rate = () => { if (!this.ctx.skipping()) world.timeScale = pace * P.speed; };
    rate();
    board.setPlaying(true);
    const resume = () => { if (P.wake) { const w = P.wake; P.wake = null; w(); } };
    board.cb.onPlay = () => { if (P.ended && P.k >= steps.length) { this.snapTo(0); P.k = 0; } P.playing = true; board.setPlaying(true); resume(); };
    board.cb.onPause = () => { P.playing = false; board.setPlaying(false); };
    board.cb.onSpeed = v => { P.speed = v; rate(); };
    board.cb.onStep = dir => {
      if (dir === "fwd") { P.playing = false; board.setPlaying(false); if (P.k < steps.length) { if (P.ended) { P.k++; this.snapTo(P.k); } else { P.once = true; resume(); } } }
      else if (dir === "last" && !P.ended) {
        // still running: race to the end at full speed, so the ending (and any failure) still plays out
        P.playing = true; board.setPlaying(true); if (!this.ctx.skipping()) world.timeScale = 8 * pace; resume();
      } else {
        P.playing = false; board.setPlaying(false); P.gen++;
        const to = dir === "back" ? P.k - 1 : dir === "first" ? 0 : steps.length;
        P.k = Math.max(0, Math.min(steps.length, to)); this.snapTo(P.k);
      }
      board.setEnabled(P.k > 0, P.k < steps.length);
    };
    board.setEnabled(false, true);
    this.steps = steps;

    while (P.k < steps.length) {
      if (!P.playing && !P.once) { await new Promise(r => (P.wake = r)); if (P.k >= steps.length) break; }
      const st = steps[P.k], gen = P.gen;
      const stop = await this.act(st, res);
      P.once = false;
      if (gen !== P.gen) { this.snapTo(P.k); continue; }   // they stepped back while this step was playing: stay where they put it
      P.k++; board.show(P.k); board.setEnabled(P.k > 0, P.k < steps.length);
      if (stop) { P.ended = true; return stop(); }
      if (st.action === "VAR") await pens.wait(0.05);
    }
    this.athenaLine.clear();
    P.ended = true; board.setPlaying(false); board.setEnabled(P.k > 0, false);
    world.timeScale = 1; this.ctx.fast.land();
    if (res.outcome === "SUCCESS") return this.endSuccess(res);
    if (res.outcome === "GOAL_NOT_MET") return this.endGoalNotMet(res, { junk: P.junk });
    if (res.outcome === "INFINITE_LOOP") return this.endLoop(res);
    return this.endFail(res, "SOMETHING WENT WRONG", res.message, { line: res.line });
  }

  // one step on the pens. Returns an ending to run if this step ends the trial.
  async act(st, res) {
    const { pens, world } = this.ctx, P = this.player, board = this.board;
    this.mark(st.line);
    this.status(`line ${st.line}: ${st.message}`);
    this.athenaLine.step(this.code.value, st, this.player.k + 1, this.steps.length);
    const idx = st.index;
    if (st.action === "VAR") {
      // an index variable moved: its coloured ring slides to the pen it points at
      if (board.isPointer(st.target) && st.value >= 0 && st.value <= pens.cap) {
        const col = parseInt(board.pointerColor(st.target).slice(1), 16);
        pens.marker(st.target, Math.min(st.value, pens.cap), col);
      } else if (board.isPointer(st.target)) pens.hideMarker(st.target);
      return null;
    }
    if (st.action === "READ" || st.action === "JUNK") {
      this.focusI = idx;
      if (st.action === "JUNK") { P.junk = true; world.timeScale = P.speed; }
      sound.op("tick"); await pens.read(idx, st.action === "JUNK" ? st.value : null);
      P.lastRead = idx;
      this.moves(++P.looked);
    } else if (st.action === "WRITE") {
      this.focusI = idx;
      // flock[to] = flock[from]: if the value just read still stands in its pen, a twin walks over;
      // otherwise (a value held in a variable, or a new lamb) a sheep walks in from the front
      let from = -1;
      if (P.lastRead >= 0 && P.lastRead !== idx && pens.values[P.lastRead] === st.value && (pens.sheep[P.lastRead] || pens.junk[P.lastRead])) from = P.lastRead;
      sound.op("thump");
      if (from >= 0) await pens.copy(from, idx); else await pens.write(idx, st.value);
      P.lastRead = -1;
    } else if (st.action === "LENGTH") {
      pens.setN(Math.max(0, Math.min(pens.cap, st.value)));
      await pens.wait(0.3);
    } else if (st.action === "OUT_OF_BOUNDS") {
      world.timeScale = 1; this.ctx.fast.land();
      this.focusI = Math.min(pens.cap, Math.max(0, idx));
      await pens.wake();
      return () => this.endFail(res, "OUT OF BOUNDS", `flock[${idx}] doesn't exist: the cave has pens 0 to ${pens.cap - 1}. You reached into the dark, and something reached back.`, { eye: true });
    } else if (st.action === "OVERFLOW") {
      world.timeScale = 1; this.ctx.fast.land();
      return () => this.endFail(res, "THE CAVE IS FULL", `All ${pens.cap} pens are taken. There's no pen ${pens.cap} for ${st.value}.`);
    }
    return null;
  }

  // jump the pens straight to the state after k steps (stepping back, or skipping ahead)
  snapTo(k) {
    const { pens } = this.ctx, board = this.board, f = board.frames[Math.max(0, Math.min(board.frames.length - 1, k))];
    const vals = f.values.map((v, i) => (v == null ? 11 + ((i * 37) % 80) : v));
    pens.set(vals.slice(0, f.n), { junk: vals.slice(f.n) });
    for (let i = f.n; i < pens.cap; i++) if (f.values[i] != null) pens.revealJunk(i, f.values[i]);   // junk already read: its number shows
    for (const [name, v] of Object.entries(f.vars)) {
      if (!board.isPointer(name)) continue;
      if (v >= 0 && v <= pens.cap) pens.marker(name, v, parseInt(board.pointerColor(name).slice(1), 16)); else pens.hideMarker(name);
    }
    const st = this.steps[k - 1];
    this.focusI = f.hl ? f.hl.i : null;
    this.mark(st ? st.line : 0);
    board.show(k);
    board.setEnabled(k > 0, k < this.steps.length);
  }

  // ---------- endings
  async endSuccess(res) {
    if (this.level && this.level !== LAB) this.voice.solved(this.level.id);
    const { director } = this.ctx;
    this.focusI = null; this.view();
    if (this.level === LAB) {                 // the Lab has nothing to win: just say how the flock ended up
      this.status(res.message, "good");
      await director.stamp("DONE", "step back through it on the board", { kind: "good", seconds: 1.6 });
      return;
    }
    markDone(this.level.id); this.renderTabs();
    if (this.level.tier === "FINALE") {
      this.status(res.message, "good");
      await director.stamp("THE LINE IS READY", res.message, { kind: "good", seconds: 2.6 });
      this.el.classList.remove("on"); this.ctx.panelView(false); this.board.close();
      if (this.ctx.onFinale) await this.ctx.onFinale();
      return;
    }
    const next = this.levels.find(l => !done().includes(l.id) && !this.locked(l));
    this.status(res.message + (next ? ` Next: ${(HOURS[next.id] || [""])[0].replace(".", "")} · ${next.title}` : ""), "good");
    await director.stamp("DONE", res.message, { kind: "good", seconds: 2.4 });
  }
  async endGoalNotMet(res, { junk = false } = {}) {
    const { director, pens } = this.ctx;
    this.mark(0);
    this.status(res.message + " Fix the code and try again.", "bad");
    if (junk) {           // you read past n: the eye in the dark opens
      this.focusI = pens.cap; await pens.marker("i", pens.n);
      await pens.wake();
      await director.stamp("NOT YET", res.message, { kind: "bad", seconds: 3.0 });
      await pens.sleep();
      return;
    }
    await director.stamp("NOT YET", res.message, { kind: "bad", seconds: 3.0 });
  }
  async endCompile(res) {
    this.mark(res.line, true);
    this.status(`Line ${res.line}: ${res.message}`, "bad");
    await this.ctx.director.stamp("ATHENA'S WORDS DID NOT REACH HIM", `line ${res.line}: ${res.message}`, { kind: "bad" });
  }
  async endLoop(res) {
    this.mark(res.line, true);
    this.status(res.message, "bad");
    await this.ctx.director.stamp("THE SAME MOMENT, AGAIN AND AGAIN", res.message, { kind: "bad", seconds: 3.5 });
  }
  async endFail(res, title, why, { line = res.line, eye = false } = {}) {
    const { director, pens } = this.ctx;
    this.mark(line, true);
    this.status(res.message + " Fix the code and try again.", "bad");
    const lineText = line > 0 ? (this.lines[line - 1] || "").trim() : "";
    const focus = eye ? { x: pens.spot(pens.cap).x, z: 0, y: 0.6 } : { x: pens.spot(Math.max(0, pens.n - 1)).x, z: 0, y: 0.4 };
    await director.siren({ title, sub: why, lineNo: line, lineText, focus });
    if (eye) await pens.sleep();
  }
}
