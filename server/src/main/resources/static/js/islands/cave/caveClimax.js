// caveClimax.js — Chapter Two's ending, v2. Four scenes:
//  1. THE CHEESE  (talk)    The giant at his table, slicing cheese. Nine wheels on the rack this morning; now eight.
//                           He counts from zero. Odysseus pours wine. "What do they call you?" "Nobody."
//                           "I'll eat you last." He counts the crew and falls asleep at six. Odysseus: "Seven."
//  2. THE STAKE   (silence) The tip glows in the hearth. Across the cave. Up the ledge. HOLD SPACE from three angles.
//                           The impact shakes the whole cave: fires gust, embers erupt, stalactites fall, sheep bolt,
//                           the rack goes over. One second of silence. Then the scream, the flailing, the roof.
//  3. THE COUNT   (speed)   Dawn. He sits in the doorway and checks every back: "Zero. One. Two..." Quick cuts.
//                           The ram last, Odysseus under it. "Seven. You're heavy today." HOLD SPACE. "Go on."
//  4. THE ENDING            He counts the empty pens and reaches for an eighth that isn't there (index out of
//                           bounds). Smash cut: Odysseus on the ship biting the stolen cheese.
//     STINGER               The giant kneels in the surf: "Father." The sea goes still. An eye opens under the ship.
// The stake fix: the stake is placed from Odysseus's two hands every frame (grip between them, tip to the eye),
// and pushing it in moves HIM forward, so it can never pass through his body.
// Test hooks: window.__climaxFrom = 2 | 3 | 4 starts at that scene.
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { DOOR_AT, GIANT_AT, FIRE_AT, roofAt } from "./caveScene.js";
import { COALS_AT } from "./caveLights.js";
import { shot, dustFall, sparks, ease } from "./caveOpening.js";
import { crag } from "./caveRock.js";
import { stoneTexture, plankTexture } from "../../engine/textures.js";
import { Sea } from "../../engine/sea.js";
import { buildTrireme } from "../harbour/trireme.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const remove = (world, u) => { const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); };

// something held in a hand bone, kept level (tilt about x, facing a yaw)
function inHand(world, hand, obj, { offset = [0, 0, 0], yaw = () => 0, tilt = 0 } = {}) {
  obj.scale.multiplyScalar(1 / hand.getWorldScale(V()).x);
  obj.position.set(...offset); hand.add(obj);
  const want = new THREE.Quaternion(), hq = new THREE.Quaternion(), e = new THREE.Euler();
  const u = { update: () => { e.set(tilt, yaw(), 0, "YXZ"); want.setFromEuler(e); hand.getWorldQuaternion(hq); obj.quaternion.copy(hq.invert().multiply(want)); } };
  world.add(u);
  return () => { hand.remove(obj); remove(world, u); };
}

// a number floating over something (the index the giant just counted)
function indexTag(text, color = "#ffd23a") {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128;
  const x = c.getContext("2d");
  x.font = "700 96px Anton, Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "#140a04"; x.strokeText(text, 64, 68); x.fillStyle = color; x.fillText(text, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, toneMapped: false }));
  s.renderOrder = 10;
  return s;
}

// the giant's table: a slab of rock, a rack of nine slots (one empty), a big wheel and a knife
export function buildTable(world, at, faceYaw) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = faceYaw; world.scene.add(g);
  const st = stoneTexture({ seed: 8, base: [110, 98, 84], dark: [48, 42, 36], repeat: 2 });
  const rockMat = new THREE.MeshStandardMaterial({ ...st, vertexColors: true, roughness: 1 });
  const slab = new THREE.Mesh(crag(5.1, { sx: 3.4, sy: 0.95, sz: 1.9, strata: 2 }), rockMat);
  slab.position.y = 0.72; slab.castShadow = slab.receiveShadow = true; g.add(slab);
  const top = 1.62;
  // the rack: a plank on two blocks along the far edge, nine slots, wheels in all but one
  const wood = new THREE.MeshStandardMaterial({ ...plankTexture({ seed: 12, base: [60, 44, 30], light: [104, 80, 56], boards: 3 }), roughness: 1 });
  const rack = new THREE.Group(); rack.position.set(0, top, -0.9); g.add(rack);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 0.7), wood); plank.position.y = 0.45; plank.castShadow = plank.receiveShadow = true; rack.add(plank);
  for (const x of [-2.5, 2.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.6), wood); b.position.set(x, 0.22, 0); rack.add(b); }
  const cheese = new THREE.MeshStandardMaterial({ color: 0xc9a85e, roughness: 0.75 });
  const rind = new THREE.MeshStandardMaterial({ color: 0x8a6a34, roughness: 0.9 });
  const EMPTY = 5, slots = [];
  for (let i = 0; i < 9; i++) {
    const x = 2.4 - i * 0.6;
    slots.push(new THREE.Vector3(x, 0.95, 0));
    if (i === EMPTY) continue;
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 18), [rind, cheese, cheese]);
    w.position.set(x, 0.67, 0); w.castShadow = true; rack.add(w);
  }
  // the wheel he's cutting, and a knife the size of an oar
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 28), [rind, cheese, cheese]);
  wheel.position.set(1.0, top + 0.25, 0.4); wheel.castShadow = true; g.add(wheel);
  const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 8, 1, false, 0, 0.6), [rind, cheese, cheese]);
  wedge.position.copy(wheel.position); wedge.visible = false; g.add(wedge);
  const knife = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.04), new THREE.MeshStandardMaterial({ color: 0xb8b2a6, metalness: 0.85, roughness: 0.25 }));
  blade.position.x = 1.0; knife.add(blade);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 8), wood); grip.rotation.z = Math.PI / 2; grip.position.x = -0.4; knife.add(grip);
  knife.position.set(0.0, top + 0.95, 0.4); knife.rotation.set(0, 0, -0.2); g.add(knife);
  return { group: g, rack, slots, wheel, wedge, knife, top, slab,
    slot: i => rack.localToWorld(slots[i].clone()) };
}

// the olive stake, gripped between Odysseus's two hands and pointed at a target every frame.
// The shaft runs along local x from -2.6 (back) to 3.4 (tip); the hands hold it at x = -2.0.
function gripStake(world, hero, stake, target) {
  const L = V(), R = V(), mid = V(), dir = V();
  const u = { update: () => {
    hero.body.updateMatrixWorld(true);
    hero.bones.lHand.getWorldPosition(L); hero.bones.rHand.getWorldPosition(R);
    mid.addVectors(L, R).multiplyScalar(0.5);
    dir.copy(target()).sub(mid).normalize();
    stake.position.copy(mid).addScaledVector(dir, 2.0);
    stake.quaternion.setFromUnitVectors(V(1, 0, 0), dir);
  } };
  world.add(u);
  return () => remove(world, u);
}

// a falling spike of rock that shatters where it lands
function stalactite(world, at, len, onLand) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(len * 0.18, len, 7), new THREE.MeshStandardMaterial({ color: 0x6e6152, roughness: 1, flatShading: true }));
  m.rotation.x = Math.PI; m.position.copy(at); m.castShadow = true; world.scene.add(m);
  let v = 0;
  const u = { update: dt => {
    v += 22 * dt; m.position.y -= v * dt; m.rotation.z += dt * 0.6;
    if (m.position.y - len / 2 <= 0) {
      remove(world, u); world.scene.remove(m);
      const p = V(m.position.x, 0.3, m.position.z);
      sparks(world, p, 30); dustFall(world, V(p.x, 1.6, p.z), 60);
      for (let k = 0; k < 6; k++) {                                     // chunks
        const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.15), m.material); c.position.copy(p); world.scene.add(c);
        const vel = V((Math.random() - 0.5) * 6, 3 + Math.random() * 3, (Math.random() - 0.5) * 6); let t = 0;
        const cu = { update: dt2 => { t += dt2; vel.y -= 18 * dt2; c.position.addScaledVector(vel, dt2); if (c.position.y < 0.1) { c.position.y = 0.1; vel.set(0, 0, 0); } if (t > 4) { remove(world, cu); world.scene.remove(c); } } };
        world.add(cu);
      }
      onLand && onLand(p);
    }
  } };
  world.add(u);
}

