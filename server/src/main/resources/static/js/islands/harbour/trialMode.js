// trialMode.js — the Harbour trials. The player writes C; Java runs it (POST /api/levels/{id}/play)
// and answers with an outcome and a list of steps. This file acts those steps out, one by one,
// with Odysseus, the piles, the gauges, the manifest and the variables bench, then plays the
// ending that fits the outcome. The browser never decides if the code is right: Java does.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { CRATE_H } from "./trialSet.js";
import { setPileObstacles } from "./harbourNav.js";
import { CARGO } from "./dsProps.js";
import { sound } from "../../engine/sound.js";

const STORE = "odyssey.harbour.done";
const done = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const markDone = id => { try { const d = done(); if (!d.includes(id)) { d.push(id); localStorage.setItem(STORE, JSON.stringify(d)); } } catch { /* storage off */ } };

const css = `
#trial-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 460px; z-index: 25; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;
  padding: 16px 18px; background: rgba(14, 10, 7, 0.95); border-left: 3px solid #2a1c12; color: #efe1c2; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace;
  transform: translateX(100%); transition: transform 0.5s cubic-bezier(.2,.8,.2,1); overflow-y: auto; }
#trial-panel.on { transform: none; }
#trial-panel .who { font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: 26px; letter-spacing: 2px; color: #f2c230; text-shadow: 2px 2px 0 #7e1a0f; }
#trial-panel .tabs { display: flex; gap: 6px; }
#trial-panel .tab { flex: 1; min-height: 42px; background: transparent; color: #b9a684; border: 1px solid #4a3a28; font: inherit; font-size: 13px; letter-spacing: 1px; cursor: pointer; }
#trial-panel .tab.on { border-color: #f2c230; color: #f2c230; background: rgba(242,194,48,0.08); }
#trial-panel h2 { margin: 2px 0 0; font-family: Anton, Impact, sans-serif; font-weight: 400; font-size: 24px; letter-spacing: 1px; }
#trial-panel .story { margin: 0; color: #b9a684; font-size: 14px; font-style: italic; }
#trial-panel .goal { margin: 0; font-size: 14px; line-height: 1.45; }
#trial-panel .goal b { color: #f2c230; letter-spacing: 2px; font-size: 12px; display: block; }
#trial-panel .meta { display: flex; justify-content: space-between; font-size: 13px; color: #b9a684; }
#trial-panel .meta .moves b { color: #f2c230; }
#trial-panel .hint { font-size: 13px; color: #d8c49a; border: 1px dashed #5a4630; padding: 6px 8px; }
#trial-panel .linkb { background: none; border: none; color: #f2c230; font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; padding: 0; text-align: left; }
#trial-panel .editor { position: relative; display: flex; height: 220px; border: 1px solid #2f2116; background: #0a0705; border-radius: 3px; overflow: hidden; flex: none; }
#trial-panel .gutter { width: 34px; padding: 10px 6px 10px 0; box-sizing: border-box; text-align: right; color: #5c4c3a; font-size: 13px; line-height: 20px; white-space: pre; overflow: hidden; user-select: none; }
#trial-panel .wrap { position: relative; flex: 1; overflow: hidden; }
#trial-panel .hl { position: absolute; left: 0; right: 0; height: 20px; background: rgba(242,194,48,0.16); border-left: 3px solid #f2c230; display: none; pointer-events: none; }
#trial-panel .hl.err { background: rgba(224,68,42,0.22); border-left-color: #e0442a; }
#trial-panel textarea { position: absolute; inset: 0; width: 100%; height: 100%; box-sizing: border-box; resize: none; border: none; outline: none; background: transparent;
  color: #efe1c2; font-family: inherit; font-size: 13px; line-height: 20px; padding: 10px; white-space: pre; overflow: auto; tab-size: 4; }
#trial-panel .run { min-height: 48px; background: #f2c230; color: #1d140c; border: none; font-family: Anton, Impact, sans-serif; font-size: 20px; letter-spacing: 3px; cursor: pointer; }
#trial-panel .run:disabled { opacity: 0.5; cursor: wait; }
#trial-panel .row { display: flex; gap: 8px; }
#trial-panel .row button { flex: 1; min-height: 40px; background: transparent; color: #efe1c2; border: 1px solid #4a3a28; font: inherit; font-size: 13px; cursor: pointer; }
#trial-panel .status { min-height: 40px; font-size: 14px; line-height: 1.45; }
#trial-panel .status.bad { color: #f0a08c; } #trial-panel .status.good { color: #f2c230; }
#trial-panel .words { font-size: 12px; color: #8c7c66; line-height: 1.6; border-top: 1px solid #3a2a1c; padding-top: 8px; }
#trial-panel .words code { color: #efe1c2; }
@media (max-width: 900px) { #trial-panel { width: 100%; top: auto; height: 60%; border-left: none; border-top: 3px solid #2a1c12; } }
`;
const TIER = { PRACTICE: "PRACTICE", FINALE: "FINALE" };
const cargo = v => CARGO[v] || String(v);

