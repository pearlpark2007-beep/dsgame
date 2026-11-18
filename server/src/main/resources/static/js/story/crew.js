// crew.js — Odysseus's men for the films: copies of his own marble figure (same skeleton, same clips),
// each with its own tint, name and motion. Phase 1 of the narrative redesign (see the screenplay doc).
//
//   const crew = await Crew.ready(world, hero);                 // after hero.load()
//   const eury = crew.add({ name: "Eurylochus", tint: 0xb9b0a2 });
//   eury.place(3, 0, -2, Math.PI); eury.play("idle");
//   await eury.walkTo(0, 4, { speed: 3.4, clip: "run" });       // "run" falls back to a fast walk if run.fbx is absent
//   crew.dispose();                                             // the film's clean-up: every figure gone
//
// Only films create crew; gameplay never loads them. Nothing in hero.js is changed: a crewman is a clone
// of the loaded hero.body, driven by his own mixer with the hero's clips.
//
// Optional Mixamo clips (sit, point, drink, yell, talk, run): if a file is in assets/odysseus/, it is used;
// if not, loadOptional() quietly returns without it and every call falls back (see FALLBACK below).
// Where they play: sit, Troy (the men inside the horse) · run, Troy (the men slipping away from the horse)
// · drink, Troy (the libation on the prow) · point, the Harbour (Polites at the silent cliffs)
// · talk, the Cave (Eurylochus: "We have enough, Captain.") · yell, the Cave's end ("Odysseus of Ithaca!")
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { pinRoot } from "../engine/hero.js";

const BONE = n => "mixamorig" + n;
const WALK_CLIP_SPEED = 1.72;                 // the walk clip's own speed (m/s), as in hero.js
const RUN_CLIP_SPEED = 5.4;                   // run.fbx's own speed (m/s) before it is pinned in place (3.76 m in 0.63 s, times HIPS_SCALE)
// The optional clips were downloaded on a taller Mixamo character than idle.fbx and walk.fbx: his hips stand
// 103 cm high there against 93 cm on ours. Scaling the hips' movement by 93/103 keeps his feet on the ground
// (and puts a sitting man's seat at the right height). Rotations need no change: the skeleton is the same.
const HIPS_SCALE = 0.9;

// ---------- optional clips: file name, whether it plays once, and what stands in for it when it is missing
export const OPTIONAL = {
  sit:   { once: false },
  point: { once: true },
  drink: { once: true },
  yell:  { once: true },
  talk:  { once: false },
  run:   { once: false, inPlace: true }
};
// the stand-in when a clip is missing: the clip to play instead, and its speed
const FALLBACK = { sit: ["idle", 0.3], point: ["idle", 1], drink: ["idle", 1], yell: ["idle", 1], talk: ["idle", 1], run: ["walk", 2] };

const cache = new Map();                      // dir + name -> Promise<AnimationClip | null>
// Load whichever optional clips exist. Missing files resolve to null (no exception, nothing breaks).
export function loadOptional(names = Object.keys(OPTIONAL), dir = "assets/odysseus/") {
  const L = new FBXLoader();
  return Promise.all(names.map(name => {
    const key = dir + name;
    if (!cache.has(key)) {
      cache.set(key, fetch(dir + name + ".fbx", { method: "HEAD" })
        .then(r => (r.ok ? L.loadAsync(dir + name + ".fbx") : null))
        .then(fbx => {
          const clip = fbx && fbx.animations && fbx.animations[0];
          if (!clip) return null;
          clip.name = name;
          const hips = clip.tracks.find(t => /Hips\.position$/.test(t.name));
          if (hips) for (let i = 0; i < hips.values.length; i++) hips.values[i] *= HIPS_SCALE;
          if (OPTIONAL[name] && OPTIONAL[name].inPlace) pinRoot(clip, ["x", "z"]);
          return clip;
        })
        .catch(() => null));
    }
    return cache.get(key).then(clip => [name, clip]);
  })).then(pairs => Object.fromEntries(pairs.filter(([, c]) => c)));
}
// give a figure (the Hero, or a crewman) the optional clips that loaded. Leaves hero.js untouched: it only
// adds entries to the figure's own clips/actions maps, which Hero.play() already reads.
export function addClips(fig, clips) {
  for (const [k, clip] of Object.entries(clips)) {
    if (fig.actions[k]) continue;
    fig.clips[k] = clip; fig.actions[k] = fig.mixer.clipAction(clip);
    if (OPTIONAL[k] && OPTIONAL[k].once) { fig.actions[k].setLoop(THREE.LoopOnce); fig.actions[k].clampWhenFinished = true; }
  }
  return fig;
}
// an optional clip with some bones taken from another clip instead (idle, by default), under a new name, for a
// figure whose hands are busy. Mixamo's Drinking lifts the LEFT hand; a film that keeps the cup in the right
// hand takes the drink's head and body, and the left arm from idle (left out, it would fall to the model's T-pose).
// Returns the new name, or null if the clip did not load.
export function withoutBones(fig, name, newName, bones, from = "idle") {
  const clip = fig.clips[name], other = fig.clips[from]; if (!clip) return null;
  if (!fig.actions[newName]) {
    const tracks = clip.tracks.filter(t => !bones.test(t.name)).concat(other ? other.tracks.filter(t => bones.test(t.name)) : []);
    const c = new THREE.AnimationClip(newName, clip.duration, tracks);
    fig.clips[newName] = c; fig.actions[newName] = fig.mixer.clipAction(c);
    if (OPTIONAL[name] && OPTIONAL[name].once) { fig.actions[newName].setLoop(THREE.LoopOnce); fig.actions[newName].clampWhenFinished = true; }
  }
  return newName;
}
// the clip a film should ask for: the optional one if it loaded, else its stand-in (and that stand-in's speed)
export function clipFor(fig, name) {
  if (fig.actions[name]) return [name, 1];
  const f = FALLBACK[name];
  return f && fig.actions[f[0]] ? f : ["idle", 1];
}

