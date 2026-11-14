// director.js — the camera, directed like a film: tracking shots, low "trunk" angles,
// crash zooms and freeze-frames with a name card (the Tarantino grammar of the game).
import * as THREE from "three";
import { sound } from "./sound.js";
import { panelW } from "../learn/panelWidth.js";

export class Director {
  constructor(world, { cardRoot = document.body } = {}) {
    this.world = world;
    this.cam = world.camera;
    this.look = new THREE.Vector3(0, 2, 0);
    this.mode = null;          // null = held still, or a follow setup
    this.moves = [];
    this.card = document.createElement("div");
    this.card.className = "name-card";
    this.card.innerHTML = "<div class='nc-name'></div><div class='nc-sub'></div>";
    cardRoot.appendChild(this.card);
    world.add(this);
  }

  // jump straight to a framing
  cut(pos, look, fov = this.cam.fov) {
    this.mode = null; this.moves = [];
    this.cam.position.set(...pos); this.look.set(...look);
    this.setFov(fov);
  }
  setFov(f) { this.cam.fov = f; this.cam.updateProjectionMatrix(); }

  // glide to a framing over `seconds` (eases in and out)
  glide(pos, look, fov = this.cam.fov, seconds = 1.5) {
    this.mode = null;
    const p0 = this.cam.position.clone(), l0 = this.look.clone(), f0 = this.cam.fov;
    const p1 = new THREE.Vector3(...pos), l1 = new THREE.Vector3(...look);
    const p = this._move(seconds, k => { const e = k * k * (3 - 2 * k); this.cam.position.lerpVectors(p0, p1, e); this.look.lerpVectors(l0, l1, e); this.setFov(f0 + (fov - f0) * e); });
    this.moves[this.moves.length - 1].cam = true;
    return p;
  }

  // follow a moving thing: camera keeps an offset in the target's own frame (side, up, behind)
  follow(target, { side = 2.2, up = 1.1, back = 4.2, lookUp = 1.3, lag = 3.5, fov } = {}) {
    this.mode = { target, side, up, back, lookUp, lag };
    if (fov) this.setFov(fov);
  }

