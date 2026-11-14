// caveLights.js — the five lit zones of the cave, and the small things that make it lived-in.
// Lighting idea (from the research): every light comes from something you can see in the cave, and each
// one paints its own corner a different colour (The Descent); cold beams cut through warm firelight with
// dust hanging in them (Prometheus, Indiana Jones); the colours are pushed hard, warm against cold, with
// deep blacks (Tarantino: Kill Bill's blue-and-red, The Hateful Eight's lamps against the cold).
//
//   1 HEARTH      amber   the fire (caveScene.js)
//   2 MOON SHAFTS blue    two cracks in the roof, beams through dust
//   3 GLOW-WORMS  teal    thousands of tiny lights on the roof over a still pool that mirrors them
//   4 THE GIANT   red     a pit of coals at his feet, lighting him from below
//   5 OIL LAMPS   gold    clay lamps in niches in the walls, each lighting its own patch of rock
//
// Details: tally marks where the giant counts his flock, ochre paintings, bones, wool tufts, puddles,
// hides drying, water dripping into the pool, roots hanging from the cracks.
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HALL, roofAt, GIANT_AT, FIRE_AT } from "./caveScene.js";
import { Fire } from "../../engine/weather.js";

export const POOL_AT = new THREE.Vector3(-8, 0, -12);
export const COALS_AT = new THREE.Vector3(22.6, 0, -7.4);

const rand = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(7);
const between = (a, b) => a + rand() * (b - a);

// a soft round dot, for sprites and points
let DOT = null;
function dot() {
  if (DOT) return DOT;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return DOT = new THREE.CanvasTexture(c);
}
const glowSprite = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); return s;
};

