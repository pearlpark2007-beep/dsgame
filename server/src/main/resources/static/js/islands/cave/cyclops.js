// cyclops.js — Polyphemus, son of Poseidon: the shepherd of the cave.
// Model: "Cyclops Rig" by DM-913 (https://sketchfab.com/SuperKapoo913), CC-BY-4.0,
// https://sketchfab.com/3d-models/cyclops-rig-e5cc86878c314f5bae6d7268bb7541d9
// (we shrank its textures and removed the rig's helper shapes; the credit is also inside cyclops.glb).
//
// The model comes with one animation (idle). Everything else is done here by turning bones on top of it:
// the jaw for a roar, the head, the arms, and the eye itself (it has its own bone).
//   const pc = new Cyclops(world, { height: 11 }); await pc.load();
//   pc.place(x, y, z, faceX, faceZ)   stand there, facing a point
//   pc.open(0..1)       how open the eye is (0 = a shut slit, 1 = wide)
//   pc.look(worldPoint) roll the eye toward something (null = straight ahead)
//   pc.roar(k)          jaw open and head back, 0..1
//   pc.blind()          after the stake: the eye is ruined
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const BONES = { head: "Head_7", jaw: "Jaw_5", eye: "Eye_6", neck: "Neck_8", spine: "Spine_77", torso: "Torso_76",
  armL: "UpperarmL_32", armR: "UpperarmR_57", foreL: "ForearmL_22", foreR: "ForearmR_56",
  handL: "HandL_20", handR: "HandR_45", thighL: "ThighL_82", thighR: "ThighR_97", shinL: "ShinL_81", shinR: "ShinR_87", pelvis: "Pelvis_108", footL: "FootL_80" };

// body poses, as turns added to bones on top of the idle (radians; [x, y, z] per bone). Measured on this rig:
// an upper arm's +x swings it forward/up, a thigh's +x lifts the knee, a shin's -x folds it back.
const SIT = { thighL: [1.4, 0, 0], thighR: [1.4, 0, 0], shinL: [-1.4, 0, 0], shinR: [-1.4, 0, 0] };
export const POSES = {
  stand: {},
  lean:   { spine: [0.25, 0, 0], neck: [0.2, 0, 0], head: [0.3, 0, 0] },
  drunk:  { spine: [0.15, 0, 0.12], neck: [0.25, 0, -0.1], head: [0.35, 0, 0.2], armL: [0.2, 0, 0], armR: [0.2, 0, 0] },
  sleep:  { ...SIT, spine: [0.15, 0, 0], neck: [0.35, 0, 0.1], head: [0.55, 0, 0.15], armL: [0.35, 0, 0], armR: [0.35, 0, 0] },
  clutch: { armR: [2.4, 0, 0.3], foreR: [1.3, 0, 0], armL: [2.4, 0, -0.3], foreL: [1.3, 0, 0], head: [-0.25, 0, 0], spine: [-0.1, 0, 0] },
  reach:  { ...SIT, armR: [0.85, 0, 0], foreR: [0.35, 0, 0], head: [0.3, 0, 0], neck: [0.15, 0, 0] },
  windup: { armR: [3.0, 0, 0.4], foreR: [0.6, 0, 0], spine: [-0.25, 0, 0], head: [-0.1, 0, 0] },
  hurl:   { armR: [0.9, 0, 0.2], foreR: [0.1, 0, 0], spine: [0.35, 0, 0], head: [0.2, 0, 0] },
  // seated at his table (the climax): talking, tapping along the rack, drinking, drunk
  sitTalk:  { ...SIT, spine: [0.2, 0, 0], neck: [0.1, 0, 0], head: [0.15, 0, 0], armR: [0.7, 0, 0], foreR: [0.7, 0, 0], armL: [0.5, 0, 0], foreL: [0.6, 0, 0] },
  sitTap:   { ...SIT, spine: [0.3, 0, 0], neck: [0.15, 0, 0], head: [0.35, 0, 0], armR: [1.0, 0, 0], foreR: [0.3, 0, 0], armL: [0.5, 0, 0], foreL: [0.6, 0, 0] },
  sitDrink: { ...SIT, spine: [-0.05, 0, 0], head: [-0.25, 0, 0], armL: [2.3, 0, -0.3], foreL: [1.4, 0, 0], armR: [0.5, 0, 0], foreR: [0.6, 0, 0] },
  sitDrunk: { ...SIT, spine: [0.15, 0, 0.12], neck: [0.25, 0, -0.1], head: [0.35, 0, 0.2], armL: [0.6, 0, 0], foreL: [0.5, 0, 0], armR: [0.4, 0, 0] },
  // blind and raging: both arms up, then one fist driven into the roof
  flail:  { armR: [2.8, 0, 0.6], foreR: [0.4, 0, 0], armL: [2.8, 0, -0.6], foreL: [0.4, 0, 0], head: [-0.3, 0, 0], spine: [-0.15, 0, 0] },
  smash:  { armR: [3.1, 0, 0.15], foreR: [0.05, 0, 0], armL: [1.2, 0, -0.4], spine: [-0.2, 0, 0], head: [-0.35, 0, 0] },
  // on his knees in the surf, bowed (the stinger)
  bow:    { ...SIT, spine: [0.5, 0, 0], neck: [0.3, 0, 0], head: [0.4, 0, 0], armL: [0.4, 0, 0], armR: [0.4, 0, 0] }
};

export class Cyclops {
  constructor(world, { height = 11 } = {}) {
    this.world = world; this.height = height;
    this.group = new THREE.Group(); this.group.visible = false; world.scene.add(this.group);
    this.openness = 1; this.roarK = 0; this.lookAt = null; this.extra = {};   // extra[bone] = Euler offset, set by cinematics
  }

