// trialSet.js — the trial area of the Harbour: one pile per stack, each with its gauge and
// TOP pointer, plus the chalk manifest. It is the 3D mirror of the Java stacks:
// push() and pop() here change the picture exactly the way Stack.push/pop change the data.
import * as THREE from "three";
import { QUAY_TOP, makeStackCrate } from "./harbourScene.js";
import { StackGauge, floorStencil, Manifest } from "./dsProps.js";

export const PILE_Z = -1.6;
export const CRATE_H = 0.5;

// the stack camera: keeps the pile(s) being worked on, and Odysseus, filling the picture.
// piles() says which piles matter right now (the one in use, or all of them when nothing is happening).
export function stackFrame(director, trial, hero, piles, { snap = false } = {}) {
  trial.director = director;
  director.frame(() => {
    const ps = piles(), pts = ps.flatMap(p => trial.framePoints(p));
    // Odysseus is kept in the picture while he works at a pile; when he walks off for a crate the
    // camera stays on the stack, and he walks back into frame with it
    const h = hero.group.position;
    if (ps.some(p => Math.hypot(h.x - p.x, h.z - p.z) < 2.4)) pts.push(h.clone().add(new THREE.Vector3(0, 0.1, 0)), h.clone().add(new THREE.Vector3(0, 1.9, 0)));
    return pts;
  }, { dir: [-0.14, 0.4, 1], fov: 40, snap });
  trial.litMode = director.mode; trial.litPiles = piles;     // the learning spotlight follows the stack camera
}

// the slot outlines of one pile: every place a crate can go, up to the capacity. Empty slots are
// faint chalk-gold frames; the next free slot (where a push will land) breathes; full ones vanish
// behind their crates; the top crate gets a bright frame. The array is always visible, even empty.
function slotFrames(scene, pile) {
  const g = new THREE.Group(); scene.add(g);
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.66, CRATE_H - 0.03, 0.52));
  pile.frames = [];
  for (let i = 0; i < pile.capacity; i++) {
    const m = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xf0c33c, transparent: true, opacity: 0.3, toneMapped: false, depthWrite: false }));
    m.position.set(pile.x, QUAY_TOP + i * CRATE_H + CRATE_H / 2, pile.z);
    g.add(m); pile.frames.push(m);
  }
  return g;
}

