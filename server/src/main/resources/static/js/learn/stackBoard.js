import "./panelWidth.js";
// stackBoard.js — the flat, textbook view of the stacks, docked under the 3D harbour while a trial runs.
// The same idea as the cave's array board (and the teaching visualisers it copies, VisuAlgo and Python
// Tutor): each stack drawn as a column of numbered slots, bottom at the bottom, a "top" arrow on the top
// slot (or "top = -1" under an empty stack), the slot just pushed glowing green, the slot just popped
// left as a red outline of what went out, a peek glowing yellow, the slot that does not exist (overflow)
// above the column, every variable in a watch row, one plain sentence saying what happened, and a
// media bar: play, pause, one step forward, one step back.
//
// It never runs code itself: it replays the timeline Java sent (PUSH, POP, PEEK, OVERFLOW, UNDERFLOW, VAR).
//   const board = new StackBoard();
//   board.load({ piles: level.structures, steps, label: v => "WATER" });
//   board.show(k)   // draw the state after k steps

const css = `
#stack-board { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 29; display: none; background: rgba(12, 9, 6, 0.93);
  border: 1px solid #5a4422; border-radius: 6px; padding: 8px 14px 8px; color: #efe1c2; font-family: 'Courier Prime', monospace; box-shadow: 0 6px 30px rgba(0,0,0,0.6); box-sizing: border-box; }
body.side-panel #stack-board { right: calc(var(--pw, 520px) + 12px); }
#stack-board.on { display: block; }
#stack-board .sb-head { display: flex; align-items: baseline; gap: 12px; min-height: 22px; }
#stack-board .sb-title { font-family: Anton, Impact, sans-serif; color: #f2c230; letter-spacing: 1px; font-size: 17px; white-space: nowrap; }
#stack-board .sb-say { font-size: 14px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#stack-board .sb-say b { color: #f2c230; } #stack-board .sb-say .w { color: #8fe3a0; } #stack-board .sb-say .bad { color: #ff7a5c; } #stack-board .sb-say .dim { opacity: 0.55; }
#stack-board .sb-body { display: flex; gap: 18px; align-items: flex-end; margin-top: 4px; }
#stack-board .sb-piles { display: flex; gap: 26px; align-items: flex-end; }
#stack-board .sb-pile { display: flex; flex-direction: column; align-items: stretch; }
#stack-board .sb-name { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; font-size: 13px; }
#stack-board .sb-name b { font-family: Anton, Impact, sans-serif; font-weight: normal; font-size: 16px; color: #efe1c2; letter-spacing: 0.5px; }
#stack-board .sb-badge { font-size: 10.5px; padding: 0 5px; border-radius: 3px; border: 1px solid #5a4422; color: #9c8a6c; }
#stack-board .sb-badge.full { color: #ff9a5c; border-color: #ff9a5c; } #stack-board .sb-badge.empty { color: #8fd0e8; border-color: #8fd0e8; }
#stack-board .sb-row { display: flex; align-items: center; gap: 6px; margin-top: 1px; }
#stack-board .sb-ix { width: 26px; text-align: right; font-size: 11.5px; color: #c9a227; }
#stack-board .sb-cell { box-sizing: border-box; width: 112px; border: 2px solid #6b5432; background: #1d150d; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s; }
#stack-board .sb-cell .v { font-family: Anton, Impact, sans-serif; font-size: 16px; color: #f4ead2; }
#stack-board .sb-cell .c { font-size: 10.5px; color: #c9b48a; letter-spacing: 0.5px; }
#stack-board .sb-cell.free { border-style: dashed; opacity: 0.42; }
#stack-board .sb-cell.ghost { border-style: dotted; border-color: #7e1a0f; opacity: 0.3; }
#stack-board .sb-cell.push { border-color: #8fe3a0; box-shadow: 0 0 14px rgba(143,227,160,0.7); background: #12301a; }
#stack-board .sb-cell.peek { border-color: #f2c230; box-shadow: 0 0 14px rgba(242,194,48,0.7); background: #3a2c0c; }
#stack-board .sb-cell.pop { border: 2px dashed #e0442a; opacity: 1; background: transparent; }
#stack-board .sb-cell.pop .v, #stack-board .sb-cell.pop .c { color: #ff9a80; text-decoration: line-through; }
#stack-board .sb-cell.over { border: 2px solid #e0442a; box-shadow: 0 0 18px rgba(224,68,42,0.9); background: #4a0f08; opacity: 1; }
#stack-board .sb-cell.dimhl { box-shadow: none; }
#stack-board .sb-top { font-size: 12px; font-weight: 700; color: #f2c230; white-space: nowrap; min-width: 54px; }
#stack-board .sb-base { margin: 3px 0 0 32px; width: 112px; height: 4px; background: #6b5432; border-radius: 2px; }
#stack-board .sb-base.under { background: #e0442a; box-shadow: 0 0 14px rgba(224,68,42,0.9); }
#stack-board .sb-under { margin-left: 32px; font-size: 11.5px; height: 15px; color: #8fd0e8; white-space: nowrap; }
#stack-board .sb-side { flex: 1; display: flex; flex-direction: column; gap: 8px; align-self: stretch; justify-content: flex-end; min-width: 220px; }
#stack-board .sb-vars { display: flex; gap: 6px; flex-wrap: wrap; align-content: flex-start; }
#stack-board .sb-var { border: 1px solid #5a4422; border-radius: 3px; padding: 1px 7px; font-size: 12.5px; background: #1d150d; }
#stack-board .sb-var.changed { background: #3a2c0c; border-color: #f2c230; }
#stack-board .sb-var b { color: #f2c230; } #stack-board .sb-var i { font-style: normal; color: #9c8a6c; font-size: 11px; }
#stack-board .sb-ctrl { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
#stack-board .sb-ctrl button { min-width: 34px; min-height: 30px; background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font-size: 14px; cursor: pointer; }
#stack-board .sb-ctrl button:hover:not(:disabled) { border-color: #f2c230; }
#stack-board .sb-ctrl button:disabled { opacity: 0.35; cursor: default; }
#stack-board .sb-ctrl select { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; min-height: 30px; font-family: inherit; }
#stack-board .sb-count { font-size: 12px; color: #9c8a6c; margin-left: 4px; }
#stack-board .sb-count.replay { color: #8fd0e8; }
@media (max-width: 900px) { #stack-board { display: none !important; } }
`;

