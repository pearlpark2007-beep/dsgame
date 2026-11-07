// hero.js — Odysseus: a rigged marble figure driven by motion-capture clips (Mixamo).
// Every action returns a Promise, so a cinematic reads like a script:
//     await hero.walkTo(x, z); await hero.lift(crate); await hero.place(slot);
//
// Three systems keep him grounded:
//   • NAV  — walkTo() follows a path around obstacles (see nav.js), turning as he walks
//   • IK   — while he holds a crate, his arms are bent by code so his hands land exactly on the crate's
//            sides (two-bone "inverse kinematics": we choose where the hand must be, maths finds the angles)
//   • HOLD — a crate is carried in front of his body, never inside it
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { marbleTexture } from "./textures.js";

const ARM = /(Shoulder|Arm|ForeArm|Hand)/;
const BONE = n => "mixamorig" + n;
const WALK_CLIP_SPEED = 1.72;                // metres per second the walk clip was recorded at
const CARRY = new THREE.Vector3(0, 0.66, 0.42);  // where a held crate's base sits, in his own frame (in front of the belly)
const ease = k => k * k * (3 - 2 * k);

function cut(clip, name, from, to, keep = () => true) {
  const tracks = [];
  for (const t of clip.tracks) {
    if (!keep(t.name)) continue;
    const times = [], values = [], size = t.getValueSize();
    for (let i = 0; i < t.times.length; i++) {
      if (t.times[i] < from - 1e-4 || t.times[i] > to + 1e-4) continue;
      times.push(t.times[i] - from);
      for (let k = 0; k < size; k++) values.push(t.values[i * size + k]);
    }
    if (times.length) tracks.push(new t.constructor(t.name, times, values));
  }
  return new THREE.AnimationClip(name, to - from, tracks);
}
function pose(clip, name, t, keep) {
  const tracks = [];
  for (const tr of clip.tracks) {
    if (!keep(tr.name)) continue;
    const out = new Float32Array(tr.getValueSize());
    const v = Array.from(tr.createInterpolant(out).evaluate(t));
    tracks.push(new tr.constructor(tr.name, [0, 1], [...v, ...v]));
  }
  return new THREE.AnimationClip(name, 1, tracks);
}
function pinRoot(clip, axes) {
  const tr = clip.tracks.find(t => /Hips\.position$/.test(t.name));
  if (!tr) return clip;
  for (const a of axes) { const k = { x: 0, y: 1, z: 2 }[a], first = tr.values[k]; for (let i = k; i < tr.values.length; i += 3) tr.values[i] = first; }
  return clip;
}

