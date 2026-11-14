import "./panelWidth.js";
// queueBoard.js — the flat, textbook view of a queue, docked under the 3D pit while a run plays.
// Drawn the way the course draws a circular queue: one row of array cells [0] [1] ... [SIZE-1], the
// value in each, FRONT over the cell where the line starts and REAR over the cell where it ends, and a
// dashed arrow from the last cell back to [0] (after the last place comes the first: the circle).
// Cells in the line are bright; a cell the line has left keeps its old value, greyed: dequeue does not
// rub anything out, it only moves front. Everyone who drank is listed, in order.
//
// It follows either
//   • the game's queue `line` (trials, Lab): ENQUEUE (index = the new rear), DEQUEUE (index = front),
//     PEEK, FULL, EMPTY; front and rear are worked out the same way Queue.java does (front 0, rear -1);
//   • or the player's own array (Athena's lesson): ARRAY (its size and starting cells), WRITE/READ on
//     it, and the variables front and rear (-1 = empty, the course's way).
// It never runs code: it replays the timeline Java sent. The 3D pit (pit.js) draws the same frames.

// who is who in the Underworld (any other number is just a soul)
export const SHADES = { 7: "Elpenor", 12: "Anticleia", 30: "Achilles", 41: "Ajax", 23: "Agamemnon", 5: "Patroclus", 99: "Tiresias", 66: "Heracles" };
export const shade = v => SHADES[v] || "a soul";

