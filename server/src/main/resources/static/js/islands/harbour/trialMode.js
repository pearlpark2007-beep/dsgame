// trialMode.js — the Harbour trials. The player writes C; Java runs it (POST /api/levels/{id}/play)
// and answers with an outcome and a list of steps. This file acts those steps out, one by one,
// with Odysseus, the piles, the gauges, the manifest and the variables bench, then plays the
// ending that fits the outcome. The browser never decides if the code is right: Java does.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { CRATE_H, stackFrame } from "./trialSet.js";
import { setPileObstacles } from "./harbourNav.js";
import { CARGO, cargoNames } from "./dsProps.js";
import { sound } from "../../engine/sound.js";
import { TRIAL_CSS as css } from "../../learn/trialPanelCss.js";
import { StackBoard } from "../../learn/stackBoard.js";
import { Codex } from "../../learn/codex.js";
import { HARBOUR_CODEX } from "../../learn/codexContent.js";
import { icon } from "../../ui/icons.js";
import { AthenaLine } from "../../learn/athenaLine.js";
import { VillainVoice } from "../../ui/villainVoice.js";

const STORE = "odyssey.harbour.done";
const done = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const markDone = id => { try { const d = done(); if (!d.includes(id)) { d.push(id); localStorage.setItem(STORE, JSON.stringify(d)); } } catch { /* storage off */ } };

const TIER = { PRACTICE: "PRACTICE", FINALE: "FINALE", LAB: "LAB" };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// THE LAB: the player builds the quay (up to 3 stacks, up to 6 crates high) and writes anything.
// Java runs it (POST /api/sandbox); nothing to win. The examples are classic stack algorithms on s and t.
const LAB_EXAMPLES = {
  "Move all (it reverses)": `// pop everything off s onto t: the order flips
while (!isEmpty(&s)) {
    push(&t, pop(&s));
}`,
  "Sort a stack": `// sort s using t: t ends with the biggest on top
while (!isEmpty(&s)) {
    int x = pop(&s);
    while (!isEmpty(&t) && peek(&t) > x) {
        push(&s, pop(&t));
    }
    push(&t, x);
}`,
  "Find the biggest": `// look at every crate without losing any:
// move them all to t, then back to s
int big = peek(&s);
while (!isEmpty(&s)) {
    int x = pop(&s);
    if (x > big) { big = x; }
    push(&t, x);
}
while (!isEmpty(&t)) {
    push(&s, pop(&t));
}`,
  "Bottom to top": `// bring the bottom crate of s to the top, using t
while (size(&s) > 1) {
    push(&t, pop(&s));
}
int bottom = pop(&s);
while (!isEmpty(&t)) {
    push(&s, pop(&t));
}
push(&s, bottom);`,
  "Overflow": `// keep pushing until there is no slot left
while (1) {
    push(&s, 5);
}`,
  "Underflow": `// keep popping until there is nothing left
while (1) {
    pop(&s);
}`
};
const LAB = {
  id: "lab", tier: "LAB", title: "The Lab",
  story: "No giants. No chain. Your quay, your code: Athena only watches.",
  goal: "", hint: "The examples use stacks called s and t. Values are written bottom first: 3 7 means 7 is on top.",
  starterCode: LAB_EXAMPLES["Sort a stack"], maxMoves: 0,
  structures: [{ name: "s", kind: "stack", capacity: 5, initial: [34, 3, 77, 12] }, { name: "t", kind: "stack", capacity: 5, initial: [] }]
};
const NAME_OK = /^[a-z][a-z0-9_]{0,9}$/, RESERVED = new Set(["int", "if", "else", "while", "for", "break", "continue", "push", "pop", "peek", "isempty", "isfull", "size", "n", "flock", "return"]);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const cargo = v => (cargoNames.on && CARGO[v]) || String(v);