// ---------- two-bone IK: bend the elbow to the right angle, then aim the shoulder at the target
const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function rotateWorld(bone, q) {
  bone.parent.getWorldQuaternion(_pq);
  const world = _pq.clone().multiply(bone.quaternion);
  bone.quaternion.copy(_pq.invert().multiply(q.clone().multiply(world)));
  bone.updateMatrixWorld(true);
}
function solveArm(arm, fore, hand, target, weight, poleHint) {
  if (weight <= 0) return;
  const qa0 = arm.quaternion.clone(), qf0 = fore.quaternion.clone();
  arm.getWorldPosition(_S); fore.getWorldPosition(_E); hand.getWorldPosition(_W);
  const a = _S.distanceTo(_E), b = _E.distanceTo(_W);
  const d = Math.min(_S.distanceTo(target), a + b - 1e-3);
  const u = _S.clone().sub(_E), v = _W.clone().sub(_E);
  const cur = u.angleTo(v);
  const want = Math.acos(THREE.MathUtils.clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  let axis = new THREE.Vector3().crossVectors(u, v);
  if (axis.lengthSq() < 1e-8) axis = poleHint.clone();
  axis.normalize();
  rotateWorld(fore, _q.setFromAxisAngle(axis, want - cur));
  hand.getWorldPosition(_W);
  rotateWorld(arm, _q.setFromUnitVectors(_W.sub(_S).normalize(), target.clone().sub(_S).normalize()));
  if (weight < 1) {
    arm.quaternion.copy(qa0.slerp(arm.quaternion.clone(), weight));
    fore.quaternion.copy(qf0.slerp(fore.quaternion.clone(), weight));
    arm.updateMatrixWorld(true);
  }
}

export class Hero {
  constructor(world, { nav = null, groundY = 0 } = {}) {
    this.world = world; this.nav = nav; this.groundY = groundY;
    this.group = new THREE.Group();
    this.speed = 1.35;                       // a measured, kingly walk (m/s)
    this.carrying = null;                    // the crate in his hands
    this.grip = { crate: null, w: 0 };       // what his hands hold, and how strongly IK pulls them there (0..1)
  }

  async load(dir = "assets/odysseus/") {
    const L = new FBXLoader();
    const get = n => L.loadAsync(dir + n + ".fbx");
    const [body, walk, pickup, putdown, climb, fall, sweep] = await Promise.all(["idle", "walk", "pickup", "putdown", "climb", "fall", "sweepfall"].map(get));
    this.body = body;
    body.scale.setScalar(0.01);                                    // Mixamo works in centimetres
    const m = marbleTexture({ seed: 33, base: [226, 220, 208], grime: [120, 116, 108] });
    this.marble = new THREE.MeshStandardMaterial({ ...m, roughness: 0.42, envMapIntensity: 1.1 });
    // one material for the whole body, so he reads as a single carved statue
    body.traverse(o => { if (o.isSkinnedMesh) { o.material = this.marble; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    this.group.add(body);
    this.world.scene.add(this.group);
    const B = n => body.getObjectByName(BONE(n));
    this.bones = { hips: B("Hips"), head: B("Head"),
                   lArm: B("LeftArm"), lFore: B("LeftForeArm"), lHand: B("LeftHand"),
                   rArm: B("RightArm"), rFore: B("RightForeArm"), rHand: B("RightHand") };

    const isArm = n => ARM.test(n), notArm = n => !ARM.test(n);
    const raw = { idle: body.animations[0], walk: walk.animations[0], pickup: pickup.animations[0], putdown: putdown.animations[0],
                  climb: climb.animations[0], fall: fall.animations[0], sweep: sweep.animations[0] };
    pinRoot(raw.walk, ["x", "z"]);
    pinRoot(raw.climb, ["y", "z"]);
    this.clips = {
      idle: raw.idle,
      walk: raw.walk,
      carryWalk: cut(raw.walk, "carryWalk", 0, raw.walk.duration, notArm),   // legs walk; the arms are posed and then IK'd onto the crate
      carryIdle: cut(raw.idle, "carryIdle", 0, raw.idle.duration, notArm),
      hold: pose(raw.pickup, "hold", 5.25, isArm),                            // arms forward, hands about shoulder-width apart
      pickup: cut(raw.pickup, "pickup", 0.8, 6.0),                            // bend (hands lowest ~1.6 s in), straighten
      putdown: cut(raw.putdown, "putdown", 1.4, 8.4),                         // lower (hands lowest ~4.4 s in), straighten
      climb: raw.climb,
      fall: raw.fall,
      slip: raw.sweep
    };
    this.mixer = new THREE.AnimationMixer(body);
    this.actions = {};
    for (const [k, c] of Object.entries(this.clips)) this.actions[k] = this.mixer.clipAction(c);
    for (const k of ["pickup", "putdown", "fall", "slip"]) { this.actions[k].setLoop(THREE.LoopOnce); this.actions[k].clampWhenFinished = true; }
    this.base = null; this.layer = null;
    this.play("idle", 0);
    this.world.add(this);
    return this;
  }

  play(name, fade = 0.35, { timeScale = 1, layer = null } = {}) {
    const a = this.actions[name];
    if (this.base !== a) {
      a.reset(); a.timeScale = timeScale; a.setEffectiveWeight(1); a.fadeIn(fade).play();
      if (this.base) this.base.fadeOut(fade);
      this.base = a;
    } else a.timeScale = timeScale;
    const l = layer ? this.actions[layer] : null;
    if (this.layer !== l) {
      if (l) { l.reset(); l.fadeIn(fade).play(); }
      if (this.layer) this.layer.fadeOut(fade);
      this.layer = l;
    }
    return a;
  }
  stand(fade = 0.35) { return this.carrying ? this.play("carryIdle", fade, { layer: "hold" }) : this.play("idle", fade); }

  wait(seconds) { return this.over(seconds, () => {}); }
  over(seconds, fn) {
    return new Promise(res => {
      let t = 0;
      const u = { update: dt => { t += dt; const k = Math.min(1, t / seconds); fn(k); if (k >= 1) { this.world.updaters.splice(this.world.updaters.indexOf(u), 1); res(); } } };
      this.world.add(u);
    });
  }

  yawTo(x, z) { return Math.atan2(x - this.group.position.x, z - this.group.position.z); }
  async face(x, z, seconds = 0.45) {
    const from = this.group.rotation.y;
    let d = this.yawTo(x, z) - from; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < 0.04) return;
    if (!this.carrying) this.play("walk", 0.2, { timeScale: 0.45 });    // small steps while turning on the spot
    await this.over(seconds * Math.min(1, Math.abs(d) / 1.5 + 0.4), k => this.group.rotation.y = from + d * ease(k));
    this.stand(0.25);
  }

  // walk along a path that goes around everything solid, turning smoothly into each leg
  async walkTo(x, z, { speed = this.speed } = {}) {
    const p = this.group.position;
    const pts = this.nav ? this.nav.path(p.x, p.z, x, z) : [{ x, z }];
    if (Math.hypot(x - p.x, z - p.z) < 0.05) return;
    await this.face(pts[0].x, pts[0].z, 0.35);
    const carry = !!this.carrying;
    this.play(carry ? "carryWalk" : "walk", 0.25, { timeScale: speed / WALK_CLIP_SPEED, layer: carry ? "hold" : null });
    for (const pt of pts) {
      const from = p.clone(), to = new THREE.Vector3(pt.x, p.y, pt.z), dist = from.distanceTo(to);
      if (dist < 0.02) continue;
      const yaw = Math.atan2(to.x - from.x, to.z - from.z);
      await this.over(dist / speed, k => {
        p.lerpVectors(from, to, k);
        let d = yaw - this.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        this.group.rotation.y += d * Math.min(1, 0.18);                  // turn into the new direction as he walks
      });
    }
    this.stand(0.3);
  }

  // where a held crate rests (base point), in the world
  carrySpot(out = new THREE.Vector3()) { return out.copy(CARRY).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y).add(this.group.position); }

  // move a crate between two spots while his hands stay on it
  _carryCrate(crate, from, to, seconds, yawFrom, yawTo, lift = 0) {
    return this.over(seconds, k => {
      const e = ease(k);
      crate.position.lerpVectors(from, to, e); crate.position.y += Math.sin(Math.PI * e) * lift;
      crate.rotation.y = yawFrom + (yawTo - yawFrom) * e;
    });
  }

  // LIFT: take a crate that is in front of him (on a trestle, or the top of a pile) into his arms
  async lift(crate) {
    await this.face(crate.position.x, crate.position.z);
    const low = crate.position.y < this.group.position.y + 0.6;
    const from = crate.position.clone(), yaw0 = crate.rotation.y, spot = new THREE.Vector3();
    this.grip.crate = crate;
    if (low) {
      // bend down (the pickup clip), close the hands on it, rise with it
      const ts = 1.55;
      this.play("pickup", 0.25, { timeScale: ts });
      await this.over(1.5 / ts, k => this.grip.w = ease(k));
      await this.over(3.4 / ts, k => { this.carrySpot(spot); const e = ease(k); crate.position.lerpVectors(from, spot, e); crate.rotation.y = yaw0 + (this.group.rotation.y - yaw0) * e; });
    } else {
      // reach forward to the pile's top, then draw the crate back to his chest
      this.play("carryIdle", 0.5, { layer: "hold" });
      await this.over(0.6, k => this.grip.w = ease(k));       // arms rise and the hands settle on the crate together
      await this.over(0.8, k => { this.carrySpot(spot); const e = ease(k); crate.position.lerpVectors(from, spot, e); crate.position.y += Math.sin(Math.PI * k) * 0.08; crate.rotation.y = yaw0 + (this.group.rotation.y - yaw0) * e; });
    }
    this.carrying = crate;
    this.stand(0.3);
  }

  // PLACE: set the held crate down at `at` (its base point): a pile slot, or a trestle
  async place(at, yaw = this.group.rotation.y) {
    const crate = this.carrying;
    await this.face(at.x, at.z);
    const from = crate.position.clone(), y0 = crate.rotation.y;
    this.carrying = null;                   // from here the crate moves by this script, not by his walk
    if (at.y < this.group.position.y + 0.6) {
      const ts = 1.7;
      this.play("putdown", 0.25, { timeScale: ts });
      await this._carryCrate(crate, from, at, 4.3 / ts, y0, yaw);
      crate.position.copy(at); crate.rotation.y = yaw;
      // hands come off the crate gently while he straightens up
      await this.over(0.6, k => this.grip.w = 1 - ease(k));
      await this.wait(Math.max(0, 1.6 / ts - 0.6));
      this.play("idle", 0.6);
    } else {
      this.play("carryIdle", 0.25, { layer: "hold" });
      await this._carryCrate(crate, from, at, 0.9, y0, yaw, 0.1);
      crate.position.copy(at); crate.rotation.y = yaw;
      // let go: the arms ease from the crate back to the resting pose together
      this.play("idle", 0.7);
      await this.over(0.6, k => this.grip.w = 1 - ease(k));
    }
    this.grip.crate = null; this.grip.w = 0;
    return crate;
  }

  // REACH for something that is not there (underflow): hands close on air, then fall back
  async reachFor(at) {
    await this.face(at.x, at.z);
    const air = new THREE.Object3D(); air.position.copy(at); air.rotation.y = this.group.rotation.y; air.userData = { width: 0.6, height: 0.5 };
    this.grip.crate = air;
    this.play("carryIdle", 0.5, { layer: "hold" });
    await this.over(0.6, k => this.grip.w = ease(k));
    await this.over(0.35, k => air.userData.width = 0.6 - 0.35 * k);      // the hands close on nothing
    await this.wait(0.4);
    this.play("idle", 0.7);
    await this.over(0.6, k => this.grip.w = 1 - ease(k));
    this.grip.crate = null; this.grip.w = 0;
  }

  // CLIMB a pile of `height` metres whose front face is in front of him, then step onto its top
  async climb(height, topCentre) {
    await this.face(topCentre.x, topCentre.z);
    const rate = 1.21 / 2.0;                  // the climb clip rises 1.21 m per 2 s loop
    const ts = 1.1;
    this.play("climb", 0.3, { timeScale: ts });
    const p0 = this.group.position.clone();
    await this.over(height / (rate * ts), k => { this.group.position.copy(p0); this.group.position.y = p0.y + height * k; });
    this.play("walk", 0.3, { timeScale: 0.6 });
    const top = new THREE.Vector3(topCentre.x, p0.y + height, topCentre.z);
    const from = this.group.position.clone();
    await this.over(0.7, k => this.group.position.lerpVectors(from, top, ease(k)));
    this.stand(0.4);
  }

  // FALL: topple backwards; if he is up on something, he falls clear of it and gravity brings him down
  async fall(kind = "slip", { groundY = this.group.position.y, back = 0 } = {}) {
    this.play(kind, 0.12);
    const p0 = this.group.position.clone(), drop = p0.y - groundY, d = this.clips[kind].duration;
    const backDir = new THREE.Vector3(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
    if (drop > 0.01 || back) {
      await this.over(d * 0.55, k => { this.group.position.copy(p0).addScaledVector(backDir, back * Math.sin(k * Math.PI / 2)); this.group.position.y = p0.y - drop * k * k; });
      await this.wait(d * 0.45);
    } else await this.wait(d);
  }

  // put him somewhere instantly (used when a cutscene is skipped)
  teleport(x, z, yaw = this.group.rotation.y, y = this.groundY) {
    this.group.position.set(x, y, z); this.group.rotation.set(0, yaw, 0);
    this.carrying = null; this.grip.crate = null; this.grip.w = 0;
    this.play("idle", 0.01);
  }

  update(dt) {
    if (!this.mixer) return;
    this.mixer.update(dt);
    if (this.carrying) { this.carrySpot(this.carrying.position); this.carrying.rotation.y = this.group.rotation.y; }
    const g = this.grip;
    if (g.crate && g.w > 0) {
      this.body.updateMatrixWorld(true);
      const c = g.crate, yaw = c.rotation.y;
      const down = new THREE.Vector3(0, -1, 0);
      const bodyLeft = new THREE.Vector3(Math.cos(this.group.rotation.y), 0, -Math.sin(this.group.rotation.y));
      // the crate has two pairs of side faces; his hands go on the pair that lies across his body
      const ax = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), az = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const useX = Math.abs(ax.dot(bodyLeft)) >= Math.abs(az.dot(bodyLeft));
      const left = useX ? ax : az;
      const half = (useX ? (c.userData.width || 0.6) : (c.userData.depth || 0.45)) / 2 + 0.035;
      if (left.dot(bodyLeft) < 0) left.negate();
      const mid = c.position.clone(); mid.y += (c.userData.height || 0.5) * 0.55;
      // elbows point outward and down
      solveArm(this.bones.lArm, this.bones.lFore, this.bones.lHand, mid.clone().addScaledVector(left, half), g.w, bodyLeft.clone().add(down));
      solveArm(this.bones.rArm, this.bones.rFore, this.bones.rHand, mid.clone().addScaledVector(left, -half), g.w, bodyLeft.clone().negate().add(down));
    }
  }
}
