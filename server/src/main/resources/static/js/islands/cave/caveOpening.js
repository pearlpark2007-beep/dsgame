// caveOpening.js — Chapter Two's opening, as a film. Re-cut for the redesign: quieter, more deliberate,
// the cave introduced as a PLACE before anything happens in it. Sound and shadow come before the giant;
// the comic lettering is kept to two moments (his roar, and his counting); shakes are reserved for real
// impacts. The story and the crawl are unchanged.
//  0–3. THE ARRIVAL (the screenplay's C1–C3, 22 s, which replace the crawl and the old shots 1–3; those are kept
//       below, behind c.oldArrival, and the crawl plays on its own from the Story door as "The story so far"):
//       C1 Plenty: his men filling sacks · C2 The refusal: "Not yet. I want him to see who took it." ·
//       C3 They stay: the sacks go down one by one; "He stayed."
//  4. in the dark he strikes a torch; it lights his face. Freeze on his name
//  5. he walks to the pens and looks along them. Far off: footsteps. Grit falls. He listens, turns
//  6. THE SHADOW: something fills the doorway (never seen); its shadow slides in; the flock shies
//  7. the boulder grinds shut. The light goes
//  8. in the black, one eye opens. 9. the coals flare: a low camera rises from his feet to his face
// 10. a slow push to the eye; freeze on his name; the roar
// 11. THE ROUTINE: his head over the pen wall, counting the flock pen by pen (the array, before it is named)
// 12. Odysseus, torch in hand, looking up at him. Chapter card
import * as THREE from "three";
import { DOOR_AT, GIANT_AT, FIRE_AT } from "./caveScene.js";
import { COALS_AT } from "./caveLights.js";
import { PEN_W } from "./penRow.js";
import { Fire } from "../../engine/weather.js";
import { GodRays } from "../../engine/godrays.js";
import { sound } from "../../engine/sound.js";
import { buildOutside } from "./caveOutside.js";
import { Crew, reachArm } from "../../story/crew.js";

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
  const mat = new THREE.PointsMaterial({ color: 0xbfae96, size: 0.06, map: dotTexture(), transparent: true, opacity: 0.9, depthWrite: false });   // round grit, not squares
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
let _dot = null;
function dotTexture() {
  if (_dot) return _dot;
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  return (_dot = new THREE.CanvasTexture(c));
}

