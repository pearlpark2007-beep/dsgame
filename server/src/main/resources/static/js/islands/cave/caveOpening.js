// caveOpening.js — Chapter Two's opening, shot as a film (same grammar as the Harbour: crawl, freeze cards,
// crash zooms, comic lettering; no dialogue). Lit by fire and smoke; the giant is never seen walking.
//  1. the crawl: the island of the Cyclopes, the cave, its owner, and why Odysseus is inside
//  2. the empty cave at dusk, torches burning, smoke under the roof
//  3. HERO'S ENTRANCE: a black figure in the blazing doorway, light streaming round him, slow motion, low camera
//  4. in the dark inside he strikes a torch: sparks, then the flame lights his face (a Leone close-up). Freeze on his name
//  5. he walks in with the torch, past the pens. THOOM. Grit falls. He turns to the door
//  6. THE SHADOW: something blocks the doorway; its shadow slides across the floor and over him. The sheep panic
//  7. the boulder grinds across the door. The light goes. Black
//  8. in the black, one eye opens. Then the coals flare red and show what it belongs to
//  9. crash zoom into the eye, freeze on his name; the roar
// 10. his head looms over the pens: he counts his flock, pen by pen (the array; he walks it every night)
// 11. Odysseus, torch in hand, looking up at him. Chapter card. Black.
import * as THREE from "three";
import { DOOR_AT, GIANT_AT, FIRE_AT } from "./caveScene.js";
import { COALS_AT } from "./caveLights.js";
import { PEN_W } from "./penRow.js";
import { Fire } from "../../engine/weather.js";
import { GodRays } from "../../engine/godrays.js";

export const ease = k => k * k * (3 - 2 * k);

const CRAWL = {
  kicker: "THE LAND OF THE CYCLOPES",
  title: "THE CAVE",
  paragraphs: [
    "Past the harbour of the giants lies an island with no farms, no ships and no laws. The Cyclopes live there, each one alone, each in his own cave.",
    "They are shepherds. Each has one eye, in the middle of his forehead. They fear no one. Not even the gods.",
    "The biggest of them keeps his flock in a cave above the sea. His name is Polyphemus. His father is Poseidon, god of the sea.",
    "Every evening he drives his sheep inside and counts them into their pens, one by one, in order. Then he rolls a boulder across the door that twenty men could not move.",
    "Odysseus had one ship left. He climbed to the cave with twelve men and a skin of strong wine, to see who lived there.",
    "The cave was empty. The pens were full. The racks were heavy with cheese. His men begged him to take what they could carry and run.",
    "He stayed."
  ]
};

// drive the camera for one shot: fn(t, o) sets o.pos, o.look, o.fov every frame (t in real seconds)
export function shot(world, director, fn) {
  let t = 0, live = true;
  const o = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40, shake: 0 };
  const u = { update: (dt, time, raw) => {
    if (!live) return;
    t += director.skipping ? dt : raw; fn(t, o);
    director.mode = null;
    director.cam.position.copy(o.pos);
    if (o.shake > 0.01) { director.cam.position.x += (Math.random() - 0.5) * o.shake; director.cam.position.y += (Math.random() - 0.5) * o.shake; o.shake *= 0.88; }
    director.look.copy(o.look); director.setFov(o.fov); director.cam.lookAt(o.look);
  } };
  world.add(u);
  return { o, stop() { live = false; const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); } };
}

// dust and grit shaken loose from the roof
export function dustFall(world, at, n = 120) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([at.x + (Math.random() - 0.5) * 6, at.y - Math.random() * 1.5, at.z + (Math.random() - 0.5) * 6], i * 3);
    vel.push(-(1 + Math.random() * 3));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xbfae96, size: 0.06, transparent: true, opacity: 0.9, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; world.scene.add(pts);
  let t = 0;
  const u = { update: dt => {
    t += dt;
    for (let i = 0; i < n; i++) { vel[i] -= 9.8 * dt * 0.4; pos[i * 3 + 1] += vel[i] * dt; }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, 0.9 - t / 3);
    if (t > 3) { world.scene.remove(pts); world.updaters.splice(world.updaters.indexOf(u), 1); }
  } };
  world.add(u);
}


