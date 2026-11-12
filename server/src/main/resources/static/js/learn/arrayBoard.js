import "./panelWidth.js";
// arrayBoard.js — the flat, textbook view of an array, docked under the 3D scene while a trial runs.
// Built the way the classic teaching visualisers do it (VisuAlgo, Python Tutor): every cell drawn as a
// box with its index and address under it, the variables used as indexes (i, j, lo, hi, mid...) drawn as
// arrows over the cells they point at, the cell being read glowing yellow, the cell being written
// flashing green with its old value struck through, junk past n shown as "?" until someone reads it,
// a bracket marking the n cells in use, every other variable in a watch row, one plain sentence saying
// what just happened, and a media bar to play, pause, and step forward or BACK through the run.
//
// It never runs code itself: it replays the timeline Java sent (READ, WRITE, JUNK, VAR, LENGTH, ...).
//   const board = new ArrayBoard({ onStep: k => ..., onPlay, onPause, onSpeed });
//   board.load({ name: "flock", initial: [...], cap: 10, steps, code });   // builds every frame up front
//   board.show(k)   // draw the state after k steps

const css = `
#array-board { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 29; display: none; background: rgba(12, 9, 6, 0.93);
  border: 1px solid #5a4422; border-radius: 6px; padding: 8px 14px 8px; color: #efe1c2; font-family: 'Courier Prime', monospace; box-shadow: 0 6px 30px rgba(0,0,0,0.6); }
body.side-panel #array-board { right: calc(var(--pw, 520px) + 12px); }
#array-board.on { display: block; }
#array-board .ab-head { display: flex; align-items: baseline; gap: 12px; min-height: 22px; }
#array-board .ab-title { font-family: Anton, Impact, sans-serif; color: #f2c230; letter-spacing: 1px; font-size: 17px; white-space: nowrap; }
#array-board .ab-say { font-size: 14px; color: #efe1c2; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#array-board .ab-say b { color: #f2c230; } #array-board .ab-say .w { color: #8fe3a0; } #array-board .ab-say .bad { color: #ff7a5c; }
#array-board .ab-stage { position: relative; height: 128px; margin-top: 2px; }
#array-board .ab-ptr { position: absolute; top: 0; transform: translateX(-50%); text-align: center; font-size: 13px; font-weight: 700; transition: left 0.25s ease, top 0.2s ease; white-space: nowrap; }
#array-board .ab-ptr .lab { display: inline-block; padding: 0 6px; border-radius: 3px; color: #120c06; }
#array-board .ab-ptr .arr { display: block; line-height: 9px; font-size: 13px; }
#array-board .ab-cells { position: absolute; left: 0; top: 40px; display: flex; gap: 4px; }
#array-board .ab-cell { box-sizing: border-box; position: relative; border: 2px solid #6b5432; background: #1d150d; border-radius: 4px; text-align: center; transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, opacity 0.2s; }
#array-board .ab-cell .v { font-family: Anton, Impact, sans-serif; font-size: 22px; line-height: 40px; color: #f4ead2; }
#array-board .ab-cell .old { position: absolute; top: -2px; right: 3px; font-size: 11px; color: #ff9a80; text-decoration: line-through; }
#array-board .ab-cell .ix { position: absolute; left: 0; right: 0; top: 44px; font-size: 12px; color: #c9a227; }
#array-board .ab-cell .ad { position: absolute; left: 0; right: 0; top: 58px; font-size: 9.5px; color: #7d6a4c; }
#array-board .ab-cell.out { opacity: 0.5; border-style: dashed; }
#array-board .ab-cell.out .v { color: #9c8a6c; }
#array-board .ab-cell.ghost { opacity: 0.35; border-style: dotted; border-color: #7e1a0f; }
#array-board .ab-cell.read { border-color: #f2c230; box-shadow: 0 0 14px rgba(242,194,48,0.7); background: #3a2c0c; }
#array-board .ab-cell.write { border-color: #8fe3a0; box-shadow: 0 0 14px rgba(143,227,160,0.7); background: #12301a; }
#array-board .ab-cell.junk { border-color: #e0442a; box-shadow: 0 0 14px rgba(224,68,42,0.8); background: #3a120c; opacity: 1; }
#array-board .ab-cell.oob { border-color: #e0442a; box-shadow: 0 0 18px rgba(224,68,42,0.9); background: #4a0f08; opacity: 1; }
#array-board .ab-n { position: absolute; top: 116px; height: 8px; border: 2px solid #c9a227; border-top: none; transition: width 0.25s; }
#array-board .ab-n span { position: absolute; left: 50%; top: 1px; transform: translateX(-50%); background: rgba(12,9,6,0.95); padding: 0 6px; font-size: 11px; color: #f2c230; white-space: nowrap; }
#array-board .ab-foot { display: flex; align-items: center; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
#array-board .ab-vars { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; min-height: 24px; }
#array-board .ab-var { border: 1px solid #5a4422; border-radius: 3px; padding: 1px 7px; font-size: 12.5px; background: #1d150d; transition: background 0.3s; }
#array-board .ab-var.changed { background: #3a2c0c; border-color: #f2c230; }
#array-board .ab-var b { color: #f2c230; }
#array-board .ab-ctrl { display: flex; align-items: center; gap: 4px; }
#array-board .ab-ctrl button { min-width: 34px; min-height: 30px; background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font-size: 14px; cursor: pointer; }
#array-board .ab-ctrl button:hover:not(:disabled) { border-color: #f2c230; }
#array-board .ab-ctrl button:disabled { opacity: 0.35; cursor: default; }
#array-board .ab-ctrl select { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; min-height: 30px; font-family: inherit; }
#array-board .ab-count { font-size: 12px; color: #9c8a6c; min-width: 92px; text-align: right; }
@media (max-width: 900px) { #array-board { display: none !important; } }
`;

