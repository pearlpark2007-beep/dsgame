// circeTrials.js — Circe's trials (linked lists). The player writes C with Node*, ->next and NULL;
// Java runs it (POST /api/levels/{id}/play, or /api/sandbox for the Lab) and answers with an outcome
// and the steps: PTR (a pointer moved), NEW, READ, WRITE, LINK (an arrow re-tied), FREE, NULL_DEREF.
// Every step is turned into a frame up front (listBoard.js); the board draws the frame flat, the sty
// (sty.js) draws it in 3D. Going back just shows an earlier frame in both.
// The browser never decides if the code is right: Java does.
import { TRIAL_CSS } from "../../learn/trialPanelCss.js";
import { AthenaLens } from "../../learn/athenaLens.js";
import { Athena, beatsOf } from "../../learn/athenaScroll.js";
import { ListBoard, walkFrom, lostNodes, NULL } from "../../learn/listBoard.js";
import { GATE } from "./sty.js";
import { sound } from "../../engine/sound.js";
import { voyageTo } from "../../ui/voyage.js";
import { Codex } from "../../learn/codex.js";
import { LESSONS, lessonCode, CIRCE_CODEX } from "./circeLessons.js";

const STORE = "odyssey.circe.done";
const done = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
// the lessons the player has watched through with the right code (the ticks on the lesson tabs)
const LSTORE = "odyssey.circe.lessons";
const seenLessons = () => { try { return JSON.parse(localStorage.getItem(LSTORE)) || []; } catch { return []; } };
const markSeen = id => { try { const d = seenLessons(); if (!d.includes(id)) { d.push(id); localStorage.setItem(LSTORE, JSON.stringify(d)); } } catch { /* storage off */ } };
const markDone = id => { try { const d = done(); if (!d.includes(id)) { d.push(id); localStorage.setItem(STORE, JSON.stringify(d)); } } catch { /* storage off */ } };

// a black card before each trial: the night goes on
const CARDS = {
  "circe-1": ["ONE.", "Noon. Five pigs on a rope. Know your crew before you touch it."],
  "circe-2": ["TWO.", "Eurylochus went back in alone to find them. Find him."],
  "circe-3": ["THREE.", "Elpenor. Drunk, late, and now a pig. He goes first."],
  "circe-4": ["FOUR.", "The herb works on pig 3. Get him off the rope without anyone else falling."],
  "circe-finale": ["FIVE.", "Turn the rope around. Practise it now. Tonight you'll do it for real."],
  "circe-banquet": ["SUNSET.", "Circe pours the wine. She wants to make a deal."]
};
// the sun sinks a notch with every trial (0 = noon, 1 = down); never so dark the pigs stop reading
const SUN = { "circe-1": 0, "circe-2": 0.06, "circe-3": 0.12, "circe-4": 0.18, "circe-finale": 0.26, "circe-banquet": 0.45 };
// how closely the island watches: the warning lamps run faster and the lions lift their heads, trial by trial
const TENSION = { "circe-1": 0, "circe-2": 0.2, "circe-3": 0.4, "circe-4": 0.65, "circe-finale": 0.85, "circe-banquet": 1 };
// Circe on the island's loudspeakers: one line as a trial opens, one when it's solved
const PA = {
  "circe-1": ["Guests are reminded: the rope is for your safety.", "Five. Correct. Most guests never ask."],
  "circe-2": ["A late arrival. How thoughtful of him.", "Found him. He'll be so pleased."],
  "circe-3": ["New guests are welcomed at the front.", "Welcome to the front, Elpenor."],
  "circe-4": ["Inventory adjustments are handled by staff.", "One guest checked out. Unusual."],
  "circe-finale": ["You've been counting. Most guests just eat.", "Practice is over. Dinner is at sunset."],
  "circe-banquet": ["Dinner is served. Everyone attends.", null]
};

// THE LAB: any chain, any code
const LAB_EXAMPLES = {
  "Count": `// walk from head to NULL, counting
int count = 0;
struct Node *p = head;
while (p != NULL) {
    count++;
    p = p->next;
}`,
  "Sum": `int total = 0;
for (struct Node *p = head; p != NULL; p = p->next) {
    total = total + p->data;
}`,
  "Search": `// keep a POINTER to the node, not its number
struct Node *found = NULL;
struct Node *p = head;
while (p != NULL) {
    if (p->data == 19) { found = p; break; }
    p = p->next;
}`,
  "Insert at head": `struct Node *m = newNode(99);
m->next = head;   // tie first...
head = m;         // ...then move head`,
  "Insert at tail": `struct Node *m = newNode(99);
if (head == NULL) {
    head = m;
} else {
    struct Node *p = head;
    while (p->next != NULL) { p = p->next; }
    p->next = m;
}`,
  "Delete a value": `// stop on the node BEFORE the one to remove
int x = 3;
if (head != NULL && head->data == x) {
    head = head->next;
} else {
    struct Node *p = head;
    while (p != NULL && p->next != NULL && p->next->data != x) { p = p->next; }
    if (p != NULL && p->next != NULL) {
        struct Node *gone = p->next;
        p->next = gone->next;
        free(gone);
    }
}`,
  "Reverse": `struct Node *prev = NULL;
struct Node *cur = head;
while (cur != NULL) {
    struct Node *next = cur->next;
    cur->next = prev;
    prev = cur;
    cur = next;
}
head = prev;`,
  "Biggest": `struct Node *big = head;
for (struct Node *p = head; p != NULL; p = p->next) {
    if (p->data > big->data) { big = p; }
}`,
  "Lose them (bug)": `// moving head before tying: watch the rope go grey
struct Node *m = newNode(1);
head = m;
m->next = head;`,
  "Fall into NULL (bug)": `struct Node *p = head;
while (p->data != 999) {
    p = p->next;
}`
};
const LAB = {
  id: "lab", tier: "LAB", title: "The Lab",
  story: "No witch, no judge, no story. Your rope, your code: Athena only watches.",
  goal: "", hint: "Up to 8 pigs. Values go in rope order: the first one is where head points.",
  starterCode: LAB_EXAMPLES["Reverse"], maxMoves: 0,
  structures: [{ name: "sty", kind: "list", capacity: 40, initial: [7, 12, 3, 19, 5], lengthVar: "head" }]
};
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const PRESETS = {
  Random: () => Array.from({ length: rnd(3, 7) }, () => rnd(1, 99)),
  "Crew (5)": () => [7, 12, 3, 19, 5],
  One: () => [rnd(1, 99)],
  Empty: () => []
};
function parseChain(text) {
  const parts = text.split(/[\s,>-]+/).filter(Boolean);
  if (parts.length > 8) return { error: `That's ${parts.length} pigs: the sty holds 8 in the Lab.` };
  const vals = [];
  for (const p of parts) {
    if (!/^-?\d{1,3}$/.test(p)) return { error: `"${p}" isn't a whole number from -999 to 999.` };
    vals.push(parseInt(p, 10));
  }
  return { vals };
}