export function lightCave(world, hall, rockMesh = null) {
  const { scene } = world;
  const live = [];                                   // things that move each frame
  const ray = new THREE.Raycaster();
  // where a ray from inside the hall meets the rock wall (and the wall's normal there)
  const wallHit = (from, dir) => {
    ray.set(from, dir.clone().normalize()); ray.far = 80;
    const h = ray.intersectObjects(rockMesh ? [hall, rockMesh] : [hall], false)[0];
    if (!h) return null;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (h.object === hall) n.negate();                                                // the dome is seen from inside
    return { p: h.point, n };
  };
  hall.updateMatrixWorld(true); if (rockMesh) rockMesh.updateMatrixWorld(true);

  // ---------- the base: FIRELIGHT & SMOKE. Almost no light that doesn't come from a flame. The air is
  // smoky (warm fog), the shadows are near-black, and every fire lights its own patch of rock.
  scene.background = new THREE.Color(0x040201);
  scene.fog = new THREE.FogExp2(0x120a06, 0.022);
  const hemi = new THREE.HemisphereLight(0x3a4458, 0x0a0503, 0.7); scene.add(hemi);   // shadows lean a little cold, so the fire reads warm against them
  // a soft warm fill from the camera side (the film trick: diffused light near the lens), so the fleeces
  // and the numbers on them always read
  const fill = new THREE.DirectionalLight(0xffd8b0, 0.55); fill.position.set(8, 7, 24); fill.target.position.set(8, 0.5, 0); scene.add(fill, fill.target);

  // ---------- 1 HEARTH: the fire's own light is in caveScene; here, a wider warm spill
  const hearth = new THREE.PointLight(0xff8a3a, 30, 26, 1.3); hearth.position.set(FIRE_AT.x, 2.6, FIRE_AT.z); scene.add(hearth);
  const hearthGlow = glowSprite(0xff7a2a, 5, 0.35); hearthGlow.position.set(FIRE_AT.x, 1.2, FIRE_AT.z); scene.add(hearthGlow);
  const flames = [];   // every flame in the cave, for the smoke to pick up its colour
  const fires = [];    // every Fire, so a scene can put them all out and light them again
  let fireK = 1;

  // ---------- 2 BRAZIERS at both ends of the pens: iron bowls of fire on tripods, the key light on the flock
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6, metalness: 0.6 });
  const braziers = [];
  for (const [x, z] of [[-1.9, 3.4], [18.1, 3.4]]) {
    const b = new THREE.Group(); b.position.set(x, 0, z); scene.add(b);
    for (let k = 0; k < 3; k++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 6), iron);
      const a = k / 3 * Math.PI * 2; leg.position.set(Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); b.add(leg);
    }
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), iron); bowl.position.y = 1.45; b.add(bowl);
    const coal = new THREE.Mesh(new THREE.CircleGeometry(0.46, 16), new THREE.MeshBasicMaterial({ color: 0xff5a10, toneMapped: false })); coal.rotation.x = -Math.PI / 2; coal.position.y = 1.44; b.add(coal);
    const fire = world.add(new Fire(world, new THREE.Vector3(x, 1.45, z), { size: 0.7, light: false }));
    const light = new THREE.PointLight(0xff9a48, 34, 22, 1.4); light.position.set(x, 2.4, z); scene.add(light);
    braziers.push({ light, fire, ph: rand() * 10 }); flames.push(new THREE.Vector3(x, 2, z)); fires.push(fire);
  }
  live.push((dt, t) => { for (const b of braziers) b.light.intensity = fireK * 34 * (1 + Math.sin(t * 9 + b.ph) * 0.07 + Math.sin(t * 21 + b.ph * 3) * 0.05); });

  // ---------- 3 TORCHES on the walls: a bracket, a pitch-soaked head, a real flame and a flickering light
  const torches = [];
  const TORCH_DIRS = [[-1, -0.3, 2.6], [-0.55, -1, 2.8], [0.25, -1, 2.6], [0.85, -0.7, 2.8], [1, 0.15, 2.6], [-0.95, 0.55, 2.5]];
  const stick = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 });
  TORCH_DIRS.forEach(([dx, dz, h], k) => {
    const hit = wallHit(new THREE.Vector3(HALL.x, h, HALL.z), new THREE.Vector3(dx, 0, dz)); if (!hit) return;
    const at = hit.p.clone().addScaledVector(hit.n, 0.6);
    const tg = new THREE.Group(); tg.position.copy(at); scene.add(tg);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 1.0, 6), stick); pole.rotation.x = 0.35; pole.position.y = -0.2; tg.add(pole);
    tg.lookAt(at.clone().add(new THREE.Vector3(hit.n.x, 0, hit.n.z)));
    const fire = world.add(new Fire(world, at.clone().add(new THREE.Vector3(0, 0.35, 0)), { size: 0.38, light: false, embers: false }));
    let light = null;
    if (k < 4) { light = new THREE.PointLight(0xff9440, 16, 14, 1.6); light.position.copy(at).add(new THREE.Vector3(0, 0.6, 0)).addScaledVector(hit.n, 0.3); scene.add(light); }
    const glow = glowSprite(0xff8a30, 3.2, 0.3); glow.position.copy(at).add(new THREE.Vector3(0, 0.45, 0)); scene.add(glow);
    torches.push({ light, glow, ph: rand() * 10 }); flames.push(at.clone()); fires.push(fire);
  });
  live.push((dt, t) => { for (const tc of torches) { const f = 1 + Math.sin(t * 13 + tc.ph) * 0.09 + Math.sin(t * 29 + tc.ph * 2) * 0.06; if (tc.light) tc.light.intensity = fireK * 16 * f; tc.glow.material.opacity = fireK * 0.3 * f; } });

  // ---------- 4 SMOKE: slow banks of it under the roof and drifting off the hearth, lit warm where fire is near
  const smokeTex = smokeTexture();
  const smoke = [];
  flames.push(FIRE_AT.clone().setY(2), COALS_AT.clone().setY(1));
  for (let k = 0; k < 46; k++) {
    const roofBank = k < 30;
    const x = roofBank ? between(-18, 34) : FIRE_AT.x + between(-3, 3);
    const z = roofBank ? between(-20, 8) : FIRE_AT.z + between(-3, 2);
    const y = roofBank ? Math.max(8, Math.min(roofAt(x, z) - 2.5, between(9, 13))) : between(2.5, 7);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, fog: true }));
    const size = roofBank ? between(9, 16) : between(3, 6); sp.scale.set(size, size * 0.6, 1);
    sp.position.set(x, y, z);
    // its colour: warm where a flame is near, dark brown-grey elsewhere
    let heat = 0; for (const f of flames) heat += 1 / (1 + f.distanceToSquared(sp.position) * 0.02);
    heat = Math.min(heat, 1.2);
    sp.material.color.setRGB(0.16 + heat * 0.32, 0.12 + heat * 0.17, 0.1 + heat * 0.07);
    sp.material.rotation = rand() * 6.28;
    scene.add(sp);
    smoke.push({ sp, base: sp.position.clone(), op: roofBank ? between(0.07, 0.13) : between(0.06, 0.11), ph: rand() * 10, rise: !roofBank, life: rand() });
  }
  live.push((dt, t) => {
    for (const s of smoke) {
      if (s.rise) {                                     // hearth smoke: rises, spreads, fades, starts again
        s.life = (s.life + dt * 0.07) % 1;
        s.sp.position.set(s.base.x + Math.sin(s.ph + t * 0.2) * 0.6, s.base.y + s.life * 7, s.base.z);
        s.sp.material.opacity = s.op * Math.sin(s.life * Math.PI);
        s.sp.scale.setScalar(3 + s.life * 6);
      } else {
        s.sp.position.x = s.base.x + Math.sin(t * 0.05 + s.ph) * 2;
        s.sp.material.opacity = s.op * (0.8 + Math.sin(t * 0.13 + s.ph) * 0.2);
      }
      s.sp.material.rotation += dt * 0.01;
    }
  });
  // drifting embers above the hearth catch the light (the fire's own embers do the close-up)
  const shafts = [];

  // the pool: a still black mirror (a true reflection on better machines; glossy black otherwise)
  const poolShape = new THREE.Shape();
  for (let k = 0; k <= 40; k++) {
    const a = k / 40 * Math.PI * 2, r = 4.6 + Math.sin(a * 3) * 0.6 + Math.sin(a * 5 + 1) * 0.35;
    const x = Math.cos(a) * r * 1.3, y = Math.sin(a) * r;
    k === 0 ? poolShape.moveTo(x, y) : poolShape.lineTo(x, y);
  }
  const poolGeo = new THREE.ShapeGeometry(poolShape, 8);
  let pool;
  if (world.quality !== "low") {
    pool = new Reflector(poolGeo, { textureWidth: 512, textureHeight: 512, color: 0x7a6a5a, clipBias: 0.003 });
  } else {
    pool = new THREE.Mesh(poolGeo, new THREE.MeshStandardMaterial({ color: 0x020507, roughness: 0.04, metalness: 0.6 }));
  }
  pool.rotation.x = -Math.PI / 2; pool.position.set(POOL_AT.x, 0.06, POOL_AT.z); scene.add(pool);
  // a rim of wet stones round it
  const wet = new THREE.MeshStandardMaterial({ color: 0x1e2224, roughness: 0.25 });
  const rim = [];
  for (let k = 0; k < 46; k++) {
    const a = k / 46 * Math.PI * 2, r = 4.6 + Math.sin(a * 3) * 0.6 + Math.sin(a * 5 + 1) * 0.35 + 0.15;
    const g = new THREE.DodecahedronGeometry(between(0.2, 0.5), 0); g.scale(1, 0.45, 1);
    g.translate(POOL_AT.x + Math.cos(a) * r * 1.3, 0.08, POOL_AT.z - Math.sin(a) * r); rim.push(g);
  }
  const rimMesh = new THREE.Mesh(mergeGeometries(rim), wet); rimMesh.receiveShadow = true; scene.add(rimMesh);
  // drips: drops fall from the roof into the pool and leave a ring
  const drops = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc890, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (let k = 0; k < 4; k++) {
    const x = POOL_AT.x + between(-3, 3), z = POOL_AT.z + between(-2.5, 2.5), top = roofAt(x, z) - 1.6;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe0b0, toneMapped: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), ringMat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.09, z);
    scene.add(drop, ring);
    drops.push({ drop, ring, x, z, top, period: between(2.4, 4.5), off: rand() * 4 });
  }
  live.push((dt, t) => {
    for (const d of drops) {
      const fallT = Math.sqrt(2 * d.top / 9.8), u = (t + d.off) % d.period;
      if (u < fallT) { d.drop.visible = true; d.drop.position.set(d.x, d.top - 4.9 * u * u, d.z); } else d.drop.visible = false;
      const r = u - fallT;
      if (r > 0 && r < 1.6) { d.ring.visible = true; d.ring.scale.setScalar(0.05 + r * 0.7); d.ring.material.opacity = 0.5 * (1 - r / 1.6); } else d.ring.visible = false;
    }
  });

  // ---------- 4 THE GIANT'S CORNER: a pit of coals at his feet, lighting him from below, blood-red
  // a spot from the coals up into his face (horror-poster light), and a short glow on the ground round the pit;
  // both stop short of the pens, so the fleeces stay white
  const coalLight = new THREE.SpotLight(0xff2a0c, 300, 28, 0.62, 0.5, 1.3);
  coalLight.position.copy(COALS_AT).add(new THREE.Vector3(-0.6, 0.4, 1.2)); coalLight.target.position.set(GIANT_AT.x - 0.5, 9, GIANT_AT.z + 1);
  // a thin cold light from high behind him, so his head and shoulders get an edge against the dark (backlight)
  const rimLight = new THREE.SpotLight(0xffa060, 140, 30, 0.35, 0.6, 1.3);
  rimLight.position.set(GIANT_AT.x + 4, 17, GIANT_AT.z - 7); rimLight.target.position.set(GIANT_AT.x - 1, 8.5, GIANT_AT.z + 2);
  scene.add(rimLight, rimLight.target);
  scene.add(coalLight, coalLight.target);
  const pitLight = new THREE.PointLight(0xff3010, 30, 7, 2); pitLight.position.copy(COALS_AT).add(new THREE.Vector3(0, 0.7, 0)); scene.add(pitLight);
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x220804, emissive: 0xff3a0a, emissiveIntensity: 1.6, roughness: 1 });
  const ashMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 });
  const coals = [], ash = [];
  for (let k = 0; k < 60; k++) {
    const a = rand() * 6.28, r = Math.sqrt(rand()) * 1.9;
    const g = new THREE.DodecahedronGeometry(between(0.12, 0.3), 0); g.translate(COALS_AT.x + Math.cos(a) * r, between(0.05, 0.2), COALS_AT.z + Math.sin(a) * r);
    (rand() < 0.65 ? coals : ash).push(g);
  }
  scene.add(new THREE.Mesh(mergeGeometries(coals), coalMat), new THREE.Mesh(mergeGeometries(ash), ashMat));
  const coalGlow = glowSprite(0xff2a08, 3, 0.35); coalGlow.position.copy(COALS_AT).add(new THREE.Vector3(0, 0.6, 0)); scene.add(coalGlow);
  live.push((dt, t) => {
    const f = 0.85 + Math.sin(t * 2.3) * 0.08 + Math.sin(t * 5.7) * 0.05;
    coalLight.intensity = 300 * f * (coalLight.userData.k ?? 1); pitLight.intensity = 30 * f; coalMat.emissiveIntensity = 1.6 * f;
  });
  // bones round the pit (what is left of supper)
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a4, roughness: 0.7 });
  const bones = [];
  for (let k = 0; k < 14; k++) {
    const len = between(0.35, 0.8), g = new THREE.CylinderGeometry(0.035, 0.035, len, 5);
    const k1 = new THREE.SphereGeometry(0.07, 6, 4); k1.translate(0, len / 2, 0); const k2 = k1.clone(); k2.translate(0, -len, 0);
    const b = mergeGeometries([g.toNonIndexed(), k1.toNonIndexed(), k2.toNonIndexed()]);
    b.rotateZ(Math.PI / 2); b.rotateY(rand() * 6.28);
    const a = rand() * 6.28, r = between(2.3, 4.5);
    b.translate(COALS_AT.x + Math.cos(a) * r, 0.06, COALS_AT.z + Math.sin(a) * r); bones.push(b);
  }
  const boneMesh = new THREE.Mesh(mergeGeometries(bones), boneMat); boneMesh.castShadow = true; scene.add(boneMesh);

  // ---------- 5 OIL LAMPS in niches round the walls: a clay bowl, a small flame, a pool of gold on the rock
  const clay = new THREE.MeshStandardMaterial({ color: 0x6a4028, roughness: 0.9 });
  const lamps = [];
  const LAMP_DIRS = [[-1, -0.35, 3.5], [-0.6, -1, 4.2], [0.15, -1, 3.2], [0.7, -0.9, 4.8], [1, -0.2, 3.8], [-0.95, 0.5, 2.8], [1, 0.45, 3.0]];
  // one lamp at a wall hit: a niche, a ledge, a clay bowl, a flame, a halo, and (optionally) a real light
  const addLamp = (hit, withLight, power = 7) => {
    const at = hit.p.clone().addScaledVector(hit.n, 0.55);
    const lamp = new THREE.Group(); lamp.position.copy(at); scene.add(lamp);
    const niche = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1, side: THREE.DoubleSide }));
    niche.visible = false;
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1 })); ledge.position.y = -0.2; lamp.add(ledge);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay); bowl.position.y = -0.02; lamp.add(bowl);
    const flame = glowSprite(0xffc060, 0.35, 1); flame.scale.set(0.16, 0.34, 1); flame.position.y = 0.16; lamp.add(flame);
    const halo = glowSprite(0xffa040, 2.6, 0.32); halo.position.y = 0.2; lamp.add(halo);
    let light = null;
    if (withLight) { light = new THREE.PointLight(0xffa850, power, 10, 1.8); light.position.set(0, 0.35, 0); light.userData.power = power; lamp.add(light); }
    lamps.push({ flame, halo, light, ph: rand() * 10 });
  };
  LAMP_DIRS.forEach(([dx, dz, h], k) => {
    const hit = wallHit(new THREE.Vector3(HALL.x, h, HALL.z), new THREE.Vector3(dx, 0, dz));
    if (hit) addLamp(hit, false);
  });
  live.push((dt, t) => {
    for (const l of lamps) {
      const f = 1 + Math.sin(t * 11 + l.ph) * 0.08 + Math.sin(t * 23 + l.ph * 2) * 0.05;
      l.flame.scale.set(0.16 * f, 0.34 * f * f, 1); l.flame.visible = fireK > 0.2; l.halo.material.opacity = fireK * 0.32 * f;
      if (l.light) l.light.intensity = fireK * l.light.userData.power * f;
    }
  });

  // ---------- details
  // the giant's tally marks: deep scratches in fives, where he counts his flock every night
  const tally = wallHit(new THREE.Vector3(GIANT_AT.x - 2, 6, GIANT_AT.z + 6), new THREE.Vector3(1, 0, -0.25));
  if (tally) { scene.add(decal(tallyTexture(), tally, 7, 3.5)); addLamp({ p: tally.p.clone().add(new THREE.Vector3(0, -2.6, 0)), n: tally.n }, true, 9); }
  const tally2 = wallHit(new THREE.Vector3(8, 3.6, 0), new THREE.Vector3(0.2, 0, -1));
  // ochre paintings: sheep, a ram, and a one-eyed figure, beside the door
  const paint = wallHit(new THREE.Vector3(-10, 4.5, -3), new THREE.Vector3(-0.6, 0, -1));
  if (paint) { scene.add(decal(paintingTexture(), paint, 11, 5.5)); addLamp({ p: paint.p.clone().add(new THREE.Vector3(0, -3, 0)), n: paint.n }, true, 18); }
  if (tally2) scene.add(decal(tallyTexture(true), tally2, 4.5, 2));

  // wool tufts caught on the floor and hurdles
  const wool = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 1 });
  const tufts = [];
  for (let k = 0; k < 40; k++) { const g = new THREE.IcosahedronGeometry(between(0.04, 0.09), 0); g.translate(between(-1.5, 18), between(0.03, 0.08), between(-0.6, 4)); tufts.push(g); }
  scene.add(new THREE.Mesh(mergeGeometries(tufts), wool));
  // puddles: small black mirrors that catch the lights
  const puddle = new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 0.03, metalness: 0.8 });
  for (const [x, z, s] of [[3.5, 6.5, 1.2], [13, 7.5, 0.9], [-2, -6, 1.5], [26, 4, 1.3], [16, -9, 1.0]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(s, 20), puddle); p.scale.set(1.5, 1, 1); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.05, z); scene.add(p);
  }
  // sheep hides drying on a pole between two stalagmites, back left
  const hideMat = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 1, side: THREE.DoubleSide });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 }));
  pole.rotation.z = Math.PI / 2; pole.position.set(4, 3.4, -14); scene.add(pole);
  for (let k = 0; k < 4; k++) {
    const g = new THREE.PlaneGeometry(1.3, 1.8, 6, 6), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 2.4 + k) * 0.12 + Math.sin(pa.getY(i) * 3) * 0.05);
    g.computeVertexNormals();
    const h = new THREE.Mesh(g, hideMat); h.position.set(1.4 + k * 1.75, 2.5, -14); h.rotation.y = between(-0.2, 0.2); h.castShadow = true; scene.add(h);
  }
  // rocks in the foreground, at the edges of the wide shots, so frames have a front, middle and back
  const fgMat = new THREE.MeshStandardMaterial({ color: 0x16120f, roughness: 1, flatShading: true });
  for (const [x, z, s] of [[-9, 13, 2.6], [24, 13.5, 3], [30, 8, 2.2], [-14, 6, 2]]) {
    const g = new THREE.DodecahedronGeometry(1, 1), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) * (1 + rand() * 0.3), pa.getY(i) * (0.8 + rand() * 0.3), pa.getZ(i) * (1 + rand() * 0.3));
    g.computeVertexNormals();
    const r = new THREE.Mesh(g, fgMat); r.scale.set(s * 1.3, s, s); r.position.set(x, s * 0.4, z); r.castShadow = true; scene.add(r);
  }

  // ---------- the colour: Tarantino pushes saturation and keeps the cold blues alive against the reds
  if (world.grade.uniforms.keepBlue) world.grade.uniforms.keepBlue.value = 0.25;
  world.renderer.toneMappingExposure = 1.2;          // lighter than before: fire reads hot without burning the floor orange

  world.add({ update: (dt, t) => { for (const f of live) f(dt, t); } });
  // every flame in the cave at once: 0 = all out (embers only), 1 = all burning
  const setFires = k => {
    fireK = k; fires.forEach(f => f.level = k);
    hearth.intensity = 30 * k; hearthGlow.material.opacity = 0.35 * k;
  };
  return { fill, hemi, shafts, pool, coalLight, pitLight, lamps, hearth, braziers, torches, smoke, rimLight, setFires };
}

