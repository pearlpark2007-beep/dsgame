// underworldTrials.js — the Underworld's three doors (queues). The player writes C with enqueue(&line, x),
// dequeue(&line), peek(&line), size, isFull, isEmpty (Athena's lesson: the course's own array queue).
// Java runs it (POST /api/levels/{id}/play, or /api/sandbox for the Lab and the lessons) and answers
// with an outcome and the steps: ENQUEUE, DEQUEUE, PEEK, FULL, EMPTY, or ARRAY/WRITE/READ and the
// variables front and rear for the lesson's own array. Every step becomes a frame up front
// (queueBoard.js); the board draws it flat, the pit (pit.js) draws it in 3D. Going back shows an
// earlier frame in both. The browser never decides if the code is right: Java does.
import { TRIAL_CSS } from "../../learn/trialPanelCss.js";
import { QueueBoard, SHADES } from "../../learn/queueBoard.js";
import { Codex } from "../../learn/codex.js";
import { LESSONS, lessonCode, UNDERWORLD_CODEX, FULL, PROGRAMS } from "./underworldLessons.js";
import { icon } from "../../ui/icons.js";
import { AthenaLine } from "../../learn/athenaLine.js";
import { VillainVoice } from "../../ui/villainVoice.js";

const STORE = "odyssey.underworld.done";
const done = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const markDone = id => { try { const d = done(); if (!d.includes(id)) { d.push(id); localStorage.setItem(STORE, JSON.stringify(d)); } } catch { /* storage off */ } };

// a black card before each trial: the night goes on
const CARDS = {
  "underworld-1": ["ONE.", "The office opens. Nobody has ever been late for it."],
  "underworld-2": ["TWO.", "Ajax at the front. He still hasn't forgiven you."],
  "underworld-3": ["THREE.", "The prophet goes first. That was the deal."],
  "underworld-4": ["FOUR.", "Five seats. Six souls. Do the arithmetic."],
  "underworld-finale": ["CLOSING TIME.", "Eight souls, four places on the carousel, and the office shuts at dawn."]
};
const NAMES = Object.entries(SHADES).map(([v, n]) => `${v} ${n}`).join(", ");

// THE LAB: any line, any code
const LAB_EXAMPLES = {
  "Serve everyone": `// one at a time, front first, until nobody waits
int served = 0;
while (!isEmpty(&line)) {
    dequeue(&line);
    served++;
}`,
  "Who's at the front": `int next = peek(&line);    // looks, takes nobody
int waiting = size(&line);`,
  "Front to the back": `// the front soul goes round to the rear: the line turns, nobody leaves
enqueue(&line, dequeue(&line));`,
  "Turn until 99 is first": `while (peek(&line) != 99) {
    enqueue(&line, dequeue(&line));
}
int prophet = dequeue(&line);`,
  "Fill every stone": `int v = 50;
while (!isFull(&line)) {
    enqueue(&line, v);
    v++;
}`,
  "Round the circle": `// serve one, let one join: watch rear go round past the last place
for (int i = 0; i < 6; i++) {
    dequeue(&line);
    enqueue(&line, 60 + i);
}`,
  "One too many (bug)": `// enqueue without asking isFull
for (int i = 0; i < 9; i++) {
    enqueue(&line, i);
}`,
  "Nobody left (bug)": `// dequeue without asking isEmpty
for (int i = 0; i < 9; i++) {
    dequeue(&line);
}`
};
const LAB = {
  id: "lab", tier: "LAB", title: "The Lab",
  story: "No judge, no story. Your line, your code: Athena only watches.",
  goal: "", hint: "Up to as many souls as there are stones. Values go front first.",
  starterCode: LAB_EXAMPLES["Round the circle"], maxMoves: 0,
  structures: [{ name: "line", kind: "queue", capacity: 5, initial: [7, 12, 30], lengthVar: null }]
};
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const PRESETS = {
  Random: cap => Array.from({ length: rnd(1, cap) }, () => rnd(1, 99)),
  "The dead (3)": () => [7, 12, 30],
  Full: cap => Array.from({ length: cap }, (_, i) => [7, 12, 30, 41, 23, 5, 99, 66][i]),
  Empty: () => []
};
function parseLine(text, cap) {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length > cap) return { error: `That's ${parts.length} souls for ${cap} places. Add places or send some away.` };
  const vals = [];
  for (const p of parts) {
    if (!/^-?\d{1,3}$/.test(p)) return { error: `"${p}" isn't a whole number from -999 to 999.` };
    vals.push(parseInt(p, 10));
  }
  return { vals };
}
// the lesson's starting hall, as the steps Java would send for the globals (so the picture is right before SHOW ME)
function startSteps(ls) {
  const P = PROGRAMS[ls.prog], st = ls.start || { cells: [0, 0, 0, 0, 0], front: -1, rear: -1 };
  const cells = Array.from({ length: 5 }, (_, i) => st.cells[i] ?? 0);
  const steps = [{ target: P.arr, action: "ARRAY", index: 5, value: 0, message: `int ${P.arr}[5]: ` + cells.join(" "), line: 0 }];
  if (P.shape === "pq") steps.push({ target: "count", action: "VAR", index: 0, value: st.count, message: "", line: 0 });
  else steps.push({ target: "front", action: "VAR", index: 0, value: st.front, message: "", line: 0 }, { target: "rear", action: "VAR", index: 0, value: st.rear, message: "", line: 0 });
  return steps;
}
const shapeOf = l => (l.lesson ? PROGRAMS[l.lesson.prog].shape : "ring");