// the outside: a cliff face with the cave mouth in it, a slope down to a beach, the sea, the ship, a dawn sky
function buildOutside(world) {
  const g = new THREE.Group(); g.visible = false; world.scene.add(g);
  const st = stoneTexture({ seed: 44, base: [140, 124, 104], dark: [62, 54, 46], moss: [90, 96, 60], repeat: 6 });
  const rock = new THREE.MeshStandardMaterial({ ...st, roughness: 1 });
  const face = new THREE.Shape();
  face.moveTo(-40, -20); face.lineTo(40, -20); face.lineTo(40, 34); face.lineTo(-40, 34); face.lineTo(-40, -20);
  const hole = new THREE.Path();
  hole.moveTo(-4.0, 0); hole.lineTo(-3.9, 6); hole.quadraticCurveTo(0, 12.8, 3.9, 6); hole.lineTo(4.0, 0); hole.lineTo(-4.0, 0);
  face.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(face, { depth: 2.5, bevelEnabled: false, curveSegments: 16 });
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), y = fp.getY(i), z = fp.getZ(i);
    const far = Math.min(1, Math.max(0, (Math.hypot(x / 5, (y - 5) / 8) - 1) / 1.5));
    if (z < 0.1) fp.setZ(i, z - far * (Math.sin(x * 0.5) * Math.cos(y * 0.4) * 1.6 + Math.sin(x * 1.3 + y) * 0.6 + 1.5));
  }
  fg.computeVertexNormals();
  const wall = new THREE.Mesh(fg, rock);
  wall.rotation.y = -Math.PI / 2; wall.position.set(DOOR_AT.x - 3.6, 0, DOOR_AT.z);
  wall.castShadow = wall.receiveShadow = true; g.add(wall);
  for (const [x, y, z, s] of [[-28, 25, -6, 10], [-29, 14, 18, 10], [-29, 13, -30, 11], [-28, 33, 12, 12], [-28, 32, -24, 12]]) {
    const c = crag(x + z, { sx: s * 0.7, sy: s, sz: s * 1.2, strata: 1.4 }); c.translate(x, y, z);
    const m = new THREE.Mesh(c, new THREE.MeshStandardMaterial({ ...st, vertexColors: true, roughness: 1 })); m.castShadow = m.receiveShadow = true; g.add(m);
  }
  const groundY = x => x > -30 ? 0 : x > -58 ? -12 * ease((-30 - x) / 28) : -12 - (-58 - x) * 0.45;
  const gg = new THREE.PlaneGeometry(90, 90, 90, 60);
  const gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i) - 52, z = gp.getY(i); gp.setXYZ(i, x, groundY(x) + Math.sin(x * 0.7 + z * 0.5) * 0.25 + Math.sin(z * 0.23) * 0.6, -z); }
  gg.computeVertexNormals();
  const turf = stoneTexture({ seed: 12, base: [118, 112, 80], dark: [60, 58, 40], moss: [86, 104, 56], repeat: 14 });
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ ...turf, roughness: 1, side: THREE.DoubleSide }));
  ground.position.z = DOOR_AT.z; ground.receiveShadow = true; g.add(ground);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; void main(){
      float h = clamp(vP.y, -0.2, 1.0);
      vec3 low = vec3(1.0, 0.62, 0.32), mid = vec3(0.86, 0.55, 0.45), high = vec3(0.30, 0.42, 0.62);
      vec3 c = mix(low, mid, smoothstep(0.0, 0.18, h)); c = mix(c, high, smoothstep(0.18, 0.7, h));
      float sun = pow(max(dot(vP, normalize(vec3(-1.0, 0.08, 0.15))), 0.0), 220.0) * 3.0 + pow(max(dot(vP, normalize(vec3(-1.0, 0.08, 0.15))), 0.0), 8.0) * 0.35;
      gl_FragColor = vec4(c + vec3(1.0, 0.8, 0.5) * sun, 1.0); }`
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat));
  const sun = new THREE.DirectionalLight(0xffc890, 0); sun.position.set(-120, 30, 20); sun.target.position.set(-30, 0, -6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 300 });
  g.add(sun, sun.target);
  const skyFill = new THREE.HemisphereLight(0x9ab0d0, 0x5a4a30, 0); g.add(skyFill);
  const ship = buildTrireme({ length: 30 });
  ship.rotation.y = 0.15; ship.position.set(-78, -13.9, -4); g.add(ship);
  let sea = null;
  return {
    group: g, ship, sun, skyFill, groundY, get sea() { return sea; },
    show(on) {
      g.visible = on; sun.intensity = on ? 2.4 : 0; skyFill.intensity = on ? 1.1 : 0;
      if (on && !sea) { sea = world.add(new Sea(world, { color: 0x1a3440, sunDir: V(-1, 0.2, 0.15), sunColor: 0xffb070 })); sea.water.position.y = -13; }
      if (sea) sea.water.visible = on;
    }
  };
}

// Poseidon's eye: a sea-green almond of light, lying just above the water so it reads as under it
function seaEye(size) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  const gr = x.createRadialGradient(256, 128, 6, 256, 128, 250);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.1, "rgba(10,40,30,1)"); gr.addColorStop(0.2, "rgba(80,255,200,1)");
  gr.addColorStop(0.45, "rgba(20,140,120,0.95)"); gr.addColorStop(0.8, "rgba(6,50,60,0.75)"); gr.addColorStop(1, "rgba(4,30,40,0)");
  x.save(); x.beginPath(); x.moveTo(6, 128); x.quadraticCurveTo(256, -70, 506, 128); x.quadraticCurveTo(256, 326, 6, 128); x.clip();
  x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
  x.fillStyle = "rgba(0,0,0,1)"; x.beginPath(); x.ellipse(256, 128, 14, 70, 0, 0, Math.PI * 2); x.fill();        // the slit pupil
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export async function playCaveClimax(c) {
  const { world, hero, director, comic, giant, cave, pens, cardAfter } = c;
  const { door, lights, stake } = cave;
  const wait = s => hero.wait(s);
  const over = (s, fn) => hero.over(s, fn);
  const from = window.__climaxFrom || +(new URLSearchParams(location.search).get("from") || 1);
  document.body.classList.add("cinematic");
  comic.letterbox(true);
  world.grade.uniforms.letterbox.value = 1;
  const head = V(), eye = V();
  const stakeHome = { p: stake.position.clone(), q: stake.quaternion.clone() };
  const tipMat = stake.userData.tip.material;
  const props = [];                      // undo functions, run at the end
  const temp = o => { world.scene.add(o); props.push(() => world.scene.remove(o)); return o; };
  let s = null, outside = null;
  const cam = fn => { if (s) s.stop(); s = shot(world, director, fn); return s; };
  const sheep = pens.sheep.slice();
  const sheepHome = sheep.map(o => o && { p: o.position.clone(), r: o.rotation.y, s: o.scale.clone(), parent: o.parent });
  const crew = [];

  // where things stand: the giant on a seat of rock by his table, Odysseus at its foot
  const gf = V(8 - GIANT_AT.x, 0, 4 - GIANT_AT.z).normalize();      // the way the giant faces
  const side = V(-gf.z, 0, gf.x);
  const faceYaw = Math.atan2(gf.x, gf.z);
  const seatMat = new THREE.MeshStandardMaterial({ ...stoneTexture({ seed: 8, base: [110, 98, 84], dark: [48, 42, 36], repeat: 2 }), vertexColors: true, roughness: 1 });
  const seat = temp(new THREE.Mesh(crag(4.4, { sx: 3.2, sy: 2.6, sz: 3.0 }), seatMat));
  seat.position.set(GIANT_AT.x + 0.4, 1.0, GIANT_AT.z - 1.6); seat.castShadow = seat.receiveShadow = true;
  // he sits on the floor, legs out; the table stands at his right hand, Odysseus on its far side
  const T = GIANT_AT.clone().addScaledVector(gf, 2.8).addScaledVector(side, 3.8);
  const table = buildTable(world, T, Math.atan2(-gf.z, gf.x)); props.push(() => world.scene.remove(table.group));
  const O = T.clone().addScaledVector(side, 2.9).addScaledVector(gf, 0.6);           // Odysseus, at the table's foot
  const coalCol = lights.coalLight.color.clone();
  const talkLight = on => { lights.coalLight.userData.k = on ? 0.35 : 1; lights.coalLight.color.copy(on ? new THREE.Color(0xff6a28) : coalCol); };
  props.push(() => talkLight(false));
  const seated = async (pose = "sitTalk") => { giant.place(GIANT_AT.x, 0, GIANT_AT.z, GIANT_AT.x + gf.x * 10, GIANT_AT.z + gf.z * 10); giant.roar(0); giant.look(null); await giant.pose(pose, 0); };
  const handAt = () => giant.bones.handR.getWorldPosition(V());
  const lightOnFace = (color = 0xff8a3a, k = 6) => { const l = temp(new THREE.PointLight(color, k, 4, 1.5)); return l; };

  try {
    await comic.black(true, 0.01);

    // =============================================================================================
    // 1. THE CHEESE
    // =============================================================================================
    if (from <= 1) {
      await seated("sitTalk"); giant.open(0.85); talkLight(true);
      hero.teleport(O.x, O.z, yawTo(O, GIANT_AT));
      const face = lightOnFace(0xffa060, 4);
      const faceU = { update: () => { hero.bones.head.getWorldPosition(face.position); face.position.addScaledVector(gf, 1.2).y -= 0.4; } };
      world.add(faceU); props.push(() => remove(world, faceU));

      // 1.1 extreme close-up: the knife through the wheel. SHHK.
      const W = table.wheel.getWorldPosition(V());
      cam((t, o) => { o.pos.copy(W).addScaledVector(gf, 2.9).addScaledVector(side, 0.9).add(V(0, 0.9, 0)); o.look.copy(W).addScaledVector(gf, -0.4).add(V(0, 0.3, 0)); o.fov = 40; });
      const k0 = table.knife.position.clone();
      comic.black(false, 0.25);
      await over(1.2, k => { table.knife.position.copy(k0).add(V(0.9, -0.6 * ease(k), 0)); table.knife.rotation.z = -0.2 + 0.2 * k; });
      comic.sfx("SHHK", { x: 58, y: 34, r: -10, size: 7, color: "#efe1c2", seconds: 1.0 });
      table.wedge.visible = true;
      await over(0.6, k => { table.wedge.position.copy(table.wheel.position).add(V(0.25 * k, 0, 0.35 * k)); table.wedge.rotation.y = 0.3 * k; });

      // 1.2 low and wide: the giant at his table, Odysseus small at its foot
      cam((t, o) => { const k = ease(Math.min(1, t / 6)); o.pos.copy(GIANT_AT).addScaledVector(gf, 13 - k).addScaledVector(side, 8).add(V(0, 1.0, 0)); o.look.copy(T).addScaledVector(side, -1).add(V(0, 3, 0)); o.fov = 55 - 4 * k; });
      await comic.subtitle("Nine wheels on the top rack this morning.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.6 });
      comic.sfx("shk", { x: 66, y: 46, r: 8, size: 3, color: "#efe1c2", seconds: 0.6 });
      await comic.subtitle("Now there are eight.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.2 });

      // 1.3 close on Odysseus: a crumb in his beard. He brushes it off. Slowly.
      const crumb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.025), new THREE.MeshStandardMaterial({ color: 0xe0c070, roughness: 0.7 }));
      temp(crumb);
      const crumbU = { update: () => { hero.bones.head.getWorldPosition(crumb.position); const y = hero.group.rotation.y; crumb.position.add(V(Math.sin(y) * 0.11, -0.12, Math.cos(y) * 0.11)); } };
      world.add(crumbU);
      cam((t, o) => { hero.bones.head.getWorldPosition(head); const y = hero.group.rotation.y, f = V(Math.sin(y), 0, Math.cos(y)), sd = V(-f.z, 0, f.x); o.pos.copy(head).addScaledVector(f, 1.3).addScaledVector(sd, 0.35).add(V(0, -0.1, 0)); o.look.copy(head).add(V(0, -0.06, 0)); o.fov = 30; });
      await wait(0.9);
      hero.raise = { side: -0.05, up: 0.25, fwd: 0.22, w: 0 };
      await over(0.8, k => hero.raise.w = ease(k));
      remove(world, crumbU);
      const c0 = crumb.position.clone();
      await over(0.5, k => crumb.position.copy(c0).add(V(0, -1.6 * k * k, 0)));
      await over(0.5, k => hero.raise.w = 1 - ease(k));
      hero.raise = null;

      // 1.4 over the giant's shoulder: the eye in the frame, the finger tapping along the rack, from zero
      const otsAt = giant.headPos(V()).addScaledVector(gf, -0.4).addScaledVector(side, 1.8).add(V(0, -0.6, 0));
      cam((t, o) => { o.pos.copy(otsAt); o.look.copy(O).add(V(0, 1.0, 0)); o.fov = 52; });
      await comic.subtitle("I'm not angry. I'm a shepherd.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.2 });
      giant.pose("sitTap", 0.6);
      await comic.subtitle("Shepherds count.", { speaker: "POLYPHEMUS", villain: true, seconds: 1.6 });
      const words = ["Zero.", "One.", "Two."], tags = [];
      for (let i = 0; i < 3; i++) {
        const tag = indexTag(String(i)); world.scene.add(tag); tags.push(tag); tag.position.copy(table.slot(i)).add(V(0, 0.5, 0)); tag.scale.setScalar(0.6);
        comic.sfx("tok", { x: 40 + i * 8, y: 56, r: -6, size: 2.6, color: "#efe1c2", seconds: 0.5 });
        comic.subtitle(words[i], { speaker: "POLYPHEMUS", villain: true, seconds: 0.8 });
        await wait(0.7);
      }
      await comic.subtitle("I start at zero. Everybody should.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.4 });
      tags.forEach(t => world.scene.remove(t));

      // 1.5 reverse, low and to the side: Odysseus, face in the torchlight
      cam((t, o) => { hero.bones.head.getWorldPosition(head); const y = hero.group.rotation.y, f = V(Math.sin(y), 0, Math.cos(y)), sd = V(-f.z, 0, f.x); o.pos.copy(head).addScaledVector(f, 2.0).addScaledVector(sd, 1.3).add(V(0, -0.55, 0)); o.look.copy(head).add(V(0, -0.1, 0)); o.fov = 36; });
      giant.pose("sitTalk", 0.6);
      await comic.subtitle("Where I'm from, we start at one.", { speaker: "ODYSSEUS", seconds: 2.4 });

      // 1.6 back on the giant, tight
      cam((t, o) => { giant.headPos(head); o.pos.copy(head).addScaledVector(side, 7.0).add(V(0, -1.4, 0)); o.look.copy(head).add(V(0, -0.6, 0)); o.fov = 38; });
      giant.look(hero.bones.head.getWorldPosition(V()));
      await comic.subtitle("Where you're from, there's a lot of missing cheese.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.8 });

      // 1.7 the wine. Side profile, low: his face clear; the bowl is the giant's, held out at table height
      const skin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.8 }));
      skin.scale.set(1, 1.35, 0.9);
      const skinOff = inHand(world, hero.bones.rHand, skin, { offset: [0, 12, 4] }); props.push(skinOff);
      const bowl = new THREE.Group();
      const bwood = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.9, side: THREE.DoubleSide });
      bowl.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bwood));
      const wine = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshStandardMaterial({ color: 0x3a0610, roughness: 0.1 }));
      wine.rotation.x = -Math.PI / 2; wine.position.y = -0.3; bowl.add(wine);
      bowl.position.set(0.6, table.top + 0.42, 1.5); table.group.add(bowl);
      const stream = temp(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1, 6), new THREE.MeshStandardMaterial({ color: 0x5a0a14, roughness: 0.2 })));
      stream.visible = false;
      const pourU = { update: () => { if (!stream.visible) return; const a = skin.getWorldPosition(V()), b = bowl.getWorldPosition(V()).add(V(0, -0.1, 0)); stream.position.lerpVectors(a, b, 0.5); stream.scale.set(1, a.distanceTo(b), 1); stream.quaternion.setFromUnitVectors(V(0, 1, 0), a.clone().sub(b).normalize()); } };
      world.add(pourU); props.push(() => remove(world, pourU));
      hero.raise = { side: 0.12, up: 0.3, fwd: 0.35, w: 0 };
      const sideAt = hero.bones.head.getWorldPosition(V()).addScaledVector(gf, 4.2).add(V(0, -0.5, 0));
      cam((t, o) => { hero.bones.head.getWorldPosition(head); o.pos.copy(sideAt); o.look.copy(head).addScaledVector(side, -1.2); o.fov = 46; });
      await over(0.6, k => hero.raise.w = ease(k));
      await comic.subtitle("A gift. From a ship that won't miss it.", { speaker: "ODYSSEUS", seconds: 2.4 });
      stream.visible = true;
      for (let k = 0; k < 3; k++) {
        comic.sfx("GLUG", { x: 34 + k * 16, y: 28 + (k % 2) * 12, r: k % 2 ? 7 : -7, size: 5.5, color: "#b0243a", seconds: 0.8 });
        await over(0.45, q => { wine.position.y = -0.3 + 0.24 * (k + q) / 3; });
      }
      stream.visible = false;
      await over(0.4, k => hero.raise.w = 1 - ease(k)); hero.raise = null;
      // he drinks it down
      cam((t, o) => { giant.headPos(head); o.pos.copy(head).addScaledVector(gf, 5.0).addScaledVector(side, 1.6).add(V(0, -2.0, 0)); o.look.copy(head).add(V(0, -0.4, 0)); o.fov = 40; });
      table.group.remove(bowl);
      await giant.pose("sitDrink", 0.7);
      comic.sfx("GLUG GLUG GLUG", { x: 22, y: 24, r: -6, size: 5, color: "#b0243a", seconds: 1.2 });
      await over(1.2, k => giant.roar(0.25 * Math.sin(k * Math.PI)));

      // 1.8 the first smile. "What do they call you, little cheese thief?"
      await giant.pose("sitDrunk", 0.8);
      cam((t, o) => { giant.headPos(head); o.pos.copy(head).addScaledVector(gf, 7.0).addScaledVector(side, 1.4).add(V(0, -1.4, 0)); o.look.copy(head).add(V(0, -0.8, 0)); o.fov = 40; giant.group.rotation.z = Math.sin(t * 1.6) * 0.03; });
      await comic.subtitle("Good. Very good.", { speaker: "POLYPHEMUS", villain: true, seconds: 1.8 });
      await comic.subtitle("What do they call you, little cheese thief?", { speaker: "POLYPHEMUS", villain: true, seconds: 2.6 });

      // 1.9 his eyes. Hold. "Nobody."
      cam((t, o) => { hero.bones.head.getWorldPosition(head); const f = V(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y)); o.pos.copy(head).addScaledVector(f, 1.15).add(V(0, 0.02, 0)); o.look.copy(head).add(V(0, 0.05, 0)); o.fov = 28; });
      await wait(1.0);
      comic.subtitle("Nobody.", { speaker: "ODYSSEUS", seconds: 1.6 });
      await wait(1.2);
      await director.freeze("NOBODY", "<i>(he is very much somebody)</i>", 2.2);

      // 1.10 wide again: the gift. He counts the crew, and goes under at six
      cam((t, o) => { const k = Math.min(1, t / 9); o.pos.copy(GIANT_AT).addScaledVector(gf, 15 - 2 * k).addScaledVector(side, 3).add(V(0, 2.2, 0)); o.look.copy(GIANT_AT).addScaledVector(gf, 3).addScaledVector(side, 1.5).add(V(0, 3.2, 0)); o.fov = 54; });
      await comic.subtitle("Nobody. Ha!", { speaker: "POLYPHEMUS", villain: true, seconds: 1.6 });
      await comic.subtitle("Then here's my gift, Nobody: I'll eat you last.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.6 });
      const count = ["Zero...", "one...", "two...", "...", "six..."];
      for (let i = 0; i < count.length; i++) {
        comic.subtitle(count[i], { speaker: "POLYPHEMUS", villain: true, seconds: 1.0 });
        giant.open(0.85 - i * 0.17);
        await wait(i === 3 ? 0.6 : 1.0);
      }
      await Promise.all([giant.pose("sleep", 1.2), over(1.2, k => giant.open(0.15 * (1 - k)))]);
      giant.group.rotation.z = 0;
      comic.sfx("Zzz", { x: 64, y: 22, r: -8, size: 5, color: "#efe1c2", seconds: 1.6 });
      await wait(1.0);

      // 1.11 close on Odysseus, quiet. "Seven." He turns to the hearth.
      cam((t, o) => { hero.bones.head.getWorldPosition(head); const f = V(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y)), sd = V(-f.z, 0, f.x); o.pos.copy(head).addScaledVector(f, 1.6).addScaledVector(sd, -0.6).add(V(0, -0.2, 0)); o.look.copy(head); o.fov = 32; });
      await wait(0.5);
      await comic.subtitle("Seven.", { speaker: "ODYSSEUS", seconds: 1.4 });
      await hero.face(FIRE_AT.x, FIRE_AT.z, 0.6);
      await wait(0.3);
      skinOff();                                                          // the wineskin goes
      await comic.black(true, 0.08);
    }

    // =============================================================================================
    // 2. THE STAKE — serious. No talk.
    // =============================================================================================
    if (from <= 2) {
      if (from === 2) { await seated("sleep"); giant.open(0); }
      giant.group.rotation.z = 0; talkLight(false);
      lights.setFires(0.55);                                              // the fires burn low
      // 2.1 the tip in the hearth: grey, orange, white
      const toFire = V(1, 0, 0.35).normalize();
      stake.position.copy(FIRE_AT).addScaledVector(toFire, -3.0).setY(0.45); stake.rotation.set(0, -Math.atan2(toFire.z, toFire.x), 0.08);
      const tipAt = () => stake.userData.tip.getWorldPosition(V());
      const tipLight = temp(new THREE.PointLight(0xff7a2a, 0, 9, 1.6));
      const tipU = { update: () => tipLight.position.copy(tipAt()) }; world.add(tipU); props.push(() => remove(world, tipU));
      cam((t, o) => { const p = tipAt(); o.pos.copy(p).add(V(-1.5, 0.9, 2.7)).add(V(0, 0, -t * 0.08)); o.look.copy(p); o.fov = 34; });
      comic.black(false, 0.3);
      tipMat.emissive = tipMat.emissive || new THREE.Color();
      await over(2.6, k => { tipMat.emissive.setRGB(1.0 * k, 0.35 * k + 0.25 * k * k, 0.05 * k + 0.4 * k * k * k); tipMat.emissiveIntensity = 1.4 * k; tipLight.intensity = 14 * k; });

      // 2.2 his face, lit from below
      hero.teleport(FIRE_AT.x - 4.2, FIRE_AT.z - 3.6, yawTo(V(FIRE_AT.x - 4.2, 0, FIRE_AT.z - 3.6), FIRE_AT));
      const under = lightOnFace(0xff6a20, 2.5);
      const underU = { update: () => { hero.bones.head.getWorldPosition(under.position); under.position.y -= 0.7; under.position.addScaledVector(V(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y)), 0.4); } };
      world.add(underU);
      cam((t, o) => { hero.bones.head.getWorldPosition(head); const f = V(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y)); o.pos.copy(head).addScaledVector(f, 1.5 - t * 0.08).add(V(0, -0.1, 0)); o.look.copy(head).add(V(0, -0.05, 0)); o.fov = 30; });
      const ex0 = world.renderer.toneMappingExposure; world.renderer.toneMappingExposure = ex0 * 0.45;
      await wait(2.2);
      world.renderer.toneMappingExposure = ex0;
      remove(world, underU); world.scene.remove(under);

      // 2.3 god's eye: a tiny figure crossing the cave toward a sleeping mountain
      giant.eyePos(eye);
      const u0 = eye.clone().sub(GIANT_AT).setY(0); const away = gf.clone().multiplyScalar(3.9).addScaledVector(side, 1.6).normalize();
      const ledgeTop = Math.max(1.2, eye.y - 1.35);
      const standAt = eye.clone().addScaledVector(away, 6.15).setY(ledgeTop);
      const ledge = temp(new THREE.Mesh(crag(2.2, { sx: 2.3, sy: ledgeTop * 0.55 + 0.3, sz: 2.3, strata: 2 }), seatMat));
      ledge.position.set(standAt.x, ledgeTop * 0.45, standAt.z); ledge.castShadow = ledge.receiveShadow = true;
      const ledgeFoot = standAt.clone().addScaledVector(away, 2.6).setY(0);
      hero.teleport(FIRE_AT.x - 1.0, FIRE_AT.z - 0.8, yawTo(FIRE_AT, ledgeFoot));
      hero.play("carryWalk", 0.2, { layer: "hold", timeScale: 1.6 });
      let target = () => hero.group.position.clone().add(V(Math.sin(hero.group.rotation.y) * 8, 1.2, Math.cos(hero.group.rotation.y) * 8));
      const ungrip = gripStake(world, hero, stake, () => target());
      props.push(ungrip);
      const a0 = hero.group.position.clone();
      lights.setFires(0.8);
      cam((t, o) => { const P = hero.group.position; o.pos.set(P.x + 2, Math.min(17 - t * 0.8, roofAt(P.x + 2, P.z + 6) - 2.5), P.z + 6); o.look.copy(P).lerp(GIANT_AT, 0.25); o.fov = 58; });
      comic.sfx("zzz...", { x: 70, y: 28, r: -8, size: 3, color: "#efe1c2", seconds: 1.4 });
      await over(4.2, k => { hero.group.position.lerpVectors(a0, ledgeFoot, k); hero.group.rotation.y = yawTo(a0, ledgeFoot); });
      // up the ledge
      hero.play("carryIdle", 0.2, { layer: "hold" });
      hero.teleport(standAt.x, standAt.z, yawTo(standAt, eye), ledgeTop + 0.03);
      hero.play("carryIdle", 0.01, { layer: "hold" });
      hero.groundY = ledgeTop + 0.03;
      target = () => giant.eyePos(eye);
      lights.setFires(0.55);

      // 2.4 low profile: Odysseus on the ledge, the stake level, the eye a stake's length away
      const flat = eye.clone().sub(standAt).setY(0).normalize(), sd = V(-flat.z, 0, flat.x);
      const mid = () => standAt.clone().lerp(eye, 0.5);
      const angles = [
        (t, o) => { const m = mid(); o.pos.copy(m).addScaledVector(sd, 7.5).add(V(0, -1.2, 0)); o.look.copy(m).add(V(0, 0.2, 0)); o.fov = 46; },                                  // wide profile
        (t, o) => { giant.eyePos(eye); const p = tipAt(); o.pos.copy(p).lerp(eye, 0.5).addScaledVector(sd, 2.4).add(V(0, 0.5, 0)).addScaledVector(flat, -1.2); o.look.copy(p).lerp(eye, 0.6); o.fov = 38; },  // tip at the lid
        (t, o) => { giant.headPos(head); o.pos.copy(head).addScaledVector(flat, 3.4).addScaledVector(sd, -1.8).add(V(0, 1.8, 0)); o.look.copy(hero.group.position).add(V(0, 1.2, 0)); o.fov = 44; }  // from behind his head
      ];
      cam(angles[0]);
      await wait(1.6);
      let done = false;
      for (let attempt = 0; !done; attempt++) {
        giant.open(0); let push = 0;
        hero.group.position.copy(standAt);
        const h = comic.holdPrompt("DRIVE IT IN", "HOLD SPACE");
        let t = 0, k = 0, ang = 0, angT = 0;
        await new Promise(res => {
          const u = { update: dt => {
            t += dt; angT += dt;
            k = Math.max(0, Math.min(1, k + (h.down() ? 0.3 : -0.5) * dt));
            push = k; h.progress(k);
            hero.group.position.copy(standAt).addScaledVector(flat, 0.9 * push);
            if (h.down() && angT > 0.6) { angT = 0; ang = (ang + 1) % 3; cam(angles[ang]); }
            if (s) s.o.shake = Math.max(s.o.shake, k * 0.08);
            if (h.down() && k > 0.3 && Math.random() < dt * 10) sparks(world, giant.eyePos(V()), 5);
            if (!h.down() && k > 0.1) giant.open(0.15 + Math.random() * 0.2); else if (t < 6) giant.open(0);
            if (t > 6) giant.open(Math.min(1, (t - 6) / 4) * 0.6);
            if (k >= 1 || t > 10) { remove(world, u); res(); }
          } };
          world.add(u);
        });
        h.stop();
        if (k >= 1) done = true;
        else {
          giant.open(1); cam(angles[2]);
          await director.stamp("HE WOKE!", "Hold Space and keep holding. Try again.", { kind: "bad", seconds: 2.2 });
          if (window.__holdFail) window.__holdFail = false, window.__autoHold = true;      // (test runs: fail once, then pass)
          giant.open(0); cam(angles[0]);
        }
      }

      // 2.6 impact: three frames of black, a white flash, one red word
      await comic.black(true, 0.01); await wait(0.06); comic.black(false, 0.01);
      comic.flash();
      giant.blind();
      comic.sfx("THUNK", { x: 34, y: 30, r: -4, size: 13, color: "#d4241a", seconds: 1.6, drift: false });
      for (let k = 0; k < 4; k++) sparks(world, giant.eyePos(V()), 40);

      // the cave takes the hit: slow motion, from up in the dark
      ungrip(); hero.play("idle", 0.3);
      const red = temp(new THREE.PointLight(0xff2a10, 0, 80, 1)); red.position.copy(GIANT_AT).add(V(-6, 8, 6));
      const lowFires = 0.55;
      cam((t, o) => { const m = mid(); o.pos.copy(m).addScaledVector(sd, 12).add(V(0, 2.5, 0)); o.look.copy(m).add(V(0, -0.5, 0)); o.fov = 62; o.shake = Math.max(o.shake, 0.5); });
      world.timeScale = 0.4;
      const tumble = sheep.filter(Boolean).map(o => ({ o, y: o.rotation.y, p: o.position.clone(), ph: Math.random() * 6 }));
      const rack = table.rack, r0 = rack.rotation.clone();
      for (let k = 0; k < 6; k++) sparks(world, COALS_AT.clone().add(V(0, 0.5, 0)), 50);
      dustFall(world, V(GIANT_AT.x - 6, roofAt(GIANT_AT.x - 6, GIANT_AT.z + 6) - 1, GIANT_AT.z + 6), 220);
      dustFall(world, V(8, roofAt(8, -2) - 1, -2), 220);
      stalactite(world, V(standAt.x + 1.6, roofAt(standAt.x, standAt.z) - 2, standAt.z - 0.8), 2.4, p => comic.sfx("KRAK", { x: 58, y: 52, r: 8, size: 5, color: "#efe1c2", seconds: 0.8 }));
      stalactite(world, V(GIANT_AT.x - 12, roofAt(GIANT_AT.x - 12, GIANT_AT.z + 10) - 2, GIANT_AT.z + 10), 3.0);
      stalactite(world, V(10, roofAt(10, 3) - 2, 3), 2.6);
      await over(2.0, k => {
        const gust = k < 0.35 ? 1 - (k / 0.35) * 0.55 : 0.45 + (k - 0.35) * 0.5;   // gust nearly out, then back a little
        lights.setFires(lowFires * gust);
        red.intensity = 400 * Math.max(0, Math.sin(Math.min(1, k * 2.5) * Math.PI));
        for (const q of tumble) { q.o.rotation.y = q.y + Math.sin(k * 20 + q.ph) * 0.5 * (1 - k); q.o.position.y = Math.abs(Math.sin(k * 14 + q.ph)) * 0.4 * (1 - k); }
        rack.rotation.x = r0.x - 1.4 * ease(Math.min(1, k * 1.6));
        rack.position.y = table.top - 0.6 * ease(Math.min(1, k * 1.6));
      });
      world.timeScale = 1;
      for (const q of tumble) { q.o.rotation.y = q.y; q.o.position.y = 0; }
      // silence
      comic.clear();
      await wait(1.0);

      // 2.7 the scream. He rears up, clutching, and swings blind
      world.scene.remove(seat);
      await seated("clutch"); giant.blind();
      giant.place(GIANT_AT.x, 0, GIANT_AT.z, GIANT_AT.x + gf.x * 10, GIANT_AT.z + gf.z * 10);
      cam((t, o) => { giant.headPos(head); o.pos.copy(GIANT_AT).addScaledVector(gf, 9).addScaledVector(side, -3).add(V(0, 0.8, 0)); o.look.copy(head).add(V(0, -2.5, 0)); o.fov = 60; });
      giant.roar(1); s.o.shake = 1.4;
      comic.sfx("AAAAAARRGH!!", { x: 14, y: 16, r: -6, size: 10, color: "#e0442a", seconds: 2.0 });
      hero.fall("fall", { groundY: 0, back: 1.5 }); hero.groundY = 0;
      await over(1.4, k => { giant.group.rotation.z = Math.sin(k * 14) * 0.06; s.o.shake = Math.max(s.o.shake, 0.35); });
      await giant.pose("flail", 0.35);
      await over(0.8, k => { giant.group.rotation.z = Math.sin(k * 10) * 0.08; giant.group.position.addScaledVector(side, Math.sin(k * 8) * 0.04); });
      // his fist into the roof: rock comes down, Odysseus rolls clear into the flock
      await giant.pose("smash", 0.25);
      s.o.shake = 1.6; comic.sfx("KRA-KOOM", { x: 50, y: 18, r: 6, size: 8, color: "#efe1c2", seconds: 1.2 });
      const fist = handAt();
      dustFall(world, V(fist.x, roofAt(fist.x, fist.z) - 0.5, fist.z), 260);
      stalactite(world, V(hero.group.position.x + 0.8, Math.min(14, roofAt(hero.group.position.x, hero.group.position.z) - 1), hero.group.position.z + 0.6), 2.0);
      await wait(1.2);
      giant.roar(0.3); giant.group.rotation.z = 0;

      // 2.8 the ruined eye, its glow going out
      await giant.pose("clutch", 0.6);
      cam((t, o) => { giant.eyePos(eye); o.pos.copy(eye).addScaledVector(gf, 5.5 - t * 0.9).add(V(0, -0.3, 0)); o.look.copy(eye); o.fov = 32; });
      await over(2.0, k => { if (giant.eyeMat) giant.eyeMat.emissiveIntensity = 0.15 * (1 - k); });
      await comic.black(true, 0.6);
      lights.setFires(0.35);
      giant.roar(0);
    }

    // =============================================================================================
    // 3. THE COUNT — dawn, the doorway, a hand on every back
    // =============================================================================================
    if (from <= 3) {
      if (from === 3) { giant.blind(); lights.setFires(0.35); }
      comic.clear();
      door.skyColor = new THREE.Color(0xffd6a0); door.spill.color.set(0xffb070); door.power = 0.9; door.set(0.55);
      const atDoor = V(DOOR_AT.x + 4.2, 0, DOOR_AT.z - 3.2);
      giant.place(atDoor.x, 0, atDoor.z, atDoor.x + 10, atDoor.z + 4); giant.roar(0); giant.blind(); giant.group.rotation.z = 0;
      await giant.pose("reach", 0);
      const dseat = temp(new THREE.Mesh(crag(3.3, { sx: 2.6, sy: 2.2, sz: 2.6 }), seatMat));
      dseat.position.set(atDoor.x - 0.6, 0.9, atDoor.z - 1.2);
      giant.update(0.0001);
      const hp = handAt();
      const lane = [V(-3, 0, 3), V(hp.x + 1.6, 0, hp.z + 0.5), V(hp.x - 1.6, 0, hp.z - 0.3), V(DOOR_AT.x - 3, 0, DOOR_AT.z)];
      // every sheep out of the pens into the world, big as the giant's flock should be
      for (const o of sheep) if (o) { const wp = o.getWorldPosition(V()); world.scene.attach(o); o.position.copy(wp); o.scale.multiplyScalar(1.4); }
      const flock = sheep.slice(0, pens.n ?? 8).filter(Boolean);
      const ram = flock[flock.length - 1];
      ram.scale.multiplyScalar(1.35);
      // the crew: copies of Odysseus hanging under three of the sheep
      const clingTo = (who, o, drop = 0.55) => {
        const u = { update: () => { who.position.copy(o.position).add(V(0, drop * o.scale.y / 1.4, 0)); who.rotation.set(Math.PI / 2, o.rotation.y + Math.PI / 2, 0, "YXZ"); } };
        world.add(u); return () => remove(world, u);
      };
      for (const i of [1, 3, 5]) {
        if (!flock[i]) continue;
        const man = cloneSkinned(hero.body); const g = new THREE.Group(); g.add(man); world.scene.add(g);
        const mx = new THREE.AnimationMixer(man); const a = mx.clipAction(hero.clips.climb); a.play(); a.time = 0.6 + i * 0.3; a.timeScale = 0.08;
        const mu = { update: dt => mx.update(dt) }; world.add(mu);
        const un = clingTo(g, flock[i]);
        crew.push({ g, mx, sheep: flock[i], undo: () => { un(); remove(world, mu); world.scene.remove(g); } });
      }
      const walkSheep = async (o, seconds, until = 1) => {
        const pts = [o.position.clone(), ...lane]; let total = 0; const seg = [];
        for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); seg.push(d); total += d; }
        await over(seconds, k => {
          k *= until;
          let d = k * total, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
          const a = pts[i], b = pts[i + 1], f = Math.min(1, d / seg[i]);
          o.position.lerpVectors(a, b, f); o.position.y = Math.abs(Math.sin(k * 40)) * 0.06;
          o.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
        });
      };
      // 3.1 dawn rim light: the giant fills the doorway, one hand out
      hero.group.visible = false;
      for (const o of flock) o.visible = true;
      cam((t, o) => { o.pos.set(atDoor.x + 13, 2.2, atDoor.z + 7); o.look.set(atDoor.x - 1, 4.5, atDoor.z); o.fov = 52; });
      comic.black(false, 0.6);
      comic.caption("DAWN.", { seconds: 1.6 });
      await wait(1.2);
      // the quick cuts: hand, hooves, knuckles, nostrils; faster each time
      const N = ["Zero.", "One.", "Two.", "Three.", "Four.", "Five.", "Six."];
      const wideDoor = (t, o) => { o.pos.set(atDoor.x + 13 - t * 0.3, 2.2, atDoor.z + 7); o.look.set(atDoor.x - 1, 4.5, atDoor.z); o.fov = 52; };
      const handShot = (t, o) => { const H = handAt(); o.pos.set(H.x + 7, 1.4, H.z + 6.5); o.look.copy(H).add(V(-1, -1.2, 0)); o.fov = 50; };
      const belly = o0 => (t, o) => { const q = o0.scale.x / 1.4; o.pos.copy(o0.position).add(V(2.4 * q, 0.22, 2.8 * q)); o.look.copy(o0.position).add(V(0, 0.45 * q, 0)); o.fov = 40; };
      const face = (t, o) => { giant.headPos(head); o.pos.copy(head).add(V(4, -1.2, 4)); o.look.copy(head).add(V(0, -0.3, 0)); o.fov = 34; };
      const order = [wideDoor, handShot, null, face, handShot, null, wideDoor];
      for (let i = 0; i < flock.length - 1; i++) {
        const o = flock[i];
        walkSheep(o, 2.6).then(() => { o.visible = false; });
        const gap = Math.max(0.6, 1.15 - i * 0.09);
        await wait(gap * 0.7);
        cam(crew.find(c => c.sheep === o) || !order[i] ? belly(o) : order[i]);
        comic.subtitle(N[i], { speaker: "POLYPHEMUS", villain: true, seconds: 0.8 });
        if (i % 2 === 0) comic.sfx("pat", { x: 44 + (i % 3) * 8, y: 40, r: -6, size: 3, color: "#efe1c2", seconds: 0.5 });
        if (i === 3) comic.sfx("sniff", { x: 60, y: 30, r: 4, size: 2.6, color: "#efe1c2", seconds: 0.8 });
        await wait(gap * 0.3 + 0.15);
      }
      await wait(1.0);

      // 3.2 the ram, last. Odysseus under it. The music stops.
      let escaped = false;
      const ramStart = lane[0].clone();
      const under = lane[1].clone().lerp(lane[2], 0.5);
      for (let attempt = 0; !escaped; attempt++) {
        ram.position.copy(ramStart); ram.visible = true;
        hero.group.visible = true;
        hero.play("climb", 0.1, { timeScale: 0.12 });
        const unCling = clingTo(hero.group, ram, 0.36);
        cam(belly(ram));
        const f0 = ram.position.clone();
        await over(2.4, k => { ram.position.lerpVectors(f0, under, ease(k)); ram.rotation.y = yawTo(f0, under) - Math.PI / 2; ram.position.y = Math.abs(Math.sin(k * 26)) * 0.05; });
        // the hand settles on its back, and stays
        cam(handShot);
        await comic.subtitle("Seven.", { speaker: "POLYPHEMUS", villain: true, seconds: 1.2 });
        await comic.subtitle("You're always first out, old friend.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.2 });
        // HOLD SPACE: his fingers slide down the fleece toward Odysseus
        const h = comic.holdPrompt("HANG ON!", "HOLD SPACE");
        const views = [
          (t, o) => { const q = ram.scale.x / 1.4; o.pos.copy(ram.position).add(V(1.7 * q, 0.2, 2.0 * q)); o.look.copy(ram.position).add(V(0, 0.42 * q, 0)); o.fov = 38; },   // his grip in the wool
          (t, o) => { giant.headPos(head); o.pos.copy(head).add(V(3.2, -0.9, 3.2)); o.look.copy(head).add(V(0, -0.4, 0)); o.fov = 32; }                                              // the blind face, listening
        ];
        let t = 0, k = 0, held = true, vi = 0, vt = 0, said = false;
        const armR0 = giant.extra.armR ? giant.extra.armR.clone() : new THREE.Euler();
        cam(views[0]);
        await new Promise(res => {
          const u = { update: dt => {
            t += dt; vt += dt; k = Math.min(1, t / 5.0); h.progress(k);
            if (vt > 0.9) { vt = 0; vi = 1 - vi; cam(views[vi]); }
            if (giant.extra.armR) giant.extra.armR.x = armR0.x - 0.25 * Math.sin(k * Math.PI);    // the hand comes down the side
            if (!said && t > 1.6) { said = true; comic.subtitle("And you're heavy today.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.2 }); }
            if (!h.down() && t > 0.3) held = false;
            if (!held || k >= 1) { remove(world, u); res(); }
          } };
          world.add(u);
        });
        h.stop();
        if (giant.extra.armR) giant.extra.armR.copy(armR0);
        unCling();
        if (held) { escaped = true; break; }
        // he let go: a thud on the stone, and the hand finds him
        hero.group.rotation.set(0, 0, 0); hero.group.position.y = 0; hero.play("fall", 0.1);
        cam((t, o) => { o.pos.copy(ram.position).add(V(3, 1.2, 4)); o.look.copy(ram.position); o.fov = 50; });
        comic.sfx("THUD", { x: 40, y: 50, r: 6, size: 6, color: "#e8c21c", seconds: 0.8 });
        await wait(0.6);
        s.o.shake = 0.8;
        await director.stamp("CAUGHT!", "He felt you drop. Hold Space the whole time. Try again.", { kind: "bad", seconds: 2.4 });
        if (window.__holdFailWord) window.__holdFailWord = null;              // (test runs)
        await comic.black(true, 0.25); await comic.black(false, 0.25);
      }
      // 3.3 he sighs, lifts the hand, pats the ram. "Go on."
      comic.sfx("pat.", { x: 52, y: 26, r: -4, size: 4, color: "#efe1c2", seconds: 0.7 });
      await comic.subtitle("Go on.", { speaker: "POLYPHEMUS", villain: true, seconds: 1.4 });
      // 3.4 daylight blasts the lens as the ram trots into the sun
      const unC2 = clingTo(hero.group, ram, 0.36);
      cam((t, o) => { o.pos.set(DOOR_AT.x + 6, 0.8, DOOR_AT.z + 3.5); o.look.set(DOOR_AT.x - 2, 2.0, DOOR_AT.z); o.fov = 50; });
      const from2 = ram.position.clone(), out = V(DOOR_AT.x - 3, 0, DOOR_AT.z);
      const exp0 = world.renderer.toneMappingExposure;
      await over(1.8, k => { ram.position.lerpVectors(from2, out, k); ram.rotation.y = yawTo(from2, out) - Math.PI / 2; ram.position.y = Math.abs(Math.sin(k * 30)) * 0.05; world.renderer.toneMappingExposure = exp0 * (1 + 3 * k * k); });
      unC2();
      comic.flash();
      world.renderer.toneMappingExposure = exp0;

      // outside: he drops, rolls, sprints downhill; the crew cut loose behind him
      outside = buildOutside(world);
      outside.show(true);
      door.sky.visible = false;
      const fogWas = world.scene.fog, bgWas = world.scene.background;
      world.scene.fog = new THREE.FogExp2(0xc89a78, 0.004);
      c._restoreFog = () => { world.scene.fog = fogWas; world.scene.background = bgWas; };
      for (const o of flock) o.visible = false;
      hero.group.rotation.set(0, 0, 0);
      hero.teleport(DOOR_AT.x - 4.5, DOOR_AT.z + 0.5, -Math.PI / 2, 0); hero.groundY = 0;
      for (const [i, cr] of crew.entries()) {
        cr.undo(); world.scene.add(cr.g);
        cr.g.rotation.set(0, -Math.PI / 2, 0); cr.g.position.set(DOOR_AT.x - 1.5 + i * 1.8, 0, DOOR_AT.z + (i - 1) * 1.6);
        cr.mx.stopAllAction(); const a = cr.mx.clipAction(hero.clips.walk); a.play(); a.timeScale = 2.2;
        const mu = { update: dt => cr.mx.update(dt) }; world.add(mu); cr.undo = () => { remove(world, mu); world.scene.remove(cr.g); };
      }
      hero.play("fall", 0.05);
      cam((t, o) => { const P = hero.group.position, k = Math.min(1, t / 4.6); o.pos.set(P.x + 2 - 7 * k, P.y + 1.0 + 2.4 * k, P.z + 5 + 5 * k); o.look.set(P.x - 1, P.y + 0.9, P.z); o.fov = 52; });
      comic.sfx("WHUMP", { x: 40, y: 56, r: 6, size: 6, color: "#e8c21c", seconds: 0.7 });
      await wait(0.7);
      hero.play("walk", 0.15, { timeScale: 2.4 });
      comic.sfx("SKRRT", { x: 58, y: 60, r: -6, size: 5, color: "#efe1c2", seconds: 0.7 });
      const r0 = hero.group.position.clone(), r1 = V(-56, 0, DOOR_AT.z + 1);
      const c0s = crew.map(cr => cr.g.position.clone());
      await over(3.8, k => {
        hero.group.position.lerpVectors(r0, r1, k); hero.group.position.y = outside.groundY(hero.group.position.x); hero.group.rotation.y = -Math.PI / 2;
        crew.forEach((cr, i) => { const kk = Math.max(0, k - 0.12 - i * 0.05); cr.g.position.lerpVectors(c0s[i], V(r1.x + 4 + i * 2, 0, r1.z + (i - 1) * 1.6), kk); cr.g.position.y = outside.groundY(cr.g.position.x); });
      });
      await comic.black(true, 0.25);
      crew.forEach(cr => cr.undo()); crew.length = 0;
    }

    // =============================================================================================
    // 4. THE ENDING (B): the empty pens, one count too many. Then the cheese.
    // =============================================================================================
    if (outside) { outside.show(false); world.scene.remove(outside.group); outside = null; if (c._restoreFog) c._restoreFog(); c._restoreFog = null; }
    door.sky.visible = true;
    lights.setFires(0.75);
    for (const o of sheep) if (o) o.visible = false;
    giant.blind(); giant.roar(0); giant.group.rotation.z = 0;
    hero.group.visible = false;
    // he sits behind the row of empty pens and counts them; each pen lights its index as he says it
    const mid = pens.spot(4.5);
    giant.place(mid.x + 1, 0, 13, mid.x + 1, -10); await giant.pose("sitTap", 0);
    cam((t, o) => { o.pos.set(mid.x - 0.4 * t, 3.4, 8.2); o.look.set(mid.x, 0.9, 0); o.fov = 60; });
    comic.black(false, 0.4);
    const PN = ["Zero...", "one...", "two...", "three...", "four...", "five...", "six...", "seven."], ptags = [];
    for (let i = 0; i < 8; i++) {
      const tag = indexTag(String(i)); tag.position.copy(pens.spot(i)).add(V(0, 1.9, 0)); tag.scale.setScalar(0.8); world.scene.add(tag); ptags.push(tag);
      comic.subtitle(PN[i], { speaker: "POLYPHEMUS", villain: true, seconds: 0.7 });
      comic.sfx("pat", { x: 22 + i * 8, y: 40, r: -6, size: 2.6, color: "#efe1c2", seconds: 0.4 });
      await wait(i < 2 ? 0.75 : 0.5);
    }
    props.push(() => ptags.forEach(t => world.scene.remove(t)));
    // ...and one more
    const t8 = indexTag("8", "#e0442a"); t8.position.copy(pens.spot(8)).add(V(0, 1.9, 0)); t8.scale.setScalar(0.9); world.scene.add(t8); ptags.push(t8);
    comic.sfx("pat?", { x: 84, y: 40, r: 6, size: 3, color: "#e0442a", seconds: 0.7 });
    await wait(0.5);
    { const fl = temp(new THREE.PointLight(0xff8a40, 60, 12, 1.4)); fl.position.copy(giant.headPos(V())).add(V(1, -2, -4)); }
    cam((t, o) => { giant.headPos(head); o.pos.copy(head).add(V(1.6, -1.6, -6.5)); o.look.copy(head).add(V(0, -0.4, 0)); o.fov = 34; });
    await comic.subtitle("...Eight?", { speaker: "POLYPHEMUS", villain: true, seconds: 2.0 });
    await director.stamp("INDEX OUT OF BOUNDS", "flock[8] — but n = 8. The last sheep was flock[7].", { kind: "bad", seconds: 2.4 });
    await director.freeze("POLYPHEMUS", "Counted to seven. Twice.", 2.6);
    // smash cut: the ship, in the sun. CHOMP.
    outside = buildOutside(world);
    outside.show(true);
    door.sky.visible = false;
    { const fogWas = world.scene.fog; world.scene.fog = new THREE.FogExp2(0xc89a78, 0.003); c._restoreFog = () => { world.scene.fog = fogWas; }; }
    const ship = outside.ship;
    ship.position.set(-100, -13.9, -2);
    const stern = ship.localToWorld(V(0, 3.0, 11));
    hero.group.visible = true;
    hero.teleport(stern.x, stern.z, Math.atan2(DOOR_AT.x - stern.x, DOOR_AT.z - stern.z) + 1.2, stern.y); hero.groundY = stern.y;
    hero.stand(0);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 20, 1, false, 0.5, Math.PI * 2 - 0.5), [new THREE.MeshStandardMaterial({ color: 0x8a6a34 }), new THREE.MeshStandardMaterial({ color: 0xc9a85e }), new THREE.MeshStandardMaterial({ color: 0xc9a85e })]);
    wheel.rotation.x = Math.PI / 2;
    const wg = new THREE.Group(); wg.add(wheel);
    const wheelOff = inHand(world, hero.bones.rHand, wg, { offset: [0, 10, 3], yaw: () => hero.group.rotation.y }); props.push(wheelOff);
    hero.raise = { side: 0.0, up: 0.28, fwd: 0.18, w: 1 };
    cam((t, o) => { hero.bones.head.getWorldPosition(head); const f = V(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y)), sd = V(-f.z, 0, f.x); o.pos.copy(head).addScaledVector(f, 2.0).addScaledVector(sd, 0.8).add(V(0, -0.25, 0)); o.look.copy(head).add(V(0, -0.1, 0)); o.fov = 36; });
    comic.flash();
    await wait(0.5);
    comic.sfx("CHOMP", { x: 56, y: 30, r: -8, size: 9, color: "#ffd23a", seconds: 1.2 });
    await wait(0.9);
    await director.freeze(cardAfter.name, cardAfter.sub + "<br><i>Took the cheese.</i>", 4.0);
    hero.raise = null; wheelOff();
    await comic.black(true, 0.8);

    // =============================================================================================
    // STINGER (A): the sea heard anyway
    // =============================================================================================
    hero.raise = null;
    const sea = outside.sea;
    ship.position.set(-128, -13.9, -2);
    const sternB = ship.localToWorld(V(0, 3.0, 11));
    hero.teleport(sternB.x, sternB.z, Math.atan2(DOOR_AT.x - sternB.x, DOOR_AT.z - sternB.z), sternB.y); hero.groundY = sternB.y; hero.stand(0);
    const shore = V(-63, 0, DOOR_AT.z + 2); shore.y = outside.groundY(shore.x) - 0.6;
    giant.place(shore.x, shore.y, shore.z, -200, shore.z); await giant.pose("bow", 0); giant.blind();
    const bseat = temp(new THREE.Mesh(crag(5.5, { sx: 2.6, sy: 1.6, sz: 2.6 }), seatMat)); bseat.position.set(shore.x + 0.6, shore.y + 0.2, shore.z - 1.0);
    comic.black(false, 0.8);
    comic.caption("LATER.", { seconds: 1.4 });
    cam((t, o) => { o.pos.set(shore.x - 30, -9, shore.z + 22); o.look.set(shore.x - 4, -6, shore.z); o.fov = 50; });
    await wait(2.4);
    cam((t, o) => { giant.headPos(head); o.pos.copy(head).add(V(-5.0, -1.0, -1.8)); o.look.copy(head).add(V(0, -0.3, 0)); o.fov = 34; });
    await wait(0.5);
    await comic.subtitle("Father.", { speaker: "POLYPHEMUS", villain: true, seconds: 2.0 });
    // the sea goes flat and silent
    const dist = sea && sea.water.material.uniforms.distortionScale;
    const d0 = dist ? dist.value : 0;
    const big = seaEye(80); big.position.set(ship.position.x, -12.95, ship.position.z); big.rotation.z = 0.15; temp(big);
    cam((t, o) => { o.pos.set(ship.position.x + 6, 44 + t * 1.5, ship.position.z + 12); o.look.set(ship.position.x, -13, ship.position.z); o.fov = 54; });
    await over(1.6, k => { if (dist) dist.value = d0 * (1 - k); });
    sea && (sea.update = () => {});                                            // the waves stop
    await wait(0.6);
    await over(2.2, k => { big.material.opacity = ease(k) * 0.95; big.scale.set(1, Math.max(0.02, ease(k)), 1); });
    // Odysseus at the stern, looking down
    cam((t, o) => { hero.bones.head.getWorldPosition(head); o.pos.copy(head).add(V(1.4, -0.8, 1.2)); o.look.copy(head).add(V(0, -0.2, 0)); o.fov = 30; });
    await wait(2.2);
    await comic.black(true, 0.5);
    await comic.caption("THE SEA HEARD ANYWAY.", { x: 30, y: 46, seconds: 2.6 });
  } finally {
    if (s) s.stop();
    props.forEach(f => f());
    crew.forEach(cr => cr.undo());
    hero.raise = null;
    if (outside) { outside.show(false); world.scene.remove(outside.group); if (outside.sea) delete outside.sea.update; }
    if (c._restoreFog) c._restoreFog();
    lights.setFires(1);
    door.sky.visible = true; door.skyColor = null; door.power = 1; door.set(0);
    stake.position.copy(stakeHome.p); stake.quaternion.copy(stakeHome.q);
    if (stake.parent !== world.scene) world.scene.add(stake);
    if (tipMat.emissive) tipMat.emissive.setRGB(0, 0, 0);
    sheep.forEach((o, i) => { if (!o || !sheepHome[i]) return; sheepHome[i].parent.attach(o); o.position.copy(sheepHome[i].p); o.rotation.set(0, sheepHome[i].r, 0); o.scale.copy(sheepHome[i].s); o.visible = true; });
    giant.place(GIANT_AT.x, 0, GIANT_AT.z, 8, 4); giant.group.rotation.z = 0;
    await giant.pose("stand", 0); giant.play("idle", 0); giant.open(0.25); giant.roar(0); giant.look(null);
    if (giant.eyeMat && giant.eyeColor) { giant.blinded = false; giant.eyeMat.color.copy(giant.eyeColor); giant.eyeMat.emissiveIntensity = 0.55; }
    hero.group.rotation.set(0, 0, 0); hero.group.visible = true; hero.groundY = 0;
    hero.teleport(FIRE_AT.x + 1.7, FIRE_AT.z + 1.9, 2.4, 0); hero.stand(0);
    world.timeScale = 1;
    comic.clear();
    world.grade.uniforms.letterbox.value = 0;
    document.body.classList.remove("cinematic");
    await comic.black(false, 0.8);
  }
}
