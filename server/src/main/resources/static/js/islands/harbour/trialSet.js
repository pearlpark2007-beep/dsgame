// trialSet.js — the trial area of the Harbour: one pile per stack, each with its gauge and
// TOP pointer, plus the chalk manifest. It is the 3D mirror of the Java stacks:
// push() and pop() here change the picture exactly the way Stack.push/pop change the data.
import * as THREE from "three";
import { QUAY_TOP, makeStackCrate } from "./harbourScene.js";
import { StackGauge, floorStencil, Manifest } from "./dsProps.js";

export const PILE_Z = -1.6;
export const CRATE_H = 0.5;

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
      this.world.scene.remove(p.gauge.group, p.stencil);
      const k = this.world.updaters.indexOf(p.gauge); if (k >= 0) this.world.updaters.splice(k, 1);
    }
    this.piles = {};
    const stacks = specs.filter(s => !s.kind || s.kind === "stack");
    const x0 = -((stacks.length - 1) * this.spacing) / 2;
    stacks.forEach((s, i) => {
      const pile = { name: s.name, capacity: s.capacity, x: x0 + i * this.spacing, z: PILE_Z, crates: [], base: this.base + i * 0x20 };
      pile.gauge = this.world.add(new StackGauge(this.world.scene, { x: pile.x, y: QUAY_TOP, z: PILE_Z, capacity: s.capacity, crateHeight: CRATE_H, name: s.name, base: pile.base }));
      pile.stencil = floorStencil(this.world.scene, pile.x, QUAY_TOP, PILE_Z + 1.25, s.name);
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
    pile.gauge.setTop(pile.crates.length - 1);
    this.write();
  }
  popped(pile) {
    const c = pile.crates.pop();
    pile.gauge.setTop(pile.crates.length - 1);
    this.write();
    return c;
  }
  top(pile) { return pile.crates[pile.crates.length - 1]; }
  // the crane hoists its hook while Odysseus is at the pile with a crate in hand, or reaching for one
  update() {
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
