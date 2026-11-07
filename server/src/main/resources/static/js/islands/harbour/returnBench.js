// returnBench.js — where returned values go. When pop() hands back a crate, Odysseus sets it on
// this long bench under a chalk slate that names the variable: "a = 99". The result of every
// call stays on screen, in the world, in order.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { FONTS } from "./dsProps.js";

export const BENCH_H = 0.35;

export class ReturnBench {
  constructor(world, { x, z, slots = 4, spacing = 0.78 }) {
    this.world = world; this.slots = slots; this.spacing = spacing;
    this.x0 = x - ((slots - 1) * spacing) / 2; this.z = z;
    const g = this.group = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x4e3524, roughness: 0.9 });
    const len = slots * spacing + 0.2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.62), wood); top.position.y = BENCH_H - 0.04; g.add(top);
    for (const lx of [-len / 2 + 0.1, 0, len / 2 - 0.1]) for (const lz of [-0.24, 0.24]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, BENCH_H - 0.08, 0.07), wood); l.position.set(lx, (BENCH_H - 0.08) / 2, lz); g.add(l);
    }
    // a painted title along the front edge
    const title = this._plane(512, 64, (c, w, h) => { c.font = `34px ${FONTS.stencil}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#f0c33c"; c.fillText("RETURN VALUES", w / 2, h / 2); }, len * 0.6, len * 0.6 / 8);
    title.position.set(0, BENCH_H - 0.04, 0.315); g.add(title);
    // one chalk slate per slot, standing at the back edge
    this.slates = [];
    for (let i = 0; i < slots; i++) {
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const slate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.03), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), wood]);
      slate.position.set(this.x0 - x + i * spacing, BENCH_H + 0.52, -0.27);
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), wood); stick.position.set(slate.position.x, BENCH_H + 0.2, -0.29);
      g.add(slate, stick);
      this.slates.push({ canvas, tex, mesh: slate, pop: 0 });
      this.tag(i, "");
    }
    this.names = Array(slots).fill(""); this.held = Array(slots).fill(null);   // which variable each slot is for, and the crate on it
    g.position.set(x, QUAY_TOP, z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    world.scene.add(g);
    world.add(this);
  }
  _plane(cw, ch, draw, w, h) {
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; draw(c.getContext("2d"), cw, ch);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true }));
    return m;
  }
  // where a crate sits on slot i (its base point), and where he stands to reach it
  slot(i) { return new THREE.Vector3(this.x0 + i * this.spacing, QUAY_TOP + BENCH_H, this.z); }
  front(i) { const p = this.slot(i); return new THREE.Vector3(p.x, QUAY_TOP, this.z + 0.78); }
  // write on slot i's slate, e.g. "a = 99" (red for an error value)
  tag(i, text, { bad = false } = {}) {
    const s = this.slates[i], g = s.canvas.getContext("2d"), w = s.canvas.width, h = s.canvas.height;
    g.fillStyle = "#1f2622"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(220,220,210,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 20, 1 + Math.random() * 2); }
    if (text) {
      g.font = `64px ${FONTS.chalk}`; g.textAlign = "center"; g.textBaseline = "middle";
      for (let k = 0; k < 3; k++) { g.globalAlpha = 0.4; g.fillStyle = bad ? "#f2a07a" : "#ece6d6"; g.fillText(text, w / 2 + (Math.random() - 0.5) * 2, h / 2 + (Math.random() - 0.5) * 2); }
      g.globalAlpha = 1;
      for (let k = 0; k < 1500; k++) { g.fillStyle = "rgba(31,38,34,0.5)"; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
      s.pop = 1;                                     // a little bounce when it is written
    }
    s.tex.needsUpdate = true;
  }
  // the slot for a variable: the one already named after it, else the first free one
  slotFor(name) {
    let i = this.names.indexOf(name);
    if (i < 0) i = this.names.findIndex((n, k) => !n && !this.held[k]);
    if (i < 0) i = this.held.findIndex(c => !c);
    if (i < 0) i = 0;
    this.names[i] = name;
    return i;
  }
  // a crate has been set on slot i: an older value of the same variable is overwritten (it leaves the bench)
  put(i, crate, text, opts) {
    const old = this.held[i];
    if (old && old !== crate && old.parent) old.parent.remove(old);
    this.held[i] = crate; this.tag(i, text, opts);
  }
  // he picks the crate back up (push(&s, a) copies a: the slate still says what a holds)
  take(i) { const c = this.held[i]; this.held[i] = null; return c; }
  findValue(v) { return this.held.findIndex(c => c && c.userData.value === v); }
  clear() { for (let i = 0; i < this.slots; i++) this.tag(i, ""); this.names.fill(""); this.held.fill(null); }
  update(dt) { for (const s of this.slates) { if (s.pop > 0) { s.pop = Math.max(0, s.pop - dt * 2.5); s.mesh.scale.setScalar(1 + Math.sin(s.pop * Math.PI) * 0.18); } } }
}