const css = `
#queue-board { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 29; display: none; background: rgba(8, 8, 9, 0.95);
  border: 1px solid #4a4a4e; border-radius: 6px; padding: 8px 14px 8px; color: #e8e6e3; font-family: 'Courier Prime', monospace; box-shadow: 0 6px 30px rgba(0,0,0,0.6); box-sizing: border-box; }
body.side-panel #queue-board { right: calc(var(--pw, 520px) + 12px); }
#queue-board.on { display: block; }
#queue-board .qb-head { display: flex; align-items: baseline; gap: 12px; min-height: 22px; }
#queue-board .qb-title { font-family: Anton, Impact, sans-serif; color: #f4f2ee; letter-spacing: 1px; font-size: 17px; white-space: nowrap; }
#queue-board .qb-say { font-size: 14px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#queue-board .qb-say b { color: #fff; } #queue-board .qb-say .w { color: #b9e3c4; } #queue-board .qb-say .bad { color: #ff5a48; } #queue-board .qb-say .red { color: #ff5a48; } #queue-board .qb-say .dim { opacity: 0.55; }
#queue-board .qb-call { display: none; font-size: 12.5px; font-weight: 700; background: #8a1a14; color: #fff; padding: 1px 8px; border-radius: 3px; white-space: nowrap; max-width: 40%; overflow: hidden; text-overflow: ellipsis; }
#queue-board .qb-call.on { display: inline-block; }
#queue-board .qb-main { display: flex; gap: 18px; align-items: flex-start; margin-top: 4px; }
#queue-board .qb-stage { position: relative; height: 118px; flex: 1; min-width: 0; overflow: hidden; }
#queue-board svg.qb-wrap { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
#queue-board .qb-cell { position: absolute; top: 30px; height: 46px; box-sizing: border-box; border: 2px solid #55555b; border-radius: 4px; background: #141416; text-align: center; transition: background 0.2s, border-color 0.2s, box-shadow 0.2s; }
#queue-board .qb-cell .v { font-family: Anton, Impact, sans-serif; font-size: 21px; line-height: 26px; color: #f4f2ee; }
#queue-board .qb-cell .nm { font-size: 10.5px; line-height: 13px; color: #b8b6b2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 2px; }
#queue-board .qb-cell.stale .v { color: #5c5c62; text-decoration: line-through; }
#queue-board .qb-cell.stale .nm { color: #5c5c62; }
#queue-board .qb-cell.blank .v { color: #3c3c40; }
#queue-board .qb-cell.in { border-color: #b9e3c4; box-shadow: 0 0 14px rgba(185,227,196,0.6); background: #16241a; }
#queue-board .qb-cell.out { border-color: #ff5a48; box-shadow: 0 0 14px rgba(255,90,72,0.7); background: #2a0e0c; }
#queue-board .qb-cell.read { border-color: #f4f2ee; box-shadow: 0 0 14px rgba(244,242,238,0.6); background: #2a2a2e; }
#queue-board .qb-cell.full { border-color: #ff5a48; background: #2a0e0c; }
#queue-board .qb-cell.dim { box-shadow: none; }
#queue-board .qb-idx { position: absolute; top: 79px; text-align: center; font-size: 12px; font-weight: 700; color: #9a989e; }
#queue-board .qb-tag { position: absolute; transform: translateX(-50%); font-size: 12px; font-weight: 700; white-space: nowrap; text-align: center; }
#queue-board .qb-tag .lab { display: inline-block; padding: 0 5px; border-radius: 3px; color: #0a0a0b; margin: 0 1px; }
#queue-board .qb-tag .lab.hot { box-shadow: 0 0 0 2px #fff; }
#queue-board .qb-tag .arr { display: block; line-height: 8px; font-size: 11px; }
#queue-board .qb-side { width: 210px; flex: none; font-size: 12.5px; line-height: 1.5; }
#queue-board .qb-side .k { color: #9a989e; letter-spacing: 1px; font-size: 11px; }
#queue-board .qb-side .line { color: #f4f2ee; font-weight: 700; word-break: break-word; }
#queue-board .qb-side .drank { color: #ff5a48; font-weight: 700; word-break: break-word; }
#queue-board .qb-foot { display: flex; align-items: center; gap: 10px; margin-top: 2px; flex-wrap: wrap; }
#queue-board .qb-vars { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; min-height: 24px; }
#queue-board .qb-var { border: 1px solid #4a4a4e; border-radius: 3px; padding: 1px 7px; font-size: 12.5px; background: #141416; }
#queue-board .qb-var.changed { background: #2a2a2e; border-color: #f4f2ee; }
#queue-board .qb-var b { color: #fff; }
#queue-board .qb-out { display: none; margin-top: 4px; font-size: 13px; background: #050505; border: 1px solid #333; border-radius: 3px; padding: 3px 8px; color: #b9e3c4; white-space: pre-wrap; max-height: 44px; overflow: auto; }
#queue-board .qb-out.on { display: block; }
#queue-board .qb-out b { color: #9a989e; font-weight: 400; }
#queue-board .qb-ctrl { display: flex; align-items: center; gap: 4px; }
#queue-board .qb-ctrl button { min-width: 34px; min-height: 30px; background: #1c1c1f; color: #e8e6e3; border: 1px solid #4a4a4e; border-radius: 3px; font-size: 14px; cursor: pointer; }
#queue-board .qb-ctrl button:hover:not(:disabled) { border-color: #f4f2ee; }
#queue-board .qb-ctrl button:disabled { opacity: 0.35; cursor: default; }
#queue-board .qb-ctrl select { background: #1c1c1f; color: #e8e6e3; border: 1px solid #4a4a4e; min-height: 30px; font-family: inherit; }
#queue-board .qb-count { font-size: 12px; color: #9a989e; min-width: 92px; text-align: right; }
@media (max-width: 900px) { #queue-board { display: none !important; } }
`;
export const FRONT_COLOR = "#f4f2ee", REAR_COLOR = "#ff5a48";