// sparks from a flint, at a point
export function sparks(world, at, n = 40) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([at.x, at.y, at.z], i * 3);
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = 2 + Math.random() * 4;
    vel.push(new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - u * u) * sp, Math.abs(u) * sp * 0.6 + 1, Math.sin(a) * Math.sqrt(1 - u * u) * sp));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffd28a, size: 0.05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; world.scene.add(pts);
  let t = 0;
  const u = { update: dt => {
    t += dt;
    for (let i = 0; i < n; i++) { vel[i].y -= 9 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; }
    geo.attributes.position.needsUpdate = true; mat.opacity = Math.max(0, 1 - t / 0.6);
    if (t > 0.6) { world.scene.remove(pts); world.updaters.splice(world.updaters.indexOf(u), 1); }
  } };
  world.add(u);
}

// a torch in Odysseus's right hand: a stick, a pitch head, a flame that follows the hand, and a light on his face
function torchFor(world, hero) {
  const hand = hero.bones.rHand;
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 1 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.62, 6), wood);
  const rag = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 }));
  const binding = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 10), new THREE.MeshStandardMaterial({ color: 0x6a5232, roughness: 1 }));
  stick.position.y = 0.16; rag.position.y = 0.5; binding.position.y = 0.43; binding.rotation.x = Math.PI / 2;
  g.add(stick, rag, binding);
  const pitch = rag;
  g.scale.setScalar(1 / hand.getWorldScale(new THREE.Vector3()).x);      // the hand bone works in centimetres
  g.position.set(0, 8, 2);                                               // in the palm (hand-bone centimetres)
  hand.add(g);
  // held upright, tipped a little forward, whatever angle the wrist is at
  const want = new THREE.Quaternion(), hq = new THREE.Quaternion(), tilt = new THREE.Euler();
  const upright = () => {
    tilt.set(0.18, hero.group.rotation.y, 0, "YXZ"); want.setFromEuler(tilt);
    hand.getWorldQuaternion(hq); g.quaternion.copy(hq.invert().multiply(want));
  };
  const tip = new THREE.Vector3();
  const fire = new Fire(world, new THREE.Vector3(), { size: 0.3, light: false, embers: true, count: 50 });
  fire.points.visible = false; if (fire.embers) fire.embers.points.visible = false;
  const light = new THREE.PointLight(0xff9a48, 0, 8, 1.7); world.scene.add(light);
  let lit = 0;
  const u = { update: (dt, t) => {
    upright();
    pitch.getWorldPosition(tip);
    fire.origin.copy(tip).add(new THREE.Vector3(0, 0.06, 0)); if (fire.embers) fire.embers.origin.copy(fire.origin);
    light.position.copy(tip).add(new THREE.Vector3(0, 0.35, 0));
    light.intensity = lit * 4.5 * (1 + Math.sin(t * 15) * 0.08 + Math.sin(t * 31) * 0.05);
    if (lit > 0) fire.update(dt, t);
  } };
  world.add(u);
  return {
    tip, light,
    light_(k) { lit = k; fire.points.visible = k > 0; if (fire.embers) fire.embers.points.visible = k > 0; },
    remove() {
      hand.remove(g); world.scene.remove(light, fire.points); if (fire.embers) world.scene.remove(fire.embers.points);
      world.updaters.splice(world.updaters.indexOf(u), 1);
    }
  };
}