const CARD_CSS = `
#trial-card { position: fixed; inset: 0; z-index: 33; background: #050403; display: none; flex-direction: column; justify-content: center; padding-left: 9vw;
  font-family: Anton, Impact, sans-serif; color: #f2c230; pointer-events: none; }
#trial-card.on { display: flex; }
#trial-card .k { font: 700 clamp(13px, 1.2vw, 16px) 'Courier Prime', monospace; letter-spacing: 4px; color: #f2c230; margin-bottom: 14px; }
#trial-card .h { font-size: clamp(56px, 11vw, 150px); line-height: 0.9; letter-spacing: 2px; text-shadow: 5px 5px 0 #7e1a0f; }
#trial-card .s { margin-top: 18px; max-width: 70vw; font-family: 'Courier Prime', monospace; font-size: clamp(15px, 1.6vw, 22px); color: #efe1c2; letter-spacing: 1px; }
`;
export class TrialMode {
  // ctx: { world, hero, trial, nav, director, bench, HEAP, codeLine(text), skipping(), skipper: { begin(), end() }, onLesson() }
  // the full-screen card, shown for 1.6 s when a trial is opened (not on a re-run, not in the Lab)
  trialCard(l) {
    if (!this.card || this.ctx.director.skipping) return;
    const i = this.levels.indexOf(l); if (i < 0) return;
    this.card.querySelector(".k").textContent = `TRIAL ${i + 1} OF ${this.levels.length} · ${l.title.toUpperCase()}`;
    this.card.querySelector(".h").textContent = (["ONE.", "TWO.", "THREE.", "FOUR.", "FIVE.", "SIX."][i]) || `${i + 1}.`;
    this.card.querySelector(".s").textContent = String(l.goal || "").split(/(?<=[.:!?])\s/)[0];
    this.card.classList.add("on");
    clearTimeout(this.cardT); this.cardT = setTimeout(() => this.card.classList.remove("on"), 1600);
  }
  constructor(ctx) {
    this.athenaLine = new AthenaLine();                                    // Athena's code box, as on Circe's island
    this.voice = new VillainVoice("harbour", { skipping: () => ctx.skipping() });   // the villain's voice box, as on Circe's island
    this.ctx = ctx; this.levels = []; this.level = null; this.busy = false;
    this.board = new StackBoard();
    if (!document.getElementById("trial-css")) { const s = document.createElement("style"); s.id = "trial-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("aside");
    el.id = "trial-panel"; el.setAttribute("aria-label", "Athena: the trials");
    el.innerHTML = `<div class="who">ATHENA · THE TRIALS</div><div class="tabs"></div><h2></h2><p class="story"></p><p class="goal"></p>
      <div class="lab"><div class="labhead">YOUR QUAY <small>(values bottom first: <code>3 7</code> puts 7 on top)</small></div>
        <div class="labrows"></div><div class="labbtns"></div><div class="labmsg" aria-live="polite"></div></div>
      <div class="meta"><span class="moves"></span><span class="hintArea"></span></div>
      <div class="editor"><div class="gutter">1</div><div class="wrap"><div class="hl"></div><label class="sr" style="position:absolute;left:-9999px" for="tcode">Your C code</label><textarea id="tcode" spellcheck="false" autocomplete="off"></textarea></div></div>
      <button class="run">GUIDE HIM</button>
      <div class="row"><button class="reset">Reset trial</button><button class="lessonb">Athena's lesson</button><button class="closeb">Close</button></div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="words">Words Athena understands: <code>push(&amp;s, x);</code> <code>pop(&amp;s)</code> <code>peek(&amp;s)</code> <code>isEmpty(&amp;s)</code> <code>isFull(&amp;s)</code> <code>size(&amp;s)</code> <code>int x = ...;</code> <code>if</code> <code>while</code> <code>for</code></div>`;
    document.body.appendChild(el);
    // the full-screen card before each trial (the same card as Circe's island): TRIAL n OF N · TITLE, the number, the goal
    if (!document.getElementById("harbour-card-css")) { const cs = document.createElement("style"); cs.id = "harbour-card-css"; cs.textContent = CARD_CSS; document.head.appendChild(cs); }
    this.card = document.createElement("div"); this.card.id = "trial-card"; this.card.setAttribute("aria-live", "polite");
    this.card.innerHTML = "<div class='k'></div><div class='h'></div><div class='s'></div>"; document.body.appendChild(this.card);
    this.$ = q => el.querySelector(q);
    this.code = this.$("textarea"); this.gutter = this.$(".gutter"); this.hl = this.$(".hl");
    this.code.addEventListener("input", () => this.updateGutter());
    this.code.addEventListener("scroll", () => { this.gutter.scrollTop = this.code.scrollTop; this.hl.style.display = "none"; });
    this.code.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); const s = this.code.selectionStart; this.code.setRangeText("    ", s, this.code.selectionEnd, "end"); this.updateGutter(); } });
    this.$(".run").onclick = () => this.run();
    this.$(".reset").onclick = () => { if (!this.busy && this.level) this.select(this.level); };
    this.$(".lessonb").onclick = () => { if (!this.busy && ctx.onLesson) ctx.onLesson(); };
    this.$(".closeb").onclick = () => { if (!this.busy) this.close(true); };
    if (!document.getElementById("harbour-lab-css")) { const st = document.createElement("style"); st.id = "harbour-lab-css"; st.textContent = LAB_CSS; document.head.appendChild(st); }
    this.buildLab();
    this.codex = new Codex(el, HARBOUR_CODEX, part => this.runPart(part));
  }
  // the Codex's "run this part": the part's steps, in the Lab, on its own stacks
  async runPart(part) {
    if (this.busy || !part.run) return;
    if (!this.levels.length) await this.open();
    LAB.structures = part.run.stacks.map(x => ({ name: x.name, kind: "stack", capacity: x.capacity, initial: x.initial.slice() }));
    this.select(LAB);
    this.code.value = part.run.code; this.updateGutter();
    this.codex.say(part);
    await this.run();
    if (!this.busy) this.status(`${part.name}: that's the part from the whole program, run on the board.`, "good");
  }

  // ---------- the Lab's controls: one row per stack (name, size, crates), presets, examples
  buildLab() {
    const btns = this.$(".labbtns");
    const add = (label, fn) => { const b = document.createElement("button"); b.textContent = label; b.onclick = () => { if (!this.busy) fn(); }; btns.appendChild(b); return b; };
    this.addBtn = add("+ stack", () => { const used = new Set(LAB.structures.map(x => x.name)); const name = ["s", "t", "u", "v"].find(x => !used.has(x)); LAB.structures.push({ name, kind: "stack", capacity: 4, initial: [] }); this.labRows(); this.labApply(); });
    add("Random", () => { for (const x of LAB.structures) x.initial = Array.from({ length: rnd(0, x.capacity - 1) }, () => rnd(1, 99)); this.labRows(); this.labApply(); });
    add("Empty all", () => { for (const x of LAB.structures) x.initial = []; this.labRows(); this.labApply(); });
    const sel = document.createElement("select"); sel.className = "examples"; sel.setAttribute("aria-label", "Load an example algorithm");
    sel.innerHTML = `<option value="">Examples…</option>` + Object.keys(LAB_EXAMPLES).map(k => `<option>${k}</option>`).join("");
    sel.onchange = () => { if (!sel.value || this.busy) return; this.code.value = LAB_EXAMPLES[sel.value]; this.updateGutter(); this.mark(0); this.status(`${sel.value} loaded. Press GUIDE HIM.`); sel.value = ""; };
    btns.appendChild(sel);
  }
  // draw the rows from LAB.structures
  labRows() {
    const rows = this.$(".labrows"); rows.innerHTML = "";
    LAB.structures.forEach((x, i) => {
      const r = document.createElement("div"); r.className = "labrow";
      r.innerHTML = `<input class="nm" aria-label="Stack ${i + 1} name" value="${x.name}" maxlength="10" spellcheck="false">
        <select class="cap" aria-label="Stack ${i + 1} size">${[1, 2, 3, 4, 5, 6].map(c => `<option${c === x.capacity ? " selected" : ""}>${c}</option>`).join("")}</select>
        <input class="vals" aria-label="Stack ${i + 1} crates, bottom first" value="${x.initial.join(" ")}" spellcheck="false" placeholder="empty">
        <button class="rm" title="Remove this stack" aria-label="Remove stack ${x.name}">✕</button>`;
      const read = () => this.labRead();
      r.querySelector(".nm").oninput = read; r.querySelector(".vals").oninput = read; r.querySelector(".cap").onchange = read;
      r.querySelector(".rm").onclick = () => { if (this.busy || LAB.structures.length <= 1) return; LAB.structures.splice(i, 1); this.labRows(); this.labApply(); };
      rows.appendChild(r);
    });
    this.addBtn.disabled = LAB.structures.length >= 3;
    rows.querySelectorAll(".rm").forEach(b => (b.disabled = LAB.structures.length <= 1));
  }
  // read the rows back; anything wrong is said in plain words and GUIDE HIM waits
  labRead() {
    const msg = this.$(".labmsg"), rows = [...this.$(".labrows").children], next = [], seen = new Set();
    let error = "";
    rows.forEach(r => r.querySelectorAll("input").forEach(x => x.classList.remove("bad")));
    for (const r of rows) {
      const nmEl = r.querySelector(".nm"), vEl = r.querySelector(".vals");
      const name = nmEl.value.trim(), capacity = +r.querySelector(".cap").value;
      if (!NAME_OK.test(name) || RESERVED.has(name.toLowerCase())) { error ||= `"${name}" can't be a stack's name: use small letters, like s or spare.`; nmEl.classList.add("bad"); }
      else if (seen.has(name)) { error ||= `Two stacks are both called "${name}".`; nmEl.classList.add("bad"); }
      seen.add(name);
      const parts = vEl.value.split(/[\s,]+/).filter(Boolean), initial = [];
      for (const p of parts) { if (!/^-?\d{1,3}$/.test(p)) { error ||= `"${p}" isn't a whole number from -999 to 999.`; vEl.classList.add("bad"); } else initial.push(parseInt(p, 10)); }
      if (initial.length > capacity) { error ||= `${name} holds ${capacity}, but you gave it ${initial.length} crates.`; vEl.classList.add("bad"); }
      next.push({ name, kind: "stack", capacity, initial });
    }
    msg.classList.toggle("bad", !!error); this.$(".run").disabled = !!error || this.busy;
    if (error) { msg.textContent = error; return; }
    msg.textContent = next.map(x => `${x.name}: ${x.initial.length ? "top = " + (x.initial.length - 1) : "empty"}`).join("   ·   ");
    LAB.structures = next;
    clearTimeout(this.labT); this.labT = setTimeout(() => this.labApply(), 450);   // rebuild the quay once typing pauses
  }
  labApply() { if (!this.busy && this.level === LAB) { this.select(LAB, true); this.labRead2(); } }
  labRead2() { const msg = this.$(".labmsg"); if (!msg.classList.contains("bad")) msg.textContent = LAB.structures.map(x => `${x.name}: ${x.initial.length ? "top = " + (x.initial.length - 1) : "empty"}`).join("   ·   "); }
  // open straight onto the Lab
  async openLab() { await this.open(); if (this.levels.length) this.select(LAB); }

  async open() {
    this.el.classList.add("on");
    if (!this.levels.length) {
      try {
        const r = await fetch("/api/levels?island=harbour");
        this.levels = await r.json();
      } catch (e) { this.status("Can't reach the game server. Run the Spring Boot app in IntelliJ, then open http://localhost:8081/harbour_env.html (not IntelliJ's browser preview).", "bad"); return; }
    }
    const d = done();
    this.select(this.levels.find(l => !d.includes(l.id)) || this.levels[0]);
  }
  // back = the player closed the panel (back to the chapter's doors); without it the page is switching to something else
  close(back = false) {
    this.el.classList.remove("on"); this.board.close();
    if (back) { this.ctx.panelView(false); if (this.ctx.onClose) this.ctx.onClose(); }
  }
  // the finale opens once every practice level on the island is done
  locked(l) { const d = done(); return l.tier === "FINALE" && this.levels.some(p => p.tier === "PRACTICE" && !d.includes(p.id)); }

  updateGutter() { const n = this.code.value.split("\n").length; this.gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n"); this.gutter.scrollTop = this.code.scrollTop; }
  mark(line, err = false) {
    if (!line || line < 1) { this.hl.style.display = "none"; return; }
    this.hl.style.display = "block"; this.hl.classList.toggle("err", err);
    this.hl.style.top = (10 + (line - 1) * 20 - this.code.scrollTop) + "px";
  }
  status(t, kind = "") { const s = this.$(".status"); s.textContent = t; s.className = "status " + kind; }
  moves(n) { const m = this.level.maxMoves; this.$(".moves").innerHTML = m ? `MOVES <b>${n}</b> / ${m}` : `MOVES <b>${n}</b>`; }

  renderTabs() {
    const d = done(), tabs = this.$(".tabs"); tabs.innerHTML = "";
    [...this.levels, LAB].forEach(l => {
      const b = document.createElement("button");
      b.className = "tab" + (l === this.level ? " on" : "");
      const locked = this.locked(l);
      // the same line icons as every chapter's tabs (no emoji): lock, flask, check
      b.innerHTML = l === LAB ? icon("flask", { size: 14 }) + " THE LAB"
        : (locked ? icon("lock", { size: 14 }) + " " : "") + TIER[l.tier] + " · " + esc(l.title) + (d.includes(l.id) ? " " + icon("check", { size: 14 }) : "");
      if (l === LAB) b.classList.add("labtab");
      b.setAttribute("aria-pressed", l === this.level);
      b.onclick = () => { if (this.busy) return; if (locked) { this.status("Finish the practice first: the crew won't row out with an empty hold.", "bad"); return; } this.select(l); };
      tabs.appendChild(b);
    });
  }

  // set the harbour up exactly as the level starts
  select(l, keepCode = false) {
    this.athenaLine.clear();
    if (!keepCode && l !== LAB && !l.lesson) this.voice.opened(l.id);
    const { trial, nav, hero, bench, director } = this.ctx;
    this.level = l;
    if (!keepCode) this.board.close();
    this.$("h2").textContent = l.title;
    this.$(".story").textContent = l.story;
    this.$(".goal").innerHTML = "<b>THE TRIAL</b>"; this.$(".goal").append(l.goal);
    const lab = l === LAB;
    cargoNames.on = !lab;                 // Lab crates are plain numbers (3 is 3, not WINE)
    this.$(".lab").classList.toggle("on", lab); this.$(".goal").style.display = lab ? "none" : "";
    if (lab && !keepCode) { this.labRows(); this.labRead2(); }
    const ha = this.$(".hintArea"); ha.innerHTML = "";
    if (l.hint) { const b = document.createElement("button"); b.className = "linkb"; b.textContent = "ask for a hint"; b.onclick = () => this.status(l.hint); ha.appendChild(b); }
    if (!keepCode) { this.code.value = l.starterCode; if (this.codex) this.codex.say(null); }
    this.updateGutter(); this.mark(0);
    this.moves(0); this.status("");
    trial.clearAll();                      // every crate from before leaves the quay
    trial.rebuild(l.structures); setPileObstacles(nav, trial);
    bench.clear();
    const first = Object.values(trial.piles)[0];
    hero.teleport(first.x + 1.6, first.z + 2.2, Math.PI * 0.85);
    this.focus = null; this.stackView(true);
    this.renderTabs();
    if (!keepCode && !lab) this.trialCard(l);
  }
  // the stack camera: the pile in use (or every pile, between runs) and Odysseus, as big as they fit
  stackView(snap = false) { const { trial, hero, director } = this.ctx; stackFrame(director, trial, hero, () => (this.focus ? [this.focus] : Object.values(trial.piles)), { snap }); }
  // high enough to see over the Return Values bench
  wideShot() { const ps = Object.values(this.ctx.trial.piles), cx = ps.reduce((a, p) => a + p.x, 0) / ps.length; return [[cx + 0.8, 5.0, 7.4 + ps.length * 0.5], [cx, 1.5, -1.5], 44]; }

  async run() {
    if (this.busy || !this.level) return;
    const { trial, hero, director } = this.ctx;
    this.busy = true; this.$(".run").disabled = true;
    const code = this.code.value;
    this.select(this.level, true);         // every run starts from the level's starting state
    this.status("Athena speaks…");
    let res;
    try {
      const lab = this.level === LAB;
      const r = lab
        ? await fetch("/api/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ island: "harbour", code, structures: LAB.structures }) })
        : await fetch(`/api/levels/${this.level.id}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (lab && r.status === 400) {          // the quay the player built was refused: say why, in Java's words
        let why = "The server refused this quay."; try { why = (await r.json()).message || why; } catch { /* no body */ }
        this.status(why.replace(/^\d+ BAD_REQUEST\s*"?|^BAD_REQUEST:\s*|"$/g, ""), "bad"); this.busy = false; this.$(".run").disabled = false; return;
      }
      if (!r.ok) throw new Error("server answered " + r.status);
      res = await r.json();
    } catch (e) { this.status("Can't reach the game server (" + e.message + "). Run the Spring Boot app in IntelliJ, then open http://localhost:8081/harbour_env.html.", "bad"); this.busy = false; this.$(".run").disabled = false; return; }
    this.ctx.skipper.begin();
    const finale = this.level.tier === "FINALE";
    if (finale) sound.drums(true, { bpm: 88 });         // the finale is played against the giants' war drums
    try { await this.play(res, code.split("\n")); }
    finally { sound.drums(false); this.ctx.skipper.end(); this.busy = false; this.$(".run").disabled = false; this.ctx.codeLine(""); if (!finale) { this.focus = null; this.stackView(); } }
  }

  // ---------- acting out Java's steps
  async play(res, lines) {
    this.lines = lines;
    const { trial, hero, director, bench, HEAP, codeLine, world } = this.ctx;
    if (res.outcome === "COMPILE_ERROR") return this.endCompile(res);
    let all = res.steps || [];
    if (res.outcome === "INFINITE_LOOP") all = all.slice(0, 40);   // the same moment a few times is enough
    const acting = s => s.action !== "VAR";
    // the 2D board under the harbour: every frame built up front; the 3D acts them out one by one
    const board = this.board;
    board.load({ piles: this.level.structures, steps: all, label: v => (cargoNames.on && CARGO[v]) || "" });
    board.open();
    const P = this.player = { k: 0, playing: true, once: false, wake: null, view: null, speed: 1, ended: false, auto: null };
    const rate = () => { if (!this.ctx.skipping()) world.timeScale = P.speed; };
    const resume = () => { if (P.wake) { const w = P.wake; P.wake = null; w(); } };
    const sync = () => board.setEnabled(board.k > 0, P.ended ? board.k < all.length : true);
    const stopAuto = () => { if (P.auto) { clearInterval(P.auto); P.auto = null; } };
    board.setPlaying(true); board.setLive(0); sync();
    board.cb.onPlay = () => {
      if (P.ended) {
        // after the run: replay the board on its own (the harbour has already acted it all out)
        if (board.k >= all.length) board.show(0);
        board.setPlaying(true); stopAuto();
        P.auto = setInterval(() => { board.show(board.k + 1); sync(); if (board.k >= all.length) { stopAuto(); board.setPlaying(false); } }, 650 / P.speed);
        return;
      }
      P.playing = true; P.view = null; board.show(P.k); board.setPlaying(true); sync(); resume();
    };
    board.cb.onPause = () => { stopAuto(); P.playing = false; board.setPlaying(false); };
    board.cb.onSpeed = v => { P.speed = v; rate(); };
    board.cb.onStep = dir => {
      stopAuto(); P.playing = false; board.setPlaying(false);
      if (dir === "fwd") {
        if (P.ended || (P.view != null && P.view < P.k)) { P.view = Math.min(P.ended ? all.length : P.k, board.k + 1); board.show(P.view); if (!P.ended && P.view >= P.k) P.view = null; }
        else { P.once = true; resume(); }
      } else if (dir === "last") {
        if (P.ended) board.show(all.length);
        else { P.view = null; P.playing = true; board.setPlaying(true); board.show(P.k); if (!this.ctx.skipping()) world.timeScale = 6; resume(); }
      } else {
        // back / first: the board steps back on its own; the 3D harbour stays where it is
        P.view = dir === "first" ? 0 : Math.max(0, board.k - 1); board.show(P.view);
      }
      sync();
    };
    const advanceBoard = k => { P.k = k; board.setLive(P.ended ? null : k); if (P.view == null) board.show(k); sync(); };

    let moves = 0;
    try {
      for (let i = 0; i < all.length; i++) {
        const st = all[i];
        this.athenaLine.step(this.code.value, st, i + 1, all.length);
        if (!acting(st)) { advanceBoard(i + 1); continue; }
        if (!P.playing && !P.once) { await new Promise(r => (P.wake = r)); }
        P.once = false;
        const pile = trial.piles[st.target];
        if (pile) this.focus = pile;
        this.mark(st.line); codeLine((lines[st.line - 1] || "").trim());
        this.status(`line ${st.line}: ${st.message}`);
        if (P.view == null) board.show(i + 1);           // the board shows the step as it starts, the 3D catches up
        if (!pile) { advanceBoard(i + 1); continue; }
        if (st.action === "PUSH") {
          await this.obtain(st.value);
          await this.goTo(pile);
          trial.pushed(pile, await hero.place(trial.slot(pile, st.index), 0)); sound.op("thump");
          this.moves(++moves);
        } else if (st.action === "POP") {
          await this.freeHands();
          await this.goTo(pile);
          const c = trial.top(pile);
          await hero.lift(c); sound.op("creak");
          trial.popped(pile);
          this.moves(++moves);
          // does the very next stack step push this same value? then he keeps it in his hands
          const nx = all.slice(i + 1).find(acting);
          if (!(nx && (nx.action === "PUSH" || nx.action === "OVERFLOW") && nx.value === st.value)) await this.stash(c, lines[st.line - 1]);
        } else if (st.action === "PEEK") {
          await this.freeHands();
          await this.goTo(pile);
          pile.gauge.flash("check", pile.crates.length - 1);
          const top = trial.top(pile), y0 = top ? top.position.y : 0;
          if (top) await hero.over(0.6, k => top.position.y = y0 + Math.sin(Math.PI * k) * 0.06);   // the top crate gives a little hop: "this one"
          codeLine(`peek(&${pile.name}) → ${st.value}`);
          await hero.wait(0.5);
        } else if (st.action === "OVERFLOW") {
          await this.obtain(st.value);
          this.ctx.skipper.land();                   // a skip stops here: the failure itself is always watched
          await this.goTo(pile);
          this.end(i + 1);
          await this.overflow(pile, res);
          return this.endFail(res, "STACK OVERFLOW", `${pile.name} is full (${pile.crates.length}/${pile.capacity}). push(${st.value}) has nowhere to go.`, { pile });
        } else if (st.action === "UNDERFLOW") {
          await this.freeHands();
          await this.goTo(pile);
          this.ctx.skipper.land();
          this.end(i + 1);
          pile.gauge.flash("empty", 0);
          await hero.reachFor(trial.slot(pile, 0));
          return this.endFail(res, "STACK UNDERFLOW", `${pile.name} is empty (top = -1). pop() has nothing to take.`, { fall: true, pile });
        }
        advanceBoard(i + 1);
      }
    this.athenaLine.clear();
      this.end(all.length);
      this.mark(0);
      await this.freeHands();
      this.ctx.skipper.land();                       // skip lands here: right before the ending
      if (res.outcome === "SUCCESS") return this.endSuccess(res);
      if (res.outcome === "GOAL_NOT_MET") return this.endGoalNotMet(res);
      if (res.outcome === "INFINITE_LOOP") return this.endLoop(res);
      return this.endFail(res, "SOMETHING WENT WRONG", res.message, { line: res.line });
    } finally { if (!this.ctx.skipping()) world.timeScale = 1; }
  }
  // the run is over: from here the board can be stepped freely (it only redraws; the harbour stays put)
  end(k) {
    const P = this.player; if (!P) return;
    P.ended = true; P.k = k; P.playing = false; P.view = null;
    if (!this.ctx.skipping()) this.ctx.world.timeScale = 1;
    this.board.setLive(null); this.board.show(k); this.board.setPlaying(false); this.board.setEnabled(k > 0, false);
  }

  async goTo(pile) {
    const { hero, trial } = this.ctx, p = trial.sideSpot(pile);
    await hero.walkTo(p.x, p.z);
    await hero.face(pile.x, pile.z);
  }
  // get a crate with this value into his hands: already held, waiting on the bench, or a new one from the cargo heap
  async obtain(v) {
    const { hero, bench, HEAP, trial } = this.ctx;
    if (hero.carrying && hero.carrying.userData.value === v) return hero.carrying;
    await this.freeHands();
    const b = bench.findValue(v);
    if (b >= 0) {
      const f = bench.front(b);
      await hero.walkTo(f.x, f.z);
      await hero.face(f.x, f.z - 1);
      const c = bench.take(b);
      await hero.lift(c);
      return c;
    }
    const c = trial.newCrate(v);
    c.position.copy(HEAP);
    await hero.walkTo(HEAP.x, HEAP.z + 0.78);
    await hero.lift(c);
    return c;
  }
  // set a held value down on the bench, in the bay named after its variable (int key = pop(&s) -> "key")
  async stash(c, line = "") {
    const { hero, bench } = this.ctx;
    const m = /int\s+([A-Za-z_]\w*)\s*=\s*pop/.exec(line) || /([A-Za-z_]\w*)\s*=\s*pop/.exec(line);
    const name = m ? m[1] : "_";
    if (name === "_") return this.overboard(c);   // a popped value nobody kept: it goes in the sea
    const i = bench.slotFor(name), f = bench.front(i);
    await hero.walkTo(f.x, f.z);
    await hero.place(bench.slot(i), 0);
    bench.put(i, c, `${name} = ${cargo(c.userData.value)}`);
    this.ctx.codeLine(`${name} = ${c.userData.value}` + (cargoNames.on && CARGO[c.userData.value] ? `  (${cargo(c.userData.value)})` : ""));
  }
  // pop() without keeping the value: he heaves the crate off the quay into the sea
  async overboard(c) {
    const { hero, world } = this.ctx;
    const x = hero.group.position.x + 0.9, z = -2.9;
    await hero.walkTo(x, z);
    await hero.face(x, z - 5);
    this.ctx.codeLine(`pop → ${cargo(c.userData.value)}  (not kept: overboard!)`);
    hero.carrying = null;
    const p0 = c.position.clone(), sea = new THREE.Vector3(x + (Math.random() - 0.5), -0.7, -6.2);
    hero.over(0.6, k => hero.grip.w = 1 - k).then(() => { hero.grip.crate = null; hero.grip.w = 0; hero.stand(0.3); });
    await hero.over(1.0, k => {
      c.position.lerpVectors(p0, sea, k);
      c.position.y = p0.y + (sea.y - p0.y) * k * k + Math.sin(Math.PI * k) * 1.1;
      c.rotation.x = -k * 4; c.rotation.z = k * 1.2;
    });
    c.parent && c.parent.remove(c);
  }
  async freeHands() { if (this.ctx.hero.carrying) await this.stash(this.ctx.hero.carrying, ""); }

  // he lifts the crate toward a slot that does not exist; it slips and tumbles into the sea
  async overflow(pile, res) {
    const { hero, trial, director, world } = this.ctx;
    pile.gauge.flash("full");
    const c = hero.carrying, from = c.position.clone(), up = trial.slot(pile, pile.capacity).add(new THREE.Vector3(0, 0.05, 0));
    hero.carrying = null;
    await hero.over(0.7, k => { const e = k * k * (3 - 2 * k); c.position.lerpVectors(from, up, e * 0.8); });
    hero.grip.crate = null; hero.grip.w = 0; hero.play("idle", 0.4);
    world.timeScale = this.ctx.skipping() ? world.timeScale : 0.4;
    const p0 = c.position.clone(), sea = new THREE.Vector3(pile.x - 0.6, -0.6, -4.8);
    await hero.over(1.4, k => { c.position.lerpVectors(p0, sea, k); c.position.y = p0.y + (sea.y - p0.y) * k * k + Math.sin(Math.PI * k) * 0.5; c.rotation.x = k * 2.6; c.rotation.z = k * 0.8; });
    if (!this.ctx.skipping()) world.timeScale = 1;
    c.parent && c.parent.remove(c);
  }

  // ---------- endings
  // the win: the panel slides away so nothing covers it, a low angle from the open side of the quay
  // (away from the Return Values bench), he climbs, and the card lands. Then the panel comes back.
  async endSuccess(res) {
    if (this.level && this.level !== LAB) this.voice.solved(this.level.id);
    if (this.level.tier === "FINALE") return this.endFinale(res);
    if (this.level === LAB) {                 // nothing to win in the Lab: say how the quay ended up
      this.status(res.message, "good");
      await this.ctx.director.stamp("DONE", "step back through it on the board", { kind: "good", seconds: 1.6 });
      return;
    }
    // practice: the hold is stocked. He checks the top crate, and the card lands.
    const { hero, trial, director } = this.ctx;
    const p = Object.values(trial.piles)[0], f = trial.sideSpot(p);
    await hero.walkTo(f.x, f.z); await hero.face(p.x, p.z);
    this.el.classList.remove("on"); this.board.close(); this.ctx.panelView(false);
    const topY = QUAY_TOP + p.crates.length * CRATE_H;
    director.glide([p.x - 2.2, topY + 0.3, p.z + 4.4], [p.x, topY - 0.6, p.z], 40, 1.2);
    const top = trial.top(p), y0 = top.position.y;
    await hero.over(0.8, k => top.position.y = y0 + Math.sin(Math.PI * k) * 0.1);
    markDone(this.level.id); this.renderTabs();
    this.status(res.message + " The finale is open.", "good");
    await director.stamp("THE SHIP IS LOADED", res.message, { kind: "good", seconds: 3.0 });
    this.el.classList.add("on"); this.board.open(); this.ctx.panelView(true);
  }
  // the finale's win: for now he climbs the tower with the axe on top (the full ending cinematic comes next)
  // the finale's win: he climbs the tower with the AXE on top, and the comic climax takes over
  async endFinale(res) {
    const { hero, trial, director } = this.ctx;
    const s = Object.values(trial.piles)[0];
    const front = new THREE.Vector3(s.x, QUAY_TOP, s.z + 0.62);
    await hero.walkTo(front.x, front.z);
    this.el.classList.remove("on"); this.board.close(); this.ctx.panelView(false);
    const topY = QUAY_TOP + s.crates.length * CRATE_H;
    director.glide([s.x - 2.4, 1.8, s.z + 4.6], [s.x, topY - 0.5, s.z], 46, 1.0);
    s.gauge.stow(true);                         // the crane hook swings up out of his way
    await hero.climb(s.crates.length * CRATE_H, new THREE.Vector3(s.x, 0, s.z - 0.15));
    markDone(this.level.id); this.renderTabs();
    this.status(res.message, "good");
    await this.ctx.climax();
    this.el.classList.add("on"); this.ctx.panelView(true);
  }
  async endGoalNotMet(res) {
    const { hero, trial, director } = this.ctx;
    const s = Object.values(trial.piles)[0];
    if (this.level.tier === "FINALE" && s.crates.length) {
      // he tries the tower anyway, and slips
      const front = new THREE.Vector3(s.x, QUAY_TOP, s.z + 0.62);
      await hero.walkTo(front.x, front.z);
      s.gauge.stow(true);
      await hero.climb(s.crates.length * CRATE_H, new THREE.Vector3(s.x, 0, s.z - 0.15));
      await hero.wait(0.3);
      await hero.fall("slip", { groundY: QUAY_TOP, back: 1.4 });
    } else {
      const f = trial.sideSpot(s); await hero.walkTo(f.x, f.z); await hero.face(s.x, s.z);
    }
    this.status(res.message + " Fix the code and guide him again.", "bad");
    await director.stamp("NOT YET", res.message, { kind: "bad", seconds: 3.0 });
  }
  async endCompile(res) {
    this.mark(res.line, true);
    this.status(`Line ${res.line}: ${res.message}`, "bad");
    await this.ctx.director.stamp("ATHENA'S WORDS DID NOT REACH HIM", `line ${res.line}: ${res.message}`, { kind: "bad" });
  }
  async endLoop(res) {
    const { hero } = this.ctx;
    this.mark(res.line, true);
    this.status(res.message, "bad");
    const p = hero.group.position.clone();
    this.ctx.director.stamp("THE SAME MOMENT, AGAIN AND AGAIN", res.message, { kind: "bad", seconds: 3.5 });
    for (let k = 0; k < 3; k++) { await hero.walkTo(p.x + 1.4, p.z); await hero.walkTo(p.x, p.z); }
  }
  async endFail(res, title, why, { fall = false, line = res.line, pile = null } = {}) {
    const { hero, director } = this.ctx;
    this.ctx.skipper.land();
    this.mark(line, true);
    this.ctx.codeLine(`printf: ${title.replace("STACK ", "").toLowerCase()}`);
    this.status(res.message + ". Fix the code and guide him again.", "bad");
    const lineText = line > 0 ? (this.lines[line - 1] || "").trim() : "";
    const focus = pile ? { x: pile.x, z: pile.z, y: QUAY_TOP + Math.max(0, pile.crates.length - 1) * CRATE_H } : null;
    await director.siren({ title, sub: why, lineNo: line, lineText, focus });
    if (fall) await hero.fall("slip");
  }

}

const LAB_CSS = `
#trial-panel .lab { display: none; border: 1px solid #5a4422; border-radius: 4px; padding: 8px 10px; background: #1a130c; }
#trial-panel .lab.on { display: block; }
#trial-panel .lab .labhead { font-size: 12.5px; color: #f2c230; letter-spacing: 1px; margin-bottom: 4px; }
#trial-panel .lab .labhead small { color: #9c8a6c; letter-spacing: 0; }
#trial-panel .lab .labrow { display: flex; gap: 4px; margin-top: 4px; }
#trial-panel .lab input, #trial-panel .lab select { background: #0d0a07; color: #f4ead2; border: 1px solid #6b5432; border-radius: 3px; padding: 4px 6px; font: 14px 'Courier Prime', monospace; min-height: 28px; box-sizing: border-box; }
#trial-panel .lab input.nm { width: 74px; } #trial-panel .lab input.vals { flex: 1; min-width: 0; }
#trial-panel .lab input.bad { border-color: #e0442a; }
#trial-panel .lab .labbtns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; align-items: center; }
#trial-panel .lab button { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font: 12.5px 'Courier Prime', monospace; padding: 3px 8px; min-height: 28px; cursor: pointer; }
#trial-panel .lab button:hover:not(:disabled) { border-color: #f2c230; } #trial-panel .lab button:disabled { opacity: 0.4; cursor: default; }
#trial-panel .lab .labmsg { font-size: 12.5px; margin-top: 5px; color: #9c8a6c; min-height: 16px; }
#trial-panel .lab .labmsg.bad { color: #ff7a5c; }
#trial-panel .tab.labtab { border-color: #3f7a52; color: #8fe3a0; }
body[data-chapter="harbour"] #trial-panel .tab { flex: 1 1 auto; padding: 0 8px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; letter-spacing: 0.4px; }
`;
