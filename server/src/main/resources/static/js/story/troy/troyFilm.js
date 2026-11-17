// troyFilm.js — the opening film, "The Sacker of Cities" (about 1:44), from the screenplay (Version 2, approved):
//  1 black: two typed cards                      2 inside the horse: the red cord, the hand on the wrist, three fingers
//  3 the hatch: men slide down the rope          4 the city falls: the gate, a torch, fire roof to roof, over the wall
//  5 on the wall: his name                       6 the trident in the stone: "Poseidon built these walls."
//  7 the beach at dawn: the men cheer him        8 the libation: "The sea didn't win this war."
//  9 under the keel: something passes; the sail goes slack and fills again (a warning)
// 10 twelve ships: "Twelve ships." "Ten days' sail to Ithaca." "That was the plan."
// 11 the title over a dark sea; rain begins, and carries on into the Harbour.
// It never names the chapters, shows no map and hints nothing of the ending. Esc fast-forwards (the page owns that).
import * as THREE from "three";
import { sound } from "../../engine/sound.js";
import { Storm } from "./troyStorm.js";
import { Fire } from "../../engine/weather.js";
import { reachArm } from "../crew.js";
import { plankTexture } from "../../engine/textures.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const UP = V(0, 1, 0);

// drive the camera for one shot: fn(t, o) sets o.pos, o.look, o.fov each frame (t in film seconds)
function shotCam(world, director, fn) {
  let t = 0, live = true;
  const o = { pos: V(), look: V(), fov: 40 };
  const u = { update: (dt, time, raw) => {
    if (!live) return;
    t += dt; fn(t, o);
    director.mode = null; director.moves = director.moves.filter(m => !m.cam);
    director.cam.position.copy(o.pos); director.look.copy(o.look); director.setFov(o.fov); director.cam.lookAt(o.look);
  } };
  world.add(u);
  return { o, stop() { live = false; const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); } };
}
// an updater that runs fn(dt) every frame until stopped
function every(world, fn) { const u = { update: (dt, t, raw) => fn(dt, t, raw) }; world.add(u); return { stop() { const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); } }; }

// fingers: curl (0 open .. 1 a fist) the named fingers of one hand; applied after the animation, every frame
const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
function fingerRig(world, body, side = "Right") {
  const bones = {}; for (const f of FINGERS) bones[f] = [1, 2, 3].map(j => body.getObjectByName(`mixamorig${side}Hand${f}${j}`)).filter(Boolean);
  const rest = new Map(); for (const f of FINGERS) for (const b of bones[f]) rest.set(b, b.quaternion.clone());   // the hand's pose when the rig starts
  const curl = Object.fromEntries(FINGERS.map(f => [f, 0]));
  const ax = V(1, 0, 0), q = new THREE.Quaternion();
  // ABSOLUTE pose every frame (rest × curl). The motion clips animate only some finger joints, so adding a bend on top of
  // whatever is there made the untouched joints turn a little more each frame: the hand "rolled". Setting it outright cannot drift.
  const u = every(world, () => { for (const f of FINGERS) for (const b of bones[f]) b.quaternion.copy(rest.get(b)).multiply(q.setFromAxisAngle(ax, curl[f] * (f === "Thumb" ? 0.7 : 1.35))); });
  return { curl, stop: u.stop };
}

// a man's world position for a point in his ship's own frame (the ship moves; the men ride it)
const onShip = (ship, local) => { ship.updateMatrixWorld(); return local.clone().applyMatrix4(ship.matrixWorld); };

// the inside of the horse: a plank tunnel in the dark, far from the city. Torchlight outside moves past the gaps.
function buildBelly(world, at) {
  const g = new THREE.Group(); g.position.copy(at); world.scene.add(g);
  const pk = plankTexture({ boards: 2, base: [46, 32, 22], light: [80, 58, 40], seed: 41 });
  const mat = new THREE.MeshStandardMaterial({ ...pk, roughness: 0.95 });
  const L = 9, Wd = 3.0, H = 2.3;
  // walls of separate planks with thin gaps: the torchlight comes through those gaps as slits
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(L, 0.22, 0.08), mat); p.position.set(0, 0.15 + i * 0.255, s * Wd / 2); p.castShadow = p.receiveShadow = true; g.add(p);
  }
  for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 0.235), mat); p.position.set(0, H, -Wd / 2 + 0.13 + i * 0.25); p.castShadow = p.receiveShadow = true; g.add(p); }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, Wd), mat); floor.receiveShadow = true; g.add(floor);
  for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.BoxGeometry(0.1, H + 0.1, Wd), mat); end.position.set(s * L / 2, H / 2, 0); end.castShadow = end.receiveShadow = true; g.add(end); }
  for (let x = -4; x <= 4; x += 1.6) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 0.18), mat); r.position.set(x, H / 2, Wd / 2 - 0.12); g.add(r); const r2 = r.clone(); r2.position.z = -Wd / 2 + 0.12; g.add(r2); }
  // the hatch in the floor and its bolt
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.0), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 })); hatch.position.set(0.8, 0.07, 0); g.add(hatch);
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x7c6034, metalness: 0.8, roughness: 0.45 })); bolt.position.set(1.0, 0.58, -0.1); g.add(bolt);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), mat); post.position.set(1.0, 0.31, -0.18); g.add(post);   // the bolt sits on the hatch frame's post, at hand height
  // two torches carried past outside, one each side
  const lights = [-1, 1].map(s => {
    const L2 = new THREE.SpotLight(0xff8a3c, 0, 16, 0.9, 0.35, 1.0); L2.castShadow = true; L2.shadow.mapSize.set(1024, 1024); L2.shadow.bias = -0.002;
    L2.position.set(-6, 1.6, s * 3.2); L2.target.position.set(0, 1.2, 0); g.add(L2, L2.target); return L2;
  });
  const fill = new THREE.PointLight(0x8a6a50, 5, 9, 1.4); fill.position.set(0.5, 1.7, 0); g.add(fill);
  const fill2 = new THREE.PointLight(0x9a6a40, 4, 7, 1.4); fill2.position.set(-2.4, 1.6, 0); g.add(fill2);   // a little torchlight leaking in at the far end
  return { g, lights, bolt: bolt, at, dispose() { world.scene.remove(g); } };
}

