// circeTrials.js — Circe's trials (linked lists). The player writes C with Node*, ->next and NULL;
// Java runs it (POST /api/levels/{id}/play, or /api/sandbox for the Lab) and answers with an outcome
// and the steps: PTR (a pointer moved), NEW, READ, WRITE, LINK (an arrow re-tied), FREE, NULL_DEREF.
// Every step is turned into a frame up front (listBoard.js); the board draws the frame flat, the sty
// (sty.js) draws it in 3D. Going back just shows an earlier frame in both.
// The browser never decides if the code is right: Java does.
import { TRIAL_CSS } from "../../learn/trialPanelCss.js";
import { ListBoard, walkFrom, lostNodes, NULL } from "../../learn/listBoard.js";
import { GATE } from "./sty.js";
import { Codex } from "../../learn/codex.js";
import { LESSONS, lessonCode, CIRCE_CODEX } from "./circeLessons.js";

const STORE = "odyssey.circe.done";
const done = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const markDone = id => { try { const d = done(); if (!d.includes(id)) { d.push(id); localStorage.setItem(STORE, JSON.stringify(d)); } } catch { /* storage off */ } };

// a black card before each trial: the night goes on
const CARDS = {
  "circe-1": ["ONE.", "Noon. Five pigs on a rope. You can only see the first."],
  "circe-2": ["TWO.", "Somewhere on that rope is your second-in-command."],
  "circe-3": ["THREE.", "Elpenor. Drunk, late, and now a pig."],
  "circe-4": ["FOUR.", "The herb works. One man walks free."],
  "circe-finale": ["FIVE.", "The spell runs backwards. So does the rope."],
  "circe-banquet": ["SUNSET.", "Circe pours the wine. She wants to make a deal."]
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
`;

export class CirceTrials {
  // ctx: { world, sty, director, comic, panelView(on), onClose(), onLesson(), onFinale(), skipping(), fast: { begin(), land(), end() } }
  constructor(ctx) {
    this.ctx = ctx; this.levels = []; this.level = null; this.busy = false;
    if (!document.getElementById("trial-css")) { const s = document.createElement("style"); s.id = "trial-css"; s.textContent = TRIAL_CSS; document.head.appendChild(s); }
    if (!document.getElementById("circe-trial-css")) { const s = document.createElement("style"); s.id = "circe-trial-css"; s.textContent = css; document.head.appendChild(s); }
    this.card = document.createElement("div"); this.card.id = "trial-card"; this.card.innerHTML = "<div class='h'></div><div class='s'></div>";
    document.body.appendChild(this.card);
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
    this.el.classList.remove("on"); this.ctx.panelView(false); this.board.close();
    if (this.ctx.onClose) this.ctx.onClose();
  }
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
  moves(n) { this.$(".moves").innerHTML = `ROPES RE-TIED <b>${n}</b>`; }

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
    director.frame(() => { const pts = sty.points(); return pts.map(p => p.clone().setY(0)).concat(pts.map(p => p.clone().setY(2.4))); }, { dir: [0, 1.9, 1], fov: 38, margin: 1.04, minDist: 6, lag: 2.6, snap });
  }

  // the NULL pit only needs to be in the picture when some pointer is NULL
  needPit() { const f = this.ctx.sty.frame; return !!f && Object.values(f.ptrs).some(a => a === NULL); }

  async trialCard(l) {
    const h = CARDS[l.id]; if (!h || this.ctx.skipping()) return;
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
    if (this.ctx.dusk) this.ctx.dusk(0, 0);        // every trial, lesson and Lab run is at noon
    const lab = l === LAB, ls = l.lesson;
    this.$("h2").innerHTML = `<span class="trial-hour">${lab ? "LAB" : ls ? "LESSON " + ls.n : (CARDS[l.id] || [""])[0]}</span>`; this.$("h2").append(ls ? ls.name : l.title);
    if (ls) { this.$(".story").innerHTML = l.mistake ? ls.mistake.say : ls.say; }
    else this.$(".story").textContent = l.story;
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
    this.updateGutter(); this.mark(0); this.moves(0); this.status(ls && !keepCode ? `This is your program's ${ls.id}(), unchanged. The last line${ls.driver.trim().split("\n").length > 1 ? "s" : ""} call${ls.driver.trim().split("\n").length > 1 ? "" : "s"} it. Press SHOW ME.` : "");
    if ((lab || ls) && !keepCode) { this.$(".labin").value = l.structures[0].initial.join(" "); this.labInput(); }
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
    try { await this.play(res, code.split("\n")); }
    finally { this.ctx.fast.end(); this.ctx.world.timeScale = 1; this.busy = false; this.$(".run").disabled = false; this.mark(0); if (this.el.classList.contains("on")) this.view(); }
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
    const P = this.player = { k: 0, playing: true, speed: 1, wake: null, ended: false, gen: 0, links: 0 };
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
    while (P.k < steps.length) {
      if (!P.playing && !P.once) { await new Promise(r => (P.wake = r)); if (P.k >= steps.length) break; }
      const st = steps[P.k], gen = P.gen;
      this.mark(st.line); this.status(`line ${st.line}: ${st.message}`);
      board.show(P.k + 1);
      if (st.action === "NULL_DEREF") { world.timeScale = 1; this.ctx.fast.land(); }
      await sty.act(st, board.frames[P.k + 1], 1);
      P.once = false;
      if (gen !== P.gen) { this.snapTo(P.k); continue; }
      if (st.action === "LINK") this.moves(++P.links);
      P.k++; board.setEnabled(P.k > 0, P.k < steps.length);
      if (st.action === "NULL_DEREF") { P.ended = true; return this.endNull(res, st); }
    }
    P.ended = true; board.setPlaying(false); board.setEnabled(P.k > 0, false);
    world.timeScale = 1; this.ctx.fast.land();
    if (res.outcome === "SUCCESS") return this.endSuccess(res);
    if (res.outcome === "GOAL_NOT_MET") return this.endGoalNotMet(res);
    if (res.outcome === "INFINITE_LOOP") return this.endLoop(res);
    return this.endFail(res, "SOMETHING WENT WRONG", res.message, { line: res.line });
  }
  snapTo(k) {
    const f = this.board.frames[Math.max(0, Math.min(this.board.frames.length - 1, k))];
    this.ctx.sty.show(f);
    const st = this.steps[k - 1];
    this.mark(st ? st.line : 0);
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
      if (this.ctx.dusk) this.ctx.dusk(1, 4.5);     // the sun goes down while the men stand up
      await sty.turnBack(comic);
      await director.stamp("MEN AGAIN", res.message, { kind: "good", seconds: 2.6 });
      this.el.classList.remove("on"); this.ctx.panelView(false);
      if (this.ctx.onFinale) await this.ctx.onFinale();
      return;
    }
    // a pig cut loose (trial 4) walks off as a man: the freed node is gone from the rope
    const next = this.levels.find(l => !done().includes(l.id) && !this.locked(l));
    this.status(res.message + (next ? ` Next: ${(CARDS[next.id] || [""])[0]} ${next.title}.` : ""), "good");
    await director.stamp("DONE", res.message, { kind: "good", seconds: 2.4 });
  }
  async endGoalNotMet(res) {
    const { director, sty } = this.ctx;
    this.mark(0);
    this.status(res.message + " Fix the code and try again.", "bad");
    const f = this.board.frames[this.board.frames.length - 1], lost = lostNodes(f);
    // pigs nothing points to any more wander off into the woods
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
