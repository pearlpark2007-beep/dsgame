// athenaScroll.js — Athena, the teacher. She watches the interpreter and explains it, one LINE at a time:
//
//   ┌ Athena ▸ insertAtPosition() ▸ createNode()                    ⟲  ▶  ▾ ┐   breadcrumb (the call stack)
//   │ 41    struct Node *newNode = createNode(value);                         │   previous line
//   │ 42    newNode->next = temp->next;                              [NEXT ▸] │   the line running now (big)
//   │ 43    temp->next = newNode;                                             │   next line
//   └ ✦ 22's next now holds 0x1C0 · First: the new pig's rope goes to the pig after temp.  BEFORE … AFTER … ┘
//
// For each line she (1) reads every value the right-hand side needs from the BEFORE frame, and the values
// that come from a pig fly out of that pig's tag into the code, (2) shows what the expression is worth,
// (3) sends that value to where it is stored (a pointer's banner, a pig's next tag, a pig's back) while the
// interpreter's own steps play on the sty, and (4) shows the result and the before/after.
// She never invents a value: everything she shows comes from the interpreter's frames.
//
// The owl at the top right switches her on and off (key A). Off: no code anywhere on the stage.
import * as THREE from "three";
import { analyse, evaluate, hex, show, NULL } from "./athenaExpr.js";
import { meaning } from "./athenaLens.js";

const KEY = "athena.code", strip = l => (l || "").replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "").trim();
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KW = /^(struct|int|void|return|if|while|for|else|sizeof)$/;
const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

// group a run's steps into BEATS: consecutive steps of the same source line. Bookkeeping steps with no
// line (line 0: the setup, scope clean-up) ride along with the beat before (or the first beat).
export function beatsOf(steps) {
  const out = [];
  steps.forEach((s, k) => {
    const last = out[out.length - 1];
    if (last && (s.line === last.line || !s.line)) { last.to = k + 1; return; }
    if (!s.line && !last) { out.push({ from: k, to: k + 1, line: 0 }); return; }
    if (last && last.line === 0) { last.line = s.line; last.to = k + 1; return; }
    out.push({ from: k, to: k + 1, line: s.line });
  });
  return out;
}