  async load(url = "assets/cave/cyclops.glb") {
    const gl = await new GLTFLoader().loadAsync(url);
    const m = this.body = gl.scene;
    const box = new THREE.Box3().setFromObject(m);
    const s = this.height / (box.max.y - box.min.y);
    m.scale.setScalar(s); m.position.y = -box.min.y * s;
    this.group.add(m);
    m.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
      if (o.isMesh && o.material.name === "Cyclops_Eye_Naterial") this.eyeMat = o.material;
    });
    this.bones = {};
    for (const [k, n] of Object.entries(BONES)) this.bones[k] = m.getObjectByName(n);
    this.head = this.bones.head;
    this.mixer = new THREE.AnimationMixer(m);
    this.clips = Object.fromEntries(gl.animations.map(c => [c.name.toLowerCase(), c]));
    // bones the animation doesn't move would keep our added turns frame after frame; reset those to rest first
    const moved = new Set(gl.animations.flatMap(c => c.tracks.filter(t => /quaternion$/.test(t.name)).map(t => t.name.split(".")[0])));
    this.rest = Object.entries(this.bones).filter(([, b]) => !moved.has(b.name)).map(([, b]) => [b, b.quaternion.clone()]);
    // the eye glows a little on its own, so it reads in the dark (and goes out when he is blinded)
    if (this.eyeMat) { this.eyeMat.emissiveIntensity = 0.55; this.eyeColor = this.eyeMat.color.clone(); }
    // where his foot rests when standing (sitting poses keep that foot on the floor and drop the body)
    this.baseY = m.position.y;
    m.updateMatrixWorld(true);
    this.footRest = this.group.worldToLocal(this.bones.footL.getWorldPosition(new THREE.Vector3())).y;
    this.world.add(this);
    return this;
  }

  // blend to a named pose over `seconds` (0 = at once); resolves when there
  pose(name, seconds = 0.6) {
    const to = POSES[name] || {}, from = {};
    const keys = new Set([...Object.keys(this.extra), ...Object.keys(to)]);
    for (const k of keys) { const e = this.extra[k]; from[k] = e ? [e.x, e.y, e.z] : [0, 0, 0]; }
    this.keepFeet = !!to.thighL;
    const apply = k => { for (const b of keys) { const a = from[b], z = to[b] || [0, 0, 0]; this.extra[b] = new THREE.Euler(a[0] + (z[0] - a[0]) * k, a[1] + (z[1] - a[1]) * k, a[2] + (z[2] - a[2]) * k); } };
    if (seconds <= 0) { apply(1); return Promise.resolve(); }
    return new Promise(res => {
      let t = 0;
      const u = { update: dt => { t += dt; const k = Math.min(1, t / seconds); apply(k * k * (3 - 2 * k)); if (k >= 1) { this.world.updaters.splice(this.world.updaters.indexOf(u), 1); res(); } } };
      this.world.add(u);
    });
  }

  place(x, y, z, faceX, faceZ) {
    this.group.position.set(x, y, z);
    this.group.rotation.y = Math.atan2(faceX - x, faceZ - z);
    this.group.visible = true;
  }
  hide() { this.group.visible = false; }
  play(name = "idle", fade = 0.3) {
    const clip = this.clips[name] || this.clips.idle; if (!clip) return;
    const a = this.mixer.clipAction(clip);
    if (this.current && this.current !== a) this.current.fadeOut(fade);
    a.reset().fadeIn(fade).play(); this.current = a;
  }

  open(k) { this.openness = THREE.MathUtils.clamp(k, 0, 1); }
  look(target) { this.lookAt = target ? target.clone() : null; }
  roar(k) { this.roarK = THREE.MathUtils.clamp(k, 0, 1); }
  blind() {
    this.blinded = true;
    if (this.eyeMat) { this.eyeMat.color.set(0x6a0a06); this.eyeMat.emissiveIntensity = 0.15; }
  }

  headPos(out = new THREE.Vector3()) { this.body.updateMatrixWorld(true); return this.head.getWorldPosition(out); }
  eyePos(out = new THREE.Vector3()) { this.body.updateMatrixWorld(true); return this.bones.eye.getWorldPosition(out); }

  // after the idle animation has posed the bones, add our own turns on top
  update(dt) {
    if (!this.mixer) return;
    this.mixer.update(dt);
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    const B = this.bones;
    // eye: shut is a squashed slit; the eye bone also rolls toward what he looks at
    const o = this.blinded ? 0.12 : this.openness;
    B.eye.scale.set(1, THREE.MathUtils.lerp(0.08, 1, o), 1);
    if (this.lookAt) {
      const local = B.eye.parent.worldToLocal(this.lookAt.clone()).sub(B.eye.position).normalize();
      const yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.5, 0.5), pitch = THREE.MathUtils.clamp(-Math.asin(local.y), -0.4, 0.4);
      B.eye.rotation.x += pitch; B.eye.rotation.y += yaw;
    }
    // roar: the jaw drops, the head tips back
    if (this.roarK > 0) { B.jaw.rotation.x += this.roarK * 0.55; B.head.rotation.x -= this.roarK * 0.35; }
    for (const [k, e] of Object.entries(this.extra)) if (B[k] && e) { B[k].rotation.x += e.x; B[k].rotation.y += e.y; B[k].rotation.z += e.z; }
    // sitting: keep the foot on the floor, so the body drops onto whatever he sits on
    if (this.keepFeet) {
      this.body.position.y = this.baseY; this.body.updateMatrixWorld(true);
      const fy = this.group.worldToLocal(B.footL.getWorldPosition(new THREE.Vector3())).y;
      this.body.position.y = this.baseY - (fy - this.footRest);
    } else if (this.body.position.y !== this.baseY) this.body.position.y = this.baseY;
  }
}