export function sparks(world, at, n = 40) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([at.x, at.y, at.z], i * 3);
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, sp = 2 + Math.random() * 4;
    vel.push(new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - u * u) * sp, Math.abs(u) * sp * 0.6 + 1, Math.sin(a) * Math.sqrt(1 - u * u) * sp));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  // soft round dots (a plain PointsMaterial draws squares, which near the camera became big white tiles)
  const mat = new THREE.PointsMaterial({ color: 0xffc070, size: 0.035, map: dotTexture(), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
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

// the crawl on its own, from the chapter's Story door: the full text, as it used to open the film
export async function playCaveCrawl({ comic }) {
  document.body.classList.add("cinematic");
  try { await comic.crawl({ ...CRAWL, seconds: 44 }); } finally { comic.clear(); document.body.classList.remove("cinematic"); }
}

// ---- C1–C3: the men in the cave at dusk, and the choice that keeps them there.
// Crew figures are made for this scene only and removed before the giant comes (they are never on screen with him).
async function arrivalScene({ world, hero, director, comic }) {
  const wait = s => hero.wait(s);
  const crew = await Crew.ready(world, hero);
  const sackMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 1 });
  const sackGeo = new THREE.SphereGeometry(0.3, 10, 8).scale(1, 1.25, 0.85);
  // a giant's stool by the hearth, the size of a cart
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  const stool = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 1.9), wood); seat.position.y = 1.75; seat.castShadow = seat.receiveShadow = true; stool.add(seat);
  for (const [x, z] of [[-1.1, -0.75], [1.1, -0.75], [-1.1, 0.75], [1.1, 0.75]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.6, 0.28), wood); l.position.set(x, 0.8, z); l.castShadow = true; stool.add(l); }
  stool.position.set(-7.4, 0, 2.2); stool.rotation.y = 0.12; world.scene.add(stool);
  // the men: name, tint, where they work, and the sack each one is filling
  const MEN = [["Eurylochus", 0xb8ae9c, -4.8, 3.6], ["Polites", 0xd6cdbd, 1.6, 2.6], ["Lycus", 0xa9a08f, 4.2, 3.0], ["Perimedes", 0xc4b8a4, 6.6, 2.4],
               ["Antiphus", 0xcabfae, -0.8, 3.8], ["Elpenor", 0xe3dccf, 2.8, 4.6, true]];
  const men = {}, sacks = [];
  for (const [name, tint, x, z, cord] of MEN) {
    const m = crew.add({ name, tint, cord: !!cord, shadow: false });
    m.place(x, 0, z); m.face(x + 0.3, 0); men[name] = m;
    const sack = new THREE.Mesh(sackGeo, sackMat); sack.castShadow = true; world.scene.add(sack);
    sacks.push({ m, sack, held: true });
  }
  const carry = { update: () => { for (const s of sacks) if (s.held) { s.m.bones.rHand.updateWorldMatrix(true, false); s.sack.position.setFromMatrixPosition(s.m.bones.rHand.matrixWorld).add(new THREE.Vector3(0, -0.32, 0)); } } };
  world.add(carry);
  // the work: bending to the sacks in turn (pickup / putdown), so the room is busy without anyone in step
  let working = true;
  const work = { update: (dt, t) => { if (!working) return; MEN.slice(1).forEach(([n], i) => { const m = men[n], want = Math.floor(t / 2.2 + i * 0.7) % 2 ? "pickup" : "putdown"; if (m.base !== m.actions[want]) m.play(want, 0.35); }); } };
  world.add(work);
  const E = men.Eurylochus; E.play("idle", 0.01); E.face(-2.6, 1.7);
  hero.teleport(-2.6, 1.7, Math.PI, 0); hero.play("idle", 0.01);
  let s = null, touch = 0, along = 0;
  const hand = { update: () => { if (touch > 0) { const p = stool.localToWorld(new THREE.Vector3(-0.6 + 1.0 * along, 1.95, 0.95)); reachArm(hero.bones, "r", p, touch); } } };
  world.add(hand);
  try {
    // ---- C1 · 0:00–0:07 · Plenty. Low and wide in the dusk light: the pens down the middle, men filling sacks.
    //      A slow push toward Odysseus standing at the pens.
    s = shot(world, director, (t, o) => { const k = ease(Math.min(1, t / 7)); o.pos.set(-12.5 + 5 * k, 0.9 + 0.3 * k, 10.5 - 3.5 * k); o.look.set(-1.5 + 0.5 * k, 1.5, 0.8); o.fov = 54 - 10 * k; });
    await wait(1.4);
    comic.caption("The cave was empty. The pens were full. The racks were heavy with cheese.", { x: 6, y: 16, seconds: 4.6 });
    await wait(5.6);
    s.stop();

    // ---- C2 · 0:07–0:15 · The refusal. Eurylochus in the foreground with a full sack; Odysseus behind him,
    //      at a stool the size of a cart. He runs a hand along it.
    hero.teleport(-7.0, 3.55, Math.PI + 0.1, 0); hero.play("idle", 0.01);
    E.place(-10.3, 0, 6.0); E.face(-7.0, 3.55);                         // in the foreground, to one side of the line to him
    s = shot(world, director, (t, o) => { o.pos.set(-9.9 + t * 0.04, 1.6, 8.3); o.look.set(-8.1, 1.5, 4.3); o.fov = 46; });
    await hero.over(0.6, k => touch = ease(k));
    await Promise.all([hero.over(2.6, k => along = k), comic.subtitle("We have enough, Captain. To the ship. Now.", { speaker: "EURYLOCHUS", seconds: 2.6 })]);
    await comic.subtitle("Not yet. I want him to see who took it.", { speaker: "ODYSSEUS", seconds: 2.8 });
    await hero.over(0.5, k => touch = 1 - ease(k));
    await wait(0.6);
    s.stop();

    // ---- C3 · 0:15–0:22 · They stay. A slow move across the men's faces; they look at each other, and put
    //      their sacks down one by one.
    working = false;
    const line = [["Antiphus", -5.6], ["Polites", -4.1], ["Elpenor", -2.6], ["Lycus", -1.1], ["Perimedes", 0.4], ["Eurylochus", 1.9]];
    line.forEach(([n, x], i) => { const m = men[n]; m.place(x, 0, 5.6 + (i % 2) * 0.5); m.face(x, 12); m.play("idle", 0.01, { offset: i * 0.4 }); });
    s = shot(world, director, (t, o) => { const k = Math.min(1, t / 7); o.pos.set(-6.4 + 9 * k, 1.6, 10.2); o.look.set(-5.4 + 9 * k, 1.45, 5.8); o.fov = 38; });
    comic.caption("His men begged him to take what they could carry and run.", { x: 6, y: 16, seconds: 3.8 });
    for (let i = 0; i < line.length; i++) {
      const m = men[line[i][0]], nb = men[line[Math.min(line.length - 1, i + 1)][0]];
      m.face(nb.group.position.x, nb.group.position.z + 3);                 // a glance at the man beside him
      await wait(0.45);
      m.play("putdown", 0.25);
      const sk = sacks.find(x => x.m === m);
      await wait(0.5);
      sk.held = false; sk.sack.position.y = 0.32; m.face(m.group.position.x, 12);
      await wait(0.1);
    }
    await wait(0.4);
    s.stop(); s = null;
    await comic.black(true, 0.5);
    await comic.caption("He stayed.", { x: 44, y: 46, seconds: 2.0 });
  } finally {
    if (s) s.stop();
    for (const u of [carry, work, hand]) { const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); }
    sacks.forEach(x => world.scene.remove(x.sack)); sackGeo.dispose(); sackMat.dispose();
    world.scene.remove(stool); stool.traverse(o => { if (o.geometry) o.geometry.dispose(); }); wood.dispose();
    crew.dispose();                                  // the men fall back into the dark: never on screen with the giant
  }
  comic.black(false, 0.5);                           // shot 4 cuts in under the lifting black
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
  // dusk: the door stands open on a low sun; the hearth is banked to embers; the giant is out
  const spillBefore = door.spill.color.clone();
  door.skyColor = new THREE.Color(0xffd9a0); door.spill.color.set(0xffa860);
  door.power = 1.1;
  lights.setFires(0.25);                           // nobody home: the fires are down to embers
  door.set(1);
  door.spill.castShadow = true; door.spill.shadow.mapSize.set(1024, 1024); door.spill.shadow.bias = -0.002;
  const coalPower = lights.coalLight.intensity;
  let coalK = 0.05;
  const dim = { update: () => { lights.coalLight.intensity = coalPower * coalK; if (lights.pitLight) lights.pitLight.intensity = 30 * coalK; } };
  world.add(dim);
  giant.hide();
  hero.group.visible = true;
  const torch = torchFor(world, hero);
  const base = { fill: lights.fill.intensity, hemi: lights.hemi.intensity, bloom: world.bloom.strength, fog: world.scene.fog };
  const head = new THREE.Vector3();
  let s = null, outside = null;

  try {
    if (!c.oldArrival) {
      // ---- 0–3. the arrival scene (C1–C3)
      await arrivalScene(c);
    } else {
    // ---- 0. the crawl
    if (!noCrawl) await comic.crawl({ ...CRAWL, seconds: 44 });

    // ---- 1. ARRIVAL: outside, at dusk. A wide shot from down the slope: the cliff, the dark mouth of the cave,
    //      the sea behind. Odysseus climbs toward it. The camera follows him in, slowly.
    outside = buildOutside(world, { dusk: true }); outside.show(true);
    door.sky.visible = false;
    world.scene.fog = new THREE.FogExp2(0x5a4048, 0.0045);
    const up0 = new THREE.Vector3(DOOR_AT.x - 22, 0, DOOR_AT.z + 1.2), up1 = new THREE.Vector3(DOOR_AT.x - 4.2, 0, DOOR_AT.z + 0.3);
    hero.teleport(up0.x, up0.z, Math.PI / 2, outside.heightAt(up0.x, up0.z));
    hero.play("walk", 0.1);
    const climb = hero.over(8.5, k => {
      hero.group.position.lerpVectors(up0, up1, k); hero.group.position.y = outside.heightAt(hero.group.position.x, hero.group.position.z);
      hero.group.rotation.y = Math.PI / 2;
    });
    // from out over the water: the sea in front, the cliff and its dark mouth above, the sky over the cliff;
    // the camera drifts in and up the slope behind him, ending close to the mouth
    s = shot(world, director, (t, o) => {
      const k = ease(Math.min(1, t / 8.5)), P = hero.group.position;
      const cx = DOOR_AT.x - 62 + 34 * k, cz = DOOR_AT.z + 24 - 15 * k;
      o.pos.set(cx, Math.max(-9.5, outside.heightAt(cx, cz) + 2.5) + 3 * (1 - k), cz);
      o.look.set(DOOR_AT.x - 4 - 2 * (1 - k), 6 * (1 - k) + (P.y + 2.2) * k, DOOR_AT.z + 1 * (1 - k)); o.fov = 52 - 10 * k;
    });
    sound.ambience("title");                       // wind and sea, outside
    await climb;
    hero.play("idle", 0.3);
    await wait(0.6);
    s.stop();
    outside.show(false); door.sky.visible = true; world.scene.fog = base.fog;
    sound.ambience("cave");                        // inside: fire, drips, the rock's own hum

    // ---- 2. THE THRESHOLD from inside: low on the floor, looking out through the blazing doorway. A black
    //      figure steps in, a little slowed, light round him. (The way out is the brightest thing in the cave.)
    const fillWas = lights.fill.intensity, hemiWas = lights.hemi.intensity, bloomWas = world.bloom.strength;
    lights.fill.intensity = 0; lights.hemi.intensity = 0.2; world.bloom.strength = 0.25; world.grade.uniforms.halo.value = 0.15;
    door.power = 0.2; door.set(1);
    rays.strength = 0.1;
    hero.teleport(DOOR_AT.x - 0.9, DOOR_AT.z + 0.2, Math.PI / 2, 0);
    s = shot(world, director, (t, o) => {
      const k = Math.min(1, t / 6);
      o.pos.set(-10.5 - 1.2 * k, 0.5, -5.0 - 0.1 * k); o.look.set(DOOR_AT.x - 1, 3.6 + 0.3 * k, DOOR_AT.z); o.fov = 36 - 3 * k;
    });
    await wait(0.6);
    world.timeScale = 0.6;
    const to = new THREE.Vector3(DOOR_AT.x + 3.4, 0, DOOR_AT.z + 0.8), P0 = hero.group.position;
    hero.group.rotation.y = Math.atan2(to.x - P0.x, to.z - P0.z);
    await hero.walkTo(to.x, to.z, { speed: 1.0 });
    world.timeScale = 1;
    await wait(0.4);
    s.stop();
    rays.strength = 0;
    lights.fill.intensity = fillWas; lights.hemi.intensity = hemiWas; world.bloom.strength = bloomWas; world.grade.uniforms.halo.value = 0.06;
    door.power = 1.1; door.set(1);

    // ---- 3. ESTABLISH: the whole cave, held long enough to read it. Pens in the middle, the hearth to the
    //      left, his corner deep on the right, the door behind. A very slow push; nothing else moves much.
    s = shot(world, director, (t, o) => {
      const k = ease(Math.min(1, t / 6));
      o.pos.set(-13 + 2 * k, 8.2 - 0.6 * k, 17 - 1.5 * k); o.look.set(9 + 1 * k, 0.8, -5); o.fov = 58 - 4 * k;
    });
    await wait(5.5);
    s.stop();
    }                                                // (end of the old arrival, shots 0–3)

    // ---- 4. inside, in the dark: an extreme close-up. Sparks; the torch takes, and lights his face.
    hero.teleport(-11, -2.2, Math.PI / 2 + 0.35);
    const faceShot = (dist, fov) => shot(world, director, (t, o) => {
      hero.bones.head.getWorldPosition(head);
      const yaw = hero.group.rotation.y, f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), side = new THREE.Vector3(-f.z, 0, f.x);
      o.pos.copy(head).addScaledVector(f, dist).addScaledVector(side, dist * 0.3).add(new THREE.Vector3(0, -0.25, 0));
      o.look.copy(head).addScaledVector(side, -0.12).add(new THREE.Vector3(0, 0.12, 0)); o.fov = fov - Math.min(t, 4) * 0.8;
    });
    s = faceShot(1.8, 40);
    hero.raise = { side: 0.08, up: -0.2, fwd: 0.36, w: 0 };   // hand in front of his right shoulder, elbow down: the torch stands beside his face
    await hero.over(0.6, k => hero.raise.w = ease(k));
    hero.raise.up = -0.2;
    await wait(0.9);
    sparks(world, torch.tip.clone()); sound.op("tick");
    await wait(0.55);
    sparks(world, torch.tip.clone()); sound.op("tick");
    await wait(0.35);
    sound.whoosh({ seconds: 0.7, level: 0.22 });
    await hero.over(0.6, k => { torch.light_(ease(k)); hero.raise.up = -0.2 + 0.06 * ease(k); });
    await wait(1.0);
    await director.freeze(card.name, card.sub, 3.2);
    s.stop();

    // ---- 5. he walks to the pens and looks along them (the line he will have to understand). Then, far off:
    //      a footstep. Another. Grit trickles from the roof. He stops, listens, and turns to the door.
    s = shot(world, director, (t, o) => {
      const P = hero.group.position;
      o.pos.set(-1.8, 0.45, 5.2); o.look.set(P.x, 1.5, P.z); o.fov = 38;
    });
    await hero.walkTo(-3.4, 1.2);
    await hero.face(6, 0);
    await wait(0.3);
    s.stop();
    s = shot(world, director, (t, o) => {                     // over his shoulder, along the pen row
      const P = hero.group.position, k = ease(Math.min(1, t / 4));
      o.pos.set(P.x - 1.6, 2.0, P.z + 3.0); o.look.set(PEN_W * (2.5 + 3.5 * k), 0.7, -0.3); o.fov = 42;
    });
    await wait(2.2);
    for (let k = 0; k < 2; k++) {
      sound.giant("step", { level: 0.6 + k * 0.3 }); s.o.shake = 0.06 + k * 0.05;
      dustFall(world, hero.group.position.clone().add(new THREE.Vector3(0.5, 6, -1)), 60);
      await wait(1.1);
    }
    await hero.face(DOOR_AT.x, DOOR_AT.z);
    await wait(0.4);
    s.stop();

    // ---- 6. THE SHADOW. Something fills the doorway (never seen). Its shadow slides in across the floor,
    //      up over Odysseus. The flock shies in the pens. Every step is heard, not lettered.
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
      if (step !== n0) { n0 = step; s.o.shake = 0.1; sound.giant("step"); }
      sheep.forEach((o, i) => { o.position.x = home[i].x + Math.sin(k * 60 + i * 2) * 0.04 * k; o.rotation.y = Math.sin(k * 40 + i) * 0.25 * k; });
    });
    sheep.forEach((o, i) => { o.position.copy(home[i]); o.rotation.y = 0; });
    sound.giant("breath");
    s.stop();

    // ---- 7. the boulder grinds across the door from outside. The light narrows to a crack, and goes.
    giant.hide();
    rays.strength = 0.08;
    s = shot(world, director, (t, o) => { o.pos.set(-8.5, 1.4, 4.5); o.look.set(DOOR_AT.x, 4.4, DOOR_AT.z + 1); o.fov = 46; });
    await wait(0.4);
    sound.giant("scrape");
    await hero.over(2.8, k => { door.set(1 - ease(k)); rays.strength = 0.08 * (1 - k); s.o.shake = Math.max(s.o.shake, 0.03); });
    rays.strength = 0;
    s.o.shake = 0.4;
    sound.giant("slam");
    dustFall(world, new THREE.Vector3(DOOR_AT.x + 2, 9, DOOR_AT.z), 90);
    await wait(1.0);
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
    sound.giant("breath");
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
    sound.whoosh({ seconds: 1.2, level: 0.3 });
    await hero.over(1.6, k => { coalK = 0.05 + 0.95 * ease(k); lights.setFires(ease(k)); });
    await wait(2.9);
    s.stop();

    // ---- 10. a slow, steady push to the eye (no crash zoom). Freeze on his name. Then the roar.
    const from = low.clone().setY(2.0);
    s = shot(world, director, (t, o) => {
      const eye = giant.eyePos(new THREE.Vector3());
      const k = ease(Math.min(1, t / 2.2));
      o.pos.copy(from).lerp(eye, 0.4 * k);
      o.look.copy(eye); o.fov = 40 - 18 * k;
    });
    await wait(2.4);
    await director.freeze("POLYPHEMUS", "Son of Poseidon.<br>Counts his flock every night.", 3.2);
    s.stop();
    s = shot(world, director, (t, o) => {
      giant.headPos(head);
      o.pos.copy(G).addScaledVector(gf, 9).add(new THREE.Vector3(0.8, 6.5, 0)); o.look.copy(head); o.fov = 40;
    });
    sound.roar({ seconds: 1.8, level: 0.45 });
    await hero.over(0.4, k => giant.roar(ease(k)));
    s.o.shake = 0.35;
    comic.sfx("RRRAAAWRR", { x: 34, y: 30, r: -6, size: 9, color: "#e0442a", seconds: 1.6 });
    await wait(1.4);
    await hero.over(0.6, k => giant.roar(1 - ease(k)));
    s.stop();

    // ---- 11. THE ROUTINE: his head looms over the pen wall; the eye walks the line, pen by pen. Counting.
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
      comic.sfx(WORDS[i] + "…", { x: 6 + i * 9.5, y: 72 - (i % 2) * 6, r: i % 2 ? 4 : -4, size: 2.8, color: "#efe1c2", seconds: 0.9, drift: false });
      sound.op("tick");
      await wait(0.6);
    }
    await wait(0.6);
    s.stop();
    giant.look(null);

    // ---- 12. Odysseus, torch in hand, in front of the pens, looking up at him
    hero.group.visible = true; torch.light_(1);
    hero.group.rotation.y = Math.atan2(GIANT_AT.x - hero.group.position.x, GIANT_AT.z - hero.group.position.z);
    s = shot(world, director, (t, o) => {
      const P = hero.group.position, k = Math.min(1, t / 3.4);
      o.pos.set(P.x - 1.2, 0.7, P.z + 2.4 - 0.5 * k); o.look.set(P.x + 0.3, 1.75, P.z); o.fov = 40 - 7 * k;
    });
    await wait(3.4);
    s.stop(); s = null;
    await comic.black(true, 0.6);
    await comic.chapter("CHAPTER TWO", "THE CAVE OF POLYPHEMUS", 3.2);
  } finally {
    // leave the cave as the lessons need it: door shut, coals up, giant dozing at the back, Odysseus by the fire
    if (s) s.stop();
    if (outside) outside.dispose();
    door.sky.visible = true; world.scene.fog = base.fog;
    sound.ambience("cave");
    rays.strength = 0;
    lights.fill.intensity = base.fill; lights.hemi.intensity = base.hemi; world.bloom.strength = base.bloom;
    torch.remove(); hero.raise = null; lights.setFires(1);
    world.updaters.splice(world.updaters.indexOf(dim), 1);
    lights.coalLight.intensity = coalPower;
    door.spill.castShadow = false;
    door.skyColor = null; door.spill.color.copy(spillBefore); door.power = 1; door.set(0);
    giant.place(GIANT_AT.x, 0, GIANT_AT.z, 8, 4);
    giant.play("idle", 0); giant.open(0.25); giant.roar(0); giant.look(null);
    hero.group.visible = true; hero.group.rotation.set(0, 0, 0); hero.groundY = 0;
    hero.teleport(FIRE_AT.x + 1.7, FIRE_AT.z + 1.9, 2.4, 0); hero.stand(0);
    world.timeScale = 1;
    comic.clear();
    world.grade.uniforms.letterbox.value = 0;
    document.body.classList.remove("cinematic");
    await comic.black(false, 0.8);
  }
}