const css = `
#trial-card { position: fixed; inset: 0; z-index: 33; background: #101a31; display: none; flex-direction: column; justify-content: center; padding-left: 9vw;
  font-family: Anton, Impact, sans-serif; color: #f1e8d2; pointer-events: none; }
#trial-card.on { display: flex; }
#trial-card .h { font-size: clamp(56px, 11vw, 150px); line-height: 0.9; letter-spacing: 2px; text-shadow: 5px 5px 0 #24365e; padding-bottom: 14px; border-bottom: 3px solid #d8a84e; align-self: flex-start; }
#trial-card .s { margin-top: 18px; font-family: 'Courier Prime', monospace; font-size: clamp(15px, 1.6vw, 22px); color: #d8a84e; letter-spacing: 1px; }
#trial-panel .trial-hour { font-family: Anton, Impact, sans-serif; color: #d8a84e; letter-spacing: 2px; font-size: 14px; margin-right: 8px; }
#trial-panel .lab { display: none; border: 1px solid #5a4422; border-radius: 4px; padding: 8px 10px; background: #1a130c; }
#trial-panel .lab.on { display: block; }
#trial-panel .lab label { display: block; font-size: 12.5px; color: #f2c230; letter-spacing: 1px; margin-bottom: 4px; }
#trial-panel .lab label small { color: #9c8a6c; letter-spacing: 0; }
#trial-panel .lab input { width: 100%; box-sizing: border-box; background: #0d0a07; color: #f4ead2; border: 1px solid #6b5432; border-radius: 3px; padding: 6px 8px; font: 15px 'Courier Prime', monospace; }
#trial-panel .lab input.bad { border-color: #e0442a; }
#trial-panel .lab .labbtns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; align-items: center; }
#trial-panel .lab .labbtns button, #trial-panel .lab select { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font: 12.5px 'Courier Prime', monospace; padding: 3px 8px; min-height: 28px; cursor: pointer; }
#trial-panel .lab .labmsg { font-size: 12.5px; margin-top: 5px; color: #9c8a6c; min-height: 16px; }
#trial-panel .lab .labmsg.bad { color: #ff7a5c; }
#trial-panel .tab.labtab { border-color: #3f7a52; color: #8fe3a0; }
#trial-panel .lab .stones { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12.5px; color: #9c8a6c; }
#trial-panel .lab .stones select { min-height: 28px; }
/* three doors, three colours: you always know where you are */
#trial-panel { border-top: 8px solid var(--mode, #d8a84e); }
#trial-panel.m-trials { --mode: #d8a84e; } #trial-panel.m-lab { --mode: #f1e8d2; } #trial-panel.m-lesson { --mode: #57b9d1; }
#trial-panel .who { display: flex; align-items: center; gap: 10px; }
#trial-panel .who .badge { font-size: 13px; letter-spacing: 2px; padding: 2px 8px; border-radius: 3px; background: var(--mode); color: #111522; text-shadow: none; font-family: 'Courier Prime', monospace; font-weight: 700; }
#trial-panel.m-lab .who .badge { color: #120c06; }
#trial-panel .who .sub { font-family: 'Courier Prime', monospace; font-size: 12.5px; color: #9c8a6c; letter-spacing: 0; text-shadow: none; }
#trial-panel.m-lesson .tab.on { background: #57b9d1; border-color: #57b9d1; color: #111522; }
#trial-panel .lesson-watch { display: none; border-left: 4px solid #57b9d1; background: #13213f; padding: 7px 10px; font-size: 13px; line-height: 1.4; color: #e6eef6; }
#trial-panel.m-lesson .lesson-watch { display: block; }
#trial-panel .lesson-watch b { color: #8fd3e2; }
#trial-panel .lesson-watch.mis { border-left-color: #c64a36; background: #2a120e; color: #ffd9d0; } #trial-panel .lesson-watch.mis b { color: #e8806c; }
#trial-panel .lesson-btns { display: none; gap: 6px; flex-wrap: wrap; }
#trial-panel.m-lesson .lesson-btns { display: flex; }
#trial-panel .lesson-btns button { flex: 1; min-height: 34px; background: #1a130c; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font: 700 12.5px 'Courier Prime', monospace; cursor: pointer; }
#trial-panel .lesson-btns button.mis { border-color: #c64a36; color: #e8806c; }
#trial-panel .lesson-btns button:disabled { opacity: 0.35; cursor: default; }
#trial-panel.m-lesson .tabs .tab { flex: 1 0 18% !important; }
#trial-panel.m-lesson .lab select.examples, #trial-panel.m-lesson .meta { display: none; }
#trial-panel .status:empty { display: none; }
`;

