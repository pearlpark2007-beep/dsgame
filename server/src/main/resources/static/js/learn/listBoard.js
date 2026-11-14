import "./panelWidth.js";
// listBoard.js — the flat, textbook view of a linked list, docked under the 3D sty while a trial runs.
// Drawn the way every data-structures book draws it (and Python Tutor, for C): each node a box split
// in two, [ data | next ], with its address under it and an arrow from its next to the node it points
// at, ending in NULL. Pointer variables (head, p, prev, cur...) are coloured labels with an arrow down
// onto their node. Nodes nothing can reach any more sit in a row of their own, marked LOST. The node
// read glows yellow, the one written green, the arrow just re-tied orange, a new node green, and
// following NULL flashes red. One plain sentence says what happened; a media bar steps through it.
//
// It never runs code itself: it replays the timeline Java sent (PTR, NEW, READ, WRITE, LINK, FREE,
// NULL_DEREF, VAR). The 3D sty draws the same frames (see sty.js): frames[k].nodes / .ptrs.
//   const board = new ListBoard();
//   board.load({ name: "sty", initial: [7, 12, 3], headVar: "head", steps });
//   board.show(k)

export const NULL = 0;
export const FIRST_ADDRESS = 0x1A0;
export const hex = a => (a === NULL ? "NULL" : "0x" + a.toString(16).toUpperCase());
// the colour of each pointer: head always gold, the rest in the order they appear
export const PTR_COLORS = ["#5fd1e8", "#f08fd0", "#8fe3a0", "#ff9a5c", "#b9a3ff", "#e8e05f"];
export const HEAD_COLOR = "#f2c230";