  // keep a set of points in frame (a pile, Odysseus, the crate he carries), always seen from the same
  // direction. The camera comes as close as it can while everything still fits, and slides smoothly
  // as the points move: the stack stays the biggest thing on screen, and the action never leaves it.
  //   director.frame(() => [p1, p2, ...], { dir: [-0.35, 0.3, 1], fov: 40, margin: 1.2, minDist: 3 })
  frame(points, { dir = [-0.35, 0.3, 1], fov = 40, margin = 1.18, minDist = 2.8, lag = 2.6, snap = false } = {}) {
    // stop any camera glide (and let whoever awaits it carry on); timed waits (cards, stamps) keep running
    this.moves = this.moves.filter(m => { if (m.cam) { m.res(); return false; } return true; });
    this.mode = { points, dir: new THREE.Vector3(...dir).normalize(), margin, minDist, lag, snap };
    this.setFov(fov);
  }
  // where the camera wants to be for a frame mode right now
  _framing(m) {
    const pts = m.points(); if (!pts.length) return null;
    const box = new THREE.Box3().setFromPoints(pts), c = box.getCenter(new THREE.Vector3());
    const f = m.dir.clone().negate(), r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f);
    // the part of the screen not covered by a side panel (the picture's centre is already shifted into it)
    const v = this.cam.view, ins = this.insets;
    // the part of the stage nothing covers: a page can say exactly (insets: a side panel, a board below, a strip on top)
    const visible = ins ? Math.max(0.4, 1 - (ins.left + ins.right) / innerWidth) : v && v.enabled ? Math.max(0.4, 1 - 2 * v.offsetX / v.fullWidth) : 1;
    const visV = ins ? Math.max(0.4, 1 - (ins.top + ins.bottom) / innerHeight) : v && v.enabled ? Math.max(0.4, 1 - 2 * v.offsetY / v.fullHeight) : 1;      // a board docked at the bottom
    const tv = Math.tan(THREE.MathUtils.degToRad(this.cam.fov) / 2) * visV, th = Math.tan(THREE.MathUtils.degToRad(this.cam.fov) / 2) * this.cam.aspect * visible;
    let d = m.minDist;
    for (const p of pts) {
      const rel = p.clone().sub(c), x = Math.abs(rel.dot(r)), y = Math.abs(rel.dot(u)), z = rel.dot(f);
      d = Math.max(d, x * m.margin / th - z, y * m.margin / tv - z);
    }
    return { pos: c.clone().addScaledVector(m.dir, d), look: c };
  }

  // a sudden push-in of the lens (the 70s crash zoom)
  crashZoom(toFov, seconds = 0.22) {
    const f0 = this.cam.fov;
    return this._move(seconds, k => this.setFov(f0 + (toFov - f0) * (1 - Math.pow(1 - k, 3))), true);
  }

  // stop time, drain the colour, slam a name card on screen
  async freeze(name, sub, seconds = 2.6) {
    if (this.skipping) return;
    const w = this.world;
    const before = w.timeScale;
    w.timeScale = 0;
    w.grade.uniforms.freeze.value = 1;
    this.card.querySelector(".nc-name").textContent = name;
    this.card.querySelector(".nc-sub").innerHTML = sub;
    this.card.classList.add("on"); sound.cue("freeze");
    await this._wait(seconds);
    this.card.classList.remove("on");
    w.grade.uniforms.freeze.value = 0;
    w.timeScale = before;
  }

  // slam a stencil stamp on screen: STACK OVERFLOW, THE AMPHORA IS HIS, ...
  // kind: "bad" (red), "good" (gold), "info" (cream)
  async stamp(title, sub = "", { kind = "bad", seconds = 2.4 } = {}) {
    if (!this.stampEl) {
      this.stampEl = document.createElement("div"); this.stampEl.className = "stamp";
      this.stampEl.innerHTML = "<div class='st-t'></div><div class='st-s'></div>";
      document.body.appendChild(this.stampEl);
    }
    const el = this.stampEl;
    el.querySelector(".st-t").textContent = title;
    el.querySelector(".st-s").innerHTML = sub;
    el.className = "stamp " + kind + (title.length > 18 ? " long" : "");
    void el.offsetWidth;
    el.classList.add("on");
    if (kind === "bad") { document.body.classList.remove("jolt"); void document.body.offsetWidth; document.body.classList.add("jolt"); }
    if (this.skipping) seconds = 0.05;
    await this._wait(seconds);
    el.classList.remove("on");
  }

  // Kill Bill siren: red flash, a wailing whistle, and a split screen. Left half: the line of code
  // that did it, big. Right half: the live scene, framed on the pile it happened to. Then a caption.
  //   opts: { title, sub, lineNo, lineText, focus: {x, z, y}, seconds }
  async siren({ title, sub = "", lineNo = 0, lineText = "", focus = null, seconds = 3.4 }) {
    if (!this.sirenEl) {
      const el = this.sirenEl = document.createElement("div"); el.className = "siren";
      el.innerHTML = "<div class='sr-flash'></div><div class='sr-left'><div class='sr-tag'>THE LINE</div><div class='sr-code'><span class='sr-n'></span><span class='sr-t'></span></div><div class='sr-mark'></div></div><div class='sr-cap'><div class='sr-title'></div><div class='sr-sub'></div></div>";
      document.body.appendChild(el);
    }
    const el = this.sirenEl, cam = this.cam;
    el.querySelector(".sr-n").textContent = lineNo > 0 ? lineNo : "";
    el.querySelector(".sr-t").textContent = lineText || "";
    el.querySelector(".sr-mark").textContent = lineNo > 0 ? "\u25B2 here" : "";
    el.querySelector(".sr-title").textContent = title;
    el.querySelector(".sr-sub").textContent = sub;
    // remember the shot, then frame the pile in the right half of the picture
    const before = { pos: cam.position.clone(), look: this.look.clone(), fov: cam.fov, view: cam.view ? { ...cam.view } : null, mode: this.mode };
    const panel = document.body.classList.contains("side-panel") && innerWidth > 900 ? panelW() : 0;
    const W = innerWidth - panel, H = innerHeight;
    el.style.width = W + "px";
    if (focus) {
      this.cut([focus.x + 1.5, (focus.y ?? 1.4) + 1.6, focus.z + 3.6], [focus.x, (focus.y ?? 1.4) + 0.9, focus.z], 40);
      cam.setViewOffset(innerWidth, H, innerWidth / 2 - 0.75 * W, 0, innerWidth, H);
    }
    el.className = "siren on";
    this._whistle();
    document.body.classList.remove("jolt"); void document.body.offsetWidth; document.body.classList.add("jolt");
    await this._wait(this.skipping ? 0.05 : seconds);
    el.className = "siren";
    // back to the shot from before
    cam.position.copy(before.pos); this.look.copy(before.look); this.setFov(before.fov); this.mode = before.mode;
    if (before.view && before.view.enabled) cam.setViewOffset(before.view.fullWidth, before.view.fullHeight, before.view.offsetX, before.view.offsetY, before.view.width, before.view.height);
    else cam.clearViewOffset();
  }
  // a two-note siren wail made on the spot (no sound file); quiet, and silent if audio is not allowed yet
  _whistle() {
    if (sound.muted) return;              // all sound is off for now (it comes back with the music)
    try {
      const A = this.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (A.state === "suspended") A.resume();
      const o = A.createOscillator(), g = A.createGain(), t = A.currentTime;
      o.type = "sine";
      [[0, 880], [0.35, 1320], [0.7, 880], [1.05, 1320], [1.4, 990]].forEach(([dt, f]) => o.frequency.linearRampToValueAtTime(f, t + dt + 0.12));
      o.frequency.setValueAtTime(880, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.05); g.gain.setValueAtTime(0.06, t + 1.4); g.gain.linearRampToValueAtTime(0, t + 1.8);
      o.connect(g).connect(A.destination); o.start(t); o.stop(t + 1.85);
    } catch { /* no audio: the picture still tells it */ }
  }

  _wait(seconds) { return this._move(seconds, () => {}, true); }
  _move(seconds, fn, realTime = false) { return new Promise(res => this.moves.push({ t: 0, d: Math.max(seconds, 1e-3), fn, res, realTime })); }

  update(dt, time, raw) {
    for (let i = this.moves.length - 1; i >= 0; i--) {
      const m = this.moves[i];
      m.t += m.realTime && !this.skipping ? raw : dt;
      const k = Math.min(1, m.t / m.d);
      m.fn(k);
      if (k >= 1) { this.moves.splice(i, 1); m.res(); }
    }
    if (this.mode && this.mode.points) {
      const want = this._framing(this.mode);
      if (want) {
        const k = this.mode.snap ? 1 : 1 - Math.exp(-this.mode.lag * raw);
        this.mode.snap = false;
        this.cam.position.lerp(want.pos, k); this.look.lerp(want.look, k);
      }
    } else if (this.mode) {
      const { target, side, up, back, lookUp, lag } = this.mode;
      const yaw = target.rotation.y;
      const want = new THREE.Vector3(side, up, -back).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(target.position);
      const k = 1 - Math.exp(-lag * raw);
      this.cam.position.lerp(want, k);
      this.look.lerp(new THREE.Vector3(target.position.x, target.position.y + lookUp, target.position.z), k);
    }
    this.cam.lookAt(this.look);
  }
}