export class StackBoard {
  constructor({ onStep, onPlay, onPause, onSpeed } = {}) {
    this.cb = { onStep, onPlay, onPause, onSpeed };
    if (!document.getElementById("stack-board-css")) { const s = document.createElement("style"); s.id = "stack-board-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("section");
    el.id = "stack-board"; el.setAttribute("aria-label", "The stacks, step by step");
    el.innerHTML = `<div class="sb-head"><span class="sb-title">THE STACKS</span><span class="sb-say" role="status" aria-live="polite"></span></div>
      <div class="sb-body"><div class="sb-piles"></div>
        <div class="sb-side"><div class="sb-vars"></div>
          <div class="sb-ctrl">
            <button class="first" title="Back to the start" aria-label="Back to the start">⏮</button>
            <button class="back" title="One step back (←)" aria-label="One step back">◀</button>
            <button class="play" title="Play / pause (P)" aria-label="Play or pause">⏸</button>
            <button class="fwd" title="One step forward (→)" aria-label="One step forward">▶</button>
            <button class="last" title="To the end" aria-label="To the end">⏭</button>
            <select class="speed" aria-label="Speed"><option value="0.25">0.25× (slowest)</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1× (normal)</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select>
            <span class="sb-count"></span>
          </div></div></div>`;
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
  }

  // the 3D picture moves up to make room (the page listens for "resize" and re-centres its camera)
  open() { if (this.el.classList.contains("on")) return; this.el.classList.add("on"); document.body.classList.add("board-on"); document.body.style.setProperty("--board-h", this.el.offsetHeight + "px"); dispatchEvent(new Event("resize")); }
  close() { if (!this.el.classList.contains("on")) return; this.el.classList.remove("on"); document.body.classList.remove("board-on"); dispatchEvent(new Event("resize")); }
  get height() { return this.el.classList.contains("on") ? this.el.offsetHeight : 0; }
  setPlaying(on) { this.playing = on; this.$(".play").textContent = on ? "⏸" : "▶"; }
  setEnabled(back, fwd) { this.$(".first").disabled = this.$(".back").disabled = !back; this.$(".fwd").disabled = this.$(".last").disabled = !fwd; }
  // "replay": the board shows an earlier step while the 3D harbour stays where it is
  setLive(k) { this.live = k; }

  // build every frame of the run up front, so stepping back is just drawing an earlier frame
  load({ piles = [], steps = [], label = () => "" }) {
    this.label = label;
    this.caps = Object.fromEntries(piles.map(p => [p.name, p.capacity]));
    this.order = piles.map(p => p.name);
    const say0 = piles.map(p => `${p.name}: ${p.initial.length ? p.initial.length + " in, top = " + (p.initial.length - 1) : "empty, top = -1"}`).join(" · ");
    let st = { piles: Object.fromEntries(piles.map(p => [p.name, p.initial.slice()])), vars: {}, hl: null, say: say0 + ". Press play or step through.", changed: null };
    const frames = [st];
    const word = v => { const l = this.label(v); return l ? `${v} <span class="dim">(${l})</span>` : String(v); };
    for (const s of steps) {
      const nx = { piles: Object.fromEntries(Object.entries(st.piles).map(([k, v]) => [k, v.slice()])), vars: { ...st.vars }, hl: null, say: "", changed: null };
      const p = nx.piles[s.target];
      if (s.action === "PUSH" && p) { p.push(s.value); nx.hl = { pile: s.target, i: p.length - 1, kind: "push" }; nx.say = `<span class="w">push(&${s.target}, ${word(s.value)})</span> → slot ${p.length - 1}, top = <b>${p.length - 1}</b>`; }
      else if (s.action === "POP" && p) { const v = p.pop(); nx.hl = { pile: s.target, i: p.length, kind: "pop", value: v }; nx.say = `pop(&${s.target}) → <b>${word(v)}</b> leaves slot ${p.length}, top = <b>${p.length - 1}</b>`; }
      else if (s.action === "PEEK" && p) { nx.hl = { pile: s.target, i: p.length - 1, kind: "peek" }; nx.say = `peek(&${s.target}) → <b>${word(s.value)}</b>: looks at the top, takes nothing`; }
      else if (s.action === "OVERFLOW") { nx.hl = { pile: s.target, i: this.caps[s.target], kind: "over", value: s.value }; nx.say = `<span class="bad">push(&${s.target}, ${s.value}): ${s.target} is full (${this.caps[s.target]} of ${this.caps[s.target]}). There is no slot ${this.caps[s.target]}. OVERFLOW</span>`; }
      else if (s.action === "UNDERFLOW") { nx.hl = { pile: s.target, i: -1, kind: "under" }; nx.say = `<span class="bad">pop(&${s.target}): ${s.target} is empty, top = -1. Nothing to take. UNDERFLOW</span>`; }
      else if (s.action === "VAR") {
        // a variable changed: the last slot touched stays lit, the sentence keeps what happened to it
        nx.vars[s.target] = s.value; nx.changed = s.target;
        if (st.hl && st.hl.kind !== "under" && st.hl.kind !== "over") nx.hl = { ...st.hl, dim: true };
        nx.say = `${s.target} = <b>${word(s.value)}</b>` + (st.lastSay ? ` <span class="dim">· ${st.lastSay}</span>` : "");
      }
      else nx.say = s.message || s.action;
      nx.lastSay = s.action === "VAR" ? st.lastSay : nx.say;
      frames.push(nx); st = nx;
    }
    this.frames = frames; this.live = 0;
    this.show(0);
  }

  show(k) {
    if (!this.frames) return;
    k = Math.max(0, Math.min(this.frames.length - 1, k)); this.k = k;
    const f = this.frames[k];
    const maxCap = Math.max(...Object.values(this.caps));
    const h = maxCap > 4 ? 19 : 26;                         // tall stacks get thinner slots, so the board stays low
    const wrap = this.$(".sb-piles"); wrap.innerHTML = "";
    for (const name of this.order) {
      const cap = this.caps[name], vals = f.piles[name], top = vals.length - 1, hl = f.hl && f.hl.pile === name ? f.hl : null;
      const col = document.createElement("div"); col.className = "sb-pile";
      const badge = vals.length === 0 ? `<span class="sb-badge empty">EMPTY</span>` : vals.length >= cap ? `<span class="sb-badge full">FULL</span>` : `<span class="sb-badge">${vals.length} / ${cap}</span>`;
      col.innerHTML = `<div class="sb-name"><b>${name}</b>${badge}</div>`;
      // from the slot that doesn't exist (cap) down to slot 0
      for (let i = cap; i >= 0; i--) {
        const row = document.createElement("div"); row.className = "sb-row";
        const cell = document.createElement("div"); cell.style.height = h + "px";
        let cls = "sb-cell", v = "", c = "";
        if (i === cap) { cls += " ghost"; v = "☠"; c = "no slot"; }
        else if (i <= top) { v = vals[i]; c = this.label(vals[i]) || ""; }
        else cls += " free";
        if (hl && hl.i === i) {
          cls += " " + hl.kind + (hl.dim ? " dimhl" : "");
          if (hl.kind === "pop" || hl.kind === "over") { v = hl.value; c = this.label(hl.value) || ""; }
        }
        cell.className = cls;
        cell.innerHTML = `<span class="v">${v}</span>${c ? `<span class="c">${c}</span>` : ""}`;
        row.innerHTML = `<span class="sb-ix">${i === cap ? "" : "[" + i + "]"}</span>`;
        row.appendChild(cell);
        const t = document.createElement("span"); t.className = "sb-top"; t.textContent = i === top ? "◀ top" : ""; row.appendChild(t);
        col.appendChild(row);
      }
      const base = document.createElement("div"); base.className = "sb-base" + (hl && hl.kind === "under" ? " under" : ""); col.appendChild(base);
      const under = document.createElement("div"); under.className = "sb-under"; under.textContent = top < 0 ? "top = -1 (empty)" : `top = ${top}`; col.appendChild(under);
      wrap.appendChild(col);
    }
    const vars = this.$(".sb-vars"); vars.innerHTML = "";
    for (const [name, val] of Object.entries(f.vars)) {
      const ch = document.createElement("span"); ch.className = "sb-var" + (f.changed === name ? " changed" : "");
      const l = this.label(val);
      ch.innerHTML = `${name} = <b>${val}</b>${l && l !== name ? ` <i>${l}</i>` : ""}`; vars.appendChild(ch);
    }
    this.$(".sb-say").innerHTML = f.say || "";
    const cnt = this.$(".sb-count"), replay = this.live != null && k < this.live;
    cnt.textContent = replay ? `replay ${k} / ${this.frames.length - 1} · harbour at ${this.live}` : `step ${k} / ${this.frames.length - 1}`;
    cnt.classList.toggle("replay", replay);
  }
}