const css = `
#list-board { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 29; display: none; background: rgba(10, 8, 12, 0.94);
  border: 1px solid #5a4422; border-radius: 6px; padding: 8px 14px 8px; color: #efe1c2; font-family: 'Courier Prime', monospace; box-shadow: 0 6px 30px rgba(0,0,0,0.6); box-sizing: border-box; }
body.side-panel #list-board { right: calc(var(--pw, 520px) + 12px); }
#list-board.on { display: block; }
#list-board .lb-head { display: flex; align-items: baseline; gap: 12px; min-height: 22px; }
#list-board .lb-key { position: absolute; left: 0; bottom: 100%; margin-bottom: 6px; background: rgba(18,12,6,.92); border: 1px solid #3a2c18; border-radius: 4px; padding: 4px 8px; font: 700 10px 'Courier Prime', monospace; color: #8a7a5a; letter-spacing: .5px; white-space: nowrap; }
#list-board .lb-key i { font-style: normal; padding: 0 5px; border-radius: 4px; color: #1a1006; }
#list-board .lb-key .ka { background: #ffd21a; }
#list-board .lb-key .kn { background: #fff8ea; }
#list-board .lb-key b { color: #e8dcc0; }
#list-board .lb-title { font-family: Anton, Impact, sans-serif; color: #f2c230; letter-spacing: 1px; font-size: 17px; white-space: nowrap; }
#list-board .lb-say { font-size: 14px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#list-board .lb-say b { color: #f2c230; } #list-board .lb-say .w { color: #8fe3a0; } #list-board .lb-say .bad { color: #ff7a5c; } #list-board .lb-say .dim { opacity: 0.55; }
#list-board .lb-stage { position: relative; height: 104px; margin-top: 2px; overflow: hidden; }
#list-board .lb-stage.two { height: 184px; }
#list-board svg.lb-arrows { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
#list-board .lb-node { position: absolute; display: flex; box-sizing: border-box; height: 38px; border: 2px solid #6b5432; border-radius: 4px; background: #1d150d; transition: left 0.25s, top 0.25s, background 0.2s, border-color 0.2s, box-shadow 0.2s; }
#list-board .lb-node .d { width: 40px; text-align: center; font-family: Anton, Impact, sans-serif; font-size: 20px; line-height: 34px; color: #f4ead2; border-right: 2px solid #6b5432; }
#list-board .lb-node .n { width: 56px; text-align: center; font-size: 12.5px; font-weight: 700; line-height: 34px; color: #8fb4ff; }
#list-board .lb-node .n.nul { color: #ff7a5c; }
#list-board .lb-stage.compact .lb-node .d { width: 32px; font-size: 17px; }
#list-board .lb-stage.compact .lb-node .n { width: 46px; font-size: 11px; }
#list-board .lb-node .ad { position: absolute; left: 0; right: 0; top: 38px; text-align: center; font-size: 11px; font-weight: 700; color: #c9a227; }
#list-board .lb-node.read { border-color: #f2c230; box-shadow: 0 0 14px rgba(242,194,48,0.7); background: #3a2c0c; }
#list-board .lb-node.write, #list-board .lb-node.new { border-color: #8fe3a0; box-shadow: 0 0 14px rgba(143,227,160,0.7); background: #12301a; }
#list-board .lb-node.link { border-color: #ff9a5c; box-shadow: 0 0 14px rgba(255,154,92,0.7); }
#list-board .lb-node.lost { border-style: dashed; border-color: #e0442a; opacity: 0.75; }
#list-board .lb-node.dim { box-shadow: none; }
#list-board .lb-null { position: absolute; height: 38px; line-height: 38px; font-size: 13px; font-weight: 700; color: #9c8a6c; letter-spacing: 1px; }
#list-board .lb-null.bad { color: #ff7a5c; text-shadow: 0 0 10px rgba(224,68,42,0.9); }
#list-board .lb-loop { position: absolute; height: 38px; line-height: 38px; font-size: 13px; color: #ff9a5c; white-space: nowrap; }
#list-board .lb-row { position: absolute; left: 0; font-size: 10.5px; color: #e0644a; letter-spacing: 1px; }
#list-board .lb-ptr { position: absolute; transform: translateX(-50%); text-align: center; font-size: 12.5px; font-weight: 700; white-space: nowrap; transition: left 0.25s, top 0.25s; }
#list-board .lb-ptr .lab { display: inline-block; padding: 0 5px; border-radius: 3px; color: #120c06; margin: 0 1px; }
#list-board .lb-ptr .lab.hot { box-shadow: 0 0 0 2px #fff; }
#list-board .lb-ptr .arr { display: block; line-height: 8px; font-size: 12px; }
#list-board .lb-foot { display: flex; align-items: center; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
#list-board .lb-vars { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; min-height: 24px; }
#list-board .lb-var { border: 1px solid #5a4422; border-radius: 3px; padding: 1px 7px; font-size: 12.5px; background: #1d150d; }
#list-board .lb-var.changed { background: #3a2c0c; border-color: #f2c230; }
#list-board .lb-var b { color: #f2c230; }
#list-board .lb-ctrl { display: flex; align-items: center; gap: 4px; }
#list-board .lb-ctrl button { min-width: 34px; min-height: 30px; background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font-size: 14px; cursor: pointer; }
#list-board .lb-ctrl button:hover:not(:disabled) { border-color: #f2c230; }
#list-board .lb-ctrl button:disabled { opacity: 0.35; cursor: default; }
#list-board .lb-ctrl select { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; min-height: 30px; font-family: inherit; }
#list-board .lb-count { font-size: 12px; color: #9c8a6c; min-width: 92px; text-align: right; }
#list-board .lb-call { display: none; font-size: 12.5px; font-weight: 700; background: #1d3fd1; color: #fff4cf; padding: 1px 8px; border-radius: 3px; white-space: nowrap; max-width: 46%; overflow: hidden; text-overflow: ellipsis; }
#list-board .lb-call.on { display: inline-block; }
#list-board .lb-out { display: none; margin-top: 4px; font-size: 13px; background: #050403; border: 1px solid #3a2c18; border-radius: 3px; padding: 3px 8px; color: #8fe3a0; white-space: pre-wrap; max-height: 44px; overflow: auto; }
#list-board .lb-out.on { display: block; }
#list-board .lb-out b { color: #9c8a6c; font-weight: 400; }
@media (max-width: 900px) { #list-board { display: none !important; } }
`;

