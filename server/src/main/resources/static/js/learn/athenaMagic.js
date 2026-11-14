// athenaMagic.js — Athena's code, alive. The player can switch it on or off (a toggle in the panel).
// When it is on, every line that runs is CAST over the sty:
//   • the line of C rises in glowing letters above the pig it touches,
//   • every name in it carries its live value in a little bubble (head ▸ 0x1C0), in the name's own colour,
//   • the result appears under it with a spark ("head = 0x1C0"), then what it means in plain English,
//   • a trail of light runs from the spell down to the pig, and a ring flares round it.
// The code panel (athenaLens.js) shows the same live values on the running line.
import * as THREE from "three";
import { meaning, liveTokens } from "./athenaLens.js";

const NULL = 0;
const hex = a => (a === NULL || a == null ? "NULL" : "0x" + Number(a).toString(16).toUpperCase());
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = l => l.replace(/\/\*.*?\*\//g, "").trim();
const KEY = "athena.code";

const CSS = `
#athena-magic { position: fixed; inset: 0; pointer-events: none; z-index: 40; }
#athena-magic svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
#athena-magic .am-spell { position: absolute; transform: translate(-50%, -100%); min-width: 220px; max-width: 520px; padding: 12px 16px 10px;
  background: rgba(10, 16, 40, 0.92); border: 2px solid #f2c230; border-radius: 10px; box-shadow: 0 0 24px rgba(242, 194, 48, 0.55), 0 8px 24px rgba(0,0,0,0.5);
  color: #fff6dc; font: 700 19px/1.5 'Courier Prime', monospace; text-align: center; animation: am-rise .45s cubic-bezier(.2,.9,.3,1.2) both; }
#athena-magic .am-spell.out { animation: am-fade .3s ease both; }
#athena-magic .am-line { text-shadow: 0 0 10px rgba(255, 220, 120, 0.8); white-space: pre-wrap; padding-top: 14px; }
#athena-magic .am-kw { color: #9fc8ff; font-weight: 700; }
.am-tk { position: relative; color: var(--c); font-weight: 700; }
.am-tk i { position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, 2px); font: 700 11px/1 'Courier Prime', monospace; font-style: normal;
  background: var(--c); color: #120c06; padding: 2px 5px; border-radius: 6px; white-space: nowrap; animation: am-pop .35s .25s cubic-bezier(.2,.9,.3,1.6) both; }
#athena-magic .am-res { margin-top: 6px; color: #7dffb0; font-size: 17px; animation: am-pop .4s .35s cubic-bezier(.2,.9,.3,1.4) both; }
#athena-magic .am-res::before { content: "✦ "; color: #f2c230; }
#athena-magic .am-say { margin-top: 4px; color: #f2c230; font: italic 700 14px/1.35 'Courier Prime', monospace; animation: am-pop .4s .55s ease both; }
#athena-magic .am-who { position: absolute; top: -11px; left: 14px; background: #f2c230; color: #120c06; font: 700 10px 'Courier Prime', monospace; letter-spacing: 2px; padding: 2px 8px; border-radius: 4px; }
@keyframes am-rise { from { opacity: 0; transform: translate(-50%, -70%) scale(.85); filter: blur(4px); } to { opacity: 1; transform: translate(-50%, -100%) scale(1); filter: none; } }
@keyframes am-fade { to { opacity: 0; transform: translate(-50%, -120%); } }
@keyframes am-pop { from { opacity: 0; transform: translate(-50%, 8px) scale(.6); } to { opacity: 1; } }
#athena-magic .am-res, #athena-magic .am-say { transform: none !important; }
@keyframes am-draw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
@keyframes am-ring { from { r: 6; opacity: 1; } to { r: 46; opacity: 0; } }
#trial-panel .am-toggle { display: none; align-items: center; gap: 10px; width: 100%; margin: 6px 0 4px; padding: 9px 12px; background: #120d08; border: 1px solid #5a4422; color: #e8dcc0;
  font: 700 13px 'Courier Prime', monospace; letter-spacing: 1px; cursor: pointer; border-radius: 4px; text-align: left; }
#trial-panel .am-toggle.show { display: flex; }
#trial-panel .am-toggle .sw { width: 38px; height: 20px; border-radius: 10px; background: #3a2e1e; position: relative; flex: none; transition: background .2s; }
#trial-panel .am-toggle .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #8a7a5a; transition: left .2s, background .2s; }
#trial-panel .am-toggle.on .sw { background: #f2c230; }
#trial-panel .am-toggle.on .sw::after { left: 20px; background: #120c06; }
#trial-panel .am-toggle small { color: #8a7a5a; font-weight: 400; letter-spacing: 0; }
`;

export class AthenaMagic {
  // ctx: { world, director, sty }, board: the ListBoard (colours), lens: AthenaLens, panel: the trial panel
  constructor({ ctx, board, lens, panel }) {
    this.ctx = ctx; this.board = board; this.lens = lens; this.panel = panel;
    if (!document.getElementById("athena-magic-css")) { const s = document.createElement("style"); s.id = "athena-magic-css"; s.textContent = CSS; document.head.appendChild(s); }
    this.layer = document.createElement("div"); this.layer.id = "athena-magic";
    this.layer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="am-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="trail"></g></svg>`;
    document.body.appendChild(this.layer);
    this.svg = this.layer.querySelector("svg"); this.trail = this.layer.querySelector(".trail");
    let saved = "on"; try { saved = localStorage.getItem(KEY) || "on"; } catch (e) {}
    this.enabled = saved !== "off";
    this.btn = document.createElement("button"); this.btn.className = "am-toggle";
    this.btn.onclick = () => this.set(!this.enabled);
    panel.querySelector(".lens").before(this.btn);
    this.inLesson = false;
    this.paint();
    this._track = null;
  }
  paint() {
    this.btn.classList.toggle("on", this.enabled);
    this.btn.innerHTML = `<span class="sw"></span><span>ATHENA'S CODE: ${this.enabled ? "ON" : "OFF"}<br><small>${this.enabled ? "spells over the pigs + the code with live values" : "just the pigs. Switch on to see the C as it runs"}</small></span>`;
    this.lens.on(this.inLesson && this.enabled);
  }
  set(on) { this.enabled = !!on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} this.paint(); if (!on) this.clear(); }
  lesson(on) { this.inLesson = !!on; this.btn.classList.toggle("show", this.inLesson); this.paint(); if (!on) this.clear(); }

  // where a node (or nothing) is on the screen
  _screen(pos) {
    const cam = this.ctx.director.cam, r = this.ctx.world.renderer.domElement.getBoundingClientRect();
    const v = pos.clone().project(cam);
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }
  _target(st, f) {
    const a = st.action === "PTR" || st.action === "VAR" ? (f.ptrs[st.target] ?? null) : st.index;
    if (a == null || a === NULL || !f.nodes[a] || f.nodes[a].freed) return null;
    return Number(a);
  }
  // the visible part of the 3D view (left of the panel, above the board)
  _bounds() {
    const p = this.panel.getBoundingClientRect(), b = document.getElementById("list-board");
    const right = this.panel.classList.contains("on") ? p.left : innerWidth;
    const bottom = b && b.offsetParent ? b.getBoundingClientRect().top : innerHeight;
    return { left: 12, right: right - 12, top: 12, bottom };
  }

  cast(st, frame) {
    if (!this.enabled || !this.inLesson || !st || !st.line || st.action === "DROP") return;
    if (this.ctx.skipping && this.ctx.skipping()) return;
    const code = this.lens.lineText(st.line); if (!code || !strip(code)) return;
    this.clear(true);
    const colorOf = n => this.board.color(n);
    const a = this._target(st, frame), B = this._bounds();
    // above the pig it touches, or high in the middle when it touches none
    let anchor;
    if (a != null) { const s = this.ctx.sty.spot(String(a)); anchor = this._screen(new THREE.Vector3(s.x, 4.6, s.z - 0.6)); }
    else anchor = { x: (B.left + B.right) / 2, y: B.top + 150 };
    const el = document.createElement("div"); el.className = "am-spell";
    const say = meaning(code), res = st.message && st.message !== strip(code) ? st.message : "";
    const where = (frame.calls && frame.calls.length) ? frame.calls[frame.calls.length - 1] + "()" : "Athena";
    el.innerHTML = `<span class="am-who">LINE ${st.line} · ${esc(where)}</span><div class="am-line">${liveTokens(code, frame, colorOf)}</div>${res ? `<div class="am-res">${esc(res)}</div>` : ""}${say ? `<div class="am-say">${esc(say)}</div>` : ""}`;
    this.layer.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.max(B.left + w / 2, Math.min(B.right - w / 2, anchor.x)), y = Math.max(B.top + h, Math.min(B.bottom - 20, anchor.y));
    el.style.left = x + "px"; el.style.top = y + "px";
    this.spell = el;
    // the trail of light down to the pig, and a ring that flares round it
    if (a != null) {
      const s = this.ctx.sty.spot(String(a)), p = this._screen(new THREE.Vector3(s.x, 1.6, s.z));
      const sx = x, sy = y, mx = (sx + p.x) / 2 + (p.x > sx ? -40 : 40), my = (sy + p.y) / 2;
      const len = Math.hypot(p.x - sx, p.y - sy) * 1.2 + 40;
      const c = st.action === "PTR" || st.action === "VAR" ? colorOf(st.target) : "#f2c230";
      this.trail.innerHTML = `<path d="M${sx},${sy} Q${mx},${my} ${p.x},${p.y}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" filter="url(#am-glow)" style="--len:${len}; stroke-dasharray:${len}; animation: am-draw .5s .15s ease-out both"/>`
        + `<circle cx="${p.x}" cy="${p.y}" r="6" fill="none" stroke="${c}" stroke-width="4" filter="url(#am-glow)" style="animation: am-ring .7s .55s ease-out both"/>`
        + `<circle cx="${p.x}" cy="${p.y}" r="7" fill="${c}" filter="url(#am-glow)" style="animation: am-pop .3s .55s both"/>`;
    } else this.trail.innerHTML = "";
  }
  clear(soft = false) {
    if (this.spell) { const old = this.spell; this.spell = null; if (soft) { old.classList.add("out"); setTimeout(() => old.remove(), 300); } else old.remove(); }
    this.trail.innerHTML = "";
  }
}