export class TrialSet {
  // specs: [{ name, capacity, initial: [..] }], same as the level's StructureSpec list from Java
  constructor(world, crateModel, specs, { spacing = 3, base = 0x2A0, manifestAt = { x: 6.2, z: -0.4, ry: -0.45 }, decorate = null } = {}) {
    this.world = world; this.crateModel = crateModel; this.spacing = spacing; this.base = base;
    this.decorate = decorate;                 // called on every new crate (the 99 gets its golden amphora)
    this.manifest = new Manifest(world.scene, { x: manifestAt.x, y: QUAY_TOP, z: manifestAt.z, rotationY: manifestAt.ry });
    this.note = "";
    this.rebuild(specs);
    world.add(this);
  }
  // build the piles a level starts with (removing any from before)
  rebuild(specs) {
    for (const p of Object.values(this.piles || {})) {
      p.crates.forEach(c => c.parent && c.parent.remove(c));
      this.world.scene.remove(p.gauge.group, p.stencil, p.frameGroup);
      const k = this.world.updaters.indexOf(p.gauge); if (k >= 0) this.world.updaters.splice(k, 1);
    }
    this.piles = {};
    const stacks = specs.filter(s => !s.kind || s.kind === "stack");
    const x0 = -((stacks.length - 1) * this.spacing) / 2;
    stacks.forEach((s, i) => {
      const pile = { name: s.name, capacity: s.capacity, x: x0 + i * this.spacing, z: PILE_Z, crates: [], base: this.base + i * 0x20 };
      pile.gauge = this.world.add(new StackGauge(this.world.scene, { x: pile.x, y: QUAY_TOP, z: PILE_Z, capacity: s.capacity, crateHeight: CRATE_H, name: s.name, base: pile.base }));
      pile.stencil = floorStencil(this.world.scene, pile.x, QUAY_TOP, PILE_Z + 1.25, s.name);
      pile.frameGroup = slotFrames(this.world.scene, pile);
      (s.initial || []).forEach(v => this.place(pile, this.newCrate(v)));
      this.piles[s.name] = pile;
    });
    this.write("");
    if (this.onRebuild) this.onRebuild(this);
  }
  // he works from the right side of a pile, so the camera in front sees gauge, pile and him side by side
  sideSpot(pile) { return new THREE.Vector3(pile.x + 0.66, QUAY_TOP, pile.z + 0.02); }
  address(pile, i) { return "0x" + (pile.base + i * 4).toString(16).toUpperCase(); }
  newCrate(value) {
    const c = makeStackCrate(this.crateModel, value);
    this.world.scene.add(c);
    if (this.decorate) this.decorate(c, value);
    (this.made ||= []).push(c);          // every crate this trial area created, so it can tidy up
    return c;
  }
  slot(pile, i) { return new THREE.Vector3(pile.x, QUAY_TOP + i * CRATE_H, pile.z); }
  // where he stands to put a crate on, or take one off, a pile: an arm's length in front of it
  // the corners of what must be on screen for a pile: its gauge post and name board on the left,
  // every slot up to the capacity, the crane hook above, and room on the right for Odysseus
  framePoints(pile) {
    const top = QUAY_TOP + pile.capacity * CRATE_H + 1.45;
    return [new THREE.Vector3(pile.x - 1.3, QUAY_TOP - 0.05, pile.z + 0.3), new THREE.Vector3(pile.x + 1.0, top, pile.z - 0.3)];
  }
  standSpot(pile) { return new THREE.Vector3(pile.x, QUAY_TOP, pile.z + 0.86); }
  // where he stands to climb it: the climb clip needs room for his knees and hands
  climbSpot(pile) { return new THREE.Vector3(pile.x, QUAY_TOP, pile.z + 0.62); }
  // put a crate on top of a pile (no animation): used for the starting state
  place(pile, crate) {
    const i = pile.crates.length;
    crate.position.copy(this.slot(pile, i));
    crate.rotation.set(0, (Math.random() - 0.5) * 0.04, 0);
    pile.crates.push(crate);
    pile.gauge.setTop(i, true);
  }
  // after a push has landed: record it, slide the TOP pointer, rewrite the manifest
  pushed(pile, crate) {
    pile.crates.push(crate);
    pile.flash = { i: pile.crates.length - 1, t: 0.7, color: 0xfff6d0 };
    pile.gauge.setTop(pile.crates.length - 1);
    this.write();
  }
  popped(pile) {
    const c = pile.crates.pop();
    pile.flash = { i: pile.crates.length, t: 0.7, color: 0xff7a4a };
    pile.gauge.setTop(pile.crates.length - 1);
    this.write();
    return c;
  }
  top(pile) { return pile.crates[pile.crates.length - 1]; }
  // the learning spotlight: while the stack camera is on, a white key light falls on the pile(s) in
  // use, the rest of the harbour sinks into shadow, and the slot frames show where crates can go
  focusUpdate(dt) {
    const W = this.world;
    if (!this.spot) {
      const sp = this.spot = new THREE.SpotLight(0xfff1d6, 0, 14, 0.42, 0.55, 1.2);
      sp.position.set(0, QUAY_TOP + 7, PILE_Z + 3.2); W.scene.add(sp, sp.target);
      this.focusK = 0; this.pulse = 0;
    }
    const on = !!(this.director && this.litMode && this.director.mode === this.litMode);
    this.focusK += ((on ? 1 : 0) - this.focusK) * Math.min(1, dt * 3);
    this.pulse += dt;
    const ps = on && this.litPiles ? this.litPiles() : [];
    if (ps.length) {
      const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cap = Math.max(...ps.map(p => p.capacity));
      const mid = new THREE.Vector3(cx, QUAY_TOP + cap * CRATE_H * 0.5, PILE_Z);
      this.spot.position.lerp(new THREE.Vector3(cx + 0.6, QUAY_TOP + 6.5, PILE_Z + 3.4), Math.min(1, dt * 4));
      this.spot.target.position.lerp(mid, Math.min(1, dt * 4));
      this.spot.angle = ps.length > 1 ? 0.62 : 0.4;
      const v = mid.clone().project(W.camera);
      W.grade.uniforms.focusAt.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    }
    this.spot.intensity = 60 * this.focusK;
    W.grade.uniforms.focusOn.value = this.focusK;
    const breathe = 0.45 + 0.35 * Math.sin(this.pulse * 4);
    for (const p of Object.values(this.piles || {})) {
      if (!p.frames) continue;
      const lit = ps.includes(p) ? this.focusK : 0, n = p.crates.length;
      if (p.flash) p.flash.t -= dt;
      const fl = p.flash && p.flash.t > 0 ? p.flash : null;
      p.frames.forEach((f, i) => {
        f.visible = lit > 0.02;
        f.material.color.set(i === n ? 0x8fe3a0 : 0xf0c33c);
        f.material.opacity = lit * (i < n - 1 ? 0.0 : i === n - 1 ? 0.9 : i === n ? breathe : 0.28);
        f.scale.setScalar(1);
        if (fl && fl.i === i) {                       // a push lands / a pop leaves: the slot rings once
          const k = fl.t / 0.7;
          f.material.color.set(fl.color); f.material.opacity = lit; f.scale.setScalar(1 + 0.25 * (1 - k));
        }
      });
    }
  }
  // the crane hoists its hook while Odysseus is at the pile with a crate in hand, or reaching for one
  update(dt = 0) {
    this.focusUpdate(dt);
    const h = this.hero; if (!h) return;
    for (const p of Object.values(this.piles)) {
      const near = Math.hypot(h.group.position.x - p.x, h.group.position.z - p.z) < 1.4;
      p.gauge.makeRoom(near && !!(h.carrying || h.grip.crate));
    }
  }
  // empty every pile (used before a lesson or a new trial)
  clearAll() {
    for (const p of Object.values(this.piles)) { p.crates = []; p.gauge.setTop(-1); p.gauge.stow(false); }
    (this.made || []).forEach(c => c.parent && c.parent.remove(c)); this.made = [];
    this.write("");
  }
  write(note = this.note) {
    this.note = note;
    this.manifest.write(Object.values(this.piles).map(p => ({ name: p.name, capacity: p.capacity, items: p.crates.map(c => c.userData.value) })), note);
  }
}