// ---------- the memory model, shared with the 3D sty: one frame = the state after a step
export function initialFrame(values, headVar = "head") {
  const nodes = {}, order = [];
  values.forEach((v, i) => { const a = FIRST_ADDRESS + i * 16; nodes[a] = { data: v, next: i + 1 < values.length ? a + 16 : NULL, freed: false }; order.push(a); });
  return { nodes, order, ptrs: { [headVar]: values.length ? FIRST_ADDRESS : NULL }, vars: {}, calls: [], out: "", hl: null, changed: null, say: "" };
}
// walk from an address to NULL: the addresses met, and where it looped back (if it did)
export function walkFrom(f, start) {
  const seen = [], set = new Set(); let at = start, loopTo = null;
  while (at !== NULL && f.nodes[at] && !f.nodes[at].freed) {
    if (set.has(at)) { loopTo = at; break; }
    set.add(at); seen.push(at); at = f.nodes[at].next;
  }
  return { seen, loopTo };
}
// nodes no pointer variable can reach (by any walk): truly lost
export function lostNodes(f) {
  const reach = new Set();
  for (const a of Object.values(f.ptrs)) walkFrom(f, a).seen.forEach(x => reach.add(x));
  return f.order.filter(a => !f.nodes[a].freed && !reach.has(a) && a !== f.fresh);   // (a node just made has no pointer YET)
}
// where every node goes, in columns and rows: the board and the 3D sty both draw from this, so they
// always match. Row 0: the rope from head, in order (arrows only ever point right: nothing crosses).
// Row 1: nodes off that rope, starting from where other pointers point (prev, cur, m...), each
// little chain left to right.
export function layoutFrame(f, headVar = "head") {
  const at = {};
  const chain = walkFrom(f, f.ptrs[headVar] ?? NULL);
  chain.seen.forEach((a, i) => (at[a] = { c: i, r: 0 }));
  const live = a => a !== NULL && f.nodes[a] && !f.nodes[a].freed;
  const others = f.order.filter(a => live(a) && !(a in at));
  // row 1: whole chains, starting from nodes nothing else off the rope points at (pointer order first)
  const pointedAt = new Set(others.map(a => f.nodes[a].next).filter(n => others.includes(n)));
  const byPtr = Object.entries(f.ptrs).filter(([nm]) => nm !== headVar).map(([, a]) => a);
  const roots = others.filter(a => !pointedAt.has(a));
  const starts = [...byPtr.filter(a => roots.includes(a)), ...roots, ...byPtr.filter(a => others.includes(a)), ...others];
  const used = new Set();                         // columns taken on row 1
  const free = (c0, n) => { for (let c = c0; ; c++) { let ok = true; for (let k = 0; k < n; k++) if (used.has(c + k)) { ok = false; break; } if (ok) return c; } };
  for (const a of starts) {
    if (a in at) continue;
    const run = []; let p = a;
    while (live(p) && !(p in at) && !run.includes(p)) { run.push(p); p = f.nodes[p].next; }
    const end = live(p) && (p in at) ? at[p] : null;
    if (end) {
      // this chain runs INTO a node already placed: stand it right to left, its last pig under
      // (or beside) the one it points at. A rope being reversed keeps every pig in its column.
      const c0 = free(end.r === 0 ? end.c : end.c + 1, run.length);
      run.forEach((x, i) => { const c = c0 + (run.length - 1 - i); at[x] = { c, r: 1 }; used.add(c); });
    } else {
      const c0 = free(0, run.length);
      run.forEach((x, i) => { at[x] = { c: c0 + i, r: 1 }; used.add(c0 + i); });
    }
  }
  return { at, chain, others };
}

function clone(f) {
  const nodes = {}; for (const [a, n] of Object.entries(f.nodes)) nodes[a] = { ...n };
  return { nodes, order: f.order.slice(), ptrs: { ...f.ptrs }, vars: { ...f.vars }, calls: f.calls.slice(), out: f.out, hl: null, changed: null, say: "" };
}