// a soft, lumpy puff of smoke (drawn once)
function smokeTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(3);
  for (let k = 0; k < 26; k++) {
    const x = 34 + r() * 60, y = 34 + r() * 60, rad = 14 + r() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

// a plane laid flat on the wall at a hit point
function decal(tex, hit, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.position.copy(hit.p).addScaledVector(hit.n, 0.25);
  m.lookAt(hit.p.clone().addScaledVector(hit.n, 2));
  return m;
}
function tallyTexture(small) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d"); g.lineCap = "round";
  const groups = small ? 3 : 9;
  for (let k = 0; k < groups; k++) {
    const x0 = 24 + k * (small ? 150 : 54), y0 = small ? 70 : 40 + (k % 3) * 70, hgt = small ? 120 : 52, gap = small ? 22 : 9;
    for (let i = 0; i < 4; i++) {
      for (const [col, w, o] of [["rgba(0,0,0,0.55)", small ? 9 : 5, 2], ["rgba(214,200,170,0.85)", small ? 5 : 3, 0]]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0 + i * gap + o, y0 + o); g.lineTo(x0 + i * gap + 3 + o, y0 + hgt + o); g.stroke();
      }
    }
    for (const [col, w, o] of [["rgba(0,0,0,0.55)", small ? 9 : 5, 2], ["rgba(214,200,170,0.85)", small ? 5 : 3, 0]]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0 - 6 + o, y0 + hgt * 0.75 + o); g.lineTo(x0 + gap * 3 + 8 + o, y0 + hgt * 0.2 + o); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function paintingTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  const ochre = "rgba(196,78,30,0.92)", dark = "rgba(30,16,12,0.85)";
  const sheep = (x, y, s, horns) => {
    g.fillStyle = ochre; g.beginPath(); g.ellipse(x, y, 46 * s, 26 * s, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x + 50 * s, y - 14 * s, 14 * s, 10 * s, -0.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = ochre; g.lineWidth = 6 * s;
    for (const lx of [-28, -10, 14, 30]) { g.beginPath(); g.moveTo(x + lx * s, y + 18 * s); g.lineTo(x + lx * s + 3, y + 48 * s); g.stroke(); }
    if (horns) { g.strokeStyle = dark; g.beginPath(); g.arc(x + 50 * s, y - 24 * s, 12 * s, Math.PI, Math.PI * 2.2); g.stroke(); }
  };
  [[160, 330, 1, false], [320, 360, 0.9, false], [470, 320, 1.15, true], [640, 370, 0.8, false], [780, 340, 1, false]].forEach(a => sheep(...a));
  // the shepherd: a huge stick figure with one eye, over the flock
  g.strokeStyle = dark; g.lineWidth = 12; g.lineCap = "round";
  g.beginPath(); g.moveTo(900, 120); g.lineTo(900, 300); g.moveTo(900, 300); g.lineTo(860, 460); g.moveTo(900, 300); g.lineTo(940, 460);
  g.moveTo(900, 170); g.lineTo(820, 230); g.moveTo(900, 170); g.lineTo(980, 120); g.stroke();
  g.fillStyle = dark; g.beginPath(); g.arc(900, 80, 42, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(220,170,60,0.9)"; g.beginPath(); g.arc(900, 76, 14, 0, Math.PI * 2); g.fill();
  // hand prints
  g.fillStyle = "rgba(150,50,24,0.6)";
  for (const [x, y] of [[60, 110], [120, 80], [250, 140]]) { g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill(); for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(x - 22 + f * 11, y - 34 + Math.abs(f - 2) * 6, 5, 14, 0, 0, Math.PI * 2); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