export async function playCaveOpening(c) {
  const { world, hero, director, comic, giant, cave, pens, card, noCrawl = false } = c;
  const { door, lights } = cave;
  const wait = s => hero.wait(s);
  document.body.classList.add("cinematic");
  comic.letterbox(true);
  world.grade.uniforms.letterbox.value = 1;
  const rays = c.rays || (c.rays = new GodRays(world));
  const skyAt = DOOR_AT.clone().add(new THREE.Vector3(-1.6, 5, 0));        // the middle of the bright doorway
  rays.aim(skyAt);
  // dusk: the door stands open and blazes with low sun; the coals are banked low; the giant is out
  const skyBefore = door.sky.material.color.clone(), spillBefore = door.spill.color.clone();
  door.skyColor = new THREE.Color(0xffd9a0); door.spill.color.set(0xffa860);
  door.power = 1.1;
  lights.setFires(0);                              // nobody home: every fire in the cave is out
  door.set(1);
  door.spill.castShadow = true; door.spill.shadow.mapSize.set(1024, 1024); door.spill.shadow.bias = -0.002;
  const coalPower = lights.coalLight.intensity;
  let coalK = 0.05;
  const dim = { update: () => { lights.coalLight.intensity = coalPower * coalK; if (lights.pitLight) lights.pitLight.intensity = 30 * coalK; } };
  world.add(dim);
  giant.hide();
  hero.group.visible = true;
  const torch = torchFor(world, hero);
  const base = { fill: lights.fill.intensity, hemi: lights.hemi.intensity, bloom: world.bloom.strength };
  const head = new THREE.Vector3();
  let s = null;

  try {
    // ---- 1. the crawl
    if (!noCrawl) await comic.crawl({ ...CRAWL, seconds: 44 });

    // ---- 2. the empty cave at dusk: a slow crane down from under the roof, through the smoke, to the pens
    s = shot(world, director, (t, o) => {
      const k = ease(Math.min(1, t / 7));
      o.pos.set(-5 + 8 * k, 8.5 - 4.5 * k, 13.5 - 2.5 * k);
      o.look.set(-3 + 10 * k, 5 - 4 * k, -12 + 10 * k); o.fov = 60 - 12 * k;
    });
    hero.teleport(DOOR_AT.x - 0.9, DOOR_AT.z + 0.2, Math.PI / 2);
    hero.group.visible = false;
    await wait(6.5);
    s.stop();

    // ---- 3. HERO'S ENTRANCE: low on the floor, looking up into the blazing doorway. A black figure steps in,
    //      in slow motion, light streaming round him, dust turning in the beams.
    hero.group.visible = true;
    // a pure silhouette: no fill on him, the sun behind, a trace of rays in the dust
    const fillWas = lights.fill.intensity, hemiWas = lights.hemi.intensity, bloomWas = world.bloom.strength;
    lights.fill.intensity = 0; lights.hemi.intensity = 0.2; world.bloom.strength = 0.3; world.grade.uniforms.halo.value = 0.2;
    door.power = 0.2; door.set(1);
    rays.strength = 0.12;
    s = shot(world, director, (t, o) => {
      const k = Math.min(1, t / 6);
      o.pos.set(-10.5 - 1.5 * k, 0.5, -5.0 - 0.1 * k); o.look.set(DOOR_AT.x - 1, 3.6 + 0.4 * k, DOOR_AT.z); o.fov = 36 - 4 * k;
    });
    dustFall(world, skyAt.clone().add(new THREE.Vector3(2.5, 3, 0)), 200);
    await wait(0.8);
    world.timeScale = 0.45;
    // face exactly along the walk first, so he steps straight off (no shuffle on the spot), and hold the
    // last stride rather than settling into the idle on camera
    const to = new THREE.Vector3(DOOR_AT.x + 3.4, 0, DOOR_AT.z + 0.8), P0 = hero.group.position;
    hero.group.rotation.y = Math.atan2(to.x - P0.x, to.z - P0.z);
    await hero.walkTo(to.x, to.z, { speed: 1.0 });
    world.timeScale = 1;
    await wait(0.3);
    s.stop();
    rays.strength = 0;
    lights.fill.intensity = fillWas; lights.hemi.intensity = hemiWas; world.bloom.strength = bloomWas; world.grade.uniforms.halo.value = 1;
    door.power = 1.1; door.set(1);

    // ---- 4. inside, in the dark: an extreme close-up. TCHK - sparks. FWOOSH - the torch takes, and lights his face.
    hero.teleport(-11, -2.2, Math.PI / 2 + 0.35);
    const faceShot = (dist, fov) => shot(world, director, (t, o) => {
      hero.bones.head.getWorldPosition(head);
      const yaw = hero.group.rotation.y, f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), side = new THREE.Vector3(-f.z, 0, f.x);
      o.pos.copy(head).addScaledVector(f, dist).addScaledVector(side, dist * 0.3).add(new THREE.Vector3(0, -0.25, 0));
      o.look.copy(head).addScaledVector(side, -0.12).add(new THREE.Vector3(0, 0.12, 0)); o.fov = fov - Math.min(t, 4) * 1.0;
    });
    s = faceShot(1.8, 40);
    hero.raise = { side: 0.08, up: -0.2, fwd: 0.36, w: 0 };   // hand in front of his right shoulder, elbow down: the torch stands beside his face
    await hero.over(0.6, k => hero.raise.w = ease(k));
    hero.raise.up = -0.2;
    await wait(0.9);
    sparks(world, torch.tip.clone()); comic.sfx("TCHK", { x: 62, y: 62, r: -8, size: 4.5, color: "#efe1c2", seconds: 0.7, drift: false });
    await wait(0.55);
    sparks(world, torch.tip.clone()); comic.sfx("TCHK", { x: 70, y: 54, r: 6, size: 4.5, color: "#efe1c2", seconds: 0.7, drift: false });
    await wait(0.35);
    comic.sfx("FWOOSH", { x: 58, y: 30, r: -5, size: 7, color: "#ffb02a", seconds: 1.2 });
    await hero.over(0.6, k => { torch.light_(ease(k)); hero.raise.up = -0.2 + 0.06 * ease(k); });
    await wait(1.0);
    await director.freeze(card.name, card.sub, 3.2);
    s.stop();

    // ---- 5. he walks in with the torch, past the hearth toward the pens. THOOM. Grit falls. He turns to the door.
    s = shot(world, director, (t, o) => {
      const P = hero.group.position;
      o.pos.set(-1.8, 0.45, 5.2); o.look.set(P.x, 1.5, P.z); o.fov = 38;
    });
    await hero.walkTo(-3.4, 1.2);
    await hero.face(6, 0);
    await wait(0.4);
    s.stop();
    s = shot(world, director, (t, o) => {
      const P = hero.group.position;
      o.pos.set(P.x + 2.1, 1.65, P.z + 2.1); o.look.set(P.x, 1.5, P.z); o.fov = 34;
    });
    await wait(0.4);
    for (let k = 0; k < 2; k++) {
      s.o.shake = 0.35; comic.sfx("THOOM", { x: 54 + k * 8, y: 26 + k * 10, r: -6 + k * 9, size: 8, color: "#e8c21c" });
      dustFall(world, hero.group.position.clone().add(new THREE.Vector3(0.5, 6, 0)));
      await wait(0.9);
    }
    await hero.face(DOOR_AT.x, DOOR_AT.z);
    await wait(0.3);
    s.stop();

    // ---- 6. THE SHADOW. Something fills the doorway (never seen). Its shadow slides in across the floor,
    //      up over Odysseus. The sheep panic in their pens.
    s = shot(world, director, (t, o) => {
      const P = hero.group.position, k = Math.min(1, t / 5);
      o.pos.set(-11 + 1.2 * k, 1.5, -2.6 + 0.4 * k); o.look.set(P.x + 1.5, 1.2, P.z + 0.5); o.fov = 44;
    });
    giant.place(DOOR_AT.x - 1.9, 0, DOOR_AT.z - 5.5, 10, DOOR_AT.z); giant.open(1); giant.play("idle", 0);
    giant.group.traverse(o => { if (o.isMesh) o.visible = true; });
    const gIn = giant.group.position.clone(), gTo = new THREE.Vector3(DOOR_AT.x - 1.9, 0, DOOR_AT.z);
    const sheep = pens.sheep ? pens.sheep.filter(Boolean) : [];
    const home = sheep.map(o => o.position.clone());
    let n0 = -1;
    await hero.over(3.6, k => {
      giant.group.position.lerpVectors(gIn, gTo, ease(k));
      const step = Math.floor(k * 3.6 / 1.1);
      if (step !== n0) { n0 = step; s.o.shake = 0.25; comic.sfx("THOOM", { x: 24 + step * 14, y: 20 + (step % 2) * 10, r: step % 2 ? 7 : -7, size: 6, color: "#e8c21c", seconds: 0.8 }); }
      sheep.forEach((o, i) => { o.position.x = home[i].x + Math.sin(k * 60 + i * 2) * 0.05 * k; o.rotation.y = Math.sin(k * 40 + i) * 0.3 * k; });
      if (k > 0.35 && !s.o._baa) { s.o._baa = true; comic.sfx("BAAA!", { x: 76, y: 70, r: 8, size: 4, color: "#efe1c2", seconds: 1 }); comic.sfx("BAA!", { x: 84, y: 56, r: -6, size: 3.4, color: "#efe1c2", seconds: 1 }); }
    });
    sheep.forEach((o, i) => { o.position.copy(home[i]); o.rotation.y = 0; });
    s.stop();

    // ---- 7. the boulder grinds across the door from outside. The light narrows to a crack, and goes.
    giant.hide();
    rays.strength = 0.1;
    s = shot(world, director, (t, o) => { o.pos.set(-8.5, 1.4, 4.5); o.look.set(DOOR_AT.x, 4.4, DOOR_AT.z + 1); o.fov = 46; });
    await wait(0.4);
    comic.sfx("GRRRIND", { x: 22, y: 30, r: -4, size: 7, color: "#efe1c2", seconds: 2.4 });
    await hero.over(2.8, k => { door.set(1 - ease(k)); rays.strength = 0.1 * (1 - k); s.o.shake = Math.max(s.o.shake, 0.05); });
    rays.strength = 0;
    s.o.shake = 0.9;
    comic.sfx("BOOM", { x: 40, y: 40, r: 6, size: 11, color: "#e0442a" });
    dustFall(world, new THREE.Vector3(DOOR_AT.x + 2, 9, DOOR_AT.z));
    await wait(0.9);
    s.stop();

    // ---- 8. black. Then, high in the dark at the back of the cave, one eye opens.
    await comic.black(true, 0.25);
    torch.light_(0);
    const kept = [];
    world.scene.traverse(o => { if (o.isLight) { kept.push([o, o.intensity]); o.intensity = 0; } });
    const fires = [];
    world.scene.traverse(o => { if (o.isPoints || o.isSprite) { fires.push([o, o.visible]); o.visible = false; } });
    const exposure = world.renderer.toneMappingExposure;
    giant.place(GIANT_AT.x, 0, GIANT_AT.z, 8, 4); giant.open(0); giant.roar(0); giant.look(null);
    const eyeGlow = giant.eyeMat ? giant.eyeMat.emissiveIntensity : 0;
    if (giant.eyeMat) giant.eyeMat.emissiveIntensity = 2.2;
    await wait(1.4);
    const G = giant.group.position, gf = new THREE.Vector3(Math.sin(giant.group.rotation.y), 0, Math.cos(giant.group.rotation.y));
    s = shot(world, director, (t, o) => {
      const eye = giant.eyePos(new THREE.Vector3());
      o.pos.copy(eye).addScaledVector(gf, 5).add(new THREE.Vector3(0, -0.6, 0)); o.look.copy(eye); o.fov = 12 - Math.min(t, 4) * 0.6;
    });
    comic.black(false, 0.1);
    await wait(1.2);
    await hero.over(1.4, k => giant.open(ease(k) * 0.9));          // slowly...
    await wait(0.8);
    await hero.over(0.12, k => giant.open(0.9 * (1 - k)));          // a blink
    await hero.over(0.12, k => giant.open(0.9 + 0.1 * k));
    await wait(0.6);
    s.stop();

    // ---- 9. the coals flare red: a low camera rising up him, feet to face
    kept.forEach(([o, v]) => o.intensity = v);
    fires.forEach(([o, v]) => o.visible = v);
    world.renderer.toneMappingExposure = exposure;
    if (giant.eyeMat) giant.eyeMat.emissiveIntensity = eyeGlow;
    torch.light_(1);
    coalK = 0.05;
    const low = G.clone().addScaledVector(gf, 7.5).add(new THREE.Vector3(-1.2, 0.4, 0));
    s = shot(world, director, (t, o) => {
      giant.headPos(head);
      const k = ease(Math.min(1, t / 4.5));
      o.pos.copy(low).setY(0.4 + 1.6 * k);
      o.look.set(G.x, 1.5 + (head.y - 1.2) * k, G.z); o.fov = 58 - 18 * k;
    });
    comic.sfx("FWOOMP", { x: 58, y: 70, r: -5, size: 6, color: "#ff5a2a", seconds: 1.2 });
    await hero.over(1.6, k => { coalK = 0.05 + 0.95 * ease(k); lights.setFires(ease(k)); });
    await wait(2.9);
    s.stop();

    // ---- 10. crash zoom into the eye, the camera jolting. Freeze on his name. Then the roar.
    const from = low.clone().setY(2.0);
    s = shot(world, director, (t, o) => {
      const eye = giant.eyePos(new THREE.Vector3());
      const k = ease(Math.min(1, t / 0.4));
      o.pos.copy(from).lerp(eye, 0.42 * k);
      o.look.copy(eye); o.fov = 40 - 22 * k;
      const j = t < 0.5 ? 0.6 : 0.1;
      o.look.x += (Math.random() - 0.5) * j; o.look.y += (Math.random() - 0.5) * j;
    });
    await wait(0.8);
    await director.freeze("POLYPHEMUS", "Son of Poseidon.<br>Counts his flock every night.", 3.2);
    s.stop();
    s = shot(world, director, (t, o) => {
      giant.headPos(head);
      o.pos.copy(G).addScaledVector(gf, 9).add(new THREE.Vector3(0.8, 6.5, 0)); o.look.copy(head); o.fov = 40;
    });
    await hero.over(0.4, k => giant.roar(ease(k)));
    s.o.shake = 0.8;
    comic.sfx("RRRAAAWRR", { x: 34, y: 30, r: -6, size: 9, color: "#e0442a", seconds: 1.6 });
    await wait(1.4);
    await hero.over(0.6, k => giant.roar(1 - ease(k)));
    s.stop();

    // ---- 11. his head looms over the pen wall: the eye walks the line, pen by pen. Counting.
    hero.teleport(PEN_W * 5.6, 2.4, 0.3);
    hero.group.visible = false;
    const n = pens.n ?? 8;
    torch.light_(0);
    s = shot(world, director, (t, o) => {
      const k = Math.min(1, t / 6);
      o.pos.set(PEN_W * 2.6 + 2 * k, 0.9, 8.5); o.look.set(PEN_W * 4.6 + 2 * k, 4.6, -3); o.fov = 62;
    });
    const WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"];
    for (let i = 0; i < n; i++) {
      giant.look(new THREE.Vector3(pens.px(i), 0.6, 0));
      comic.sfx(WORDS[i] + "…", { x: 6 + i * 9.5, y: 72 - (i % 2) * 6, r: i % 2 ? 5 : -5, size: 3.4, color: "#efe1c2", seconds: 0.9, drift: false });
      await wait(0.55);
    }
    await wait(0.5);
    s.stop();
    giant.look(null);

    // ---- 12. Odysseus, torch in hand, in front of the pens, looking up at him
    hero.group.visible = true; torch.light_(1);
    hero.group.rotation.y = Math.atan2(GIANT_AT.x - hero.group.position.x, GIANT_AT.z - hero.group.position.z);
    s = shot(world, director, (t, o) => {
      const P = hero.group.position, k = Math.min(1, t / 3);
      o.pos.set(P.x - 1.2, 0.7, P.z + 2.4 - 0.5 * k); o.look.set(P.x + 0.3, 1.75, P.z); o.fov = 40 - 8 * k;
    });
    await wait(3.0);
    s.stop(); s = null;
    await comic.black(true, 0.6);
    await comic.chapter("CHAPTER TWO", "THE CAVE OF POLYPHEMUS", 3.2);
  } finally {
    // leave the cave as the lessons need it: door shut, coals up, giant dozing at the back, Odysseus by the fire
    if (s) s.stop();
    rays.strength = 0; world.grade.uniforms.halo.value = 1;
    lights.fill.intensity = base.fill; lights.hemi.intensity = base.hemi; world.bloom.strength = base.bloom;
    torch.remove(); hero.raise = null; lights.setFires(1);
    world.updaters.splice(world.updaters.indexOf(dim), 1);
    lights.coalLight.intensity = coalPower;
    door.spill.castShadow = false;
    door.skyColor = null; door.spill.color.copy(spillBefore); door.power = 1; door.set(0);
    giant.place(GIANT_AT.x, 0, GIANT_AT.z, 8, 4);
    giant.play("idle", 0); giant.open(0.25); giant.roar(0); giant.look(null);
    hero.group.visible = true;
    hero.teleport(FIRE_AT.x + 1.7, FIRE_AT.z + 1.9, 2.4);
    world.timeScale = 1;
    comic.clear();
    world.grade.uniforms.letterbox.value = 0;
    document.body.classList.remove("cinematic");
    await comic.black(false, 0.8);
  }
}