export class ListBoard {
  constructor({ onStep, onPlay, onPause, onSpeed } = {}) {
    this.cb = { onStep, onPlay, onPause, onSpeed };
    if (!document.getElementById("list-board-css")) { const s = document.createElement("style"); s.id = "list-board-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("section");
    el.id = "list-board"; el.setAttribute("aria-label", "The linked list, step by step");
    el.innerHTML = `<div class="lb-head"><span class="lb-title">THE ROPE</span><span class="lb-call"></span><span class="lb-say" role="status" aria-live="polite"></span><span class="lb-key">ON THE PIGS · <i class="ka">yellow tag</i> address · <i class="kn">white tag</i> next · <b>number on its back</b> data</span></div>
      <div class="lb-stage"><svg class="lb-arrows"><defs><marker id="lb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c9b48a"/></marker>
        <marker id="lb-ah-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ff9a5c"/></marker></defs></svg></div>
      <div class="lb-out" aria-live="polite"></div>
      <div class="lb-foot"><div class="lb-vars"></div>
        <div class="lb-ctrl">
          <button class="first" title="Back to the start" aria-label="Back to the start">⏮</button>
          <button class="back" title="One step back (←)" aria-label="One step back">◀</button>
          <button class="play" title="Play / pause (P)" aria-label="Play or pause">⏸</button>
          <button class="fwd" title="One step forward (→)" aria-label="One step forward">▶</button>
          <button class="last" title="To the end" aria-label="To the end">⏭</button>
          <select class="speed" aria-label="Speed"><option value="0.25">0.25× (slowest)</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1× (normal)</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select>
          <span class="lb-count"></span>
        </div></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    for (const b of ["first", "back", "fwd", "last"]) this.$("." + b).onclick = () => this.cb.onStep && this.cb.onStep(b);
    this.$(".play").onclick = () => { if (this.playing) this.cb.onPause && this.cb.onPause(); else this.cb.onPlay && this.cb.onPlay(); };
    this.$(".speed").onchange = e => this.cb.onSpeed && this.cb.onSpeed(+e.target.value);
    addEventListener("keydown", e => {
      if (!this.el.classList.contains("on") || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); this.$(".back").click(); }
      else if (e.key === "ArrowRight" || (e.key === " " && e.target.tagName !== "BUTTON")) { e.preventDefault(); this.$(".fwd").click(); }
      else if (e.key === "p" || e.key === "P") this.$(".play").click();
    });
    addEventListener("resize", () => this.frames && this.show(this.k));
  }

  open() { if (this.el.classList.contains("on")) return; this.el.classList.add("on"); document.body.classList.add("board-on"); document.body.style.setProperty("--board-h", this.el.offsetHeight + "px"); dispatchEvent(new Event("resize")); }
  close() { if (!this.el.classList.contains("on")) return; this._h = 0; this.el.classList.remove("on"); document.body.classList.remove("board-on"); dispatchEvent(new Event("resize")); }
  setPlaying(on) { this.playing = on; this.$(".play").textContent = on ? "⏸" : "▶"; }
  setEnabled(back, fwd) { this.$(".first").disabled = this.$(".back").disabled = !back; this.$(".fwd").disabled = this.$(".last").disabled = !fwd; }

  // a pointer's colour: head gold, others by first appearance
  color(name) {
    if (name === this.headVar) return HEAD_COLOR;
    if (!this.colors[name]) this.colors[name] = PTR_COLORS[Object.keys(this.colors).length % PTR_COLORS.length];
    return this.colors[name];
  }

  // every frame of the run, built up front
  load({ initial = [], headVar = "head", steps = [] }) {
    this.headVar = headVar; this.colors = {};
    let st = initialFrame(initial, headVar);
    st.say = initial.length ? `${initial.length} pigs on the rope. ${headVar} holds ${hex(FIRST_ADDRESS)}, the first. Press play or step through.` : `The rope is empty: ${headVar} = NULL.`;
    const frames = [st];
    const name = a => (st.nodes[a] ? `[${st.nodes[a].data}]` : hex(a));
    // a function's parameters and locals HIDE the caller's variables of the same name (head inside
    // deleteFirst() is not the head outside). On CALL the caller's names are saved; when a local is
    // dropped the caller's value comes back. A pointer a function returns is held as "f() →" until stored.
    const saved = [];
    for (const s of steps) {
      const nx = clone(st), a = s.index;
      // the returned pointer is held until it is stored (head = f(...)) or something else happens
      const held = Object.keys(nx.ptrs).filter(k => k.endsWith("()"));
      if (held.length && !(s.action === "VAR" || s.action === "DROP" || (s.action === "PTR" && !held.some(k => nx.ptrs[k] === s.value)))) held.forEach(k => delete nx.ptrs[k]);
      if (s.action === "PTR") {
        const back = st.calls.length === 0 && Object.keys(st.ptrs).some(k => k.endsWith("()")) && !Object.keys(st.ptrs).some(k => k.endsWith("()") && st.ptrs[k] === s.value);
        nx.ptrs[s.target] = s.value; nx.changed = s.target;
        nx.say = `${s.target} = ${s.value === NULL ? "<b>NULL</b>" : `<b>${hex(s.value)}</b> ${name(s.value)}`}` + (back ? ` <span class="dim">· the caller's ${s.target} again: it still holds the old address until the answer is stored</span>` : "");
        if (st.hl && st.hl.kind !== "null") nx.hl = { ...st.hl, dim: true };
      } else if (s.action === "VAR") {
        nx.vars[s.target] = s.value; nx.changed = s.target;
        nx.say = `${s.target} = <b>${s.value}</b>` + (st.lastSay ? ` <span class="dim">· ${st.lastSay}</span>` : "");
        if (st.hl && st.hl.kind !== "null") nx.hl = { ...st.hl, dim: true };
      } else if (s.action === "DROP") {
        const top = saved[saved.length - 1];
        delete nx.ptrs[s.target]; delete nx.vars[s.target];
        if (top && s.target in top.ptrs) nx.ptrs[s.target] = top.ptrs[s.target];
        if (top && s.target in top.vars) nx.vars[s.target] = top.vars[s.target];
        nx.say = `<span class="dim">${s.target} is gone (its block or function ended)</span>`;
        if (st.hl && st.hl.kind !== "null") nx.hl = { ...st.hl, dim: true };
      } else if (s.action === "CALL") {
        saved.push({ ptrs: { ...nx.ptrs }, vars: { ...nx.vars } });
        nx.calls.push(s.target);
        nx.say = `<b>call</b> ${s.message} <span class="dim">· the function gets COPIES of these</span>`;
      } else if (s.action === "RETURN") {
        nx.calls.pop();
        const top = saved.pop();
        void top;   // (Java sends the caller's values back right after this step)
        const m = /returns (0x[0-9A-F]+|NULL)/i.exec(s.message || "");
        if (m) nx.ptrs[s.target + "()"] = m[1] === "NULL" ? NULL : parseInt(m[1], 16);
        nx.say = `<b>return</b> · ${s.message}`;
      } else if (s.action === "PRINT") {
        nx.out = (nx.out + s.message).slice(-600);
        nx.say = `printf · <span class="w">${s.message.replace(/</g, "&lt;").replace(/\n/g, "↵")}</span>`;
      } else if (s.action === "NEW") {
        nx.nodes[a] = { data: s.value, next: NULL, freed: false }; nx.order.push(a); nx.fresh = a;
        nx.hl = { a, kind: "new" }; nx.say = `<span class="w">${s.message || `newNode(${s.value}): a new pig at ${hex(a)}, next = NULL`}</span>`;
      } else if (s.action === "READ") {
        nx.hl = { a, kind: "read" }; nx.say = `${s.message.replace(/is (-?\d+)$/, "is <b>$1</b>")}`;
      } else if (s.action === "WRITE") {
        if (nx.nodes[a]) nx.nodes[a].data = s.value;
        nx.hl = { a, kind: "write" }; nx.say = `<span class="w">${s.message}</span>`;
      } else if (s.action === "LINK") {
        if (nx.nodes[a]) nx.nodes[a].next = s.value;
        nx.hl = { a, kind: "link" };
        nx.say = `${name(a)}->next = ${s.value === NULL ? "<b>NULL</b>" : `<b>${hex(s.value)}</b> ${name(s.value)}`}: ${s.message}`;
      } else if (s.action === "FREE") {
        if (nx.nodes[a]) nx.nodes[a].freed = true;
        nx.say = `free: ${name(a)} at ${hex(a)} is handed back`;
      } else if (s.action === "NULL_DEREF") {
        nx.hl = { a: NULL, kind: "null" }; nx.say = `<span class="bad">${s.message}</span>`;
      } else nx.say = s.message || s.action;
      nx.lastSay = (s.action === "VAR" || s.action === "PTR" || s.action === "DROP") ? st.lastSay : nx.say;
      frames.push(nx); st = nx;
    }
    // the program ended: a returned pointer nobody stored is gone (that is how a node gets lost)
    const last = frames[frames.length - 1];
    for (const k of Object.keys(last.ptrs)) if (k.endsWith("()")) delete last.ptrs[k];
    this.frames = frames; this.k = 0;
    this.show(0);
  }

  show(k) {
    if (!this.frames) return;
    k = Math.max(0, Math.min(this.frames.length - 1, k)); this.k = k;
    const f = this.frames[k], stage = this.$(".lb-stage"), svg = this.$(".lb-arrows");
    stage.querySelectorAll(".lb-node,.lb-null,.lb-ptr,.lb-row,.lb-loop").forEach(e => e.remove());
    svg.querySelectorAll("path.ln").forEach(e => e.remove());
    const pos = {};
    // the same layout the 3D sty uses: row 0 the rope from head, row 1 everything else
    const L = layoutFrame(f, this.headVar), chain = L.chain, others = L.others;
    // a long rope: narrower boxes first (every field still shown), then the whole stage zooms out a little
    const cols = Math.max(1, ...Object.values(L.at).map(p => p.c + 1)), avail = Math.max(300, this.el.clientWidth - 30);
    const compact = cols * 134 + 90 > avail, W = compact ? 82 : 100, GAP = compact ? 18 : 34;
    stage.classList.toggle("compact", compact);
    const need = cols * (W + GAP) + 90;
    stage.style.zoom = need > avail ? Math.max(0.6, avail / need).toFixed(3) : "";
    for (const [a, p] of Object.entries(L.at)) pos[a] = { x: p.c * (W + GAP), y: p.r ? 126 : 30 };
    const lost = new Set(lostNodes(f));
    stage.classList.toggle("two", others.length > 0);
    if (others.length) {
      const r = document.createElement("div"); r.className = "lb-row"; r.style.top = "100px"; r.style.left = "auto"; r.style.right = "4px";
      r.textContent = [...others].some(a => lost.has(a)) ? "OFF THE ROPE  (red = LOST: no pointer can reach it)" : "OFF THE ROPE  (held by a pointer)";
      stage.appendChild(r);
    }
    const sx = 1;
    for (const p of Object.values(pos)) p.x = 10 + p.x;
    // the nodes
    for (const [a, p] of Object.entries(pos)) {
      const n = f.nodes[a], d = document.createElement("div");
      let cls = "lb-node";
      if (f.hl && +f.hl.a === +a) cls += " " + f.hl.kind + (f.hl.dim ? " dim" : "");
      if (lost.has(+a)) cls += " lost";
      d.className = cls; d.style.left = p.x + "px"; d.style.top = p.y + "px";
      d.innerHTML = `<span class="d">${n.data}</span><span class="n${n.next === NULL ? " nul" : ""}">${hex(n.next)}</span><span class="ad">${hex(+a)}</span>`;
      stage.appendChild(d);
    }
    // arrows: next of every placed node
    const arrow = (x1, y1, x2, y2, hot, curve = 0) => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + curve;
      p.setAttribute("d", `M${x1},${y1} Q${mx},${my} ${x2},${y2}`);
      p.setAttribute("class", "ln"); p.setAttribute("fill", "none");
      p.setAttribute("stroke", hot ? "#ff9a5c" : "#c9b48a"); p.setAttribute("stroke-width", hot ? 2.5 : 1.6);
      p.setAttribute("marker-end", `url(#${hot ? "lb-ah-hot" : "lb-ah"})`);
      svg.appendChild(p);
    };
    for (const [a, p] of Object.entries(pos)) {
      const n = f.nodes[a], hot = f.hl && f.hl.kind === "link" && +f.hl.a === +a && !f.hl.dim;
      const sx0 = p.x + W - 12, sy0 = p.y + 19;
      if (n.next === NULL) {
        const nl = document.createElement("div"); nl.className = "lb-null";
        nl.style.left = (p.x + W + 8) + "px"; nl.style.top = p.y + "px"; nl.textContent = "NULL";
        if (!(a in pos) || chain.seen[chain.seen.length - 1] === +a || p.y > 60) stage.appendChild(nl); else stage.appendChild(nl);
        arrow(sx0, sy0, p.x + W + 6, sy0, hot);
      } else if (pos[n.next]) {
        const t = pos[n.next], step = (W + GAP) * sx;
        if (t.y !== p.y) {                                   // to the other row: into the top or bottom edge
          const up = t.y < p.y;
          arrow(sx0, up ? p.y + 6 : p.y + 32, t.x + W / 2 + (t.x > p.x ? -14 : t.x < p.x ? 14 : 8), up ? t.y + 40 : t.y - 2, hot, 0);
        } else if (t.x <= p.x) {                             // pointing backwards (a loop, or a rope being turned): arc over the top
          arrow(sx0, p.y + 2, t.x + W / 2, t.y - 1, hot, p.x - t.x > step * 1.5 ? -46 : -30);
        } else if (t.x - p.x > step * 1.5) {                 // skipping over a node: arc over it
          arrow(sx0, p.y + 4, t.x + 20, t.y - 1, hot, -40);
        } else arrow(sx0, sy0, t.x - 2, t.y + 19, hot, 0);
      } else {
        arrow(sx0, sy0, p.x + W + 18, sy0, hot);
      }
    }
    if (chain.loopTo != null && chain.seen.length) {
      const last = pos[chain.seen[chain.seen.length - 1]], l = document.createElement("div");
      l.className = "lb-loop"; l.style.left = (last.x + W + 22) + "px"; l.style.top = last.y + "px";
      l.textContent = `↻ back to ${f.nodes[chain.loopTo].data} (it loops)`; stage.appendChild(l);
    }
    // the end of the head chain
    if (chain.loopTo == null) {
      const endX = chain.seen.length ? pos[chain.seen[chain.seen.length - 1]].x + W + 8 : 10;
      if (!chain.seen.length) { const nl = document.createElement("div"); nl.className = "lb-null"; nl.style.left = "10px"; nl.style.top = "30px"; nl.textContent = "NULL"; stage.appendChild(nl); pos[NULL] = { x: 10 - (W - 30) / 2, y: 30 }; }
      else pos[NULL] = { x: endX - (W - 40) / 2, y: 30 };
    }
    // pointer labels: grouped per node, above it
    const at = new Map();
    for (const [nm, a] of Object.entries(f.ptrs)) {
      const key = a === NULL ? "NULL" : (pos[a] ? a : null);
      if (key == null) continue;
      if (!at.has(key)) at.set(key, []);
      at.get(key).push(nm);
    }
    for (const [key, names] of at) {
      const p = key === "NULL" ? pos[NULL] : pos[key];
      if (!p) continue;
      const lab = document.createElement("div"); lab.className = "lb-ptr";
      lab.style.left = (p.x + W / 2) + "px"; lab.style.top = (p.y - 28) + "px";
      lab.innerHTML = names.map(nm => `<span class="lab${f.changed === nm ? " hot" : ""}" style="background:${this.color(nm)}">${nm}</span>`).join("") + `<span class="arr" style="color:${this.color(names[0])}">▼</span>`;
      stage.appendChild(lab);
      const half = lab.offsetWidth / 2, left = p.x + W / 2;           // several names on one node: keep the group inside the board
      if (left - half < 4) lab.style.left = (4 + half) + "px";
    }
    if (f.hl && f.hl.kind === "null") stage.querySelectorAll(".lb-null").forEach(e => e.classList.add("bad"));
    // plain variables
    const vars = this.$(".lb-vars"); vars.innerHTML = "";
    for (const [nm, v] of Object.entries(f.vars)) {
      const c = document.createElement("span"); c.className = "lb-var" + (f.changed === nm ? " changed" : "");
      c.innerHTML = `${nm} = <b>${v}</b>`; vars.appendChild(c);
    }
    this.$(".lb-say").innerHTML = f.say || "";
    const call = this.$(".lb-call"); call.classList.toggle("on", f.calls.length > 0);
    call.textContent = f.calls.length ? "inside " + f.calls.map(c => c + "()").join(" › ") : "";
    const out = this.$(".lb-out"), had = out.classList.contains("on"); out.classList.toggle("on", !!f.out);
    out.innerHTML = f.out ? "<b>console ▸ </b>" + f.out.replace(/&/g, "&amp;").replace(/</g, "&lt;") : ""; out.scrollTop = out.scrollHeight;
    if (this.el.classList.contains("on") && Math.abs((this._h || 0) - this.el.offsetHeight) > 2) {
      this._h = this.el.offsetHeight;
      document.body.style.setProperty("--board-h", this.el.offsetHeight + "px"); dispatchEvent(new Event("resize")); }
    this.$(".lb-count").textContent = `step ${k} / ${this.frames.length - 1}`;
  }
}