// ---------- the model, shared with the 3D pit: one frame = the state after a step
// shape: "ring" (a circular queue, or the game's own queue), "row" (the linear queue), "pq" (a priority queue)
export function queueFrame(capacity, initial = [], shape = "ring") {
  const cells = Array.from({ length: capacity }, (_, i) => (i < initial.length ? initial[i] : null));
  return { cap: capacity, cells, front: 0, rear: initial.length - 1, count: initial.length, mode: "line", shape,
           drank: [], vars: {}, calls: [], out: "", hl: null, changed: null, say: "" };
}
// which cells hold someone in line right now (front ... rear, round the circle)
export function liveCells(f) {
  const live = new Set();
  if (f.mode === "array" && f.shape === "pq") { for (let i = 0; i < Math.min(f.count, f.cap); i++) live.add(i); return live; }
  if (f.mode === "array" && f.shape === "row") { if (f.front >= 0) for (let i = f.front; i <= Math.min(f.rear, f.cap - 1); i++) live.add(i); return live; }
  if (f.mode === "array") {
    if (f.front < 0 || f.rear < 0 || f.front >= f.cap || f.rear >= f.cap) return live;
    for (let i = f.front, n = 0; n <= f.cap; i = (i + 1) % f.cap, n++) { live.add(i); if (i === f.rear) break; }
    return live;
  }
  for (let n = 0; n < f.count; n++) live.add((f.front + n) % f.cap);
  return live;
}
// the line in order, front to rear
export function lineOrder(f) {
  const out = [], live = liveCells(f);
  if (!live.size) return out;
  if (f.shape !== "ring") return [...live].sort((a, b) => a - b);
  for (let n = 0, i = f.front; n < f.cap && live.has(i); n++, i = (i + 1) % f.cap) out.push(i);
  return out;
}
export function countOf(f) { return f.mode === "array" ? liveCells(f).size : f.count; }
// functions that hand someone over the counter (their return value is who was served)
const SERVES = /^(dequeue|deleteFront|deleteRear|deleteMin|delete)$/;

function clone(f) {
  return { ...f, cells: f.cells.slice(), drank: f.drank.slice(), vars: { ...f.vars }, calls: f.calls.slice(), hl: null, changed: null, say: "" };
}
const nm = v => (SHADES[v] ? `${v} (${SHADES[v]})` : String(v));