// the colour of each pointer name: same name, same colour, every time (3D markers use the same list)
export const POINTER_COLORS = ["#f2c230", "#5fd1e8", "#f08fd0", "#8fe3a0", "#ff9a5c", "#b9a3ff"];
const ALWAYS_POINTERS = /^(i|j|k|l|r|lo|hi|low|high|left|right|mid|big|small|idx|p|q|from|to)$/;

export class ArrayBoard {
  constructor({ onStep, onPlay, onPause, onSpeed } = {}) {
    this.cb = { onStep, onPlay, onPause, onSpeed };
    if (!document.getElementById("array-board-css")) { const s = document.createElement("style"); s.id = "array-board-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("section");
    el.id = "array-board"; el.setAttribute("aria-label", "The array, step by step");
    el.innerHTML = `<div class="ab-head"><span class="ab-title"></span><span class="ab-say" role="status" aria-live="polite"></span></div>
      <div class="ab-stage"><div class="ab-cells"></div><div class="ab-n"><span></span></div></div>
      <div class="ab-foot"><div class="ab-vars"></div>
        <div class="ab-ctrl">
          <button class="first" title="Back to the start" aria-label="Back to the start">⏮</button>
          <button class="back" title="One step back (←)" aria-label="One step back">◀</button>
          <button class="play" title="Play / pause (P)" aria-label="Play or pause">⏸</button>
          <button class="fwd" title="One step forward (→)" aria-label="One step forward">▶</button>
          <button class="last" title="To the end" aria-label="To the end">⏭</button>
          <select class="speed" aria-label="Speed"><option value="0.25">0.25× (slowest)</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1× (normal)</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select>
          <span class="ab-count"></span>
        </div></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    this.$(".first").onclick = () => this.cb.onStep && this.cb.onStep("first");
    this.$(".back").onclick = () => this.cb.onStep && this.cb.onStep("back");
    this.$(".fwd").onclick = () => this.cb.onStep && this.cb.onStep("fwd");
    this.$(".last").onclick = () => this.cb.onStep && this.cb.onStep("last");
    this.$(".play").onclick = () => { if (this.playing) this.cb.onPause && this.cb.onPause(); else this.cb.onPlay && this.cb.onPlay(); };
    this.$(".speed").onchange = e => this.cb.onSpeed && this.cb.onSpeed(+e.target.value);
    addEventListener("keydown", e => {
      if (!this.el.classList.contains("on") || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); this.$(".back").click(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); this.$(".fwd").click(); }
      else if (e.key === "p" || e.key === "P") this.$(".play").click();
    });
    addEventListener("resize", () => this.frames && this.show(this.k));
  }

  // the 3D picture moves up to make room (the page listens for "resize" and re-centres its camera)
  open() { if (this.el.classList.contains("on")) return; this.el.classList.add("on"); document.body.classList.add("board-on"); document.body.style.setProperty("--board-h", this.el.offsetHeight + "px"); dispatchEvent(new Event("resize")); }
  close() { if (!this.el.classList.contains("on")) return; this.el.classList.remove("on"); document.body.classList.remove("board-on"); dispatchEvent(new Event("resize")); }
  setPlaying(on) { this.playing = on; this.$(".play").textContent = on ? "⏸" : "▶"; }
  setEnabled(back, fwd) { this.$(".first").disabled = this.$(".back").disabled = !back; this.$(".fwd").disabled = this.$(".last").disabled = !fwd; }

  // build every frame of the run up front, so stepping back is just drawing an earlier frame
  load({ name = "flock", initial = [], cap = 10, steps = [], code = "" }) {
    this.name = name; this.cap = cap; this.steps = steps;
    this.$(".ab-title").textContent = `${name}[ ${cap} ]`;
    // which variables are indexes: anything written inside [ ] in the code, plus the usual names
    const inBrackets = new Set([...code.matchAll(/\[\s*([A-Za-z_]\w*)/g)].map(m => m[1]));
    this.isPointer = v => v !== "n" && (inBrackets.has(v) || ALWAYS_POINTERS.test(v));
    this.colors = {};
    let st = { values: Array.from({ length: cap }, (_, i) => (i < initial.length ? initial[i] : null)), n: initial.length, vars: {}, hl: null, say: `${initial.length} sheep in pens 0 to ${initial.length - 1}. Press play or step through.`, changed: null };
    const frames = [st];
    for (const s of steps) {
      const nx = { values: st.values.slice(), n: st.n, vars: { ...st.vars }, hl: null, say: "", changed: null };
      const i = s.index;
      if (s.action === "READ") { nx.hl = { i, kind: "read" }; nx.say = `read <b>${name}[${i}]</b> → ${s.value}`; }
      else if (s.action === "JUNK") { nx.values[i] = s.value; nx.hl = { i, kind: "junk" }; nx.say = `<span class="bad">read ${name}[${i}], past n = ${st.n}: junk ${s.value}</span>`; }
      else if (s.action === "WRITE") { nx.hl = { i, kind: "write", old: st.values[i] }; nx.values[i] = s.value; nx.say = `<span class="w">write ${name}[${i}] ← ${s.value}</span>${st.values[i] != null ? ` (was ${st.values[i]})` : ""}`; }
      else if (s.action === "LENGTH") { nx.n = s.value; nx.say = `<b>n = ${s.value}</b>: ${s.value} pens in use`; }
      else if (s.action === "VAR") {
        // a variable changed: the last pen touched stays lit (like Python Tutor), the sentence says what moved
        nx.vars[s.target] = s.value; nx.changed = s.target; if (s.target === "n") nx.n = s.value;
        if (st.hl && st.hl.kind !== "oob") nx.hl = { i: st.hl.i, kind: st.hl.kind, dim: true };
        nx.say = `${s.target} = <b>${s.value}</b>` + (st.lastSay ? ` <span style="opacity:.55">· ${st.lastSay}</span>` : "");
      }
      else if (s.action === "OUT_OF_BOUNDS") { nx.hl = { i, kind: "oob" }; nx.say = `<span class="bad">${name}[${i}]: there is no such pen (0 to ${cap - 1})</span>`; }
      else if (s.action === "OVERFLOW") { nx.say = `<span class="bad">no free pen for ${s.value}</span>`; }
      else nx.say = s.message || s.action;
      nx.lastSay = s.action === "VAR" ? st.lastSay : nx.say;
      frames.push(nx); st = nx;
    }
    this.frames = frames;
    this.show(0);
  }

  pointerColor(v) { if (!this.colors[v]) this.colors[v] = POINTER_COLORS[Object.keys(this.colors).length % POINTER_COLORS.length]; return this.colors[v]; }

  show(k) {
    if (!this.frames) return;
    k = Math.max(0, Math.min(this.frames.length - 1, k)); this.k = k;
    const f = this.frames[k], cap = this.cap;
    const stage = this.$(".ab-stage"), cells = this.$(".ab-cells");
    const w = Math.max(38, Math.min(72, Math.floor((stage.clientWidth - 4 * (cap + 1)) / (cap + 1))));
    cells.innerHTML = "";
    for (let i = 0; i <= cap; i++) {
      const c = document.createElement("div");
      c.className = "ab-cell" + (i === cap ? " ghost" : i >= f.n ? " out" : "");
      c.style.width = w + "px"; c.style.height = "44px";
      const v = i === cap ? "☠" : f.values[i] == null ? "?" : String(f.values[i]);
      c.innerHTML = `<div class="v">${v}</div><div class="ix">[${i}]</div><div class="ad">${i === cap ? "no pen" : "0x" + (0x2a0 + i * 4).toString(16).toUpperCase()}</div>`;
      if (f.hl && f.hl.i === i) {
        c.classList.add(f.hl.kind); if (f.hl.dim) c.style.boxShadow = "none";
        if (f.hl.kind === "write" && f.hl.old != null && f.hl.old !== f.values[i]) { const o = document.createElement("div"); o.className = "old"; o.textContent = f.hl.old; c.appendChild(o); }
      }
      cells.appendChild(c);
    }
    // the bracket under the n cells in use
    const nb = this.$(".ab-n");
    nb.style.left = "0px"; nb.style.width = Math.max(0, f.n * (w + 4) - 4) + "px"; nb.style.display = f.n > 0 ? "block" : "none";
    nb.querySelector("span").textContent = `n = ${f.n} in use`;
    // pointer arrows: one per cell, carrying every index variable that points there (i and j side by side)
    stage.querySelectorAll(".ab-ptr").forEach(p => p.remove());
    const at = new Map();
    for (const [name, val] of Object.entries(f.vars)) {
      if (!this.isPointer(name) || val < -1 || val > cap) continue;
      const slot = Math.max(-1, val);
      if (!at.has(slot)) at.set(slot, []);
      at.get(slot).push(name);
    }
    for (const [slot, names] of at) {
      const p = document.createElement("div"); p.className = "ab-ptr";
      p.style.left = (slot < 0 ? -10 : slot * (w + 4) + w / 2) + "px";
      p.style.top = "6px";
      const col = this.pointerColor(names[0]);
      p.innerHTML = names.map(nm => `<span class="lab" style="background:${this.pointerColor(nm)}">${nm}${slot < 0 ? " = -1" : ""}</span>`).join(" ")
        + `<span class="arr" style="color:${col}">▼</span>`;
      stage.appendChild(p);
    }
    // every variable, in the order they appeared
    const vars = this.$(".ab-vars"); vars.innerHTML = "";
    for (const [name, val] of Object.entries(f.vars)) {
      const ch = document.createElement("span"); ch.className = "ab-var" + (f.changed === name ? " changed" : "");
      ch.innerHTML = `${name} = <b>${val}</b>`; vars.appendChild(ch);
    }
    this.$(".ab-say").innerHTML = f.say || "";
    this.$(".ab-count").textContent = `step ${k} / ${this.frames.length - 1}`;
  }
}