const css = `
#trial-card { position: fixed; inset: 0; z-index: 33; background: #050403; display: none; flex-direction: column; justify-content: center; padding-left: 9vw;
  font-family: Anton, Impact, sans-serif; color: #f2c230; pointer-events: none; }
#trial-card.on { display: flex; }
#trial-card .k { font: 700 clamp(13px, 1.2vw, 16px) 'Courier Prime', monospace; letter-spacing: 4px; color: #f2c230; margin-bottom: 14px; }
#trial-card .h { font-size: clamp(56px, 11vw, 150px); line-height: 0.9; letter-spacing: 2px; text-shadow: 5px 5px 0 #7e1a0f; }
#trial-card .s { margin-top: 18px; font-family: 'Courier Prime', monospace; font-size: clamp(15px, 1.6vw, 22px); color: #efe1c2; letter-spacing: 1px; }
#trial-panel .trial-hour { font-family: Anton, Impact, sans-serif; color: #e0644a; letter-spacing: 2px; font-size: 14px; margin-right: 8px; }
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
/* three doors, three colours: you always know where you are */
#trial-panel { border-top: 8px solid var(--mode, #c8261e); }
#trial-panel.m-trials { --mode: #c8261e; } #trial-panel.m-lab { --mode: #f2c230; } #trial-panel.m-lesson { --mode: #3b62ff; }
#trial-panel .who { display: flex; align-items: center; gap: 10px; }
#trial-panel .who .badge { font-size: 13px; letter-spacing: 2px; padding: 2px 8px; border-radius: 3px; background: var(--mode); color: #fff4cf; text-shadow: none; font-family: 'Courier Prime', monospace; font-weight: 700; }
#trial-panel.m-lab .who .badge { color: #120c06; }
#trial-panel .who .sub { font-family: 'Courier Prime', monospace; font-size: 12.5px; color: #9c8a6c; letter-spacing: 0; text-shadow: none; }
#trial-panel.m-lesson .tab.on { background: #3b62ff; border-color: #3b62ff; color: #fff4cf; }
#trial-panel .lesson-watch { display: none; border-left: 4px solid #3b62ff; background: #10162e; padding: 7px 10px; font-size: 13px; line-height: 1.4; color: #dfe6ff; }
#trial-panel.m-lesson .lesson-watch { display: block; }
#trial-panel .lesson-watch b { color: #8fb4ff; }
#trial-panel .lesson-watch.mis { border-left-color: #c8261e; background: #2a0f0c; color: #ffd9d0; } #trial-panel .lesson-watch.mis b { color: #ff7a5c; }
#trial-panel .lesson-btns { display: none; gap: 6px; flex-wrap: wrap; }
#trial-panel.m-lesson .lesson-btns { display: flex; }
#trial-panel .lesson-btns button { flex: 1; min-height: 34px; background: #1a130c; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font: 700 12.5px 'Courier Prime', monospace; cursor: pointer; }
#trial-panel .lesson-btns button.mis { border-color: #c8261e; color: #ff9a85; }
#trial-panel .lesson-btns button:disabled { opacity: 0.35; cursor: default; }
#trial-panel.m-lesson .tabs .tab { flex: 1 0 18% !important; }
#trial-panel.m-lesson .lab select.examples, #trial-panel.m-lesson .meta { display: none; }
#trial-panel .status:empty { display: none; }
/* Circe on the loudspeakers: a cobalt chip over the stage, three seconds, then gone */
#circe-pa { position: fixed; z-index: 29; left: calc((100vw - var(--pw, 0px)) / 2); top: 16px; transform: translate(-50%, -8px); opacity: 0; pointer-events: none;
  display: flex; align-items: center; gap: 10px; max-width: min(640px, calc(92vw - var(--pw, 0px))); padding: 9px 16px 9px 12px; border-radius: 4px;
  background: #1d3fd1; color: #fff4cf; box-shadow: 0 6px 22px rgba(0,0,0,.35); font: italic 700 16px/1.35 'Courier Prime', monospace;
  transition: opacity .25s cubic-bezier(.22,.61,.36,1), transform .25s cubic-bezier(.22,.61,.36,1); }
#circe-pa.on { opacity: 1; transform: translate(-50%, 0); }
#circe-pa svg { flex: none; }
#circe-pa .pa-who { font: normal 11px/1 'Courier Prime', monospace; letter-spacing: 2px; color: #ffd21a; font-style: normal; display: block; margin-bottom: 3px; }
@media (prefers-reduced-motion: reduce) { #circe-pa { transition: none; } }
/* Aeaea's stamps: one family. An ink band with a 6 px rule, Anton title, one line of why */
body.aeaea .stamp { top: 40%; transform: translate(-50%, -50%) scale(1.04); width: max-content; min-width: 300px; padding: 16px 28px 18px; border-radius: 4px;
  background: rgba(20,16,8,.95); border-top: 6px solid #f2c230; box-shadow: 0 10px 40px rgba(0,0,0,.45); transition: opacity .2s, transform .3s cubic-bezier(.22,.61,.36,1); }
body.aeaea .stamp.on { transform: translate(-50%, -50%) scale(1); }
body.aeaea .stamp.bad { border-top-color: #c8261e; }
body.aeaea .stamp .st-t { font-family: Anton, Impact, sans-serif; font-size: clamp(34px, 4.6vw, 62px); letter-spacing: 3px; border: 0; padding: 0; background: none; text-shadow: none; }
body.aeaea .stamp.long .st-t { font-size: clamp(26px, 3.3vw, 46px); white-space: nowrap; }
body.aeaea .stamp.good .st-t { color: #f2c230; }
body.aeaea .stamp.bad .st-t { color: #ff5a40; }
body.aeaea .stamp .st-s { margin-top: 8px; font-size: clamp(14px, 1.3vw, 17px); line-height: 1.4; color: #f4ead2; text-shadow: none; max-width: 60ch; margin-left: auto; margin-right: auto; }
/* the lesson's story line: one sentence of Aeaea before the C */
#trial-panel .ls-tale { display: block; margin-bottom: 6px; font: italic 700 15px/1.35 'Courier Prime', monospace; color: #f2c230; }
/* the takeaway card after a lesson run: one thing to keep, and the way on */
#trial-panel .lesson-take { display: none; border: 1px solid #3a2c18; border-top: 6px solid #f2c230; border-radius: 4px; background: #141008; padding: 9px 12px 10px; }
#trial-panel .lesson-take.on { display: block; animation: lt-in .3s cubic-bezier(.22,.61,.36,1) both; }
#trial-panel .lesson-take.mis { border-top-color: #c8261e; }
#trial-panel .lesson-take .lt-h { font: 15px/1 Anton, Impact, sans-serif; letter-spacing: 2px; color: #f2c230; }
#trial-panel .lesson-take.mis .lt-h { color: #ff6a50; }
#trial-panel .lesson-take .lt-t { margin: 6px 0 8px; font: 700 15px/1.4 'Courier Prime', monospace; color: #f4ead2; }
#trial-panel .lesson-take button { width: 100%; min-height: 36px; background: #f2c230; color: #141008; border: 0; border-radius: 4px; font: 700 13px 'Courier Prime', monospace; cursor: pointer; }
#trial-panel .lesson-take.mis button { background: #3b62ff; color: #fff4cf; }
#trial-panel .lesson-take button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
@keyframes lt-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { #trial-panel .lesson-take.on { animation: none; } }
/* an optional prediction before SHOW ME: tap a choice, the takeaway card says if it was right */
#trial-panel .lesson-predict { display: none; border: 1px dashed #3b62ff; border-radius: 4px; padding: 8px 10px; }
#trial-panel .lesson-predict.on { display: block; }
#trial-panel .lesson-predict .lp-q { font: 700 14px/1.35 'Courier Prime', monospace; color: #f4ead2; margin-bottom: 7px; }
#trial-panel .lesson-predict .lp-q b { color: #8fa6ff; letter-spacing: 1px; font-size: 12px; margin-right: 6px; }
#trial-panel .lesson-predict .lp-o { display: flex; flex-wrap: wrap; gap: 6px; }
#trial-panel .lesson-predict .lp-o button { min-height: 34px; padding: 0 12px; border-radius: 4px; border: 1px solid #3a2c18; background: #1c160c; color: #f4ead2; font: 700 13px 'Courier Prime', monospace; cursor: pointer; }
#trial-panel .lesson-predict .lp-o button[aria-pressed="true"] { background: #3b62ff; border-color: #3b62ff; color: #fff4cf; }
#trial-panel .lesson-predict .lp-o button:focus-visible { outline: 3px solid #f2c230; outline-offset: 2px; }
/* progress: a small tick on every lesson watched through */
#trial-panel.m-lesson .tab.seen { position: relative; }
#trial-panel.m-lesson .tab.seen::after { content: "✓"; position: absolute; top: 1px; right: 4px; font: 700 10px 'Courier Prime', monospace; color: #f2c230; }
#trial-panel.m-lesson .tab.seen.on::after { color: #fff4cf; }
`;