export class QueueBoard {
  constructor({ onStep, onPlay, onPause, onSpeed } = {}) {
    this.cb = { onStep, onPlay, onPause, onSpeed };
    if (!document.getElementById("queue-board-css")) { const s = document.createElement("style"); s.id = "queue-board-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("section");
    el.id = "queue-board"; el.setAttribute("aria-label", "The queue, step by step");
    el.innerHTML = `<div class="qb-head"><span class="qb-title">THE QUEUE</span><span class="qb-call"></span><span class="qb-say" role="status" aria-live="polite"></span></div>
      <div class="qb-main"><div class="qb-stage"><svg class="qb-wrap"><defs><marker id="qb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8a888e"/></marker></defs></svg></div>
        <div class="qb-side"><div class="k">FRONT → REAR</div><div class="line"></div><div class="k" style="margin-top:4px">SERVED, IN ORDER</div><div class="drank"></div></div></div>
      <div class="qb-out" aria-live="polite"></div>
      <div class="qb-foot"><div class="qb-vars"></div>
        <div class="qb-ctrl">
          <button class="first" title="Back to the start" aria-label="Back to the start">⏮</button>
          <button class="back" title="One step back (←)" aria-label="One step back">◀</button>
          <button class="play" title="Play / pause (P)" aria-label="Play or pause">⏸</button>
          <button class="fwd" title="One step forward (→)" aria-label="One step forward">▶</button>
          <button class="last" title="To the end" aria-label="To the end">⏭</button>
          <select class="speed" aria-label="Speed"><option value="0.25">0.25× (slowest)</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1× (normal)</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select>
          <span class="qb-count"></span>
        </div></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    for (const b of ["first", "back", "fwd", "last"]) this.$("." + b).onclick = () => this.cb.onStep && this.cb.onStep(b);
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

  open() { if (this.el.classList.contains("on")) return; this.el.classList.add("on"); document.body.classList.add("board-on"); document.body.style.setProperty("--board-h", this.el.offsetHeight + "px"); dispatchEvent(new Event("resize")); }
  close() { if (!this.el.classList.contains("on")) return; this._h = 0; this.el.classList.remove("on"); document.body.classList.remove("board-on"); dispatchEvent(new Event("resize")); }
  setPlaying(on) { this.playing = on; this.$(".play").textContent = on ? "⏸" : "▶"; }
  setEnabled(back, fwd) { this.$(".first").disabled = this.$(".back").disabled = !back; this.$(".fwd").disabled = this.$(".last").disabled = !fwd; }

  // every frame of the run, built up front. start: the lesson's array as the program declares it
  load({ capacity = 5, initial = [], steps = [], shape = "ring" }) {
    let st = queueFrame(capacity, initial, shape);
    st.say = initial.length ? `${initial.length} soul${initial.length > 1 ? "s" : ""} waiting, ${capacity} seats. Press play or step through.` : `Nobody waiting: ${capacity} empty seats.`;
    const frames = [st];
    let arr = null;                                            // the player's own queue array, once declared
    steps.forEach((s, k) => {
      const nx = clone(st), i = s.index, next = steps[k + 1];
      if (s.action === "ARRAY" && /^(queue|deque|pq)$/.test(s.target)) {
        arr = s.target;
        const vals = (s.message.split(":")[1] || "").trim().split(/\s+/).filter(Boolean).map(Number);
        nx.mode = "array"; nx.cap = s.index; nx.cells = Array.from({ length: s.index }, (_, k) => (vals[k] ?? 0));
        nx.front = nx.vars.front ?? -1; nx.rear = nx.vars.rear ?? -1; nx.count = nx.vars.count ?? 0;
        nx.say = `<b>int ${arr}[${s.index}]</b>: ${s.index} seats`;
      } else if (s.action === "ENQUEUE") {
        nx.cells[i] = s.value; nx.rear = i; nx.count++;
        nx.hl = { i, kind: "in" }; nx.say = `<span class="w">enqueue: ${nm(s.value)} joins at the rear</span> · place [${i}], rear = <b>${i}</b>`;
      } else if (s.action === "DEQUEUE" && next && next.action === "ENQUEUE" && next.value === s.value && next.target === s.target) {
        nx.front = (i + 1) % nx.cap; nx.count--;                       // enqueue(&line, dequeue(&line)): round to the back, not served
        nx.hl = { i, kind: "out" }; nx.say = `dequeue: ${nm(s.value)} steps out of the front · front moves to <b>[${nx.front}]</b>, and he goes round to the back`;
      } else if (s.action === "DEQUEUE") {
        nx.drank.push(s.value); nx.front = (i + 1) % nx.cap; nx.count--;
        nx.hl = { i, kind: "out", value: s.value };
        nx.served = s.value; nx.say = `<span class="red">dequeue: NOW SERVING ${nm(s.value)}</span> · front moves to <b>[${nx.front}]</b>. Seat [${i}] still says ${s.value}, but nobody sits there now`;
      } else if (s.action === "PEEK") {
        nx.hl = { i, kind: "read" }; nx.say = `peek: <b>${nm(s.value)}</b> is at the front. He stays there`;
      } else if (s.action === "FULL" || s.action === "OVERFLOW") {
        nx.hl = { i: -1, kind: "full" }; nx.say = `<span class="bad">enqueue ${s.value}: every seat is taken (${nx.cap} of ${nx.cap}). The line is FULL</span>`;
      } else if (s.action === "EMPTY" || s.action === "UNDERFLOW") {
        nx.hl = { i: -1, kind: "empty" }; nx.say = `<span class="bad">nobody in line: the queue is EMPTY</span>`;
      } else if ((s.action === "WRITE" || s.action === "READ") && s.target === arr) {
        if (s.action === "WRITE") { nx.cells[i] = s.value; nx.hl = { i, kind: "in" }; nx.say = `<span class="w">${arr}[${i}] = ${s.value}</span>${SHADES[s.value] ? " · " + SHADES[s.value] : ""}`; }
        else { nx.hl = { i, kind: "read" }; nx.say = `read ${arr}[${i}]: <b>${s.value}</b>`; }
      } else if (s.action === "OUT_OF_BOUNDS") {
        nx.hl = { i: -1, kind: "full" }; nx.say = `<span class="bad">${s.message.replace(/pens/g, "seats").replace(/[Pp]en/g, "seat")}</span>`;
      } else if (s.action === "VAR") {
        nx.vars[s.target] = s.value; nx.changed = s.target;
        if (nx.mode === "array" && (s.target === "front" || s.target === "rear" || (s.target === "count" && nx.shape === "pq"))) nx[s.target] = s.value;
        nx.say = `${s.target} = <b>${s.value}</b>` + (st.lastSay ? ` <span class="dim">· ${st.lastSay}</span>` : "");
        if (st.hl) nx.hl = { ...st.hl, dim: true };
      } else if (s.action === "DROP") {
        delete nx.vars[s.target];
        nx.say = `<span class="dim">${s.target} is gone (its block or function ended)</span>`;
      } else if (s.action === "CALL") {
        nx.calls.push(s.target); nx.say = `<b>call</b> ${s.message}`;
      } else if (s.action === "RETURN") {
        nx.calls.pop(); nx.say = `<b>return</b> · ${s.message}`;
        if (SERVES.test(s.target) && nx.mode === "array" && /returns -?\d+/.test(s.message) && s.value !== -1) { nx.drank.push(s.value); nx.served = s.value; }
      } else if (s.action === "PRINT") {
        nx.out = (nx.out + s.message).slice(-600);
        nx.say = `printf · <span class="w">${s.message.replace(/</g, "&lt;").replace(/\n/g, "↵")}</span>`;
      } else nx.say = (s.message || s.action).replace(/[Pp]en (\d+)/g, "seat [$1]");
      nx.lastSay = (s.action === "VAR" || s.action === "DROP") ? st.lastSay : nx.say;
      frames.push(nx); st = nx;
    });
    this.frames = frames; this.k = 0;
    this.show(0);
  }

  show(k) {
    if (!this.frames) return;
    k = Math.max(0, Math.min(this.frames.length - 1, k)); this.k = k;
    const f = this.frames[k], stage = this.$(".qb-stage"), svg = this.$(".qb-wrap");
    stage.querySelectorAll(".qb-cell,.qb-idx,.qb-tag").forEach(e => e.remove());
    svg.querySelectorAll("path.w,text").forEach(e => e.remove());
    const live = liveCells(f), avail = Math.max(300, stage.clientWidth || 600);
    const W = Math.max(54, Math.min(84, Math.floor((avail - 30) / f.cap) - 10)), GAP = 10, x0 = 8;
    const X = i => x0 + i * (W + GAP);
    for (let i = 0; i < f.cap; i++) {
      const v = f.cells[i], d = document.createElement("div");
      let cls = "qb-cell";
      if (v == null) cls += " blank"; else if (!live.has(i)) cls += " stale";
      if (f.hl && f.hl.i === i) cls += " " + f.hl.kind + (f.hl.dim ? " dim" : "");
      if (f.hl && f.hl.kind === "full" && !f.hl.dim) cls += " full";
      d.className = cls; d.style.left = X(i) + "px"; d.style.width = W + "px";
      d.innerHTML = `<div class="v">${v == null ? "·" : v}</div><div class="nm">${v == null ? "empty" : live.has(i) ? shade(v) : "not in queue"}</div>`;
      stage.appendChild(d);
      const ix = document.createElement("div"); ix.className = "qb-idx"; ix.style.left = X(i) + "px"; ix.style.width = W + "px"; ix.textContent = `[${i}]`;
      stage.appendChild(ix);
    }
    // the circle: after the last place comes [0] (only a circular queue wraps)
    const yb = 98, xa = X(f.cap - 1) + W / 2, xb = X(0) + W / 2;
    if (f.shape === "ring") {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("class", "w"); p.setAttribute("d", `M${xa} ${yb} C ${xa} ${yb + 18}, ${xb} ${yb + 18}, ${xb} ${yb + 2}`);
    p.setAttribute("fill", "none"); p.setAttribute("stroke", "#8a888e"); p.setAttribute("stroke-dasharray", "4 4"); p.setAttribute("marker-end", "url(#qb-ah)");
    svg.appendChild(p);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", (xa + xb) / 2); t.setAttribute("y", yb + 18); t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "#8a888e"); t.setAttribute("font-size", "11");
    t.textContent = `after [${f.cap - 1}] comes [0]`; svg.appendChild(t);
    } else if (f.shape === "row") {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", X(f.cap - 1) + W); t.setAttribute("y", yb + 14); t.setAttribute("text-anchor", "end"); t.setAttribute("fill", "#8a888e"); t.setAttribute("font-size", "11");
      t.textContent = `a straight row: rear can only move right, up to [${f.cap - 1}]`; svg.appendChild(t);
    }
    // FRONT and REAR over their cells (both on one cell: side by side)
    const tags = new Map();
    const put = (i, name, color) => { if (i < 0 || i >= f.cap) return; if (!tags.has(i)) tags.set(i, []); tags.get(i).push([name, color]); };
    const empty = live.size === 0;
    if (!empty && f.shape !== "pq") { put(f.front, "front", FRONT_COLOR); put(f.rear, "rear", REAR_COLOR); }
    if (!empty && f.shape === "pq") put(0, "pq[0]", FRONT_COLOR);
    for (const [i, list] of tags) {
      const lab = document.createElement("div"); lab.className = "qb-tag"; lab.style.left = (X(i) + W / 2) + "px"; lab.style.top = "2px";
      lab.innerHTML = list.map(([n, c]) => `<span class="lab${f.changed === n ? " hot" : ""}" style="background:${c}">${n}</span>`).join("") + `<span class="arr" style="color:${list[0][1]}">▼</span>`;
      stage.appendChild(lab);
    }
    // the line in words, and who drank
    const order = lineOrder(f);
    this.$(".qb-side .line").textContent = order.length ? order.map(i => f.cells[i]).join("  ") + `   (${order.length} of ${f.cap})` : (f.mode === "array" ? "empty (front = -1)" : "empty");
    this.$(".qb-side .drank").textContent = f.drank.length ? f.drank.join(", ") : "nobody yet";
    // plain variables (front and rear first)
    const vars = this.$(".qb-vars"); vars.innerHTML = "";
    const shown = f.mode === "line" ? [["front", f.front], ["rear", f.rear], ["count", f.count]] : [];
    for (const [n, v] of [...shown, ...Object.entries(f.vars)]) {
      const c = document.createElement("span"); c.className = "qb-var" + (f.changed === n ? " changed" : "");
      c.innerHTML = `${n} = <b>${v}</b>`; vars.appendChild(c);
    }
    this.$(".qb-say").innerHTML = f.say || "";
    const call = this.$(".qb-call"); call.classList.toggle("on", f.calls.length > 0);
    call.textContent = f.calls.length ? "inside " + f.calls.map(c => c + "()").join(" › ") : "";
    const out = this.$(".qb-out"); out.classList.toggle("on", !!f.out);
    out.innerHTML = f.out ? "<b>console ▸ </b>" + f.out.replace(/&/g, "&amp;").replace(/</g, "&lt;") : ""; out.scrollTop = out.scrollHeight;
    if (this.el.classList.contains("on") && Math.abs((this._h || 0) - this.el.offsetHeight) > 2) {
      this._h = this.el.offsetHeight; document.body.style.setProperty("--board-h", this.el.offsetHeight + "px"); dispatchEvent(new Event("resize"));
    }
    this.$(".qb-count").textContent = `step ${k} / ${this.frames.length - 1}`;
  }
}