const CSS = `
#athena-scroll { position: fixed; left: 12px; top: 12px; right: 64px; height: 166px; z-index: 35; box-sizing: border-box;
  background: rgba(8, 14, 36, 0.92); border: 2px solid #F2C230; border-radius: 12px; box-shadow: 0 0 18px rgba(242, 194, 48, 0.35);
  color: #f4ecd8; font-family: 'Courier Prime', 'Courier New', monospace; display: none; flex-direction: column; overflow: hidden;
  transform: translateY(-170px); opacity: 0; transition: transform .3s ease, opacity .3s ease, height .25s ease; }
body.side-panel #athena-scroll { right: calc(var(--pw, 520px) + 64px); }
#athena-scroll.live { display: flex; }
#athena-scroll.shown { transform: none; opacity: 1; }
#athena-scroll.collapsed { height: 44px; }
#athena-scroll .as-top { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px 0 12px; border-bottom: 1px solid rgba(242,194,48,.25); flex: none; }
#athena-scroll .as-crumbs { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; overflow: hidden; font: 700 12px/1 'Courier Prime', monospace; }
#athena-scroll .as-crumb { padding: 3px 7px; border-radius: 9px; color: #cfc3a6; border: 1px solid #4a4030; white-space: nowrap; transition: transform .3s ease, opacity .3s ease; }
#athena-scroll .as-crumb.cur { background: #F2C230; color: #120c06; border-color: #F2C230; }
#athena-scroll .as-crumb.enter { animation: as-in .35s ease both; }
#athena-scroll .as-sep { color: #8a7a5a; }
#athena-scroll .as-key { display: none; flex: 1; min-width: 0; align-items: center; gap: 6px; font: italic 700 13px/1 'Courier Prime', monospace; color: #fff4cf; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#athena-scroll .as-key b { font-style: normal; color: #120c06; background: #F2C230; border-radius: 9px; padding: 3px 7px; letter-spacing: 1px; font-size: 11px; }
#athena-scroll.keyed .as-key { display: flex; animation: as-in .35s ease both; }
#athena-scroll.keyed .as-crumbs { display: none; }
#athena-scroll button { font: 700 12px 'Courier Prime', monospace; color: #f4ecd8; background: #1a2448; border: 1px solid #5a6a9a; border-radius: 6px; cursor: pointer; height: 22px; min-width: 26px; padding: 0 6px; }
#athena-scroll button:hover { border-color: #F2C230; color: #F2C230; }
#athena-scroll button:focus-visible { outline: 3px solid #F2C230; outline-offset: 1px; }
#athena-scroll .as-body { flex: 1; display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 2px 8px 0 0; min-height: 0; }
#athena-scroll .as-lines { position: relative; overflow: hidden; height: 92px; }
#athena-scroll .as-track { position: absolute; left: 0; right: 0; top: 0; }
#athena-scroll .as-ln { display: grid; grid-template-columns: 32px 1fr; align-items: baseline; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
#athena-scroll .as-ln .n { color: #9a8f78; font-size: 12px; text-align: right; padding-right: 8px; }
#athena-scroll .as-ln.dim { height: 21px; font-size: 15px; color: #a9b2cc; }
#athena-scroll .as-ln.cur.long { font-size: 18px; }
#athena-scroll .as-ln.cur.vlong { font-size: 15px; }
#athena-scroll .as-ln.cur { height: 50px; padding-top: 16px; box-sizing: border-box; overflow: visible; font-size: 22px; font-weight: 700; color: #fff8e6; text-shadow: 0 0 10px rgba(255, 214, 110, .45); }
#athena-scroll.collapsed .as-ln.dim, #athena-scroll.collapsed .as-say, #athena-scroll.collapsed .as-top { display: none; }
#athena-scroll.collapsed .as-lines { height: 40px; }
#athena-scroll.collapsed .as-ln.cur { font-size: 16px; height: 40px; padding-top: 12px; }
#athena-scroll .kw { color: #8fb8ff; }
#athena-scroll .num { color: #ffb38a; }
#athena-scroll .pt { position: relative; color: var(--c); }
#athena-scroll .pt .nm { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
#athena-scroll .bub { position: absolute; left: 50%; top: -15px; transform: translateX(-50%); font: 700 11px/1 'Courier Prime', monospace; padding: 2px 5px; border-radius: 7px;
  background: var(--c); color: #120c06; white-space: nowrap; text-shadow: none; pointer-events: none; }
#athena-scroll .as-ln.cur .pt .bub { top: -14px; }
#athena-scroll .hot { border-radius: 5px; box-shadow: 0 0 0 2px var(--c, #F2C230); background: rgba(242, 194, 48, .14); }
#athena-scroll .eq.pulse { color: #F2C230; display: inline-block; animation: as-pulse .45s ease 2; }
#athena-scroll .morph { display: inline-block; color: #7dffb0; }
#athena-scroll .as-next { height: 32px !important; min-width: 44px !important; font-size: 13px !important; background: #F2C230 !important; color: #120c06 !important; border-color: #F2C230 !important; margin-left: 6px; }
#athena-scroll .as-next:disabled { opacity: .35; cursor: default; }
#athena-scroll .as-say { flex: none; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px; border-top: 1px solid rgba(242,194,48,.18); overflow: hidden; }
#athena-scroll .as-res { color: #7dffb0; font: 700 15px 'Courier Prime', monospace; white-space: nowrap; flex: none; }
#athena-scroll .as-text { color: #F2C230; font: 700 15px/1.25 'Courier Prime', monospace; flex: 1; min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
#athena-scroll .as-ba { flex: none; display: flex; gap: 6px; align-items: center; font: 700 12px 'Courier Prime', monospace; color: #9a8f78; }
#athena-scroll .as-ba b { padding: 2px 6px; border-radius: 6px; border: 1px solid var(--c); color: var(--c); }
#athena-scroll .as-ba b.after { background: var(--c); color: #120c06; }
#athena-owl { position: fixed; top: 12px; right: 12px; width: 40px; height: 40px; z-index: 36; border-radius: 50%; border: 2px solid #F2C230; background: #0b1230;
  cursor: pointer; display: none; padding: 0; box-shadow: 0 2px 10px rgba(0,0,0,.4); }
body.side-panel #athena-owl { right: calc(var(--pw, 520px) + 12px); }
#athena-owl.live { display: block; }
#athena-owl.off { background: #2a2418; border-color: #6a5a3a; filter: grayscale(.8); }
#athena-owl:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
#athena-owl svg { width: 100%; height: 100%; display: block; }
#athena-fx { position: fixed; inset: 0; z-index: 34; pointer-events: none; }
#athena-fx svg { position: absolute; inset: 0; width: 100%; height: 100%; }
#athena-fx .chip { position: absolute; left: 0; top: 0; font: 700 14px/1 'Courier Prime', monospace; padding: 4px 8px; border-radius: 9px; background: var(--c, #F2C230);
  color: #120c06; box-shadow: 0 0 12px var(--c, #F2C230); white-space: nowrap; opacity: 0; will-change: transform, opacity; }
#athena-sheet { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; max-width: 92vw; z-index: 60; background: #0a0705; border-left: 2px solid #F2C230;
  box-shadow: -10px 0 30px rgba(0,0,0,.5); transform: translateX(105%); transition: transform .3s ease; display: flex; flex-direction: column; }
#athena-sheet.open { transform: none; }
#athena-sheet .sh-top { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #2f2116; color: #F2C230; font: 700 13px 'Courier Prime', monospace; letter-spacing: 2px; }
#athena-sheet .sh-top button { font: 700 13px 'Courier Prime', monospace; background: none; border: 1px solid #5a4422; color: #e8dcc0; padding: 6px 10px; cursor: pointer; }
#athena-sheet .sh-top button:focus-visible { outline: 3px solid #F2C230; }
#athena-sheet .lens { display: block !important; flex: 1; max-height: none !important; border: 0 !important; }
#trial-panel .as-wholefn { display: none; width: 100%; margin: 6px 0 4px; padding: 9px 12px; background: #120d08; border: 1px solid #5a4422; color: #e8dcc0; font: 700 13px 'Courier Prime', monospace; cursor: pointer; border-radius: 4px; text-align: left; }
#trial-panel .as-wholefn.show { display: block; }
#trial-panel .as-wholefn:hover { border-color: #F2C230; color: #F2C230; }
#trial-panel .as-wholefn:focus-visible { outline: 3px solid #F2C230; }
@keyframes as-in { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: none; } }
@keyframes as-pulse { 50% { transform: scale(1.5); } }
`;
const OWL = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="21" r="12" fill="#c9a066"/><path d="M9 12 L14 17 M31 12 L26 17" stroke="#c9a066" stroke-width="4" stroke-linecap="round"/>
<circle cx="15" cy="19" r="5" fill="#fff8e6"/><circle cx="25" cy="19" r="5" fill="#fff8e6"/><circle cx="15" cy="19" r="2.4" fill="#120c06"/><circle cx="25" cy="19" r="2.4" fill="#120c06"/>
<path d="M20 22 L18 25 L22 25 Z" fill="#F2C230"/><path d="M13 28 Q20 33 27 28" stroke="#8a6232" stroke-width="2" fill="none"/></svg>`;

export class Athena {
  // ctx: { world, director, sty, relayout() }, board: ListBoard (colours), lens: AthenaLens (the Whole Function sheet), panel: the trial panel
  constructor({ ctx, board, lens, panel }) {
    this.ctx = ctx; this.board = board; this.lens = lens; this.panel = panel;
    if (!document.getElementById("athena-css")) { const s = document.createElement("style"); s.id = "athena-css"; s.textContent = CSS; document.head.appendChild(s); }
    let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    this.enabled = saved !== "off"; this.inLesson = false; this.collapsed = false; this.cb = {};
    // the Scroll
    const el = this.el = document.createElement("section"); el.id = "athena-scroll"; el.setAttribute("aria-label", "Athena explains the code");
    el.innerHTML = `<div class="as-top"><div class="as-crumbs"></div><div class="as-key" aria-live="polite"></div>
        <button class="as-replay" title="Replay this line" aria-label="Replay this line">⟲</button>
        <button class="as-play" title="Autoplay (P)" aria-label="Autoplay">▶</button>
        <button class="as-fold" title="Collapse Athena's Scroll" aria-label="Collapse">▾</button></div>
      <div class="as-body"><div class="as-lines"><div class="as-track"></div></div><button class="as-next" title="Next line (Space or →)" aria-label="Next line">NEXT ▸</button></div>
      <div class="as-say" aria-live="polite"><span class="as-res"></span><span class="as-text"></span><span class="as-ba"></span></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
    this.$(".as-next").onclick = () => this.cb.next && this.cb.next();
    this.$(".as-play").onclick = () => this.cb.play && this.cb.play();
    this.$(".as-replay").onclick = () => this.cb.replay && this.cb.replay();
    this.$(".as-fold").onclick = () => this.fold(!this.collapsed);
    // the owl
    const owl = this.owl = document.createElement("button"); owl.id = "athena-owl"; owl.innerHTML = OWL;
    owl.onclick = () => this.set(!this.enabled);
    document.body.appendChild(owl);
    addEventListener("keydown", e => {
      if (!this.inLesson || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "a" || e.key === "A") { e.preventDefault(); this.set(!this.enabled); }
    });
    // the effects layer: one trail, one ring, three reusable chips
    const fx = this.fx = document.createElement("div"); fx.id = "athena-fx";
    fx.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><path class="trail" fill="none" stroke-width="3" stroke-linecap="round" opacity="0"/><circle class="ring" r="0" fill="none" stroke-width="4" opacity="0"/></svg>`
      + `<div class="chip"></div><div class="chip"></div><div class="chip"></div>`;
    document.body.appendChild(fx);
    this.trail = fx.querySelector(".trail"); this.ring = fx.querySelector(".ring"); this.chips = [...fx.querySelectorAll(".chip")];
    // the Whole Function sheet (inside the panel, so the code view keeps its look)
    const sheet = this.sheet = document.createElement("div"); sheet.id = "athena-sheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", "The whole function");
    sheet.innerHTML = `<div class="sh-top"><span>THE WHOLE FUNCTION</span><button class="sh-close" aria-label="Close">close ✕</button></div>`;
    panel.appendChild(sheet); sheet.appendChild(lens.el);
    sheet.querySelector(".sh-close").onclick = () => this.sheetOpen(false);
    this.wholeBtn = document.createElement("button"); this.wholeBtn.className = "as-wholefn"; this.wholeBtn.textContent = "📜 The whole function (with the running line)";
    this.wholeBtn.onclick = () => this.sheetOpen(!sheet.classList.contains("open"));
    (panel.querySelector(".editor") || panel.lastChild).before(this.wholeBtn);
    this.paint();
  }

  // ---------- on / off / folded
  active() { return this.enabled && this.inLesson; }
  reserve() { return this.active() ? (this.collapsed ? 44 : 166) + 20 : 0; }          // how much of the top of the stage the camera must leave free
  paint() {
    const on = this.active();
    this.el.classList.toggle("live", this.inLesson);
    requestAnimationFrame(() => this.el.classList.toggle("shown", on));
    this.el.classList.toggle("collapsed", this.collapsed);
    this.owl.classList.toggle("live", this.inLesson); this.owl.classList.toggle("off", !this.enabled);
    this.owl.title = this.enabled ? "Athena: hide the code (A)" : "Athena: show the code (A)";
    this.owl.setAttribute("aria-label", this.owl.title); this.owl.setAttribute("aria-pressed", String(this.enabled));
    this.wholeBtn.classList.toggle("show", this.inLesson);
    this.$(".as-fold").textContent = this.collapsed ? "▴" : "▾";
    if (!on) this.clearFx();
    this.ctx.relayout && this.ctx.relayout();
  }
  set(on) { this.enabled = !!on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} this.paint(); if (this.cb.toggled) this.cb.toggled(this.enabled); }
  fold(c) { this.collapsed = !!c; this.paint(); }
  // the lesson's one strategic line, said when the key line of C runs: key = [a piece of that line, what she says]
  setKey(key) { this.key = key || null; this._keyed(false); }
  _keyed(on, text) {
    const el = this.$(".as-key"); if (!el) return;
    if (on) el.innerHTML = `<b>ATHENA</b><span>"${esc(text)}"</span>`;
    this.el.classList.toggle("keyed", !!on);
  }
  _keyFor(line) { const t = this.lines && this.lines[line - 1] || ""; return this.key && t.includes(this.key[0]) ? this.key[1] : null; }
  lesson(on, lines) { this.inLesson = !!on; if (lines) this.lines = lines; this._keyed(false); this.cancel(); this.prevFn = null; this.$(".as-track").innerHTML = ""; this.say("", "", ""); this.crumbs([]); this.paint(); }
  sheetOpen(o) { this.sheet.classList.toggle("open", !!o); }
  setPlaying(p) { this.$(".as-play").textContent = p ? "⏸" : "▶"; this.$(".as-play").title = p ? "Pause autoplay (P)" : "Autoplay (P)"; }
  setNext(enabled) { this.$(".as-next").disabled = !enabled; }

  // ---------- time (the game's clock, so speed, pause and capture all follow it)
  tween(s, fn) { if (reduced() || this.ctx.skipping?.()) { fn(1); return Promise.resolve(); } return this.ctx.sty._tween(s, fn); }
  wait(s) { return this.tween(s, () => {}); }
  cancel() { this.gen = (this.gen || 0) + 1; this.clearFx(); }

  // ---------- where things are on the screen
  _screen(v) {
    const cam = this.ctx.director.cam, r = this.ctx.world.renderer.domElement.getBoundingClientRect(), p = v.clone().project(cam);
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
  }
  _at(addr, part) { if (addr == null) return null; if (addr === NULL) return this._screen(this.ctx.sty.nullAnchor()); return this._screen(this.ctx.sty.anchor(addr, part)); }
  _rect(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  color(name) { return this.board.color(name); }

  // ---------- the effects
  clearFx() { this.chips.forEach(c => { c.style.opacity = 0; }); this.trail.setAttribute("opacity", 0); this.ring.setAttribute("opacity", 0); }
  async fly(text, from, to, color, seconds = 0.45, chip = 0) {
    if (!from || !to) return;
    const c = this.chips[chip]; c.textContent = text; c.style.setProperty("--c", color);
    const w = c.offsetWidth, h = c.offsetHeight;
    const mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - 60;          // a curved path, up and over
    this.trail.setAttribute("d", `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`); this.trail.setAttribute("stroke", color);
    const g = this.gen;
    await this.tween(seconds, k => {
      if (g !== this.gen) return;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, u = 1 - e;
      const x = u * u * from.x + 2 * u * e * mx + e * e * to.x, y = u * u * from.y + 2 * u * e * my + e * e * to.y;
      c.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px) scale(${1 + Math.sin(k * Math.PI) * 0.25})`;
      c.style.opacity = k < 0.9 ? 1 : (1 - k) * 10;
      this.trail.setAttribute("opacity", 0.55 * Math.sin(k * Math.PI));
    });
    c.style.opacity = 0; this.trail.setAttribute("opacity", 0);
  }
  flare(at, color) {
    if (!at) return;
    this.ring.setAttribute("cx", at.x); this.ring.setAttribute("cy", at.y); this.ring.setAttribute("stroke", color);
    const g = this.gen;
    this.tween(0.6, k => { if (g !== this.gen) return; this.ring.setAttribute("r", 8 + k * 26); this.ring.setAttribute("opacity", 1 - k); });
  }

  // ---------- the breadcrumb (the call stack)
  crumbs(calls, entering = false) {
    const box = this.$(".as-crumbs"), list = ["Athena", ...calls.map(c => c + "()")];
    box.innerHTML = list.map((c, i) => `${i ? `<span class="as-sep">▸</span>` : ""}<span class="as-crumb${i === list.length - 1 ? " cur" : ""}${entering && i === list.length - 1 ? " enter" : ""}">${esc(c)}</span>`).join("");
  }

  // ---------- the teleprompter: previous / current / next line of the running function
  _neighbour(n, dir) {
    const L = this.lines || [];
    for (let i = n - 1 + dir; i >= 0 && i < L.length; i += dir) {
      const s = strip(L[i]);
      if (!s) continue;
      if (s === "}" && dir > 0) return { n: i + 1, text: L[i] };
      if (/^\S.*\)\s*\{$/.test(L[i]) && dir < 0) return { n: i + 1, text: L[i] };          // stop at the function's first line
      if (/^\S.*\)\s*\{$/.test(L[i])) return null;
      return { n: i + 1, text: L[i] };
    }
    return null;
  }
  // a line of C as HTML: keywords, numbers, and every known name in its colour with its value in a bubble
  _html(raw, frame, mark = {}) {
    const src = strip(raw);
    const vals = frame ? { ...(frame.vars || {}), ...Object.fromEntries(Object.entries(frame.ptrs).map(([k, v]) => [k, hex(v)])) } : {};
    // wrap the marked pieces (rhs, lhs, sub-expressions) first, then colour the words inside
    const spans = [];
    for (const [id, text] of Object.entries(mark)) {
      if (!text) continue;
      let at = src.indexOf(text, id === "rhs" ? src.indexOf("=") + 1 : 0);
      if (at < 0) at = src.indexOf(text);
      if (at >= 0 && !spans.some(s => at < s.b && at + text.length > s.a && !(at >= s.a && at + text.length <= s.b) && !(s.a >= at && s.b <= at + text.length))) spans.push({ a: at, b: at + text.length, id });
    }
    const opens = {}, closes = {};
    spans.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a)).forEach(s => { (opens[s.a] ||= []).push(s); (closes[s.b] ||= []).unshift(s); });
    let out = "", i = 0;
    const word = w => {
      if (KW.test(w)) return `<span class="kw">${w}</span>`;
      if (/^\d+$/.test(w)) return `<span class="num">${w}</span>`;
      if (w in vals && !/^(NULL|free|printf|malloc|exit)$/.test(w)) return `<span class="pt" style="--c:${this.color(w)}"><span class="nm">${esc(w)}</span><span class="bub">${esc(vals[w])}</span></span>`;
      return esc(w);
    };
    while (i <= src.length) {
      if (closes[i]) closes[i].forEach(() => (out += "</span>"));
      if (opens[i]) opens[i].forEach(s => (out += `<span class="m-${s.id}" data-k="${s.id}">`));
      if (i === src.length) break;
      const m = /^[A-Za-z_]\w*|^\d+/.exec(src.slice(i));
      const stop = Math.min(...[src.length, ...Object.keys(opens).map(Number).filter(x => x > i), ...Object.keys(closes).map(Number).filter(x => x > i)]);
      if (m && i + m[0].length <= stop) { out += word(m[0]); i += m[0].length; }
      else { const ch = src[i]; out += ch === "=" && src[i + 1] !== "=" && !"=!<>".includes(src[i - 1]) ? `<span class="eq">=</span>` : esc(ch); i++; }
    }
    return out;
  }
  _lines(n, frame, mark, slide = 0) {
    const L = this.lines || [], prev = this._neighbour(n, -1), next = this._neighbour(n, 1);
    const indent = raw => (raw.match(/^\s*/) || [""])[0].replace(/ {4}/g, "  ");
    const row = (o, cls, html) => `<div class="as-ln ${cls}"><span class="n">${o ? o.n : ""}</span><span>${o ? indent(o.text) + html : ""}</span></div>`;
    const track = this.$(".as-track");
    const len = strip(L[n - 1] || "").length, size = len > 58 ? " vlong" : len > 44 ? " long" : "";
    track.innerHTML = row(prev, "dim", prev ? this._html(prev.text, null) : "") + row({ n, text: L[n - 1] || "" }, "cur" + size, this._html(L[n - 1] || "", frame, mark)) + row(next, "dim", next ? this._html(next.text, null) : "");
    // slide: a new function slides in from the right (a call) or the left (a return); a new line rises
    const dx = reduced() ? 0 : slide * 60, dy = slide ? 0 : (reduced() ? 0 : 18);
    track.style.transition = "none"; track.style.opacity = slide ? 0 : 0.4; track.style.transform = `translate(${dx}px, ${dy}px)`;
    void track.offsetWidth;
    track.style.transition = "transform .25s ease-out, opacity .25s ease-out"; track.style.opacity = 1; track.style.transform = "none";
  }
  say(res, text, ba) {
    this.$(".as-res").textContent = res ? "✦ " + res : "";
    this.$(".as-ba").innerHTML = ba || "";
    const t = this.$(".as-text"); t.textContent = "";
    if (!text) return Promise.resolve();
    const g = this.gen;
    return this.tween(Math.min(1.6, text.length / 40), k => { if (g === this.gen) t.textContent = text.slice(0, Math.ceil(k * text.length)); });   // 40 characters a second
  }
  _beforeAfter(group, before, after) {
    const out = [];
    for (const s of group) {
      if (s.action === "PTR" && before.ptrs[s.target] !== undefined && before.ptrs[s.target] !== after.ptrs[s.target] && after.ptrs[s.target] !== undefined)
        out.push({ name: s.target, a: hex(before.ptrs[s.target]), b: hex(after.ptrs[s.target]), c: this.color(s.target) });
      if (s.action === "LINK" && before.nodes[s.index]) out.push({ name: `${before.nodes[s.index].data}->next`, a: hex(before.nodes[s.index].next), b: hex(after.nodes[s.index] ? after.nodes[s.index].next : s.value), c: "#fff8ea" });
      if (s.action === "WRITE" && before.nodes[s.index]) out.push({ name: `${hex(s.index)}->data`, a: String(before.nodes[s.index].data), b: String(s.value), c: "#ffb38a" });
    }
    const seen = new Set(), list = out.filter(o => !seen.has(o.name) && seen.add(o.name)).slice(0, 2);
    return list.map(o => `<span style="--c:${o.c}">${esc(o.name)}</span> <b style="--c:${o.c}">${esc(o.a)}</b> → <b class="after" style="--c:${o.c}">${esc(o.b)}</b>`).join(" &nbsp; ");
  }
  _explain(group, kind, info) {
    const s0 = group.find(s => s.line) || group[0], line = this.lines[s0.line - 1] || "";
    const call = group.find(s => s.action === "CALL"), ret = group.find(s => s.line)?.action === "RETURN" ? group.find(s => s.line) : null;
    if (call && group.every(s => s.action === "CALL" || !s.line)) return `Step inside ${call.message.replace(/\(.*$/, "")}(): ${call.message.replace(/^\w+\(|\)$/g, "")}.`;
    if (kind === "signature") { const ps = group.filter(s => s.action === "PTR" || s.action === "VAR").map(s => s.message).join(", "); return `${(line.match(/(\w+)\s*\(/) || [])[1]}() starts. It is given ${ps || "nothing"}.`; }
    if (ret) return `${ret.target}() is done and hands back ${hex(ret.value)}. ${meaning(line)}`.trim();
    if (kind === "for" && info) return info.value === undefined ? meaning(line) : `Check ${info.text}: ${info.value ? "true, so walk one more step." : "false, so stop walking."}`;
    if (kind === "free") return `${meaning(line)}`;
    return meaning(line) || group.map(s => s.message).join(" · ");
  }

  // ---------- show a beat without animation (stepping back, jumping)
  show(group, before, after) {
    if (!this.active() || !group || !group.length) return;
    this.cancel();
    const line = (group.find(s => s.line) || {}).line; if (!line) return;
    { const kt = this._keyFor(line); this._keyed(!!kt, kt); }
    this.crumbs(after.calls || []);
    this._lines(line, after, {});
    const a = analyse(this.lines[line - 1] || "");
    const res = this._result(group, a, before, after);
    this.say(res, this._explain(group, a.kind, a.expr ? { text: a.expr.text, value: evaluate(a.expr, after).value } : null), this._beforeAfter(group, before, after));
    this.prevFn = (after.calls || []).join(">");
  }
  _result(group, a, before, after) {
    const ret = group.find(s => s.action === "RETURN");
    if (group.find(s => s.action === "CALL") && group.every(s => s.action === "CALL" || !s.line)) return "";
    if (a.kind === "assign" || a.kind === "malloc") {
      const lhs = a.lhs;
      if (lhs.k === "id") { const v = lhs.name in after.ptrs ? hex(after.ptrs[lhs.name]) : after.vars && lhs.name in after.vars ? after.vars[lhs.name] : null; return v === null ? (ret ? `${ret.target}() returned ${hex(ret.value)}` : "") : `${lhs.name} = ${v}`; }
      const owner = evaluate(lhs.of, before).value, n = owner != null && before.nodes[owner];
      if (n) { const now = after.nodes[owner]; return `${lhs.text} = ${lhs.field === "next" ? hex(now ? now.next : NULL) : now ? now.data : "?"}`; }
    }
    if (a.kind === "free") { const fr = group.find(s => s.action === "FREE"); return fr ? fr.message : ""; }
    const pr = group.filter(s => s.action === "PRINT").map(s => s.message).join("");
    if (pr) return "prints " + JSON.stringify(pr).slice(1, -1);
    return group.length === 1 && group[0].action !== "CALL" ? group[0].message : "";
  }

  // ---------- one beat, animated: explain, evaluate, store, show the result.  run() plays the interpreter's steps on the sty.
  async beat(group, before, after, run) {
    if (!this.active()) return run();
    this.cancel();
    const g = this.gen, live = () => g === this.gen;
    const line = (group.find(s => s.line) || {}).line || 0, text = this.lines[line - 1] || "", a = analyse(text);
    { const kt = this._keyFor(line); this._keyed(!!kt, kt); }
    const fn = (before.calls || []).join(">"), fnAfter = (after.calls || []).join(">");
    const deeper = (before.calls || []).length > (this._lastDepth ?? 0);
    const slide = this.prevFn != null && fn !== this.prevFn ? (deeper ? 1 : -1) : 0;
    this._lastDepth = (before.calls || []).length;
    const first = group.find(s => s.line) || group[0];
    const call = group.find(s => s.action === "CALL") && group.every(s => s.action === "CALL" || !s.line) ? group.find(s => s.action === "CALL") : null, ret = first.action === "RETURN" ? first : null;
    // what to wrap in the line: the two sides, and every sub-expression that has a value
    const rhs = a.kind === "assign" ? a.rhs : a.kind === "return" ? a.expr : a.kind === "free" ? a.arg : a.kind === "callstmt" ? a.expr : null;
    const ev = rhs ? evaluate(rhs, before) : { steps: [] };
    const mark = { rhs: rhs && rhs.text, lhs: a.lhs && a.lhs.text };
    ev.steps.filter(s => s.from).forEach((s, i) => (mark["s" + i] = s.text));
    this.crumbs(before.calls || [], slide > 0);
    this._lines(line, before, mark, slide);
    this.say("", this._explain(group, a.kind, null), "");
    const rhsEl = () => this.$(".as-ln.cur .m-rhs");

    // 1. the right-hand side: each value that lives in a pig flies out of its tag into the code
    if (call) {
      await this.wait(0.35);
      if (!live()) return;
    } else if (ret && rhs && rhs.k === "call") {
      const el = rhsEl(), crumb = this.$(".as-crumb.cur");
      if (el && crumb) { el.classList.add("hot"); await this.fly(hex(ret.value), this._rect(crumb), this._rect(el), "#7dffb0", 0.5); }
      if (el) { el.innerHTML = `<span class="morph">${esc(hex(ret.value))}</span>`; }
    } else {
      let i = 0;
      for (const s of ev.steps) {
        if (!live()) return;
        if (!s.from) continue;
        const el = this.$(`.as-ln.cur .m-s${i++}`); if (!el) continue;
        el.classList.add("hot"); el.style.setProperty("--c", s.from.field === "next" ? "#fff8ea" : "#ffb38a");
        await this.fly(show(s.value, s.ptr), this._at(s.from.addr, s.from.field === "next" ? "next" : "back"), this._rect(el), s.from.field === "next" ? "#fff8ea" : "#ffb38a", 0.5);
        el.innerHTML = `<span class="morph">${esc(show(s.value, s.ptr))}</span>`;     // the expression becomes its value
      }
      if (rhs && rhs.k !== "call" && ev.value !== undefined && rhsEl() && a.kind === "assign") rhsEl().innerHTML = `<span class="morph">${esc(show(ev.value, rhs.k !== "num" && !(rhs.k === "id" && !(rhs.name in before.ptrs))))}</span>`;
    }
    if (!live()) return;

    // 2. the store: the value flies to where it is kept, while the interpreter's steps play on the sty
    let dest = null, color = "#F2C230", value = null;
    if ((a.kind === "assign" || a.kind === "malloc") && a.lhs) {
      const lhs = a.lhs;
      if (lhs.k === "id" && lhs.name in after.ptrs) { value = after.ptrs[lhs.name]; color = this.color(lhs.name); dest = () => this._at(value, lhs.name === (this.board.headVar || "head") ? "snout" : "banner"); }
      else if (lhs.k === "field") { const owner = evaluate(lhs.of, before).value; if (owner != null && owner !== NULL) { value = lhs.field === "next" ? (after.nodes[owner] || {}).next : (after.nodes[owner] || {}).data; color = lhs.field === "next" ? "#fff8ea" : "#ffb38a"; dest = () => this._at(owner, lhs.field === "next" ? "next" : "back"); } }
      const eq = this.$(".as-ln.cur .eq"); if (eq) eq.classList.add("pulse");
    }
    const from = rhsEl() ? this._rect(rhsEl()) : null;
    const flying = dest && from && value != null && a.kind !== "malloc"
      ? this.fly(lhsText(value, a), from, dest(), color, 0.55, 1)
      : Promise.resolve();
    if (a.kind === "free") { const t = ev.value; if (t != null && t !== NULL) this.flare(this._at(t, "back"), "#ff5a4a"); }
    await Promise.all([run(), flying]);
    if (!live()) return;
    if (a.kind === "malloc" && a.lhs) { const v = after.ptrs[a.lhs.name], el = this.$(".as-ln.cur .m-lhs"); if (v != null && el) await this.fly(hex(v), this._at(v, "addr"), this._rect(el), this.color(a.lhs.name), 0.5, 1); }
    if (dest) this.flare(dest(), color);

    // 3. the result: the line again with the values it holds now, what changed, and what it meant
    this._lines(line, after, {}, 0);
    const seen = { ...after, vars: { ...(before.vars || {}), ...(after.vars || {}), ...Object.fromEntries(group.filter(s => s.action === "VAR").map(s => [s.target, s.value])) } };
    const forInfo = a.kind === "for" ? { text: a.expr.text, value: evaluate(a.expr, seen).value } : null;
    this.crumbs(after.calls || [], (after.calls || []).length > (before.calls || []).length);
    await this.say(this._result(group, a, before, after), this._explain(group, a.kind, forInfo), this._beforeAfter(group, before, after));
    this.prevFn = fnAfter;
  }
}
function lhsText(v, a) { return a.lhs && a.lhs.k === "field" && a.lhs.field === "data" ? String(v) : hex(v); }