export class CirceTrials {
  // ctx: { world, sty, director, comic, panelView(on), onClose(), onLesson(), onFinale(), skipping(), fast: { begin(), land(), end() } }
  constructor(ctx) {
    this.ctx = ctx; this.levels = []; this.level = null; this.busy = false;
    if (!document.getElementById("trial-css")) { const s = document.createElement("style"); s.id = "trial-css"; s.textContent = TRIAL_CSS; document.head.appendChild(s); }
    if (!document.getElementById("circe-trial-css")) { const s = document.createElement("style"); s.id = "circe-trial-css"; s.textContent = css; document.head.appendChild(s); }
    this.card = document.createElement("div"); this.card.id = "trial-card"; this.card.innerHTML = "<div class='k'></div><div class='h'></div><div class='s'></div>";
    document.body.appendChild(this.card);
    document.body.classList.add("aeaea"); this.heard = new Set();
    this.pa = document.createElement("div"); this.pa.id = "circe-pa"; this.pa.setAttribute("role", "status");
    this.pa.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffd21a" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l6-4v14l-6-4H4z"/><path d="M17.5 9.5a4 4 0 0 1 0 5M20 7a7.5 7.5 0 0 1 0 10"/></svg><span><span class="pa-who">CIRCE · ALL SPEAKERS</span><span class="pa-t"></span></span>`;
    document.body.appendChild(this.pa);
    const el = this.el = document.createElement("aside");
    el.id = "trial-panel"; el.setAttribute("aria-label", "Athena: the trials");
    el.innerHTML = `<div class="who"><span class="badge"></span><span class="sub"></span></div><div class="tabs"></div><h2></h2><p class="story"></p><p class="goal"></p>
      <div class="lesson-watch"></div><div class="lesson-btns"><button class="lb-right">✓ The right code</button><button class="lb-mis mis">✗ Show the classic mistake</button></div>
      <div class="lab"><label for="labchain">YOUR ROPE <small>(up to 8 numbers, head first)</small></label>
        <input id="labchain" class="labin" autocomplete="off" spellcheck="false">
        <div class="labbtns"></div><div class="labmsg" aria-live="polite"></div></div>
      <div class="meta"><span class="moves"></span><span class="hintArea"></span></div>
      <div class="editor"><div class="gutter">1</div><div class="wrap"><div class="hl"></div><label class="sr" style="position:absolute;left:-9999px" for="lcode">Your C code</label><textarea id="lcode" spellcheck="false" autocomplete="off"></textarea></div></div>
      <button class="run">GUIDE HIM</button>
      <div class="row"><button class="reset">Reset</button><button class="closeb">◂ Back to the three doors</button></div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="words">Words Athena understands: <code>struct Node *p = head;</code> <code>p->data</code> <code>p->next</code> <code>NULL</code> <code>malloc(sizeof(struct Node))</code> <code>newNode(x)</code> <code>free(p)</code> <code>printf</code> your own functions with <code>return</code>, <code>int</code> <code>if</code> <code>while</code> <code>for</code> <code>break</code></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    el.querySelector(".editor").before(el.querySelector(".status"));   // what happened stays in view, right above the code
    const take = document.createElement("div"); take.className = "lesson-take"; take.setAttribute("role", "status");
    el.querySelector(".status").after(take); this.take = take;
    const pr = document.createElement("div"); pr.className = "lesson-predict";
    el.querySelector(".run").before(pr); this.predictEl = pr;
    this.code = this.$("textarea"); this.gutter = this.$(".gutter"); this.hl = this.$(".hl");
    this.code.addEventListener("input", () => this.updateGutter());
    this.code.addEventListener("scroll", () => { this.gutter.scrollTop = this.code.scrollTop; if (this._auto) { this._auto = false; return; } this.hl.style.display = "none"; });
    this.code.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); const s = this.code.selectionStart; this.code.setRangeText("    ", s, this.code.selectionEnd, "end"); this.updateGutter(); } });
    this.$(".run").onclick = () => this.run();
    this.$(".reset").onclick = () => { if (!this.busy && this.level) this.select(this.level); };
    this.$(".lb-right").onclick = () => { if (!this.busy && this.level && this.level.lesson) this.selectLesson(this.level.lesson, false); };
    this.$(".lb-mis").onclick = () => { if (!this.busy && this.level && this.level.lesson) this.selectLesson(this.level.lesson, true); };
    this.$(".closeb").onclick = () => { if (!this.busy) this.close(); };
    this.board = new ListBoard();
    ctx.sty.colorOf = n => this.board.color(n);
    this.buildLab();
    this.codex = new Codex(el, CIRCE_CODEX, part => this.runPart(part));
    this.lens = new AthenaLens(el);                 // lessons: only the running function, each line in plain English
    this.athena = new Athena({ ctx, board: this.board, lens: this.lens, panel: el });   // the teacher: the player can switch her on and off
    this.lessons = LESSONS.map(l => ({ id: "lesson-" + l.id, tier: "LESSON", title: `${l.n} · ${l.name}`, lesson: l, sandbox: true, structures: [{ name: "sty", kind: "list", capacity: 40, initial: l.chain.slice(), lengthVar: "head" }] }));
    this.setMode("trials");
  }
  // the Codex's "run this part": the same function, in Athena's lesson
  async runPart(part) {
    if (this.busy || !part.lesson) return;
    await this.openLesson(part.lesson.id, true);
  }

  // which door the player came through: the panel's colour, title, tabs and buttons follow
  setMode(mode) {
    this.mode = mode;
    this.el.classList.remove("m-trials", "m-lab", "m-lesson"); this.el.classList.add("m-" + mode);
    const [badge, sub] = { trials: ["CIRCE'S TRIALS", "she judges · five tests, then the banquet"], lab: ["THE LAB", "no judge · your rope, your code"], lesson: ["ATHENA'S LESSON", "your C, line by line · nothing is graded"] }[mode];
    this.$(".who .badge").textContent = badge; this.$(".who .sub").textContent = sub;
    this.el.setAttribute("aria-label", badge);
    const t = this.codex && this.codex.tabs.querySelector(".t-trials"); if (t) t.textContent = { trials: "THE TRIALS", lab: "THE LAB", lesson: "THE LESSON" }[mode];
    if (this.codex) this.codex.show(false);
    this.$(".run").textContent = mode === "lesson" ? "▶ SHOW ME" : mode === "lab" ? "▶ RUN IT" : "GUIDE HIM";
    this.$(".reset").textContent = mode === "trials" ? "Reset trial" : mode === "lab" ? "Reset rope" : "Reset lesson";
    if (this.ctx.onMode) this.ctx.onMode(mode);
  }

  async openLesson(id = null, runNow = false) {
    this.setMode("lesson");
    this.el.classList.add("on"); this.ctx.panelView(true);
    const l = (id && this.lessons.find(x => x.lesson.id === id)) || this.level && this.level.lesson && this.level || this.lessons[0];
    await this.selectLesson(l.lesson, false);
    if (runNow) await this.run();
  }
  async selectLesson(lesson, mistake) {
    const l = this.lessons.find(x => x.lesson === lesson);
    l.mistake = !!mistake;
    l.structures[0].initial = lesson.chain.slice();
    await this.select(l);
  }

  async open() {
    this.setMode("trials");
    await this.loadLevels();
  }
  async loadLevels() {
    this.el.classList.add("on"); this.ctx.panelView(true);
    if (!this.levels.length) {
      try {
        const r = await fetch("/api/levels?island=circe");
        if (!r.ok) throw new Error("server answered " + r.status);
        this.levels = await r.json();
      } catch (e) { this.status("Can't reach the game server (" + e.message + "). Run the Spring Boot app in IntelliJ, then open http://localhost:8081/circe_env.html (not IntelliJ's browser preview).", "bad"); return; }
    }
    if (this.mode !== "trials") return;
    const d = done();
    await this.select(this.levels.find(l => !d.includes(l.id) && !this.locked(l)) || this.levels[0], false, true);
  }
  async openLab() { this.setMode("lab"); this.el.classList.add("on"); this.ctx.panelView(true); await this.select(LAB); }
  close() {
    this.athena.lesson(false); this.athena.sheetOpen(false);
    this.el.classList.remove("on"); this.ctx.panelView(false); this.board.close();
    if (this.ctx.onClose) this.ctx.onClose();
  }
  locked(l) { const d = done(); return l.tier === "FINALE" && this.levels.some(p => p.tier === "PRACTICE" && !d.includes(p.id)); }

  updateGutter() { const n = this.code.value.split("\n").length; this.gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n"); this.gutter.scrollTop = this.code.scrollTop; }
  mark(line, err = false) {
    if (this.lens) this.lens.show(line, err);
    if (!line || line < 1) { this.hl.style.display = "none"; return; }
    this.hl.style.display = "block"; this.hl.classList.toggle("err", err);
    const y = 10 + (line - 1) * 20, h = this.code.clientHeight || 300;
    if (y < this.code.scrollTop + 10 || y > this.code.scrollTop + h - 40) { this._auto = true; this.code.scrollTop = Math.max(0, y - h / 2); this.gutter.scrollTop = this.code.scrollTop; }
    this.hl.style.top = (y - this.code.scrollTop) + "px";
  }
  status(t, kind = "") { const s = this.$(".status"); s.textContent = t; s.className = "status " + kind; }
  moves(n) { this.$(".moves").innerHTML = `ROPES RE-TIED <b>${n}</b>`; }

  renderTabs() {
    const d = done(), tabs = this.$(".tabs"); tabs.innerHTML = "";
    tabs.style.flexWrap = "wrap";
    tabs.style.display = this.mode === "lab" ? "none" : "";
    if (this.mode === "lesson") {
      this.lessons.forEach(l => {
        const b = document.createElement("button");
        const seen = seenLessons().includes(l.lesson.id);
        b.className = "tab" + (l === this.level ? " on" : "") + (seen ? " seen" : "");
        b.style.minHeight = "34px"; b.style.fontSize = "12px";
        b.textContent = `${l.lesson.n}`; b.title = l.title + (seen ? " (watched)" : "");
        b.setAttribute("aria-pressed", l === this.level); b.setAttribute("aria-label", l.title + (seen ? " (watched)" : ""));
        b.onclick = () => { if (!this.busy) this.selectLesson(l.lesson, false); };
        tabs.appendChild(b);
      });
      const n = this.lessons.filter(l => seenLessons().includes(l.lesson.id)).length;
      this.$(".who .sub").textContent = `your C, line by line · nothing is graded · ${n}/10 watched`;
      return;
    }
    this.levels.forEach((l, i) => {
      const b = document.createElement("button");
      b.className = "tab" + (l === this.level ? " on" : "") + (l === LAB ? " labtab" : "");
      b.style.flex = "1 0 30%"; b.style.minHeight = "34px"; b.style.fontSize = "12px";
      const locked = this.locked(l);
      b.textContent = l === LAB ? "⚗ LAB" : (locked ? "🔒 " : "") + (CARDS[l.id] || [String(i + 1)])[0].replace(".", "") + (d.includes(l.id) ? " ✓" : "");
      b.title = l.title;
      b.setAttribute("aria-pressed", l === this.level);
      b.setAttribute("aria-label", l.title + (locked ? " (locked)" : "") + (d.includes(l.id) ? " (done)" : ""));
      b.onclick = () => { if (this.busy) return; if (locked) { this.status("Free your men one trial at a time: the banquet comes after the other five.", "bad"); return; } this.select(l, false, true); };
      tabs.appendChild(b);
    });
  }

  // the camera keeps the whole clearing in view: the gate, every pig, the NULL pit
  view(snap = false) {
    const { sty, director } = this.ctx;
    // from high above the sty, a little in front: the rope reads left to right like the board
    director.frame(() => { const pts = sty.points(); return pts.map(p => p.clone().setY(0)).concat(pts.map(p => p.clone().setY(2.4))); }, { dir: [0, 1.35, 1], fov: 36, margin: 1.03, minDist: 6, lag: 2.6, snap });
  }

  // the NULL pit only needs to be in the picture when some pointer is NULL
  needPit() { const f = this.ctx.sty.frame; return !!f && Object.values(f.ptrs).some(a => a === NULL); }

  // the sound of one step (true if it made one): a rope pulled tight, a pig arriving or handed back, a pointer moving on
  cue(st, taught) {
    switch (st.action) {
      case "LINK": sound.rope(); if (this.riser) this.riser.step(); return true;
      case "NEW": sound.boom({ freq: 150, to: 95, seconds: 0.22, level: 0.22 }); return true;
      case "FREE": sound.whoosh({ seconds: 0.45, level: 0.12 }); return true;
      case "NULL_DEREF": sound.boom({ freq: 60, to: 30, seconds: 0.9, level: 0.6 }); return true;
      case "PTR": if (taught) { sound.tick(); return true; } return false;
      default: return false;
    }
  }
  // Circe speaks over the island: never blocks play, gone after a few seconds
  announce(text, seconds = 3.6) {
    if (!text || this.ctx.skipping()) return;
    const el = this.pa, id = (this.paId = (this.paId || 0) + 1);
    el.querySelector(".pa-t").textContent = `"${text}"`;
    const top = this.athena && this.athena.active() ? this.athena.reserve() : 4;
    el.style.top = `${top + 12}px`;
    el.classList.add("on"); sound.chime();
    this.ctx.sty.wait(seconds).then(() => { if (this.paId === id) el.classList.remove("on"); });
  }
  async trialCard(l) {
    const h = CARDS[l.id]; if (!h || this.ctx.skipping()) return;
    const i = this.levels.indexOf(l);
    this.card.querySelector(".k").textContent = `TRIAL ${i + 1} OF ${this.levels.length} · ${l.title.toUpperCase()}`;
    this.card.querySelector(".h").textContent = h[0];
    this.card.querySelector(".s").textContent = h[1];
    this.card.classList.add("on");
    await this.ctx.sty.wait(1.6);
    this.card.classList.remove("on");
  }

  // ---------- the Lab's controls
  buildLab() {
    const box = this.$(".labbtns"), input = this.$(".labin");
    for (const [name, make] of Object.entries(PRESETS)) {
      const b = document.createElement("button"); b.textContent = name;
      b.onclick = () => { if (this.busy) return; input.value = make().join(" "); this.labInput(); };
      box.appendChild(b);
    }
    const sel = document.createElement("select"); sel.className = "examples"; sel.setAttribute("aria-label", "Load an example algorithm");
    sel.innerHTML = `<option value="">Examples…</option><optgroup label="Your program's functions">` + LESSONS.map(l => `<option value="fn:${l.id}">${l.n} · ${l.name}</option>`).join("")
      + `</optgroup><optgroup label="Short snippets">` + Object.keys(LAB_EXAMPLES).map(k => `<option>${k}</option>`).join("") + `</optgroup>`;
    sel.onchange = () => {
      if (!sel.value || this.busy) return;
      const fn = sel.value.startsWith("fn:") && LESSONS.find(l => "fn:" + l.id === sel.value);
      this.code.value = fn ? lessonCode(fn) : LAB_EXAMPLES[sel.value]; this.code.scrollTop = 0;
      this.updateGutter(); this.mark(0); this.status(`${fn ? fn.name : sel.value} loaded. Press ${this.$(".run").textContent.trim()}.`); sel.value = "";
    };
    box.appendChild(sel);
    input.addEventListener("input", () => this.labInput());
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); this.run(); } });
  }
  labInput() {
    const input = this.$(".labin"), msg = this.$(".labmsg"), r = parseChain(input.value);
    const ls = this.level && this.level.lesson;                 // a prediction only makes sense on the lesson's own rope
    if (this.predictEl && ls && ls.predict && !this.level.mistake) this.predictEl.classList.toggle("on", input.value.trim().split(/\s+/).join(" ") === ls.chain.join(" "));
    input.classList.toggle("bad", !!r.error); msg.classList.toggle("bad", !!r.error);
    this.$(".run").disabled = !!r.error || this.busy;
    if (r.error) { msg.textContent = r.error; return; }
    const target = this.level && this.level.sandbox ? this.level : LAB;
    target.structures[0].initial = r.vals;
    msg.textContent = r.vals.length ? "head -> " + r.vals.join(" -> ") + " -> NULL" : "head = NULL (an empty rope)";
    if (!this.busy) this.setUp(target);
  }

  // load one of the Lab's examples into the editor (the lessons use this too)
  loadExample(name) { if (!LAB_EXAMPLES[name]) return; this.code.value = LAB_EXAMPLES[name]; this.updateGutter(); this.mark(0); }

  // the sty exactly as a trial starts
  setUp(l) {
    const spec = (l.structures || [])[0] || { initial: [], lengthVar: "head" };
    this.board.close();
    this.board.load({ initial: spec.initial, headVar: spec.lengthVar || "head", steps: [] });
    this.ctx.sty.show(this.board.frames[0]);
    this.view(true);
  }

  async select(l, keepCode = false, card = false) {
    this.level = l;
    if (this.ctx.dusk) this.ctx.dusk(SUN[l.id] || 0, 0);    // lessons and the Lab are at noon; the trials go on into the afternoon
    if (this.ctx.island && this.ctx.island.banquet) this.ctx.island.banquet(l.id === "circe-banquet");
    if (this.ctx.island && this.ctx.island.setTension) this.ctx.island.setTension(TENSION[l.id] || 0);
    const lab = l === LAB, ls = l.lesson;
    this.$("h2").innerHTML = `<span class="trial-hour">${lab ? "LAB" : ls ? "LESSON " + ls.n : (CARDS[l.id] || [""])[0]}</span>`; this.$("h2").append(ls ? ls.name : l.title);
    if (ls) { this.$(".story").innerHTML = (ls.story && !l.mistake ? `<span class="ls-tale">${ls.story}</span>` : "") + (l.mistake ? ls.mistake.say : ls.say); }
    else this.$(".story").textContent = l.story;
    this.showTake(null); if (!keepCode) this.setPredict(ls && !l.mistake ? ls : null);
    this.$(".goal").innerHTML = "<b>THE TRIAL</b>"; this.$(".goal").append(l.goal || "");
    this.$(".goal").style.display = lab || ls ? "none" : "";
    this.$(".lab").classList.toggle("on", lab || !!ls);
    const w = this.$(".lesson-watch");
    if (ls) {
      w.classList.toggle("mis", !!l.mistake);
      w.innerHTML = l.mistake ? `<b>THE MISTAKE · </b>${ls.mistake.label}. Press SHOW ME and watch what breaks.` : `<b>WATCH FOR · </b>${ls.watch}`;
      this.$(".lb-mis").disabled = !ls.mistake; this.$(".lb-mis").textContent = ls.mistake ? `✗ The classic mistake: ${ls.mistake.label}` : "✗ (no classic mistake here)";
      this.$(".lb-right").classList.toggle("on", !l.mistake);
    }
    const ha = this.$(".hintArea"); ha.innerHTML = "";
    if (l.hint) { const b = document.createElement("button"); b.className = "linkb"; b.textContent = "ask for a hint"; b.onclick = () => this.status(l.hint); ha.appendChild(b); }
    if (!keepCode) { this.code.value = ls ? lessonCode(ls, l.mistake) : l.starterCode; if (this.codex) this.codex.say(null); this.code.scrollTop = 0; }
    this.lens.live(null); if (ls) this.lens.load(this.code.value, ls); this.lens.on(!!ls); this.athena.lesson(!!ls, this.code.value.split("\n")); this.athena.setKey(ls && !l.mistake ? ls.key : null);
    this.updateGutter(); this.mark(0); this.moves(0); this.status(ls && !keepCode ? `Below: your program's ${ls.id}(), unchanged, with what each line means. Press SHOW ME and follow the lit line.` : "");
    if ((lab || ls) && !keepCode) { this.$(".labin").value = l.structures[0].initial.join(" "); this.labInput(); }
    else this.setUp(l);
    this.renderTabs();
    if (card && l.id === "circe-banquet" && this.ctx.banquetIntro) await this.ctx.banquetIntro();
    if (card) await this.trialCard(l);
    if (!lab && !ls && PA[l.id] && (card || !this.heard.has(l.id))) { this.heard.add(l.id); this.announce(PA[l.id][0]); }
  }

  async run() {
    if (this.busy || !this.level) return;
    this.busy = true; this.$(".run").disabled = true;
    const code = this.code.value;
    await this.select(this.level, true);
    this.status(this.athena.active() ? "Athena explains it line by line, above the sty. Press NEXT ▸ (or Space) for each line, ◀ to go back." : "Athena speaks…");
    let res;
    try {
      const lab = this.level === LAB || !!this.level.sandbox;
      const r = lab
        ? await fetch("/api/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ island: "circe", code, structures: this.level.structures }) })
        : await fetch(`/api/levels/${this.level.id}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (lab && r.status === 400) {
        let why = "The server refused this rope."; try { why = (await r.json()).message || why; } catch { /* no body */ }
        this.status(why.replace(/^\d+ BAD_REQUEST\s*"?|^BAD_REQUEST:\s*|"$/g, ""), "bad"); this.busy = false; this.$(".run").disabled = false; return;
      }
      if (!r.ok) throw new Error("server answered " + r.status);
      res = await r.json();
    } catch (e) { this.status("Can't reach the game server (" + e.message + "). Run the Spring Boot app in IntelliJ, then open http://localhost:8081/circe_env.html.", "bad"); this.busy = false; this.$(".run").disabled = false; return; }
    this.ctx.fast.begin();
    if (this.level.id === "circe-banquet" && !this.ctx.skipping()) this.riser = sound.riser();    // Act III: the drone climbs with every rope turned
    try { await this.play(res, code.split("\n")); if (this.level && this.level.lesson && this.el.classList.contains("on")) this.lessonEnd(res); }
    finally { if (this.riser) { this.riser.stop(); this.riser = null; } this.ctx.fast.end(); this.ctx.world.timeScale = 1; this.busy = false; this.$(".run").disabled = false; this.mark(0); if (this.el.classList.contains("on")) this.view(); }
  }

  // ---------- acting the run out: board and sty draw the same frames
  async play(res, lines) {
    const { sty, world } = this.ctx;
    this.lines = lines;
    if (res.outcome === "COMPILE_ERROR") return this.endCompile(res);
    let steps = res.steps || [];
    if (res.outcome === "INFINITE_LOOP") steps = steps.slice(0, 40);
    const spec = this.level.structures[0], board = this.board;
    board.load({ initial: spec.initial, headVar: spec.lengthVar || "head", steps });
    board.open();
    const acting = steps.filter(s => s.action !== "VAR" && s.action !== "DROP").length;
    // 1x is a calm, readable pace; only long runs are sped up a little
    const pace = 0.7 * Math.min(2, Math.max(1, acting / 40));
    // ONE controller for the run: the board's buttons and keys, Athena's buttons, autoplay. With Athena on,
    // it moves one LINE (a beat: every step that line made) at a time and waits for Next; with her off it
    // plays step by step as before.
    const athena = this.athena, teach = () => athena.active() && !this.ctx.skipping() && !P.rush;
    const beats = beatsOf(steps), beatAt = k => beats.find(b => k >= b.from && k < b.to);
    const startOfBeatEndingAt = k => { const b = beatAt(k - 1); return b ? b.from : 0; };
    const P = this.player = { k: 0, playing: !athena.active(), speed: 1, wake: null, ended: false, gen: 0, links: 0, once: athena.active(), rush: false };
    const rate = () => { if (!this.ctx.skipping()) world.timeScale = (P.rush ? 8 : 1) * pace * P.speed; };
    rate();
    const setPlaying = on => { board.setPlaying(on); athena.setPlaying(on); };
    const enable = () => { board.setEnabled(P.k > 0, P.k < steps.length); athena.setNext(P.k < steps.length); };
    setPlaying(P.playing);
    const resume = () => { if (P.wake) { const w = P.wake; P.wake = null; w(); } };
    board.cb.onPlay = () => { if (P.ended && P.k >= steps.length) return; P.playing = true; setPlaying(true); resume(); };
    board.cb.onPause = () => { P.playing = false; setPlaying(false); };
    board.cb.onSpeed = v => { P.speed = v; rate(); };
    board.cb.onStep = dir => {
      if (dir === "fwd") {
        P.playing = false; setPlaying(false);
        if (P.k < steps.length) {
          if (P.ended) { const b = teach() ? beatAt(P.k) : null; P.k = b ? b.to : P.k + 1; this.snapTo(P.k); }
          else if (!P.busy) { P.once = true; resume(); }            // never two advances at once
        }
      } else if (dir === "last" && !P.ended) { P.playing = true; P.rush = true; setPlaying(true); athena.cancel(); rate(); resume(); }
      else {
        P.playing = false; setPlaying(false); P.gen++; athena.cancel();
        const to = dir === "back" ? (teach() ? startOfBeatEndingAt(P.k) : P.k - 1) : dir === "first" ? 0 : steps.length;
        P.k = Math.max(0, Math.min(steps.length, to)); this.snapTo(P.k);
      }
      enable();
    };
    athena.cb = {
      next: () => board.cb.onStep("fwd"),
      play: () => (P.playing ? board.cb.onPause() : board.cb.onPlay()),
      replay: () => {                                                  // the line just explained, once more
        if (P.busy || P.k === 0) return;
        if (P.ended) { this.replayBeat(startOfBeatEndingAt(P.k), P.k); return; }
        P.gen++; athena.cancel(); P.k = startOfBeatEndingAt(P.k); this.snapTo(P.k); P.playing = false; setPlaying(false); P.once = true; resume();
      },
      toggled: on => { if (!on && !P.playing && !P.ended) { P.playing = true; setPlaying(true); resume(); } },
    };
    board.setEnabled(false, true); athena.setNext(true);
    this.steps = steps; this.beats = beats;
    while (P.k < steps.length) {
      if (!P.playing && !P.once) { await new Promise(r => (P.wake = r)); if (P.k >= steps.length) break; }
      const gen = P.gen, k0 = P.k, b = teach() ? beatAt(k0) : null, k1 = b ? b.to : k0 + 1;
      let nulled = null;
      const runSteps = async () => {
        let cued = false;                                  // one sound a beat, at most
        for (let k = k0; k < k1; k++) {
          if (gen !== P.gen) return;
          const st = steps[k];
          if (!cued && !this.ctx.skipping()) cued = this.cue(st, !!b);
          this.mark(st.line);
          board.show(k + 1);
          if (st.action === "NULL_DEREF") { world.timeScale = 1; this.ctx.fast.land(); }
          await sty.act(st, board.frames[k + 1], 1);
          if (gen !== P.gen) return;
          if (st.action === "LINK") this.moves(++P.links);
          P.k = k + 1;
          if (st.action === "NULL_DEREF") { nulled = st; return; }
        }
      };
      P.busy = true;
      if (b) await athena.beat(steps.slice(k0, k1), board.frames[k0], board.frames[k1], runSteps);
      else await runSteps();
      P.busy = false; P.once = false;
      if (gen !== P.gen) { this.snapTo(P.k); continue; }
      enable();
      if (nulled) { P.ended = true; return this.endNull(res, nulled); }
      if (b && P.playing && P.k < steps.length) await sty.wait(0.9 * pace);     // autoplay: a breath between lines (about 2 s a line)
    }
    P.ended = true; setPlaying(false); board.setEnabled(P.k > 0, false); athena.setNext(false);
    world.timeScale = 1; this.ctx.fast.land();
    if (res.outcome === "SUCCESS") return this.endSuccess(res);
    if (res.outcome === "GOAL_NOT_MET") return this.endGoalNotMet(res);
    if (res.outcome === "INFINITE_LOOP") return this.endLoop(res);
    return this.endFail(res, "SOMETHING WENT WRONG", res.message, { line: res.line });
  }
  // after a lesson run: the takeaway (or, for the classic mistake, what it cost) and the way on
  lessonEnd(res) {
    const l = this.level, ls = l.lesson, f = this.board.frames[this.board.frames.length - 1];
    if (l.mistake) { this.showTake({ mis: true, h: "WHAT IT COST", t: ls.mtake || ls.mistake.say, b: "✓ Now watch the right code ▸", go: () => this.selectLesson(ls, false) }); return; }
    if (res.outcome !== "SUCCESS" || (f && lostNodes(f).length)) return;     // the player changed the rope or the code: the status says what happened
    markSeen(ls.id); this.renderTabs();
    const nx = LESSONS.find(x => x.n === ls.n + 1);
    const own = this.$(".labin").value.trim().split(/\s+/).join(" ") === ls.chain.join(" ");
    const pred = this.guess && ls.predict && own ? (this.guess === ls.predict.answer ? ` You predicted ${this.guess}: right.` : ` You predicted ${this.guess}. It was ${ls.predict.answer}.`) : "";
    this.showTake(nx ? { h: "TAKEAWAY", t: ls.take + pred, b: `Next: Lesson ${nx.n} · ${nx.name} ▸`, go: () => this.selectLesson(nx, false) }
                     : { h: "TAKEAWAY", t: ls.take + pred + " That's all ten.", b: "Try them on your own rope in the Lab ▸", go: () => this.openLab() });
  }
  // the optional prediction: only for the lesson's own rope, where the answer is known
  setPredict(ls) {
    const el = this.predictEl; if (!el) return;
    this.guess = null; el.innerHTML = ""; el.classList.remove("on");
    if (!ls || !ls.predict) return;
    el.innerHTML = `<div class="lp-q"><b>PREDICT · optional</b><span></span></div><div class="lp-o" role="group"></div>`;
    el.querySelector(".lp-q span").textContent = ls.predict.q;
    el.querySelector(".lp-o").setAttribute("aria-label", ls.predict.q);
    for (const o of ls.predict.options) {
      const b = document.createElement("button"); b.textContent = o; b.setAttribute("aria-pressed", "false");
      b.onclick = () => { if (this.busy) return; this.guess = o; el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); };
      el.querySelector(".lp-o").appendChild(b);
    }
    el.classList.add("on");
  }
  showTake(o) {
    const t = this.take; if (!t) return;
    t.classList.remove("on", "mis"); t.innerHTML = "";
    if (!o) return;
    t.innerHTML = `<div class="lt-h"></div><div class="lt-t"></div><button></button>`;
    t.querySelector(".lt-h").textContent = o.h; t.querySelector(".lt-t").textContent = o.t; t.querySelector("button").textContent = o.b;
    t.querySelector("button").onclick = () => { if (!this.busy) o.go(); };
    t.classList.toggle("mis", !!o.mis); void t.offsetWidth; t.classList.add("on");
    t.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  // the line just explained, once more, after the run has ended (Athena's ⟲)
  async replayBeat(k0, k1) {
    if (this._replaying) return; this._replaying = true;
    const { sty } = this.ctx, board = this.board;
    this.snapTo(k0);
    const runSteps = async () => { for (let k = k0; k < k1; k++) { board.show(k + 1); await sty.act(this.steps[k], board.frames[k + 1], 1); } };
    try { await this.athena.beat(this.steps.slice(k0, k1), board.frames[k0], board.frames[k1], runSteps); }
    finally { this._replaying = false; if (this.player) this.player.k = k1; board.show(k1); board.setEnabled(k1 > 0, k1 < this.steps.length); }
  }
  snapTo(k) {
    const f = this.board.frames[Math.max(0, Math.min(this.board.frames.length - 1, k))];
    this.ctx.sty.show(f);
    const st = this.steps[k - 1];
    this.lens.live(st ? f : null, n => this.board.color(n));
    this.mark(st ? st.line : 0);
    const b = this.beats && this.beats.find(x => k - 1 >= x.from && k - 1 < x.to);
    if (b && this.athena.active()) this.athena.show(this.steps.slice(b.from, b.to), this.board.frames[b.from], this.board.frames[b.to]); else this.athena.cancel();
    this.board.show(k);
    this.board.setEnabled(k > 0, k < this.steps.length);
  }

  // ---------- endings
  async endSuccess(res) {
    const { director, sty, comic } = this.ctx;
    if (this.level === LAB || this.level.sandbox) {
      const f = this.board.frames[this.board.frames.length - 1], lost = lostNodes(f), ls = this.level.lesson;
      const out = (f.out || "").trim();
      if (lost.length) {
        const which = lost.map(a => `${f.nodes[a].data} (0x${a.toString(16).toUpperCase()})`).join(", ");
        this.status(`It ran, but ${which} ${lost.length > 1 ? "are" : "is"} UNREACHABLE: no pointer leads there any more. ${ls && this.level.mistake ? ls.mistake.say : ""}`, "bad");
        await director.stamp("UNREACHABLE", `${which}: lost for good`, { kind: "bad", seconds: 2.6 });
        return;
      }
      if (ls) {
        this.status(`${ls.name}: done.${out ? " The console printed: " + out.replace(/\n/g, " ") : ""} Step back with ◀ to see any moment again, change the rope above, or try the next operation.`, "good");
        await director.stamp(ls.name.toUpperCase(), out ? out.split("\n").pop() || out : "step back through it on the board", { kind: "good", seconds: 2 });
        return;
      }
      this.status(res.message + (out ? " Console: " + out.replace(/\n/g, " ") : ""), "good");
      await director.stamp("DONE", "step back through it on the board", { kind: "good", seconds: 1.6 });
      return;
    }
    markDone(this.level.id); this.renderTabs();
    if (this.level.tier === "FINALE") {
      this.status(res.message, "good");
      this.board.close();
      if (this.riser) { this.riser.stop(0.3); this.riser = null; }
      sound.silence(0.3); await sty.wait(2.0); sound.restore(0.5);      // Act IV: the rope is still. Two seconds of nothing
      if (this.ctx.dusk) this.ctx.dusk(1, 4.5);     // the sun goes down while the men stand up
      await sty.turnBack(comic, { onMan: (i) => sound.chord({ notes: i + 1, seconds: 1.4 }) });   // one more voice in the chord for every man
      await director.stamp("MEN AGAIN", res.message, { kind: "good", seconds: 2.6 });
      this.el.classList.remove("on"); this.ctx.panelView(false);
      if (this.ctx.onFinale) await this.ctx.onFinale();
      this.showTake({ h: "CHAPTER THREE · DONE", t: "Home was still a long way off.", b: "NEXT: THE UNDERWORLD ▸", go: () => voyageTo("underworld", { from: "circe" }) });
      return;
    }
    // a pig cut loose (trial 4) walks off as a man: the freed node is gone from the rope
    const next = this.levels.find(l => !done().includes(l.id) && !this.locked(l));
    this.announce((PA[this.level.id] || [])[1]); sound.chord({ notes: 3 });
    this.status(res.message + (next ? ` Next: ${(CARDS[next.id] || [""])[0]} ${next.title}.` : ""), "good");
    await director.stamp("DONE", res.message, { kind: "good", seconds: 2.4 });
  }
  async endGoalNotMet(res) {
    const { director, sty } = this.ctx;
    this.mark(0);
    this.status(res.message + " Fix the code and try again.", "bad");
    const f = this.board.frames[this.board.frames.length - 1], lost = lostNodes(f);
    // pigs nothing points to any more wander off into the woods
    sound.chord({ up: false });
    if (lost.length) { await sty.wanderOff(lost); await director.stamp("LOST IN THE WOODS", res.message, { kind: "bad", seconds: 3.2 }); sty.show(f); return; }
    await director.stamp("NOT YET", res.message, { kind: "bad", seconds: 3.0 });
  }
  async endNull(res, st) {
    const { director, island } = this.ctx;
    this.mark(st.line, true);
    this.status(res.message + " Fix the code and try again.", "bad");
    const lineText = (this.lines[st.line - 1] || "").trim();
    const freed = /freed/.test(res.message), ls = this.level && this.level.lesson;
    const sub = freed ? res.message + ". That pig was already handed back with free(): nothing may read it again." + (ls && this.level.mistake ? " " + ls.mistake.say : "")
                      : res.message + ". Check p != NULL before p->data or p->next.";
    await director.siren({ title: freed ? "FREED" : "NULL", sub, lineNo: st.line, lineText, focus: (s => ({ x: s.x, z: s.z, y: 0.3 }))(this.ctx.sty.nullSpot()) });
    island.pitGlow.intensity = 0;
  }
  async endCompile(res) {
    this.mark(res.line, true);
    this.status(`Line ${res.line}: ${res.message}`, "bad");
    await this.ctx.director.stamp("ATHENA'S WORDS DID NOT REACH HIM", `line ${res.line}: ${res.message}`, { kind: "bad" });
  }
  async endLoop(res) {
    this.mark(res.line, true);
    this.status(res.message + " Does p ever move on to p->next?", "bad");
    await this.ctx.director.stamp("THE SAME PIG, AGAIN AND AGAIN", res.message, { kind: "bad", seconds: 3.5 });
  }
  async endFail(res, title, why, { line = res.line } = {}) {
    this.mark(line, true);
    this.status(res.message + " Fix the code and try again.", "bad");
    const lineText = line > 0 ? (this.lines[line - 1] || "").trim() : "";
    await this.ctx.director.siren({ title, sub: why, lineNo: line, lineText, focus: { x: GATE.x + 3, z: GATE.z, y: 0.6 } });
  }
}