// styles for the name card and chapter card (injected once)
const css = document.createElement("style");
css.textContent = `
.name-card { position: fixed; left: 7%; bottom: 18%; z-index: 30; pointer-events: none; opacity: 0; transform: translateX(-24px); transition: opacity 0.12s, transform 0.25s; }
.name-card.on { opacity: 1; transform: none; }
.nc-name { font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: clamp(48px, 8vw, 96px); line-height: 0.9; color: #f2c230; text-transform: uppercase;
           text-shadow: 4px 4px 0 #7e1a0f, 0 0 30px rgba(0,0,0,0.6); }
.stamp { position: fixed; left: 50%; top: 42%; transform: translate(-50%, -50%) scale(1.6) rotate(-4deg); z-index: 31; pointer-events: none; opacity: 0;
         text-align: center; transition: opacity 0.15s, transform 0.22s cubic-bezier(.2,1.6,.4,1); max-width: 80vw; }
.stamp.on { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(-4deg); }
@media (min-width: 901px) { body.side-panel .stamp { left: calc(50% - var(--pw, 520px) / 2); max-width: calc(90vw - var(--pw, 520px)); } }
.st-t { font-family: 'Allerta Stencil', Anton, Impact, sans-serif; font-size: clamp(40px, 7vw, 92px); letter-spacing: 3px; line-height: 1;
        padding: 6px 22px; border: 6px solid currentColor; display: inline-block; }
.st-s { margin-top: 12px; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-size: clamp(14px, 1.6vw, 20px); color: #f3e6c8; text-shadow: 2px 2px 0 #000; }
.stamp.bad .st-t { color: #e0442a; text-shadow: 0 0 18px rgba(0,0,0,0.6); background: rgba(20,6,4,0.55); }
.stamp.good .st-t { color: #f2c230; background: rgba(20,14,4,0.55); }
.siren { position: fixed; left: 0; top: 0; bottom: 0; z-index: 36; pointer-events: none; display: none; }
.siren.on { display: block; }
.siren .sr-flash { position: fixed; inset: 0; background: #d0180c; mix-blend-mode: multiply; animation: srflash 0.9s steps(2, end) 2; opacity: 0; }
@keyframes srflash { 0% { opacity: 0.85; } 50% { opacity: 0.1; } 100% { opacity: 0; } }
.siren .sr-left { position: absolute; left: 0; top: 0; bottom: 0; width: 50%; background: #0b0605; border-right: 4px solid #e8c21c; box-sizing: border-box;
  display: flex; flex-direction: column; justify-content: center; padding: 0 5%; animation: srslide 0.25s cubic-bezier(.2,.9,.3,1); }
@keyframes srslide { from { transform: translateX(-100%); } to { transform: none; } }
.siren .sr-tag { font-family: 'Courier Prime', monospace; letter-spacing: 6px; color: #e8c21c; font-size: 14px; margin-bottom: 14px; }
.siren .sr-code { font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-size: clamp(18px, 2.4vw, 34px); color: #f3e6c8; line-height: 1.3; word-break: break-word; }
.siren .sr-n { color: #e0442a; margin-right: 18px; }
.siren .sr-mark { margin-top: 10px; color: #e0442a; font-family: 'Courier Prime', monospace; font-size: 18px; padding-left: 2.2em; }
.siren .sr-cap { position: absolute; left: 0; right: 0; bottom: 9%; text-align: center; }
.siren .sr-title { display: inline-block; background: #e8c21c; color: #0b0605; font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: clamp(34px, 6vw, 80px);
  letter-spacing: 3px; line-height: 1; padding: 8px 26px 4px; text-transform: uppercase; animation: srtitle 0.3s 0.2s both cubic-bezier(.2,1.5,.4,1); }
@keyframes srtitle { from { transform: scale(1.6); opacity: 0; } to { transform: none; opacity: 1; } }
.siren .sr-sub { margin-top: 10px; font-family: 'Courier Prime', monospace; font-size: clamp(14px, 1.6vw, 20px); color: #f3e6c8; text-shadow: 2px 2px 0 #000; }
.stamp.good { top: 74%; }
.stamp.good .st-t { font-size: clamp(30px, 4.6vw, 64px); white-space: nowrap; }
.stamp.long .st-t { font-size: clamp(28px, 4.2vw, 56px); }
.stamp.info .st-t { color: #efe1c2; background: rgba(10,8,6,0.55); font-size: clamp(30px, 5vw, 64px); }
body.jolt canvas { animation: jolt 0.4s; }
@keyframes jolt { 0%,100% { transform: none; } 25% { transform: translate(-9px, 4px); } 50% { transform: translate(8px, -5px); } 75% { transform: translate(-4px, 2px); } }
.nc-sub { margin-top: 10px; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-size: clamp(14px, 1.6vw, 20px); color: #f3e6c8; text-shadow: 2px 2px 0 #000; max-width: 560px; }
`;
document.head.appendChild(css);
