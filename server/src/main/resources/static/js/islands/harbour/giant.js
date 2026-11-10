// giant.js — Antiphates, King of the Laestrygonians: a giant who wades in his own harbour.
// The body is Mixamo's "Warrok"; three clips: idle (breathing), roar, throw (an overarm hurl).
// Mixamo works in centimetres and Warrok is 2.38 m tall, so `height` scales him to giant size.
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { cut, pinRoot } from "../../engine/hero.js";

export const THROW_RELEASE = 1.6;
// where the Laestrygonians stand: on the cliff tops either side of the harbour mouth, [x, z, height, feet y].
// The feet y is a first guess; when the page loads it is set from the real rock under each one (harbour_env.html).
export const CLIFF_GIANTS = [[-54, -64, 28, 71], [55, -74, 30, 76], [-60, -97, 26, 67], [65, -100, 28, 76]];

export class Giant {
  constructor(world, { height = 14 } = {}) {
    this.world = world; this.height = height;
    this.group = new THREE.Group();
  }
  async load(dir = "assets/giants/") {
    const L = new FBXLoader();
    const [body, roar, thr] = await Promise.all(["idle", "roar", "throw"].map(n => L.loadAsync(dir + n + ".fbx")));
    this.body = body;
    body.scale.setScalar(this.height / 238);
    body.traverse(o => {
      if (o.isSkinnedMesh) {
        o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false;
        // his skin texture is dark; a faint glow from it keeps him readable against the night sea
        const m = o.material;
        if (m && m.color) { m.color.multiplyScalar(1.5); if (m.map) { m.emissive = new THREE.Color(0x9a6a50); m.emissiveMap = m.map; m.emissiveIntensity = 0.55; } }
      }
    });
    this.group.add(body);
    this.group.visible = false;
    this.world.scene.add(this.group);
    const clips = {
      idle: body.animations[0],
      roar: cut(roar.animations[0], "roar", 0, roar.animations[0].duration),
      throw: cut(thr.animations[0], "throw", 0, 3.0)
    };
    pinRoot(clips.throw, ["x", "z"]);                   // the clip steps forward; he stays where he is put
    this.mixer = new THREE.AnimationMixer(body);
    this.actions = {};
    for (const [k, c] of Object.entries(clips)) {
      const a = this.actions[k] = this.mixer.clipAction(c);
      if (k !== "idle") { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
    }
    this.clips = clips;
    this.rHand = body.getObjectByName("mixamorigRightHand");
    this.head = body.getObjectByName("mixamorigHead");
    this.current = null;
    this.play("idle", 0);
    this.world.add(this);
    return this;
  }
  // another Laestrygonian: the same body and clips, his own skeleton and animation (for the cliffs)
  clone({ height = this.height * 0.85 } = {}) {
    const g = new Giant(this.world, { height });
    const body = g.body = SkeletonUtils.clone(this.body);
    body.scale.setScalar(height / 238);
    g.group.add(body); g.group.visible = false; this.world.scene.add(g.group);
    g.clips = this.clips; g.mixer = new THREE.AnimationMixer(body); g.actions = {};
    for (const [k, c] of Object.entries(this.clips)) {
      const a = g.actions[k] = g.mixer.clipAction(c);
      if (k !== "idle") { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
    }
    g.rHand = body.getObjectByName("mixamorigRightHand"); g.head = body.getObjectByName("mixamorigHead");
    g.current = null; g.play("idle", 0);
    this.world.add(g);
    return g;
  }
  hide() { this.group.visible = false; }
  place(x, y, z, faceX, faceZ) {
    this.group.position.set(x, y, z);
    this.group.rotation.y = Math.atan2(faceX - x, faceZ - z);
    this.group.visible = true;
  }
  play(name, fade = 0.3) {
    const a = this.actions[name];
    if (this.current === a) return a;
    a.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = a;
    return a;
  }
  handPos(out = new THREE.Vector3()) { this.body.updateMatrixWorld(true); return this.rHand.getWorldPosition(out); }
  headPos(out = new THREE.Vector3()) { this.body.updateMatrixWorld(true); return this.head.getWorldPosition(out); }
  update(dt) { if (this.mixer && this.group.visible) this.mixer.update(dt); }
}