// ---------- the arm helper: put a hand at a point in the world (two-bone IK, the same maths hero.js uses
// for crates, kept here so hero.js does not change). Run AFTER the mixer each frame, so the clip doesn't undo it.
const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function rotateWorld(bone, q) {
  bone.parent.getWorldQuaternion(_pq);
  const world = _pq.clone().multiply(bone.quaternion);
  bone.quaternion.copy(_pq.invert().multiply(q.clone().multiply(world)));
  bone.updateMatrixWorld(true);
}
export function reachArm(bones, side, target, weight = 1, pole = new THREE.Vector3(0, -1, 0)) {
  const arm = bones[side + "Arm"], fore = bones[side + "Fore"], hand = bones[side + "Hand"];
  if (!arm || !fore || !hand || weight <= 0) return;
  const qa0 = arm.quaternion.clone(), qf0 = fore.quaternion.clone();
  arm.getWorldPosition(_S); fore.getWorldPosition(_E); hand.getWorldPosition(_W);
  const a = _S.distanceTo(_E), b = _E.distanceTo(_W);
  const d = Math.min(_S.distanceTo(target), a + b - 1e-3);
  const u = _S.clone().sub(_E), v = _W.clone().sub(_E);
  const want = Math.acos(THREE.MathUtils.clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  let axis = new THREE.Vector3().crossVectors(u, v);
  if (axis.lengthSq() < 1e-8) axis = pole.clone();
  axis.normalize();
  rotateWorld(fore, _q.setFromAxisAngle(axis, want - u.angleTo(v)));
  hand.getWorldPosition(_W);
  rotateWorld(arm, _q.setFromUnitVectors(_W.sub(_S).normalize(), target.clone().sub(_S).normalize()));
  if (weight < 1) {
    arm.quaternion.copy(qa0.slerp(arm.quaternion.clone(), weight));
    fore.quaternion.copy(qf0.slerp(fore.quaternion.clone(), weight));
    arm.updateMatrixWorld(true);
  }
}
// hold a hand on a moving target for a while: target() and weight() are read every frame. Returns { stop() }.
// Add it AFTER the figure is in the world, so it runs after the figure's mixer.
export function holdReach(world, bones, side, target, weight = () => 1) {
  const u = { update: () => { const w = weight(); if (w > 0) reachArm(bones, side, target(), w); } };
  world.add(u);
  return { stop() { const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); } };
}