export class UnderworldTrials {
  // ctx: { world, pit, island, director, comic, panelView(on), onClose(), onFinale(), skipping(), fast: { begin(), land(), end() } }
  constructor(ctx) {
    this.athenaLine = new AthenaLine();                                    // Athena's code box, as on Circe's island
    this.voice = new VillainVoice("underworld", { skipping: () => ctx.skipping() });   // the villain's voice box, as on Circe's island
    this.ctx = ctx; this.levels = []; this.level = null; this.busy = false;
    if (!document.getElementById("trial-css")) { const s = document.createElement("style"); s.id = "trial-css"; s.textContent = TRIAL_CSS; document.head.appendChild(s); }
    if (!document.getElementById("circe-trial-css")) { const s = document.createElement("style"); s.id = "circe-trial-css"; s.textContent = css; document.head.appendChild(s); }
    this.card = document.createElement("div"); this.card.id = "trial-card"; this.card.innerHTML = "<div class='h'></div><div class='s'></div>";
    document.body.appendChild(this.card);
    const el = this.el = document.createElement("aside");
    el.id = "trial-panel"; el.setAttribute("aria-label", "Athena: the trials");
    el.innerHTML = `<div class="who"><span class="badge"></span><span class="sub"></span></div><div class="tabs"></div><h2></h2><p class="story"></p><p class="goal"></p>
      <div class="lesson-watch"></div><div class="lesson-btns"><button class="lb-right">✓ The right code</button><button class="lb-mis mis">✗ Show the classic mistake</button></div>
      <div class="lab"><label for="labline">THE LINE <small>(front first, numbers)</small></label>
        <input id="labline" class="labin" autocomplete="off" spellcheck="false">
        <div class="stones"><label for="labcap" style="margin:0">Places on the carousel</label><select id="labcap" class="labcap">${[3, 4, 5, 6, 7, 8].map(n => `<option${n === 5 ? " selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="labbtns"></div><div class="labmsg" aria-live="polite"></div></div>
      <div class="meta"><span class="moves"></span><span class="hintArea"></span></div>
      <div class="editor"><div class="gutter">1</div><div class="wrap"><div class="hl"></div><label class="sr" style="position:absolute;left:-9999px" for="ucode">Your C code</label><textarea id="ucode" spellcheck="false" autocomplete="off"></textarea></div></div>
      <button class="run">GUIDE HIM</button>
      <div class="row"><button class="reset">Reset</button><button class="closeb">◂ Back to the three doors</button></div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="words">Words Athena understands: <code>enqueue(&amp;line, x)</code> <code>dequeue(&amp;line)</code> <code>peek(&amp;line)</code> <code>size(&amp;line)</code> <code>isFull(&amp;line)</code> <code>isEmpty(&amp;line)</code> <code>int</code> arrays <code>#define</code> <code>%</code> <code>if</code> <code>while</code> <code>for</code> <code>printf</code> your own functions. Who's who: ${NAMES}.</div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    el.querySelector(".editor").before(el.querySelector(".status"));
    this.code = this.$("textarea"); this.gutter = this.$(".gutter"); this.hl = this.$(".hl");
    this.code.addEventListener("input", () => this.updateGutter());
    this.code.addEventListener("scroll", () => { this.gutter.scrollTop = this.code.scrollTop; if (this._auto) { this._auto = false; return; } this.hl.style.display = "none"; });
    this.code.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); const s = this.code.selectionStart; this.code.setRangeText("    ", s, this.code.selectionEnd, "end"); this.updateGutter(); } });
    this.$(".run").onclick = () => this.run();
    this.$(".reset").onclick = () => { if (!this.busy && this.level) this.select(this.level); };
    this.$(".lb-right").onclick = () => { if (!this.busy && this.level && this.level.lesson) this.selectLesson(this.level.lesson, false); };
    this.$(".lb-mis").onclick = () => { if (!this.busy && this.level && this.level.lesson) this.selectLesson(this.level.lesson, true); };
    this.$(".closeb").onclick = () => { if (!this.busy) this.close(); };
    this.board = new QueueBoard();
    this.buildLab();
    this.codex = new Codex(el, UNDERWORLD_CODEX, part => this.runPart(part));
    this.lessons = LESSONS.map(l => ({ id: "lesson-" + l.id, tier: "LESSON", title: `${l.n} · ${l.name}`, lesson: l, sandbox: true, structures: [{ name: "line", kind: "queue", capacity: 5, initial: [], lengthVar: null }] }));
    this.setMode("trials");
  }
  async runPart(part) { if (this.busy || !part.lesson) return; await this.openLesson(part.lesson.id, true); }

  setMode(mode) {
    this.mode = mode;
    this.el.classList.remove("m-trials", "m-lab", "m-lesson"); this.el.classList.add("m-" + mode);
    const [badge, sub] = { trials: ["THE OFFICE OF HADES", "it judges · four trials, then closing time"], lab: ["THE LAB", "no judge · your queue, your code"], lesson: ["ATHENA'S LESSON", "queues in C, line by line · nothing is graded"] }[mode];
    this.$(".who .badge").textContent = badge; this.$(".who .sub").textContent = sub;
    this.el.setAttribute("aria-label", badge);
    const t = this.codex && this.codex.tabs.querySelector(".t-trials"); if (t) t.textContent = { trials: "THE TRIALS", lab: "THE LAB", lesson: "THE LESSON" }[mode];
    if (this.codex) this.codex.show(false);
    this.$(".run").textContent = mode === "lesson" ? "▶ SHOW ME" : mode === "lab" ? "▶ RUN IT" : "GUIDE HIM";
    this.$(".reset").textContent = mode === "trials" ? "Reset trial" : mode === "lab" ? "Reset line" : "Reset lesson";
    this.$(".lab .stones").style.display = mode === "lab" ? "" : "none";
    this.$(".labin").disabled = mode === "lesson";
    this.$(".lab label[for=labline]").innerHTML = mode === "lesson" ? "THE HALL <small>(Athena sets it with the globals at the top of the code)</small>" : "THE LINE <small>(front first, numbers)</small>";
  }

  async openLesson(id = null, runNow = false) {
    this.setMode("lesson");
    this.el.classList.add("on"); this.ctx.panelView(true);
    const l = (id && this.lessons.find(x => x.lesson.id === id)) || this.level && this.level.lesson && this.level || this.lessons[0];
    await this.selectLesson(l.lesson, false);
    if (runNow) await this.run();
  }
  async selectLesson(lesson, mistake) { const l = this.lessons.find(x => x.lesson === lesson); l.mistake = !!mistake; await this.select(l); }

  async open() { this.setMode("trials"); await this.loadLevels(); }
  async loadLevels() {
    this.el.classList.add("on"); this.ctx.panelView(true);
    if (!this.levels.length) {
      try {
        const r = await fetch("/api/levels?island=underworld");
        if (!r.ok) throw new Error("server answered " + r.status);
        this.levels = await r.json();
      } catch (e) { this.status("Can't reach the game server (" + e.message + "). Run the Spring Boot app in IntelliJ, then open http://localhost:8081/underworld_env.html (not IntelliJ's browser preview).", "bad"); return; }
    }
    if (this.mode !== "trials") return;
    const d = done();
    await this.select(this.levels.find(l => !d.includes(l.id) && !this.locked(l)) || this.levels[0], false, true);
  }
  async openLab() { this.setMode("lab"); this.el.classList.add("on"); this.ctx.panelView(true); await this.select(LAB); }
  close() { this.el.classList.remove("on"); this.ctx.panelView(false); this.board.close(); if (this.ctx.onClose) this.ctx.onClose(); }
  locked(l) { const d = done(); return l.tier === "FINALE" && this.levels.some(p => p.tier === "PRACTICE" && !d.includes(p.id)); }

  updateGutter() { const n = this.code.value.split("\n").length; this.gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n"); this.gutter.scrollTop = this.code.scrollTop; }
  mark(line, err = false) {
    if (!line || line < 1) { this.hl.style.display = "none"; return; }
    this.hl.style.display = "block"; this.hl.classList.toggle("err", err);
    const y = 10 + (line - 1) * 20, h = this.code.clientHeight || 300;
    if (y < this.code.scrollTop + 10 || y > this.code.scrollTop + h - 40) { this._auto = true; this.code.scrollTop = Math.max(0, y - h / 2); this.gutter.scrollTop = this.code.scrollTop; }
    this.hl.style.top = (y - this.code.scrollTop) + "px";
  }
  status(t, kind = "") { const s = this.$(".status"); s.textContent = t; s.className = "status " + kind; }
  moves(n) { this.$(".moves").innerHTML = `SOULS SERVED <b>${n}</b>`; }

  renderTabs() {
    const d = done(), tabs = this.$(".tabs"); tabs.innerHTML = "";
    tabs.style.flexWrap = "wrap";
    tabs.style.display = this.mode === "lab" ? "none" : "";
    if (this.mode === "lesson") {
      this.lessons.forEach(l => {
        const b = document.createElement("button");
        b.className = "tab" + (l === this.level ? " on" : "");
        b.style.minHeight = "34px"; b.style.fontSize = "12px";
        b.textContent = `${l.lesson.n}`; b.title = l.title;
        b.setAttribute("aria-pressed", l === this.level); b.setAttribute("aria-label", l.title);
        b.onclick = () => { if (!this.busy) this.selectLesson(l.lesson, false); };
        tabs.appendChild(b);
      });
      return;
    }
    this.levels.forEach((l, i) => {
      const b = document.createElement("button");
      b.className = "tab" + (l === this.level ? " on" : "");
      b.style.flex = "1 0 30%"; b.style.minHeight = "34px"; b.style.fontSize = "12px";
      const locked = this.locked(l);
      // line icons, as every chapter's tabs: lock and check (no emoji)
      b.innerHTML = (locked ? icon("lock", { size: 13 }) + " " : "") + (CARDS[l.id] || [String(i + 1)])[0].replace(/\.$/, "") + (d.includes(l.id) ? " " + icon("check", { size: 13 }) : "");
      b.style.display = "inline-flex"; b.style.alignItems = "center"; b.style.justifyContent = "center"; b.style.gap = "5px";
      b.title = l.title;
      b.setAttribute("aria-pressed", l === this.level);
      b.setAttribute("aria-label", l.title + (locked ? " (locked)" : "") + (d.includes(l.id) ? " (done)" : ""));
      b.onclick = () => { if (this.busy) return; if (locked) { this.status("Closing time comes after the other four trials.", "bad"); return; } this.select(l, false, true); };
      tabs.appendChild(b);
    });
  }

  // the camera keeps the whole queue in view, from above and in front, like the board under it
  view(snap = false) {
    const { pit, director } = this.ctx;
    director.frame(() => pit.points(), { dir: [0, 0.85, 1], fov: 40, margin: 1.16, minDist: 6, lag: 2.6, snap });   // a medium-high three-quarter view: every station, both ends, the travellers as figures
  }

  async trialCard(l) {
    const h = CARDS[l.id]; if (!h || this.ctx.skipping()) return;
    this.card.querySelector(".h").textContent = h[0];
    this.card.querySelector(".s").textContent = h[1];
    this.card.classList.add("on");
    await this.ctx.pit.wait(1.6);
    this.card.classList.remove("on");
  }

  // ---------- the Lab's controls
  buildLab() {
    const box = this.$(".labbtns"), input = this.$(".labin"), cap = this.$(".labcap");
    for (const [name, make] of Object.entries(PRESETS)) {
      const b = document.createElement("button"); b.textContent = name;
      b.onclick = () => { if (this.busy) return; input.value = make(+cap.value).join(" "); this.labInput(); };
      box.appendChild(b);
    }
    const sel = document.createElement("select"); sel.className = "examples"; sel.setAttribute("aria-label", "Load an example");
    sel.innerHTML = `<option value="">Examples…</option><optgroup label="With the line">` + Object.keys(LAB_EXAMPLES).map(k => `<option>${k}</option>`).join("")
      + `</optgroup><optgroup label="The course's queue program"><option value="full">The whole program (queue.c, with main)</option></optgroup>`;
    sel.onchange = () => {
      if (!sel.value || this.busy) return;
      this.code.value = sel.value === "full" ? FULL : LAB_EXAMPLES[sel.value]; this.code.scrollTop = 0;
      this.updateGutter(); this.mark(0); this.status(`${sel.value === "full" ? "queue.c" : sel.value} loaded. Press ${this.$(".run").textContent.trim()}.`); sel.value = "";
    };
    box.appendChild(sel);
    input.addEventListener("input", () => this.labInput());
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); this.run(); } });
    cap.addEventListener("change", () => this.labInput());
  }
  labInput() {
    if (this.level && this.level.lesson) return;
    const input = this.$(".labin"), msg = this.$(".labmsg"), cap = +this.$(".labcap").value, r = parseLine(input.value, cap);
    input.classList.toggle("bad", !!r.error); msg.classList.toggle("bad", !!r.error);
    this.$(".run").disabled = !!r.error || this.busy;
    if (r.error) { msg.textContent = r.error; return; }
    LAB.structures[0].initial = r.vals; LAB.structures[0].capacity = cap;
    msg.textContent = r.vals.length ? `front | ${r.vals.join(" ")} | rear · ${cap} places` : `nobody waiting · ${cap} places`;
    if (!this.busy) this.setUp(LAB);
  }

  // the ring exactly as a trial starts
  setUp(l) {
    const spec = (l.structures || [])[0] || { capacity: 5, initial: [] };
    this.board.close();
    if (l.lesson) { this.board.load({ capacity: 5, initial: [], steps: startSteps(l.lesson), shape: shapeOf(l) }); this.board.show(this.board.frames.length - 1); this.ctx.pit.show(this.board.frames[this.board.frames.length - 1]); }
    else { this.board.load({ capacity: spec.capacity, initial: spec.initial, steps: [], shape: "ring" }); this.ctx.pit.show(this.board.frames[0]); }
    this.view(true);
  }

  async select(l, keepCode = false, card = false) {
    this.athenaLine.clear();
    if (!keepCode && l !== LAB && !l.lesson) this.voice.opened(l.id);
    this.level = l;
    this.ctx.pit.clearProphecy(); this.ctx.island.clearServing();
    const lab = l === LAB, ls = l.lesson;
    this.$("h2").innerHTML = `<span class="trial-hour">${lab ? "LAB" : ls ? "LESSON " + ls.n : (CARDS[l.id] || [""])[0]}</span>`; this.$("h2").append(ls ? ls.name : l.title);
    if (ls) this.$(".story").innerHTML = l.mistake ? ls.mistake.say : ls.say;
    else this.$(".story").textContent = l.story;
    this.$(".goal").innerHTML = "<b>THE TRIAL</b>"; this.$(".goal").append(l.goal || "");
    this.$(".goal").style.display = lab || ls ? "none" : "";
    this.$(".lab").classList.toggle("on", lab || !!ls);
    this.$(".lab .labbtns").style.display = ls ? "none" : "";
    const w = this.$(".lesson-watch");
    if (ls) {
      w.classList.toggle("mis", !!l.mistake);
      w.innerHTML = l.mistake ? `<b>THE MISTAKE · </b>${ls.mistake.label}. Press SHOW ME and watch what breaks.` : `<b>WATCH FOR · </b>${ls.watch}`;
      this.$(".lb-mis").disabled = !ls.mistake; this.$(".lb-mis").textContent = ls.mistake ? `✗ The classic mistake: ${ls.mistake.label}` : "✗ (no classic mistake here)";
      const st = ls.start;
      const arr = PROGRAMS[ls.prog].arr;
      this.$(".labin").value = !st ? "queue empty, front = rear = -1" : ls.prog === "pq" ? `pq = {${st.cells.join(", ")}}, count = ${st.count}` : `${arr} = {${st.cells.join(", ")}}, front = ${st.front}, rear = ${st.rear}`;
      this.$(".labmsg").textContent = "";
    }
    const ha = this.$(".hintArea"); ha.innerHTML = "";
    if (l.hint) { const b = document.createElement("button"); b.className = "linkb"; b.textContent = "ask for a hint"; b.onclick = () => this.status(l.hint); ha.appendChild(b); }
    if (!keepCode) { this.code.value = ls ? lessonCode(ls, l.mistake) : l.starterCode; if (this.codex) this.codex.say(null); this.code.scrollTop = 0; }
    this.updateGutter(); this.mark(0); this.moves(0);
    this.status(ls && !keepCode ? `This is ${PROGRAMS[ls.prog].name}, the functions it needs, unchanged. The last lines call them. Press SHOW ME.` : "");
    if (lab && !keepCode) { this.$(".labin").value = l.structures[0].initial.join(" "); this.$(".labcap").value = String(l.structures[0].capacity); this.labInput(); }
    else this.setUp(l);
    this.renderTabs();
    if (card) await this.trialCard(l);
  }

  async run() {
    if (this.busy || !this.level) return;
    this.busy = true; this.$(".run").disabled = true;
    const code = this.code.value;
    await this.select(this.level, true);
    this.status("Athena speaks…");
    let res;
    try {
      const lab = this.level === LAB || !!this.level.sandbox;
      const r = lab
        ? await fetch("/api/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ island: "underworld", code, structures: this.level.structures }) })
        : await fetch(`/api/levels/${this.level.id}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (lab && r.status === 400) {
        let why = "The server refused this line."; try { why = (await r.json()).message || why; } catch { /* no body */ }
        this.status(why.replace(/^\d+ BAD_REQUEST\s*"?|^BAD_REQUEST:\s*|"$/g, ""), "bad"); this.busy = false; this.$(".run").disabled = false; return;
      }
      if (!r.ok) throw new Error("server answered " + r.status);
      res = await r.json();
    } catch (e) { this.status("Can't reach the game server (" + e.message + "). Run the Spring Boot app in IntelliJ, then open http://localhost:8081/underworld_env.html.", "bad"); this.busy = false; this.$(".run").disabled = false; return; }
    this.ctx.fast.begin();
    try { await this.play(res, code.split("\n")); }
    finally { this.ctx.fast.end(); this.ctx.world.timeScale = 1; this.busy = false; this.$(".run").disabled = false; this.mark(0); if (this.el.classList.contains("on")) this.view(); }
  }

  // ---------- acting the run out: board and pit draw the same frames
  async play(res, lines) {
    const { pit, world } = this.ctx;
    this.lines = lines;
    if (res.outcome === "COMPILE_ERROR") return this.endCompile(res);
    let steps = res.steps || [];
    if (res.outcome === "INFINITE_LOOP") steps = steps.slice(0, 40);
    const spec = this.level.structures[0], board = this.board;
    board.load({ capacity: spec.capacity, initial: this.level.lesson ? [] : spec.initial, steps, shape: shapeOf(this.level) });
    board.open();
    const acting = steps.filter(s => s.action !== "VAR" && s.action !== "DROP").length;
    const pace = 0.7 * Math.min(2, Math.max(1, acting / 40));
    const P = this.player = { k: 0, playing: true, speed: 1, wake: null, ended: false, gen: 0 };
    const rate = () => { if (!this.ctx.skipping()) world.timeScale = pace * P.speed; };
    rate();
    board.setPlaying(true);
    const resume = () => { if (P.wake) { const w = P.wake; P.wake = null; w(); } };
    board.cb.onPlay = () => { if (P.ended && P.k >= steps.length) { this.snapTo(0); P.k = 0; } P.playing = true; board.setPlaying(true); resume(); };
    board.cb.onPause = () => { P.playing = false; board.setPlaying(false); };
    board.cb.onSpeed = v => { P.speed = v; rate(); };
    board.cb.onStep = dir => {
      if (dir === "fwd") { P.playing = false; board.setPlaying(false); if (P.k < steps.length) { if (P.ended) { P.k++; this.snapTo(P.k); } else { P.once = true; resume(); } } }
      else if (dir === "last" && !P.ended) { P.playing = true; board.setPlaying(true); if (!this.ctx.skipping()) world.timeScale = 8 * pace; resume(); }
      else {
        P.playing = false; board.setPlaying(false); P.gen++;
        const to = dir === "back" ? P.k - 1 : dir === "first" ? 0 : steps.length;
        P.k = Math.max(0, Math.min(steps.length, to)); this.snapTo(P.k);
      }
      board.setEnabled(P.k > 0, P.k < steps.length);
    };
    board.setEnabled(false, true);
    this.steps = steps;
    // a lesson's first steps only set the globals up (the hall already shows them): skip straight past them
    if (this.level.lesson) { const k0 = steps.findIndex(s => s.action === "CALL" || s.line > 0 && !/^(ARRAY|VAR)$/.test(s.action)); if (k0 > 0) { P.k = k0; board.show(k0); pit.show(board.frames[k0]); } }
    while (P.k < steps.length) {
      if (!P.playing && !P.once) { await new Promise(r => (P.wake = r)); if (P.k >= steps.length) break; }
      const st = steps[P.k], gen = P.gen;
      this.athenaLine.step(this.code.value, st, P.k + 1, steps.length);
      this.mark(st.line); this.status(`line ${st.line}: ${(st.message || st.action).replace(/[Pp]en (\d+)/g, "seat [$1]").replace(/pens/g, "seats")}`);
      board.show(P.k + 1);
      if (/^(FULL|EMPTY|OUT_OF_BOUNDS)$/.test(st.action)) { world.timeScale = 1; this.ctx.fast.land(); }
      await pit.act(st, board.frames[P.k + 1], 1, steps[P.k + 1]);
      P.once = false;
      if (gen !== P.gen) { this.snapTo(P.k); continue; }
      P.k++; board.setEnabled(P.k > 0, P.k < steps.length);
      this.moves(board.frames[P.k].drank.length);
    }
    this.athenaLine.clear();
    P.ended = true; board.setPlaying(false); board.setEnabled(P.k > 0, false);
    world.timeScale = 1; this.ctx.fast.land();
    if (res.outcome === "SUCCESS") return this.endSuccess(res);
    if (res.outcome === "GOAL_NOT_MET") return this.endGoalNotMet(res);
    if (res.outcome === "INFINITE_LOOP") return this.endLoop(res);
    if (res.outcome === "OVERFLOW") return this.endFail(res, "QUEUE FULL", `${res.message}. Every place is taken: ask isFull before enqueue.`);
    if (res.outcome === "UNDERFLOW") return this.endFail(res, "NOBODY WAITING", `${res.message}. Ask isEmpty before dequeue.`);
    if (res.outcome === "OUT_OF_BOUNDS") return this.endFail(res, "NO SUCH SEAT", res.message.replace(/pens/g, "seats").replace(/pen/g, "seat") + (this.level.lesson && this.level.mistake ? " " + this.level.lesson.mistake.say : ""));
    return this.endFail(res, "SOMETHING WENT WRONG", res.message);
  }
  snapTo(k) {
    const f = this.board.frames[Math.max(0, Math.min(this.board.frames.length - 1, k))];
    this.ctx.pit.show(f);
    const st = this.steps[k - 1];
    this.mark(st ? st.line : 0);
    this.board.show(k);
    this.board.setEnabled(k > 0, k < this.steps.length);
    this.moves(f.drank.length);
  }

  // ---------- endings
  async endSuccess(res) {
    if (this.level && this.level !== LAB) this.voice.solved(this.level.id);
    const { director, pit } = this.ctx;
    const f = this.board.frames[this.board.frames.length - 1], out = (f.out || "").trim();
    if (this.level === LAB || this.level.sandbox) {
      const ls = this.level.lesson;
      if (ls && this.level.mistake) {
        this.status(`It ran without an error, and that's the problem. ${ls.mistake.say}`, "bad");
        await director.stamp("THE MISTAKE", ls.mistake.label, { kind: "bad", seconds: 2.4 });
        return;
      }
      if (ls) {
        this.status(`${ls.name}: done.${out ? " The console printed: " + out.replace(/\n/g, " ") : ""} Step back with ◀ to see any moment again, or try the next lesson.`, "good");
        await director.stamp(ls.name.toUpperCase(), out ? out.split("\n").pop() || out : "step back through it on the board", { kind: "good", seconds: 2 });
        return;
      }
      this.status(res.message + (out ? " Console: " + out.replace(/\n/g, " ") : ""), "good");
      await director.stamp("DONE", f.drank.length ? `served, in order: ${f.drank.join(", ")}` : "step back through it on the board", { kind: "good", seconds: 1.8 });
      return;
    }
    markDone(this.level.id); this.renderTabs();
    if (this.level.tier === "FINALE") {
      this.status(res.message, "good");
      this.board.close();
      await pit.prophecy();
      await director.stamp("THE WAY ON", res.message, { kind: "good", seconds: 2.6 });
      this.el.classList.remove("on"); this.ctx.panelView(false);
      if (this.ctx.onFinale) await this.ctx.onFinale();
      return;
    }
    const next = this.levels.find(l => !done().includes(l.id) && !this.locked(l));
    this.status(res.message + (next ? ` Next: ${(CARDS[next.id] || [""])[0]} ${next.title}.` : ""), "good");
    await director.stamp("DONE", res.message, { kind: "good", seconds: 2.4 });
  }
  async endGoalNotMet(res) {
    this.mark(0);
    this.status(res.message + " Fix the code and try again.", "bad");
    await this.ctx.director.stamp("NOT YET", res.message, { kind: "bad", seconds: 3.0 });
  }
  async endCompile(res) {
    this.mark(res.line, true);
    this.status(`Line ${res.line}: ${res.message}`, "bad");
    await this.ctx.director.stamp("ATHENA'S WORDS DID NOT REACH HIM", `line ${res.line}: ${res.message}`, { kind: "bad" });
  }
  async endLoop(res) {
    this.mark(res.line, true);
    this.status(res.message + " Does the queue ever get shorter?", "bad");
    await this.ctx.director.stamp("ROUND AND ROUND THE CAROUSEL", res.message, { kind: "bad", seconds: 3.5 });
  }
  async endFail(res, title, why) {
    const line = res.line;
    this.mark(line, true);
    this.status(why + " Fix the code and try again.", "bad");
    const lineText = line > 0 ? (this.lines[line - 1] || "").trim() : "";
    await this.ctx.director.siren({ title, sub: why, lineNo: line, lineText, focus: { x: 0, z: 0, y: 0.6 } });
  }
}