export class TrialMode {
  // ctx: { world, hero, trial, nav, director, bench, HEAP, codeLine(text), skipping(), skipper: { begin(), end() }, onLesson() }
  constructor(ctx) {
    this.ctx = ctx; this.levels = []; this.level = null; this.busy = false;
    if (!document.getElementById("trial-css")) { const s = document.createElement("style"); s.id = "trial-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("aside");
    el.id = "trial-panel"; el.setAttribute("aria-label", "Athena: the trials");
    el.innerHTML = `<div class="who">ATHENA · THE TRIALS</div><div class="tabs"></div><h2></h2><p class="story"></p><p class="goal"></p>
      <div class="meta"><span class="moves"></span><span class="hintArea"></span></div>
      <div class="editor"><div class="gutter">1</div><div class="wrap"><div class="hl"></div><label class="sr" style="position:absolute;left:-9999px" for="tcode">Your C code</label><textarea id="tcode" spellcheck="false" autocomplete="off"></textarea></div></div>
      <button class="run">GUIDE HIM</button>
      <div class="row"><button class="reset">Reset trial</button><button class="lessonb">Athena's lesson</button></div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="words">Words Athena understands: <code>push(&amp;s, x);</code> <code>pop(&amp;s)</code> <code>peek(&amp;s)</code> <code>isEmpty(&amp;s)</code> <code>isFull(&amp;s)</code> <code>size(&amp;s)</code> <code>int x = ...;</code> <code>if</code> <code>while</code> <code>for</code></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    this.code = this.$("textarea"); this.gutter = this.$(".gutter"); this.hl = this.$(".hl");
    this.code.addEventListener("input", () => this.updateGutter());
    this.code.addEventListener("scroll", () => { this.gutter.scrollTop = this.code.scrollTop; this.hl.style.display = "none"; });
    this.code.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); const s = this.code.selectionStart; this.code.setRangeText("    ", s, this.code.selectionEnd, "end"); this.updateGutter(); } });
    this.$(".run").onclick = () => this.run();
    this.$(".reset").onclick = () => { if (!this.busy && this.level) this.select(this.level); };
    this.$(".lessonb").onclick = () => { if (!this.busy && ctx.onLesson) ctx.onLesson(); };
  }

  async open() {
    this.el.classList.add("on");
    if (!this.levels.length) {
      try {
        const r = await fetch("/api/levels?island=harbour");
        this.levels = await r.json();
      } catch (e) { this.status("Can't reach the server. Is Spring Boot running?", "bad"); return; }
    }
    const d = done();
    this.select(this.levels.find(l => !d.includes(l.id)) || this.levels[0]);
  }
  close() { this.el.classList.remove("on"); }
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
    this.levels.forEach(l => {
      const b = document.createElement("button");
      b.className = "tab" + (l === this.level ? " on" : "");
      const locked = this.locked(l);
      b.textContent = (locked ? "🔒 " : "") + TIER[l.tier] + " · " + l.title + (d.includes(l.id) ? " ✓" : "");
      b.setAttribute("aria-pressed", l === this.level);
      b.onclick = () => { if (this.busy) return; if (locked) { this.status("Finish the practice first: the crew won't row out with an empty hold.", "bad"); return; } this.select(l); };
      tabs.appendChild(b);
    });
  }

  // set the harbour up exactly as the level starts
  select(l, keepCode = false) {
    const { trial, nav, hero, bench, director } = this.ctx;
    this.level = l;
    this.$("h2").textContent = l.title;
    this.$(".story").textContent = l.story;
    this.$(".goal").innerHTML = "<b>THE TRIAL</b>"; this.$(".goal").append(l.goal);
    const ha = this.$(".hintArea"); ha.innerHTML = "";
    if (l.hint) { const b = document.createElement("button"); b.className = "linkb"; b.textContent = "ask for a hint"; b.onclick = () => this.status(l.hint); ha.appendChild(b); }
    if (!keepCode) this.code.value = l.starterCode;
    this.updateGutter(); this.mark(0);
    this.moves(0); this.status("");
    trial.clearAll();                      // every crate from before leaves the quay
    trial.rebuild(l.structures); setPileObstacles(nav, trial);
    bench.clear();
    const first = Object.values(trial.piles)[0];
    hero.teleport(first.x + 1.6, first.z + 2.2, Math.PI * 0.85);
    director.cut(...this.wideShot());
    this.renderTabs();
  }
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
      const r = await fetch(`/api/levels/${this.level.id}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!r.ok) throw new Error("server answered " + r.status);
      res = await r.json();
    } catch (e) { this.status("Can't reach the server (" + e.message + ").", "bad"); this.busy = false; this.$(".run").disabled = false; return; }
    this.ctx.skipper.begin();
    const finale = this.level.tier === "FINALE";
    if (finale) sound.drums(true, { bpm: 88 });         // the finale is played against the giants' war drums
    try { await this.play(res, code.split("\n")); }
    finally { sound.drums(false); this.ctx.skipper.end(); this.busy = false; this.$(".run").disabled = false; this.ctx.codeLine(""); }
  }

  // ---------- acting out Java's steps
  async play(res, lines) {
    this.lines = lines;
    const { trial, hero, director, bench, HEAP, codeLine } = this.ctx;
    const steps = res.steps || [];
    let moves = 0;
    if (res.outcome === "COMPILE_ERROR") return this.endCompile(res);
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i], pile = trial.piles[st.target];
      this.mark(st.line); codeLine((lines[st.line - 1] || "").trim());
      this.status(`line ${st.line}: ${st.message}`);
      if (!pile) continue;
      if (st.action === "PUSH") {
        const c = await this.obtain(st.value);
        await this.goTo(pile);
        trial.pushed(pile, await hero.place(trial.slot(pile, st.index), 0));
        this.moves(++moves);
      } else if (st.action === "POP") {
        await this.freeHands();
        await this.goTo(pile);
        const c = trial.top(pile);
        await hero.lift(c);
        trial.popped(pile);
        this.moves(++moves);
        // does the very next step push this same value? then he keeps it in his hands
        const nx = steps[i + 1];
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
        await this.overflow(pile, res);
        return this.endFail(res, "STACK OVERFLOW", `${pile.name} is full (${pile.crates.length}/${pile.capacity}). push(${st.value}) has nowhere to go.`, { pile });
      } else if (st.action === "UNDERFLOW") {
        await this.freeHands();
        await this.goTo(pile);
        this.ctx.skipper.land();
        pile.gauge.flash("empty", 0);
        await hero.reachFor(trial.slot(pile, 0));
        return this.endFail(res, "STACK UNDERFLOW", `${pile.name} is empty (top = -1). pop() has nothing to take.`, { fall: true, pile });
      }
    }
    this.mark(0);
    await this.freeHands();
    this.ctx.skipper.land();                       // skip lands here: right before the ending
    if (res.outcome === "SUCCESS") return this.endSuccess(res);
    if (res.outcome === "GOAL_NOT_MET") return this.endGoalNotMet(res);
    if (res.outcome === "INFINITE_LOOP") return this.endLoop(res);
    return this.endFail(res, "SOMETHING WENT WRONG", res.message, { line: res.line });
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
    this.ctx.codeLine(`${name} = ${c.userData.value}` + (CARGO[c.userData.value] ? `  (${cargo(c.userData.value)})` : ""));
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
    if (this.level.tier === "FINALE") return this.endFinale(res);
    // practice: the hold is stocked. He checks the top crate, and the card lands.
    const { hero, trial, director } = this.ctx;
    const p = Object.values(trial.piles)[0], f = trial.sideSpot(p);
    await hero.walkTo(f.x, f.z); await hero.face(p.x, p.z);
    this.el.classList.remove("on"); this.ctx.panelView(false);
    const topY = QUAY_TOP + p.crates.length * CRATE_H;
    director.glide([p.x - 2.2, topY + 0.3, p.z + 4.4], [p.x, topY - 0.6, p.z], 40, 1.2);
    const top = trial.top(p), y0 = top.position.y;
    await hero.over(0.8, k => top.position.y = y0 + Math.sin(Math.PI * k) * 0.1);
    markDone(this.level.id); this.renderTabs();
    this.status(res.message + " The finale is open.", "good");
    await director.stamp("THE SHIP IS LOADED", res.message, { kind: "good", seconds: 3.0 });
    this.el.classList.add("on"); this.ctx.panelView(true);
  }
  // the finale's win: for now he climbs the tower with the axe on top (the full ending cinematic comes next)
  // the finale's win: he climbs the tower with the AXE on top, and the comic climax takes over
  async endFinale(res) {
    const { hero, trial, director } = this.ctx;
    const s = Object.values(trial.piles)[0];
    const front = new THREE.Vector3(s.x, QUAY_TOP, s.z + 0.62);
    await hero.walkTo(front.x, front.z);
    this.el.classList.remove("on"); this.ctx.panelView(false);
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