// ---------- one crewman
const ease = k => k * k * (3 - 2 * k);
export class Crewman {
  constructor(world, hero, { name = "", tint = 0xc9c0b0, cord = false, shadow = true } = {}) {
    this.world = world; this.name = name; this.pace = 1;
    this.group = new THREE.Group(); this.group.name = "crew:" + name;
    const body = this.body = cloneSkinned(hero.body);
    // whatever a film has hung on Odysseus's bones (a torch, a stake, a cup) is not part of a crewman
    const extras = []; body.traverse(o => { if (o.isBone) for (const c of o.children) if (!c.isBone) extras.push(c); });
    for (const c of extras) c.parent.remove(c);
    // his own marble: the hero's texture, a little darker or warmer, so men read apart from Odysseus
    this.material = hero.marble.clone(); this.material.color = new THREE.Color(tint);
    body.traverse(o => { if (o.isSkinnedMesh) { o.material = this.material; o.castShadow = shadow; o.receiveShadow = shadow; o.frustumCulled = false; } });
    this.group.add(body);
    const B = n => body.getObjectByName(BONE(n));
    this.bones = { hips: B("Hips"), head: B("Head"), lArm: B("LeftArm"), lFore: B("LeftForeArm"), lHand: B("LeftHand"),
                   rArm: B("RightArm"), rFore: B("RightForeArm"), rHand: B("RightHand") };
    this.mixer = new THREE.AnimationMixer(body);
    this.clips = {}; this.actions = {};
    for (const k of ["idle", "walk", "pickup", "putdown", "climb", "fall"]) if (hero.clips[k]) {
      this.clips[k] = hero.clips[k]; this.actions[k] = this.mixer.clipAction(hero.clips[k]);
    }
    for (const k of ["pickup", "putdown", "fall"]) if (this.actions[k]) { this.actions[k].setLoop(THREE.LoopOnce); this.actions[k].clampWhenFinished = true; }
    if (cord) this.addCord();
    this.base = null;
    world.scene.add(this.group);
    world.add(this);
    this.play("idle", 0, { offset: Math.random() * 2 });     // men in a crowd should not breathe in step
  }
  // Elpenor's red cord: a thin red band round the right wrist (the screenplay's one visual thread)
  addCord() {
    const hand = this.bones.rHand; if (!hand || this.cord) return;
    const cord = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.9, 6, 16), new THREE.MeshStandardMaterial({ color: 0xb3141b, roughness: 0.75 }));
    cord.rotation.x = Math.PI / 2;           // the bone's Y runs down the arm: the ring lies across it
    cord.position.y = -2;                     // just above the wrist joint, on the forearm (bone units are cm)
    cord.castShadow = false; hand.add(cord); this.cord = cord;
  }
  place(x, y, z, yaw = this.group.rotation.y) { this.group.position.set(x, y, z); this.group.rotation.y = yaw; return this; }
  face(x, z) { this.group.rotation.y = Math.atan2(x - this.group.position.x, z - this.group.position.z); return this; }
  // play a clip by name; a missing optional clip plays its stand-in instead (see FALLBACK)
  play(name, fade = 0.35, { timeScale = 1, offset = 0 } = {}) {
    const [k, ts] = clipFor(this, name);
    const a = this.actions[k];
    if (this.base !== a) {
      a.reset(); a.time = offset % (a.getClip().duration || 1); a.timeScale = timeScale * ts; a.setEffectiveWeight(1); a.fadeIn(fade).play();
      if (this.base) this.base.fadeOut(fade);
      this.base = a;
    } else a.timeScale = timeScale * ts;
    return a;
  }
  over(seconds, fn) {
    return new Promise(res => {
      let t = 0;
      const u = { update: dt => { t += dt * this.pace; const k = Math.min(1, t / seconds); fn(k); if (k >= 1) { const i = this.world.updaters.indexOf(u); if (i >= 0) this.world.updaters.splice(i, 1); res(); } } };
      this.world.add(u);
    });
  }
  wait(seconds) { return this.over(seconds, () => {}); }
  // walk (or run) straight to a point, turning toward it; the clip's speed matches the ground speed
  async walkTo(x, z, { speed = 1.35, clip = "walk", turn = 0.25 } = {}) {
    const from = this.group.position.clone(), to = new THREE.Vector3(x, from.y, z), dist = from.distanceTo(to);
    if (dist < 0.01) return;
    const yaw0 = this.group.rotation.y, yaw1 = Math.atan2(x - from.x, z - from.z);
    let dy = yaw1 - yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const [k, ts] = clipFor(this, clip);
    const clipSpeed = k === "walk" ? WALK_CLIP_SPEED * ts : k === "run" ? RUN_CLIP_SPEED : speed;   // the legs keep pace with the ground
    this.play(clip, 0.25, { timeScale: speed / clipSpeed });
    const seconds = dist / speed;
    await this.over(seconds, k2 => {
      this.group.rotation.y = yaw0 + dy * Math.min(1, (k2 * seconds) / turn);
      this.group.position.lerpVectors(from, to, k2);
    });
    this.play("idle", 0.4);
  }
  // turn on the spot to face a point, over a short time
  async turnTo(x, z, seconds = 0.6) {
    const yaw0 = this.group.rotation.y, yaw1 = Math.atan2(x - this.group.position.x, z - this.group.position.z);
    let dy = yaw1 - yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    await this.over(seconds, k => { this.group.rotation.y = yaw0 + dy * ease(k); });
  }
  update(dt) { this.mixer.update(dt * this.pace); }
  dispose() {
    const i = this.world.updaters.indexOf(this); if (i >= 0) this.world.updaters.splice(i, 1);
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.body);
    this.world.scene.remove(this.group);
    this.material.dispose();
    // each cloned skeleton keeps its own bone texture on the GPU: free it, or every respawn leaks one per mesh
    const sk = new Set(); this.body.traverse(o => { if (o.isSkinnedMesh && o.skeleton) sk.add(o.skeleton); });
    for (const s of sk) s.dispose();
    if (this.cord) { this.cord.geometry.dispose(); this.cord.material.dispose(); }
  }
}

// ---------- the crew of one film: makes men, and removes every one of them in one call (film clean-up)
export class Crew {
  static async ready(world, hero, { optional = true } = {}) {
    const crew = new Crew(world, hero);
    if (optional) crew.optional = await loadOptional();
    return crew;
  }
  constructor(world, hero) { this.world = world; this.hero = hero; this.men = []; this.optional = {}; }
  add(opts = {}) {
    const m = new Crewman(this.world, this.hero, opts);
    addClips(m, this.optional);
    this.men.push(m); return m;
  }
  get(name) { return this.men.find(m => m.name === name) || null; }
  dispose() { for (const m of this.men) m.dispose(); this.men = []; }
}