// his ship's sail, let down for the voyage: a square sail that can fill (1), go slack (0) and fill again
function buildSail(world) {
  const geo = new THREE.PlaneGeometry(11, 7.2, 16, 10); geo.rotateY(Math.PI / 2);          // spans the ship's z (beam), faces along its x
  const base = geo.attributes.position.array.slice();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcdbb98, roughness: 0.95, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  const sail = { mesh: m, fill: 1, flutter: 0, t: 0 };
  sail.update = dt => {
    sail.t += dt; const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = base[i * 3 + 2], y = base[i * 3 + 1];
      const u = z / 5.5, v = (y + 3.6) / 7.2;
      const belly = (1 - u * u) * Math.sin(Math.PI * Math.min(1, v * 1.05)) * 1.9;
      const flap = Math.sin(sail.t * 9 + u * 4 + v * 3) * 0.35 * sail.flutter * (1 - v * 0.5);
      p.setX(i, base[i * 3] + belly * sail.fill + flap);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  return sail;
}

// typed cards over the live picture (the lore style, without the black box): one line at a time, the older lines dimmed
async function typeCards(D, lines, { cps = 26, holdEach = 1.6, holdEnd = 1.0 } = {}) {
  if (D.skipping) return;
  const box = document.createElement("div");
  Object.assign(box.style, { position: "fixed", left: "8%", top: "24%", zIndex: 32, pointerEvents: "none", font: "700 clamp(15px, 1.5vw, 21px) 'Courier Prime', monospace",
    letterSpacing: "1px", color: "#f4ead2", textShadow: "0 2px 8px rgba(0,0,0,.9), 0 0 2px #000", lineHeight: "2", transition: "opacity .8s" });
  document.body.appendChild(box);
  for (const line of lines) {
    if (D.skipping) break;
    box.querySelectorAll("p").forEach(p => p.style.opacity = "0.45");
    const p = document.createElement("p"); p.style.margin = "0"; box.appendChild(p);
    for (let i = 1; i <= line.length && !D.skipping; i++) { p.textContent = line.slice(0, i); if (i % 2 === 0) sound.cue("type"); await D._wait(1 / cps); }
    p.textContent = line;
    await D._wait(holdEach);
  }
  await D._wait(holdEnd);
  box.style.opacity = "0"; await D._wait(0.8); box.remove();
}

export async function playTroyOpening({ world, director, comic, troy, hero, crew, horse, titleEl, quality = "high" }) {
  const D = director, wait = s => D._wait(s), tween = (s, fn) => D._move(s, fn, true), overCards = (l, o) => typeCards(D, l, o);
  const scene = world.scene, sk = () => !!D.skipping;
  const ships = troy.ships, his = troy.hisShip;
  const PL = troy.PLATEAU, WT = troy.WALL_TOP;

  // ---- cast (crewmen are copies of his figure; Elpenor wears the red cord, unnamed in this film)
  const men = {};
  for (const [name, tint, cord] of [["Polites", 0xd6cdbd], ["Elpenor", 0xe3dccf, true], ["Eurylochus", 0xb8ae9c], ["Perimedes", 0xc4b8a4], ["Lycus", 0xa9a08f], ["Antiphus", 0xcabfae]])
    men[name] = crew.add({ name, tint, cord: !!cord });
  const crewList = Object.values(men);
  const hide = (...ms) => ms.forEach(m => m.group.visible = false), show = (...ms) => ms.forEach(m => m.group.visible = true);

  // ---- the horse in the court, nose to the gate
  const HSPOT = V(4, PL, troy.GATE.z - 24);
  horse.position.copy(HSPOT); horse.rotation.y = -Math.PI / 2 + (horse.userData.facing || 0);
  if (!horse.parent) troy.root.add(horse);
  const hatch = horse.userData.hatch;
  const bellyY = PL + (horse.userData.bellyY || 5.2);
  const hatchWorld = () => { horse.updateMatrixWorld(); return V(0, horse.userData.bellyY || 5.2, 0).applyMatrix4(horse.matrixWorld); };

  // the start: night, the city whole and singing; the gate shut; the fleet on the beach
  troy.setMood("night", { burn: 0 }); troy.openGate(0); troy.fleet.visible = true;
  hide(...crewList); hero.group.visible = false;
  const moon0 = troy.moon.intensity, hemi0 = troy.hemi.intensity;
  document.body.classList.add("cinematic"); comic.letterbox(true); world.grade.uniforms.letterbox.value = 1;
  await comic.black(true, 0.01);
  const cleanup = [];

  try {
    // ================= 1 · 0:00–0:05 · black, two typed cards
    sound.crowd(true, { mood: "song", level: 0.035 });
    setTimeout(() => !sk() && sound.creak({ level: 0.14, seconds: 2.2, from: 420, to: 180 }), 2600);
    await comic.prologue(["TROY. THE TENTH YEAR OF THE WAR.", "Nobody had ever got through its walls."], { cps: 44, holdEach: 1.0, holdEnd: 0.3 });

    // ================= 2 · 0:05–0:16 · inside the horse
    const IN = V(700, 60, -700);
    const belly = buildBelly(world, IN); cleanup.push(() => belly.dispose());
    troy.moon.intensity = 0; troy.hemi.intensity = 0.02;                 // in here, no moon
    // the men, crammed in two rows, low (they are sitting on the planks: only heads, shoulders and hands are seen)
    const sitY = IN.y - 0.35;
    const rowA = [["Antiphus", -3.2], ["Perimedes", -1.9], ["Elpenor", 0.75]], rowB = [["Lycus", -2.6], ["Polites", -1.2]];
    for (const [n, x] of rowA) { show(men[n]); men[n].place(IN.x + x, sitY, IN.z + (n === "Elpenor" ? -0.5 : -0.85), 0); men[n].play("idle", 0, { timeScale: 0.3 }); }
    for (const [n, x] of rowB) { show(men[n]); men[n].place(IN.x + x, sitY, IN.z + 0.85, Math.PI); men[n].play("idle", 0, { timeScale: 0.3 }); }
    hero.group.visible = true; hero.teleport(IN.x + 1.2, IN.z + 0.25, Math.PI, sitY);   // crammed in beside the boy hero.play("idle", 0, { timeScale: 0.3 });
    // torchlight moving past the gaps
    const torchMove = every(world, (dt, t) => { belly.lights.forEach((L, i) => { L.intensity = 420; L.position.x = IN.x + ((t * 0.9 + i * 4.5) % 14) - 7; }); });
    cleanup.push(() => torchMove.stop());
    comic.black(false, 0.6);
    // (a) faces along the row, locked off
    let cam = shotCam(world, D, (t, o) => { o.pos.set(IN.x + 2.9, IN.y + 1.05, IN.z - 0.3); o.look.set(IN.x - 2.5, IN.y + 0.95, IN.z - 0.75); o.fov = 34; });
    await wait(3.0); cam.stop();
    // (b) the young man's hand goes for the bolt; Odysseus's hand closes over the wrist, without looking
    const E = men.Elpenor, boltW = () => belly.bolt.getWorldPosition(V());
    let reachK = 0, holdK = 0;
    const handE = () => E.bones.rHand.getWorldPosition(V());
    const handKey = new THREE.PointLight(0xffa060, 0, 3.2, 1.5); scene.add(handKey); cleanup.push(() => scene.remove(handKey));
    const arms = every(world, () => {
      if (reachK > 0) reachArm(E.bones, "r", boltW().add(V(-0.05, 0.08, 0)), reachK);
      if (holdK > 0) reachArm(hero.bones, "l", handE().add(V(0, 0.06, 0)), holdK);
    });
    cleanup.push(() => arms.stop());
    cam = shotCam(world, D, (t, o) => { const b = boltW(); o.pos.set(b.x + 1.7, b.y + 1.15, b.z - 0.15); o.look.set(b.x - 0.4, b.y + 0.3, b.z - 0.25); o.fov = 34; });
    handKey.position.copy(boltW()).add(V(0.3, 0.9, 0.5)); handKey.intensity = 2.2;
    tween(1.4, k => reachK = ease(k));
    await wait(1.5);
    sound.chord && !sk() && sound.heart({ level: 0.5 });
    await tween(0.6, k => holdK = ease(k));
    await wait(1.4); cam.stop();
    // (c) three fingers; folded one by one on the last creaks of the gate
    const fr = fingerRig(world, hero.body, "Right"); cleanup.push(() => fr.stop());
    fr.curl.Thumb = 1; fr.curl.Pinky = 1;
    let raiseK = 0; const fingersAt = () => { hero.group.updateMatrixWorld(); return V(-0.3, 1.48, 0.36).applyMatrix4(hero.group.matrixWorld); };   // in front of his face (he sits low: his feet are under the planks)
    const raise = every(world, () => { if (raiseK > 0) reachArm(hero.bones, "r", fingersAt(), raiseK); });
    cleanup.push(() => raise.stop());
    cam = shotCam(world, D, (t, o) => { const f = fingersAt(), fw = V(0, 0, 1).applyAxisAngle(UP, hero.group.rotation.y), rt = V(-1, 0, 0).applyAxisAngle(UP, hero.group.rotation.y); o.pos.copy(f).addScaledVector(fw, 0.9).addScaledVector(rt, -0.25).add(V(0, 0.06, 0)); o.look.copy(f).add(V(0, 0.02, 0)); o.fov = 30; });
    handKey.position.copy(fingersAt()).add(V(0.25, 0.25, 0).applyAxisAngle(UP, hero.group.rotation.y)).addScaledVector(V(0, 0, 1).applyAxisAngle(UP, hero.group.rotation.y), 0.5); handKey.intensity = 1.8;
    await tween(0.7, k => raiseK = ease(k));
    sound.crowd(true, { mood: "song", level: 0.02 });
    for (const f of ["Ring", "Middle", "Index"]) {
      await wait(1.0);
      if (!sk()) sound.creak({ level: 0.2, seconds: 0.9, from: 380, to: 160 });
      await tween(0.3, k => fr.curl[f] = ease(k));
    }
    sound.crowd(false);
    await wait(0.6); cam.stop(); raise.stop(); fr.stop(); arms.stop(); torchMove.stop(); handKey.intensity = 0;
    belly.dispose(); troy.moon.intensity = moon0; troy.hemi.intensity = hemi0;
    hide(...crewList);

    // ================= 3 · 0:16–0:22 · the hatch
    // two braziers in the court, left from the Trojans' feast: the only warm light on the horse
    const braziers = [V(HSPOT.x - 7, PL + 1.2, HSPOT.z + 5), V(HSPOT.x + 6, PL + 1.2, HSPOT.z - 6)].map(p => { const f = new Fire(world, p, { size: 0.9, count: 50, light: true, embers: true }); world.add(f); return f; });
    cleanup.push(() => braziers.forEach(f => { f.level = 0; world.updaters.splice(world.updaters.indexOf(f), 1); scene.remove(f.points); if (f.light) scene.remove(f.light); if (f.embers) scene.remove(f.embers.points); }));
    const H0 = hatchWorld();
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), new THREE.MeshStandardMaterial({ color: 0x8c7650, roughness: 1 }));
    rope.visible = false; troy.root.add(rope); cleanup.push(() => troy.root.remove(rope));
    cam = shotCam(world, D, (t, o) => { o.pos.set(HSPOT.x - 9.5, PL + 1.1, HSPOT.z - 10 + t * 0.15); o.look.set(HSPOT.x + 0.5, PL + 5.2 + Math.min(1, t / 3) * 3.5, HSPOT.z + 6); o.fov = 50; });
    await wait(0.6);
    if (!sk()) sound.hatch({ level: 0.6 });
    tween(0.45, k => { if (hatch) hatch.rotation.z = -1.9 * (1 - Math.pow(1 - k, 3)); });
    await wait(0.5);
    rope.visible = true;
    await tween(0.4, k => { const len = Math.max(0.01, (H0.y - PL) * k); rope.scale.y = len; rope.position.set(H0.x + 0.5, H0.y - len / 2, H0.z); });
    // dark figures slide down, one after another; Odysseus last, not hurrying
    const slide = async (m, seconds, isHero) => {
      const top = V(H0.x + 0.5, H0.y - 1.9, H0.z), bot = V(H0.x + 0.5, PL, H0.z);
      if (isHero) { hero.group.visible = true; hero.teleport(top.x, top.z, Math.PI, top.y); hero.play("climb", 0.05, { timeScale: -0.6 }); }
      else { show(m); m.place(top.x, top.y, top.z, Math.PI); m.play("climb", 0.05, { timeScale: -1 }); }
      const g = isHero ? hero.group : m.group;
      await tween(seconds, k => g.position.y = lerp(top.y, bot.y, k * k * (isHero ? 1 : 1.0)));
      g.position.y = PL;
      if (isHero) { hero.play("walk", 0.3); } else { m.walkTo(H0.x - 3 - Math.random() * 3, H0.z + 4 + Math.random() * 5, { speed: 2.6 }); }
    };
    const order = ["Lycus", "Perimedes", "Antiphus", "Eurylochus"];
    for (const n of order) { slide(men[n], 0.75); if (!sk()) sound.whoosh({ seconds: 0.5, level: 0.12 }); await wait(0.55); }
    await wait(0.4);
    await slide(null, 1.3, true);
    const walkOff = every(world, dt => { hero.group.position.z += dt * 1.35; }); cleanup.push(() => walkOff.stop());
    sound.silence(0.2); await wait(0.9); sound.restore(0.3);
    walkOff.stop(); cam.stop(); hide(...crewList);

    // ================= 4 · 0:22–0:34 · the city falls (four cuts, three seconds each; drums on every cut)
    const drum = () => !sk() && sound.boom({ freq: 92, to: 48, seconds: 0.5, level: 0.55 });
    // (a) the great gate pushed open from inside, toward camera
    drum(); if (!sk()) sound.boom({ freq: 48, to: 26, seconds: 2.4, level: 0.7 });
    const spill = new THREE.PointLight(0xff8a3c, 0, 60, 1.4); spill.position.set(troy.GATE.x, PL + 4, troy.GATE.z - 8); scene.add(spill); cleanup.push(() => scene.remove(spill));
    const gz = troy.GATE.z + 38, gy = troy.groundAt(troy.GATE.x + 5, gz) + 1.7;
    cam = shotCam(world, D, (t, o) => { o.pos.set(troy.GATE.x + 5, gy, gz - t * 1.2); o.look.set(troy.GATE.x, PL + 4.5, troy.GATE.z); o.fov = 40; });
    tween(2.2, k => { troy.openGate(ease(k), true); spill.intensity = 900 * ease(k); });
    await wait(3.0); cam.stop();
    // (b) a torch thrown onto a roof
    drum();
    const roof = troy.houseTops.slice().sort((a, b) => a.distanceTo(V(-14, PL, troy.GATE.z - 40)) - b.distanceTo(V(-14, PL, troy.GATE.z - 40)))[0];
    const thrower = men.Eurylochus; show(thrower); thrower.place(roof.x + 6, troy.groundAt(roof.x + 6, roof.z + 6), roof.z + 6, 0); thrower.face(roof.x, roof.z);
    const brand = new THREE.Group(); const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x3a2618 })); brand.add(stick);
    const flame = new THREE.PointLight(0xff8a3c, 40, 12, 1.8); flame.position.y = 0.45; brand.add(flame);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb050, toneMapped: false })); tip.position.y = 0.42; brand.add(tip);
    troy.root.add(brand); cleanup.push(() => troy.root.remove(brand));
    const from = V(roof.x + 5.6, troy.groundAt(roof.x + 6, roof.z + 6) + 2.0, roof.z + 5.6);
    cam = shotCam(world, D, (t, o) => { o.pos.set(roof.x + 13, roof.y + 4.5, roof.z + 14); o.look.set(roof.x + 2.5, roof.y - 1.0, roof.z + 2.5); o.fov = 48; });
    if (!sk()) sound.whoosh({ seconds: 0.9, level: 0.3 });
    await tween(1.1, k => { brand.position.lerpVectors(from, roof, k); brand.position.y += Math.sin(k * Math.PI) * 4; brand.rotation.z = k * 8; });
    if (!sk()) { sound.fire(true, { level: 0.06 }); sound.crash({ seconds: 0.6, level: 0.3 }); }
    troy.setBurn(0.02, roof);
    await tween(1.9, k => troy.setBurn(0.02 + 0.1 * k, roof));
    cam.stop(); hide(thrower); troy.root.remove(brand); spill.intensity = 0;
    // (c) fire spreading roof to roof, from high above
    drum(); if (!sk()) sound.crowd(true, { mood: "roar", level: 0.05 });
    cam = shotCam(world, D, (t, o) => { o.pos.set(roof.x + 30 - t * 4, 70, roof.z + 35 - t * 3); o.look.set(roof.x - 10, PL, roof.z - 25); o.fov = 48; });
    await tween(3.0, k => troy.setBurn(0.12 + 0.45 * k, roof));
    cam.stop();
    // (d) a crane up and over the wall to the whole burning city
    drum(); if (!sk()) { sound.horn({ level: 0.22, seconds: 2.4 }); sound.fire(true, { level: 0.1 }); }
    cam = shotCam(world, D, (t, o) => { const k = ease(Math.min(1, t / 3)); o.pos.set(lerp(18, 40, k), lerp(PL + 2, 62, k), lerp(troy.GATE.z + 30, troy.GATE.z + 40, k)); o.look.set(0, lerp(PL + 12, PL + 4, k), lerp(troy.GATE.z, troy.C.z, k)); o.fov = 44; });
    tween(3.0, k => troy.setBurn(0.57 + 0.43 * k, roof));
    comic.caption("Ten years, the walls held. One idea opened them.", { x: 6, y: 16, seconds: 3.2 });
    await wait(3.0); cam.stop(); troy.setBurn(1, roof);

    // ================= 5 · 0:34–0:44 · on the wall
    const phiE = Math.atan2(troy.stairTop.x - troy.C.x, troy.stairTop.z - troy.C.z), tPhi = troy.tridentPhi;
    const outward = phi => V(Math.sin(phi), 0, Math.cos(phi));
    const along = phi => V(Math.cos(phi), 0, -Math.sin(phi));
    const ringAt = (phi, r, y) => V(troy.C.x + Math.sin(phi) * r, y, troy.C.z + Math.cos(phi) * r);
    const spot = ringAt(tPhi + 0.02, 76.9, WT);                        // beside the trident block (used by shot 6)
    hero.group.visible = true;
    if (!sk()) sound.crowd(true, { mood: "roar", level: 0.03 });
    // 5a · up the last steps. He follows the stair's own curve; the camera rides behind at shoulder height, so the eye
    // is on his back and the burning city, not on his feet meeting the treads
    const k0 = 0.42;
    const onStair = k => troy.stairAt(k0 + (1 - k0) * k);
    let sk5 = 0;
    const climb = every(world, () => {
      const a = onStair(sk5), b = onStair(Math.min(1, sk5 + 0.05));
      hero.group.position.copy(a); hero.group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    });
    cleanup.push(() => climb.stop());
    hero.teleport(onStair(0).x, onStair(0).z, 0, onStair(0).y); hero.play("walk", 0.1, { timeScale: 0.85 });
    cam = shotCam(world, D, (t, o) => {
      // above and behind him, out over the city side: his back, the treads ahead, the burning roofs below to the right
      const h = hero.group.position, a = onStair(Math.max(0, sk5 - 0.3)), inward = V(troy.C.x - h.x, 0, troy.C.z - h.z).normalize();
      o.pos.set(a.x, h.y + 2.9, a.z).addScaledVector(inward, 1.9); o.look.copy(onStair(Math.min(1, sk5 + 0.15))).add(V(0, 1.2, 0)); o.fov = 50;
    });
    await tween(3.4, k => sk5 = k);
    climb.stop(); cam.stop();
    // 5b · the introduction. He steps into a gap in the parapet, at the very edge of the wall, and looks out over the plain.
    // Low angle from outside the wall, a slow push in; behind him the whole sky burns orange. Then the freeze and his name
    const phiG = troy.crenelGapNear(tPhi + 0.06);
    const outG = outward(phiG), sideG = along(phiG);
    const edge = ringAt(phiG, 77.9, WT);
    hero.teleport(edge.x, edge.z, Math.atan2(outG.x, outG.z), WT); hero.play("idle", 0.2, { timeScale: 0.6 });
    const rim = new THREE.PointLight(0xff8a3c, 160, 22, 1.3); rim.position.copy(ringAt(phiG, 74.5, WT + 2.6)); scene.add(rim);
    const face = new THREE.PointLight(0xa9bcdc, 14, 12, 1.4); face.position.copy(ringAt(phiG, 82, WT + 2.0)).addScaledVector(sideG, 1.5); scene.add(face);
    cleanup.push(() => scene.remove(rim, face));
    // a heroic low angle, close: the camera hangs just outside the wall below the parapet and rises toward him,
    // so at the freeze he stands full-length against the sky and fills two thirds of the frame
    const camFrom = ringAt(phiG, 90, WT - 3.2).addScaledVector(sideG, 3.0), camTo = ringAt(phiG, 83.2, WT - 0.9).addScaledVector(sideG, 0.9);
    cam = shotCam(world, D, (t, o) => {
      const k = ease(Math.min(1, t / 5.2));
      o.pos.lerpVectors(camFrom, camTo, k); o.look.copy(edge).add(V(0, lerp(1.6, 1.05, k), 0)); o.fov = lerp(42, 34, k);
    });
    if (!sk()) sound.boom({ freq: 60, to: 34, seconds: 3.2, level: 0.32 });
    await wait(5.2);
    // the freeze: his name; everything drops to wind and fire
    sound.crowd(false);
    await D.freeze("ODYSSEUS", "King of Ithaca. Sacker of Troy.", 3.0);
    cam.stop(); scene.remove(rim, face);
    hero.teleport(spot.x, spot.z, Math.atan2(outward(tPhi + 0.02).x, outward(tPhi + 0.02).z), WT); hero.play("idle", 0.01);

    // ================= 6 · 0:44–0:52 · the trident in the stone
    const tOut = outward(tPhi), tAl = along(tPhi);
    const blockTop = troy.trident.position.clone().add(V(0, 0.76, 0)).addScaledVector(tOut, -0.25);
    const handAt = () => blockTop.clone().addScaledVector(tAl, 0.75).add(V(0, 0.05 + pat * 0.2, 0));
    let handK = 0, pat = 0;
    const handOn = every(world, () => { if (handK > 0) reachArm(hero.bones, "r", handAt(), handK); });
    cleanup.push(() => handOn.stop());
    const carve = troy.trident.position.clone().addScaledVector(tOut, -0.5);
    cam = shotCam(world, D, (t, o) => {      // on his hand, then a rack along the stone to the carving
      const k = ease(Math.min(1, Math.max(0, (t - 2.4) / 2.4)));
      const handCam = blockTop.clone().addScaledVector(tOut, -1.25).addScaledVector(tAl, -0.2).add(V(0, 0.42, 0));
      const carveCam = carve.clone().addScaledVector(tOut, -1.7).add(V(0, 0.05, 0));
      o.pos.lerpVectors(handCam, carveCam, k);
      o.look.lerpVectors(handAt(), troy.trident.position.clone().addScaledVector(tOut, -0.5), k); o.fov = 34;
    });
    await tween(0.8, k => handK = ease(k));
    await wait(0.6);
    for (let i = 0; i < 2; i++) {                                       // he pats the stone twice, the way you pat a beaten opponent
      await tween(0.26, k => pat = Math.sin(k * Math.PI));
      if (i === 0 && !sk()) sound.seaHeard({ level: 0.25, seconds: 4.5 });   // the first time the sea hears him
      await wait(0.12);
    }
    await wait(1.6);
    await comic.caption("Poseidon built these walls.", { x: 8, y: 70, seconds: 3.4 });
    cam.stop(); handOn.stop(); handK = 0;

    // ================= 7 · 0:52–1:02 · the beach at dawn
    troy.setMood("dawn", { burn: 0.4 }); sound.fire(false);
    sound.sea(true, { level: 0.05 });
    const walkZ = troy.SHORE_Z - 28;
    const startX = -112, endX = startX + 1.35 * 10;
    hero.teleport(startX, walkZ, Math.PI / 2, troy.groundAt(startX, walkZ)); hero.play("walk", 0.1);
    // the men at the ships, loading plunder
    const loaders = [["Polites", -104], ["Lycus", -97], ["Perimedes", -91], ["Antiphus", -86.5], ["Eurylochus", -110], ["Elpenor", -100]];
    loaders.forEach(([n, x], i) => { const m = men[n]; show(m); const z = troy.SHORE_Z - 23.5 - (i % 2) * 1.8; m.place(x, troy.groundAt(x, z), z, 0); m.face(x - 3, walkZ); m.play(i % 2 ? "pickup" : "idle", 0.1); });
    const loading = every(world, (dt, t) => loaders.forEach(([n], i) => { const m = men[n]; if (i % 2 === 0 && Math.floor(t / 2.4 + i) % 2 === 0 && m.base !== m.actions.pickup) m.play("pickup", 0.3); else if (i % 2 === 0 && Math.floor(t / 2.4 + i) % 2 === 1 && m.base !== m.actions.putdown) m.play("putdown", 0.3); }));
    cleanup.push(() => loading.stop());
    let raiseHand = 0;
    const heroWalk = every(world, dt => {
      const p = hero.group.position; p.x += dt * 1.35; p.y = troy.groundAt(p.x, p.z);
      if (raiseHand > 0) { hero.group.updateMatrixWorld(); reachArm(hero.bones, "r", V(-0.25, 2.25, 0.25).applyMatrix4(hero.group.matrixWorld), raiseHand); }
    });
    cleanup.push(() => heroWalk.stop());
    cam = shotCam(world, D, (t, o) => {   // tracking ahead of him, looking back past him to the city and its smoke
      const h = hero.group.position;
      o.pos.set(h.x + 7.5 - t * 0.1, h.y + 1.9, troy.SHORE_Z - 16.5); o.look.set(h.x - 4, h.y + 4.5, h.z - 40); o.fov = 46;
    });
    sound.crowd(true, { mood: "roar", level: 0.02 });
    await wait(3.5);
    sound.crowd(true, { mood: "roar", level: 0.06 });                   // the cheer rises as he passes
    await tween(0.6, k => raiseHand = ease(k));
    await wait(1.8);
    await tween(0.6, k => raiseHand = 1 - ease(k));
    await wait(3.0);
    sound.crowd(true, { mood: "roar", level: 0.025 });
    cam.stop(); heroWalk.stop(); loading.stop(); hide(...crewList); void endX;

    // ================= 8 · 1:02–1:14 · the libation, on the prow as the ship is pushed off
    const beach = { p: his.position.clone(), r: his.rotation.clone() };
    const deckY = 2.6;                                                   // the deck above the ship's origin (its hull is 2.4 deep)
    const P = men.Polites; show(P);
    const posO = V(9.2, deckY, -0.9), posP = V(10.2, deckY, 0.9);        // in the ship's frame: x toward the bow, z across
    const ride = every(world, () => {
      const o = onShip(his, posO), p = onShip(his, posP);
      hero.group.position.copy(o); P.group.position.copy(p);
    });
    cleanup.push(() => ride.stop());
    hero.play("idle", 0.1); P.play("idle", 0.1);
    const seaDir = V(1, 0, 0).applyEuler(his.rotation);                  // the ship's bow direction
    const faceEach = () => { const o = onShip(his, posO), p = onShip(his, posP); hero.group.rotation.y = Math.atan2(p.x - o.x, p.z - o.z) + 0.5; P.group.rotation.y = Math.atan2(o.x - p.x, o.z - p.z) - 0.5; };
    faceEach();
    // the cup
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a35, metalness: 0.8, roughness: 0.35 }));
    troy.root.add(cup); cleanup.push(() => troy.root.remove(cup));
    let cupIn = "P", pArm = 0, oArm = 0, drink = 0;
    const overRail = () => onShip(his, V(10.6, deckY + 1.25, 1.55));
    const mouth = () => { hero.group.updateMatrixWorld(); return V(0.0, 1.55, 0.16).applyMatrix4(hero.group.matrixWorld); };
    const cupRig = every(world, () => {
      if (pArm > 0) reachArm(P.bones, "r", overRail(), pArm);
      if (oArm > 0) reachArm(hero.bones, "r", drink > 0 ? overRail().lerp(mouth(), drink) : overRail(), oArm);
      const hand = (cupIn === "P" ? P.bones.rHand : hero.bones.rHand).getWorldPosition(V());
      cup.position.copy(hand).add(V(0, 0.08, 0));
    });
    cleanup.push(() => cupRig.stop());
    cam = shotCam(world, D, (t, o) => {   // a two-shot on the prow, the sea behind them
      const mid = onShip(his, V(9.7, deckY + 1.5, 0));
      o.pos.copy(onShip(his, V(4.6, deckY + 2.0, -3.2))); o.look.copy(mid).addScaledVector(seaDir, 1.0); o.fov = 38;
    });
    if (!sk()) sound.creak({ level: 0.18, seconds: 3.5, from: 160, to: 90 });   // the hull scraping off the sand
    const push = tween(12, k => { his.position.copy(beach.p).addScaledVector(seaDir, k * 9); his.position.y = lerp(beach.p.y, 0.4, k); his.rotation.z = lerp(beach.r.z, 0, k); troy.syncFleet(); });
    await tween(0.8, k => pArm = ease(k));
    await comic.subtitle("For the sea, Captain? For the way home.", { speaker: "POLITES", seconds: 2.6 });
    await tween(0.6, k => oArm = ease(k));
    cupIn = "O"; await tween(0.4, k => pArm = 1 - ease(k));
    await wait(0.6);                                                    // he looks at the water
    await tween(0.8, k => drink = ease(k));
    await wait(0.5);
    comic.subtitle("The sea didn't win this war.", { speaker: "ODYSSEUS", seconds: 2.6 });
    await wait(1.2);
    if (!sk()) sound.crowd(true, { mood: "roar", level: 0.07 });        // the men nearby laugh
    await wait(1.4);
    sound.crowd(true, { mood: "roar", level: 0.02 });
    await P.turnTo(...(() => { const w = onShip(his, V(16, 0, 4)); return [w.x, w.z]; })(), 0.8);   // Polites doesn't laugh. He looks at the water
    await wait(0.4);
    await push; cam.stop();

    // ================= 9 · 1:14–1:24 · under the keel
    // (a) drops of wine flicked from his fingers
    drink = 0; oArm = 0.8;
    const drops = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(30 * 3), 3)), new THREE.PointsMaterial({ color: 0x5a0f12, size: 0.06 }));
    drops.frustumCulled = false; troy.root.add(drops); cleanup.push(() => troy.root.remove(drops));
    const d0 = overRail(), dv = Array.from({ length: 30 }, () => V((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8).addScaledVector(V(0, 0, 1).applyEuler(his.rotation), 0.6));
    let dropT = 0;
    const dropU = every(world, dt => { dropT += dt; const a = drops.geometry.attributes.position; for (let i = 0; i < 30; i++) { const tt = Math.max(0, dropT - i * 0.01); a.setXYZ(i, d0.x + dv[i].x * tt, Math.max(-0.2, d0.y + dv[i].y * tt - 4.9 * tt * tt), d0.z + dv[i].z * tt); } a.needsUpdate = true; });
    cleanup.push(() => dropU.stop());
    const side9 = V(0, 0, 1).applyEuler(his.rotation);
    cam = shotCam(world, D, (t, o) => { o.pos.set(d0.x, 1.3, d0.z).addScaledVector(side9, 2.4).addScaledVector(seaDir, 1.2); o.look.set(d0.x, 0.1, d0.z).addScaledVector(side9, 0.6); o.fov = 48; });
    await wait(1.4); if (!sk()) sound.splash({ level: 0.15 }); await wait(1.4);
    cam.stop(); dropU.stop(); troy.root.remove(drops); oArm = 0; troy.root.remove(cup);
    // (b) under the water: the dark hull from beneath; something long and dark passes under the keel
    const fog0 = { c: scene.fog.color.clone(), d: scene.fog.density };
    troy.sea.water.visible = false; troy.sky.visible = false;
    scene.fog.color.set(0x07181c); scene.fog.density = 0.045;
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x2a5560, side: THREE.DoubleSide, transparent: true, opacity: 0.85, fog: true }));
    surface.rotation.x = Math.PI / 2; surface.position.set(his.position.x, -0.25, his.position.z); troy.root.add(surface); cleanup.push(() => troy.root.remove(surface));
    const shape = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshBasicMaterial({ color: 0x020507, fog: true }));
    shape.scale.set(22, 1.6, 2.8); troy.root.add(shape); cleanup.push(() => troy.root.remove(shape));
    const keel = his.position.clone();
    cam = shotCam(world, D, (t, o) => { o.pos.set(keel.x + 7, -6.5, keel.z - 9); o.look.set(keel.x, -0.6, keel.z + 1); o.fov = 56; });
    if (!sk()) sound.seaHeard({ level: 0.45, seconds: 5 });
    await tween(3.5, k => { shape.position.set(keel.x - 50 + 100 * k, -3.4 + Math.sin(k * 3) * 0.4, keel.z - 3.5); shape.rotation.y = 0.15; });
    cam.stop(); troy.root.remove(shape); troy.root.remove(surface);
    troy.sea.water.visible = true; troy.sky.visible = true; scene.fog.color.copy(fog0.c); scene.fog.density = fog0.d;
    // (c) the sail: slack for two seconds, then filling again the same way. Only Polites looks up
    his.position.addScaledVector(seaDir, 30); his.position.y = 0.4; his.rotation.z = 0; troy.syncFleet();
    const sail = buildSail(world); troy.root.add(sail.mesh); cleanup.push(() => troy.root.remove(sail.mesh));
    const sailU = every(world, dt => { sail.update(dt); sail.mesh.position.copy(onShip(his, V(1.5, 2.4 + 10.2 - 3.75, 0))); sail.mesh.rotation.copy(his.rotation); });
    cleanup.push(() => sailU.stop());
    // men on the deck: Polites amidships looking aft, Odysseus by the stern
    const posP2 = V(-2, deckY, 1.2), posO2 = V(-9, deckY, -0.6);
    ride.stop();
    const ride2 = every(world, () => { P.group.position.copy(onShip(his, posP2)); hero.group.position.copy(onShip(his, posO2)); });
    cleanup.push(() => ride2.stop());
    P.group.rotation.y = his.rotation.y + Math.PI; hero.group.rotation.y = his.rotation.y + Math.PI / 2;
    const head = P.body.getObjectByName("mixamorigHead"); let look = 0;
    const lookU = every(world, () => { if (look > 0 && head) head.rotation.x -= look * 0.55; });
    cleanup.push(() => lookU.stop());
    cam = shotCam(world, D, (t, o) => { o.pos.copy(onShip(his, V(-13, deckY + 2.6, 3.4))); o.look.copy(onShip(his, V(1.5, deckY + 6.5, 0))); o.fov = 46; });
    await wait(0.8);
    tween(0.6, k => { sail.fill = 1 - 1.05 * ease(k); sail.flutter = ease(k); });
    tween(0.8, k => look = ease(k));
    await wait(2.0);
    if (!sk()) { sound.boom({ freq: 140, to: 70, seconds: 0.25, level: 0.5 }); sound.whoosh({ seconds: 0.5, level: 0.3 }); sound.seaHeard({ level: 0.5, seconds: 3 }); }
    await tween(0.25, k => { sail.fill = -0.05 + 1.05 * ease(k); sail.flutter = 1 - k; });
    await wait(0.9);
    cam.stop();

    // ================= 10 · 1:24–1:36 · twelve ships
    const formation = ships.map((s, i) => { const row = i % 4, line = Math.floor(i / 4); return V(-60 + row * 40 + line * 14, 0.3, troy.SHORE_Z + 120 + line * 60 + row * 9); });
    ships.forEach((s, i) => { s.position.copy(formation[i]); s.rotation.set(0, -Math.PI / 2, 0); });
    troy.syncFleet(); hide(P); hero.group.visible = false; ride2.stop();
    let fleetT = 0;
    const sailOn = every(world, dt => { fleetT += dt; ships.forEach((s, i) => { s.position.z = formation[i].z + fleetT * 3.5; }); troy.syncFleet(); });
    cleanup.push(() => sailOn.stop());
    const fogD = scene.fog.density;
    cam = shotCam(world, D, (t, o) => {
      const k = ease(Math.min(1, t / 11)), c = his.position;
      o.pos.set(c.x + lerp(-6, 60, k), lerp(4, 230, k), c.z + lerp(-8, 170, k)); o.look.set(c.x - 10, 0, c.z + lerp(30, -60, k)); o.fov = lerp(44, 50, k);
      scene.fog.density = lerp(fogD, fogD * 1.6, k);
    });
    sound.sea(true, { level: 0.07 });
    await wait(1.4);
    await overCards(["Twelve ships.", "Ten days' sail to Ithaca.", "That was the plan."], { cps: 26, holdEach: 1.6, holdEnd: 1.0 });
    await wait(Math.max(0, 0.4));
    cam.stop(); sailOn.stop(); sailU.stop();

    // ================= 11 · 1:36–1:44 · the title over a dark sea
    troy.setMood("night", { burn: 0 }); troy.sky.material.uniforms.glow.value = 0; troy.fleet.visible = false; sail.mesh.visible = false;
    troy.moon.intensity = 0.05; troy.hemi.intensity = 0.04; scene.fog.density = 0.0024;   // a black sea, lit only by the flashes
    troy.sky.visible = false; scene.fog.color.set(0x0a0e12); scene.fog.density = 0.0016;
    const storm = new Storm(world, { camera: world.camera }); cleanup.push(() => storm.dispose());
    sound.sea(true, { level: 0.08 });
    cam = shotCam(world, D, (t, o) => { o.pos.set(-6 + t * 0.35, 7.5, troy.SHORE_Z + 70); o.look.set(0, 40, troy.SHORE_Z + 1400); o.fov = 46; });   // low over the swell, the horizon black
    storm.cloudFlash(V(-0.5, 0.3, 1), 0.5);
    storm.strike({ dist: 2600, side: -700, strokes: 3, at: 1.3 });       // far off: a flicker, and later a long low rumble
    await wait(2.9);
    storm.strike({ dist: 750, side: 260, strokes: 4 });                 // close: the title comes with it, the crack two seconds later
    if (titleEl) titleEl.classList.add("on");
    await wait(2.6);
    storm.cloudFlash(V(0.6, 0.25, 1));
    await wait(1.8);
    storm.strike({ dist: 1800, side: -150, strokes: 2 });
    await wait(1.6);
    if (titleEl) titleEl.classList.remove("on");
    sound.sea(false);
    await comic.black(true, 1.0);
    sound.ambience("harbour");                                       // rain begins over the black, and carries on into the Harbour
    await wait(0.8);
    cam.stop();
  } finally {
    for (const f of cleanup.reverse()) { try { f(); } catch (e) { /* already gone */ } }
    sound.crowd(false); sound.fire(false);
    troy.sky.visible = true;
    crew.dispose();
    document.body.classList.remove("cinematic");
  }
}
