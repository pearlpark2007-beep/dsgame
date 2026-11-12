// caveClimax.js — Chapter Two's ending. Short, tense, almost no talk (about 70 seconds):
//  1. DARK      His eye opens in the dark. Wine. "Who are you?" "...Nobody." The eye closes.
//  2. THE POKE  The tip glows. Odysseus on the ledge, level with the eye. HOLD SPACE: every camera is set
//               from the eye (close on it, down the stake, from the eye's own view, in profile), cutting
//               faster as the stake goes in, while the lid twitches and the giant trembles. Impact: white,
//               the eye goes dark, the camera is thrown back, the cave shakes, he smashes the roof.
//  3. THE DOOR  Dawn. Sheep pass his legs in silhouette. The ram, Odysseus under it. His blind head comes
//               down, sniffing. HOLD SPACE. Daylight.
//  4. OUT       Odysseus runs; the giant roars from the cave mouth. Freeze on the card.
// The stake is placed from Odysseus's two hands every frame (grip between them, tip to the eye) and
// pushing it moves HIM forward, so it can never pass through his body.
// Test hooks: ?from=2 | 3 | 4 (or window.__climaxFrom) starts at that scene.
import * as THREE from "three";
import { DOOR_AT, GIANT_AT, FIRE_AT, roofAt } from "./caveScene.js";
import { COALS_AT } from "./caveLights.js";
import { shot, dustFall, sparks, ease } from "./caveOpening.js";
import { crag } from "./caveRock.js";
import { stoneTexture } from "../../engine/textures.js";
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
    // the real height of the ground at a point (the slope plus the same bumps the mesh was built with)
    heightAt(x, z) { const zp = DOOR_AT.z - z; return groundY(x) + Math.sin(x * 0.7 + zp * 0.5) * 0.25 + Math.sin(zp * 0.23) * 0.6; },
    show(on) {
      g.visible = on; sun.intensity = on ? 2.4 : 0; skyFill.intensity = on ? 1.1 : 0;
      if (on && !sea) { sea = world.add(new Sea(world, { color: 0x1a3440, sunDir: V(-1, 0.2, 0.15), sunColor: 0xffb070 })); sea.water.position.y = -13; }
      if (sea) sea.water.visible = on;
    }
  };
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
  const props = [];
  const temp = o => { world.scene.add(o); props.push(() => world.scene.remove(o)); return o; };
  let s = null, outside = null, fogWas;
  const cam = fn => { if (s) s.stop(); s = shot(world, director, fn); return s; };
  const sheep = pens.sheep.slice();
  const sheepHome = sheep.map(o => o && { p: o.position.clone(), r: o.rotation.y, s: o.scale.clone(), parent: o.parent });
  const heroFwd = () => V(Math.sin(hero.group.rotation.y), 0, Math.cos(hero.group.rotation.y));

  // the giant slumped on a seat of rock; Odysseus on a ledge level with the eye
  const gf = V(8 - GIANT_AT.x, 0, 4 - GIANT_AT.z).normalize(), side = V(-gf.z, 0, gf.x);
  const seatMat = new THREE.MeshStandardMaterial({ ...stoneTexture({ seed: 8, base: [110, 98, 84], dark: [48, 42, 36], repeat: 2 }), vertexColors: true, roughness: 1 });
  const seat = temp(new THREE.Mesh(crag(4.4, { sx: 3.2, sy: 2.6, sz: 3.0 }), seatMat));
  seat.position.set(GIANT_AT.x + 0.4, 1.0, GIANT_AT.z - 1.6); seat.castShadow = seat.receiveShadow = true;
  const slump = async () => { giant.place(GIANT_AT.x, 0, GIANT_AT.z, GIANT_AT.x + gf.x * 10, GIANT_AT.z + gf.z * 10); giant.roar(0); giant.look(null); giant.group.rotation.z = 0; await giant.pose("slumpBack", 0); };
  await slump(); giant.update(0.0001); giant.eyePos(eye);
  const away = gf.clone().multiplyScalar(3.9).addScaledVector(side, 1.6).normalize();
  const ledgeTop = Math.max(1.2, eye.y - 1.35);
  const standAt = eye.clone().addScaledVector(away, 6.15).setY(ledgeTop);
  const ledge = temp(new THREE.Mesh(crag(2.2, { sx: 2.3, sy: ledgeTop * 0.55 + 0.3, sz: 2.3, strata: 2 }), seatMat));
  ledge.position.set(standAt.x, ledgeTop * 0.45, standAt.z); ledge.castShadow = ledge.receiveShadow = true;
  const flat = eye.clone().sub(standAt).setY(0).normalize(), sd = V(-flat.z, 0, flat.x);
  const onLedge = () => { hero.teleport(standAt.x, standAt.z, yawTo(standAt, eye), ledgeTop + 0.03); hero.groundY = ledgeTop + 0.03; };
  const tipAt = () => stake.userData.tip.getWorldPosition(V());
  const tipLight = temp(new THREE.PointLight(0xff7a2a, 0, 9, 1.6));
  const tipU = { update: () => tipLight.position.copy(tipAt()) }; world.add(tipU); props.push(() => remove(world, tipU));
  tipMat.emissive = tipMat.emissive || new THREE.Color();
  const heat = k => { tipMat.emissive.setRGB(1.0 * k, 0.35 * k + 0.25 * k * k, 0.05 * k + 0.4 * k * k * k); tipMat.emissiveIntensity = 1.4 * k; tipLight.intensity = 14 * k; };
  // a warm light on the giant's face, so the eye scenes read in the dark
  const faceL = temp(new THREE.PointLight(0xff8a40, 0, 9, 1.4));
  const faceU = { update: () => { giant.eyePos(faceL.position); faceL.position.addScaledVector(flat, -2.4).y -= 0.8; } };
  world.add(faceU); props.push(() => remove(world, faceU));

  // amber, not blood-red, on his face for the eye scenes (the red comes back with the blinding)
  const coalCol = lights.coalLight.color.clone();
  const amber = on => { lights.coalLight.userData.k = on ? 0.3 : 1; lights.coalLight.color.copy(on ? new THREE.Color(0xff7a30) : coalCol); };
  props.push(() => amber(false));
  try {
    await comic.black(true, 0.01);
    lights.setFires(0.4); amber(true);

    // =============================================================================================
    // 1. DARK — the eye opens; wine; one question, one answer; the eye closes
    // =============================================================================================
    if (from <= 1) {
      faceL.intensity = 6;
      giant.open(0);
      onLedge(); hero.stand(0);
      const eyeECU = (t, o) => { giant.eyePos(eye); o.pos.copy(eye).addScaledVector(flat, -4.5 + Math.min(t, 4) * 0.25).add(V(0, -0.6, 0)); o.look.copy(eye); o.fov = 30; };
      cam(eyeECU);
      comic.black(false, 0.5);
      await over(1.6, k => giant.open(ease(k) * 0.85));
      giant.look(hero.bones.head.getWorldPosition(V()));
      // the skin of wine, held up to him; GLUG
      const skin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.8 }));
      skin.scale.set(1, 1.35, 0.9);
      const skinOff = inHand(world, hero.bones.rHand, skin, { offset: [0, 12, 4] }); props.push(skinOff);
      hero.raise = { side: 0.1, up: 0.45, fwd: 0.35, w: 0 };
      cam((t, o) => { hero.bones.head.getWorldPosition(head); o.pos.copy(head).addScaledVector(flat, -1.6).addScaledVector(sd, -0.7).add(V(0, -0.5, 0)); giant.headPos(eye); o.look.copy(head).lerp(eye, 0.55); o.fov = 52; });
      await over(0.5, k => hero.raise.w = ease(k));
      comic.sfx("GLUG", { x: 58, y: 26, r: -7, size: 6, color: "#b0243a", seconds: 0.7 });
      await over(0.6, k => giant.roar(0.25 * Math.sin(k * Math.PI)));
      comic.sfx("GLUG", { x: 70, y: 38, r: 6, size: 6, color: "#b0243a", seconds: 0.7 });
      await over(0.6, k => giant.roar(0.25 * Math.sin(k * Math.PI)));
      await over(0.3, k => hero.raise.w = 1 - ease(k)); hero.raise = null; skinOff();
      // "Who are you?"
      cam(eyeECU);
      await comic.subtitle("Who are you?", { speaker: "POLYPHEMUS", villain: true, seconds: 1.8 });
      cam((t, o) => { hero.bones.head.getWorldPosition(head); o.pos.copy(head).addScaledVector(heroFwd(), 1.3).addScaledVector(sd, 0.3).add(V(0, -0.15, 0)); o.look.copy(head).add(V(0, -0.05, 0)); o.fov = 30; });
      await wait(0.5);
      await comic.subtitle("...Nobody.", { speaker: "ODYSSEUS", seconds: 1.6 });
      // the eye sinks shut
      cam(eyeECU);
      await over(1.6, k => giant.open(0.85 * (1 - ease(k))));
      comic.sfx("zzz", { x: 64, y: 28, r: -8, size: 3, color: "#efe1c2", seconds: 1.0 });
      await wait(0.6);
      await comic.black(true, 0.15);
    }

    // =============================================================================================
    // 2. THE POKE — the highlight. Every camera is set from the eye.
    // =============================================================================================
    if (from <= 2) {
      faceL.intensity = 6;
      giant.open(0); giant.look(null);
      // the tip in the coals: grey, orange, white
      const toFire = V(1, 0, 0.35).normalize();
      stake.position.copy(FIRE_AT).addScaledVector(toFire, -3.0).setY(0.45); stake.rotation.set(0, -Math.atan2(toFire.z, toFire.x), 0.08);
      cam((t, o) => { const p = tipAt(); o.pos.copy(p).add(V(-1.4, 0.8, 2.4)).add(V(0, 0, -t * 0.2)); o.look.copy(p); o.fov = 32; });
      comic.black(false, 0.2);
      comic.sfx("tssss", { x: 60, y: 60, r: 4, size: 3, color: "#efe1c2", seconds: 1.2 });
      await over(1.6, k => heat(k));
      // on the ledge, the stake levelled at the eye
      onLedge();
      hero.play("carryIdle", 0.01, { layer: "hold" });
      const ungrip = gripStake(world, hero, stake, () => giant.eyePos(V()));
      props.push(ungrip);
      const mid = () => standAt.clone().lerp(giant.eyePos(V()), 0.5);
      cam((t, o) => { const m = mid(); o.pos.copy(m).addScaledVector(sd, 7 - t * 0.6).add(V(0, -1.4, 0)); o.look.copy(m).add(V(0, 0.2, 0)); o.fov = 44; });
      comic.sfx("zzz", { x: 74, y: 22, r: -8, size: 2.6, color: "#efe1c2", seconds: 1.2 });
      await wait(1.4);

      // the four eye cameras
      const handsMid = () => { hero.body.updateMatrixWorld(true); return hero.bones.lHand.getWorldPosition(V()).add(hero.bones.rHand.getWorldPosition(V())).multiplyScalar(0.5); };
      const eyeCams = [
        (t, o) => { giant.eyePos(eye); o.pos.copy(eye).addScaledVector(flat, -2.5).addScaledVector(sd, 1.2).add(V(0, -0.2, 0)); o.look.copy(eye).addScaledVector(flat, -0.3); o.fov = 32; },                // close on the eye, the tip coming in
        (t, o) => { giant.eyePos(eye); o.pos.copy(handsMid()).add(V(0, 0.32, 0)).addScaledVector(sd, 0.22); o.look.copy(eye); o.fov = 26; },                                                         // down the stake
        (t, o) => { giant.eyePos(eye); hero.bones.head.getWorldPosition(head); o.pos.copy(eye).addScaledVector(flat, -0.9).add(V(0, 0.1, 0)); o.look.copy(head).lerp(tipAt(), 0.4); o.fov = 54; },  // the eye's own view
        (t, o) => { const m = mid(); o.pos.copy(m).addScaledVector(sd, 4.2).add(V(0, -0.4, 0)); o.look.copy(m); o.fov = 40; }                                                                         // profile
      ];
      cam(eyeCams[0]);
      await wait(0.5);
      const g0 = giant.group.position.clone();
      let done = false;
      while (!done) {
        giant.open(0); hero.group.position.copy(standAt);
        const h = comic.holdPrompt("DRIVE IT IN", "HOLD SPACE");
        let t = 0, k = 0, ci = 0, ct = 0, beat = 0;
        await new Promise(res => {
          const u = { update: dt => {
            t += dt; ct += dt; beat += dt;
            k = Math.max(0, Math.min(1, k + (h.down() ? 0.3 : -0.5) * dt));
            h.progress(k);
            hero.group.position.copy(standAt).addScaledVector(flat, 0.9 * k);
            // the cuts come faster the deeper it goes
            if (h.down() && ct > 0.85 - 0.55 * k) { ct = 0; ci = (ci + 1) % eyeCams.length; cam(eyeCams[ci]); }
            if (s) s.o.shake = Math.max(s.o.shake, 0.04 + 0.3 * k);
            // the eye fights it: the lid twitches, the eye rolls toward the heat, the whole giant trembles
            if (h.down()) { giant.open(0.04 + k * 0.35 * Math.random()); giant.look(tipAt()); }
            else if (k > 0.1) giant.open(0.3 + 0.4 * Math.random());                 // letting off: he stirs
            if (t > 6) giant.open(Math.min(1, (t - 6) / 4) * 0.7);
            giant.group.position.copy(g0).add(V((Math.random() - 0.5) * 0.06 * k, 0, (Math.random() - 0.5) * 0.06 * k));
            giant.roar(0.18 * k);
            if (h.down() && k > 0.25 && Math.random() < dt * (6 + 30 * k)) sparks(world, tipAt(), 4 + Math.floor(10 * k));
            if (beat > 0.75 - 0.4 * k) { beat = 0; comic.sfx("thmp", { x: 12 + Math.random() * 10, y: 70, r: -4, size: 2 + 2 * k, color: "#d4241a", seconds: 0.3 }); }
            if (k >= 1 || t > 10) { remove(world, u); res(); }
          } };
          world.add(u);
        });
        h.stop();
        giant.group.position.copy(g0); giant.roar(0);
        if (k >= 1) done = true;
        else {
          giant.open(1); cam(eyeCams[0]); director.crashZoom(24, 0.18);
          await director.stamp("HE WOKE!", "Hold Space and keep holding. Try again.", { kind: "bad", seconds: 2.0 });
          if (window.__holdFail) window.__holdFail = false, window.__autoHold = true;      // (test runs: fail once, then pass)
          giant.open(0); cam(eyeCams[0]);
        }
      }

      // IMPACT: close on the eye as the tip goes home... black... white
      cam(eyeCams[0]);
      await comic.black(true, 0.01); await wait(0.07); comic.black(false, 0.01);
      comic.flash();
      giant.blind(); faceL.intensity = 0;
      for (let q = 0; q < 5; q++) sparks(world, giant.eyePos(V()), 40);
      comic.sfx("THUNK", { x: 30, y: 30, r: -4, size: 14, color: "#d4241a", seconds: 1.4, drift: false });
      // the camera is thrown back off the eye
      { giant.eyePos(eye); const p0 = eye.clone().addScaledVector(flat, -2.5).addScaledVector(sd, 1.2).add(V(0, -0.2, 0));
        cam((t, o) => { const k = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3); o.pos.copy(p0).addScaledVector(flat, -4.5 * k).add(V(0, 1.2 * k, 0)); o.look.copy(eye); o.fov = 30 + 30 * k; o.shake = 1.6; }); }
      ungrip(); hero.play("idle", 0.2);
      await wait(0.6);

      // the cave takes it: he rears up roaring, fires gust, embers burst, rock falls
      amber(false);
      await giant.pose("clutch", 0); giant.place(GIANT_AT.x, 0, GIANT_AT.z, GIANT_AT.x + gf.x * 10, GIANT_AT.z + gf.z * 10);
      world.scene.remove(seat);
      giant.roar(1);
      const red = temp(new THREE.PointLight(0xff2a10, 0, 80, 1)); red.position.copy(GIANT_AT).add(V(-6, 8, 6));
      cam((t, o) => { giant.headPos(head); o.pos.copy(GIANT_AT).addScaledVector(gf, 10).addScaledVector(side, -3).add(V(0, 0.6, 0)); o.look.copy(head).add(V(0, -2.5, 0)); o.fov = 62; o.shake = Math.max(o.shake, 0.9); });
      comic.sfx("AAAARRGH!!", { x: 12, y: 14, r: -6, size: 10, color: "#e0442a", seconds: 1.8 });
      hero.fall("fall", { groundY: 0, back: 1.5 }); hero.groundY = 0;
      for (let q = 0; q < 5; q++) sparks(world, COALS_AT.clone().add(V(0, 0.5, 0)), 50);
      dustFall(world, V(GIANT_AT.x - 6, roofAt(GIANT_AT.x - 6, GIANT_AT.z + 6) - 1, GIANT_AT.z + 6), 220);
      stalactite(world, V(standAt.x + 1.6, roofAt(standAt.x, standAt.z) - 2, standAt.z - 0.8), 2.4, () => comic.sfx("KRAK", { x: 60, y: 54, r: 8, size: 5, color: "#efe1c2", seconds: 0.7 }));
      stalactite(world, V(GIANT_AT.x - 12, roofAt(GIANT_AT.x - 12, GIANT_AT.z + 10) - 2, GIANT_AT.z + 10), 3.0);
      const tumble = sheep.filter(Boolean).map(o => ({ o, y: o.rotation.y, ph: Math.random() * 6 }));
      await over(1.6, k => {
        lights.setFires(0.4 * (k < 0.3 ? 1 - k * 1.5 : 0.55 + (k - 0.3) * 0.6));
        red.intensity = 400 * Math.max(0, Math.sin(Math.min(1, k * 2.2) * Math.PI));
        giant.group.rotation.z = Math.sin(k * 16) * 0.05;
        for (const q of tumble) { q.o.rotation.y = q.y + Math.sin(k * 20 + q.ph) * 0.5 * (1 - k); q.o.position.y = Math.abs(Math.sin(k * 14 + q.ph)) * 0.4 * (1 - k); }
      });
      for (const q of tumble) { q.o.rotation.y = q.y; q.o.position.y = 0; }
      // a fist into the roof
      await giant.pose("smash", 0.22);
      if (s) s.o.shake = 1.8;
      comic.sfx("KRA-KOOM", { x: 52, y: 16, r: 6, size: 8, color: "#efe1c2", seconds: 1.0 });
      const fist = giant.bones.handR.getWorldPosition(V());
      dustFall(world, V(fist.x, roofAt(fist.x, fist.z) - 0.5, fist.z), 260);
      stalactite(world, V(hero.group.position.x + 0.8, Math.min(14, roofAt(hero.group.position.x, hero.group.position.z) - 1), hero.group.position.z + 0.6), 2.0);
      await wait(1.0);
      giant.group.rotation.z = 0; giant.roar(0);
      await comic.black(true, 0.3);
    }

    // =============================================================================================
    // 3. THE DOOR — dawn; the blind giant in the doorway; the ram; HOLD SPACE; daylight
    // =============================================================================================
    if (from <= 3) {
      giant.blind(); lights.setFires(0.35); faceL.intensity = 0;
      world.scene.remove(seat);
      door.skyColor = new THREE.Color(0xffd6a0); door.spill.color.set(0xffb070); door.power = 0.9; door.set(0.55);
      // he sits on the floor beside the doorway, back to the wall, legs stretched INTO the cave, so the
      // way out runs past his right hand and never through his legs
      const atDoor = V(DOOR_AT.x + 3.2, 0, DOOR_AT.z - 4.2);
      giant.place(atDoor.x, 0, atDoor.z, atDoor.x + 10, atDoor.z); giant.roar(0); giant.group.rotation.z = 0;
      await giant.pose("slumpBack", 0); giant.open(0);
      // the way out: from the pens, along the wall, through the gap of daylight
      const lane = [V(DOOR_AT.x + 13, 0, DOOR_AT.z + 1.2), V(DOOR_AT.x + 6.5, 0, DOOR_AT.z + 0.6), V(DOOR_AT.x + 2.0, 0, DOOR_AT.z + 0.2), V(DOOR_AT.x - 3, 0, DOOR_AT.z)];
      // the flock leaves the pens for good: big enough to carry a man, the painted weights hidden
      for (const o of sheep) if (o) {
        const wp = o.getWorldPosition(V()); world.scene.attach(o); o.position.copy(wp); o.scale.multiplyScalar(1.3); o.visible = false;
        o.children.forEach((ch, i) => { if (i >= 6) ch.visible = false; });
      }
      props.push(() => sheep.forEach(o => o && o.children.forEach(ch => (ch.visible = true))));
      const flock = sheep.slice(0, pens.n ?? 8).filter(Boolean);
      const ram = flock[flock.length - 1]; ram.scale.multiplyScalar(1.3);
      // a sheep walking: its legs swing in pairs, its body bobs, it turns along the path
      const walk = (o, seconds, a = 0, b = lane.length - 1) => {
        const pts = lane.slice(a, b + 1); let total = 0; const seg = [];
        for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); seg.push(d); total += d; }
        const legs = o.children.slice(2, 6);
        o.visible = true;
        return over(seconds, k => {
          let d = k * total, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
          const p = pts[i], q = pts[i + 1], f = Math.min(1, d / seg[i]);
          const steps = total * k * 3.2;
          o.position.lerpVectors(p, q, f); o.position.y = Math.abs(Math.sin(steps * Math.PI)) * 0.04;
          o.rotation.y = Math.atan2(q.x - p.x, q.z - p.z) - Math.PI / 2;
          legs.forEach((l, j) => { l.rotation.z = Math.sin(steps * Math.PI + (j === 0 || j === 3 ? 0 : Math.PI)) * 0.45; });
        }).then(() => legs.forEach(l => (l.rotation.z = 0)));
      };
      hero.group.visible = false;
      // silhouettes against the dawn: low, from inside, the doorway a gap of light, the giant a wall of dark on the left
      const wideDoor = (t, o) => { o.pos.set(DOOR_AT.x + 15 - Math.min(t, 6) * 0.3, 1.0, DOOR_AT.z + 4.5); o.look.set(DOOR_AT.x, 2.4, DOOR_AT.z - 1.2); o.fov = 46; };
      cam(wideDoor);
      comic.black(false, 0.5);
      for (let i = 0; i < flock.length - 1; i++) { const o = flock[i]; walk(o, 4.2).then(() => { o.visible = false; }); await wait(0.5); }
      await wait(1.6);
      // his blind face, turned toward the sound of hooves: he sniffs
      const faceShot = (t, o) => { giant.eyePos(eye); o.pos.copy(eye).add(V(5.5, -1.8, 1.2)); o.look.copy(eye).add(V(0, -0.6, 0)); o.fov = 38; };
      // the giant's silhouette in the doorway, closer: his head turns toward the hooves
      const giantWide = (t, o) => { o.pos.set(DOOR_AT.x + 11, 0.9, DOOR_AT.z + 3.6); o.look.set(DOOR_AT.x + 1, 2.6, DOOR_AT.z - 1.8); o.fov = 40; };
      cam(giantWide);
      comic.sfx("sniff", { x: 60, y: 30, r: 4, size: 3, color: "#efe1c2", seconds: 0.8 });
      await wait(1.2);
      // the ram, last. Odysseus hangs under its belly, face up, head toward its head, hands and feet in the wool.
      // (his feet are his origin: the body runs 1.8 m forward from them, so the feet sit 0.9 m behind the ram's middle)
      const clingAt = () => {
        const r = ram.rotation.y, d = V(Math.cos(r), 0, -Math.sin(r)), sc = ram.scale.y;
        hero.group.position.copy(ram.position).addScaledVector(d, -0.9).setY(ram.position.y + 0.32 * sc - 0.2);
        hero.group.rotation.set(-Math.PI / 2, r + Math.PI * 1.5, 0, "YXZ");
      };
      const cling = () => { const u = { update: clingAt }; world.add(u); return () => remove(world, u); };
      // side-on and low, from the far side of the lane: the ram, the man under it, the giant behind
      const belly = (t, o) => { o.pos.copy(ram.position).add(V(-0.8, 0.45, 6.6)); o.look.copy(ram.position).add(V(0, 0.75, -0.6)); o.fov = 34; };
      const headY = giant.extra.head ? giant.extra.head.x : 0, neckZ = giant.extra.neck ? giant.extra.neck.z : 0;
      let escaped = false;
      while (!escaped) {
        ram.position.copy(lane[0]); ram.rotation.y = Math.atan2(lane[1].x - lane[0].x, lane[1].z - lane[0].z) - Math.PI / 2;
        hero.group.visible = true; hero.play("climb", 0.1, { timeScale: 0.12 });
        const unCling = cling(); clingAt();
        cam(belly);
        await walk(ram, 2.2, 0, 1);
        const h = comic.holdPrompt("HANG ON!", "HOLD SPACE");
        const views = [belly, giantWide];
        let t = 0, k = 0, held = true, vi = 0, vt = 0;
        await new Promise(res => {
          const u = { update: dt => {
            t += dt; vt += dt; k = Math.min(1, t / 4.0); h.progress(k);
            if (vt > 0.9 - 0.4 * k) { vt = 0; vi = 1 - vi; cam(views[vi]); }
            // his blind head turns and lowers toward the ram, closer and closer, then lifts away
            if (giant.extra.head) giant.extra.head.x = headY + 0.45 * Math.sin(k * Math.PI);
            if (giant.extra.neck) giant.extra.neck.z = neckZ - 0.35 * Math.sin(k * Math.PI);
            if (s) s.o.shake = Math.max(s.o.shake, 0.04 + 0.16 * k);
            if (Math.random() < dt * 1.6) comic.sfx("sniff", { x: 50 + Math.random() * 30, y: 20 + Math.random() * 20, r: 4, size: 2.4, color: "#efe1c2", seconds: 0.5 });
            if (!h.down() && t > 0.3) held = false;
            if (!held || k >= 1) { remove(world, u); res(); }
          } };
          world.add(u);
        });
        h.stop();
        if (giant.extra.head) giant.extra.head.x = headY;
        if (giant.extra.neck) giant.extra.neck.z = neckZ;
        if (held) { escaped = true; unCling(); break; }
        // he let go: he drops flat on the stone beside the ram
        unCling();
        const fall = ram.position.clone().add(V(0, 0, 0.9));
        hero.teleport(fall.x, fall.z, ram.rotation.y + Math.PI / 2, 0); hero.play("fall", 0.05);
        cam((t, o) => { o.pos.copy(ram.position).add(V(2.2, 1.4, 4.6)); o.look.copy(ram.position).add(V(0, 0.3, 0.6)); o.fov = 44; o.shake = 0.6; });
        comic.sfx("THUD", { x: 40, y: 50, r: 6, size: 6, color: "#e8c21c", seconds: 0.8 });
        await director.stamp("CAUGHT!", "He felt you drop. Hold Space the whole time. Try again.", { kind: "bad", seconds: 2.2 });
        if (window.__holdFailWord) window.__holdFailWord = null;
        await comic.black(true, 0.2); comic.black(false, 0.2);
      }
      // out into the light
      const unC2 = cling();
      // the ram trots into the light; the camera low behind it
      cam((t, o) => { o.pos.set(DOOR_AT.x + 7, 0.7, DOOR_AT.z + 2.6); o.look.set(DOOR_AT.x - 2, 1.4, DOOR_AT.z); o.fov = 46; });
      const exp0 = world.renderer.toneMappingExposure;
      await walk(ram, 2.0, 1, 3);
      unC2();
      await over(0.35, k => world.renderer.toneMappingExposure = exp0 * (1 + 4 * k * k));
      comic.flash();
      world.renderer.toneMappingExposure = exp0;
    }

    // =============================================================================================
    // 4. OUT — he runs; the giant roars from the cave mouth; freeze
    // =============================================================================================
    outside = buildOutside(world);
    outside.show(true);
    door.sky.visible = false;
    fogWas = world.scene.fog;
    world.scene.fog = new THREE.FogExp2(0xc89a78, 0.004);
    for (const o of sheep) if (o) o.visible = false;
    hero.group.visible = true; hero.group.rotation.set(0, 0, 0);
    hero.teleport(DOOR_AT.x - 4.5, DOOR_AT.z + 0.5, -Math.PI / 2, 0); hero.groundY = 0;
    hero.play("walk", 0.1, { timeScale: 2.4 });
    // the giant fills the cave mouth behind him
    giant.place(DOOR_AT.x - 0.8, 0, DOOR_AT.z, DOOR_AT.x - 40, DOOR_AT.z); giant.blind(); giant.group.rotation.z = 0;
    await giant.pose("clutch", 0); giant.roar(0.2);
    // his feet match the ground: the walk clip at 2.4x covers 4.1 m a second, so 3.4 s is 14 m
    const r0 = hero.group.position.clone(), r1 = r0.clone().add(V(-14, 0, 0.4));
    hero.group.position.y = outside.heightAt(r0.x, r0.z);
    const run = over(3.4, k => { hero.group.position.lerpVectors(r0, r1, k); hero.group.position.y = outside.heightAt(hero.group.position.x, hero.group.position.z); hero.group.rotation.y = -Math.PI / 2; });
    // running at us, low, the cave mouth behind him
    cam((t, o) => { const P = hero.group.position; o.pos.set(P.x - 4.2, P.y + 0.7, P.z + 1.4); o.look.set(P.x + 2, P.y + 1.6, P.z); o.fov = 46; });
    comic.black(false, 0.12);
    comic.sfx("SKRRT", { x: 60, y: 62, r: -6, size: 4, color: "#efe1c2", seconds: 0.6 });
    await wait(1.3);
    giant.roar(1);
    if (s) s.o.shake = 0.6;
    comic.sfx("NOBODYYY!!", { x: 46, y: 14, r: -6, size: 9, color: "#e0442a", seconds: 1.8 });
    await wait(1.2);
    await director.freeze(cardAfter.name, cardAfter.sub, 3.6);
    await comic.black(true, 0.4);
  } finally {
    if (s) s.stop();
    props.forEach(f => f());
    hero.raise = null;
    if (outside) { outside.show(false); world.scene.remove(outside.group); }
    if (fogWas !== undefined) world.scene.fog = fogWas;
    lights.setFires(1);
    door.sky.visible = true; door.skyColor = null; door.power = 1; door.set(0);
    stake.position.copy(stakeHome.p); stake.quaternion.copy(stakeHome.q);
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
