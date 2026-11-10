// climax.js — the payoff of the Harbour, shot as the same film as the opening (no text but his name).
// Your code has put the AXE on top of the cargo tower and Odysseus stands on it.
//  1. the face-off: Antiphates among the ruins, Odysseus on his tower; the axe comes out
//  2. the standoff: held shots, getting shorter
//  3. the throw. The boulder comes for him... and he jumps ONTO it, and off it, to the Chain Tower.
//     The boulder flattens the tower he was standing on. The giant can't believe it.
//  4. he lands by the winch. Your swing. The chain parts, heavy, in slow motion.
//  5. the giant, robbed, smashes the Chain Tower; Odysseus dives for his ship
//  6. he hauls himself aboard. ROW (mash Space): boulders from the cliffs, one hit, one last throw
//  7. out through the mouth into the dawn. The last frame is his, with one more line on his card.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { makeBoulder, makeAxe } from "./chainTower.js";
import { THROW_RELEASE, CLIFF_GIANTS } from "./giant.js";
import { shot, cineLights, bolt, physics, splashAt, sparks, ease, ANTIPHATES_AT } from "./cine.js";

export async function playClimax(c) {
  const { world, hero, director, comic, giant, chain, trial, harbour, mood, crowd, cardAfter } = c;
  await hero.loadHeroics();
  const L = cineLights(world);
  const fling = physics(world);
  const tower = Object.values(trial.piles)[0];
  const H = hero.group.position;
  const ship = harbour.ship;
  const G = giant.group.position;
  const hand = new THREE.Vector3(), wp = new THREE.Vector3();
  const slow = k => { if (!director.skipping) world.timeScale = k; };
  const unhook = u => { const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); };
  document.body.classList.add("cinematic");
  comic.letterbox(true);
  giant.place(ANTIPHATES_AT.x, ANTIPHATES_AT.y, ANTIPHATES_AT.z, tower.x, tower.z);
  giant.play("idle", 0);
  L.aim(ANTIPHATES_AT);
  if (tower.gauge) tower.gauge.group.visible = false;
  hero.group.rotation.y = Math.atan2(G.x - H.x, G.z - H.z);
  const toG = new THREE.Vector3().subVectors(G, H).setY(0).normalize(), side = new THREE.Vector3(-toG.z, 0, toG.x);
  const gdir = new THREE.Vector3(Math.sin(giant.group.rotation.y), 0, Math.cos(giant.group.rotation.y)), gside = new THREE.Vector3(-gdir.z, 0, gdir.x);
  const up = y => new THREE.Vector3(0, y, 0);

  // ---- 1. the face-off. Over his shoulder: him small in the foreground, the giant filling the frame beyond.
  let s = shot(world, director, (t, o) => { const k = ease(Math.min(1, t / 6)); o.pos.copy(H).addScaledVector(toG, -6 + k * 1.5).addScaledVector(side, 2.2).add(up(1.0)); o.look.copy(G).add(up(15 - k * 3)); o.fov = 54 - k * 6; });
  await hero.wait(2.0);
  bolt(harbour, -40, -80);
  await hero.over(1.0, k => L.flicker(k, 8));
  await hero.wait(1.0);
  s.stop();
  // he crouches and pulls the bronze axe out of the AXE crate under his feet
  s = shot(world, director, (t, o) => { o.pos.copy(H).addScaledVector(toG, 2.8).addScaledVector(side, 1.2).add(up(0.9)); o.look.copy(H).add(up(0.9)); o.fov = 42; });
  hero.play("pickup", 0.2, { timeScale: 1.4 });
  await hero.wait(1.1);
  const axe = makeAxe();
  // his bones work in centimetres. The handle lies across his fist; at rest the head hangs by his knee.
  axe.scale.setScalar(100);
  axe.rotation.set(Math.PI, 0, -Math.PI / 2); axe.position.set(0, 8, 3);
  hero.bones.rHand.add(axe);
  comic.sfx("SHHNK!", { x: 62, y: 38, r: 10, size: 6, seconds: 1.0 });
  await hero.wait(1.6);
  hero.play("idle", 0.4);
  await hero.wait(0.6);
  s.stop();

  // where the axe will be when it bites. The swing clip chops down hard just before 1 s in; find the instant
  // the blade comes down through the chain's height, and where the blade is then, relative to his feet.
  const edgeMesh = axe.children[2], sw = hero.actions.swing;
  const CH = chain.cutPoint.y - chain.topY;
  let HIT_T = 0.92;
  const bladeOff = new THREE.Vector3(0.7, CH, 0.95);
  {
    const yaw0 = hero.group.rotation.y;
    hero.play("swing", 0);
    let prevY = null;
    for (let tt = 0.8; tt <= 1.12; tt += 0.01) {
      sw.time = tt; hero.mixer.update(0); hero.group.updateMatrixWorld(true);
      const e = edgeMesh.getWorldPosition(new THREE.Vector3()).sub(H);
      if (prevY !== null && prevY >= CH && e.y < CH) { HIT_T = tt; bladeOff.copy(e).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw0); break; }
      prevY = e.y;
    }
    hero.play("idle", 0); hero.mixer.update(0);
  }
  // so he must stand here, facing this way, for the blade to meet the chain where it leaves the winch
  const cutAt = chain.cutPoint.clone();
  const strikeYaw = Math.PI - Math.atan2(bladeOff.x, bladeOff.z);
  const offW = bladeOff.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), strikeYaw);
  const strikePos = new THREE.Vector3(cutAt.x - offW.x, chain.topY, cutAt.z - offW.z);
  // ...and his feet on the top crate itself, not on a guess
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  const surface = (obj, x, z, fallback) => {
    obj.updateMatrixWorld(true);
    ray.set(new THREE.Vector3(x, fallback + 6, z), down);
    const hit = ray.intersectObject(obj, true)[0];
    return hit ? hit.point.y : fallback;
  };
  strikePos.y = surface(chain.crates[chain.crates.length - 1], strikePos.x, strikePos.z, chain.topY);

  // ---- 2. the standoff: each held a little too long, each shorter than the last
  const R = 2.6;
  const boulder = makeBoulder(R); world.scene.add(boulder);
  const ride = { update: () => boulder.position.copy(giant.handPos(hand)) }; world.add(ride);
  // low on the stones in front of him, looking up. The ruins are full of columns, so try spots in an arc
  // and keep the first one with a clear line to his legs, chest and head.
  const lowAt = (() => {
    const ray = new THREE.Raycaster(), solid = [];
    // only big things block (columns, beams, walls); a barrel in the corner of a low shot is fine
    const big = o => { const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3()); return Math.max(sz.x, sz.y, sz.z) > 2.5; };
    world.scene.traverse(o => { if (o.isMesh && o.visible && !o.isSkinnedMesh && o.material && !o.material.transparent && o.material.side !== THREE.BackSide && big(o)) solid.push(o); });
    const cam = new THREE.PerspectiveCamera(58, director.cam.aspect, 0.1, 500);
    const aim = G.clone().add(up(22)), ndc = new THREE.Vector2();
    for (const ang of [0, -0.3, 0.3, -0.6, 0.6, -0.9, 0.9, -1.2, 1.2, -1.5, 1.5]) for (const dist of [16, 20, 24, 28]) for (const h of [0.5, 2.0, 4.0, 6.0]) {
      const dir = gdir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      const at = G.clone().addScaledVector(dir, dist).setY(QUAY_TOP + h);
      if (at.z < -4) at.y = 1.0 + h;            // out over the water, just above the waves
      cam.position.copy(at); cam.lookAt(aim); cam.updateMatrixWorld(true);
      // (anything near him counts, in front or just behind: the frame should be him and the sky)
      const reach = at.distanceTo(G) + 3;
      let clear = true;
      // rays through a grid across the whole frame: nothing but floor and far cliffs in the frame
      for (let gx = -0.95; gx <= 0.96 && clear; gx += 0.19) for (let gy = -0.9; gy <= 0.91 && clear; gy += 0.3) {
        ndc.set(gx, gy); ray.setFromCamera(ndc, cam); ray.far = reach;
        const hit = ray.intersectObjects(solid, false).find(hh => hh.point.y > QUAY_TOP + 0.6);
        if (hit) clear = false;
      }
      if (clear) return at;
    }
    return G.clone().addScaledVector(gdir, 19).setY(QUAY_TOP + 2.5);
  })();
  const giantLow = (t, o) => { o.pos.copy(lowAt); o.look.set(G.x, G.y + 22, G.z); o.fov = 60 - t * 1.5; };
  const heroLow = (t, o) => { o.pos.copy(H).addScaledVector(toG, 3.4).addScaledVector(side, -1.0).add(up(-2.2)); o.look.copy(H).add(up(1.2)); o.fov = 40 - t * 2; };
  for (const [fn, hold] of [[giantLow, 2.2], [heroLow, 1.8], [giantLow, 1.1], [heroLow, 0.8]]) { s = shot(world, director, fn); await hero.wait(hold); s.stop(); }

  // ---- 3. the throw, in profile from out on the water: all of him, winding up
  s = shot(world, director, (t, o) => { const body = G.clone().add(up(17)); o.pos.copy(body).addScaledVector(gside, -48).addScaledVector(gdir, 16).setY(6); o.look.copy(body).addScaledVector(gdir, 8); o.fov = 50; });
  const thr = giant.play("throw", 0.15);
  while (thr.time < THROW_RELEASE) await hero.wait(0.02);
  unhook(ride);
  comic.sfx("HHRRNNGH!", { x: 40, y: 30, r: -6, size: 8, seconds: 1.2 });
  s.stop();
  // the boulder's path: from his hand to the foot of the cargo tower, turning over as it comes
  const from = boulder.position.clone(), towerHit = new THREE.Vector3(tower.x, QUAY_TOP + 1.2, tower.z + 0.2);
  const pose = k => { boulder.position.lerpVectors(from, towerHit, k); boulder.position.y += Math.sin(Math.PI * k) * 9; boulder.rotation.set(k * 5, k * 2, 0); };
  // where along its flight he meets it, and the exact top of the rock there, for his feet
  const MEET = 0.7, LEAP = 0.24;
  pose(MEET);
  const meet = boulder.position.clone();
  meet.y = surface(boulder, meet.x, meet.z, meet.y + R);
  pose(0);
  // he sees it coming: a low shot past him at the rock in the air
  s = shot(world, director, (t, o) => { o.pos.copy(H).addScaledVector(toG, -3).addScaledVector(side, 1.6).add(up(0.4)); o.look.copy(boulder.position); o.fov = 46; });
  let jumped = false, j0 = null;
  await hero.over(1.7 * MEET, k => {
    const kk = k * MEET;
    pose(kk);
    slow(kk > 0.35 ? 0.35 : 1);
    // ...and instead of running, he jumps to meet it
    if (!jumped && kk > MEET - LEAP) { jumped = true; j0 = H.clone(); hero.play("jump", 0.08, { timeScale: 1.4 }); }
    if (jumped) { const q = Math.min(1, (kk - (MEET - LEAP)) / LEAP); H.lerpVectors(j0, meet, ease(q)); H.y += Math.sin(Math.PI * q) * 1.6; }
  });
  pose(MEET);
  H.copy(meet);
  s.stop();
  // bullet time: his feet on the rock, the rock in the air, and the camera goes round him
  hero.play("land", 0.08, { timeScale: 0.5 });
  slow(0.04);
  comic.sfx("TAK!", { x: 54, y: 62, r: 6, size: 5, seconds: 1.6 });
  s = shot(world, director, (t, o) => { const th = 0.6 + t * 1.1; o.pos.set(H.x + Math.sin(th) * 6.5, H.y + 1.0, H.z + Math.cos(th) * 6.5); o.look.copy(H).add(up(0.5)); o.fov = 46; });
  await comic.hold(2.6);
  s.stop();
  // ...and off it: a second jump, from the rock, out over the water, down onto the Chain Tower beside the winch
  const P0 = H.clone(), P1 = strikePos.clone();
  const apex = Math.max(P0.y, P1.y) + 9, TF = 3.2;
  const flyYaw = Math.atan2(P1.x - P0.x, P1.z - P0.z);
  hero.group.rotation.y = flyYaw;
  hero.play("jump", 0.05, { timeScale: 1.6 });
  comic.sfx("BOINNG!", { x: 46, y: 56, r: -12, size: 7, seconds: 1.4 });
  slow(0.35);
  // the boulder carries on without him, down into the tower he was standing on
  const bFrom = boulder.position.clone();
  const carryOn = { t: 0, update(dt) {
    this.t += dt; const k = Math.min(1, this.t / 0.7);
    boulder.position.lerpVectors(bFrom, towerHit, k); boulder.rotation.x += dt * 3;
    if (k < 1) return;
    tower.crates.forEach((cr, i) => fling(cr, new THREE.Vector3((Math.random() - 0.5) * 8, 3 + i * 1.2, 2 + Math.random() * 5), new THREE.Vector3(Math.random() * 5, 0, Math.random() * 5)));
    tower.crates = [];
    fling(boulder, new THREE.Vector3(1, 2, 5), new THREE.Vector3(1, 0, 1));
    unhook(carryOn);
  } };
  world.add(carryOn);
  const fdir = new THREE.Vector3(P1.x - P0.x, 0, P1.z - P0.z).normalize(), fside = new THREE.Vector3(-fdir.z, 0, fdir.x);
  // tracking alongside him in the air, the harbour far below
  s = shot(world, director, (t, o) => { o.pos.copy(H).addScaledVector(fside, 8).addScaledVector(fdir, -3).add(up(0.5)); o.look.copy(H).add(up(0.8)); o.fov = 50; });
  let cutG = false, cutL = false, landing = false;
  const ctrl = 2 * apex - (P0.y + P1.y) / 2;
  const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
  await hero.over(TF, k => {
    H.set(THREE.MathUtils.lerp(P0.x, P1.x, k), (1 - k) * (1 - k) * P0.y + 2 * (1 - k) * k * ctrl + k * k * P1.y, THREE.MathUtils.lerp(P0.z, P1.z, k));
    if (k > 0.12 && k < 0.9 && hero.base !== hero.actions.airborne) hero.play("airborne", 0.25);
    // in the last of the fall he turns to face the chain, so he lands ready to strike
    hero.group.rotation.y = turn(flyYaw, strikeYaw, Math.max(0, (k - 0.75) / 0.25));
    slow(k < 0.5 ? 0.35 : 1);
    // the giant: he can't believe what he just saw
    if (!cutG && k > 0.3) {
      cutG = true; s.stop(); giant.play("roar", 0.2);
      comic.sfx("WHA—?!", { x: 58, y: 34, r: 8, size: 8, seconds: 1.3 });
      comic.sfx("KRAKA-THOOM!", { x: 28, y: 72, r: -10, size: 6, seconds: 1.3 });
      s = shot(world, director, (t, o) => { o.pos.copy(lowAt); o.look.set(G.x, G.y + 25, G.z); o.fov = 52 - t * 4; });
    }
    // the landing, from the open side of the tower top (the winch behind him, not in front)
    if (!cutL && k > 0.62) { cutL = true; s.stop(); s = shot(world, director, (t, o) => { o.pos.copy(P1).add(new THREE.Vector3(2.5, 1.0, 6.5)); o.look.copy(H).add(up(0.8)); o.fov = 50; }); }
    if (!landing && k > 0.93) { landing = true; hero.play("land", 0.08); }
  });
  H.copy(P1);
  hero.group.rotation.y = strikeYaw;
  world.timeScale = 1;
  s.o.shake = 0.6;
  comic.sfx("THUNK!", { x: 50, y: 70, r: 4, size: 6, seconds: 1.0 });
  await hero.wait(1.1);
  s.stop();

  // ---- 4. the winch. He landed right where he needs to be. Your swing. The chain parts.
  hero.play("idle", 0.3);
  const midHD = new THREE.Vector3().addVectors(H, cutAt).multiplyScalar(0.5);
  const chainOut = chain.point(0.08).sub(cutAt).setY(0).normalize();
  // from beside them, so you see the blade, the chain and the drum in one frame
  s = shot(world, director, (t, o) => { o.pos.copy(midHD).addScaledVector(chainOut, 2.5).add(new THREE.Vector3(0, 0.7, 4.8)); o.look.copy(midHD).add(up(0.3)); o.fov = 46; });
  await hero.wait(0.5);
  slow(0.12);
  await comic.prompt("SWING!", " ", "PRESS SPACE");
  world.timeScale = 1;
  hero.play("swing", 0.05);
  while (sw.time < HIT_T) await hero.wait(0.005);
  // the blade meets the chain: sparks off the bronze, the frame holds on the hit, then everything heavy and slow
  const bite = edgeMesh.getWorldPosition(new THREE.Vector3());
  sparks(world, bite, 140);
  s.o.shake = 1.4;
  comic.sfx("KRANNNGG!!", { x: 34, y: 20, r: -7, size: 10, seconds: 1.6 });
  if (!director.skipping) { world.grade.uniforms.freeze.value = 1; world.timeScale = 0.0001; await comic.hold(0.45); world.grade.uniforms.freeze.value = 0; }
  chain.snap(bite);
  bolt(harbour, -60, -160);
  slow(0.3);
  await hero.wait(0.7);
  s.stop();
  // from the winch, down along the chain as it falls, slow, into the harbour
  const cs = cutAt.clone();
  s = shot(world, director, (t, o) => { o.pos.copy(cs).add(new THREE.Vector3(-3, 4, 7)); o.look.copy(chain.point(0.35)); o.fov = 56; });
  comic.sfx("clank", { x: 40, y: 40, r: -4, size: 3.5, seconds: 1.0 });
  await hero.wait(0.4);
  comic.sfx("clank", { x: 55, y: 52, r: 6, size: 3.5, seconds: 1.0 });
  await hero.wait(0.4);
  comic.sfx("CLANK", { x: 68, y: 64, r: -3, size: 4.5, seconds: 1.0 });
  await hero.wait(0.3);
  splashAt(world, chain.point(0.3).setY(0), 3);
  splashAt(world, chain.point(0.55).setY(0), 2.4);
  comic.sfx("SPLOOSH!", { x: 60, y: 70, r: 5, size: 7, seconds: 1.2 });
  await hero.wait(0.9);
  world.timeScale = 1;
  s.stop();

  // ---- 5. robbed, the giant turns on his own Chain Tower. Odysseus runs for the edge and dives.
  giant.group.rotation.y = Math.atan2(chain.group.position.x - G.x, chain.group.position.z - G.z);
  const g2 = new THREE.Vector3(Math.sin(giant.group.rotation.y), 0, Math.cos(giant.group.rotation.y)), g2s = new THREE.Vector3(-g2.z, 0, g2.x);
  giant.play("roar", 0.2);
  comic.sfx("RRAAAAGH!", { x: 46, y: 30, r: -8, size: 10, seconds: 1.4 });
  s = shot(world, director, (t, o) => { o.pos.copy(G).addScaledVector(g2, 30).addScaledVector(g2s, -12).setY(QUAY_TOP + 0.6); o.look.set(G.x, G.y + 24, G.z); o.fov = 60 - t * 3; });
  await hero.wait(1.6);
  s.stop();
  const top = new THREE.Vector3(chain.group.position.x, strikePos.y, chain.group.position.z);
  const toShip = new THREE.Vector3(ship.position.x - top.x, 0, ship.position.z - top.z).normalize();
  const edge = top.clone().addScaledVector(toShip, 2.4);
  const boulder2 = makeBoulder(3.0); world.scene.add(boulder2);
  const thr2 = giant.play("throw", 0.2); thr2.reset().play();
  const ride2 = { update: () => boulder2.position.copy(giant.handPos(hand)) }; world.add(ride2);
  s = shot(world, director, (t, o) => { o.pos.copy(top).addScaledVector(toShip, 9).add(new THREE.Vector3(-6, 3, 0)); o.look.copy(top).add(up(1.2)); o.fov = 50; });
  hero.play("walk", 0.15, { timeScale: 1.6 });
  hero.group.rotation.y = Math.atan2(toShip.x, toShip.z);
  const E0 = H.clone();
  hero.over(1.0, k => H.lerpVectors(E0, edge, ease(k))).then(() => hero.play("idle", 0.15));
  while (thr2.time < THROW_RELEASE) await hero.wait(0.02);
  unhook(ride2);
  const b2from = boulder2.position.clone(), winchAt = chain.chainStart.clone().add(up(0.8));
  await hero.over(1.2, k => { boulder2.position.lerpVectors(b2from, winchAt, k); boulder2.position.y += Math.sin(Math.PI * k) * 8; boulder2.rotation.x += 0.1; });
  s.o.shake = 1.6;
  chain.smash();
  comic.sfx("KRUNCH!", { x: 44, y: 40, r: 9, size: 9, seconds: 1.2 });
  fling(boulder2, new THREE.Vector3(-4, 2, -6), new THREE.Vector3(2, 0, 3));
  bolt(harbour, 30, -200);
  await hero.wait(0.5);
  s.stop();
  // the dive, in slow motion, falling with him
  const splashPoint = ship.position.clone().add(new THREE.Vector3(6.5, 0, 4));
  const D0 = H.clone(), D1 = new THREE.Vector3(splashPoint.x, -1.5, splashPoint.z);
  hero.group.rotation.y = Math.atan2(D1.x - D0.x, D1.z - D0.z);
  hero.play("dive", 0.08, { timeScale: 0.9 });
  const ddir = new THREE.Vector3(D1.x - D0.x, 0, D1.z - D0.z).normalize(), dside = new THREE.Vector3(-ddir.z, 0, ddir.x);
  s = shot(world, director, (t, o) => { o.pos.copy(H).addScaledVector(dside, 6).addScaledVector(ddir, 2).add(up(-1.5)); o.pos.y = Math.max(o.pos.y, 1.2); o.look.copy(H).add(up(0.8)); o.fov = 52; });
  await hero.over(2.6, k => {
    H.lerpVectors(D0, D1, k);
    H.y = D0.y + (D1.y - D0.y) * k * k + Math.sin(Math.min(1, k * 2) * Math.PI) * 2.0;
    slow(k > 0.12 && k < 0.55 ? 0.3 : 1);
  });
  world.timeScale = 1;
  splashAt(world, new THREE.Vector3(D1.x, 0, D1.z), 1.6);
  comic.sfx("SPLOOSH!", { x: 50, y: 62, r: -6, size: 8, seconds: 1.2 });
  hero.group.visible = false;
  await hero.wait(1.0);
  s.stop();

  // ---- 6. he comes up by the hull and hauls himself up the side. Cut as he goes over the rail.
  // (the seaward side, away from the pier)
  const hullX = ship.position.x + 4.2, hullZ = ship.position.z + 2;
  hero.group.visible = true;
  hero.group.position.set(hullX, -0.75, hullZ);
  hero.group.rotation.y = -Math.PI / 2;
  s = shot(world, director, (t, o) => { o.pos.set(hullX + 6, 1.6, hullZ + 4.5); o.look.set(hullX - 0.8, 0.6 + Math.min(t, 3) * 0.5, hullZ); o.fov = 44; });
  hero.play("climb", 0.2, { timeScale: 1.1 });
  await hero.over(3.0, k => { H.y = -0.75 + 2.0 * k; });
  s.stop();

  // ---- the escape. Homer: the Laestrygonians stoned the fleet from the cliffs as it tried to get out.
  // Mash Space to row. Row hard enough and she gets to the mouth; too slow, and a boulder breaks her in half
  // and you try again from the quay.
  ship.attach(hero.group);
  const stern = () => ship.localToWorld(wp.set(-15, 1.5, 0));
  const zStart = ship.position.z, zMouth = -98, zOut = -118, shipY = ship.position.y, shipRot = ship.rotation.clone();
  const LIMIT = 13;                                    // seconds to reach the mouth
  let speed = 0, rock = 0, phase = "row", hitDone = false, t = 0, nextBolt = 1.5, attempt = 0, row = null;
  const rocks = [];
  let throwers = [];
  const launch = (from, to, size, onLand, flight = 1.6) => {
    const b = makeBoulder(size); b.position.copy(from); world.scene.add(b);
    rocks.push({ b, from: from.clone(), to: to.clone(), t: 0, flight, onLand, arc: 6 + size * 2 });
  };
  const nearMiss = () => { const sd2 = Math.random() < 0.5 ? -1 : 1; return new THREE.Vector3(ship.position.x + sd2 * (5 + Math.random() * 5), 0, ship.position.z - speed * 1.4 - Math.random() * 8); };
  const landSplash = at => { splashAt(world, new THREE.Vector3(at.x, 0, at.z), 1.6); rock += 0.04; if (Math.random() < 0.4) comic.sfx("SPLASH!", { x: 20 + Math.random() * 60, y: 50 + Math.random() * 20, r: (Math.random() - 0.5) * 20, size: 4.5, seconds: 0.9 }); };
  const planks = (at, n, power) => { for (let k = 0; k < n; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 1.4), new THREE.MeshStandardMaterial({ color: 0x5a3b22 })); pl.position.copy(at); world.scene.add(pl); fling(pl, new THREE.Vector3((Math.random() - 0.5) * 10 * power, (6 + Math.random() * 6) * power, (Math.random() - 0.3) * 8 * power), new THREE.Vector3(6, 0, 4)); } };
  const chase = { update: dt => {
    t += dt;
    if (phase === "row" && (nextBolt -= dt) <= 0) { nextBolt = 2.2 + Math.random() * 1.5; bolt(harbour, Math.random() < 0.5 ? -60 : 60, ship.position.z - 60); }
    if (phase === "row") {
      // rowing hard: up to about 14 m/s; not rowing, she drifts at 3
      const rate = window.__rowFail && attempt === 0 ? 0 : row.rate();
      const want = 3 + Math.min(rate, 8) * 1.4;
      speed += (want - speed) * Math.min(1, dt * 1.5);
      row.progress((zStart - ship.position.z) / (zStart - zMouth));
    }
    ship.position.z -= speed * dt;
    rock *= Math.pow(0.2, dt);
    if (phase !== "sinking") ship.rotation.x = shipRot.x + Math.sin(t * 9) * rock;
    if (phase === "row") for (const th of throwers) {
      if (!th.act) { th.wait -= dt; if (th.wait <= 0) { th.g.current = null; th.act = th.g.play("throw", 0.15); th.act.reset().play(); th.rock = makeBoulder(2.0); world.scene.add(th.rock); } continue; }
      if (th.rock) th.rock.position.copy(th.g.handPos(wp));
      if (th.rock && th.act.time >= THROW_RELEASE) {
        const src = th.rock.position.clone(); world.scene.remove(th.rock); th.rock = null;
        const progress = (zStart - ship.position.z) / (zStart - zMouth);
        if (!hitDone && progress > 0.42) {
          hitDone = true;
          launch(src, stern().clone(), 1.4, at => { rock += 0.14; if (s) s.o.shake = 1.2; planks(at, 6, 1); comic.sfx("WHAM!", { x: 62, y: 46, r: 10, size: 8, seconds: 1.0 }); }, 1.4);
        } else launch(src, nearMiss(), 2.0, at => landSplash(at));
      }
      if (th.act.time >= th.act.getClip().duration - 0.05) { th.act = null; th.g.current = null; th.g.play("idle", 0.3); th.wait = 1.4 + Math.random() * 1.2; }
    }
    for (let k = rocks.length - 1; k >= 0; k--) {
      const r = rocks[k]; r.t += dt; const e = Math.min(1, r.t / r.flight);
      r.b.position.lerpVectors(r.from, r.to, e); r.b.position.y += Math.sin(Math.PI * e) * r.arc; r.b.rotation.x += dt * 4;
      if (e >= 1) { rocks.splice(k, 1); world.scene.remove(r.b); r.onLand(r.to); }
    }
  } };
  world.add(chase);
  const angles = [
    // low behind the stern
    o => { o.pos.set(ship.position.x + 6, 3.2, ship.position.z + 20); o.look.set(ship.position.x, 4, ship.position.z - 30); o.fov = 52; },
    // level with the hull, on the water
    o => { o.pos.set(ship.position.x - 18, 1.0, ship.position.z - 6); o.look.set(ship.position.x, 2.5, ship.position.z - 10); o.fov = 50; },
    // over his shoulder, back at the giant
    o => { const h = hero.group.getWorldPosition(new THREE.Vector3()); o.pos.copy(h).add(new THREE.Vector3(1.2, 2.4, 3.0)); o.look.set(G.x, G.y + 20, G.z); o.fov = 56; },
    // a cliff giant's view, down on the ship
    o => { const g = crowd[1].group.position, d = new THREE.Vector3(ship.position.x - g.x, 0, ship.position.z - g.z).normalize(); o.pos.copy(g).addScaledVector(d, 9).add(up(31)); o.look.copy(ship.position); o.fov = 42; }
  ];
  for (;;) {
    // (re)start: the ship at the quay, him at the stern facing back at them, the giants on their cliffs
    ship.position.set(ship.position.x, shipY, zStart); ship.rotation.copy(shipRot);
    hero.group.position.set(-12.6, 2.45, 0); hero.group.rotation.set(0, -Math.PI / 2, 0);
    hero.play("idle", 0.2);
    crowd.forEach((g, i) => { const [x, z, , y] = CLIFF_GIANTS[i]; g.place(x, y, z, ship.position.x, ship.position.z - 40); g.current = null; g.play("idle", 0); });
    giant.group.rotation.y = Math.atan2(ship.position.x - G.x, ship.position.z - G.z);
    giant.current = null; giant.play("idle", 0.3);
    throwers = crowd.map((g, i) => ({ g, wait: 0.8 + i * 0.75, act: null, rock: null }));
    speed = 0; rock = 0; hitDone = false; phase = "row";
    s = shot(world, director, (tt, o) => { angles[Math.floor(tt / 2.6) % angles.length](o); });
    if (attempt > 0) await comic.black(false, 0.6);
    row = comic.mash(attempt ? "ROW HARDER!" : "ROW!", "MASH SPACE");
    let left = LIMIT;
    while (ship.position.z > zMouth + 10 && left > 0) { await hero.wait(0.1); left -= 0.1; }
    row.stop();
    if (ship.position.z <= zMouth + 10) break;
    // too slow. A cliff giant's boulder comes down square amidships and breaks her back.
    phase = "sinking";
    throwers.forEach(th => { if (th.rock) world.scene.remove(th.rock); });
    s.stop();
    const mid = ship.position.clone().add(up(1.5));
    const thrower = crowd.reduce((a, g) => (g.group.position.distanceTo(mid) < a.group.position.distanceTo(mid) ? g : a));
    s = shot(world, director, (tt, o) => { o.pos.set(ship.position.x - 26, 6, ship.position.z + 14); o.look.copy(ship.position).add(up(2)); o.fov = 46; });
    let hit = false;
    launch(thrower.handPos(wp).clone(), mid, 3.2, at => {
      hit = true; s.o.shake = 2.0;
      planks(at, 16, 1.4); splashAt(world, at, 3.5);
      comic.sfx("KRAKOOM!", { x: 50, y: 40, r: -9, size: 11, seconds: 1.6 });
    }, 1.5);
    slow(0.4);
    while (!hit) await hero.wait(0.05);
    world.timeScale = 1;
    // she folds in the middle and goes down, him with her
    const y0 = ship.position.y;
    await hero.over(2.4, k => { speed *= 0.9; ship.position.y = y0 - 6 * k * k; ship.rotation.z = shipRot.z + 0.45 * ease(k); ship.rotation.x = shipRot.x + 0.2 * k; });
    await comic.black(true, 0.7);
    s.stop();
    rocks.forEach(r => world.scene.remove(r.b)); rocks.length = 0;
    attempt++;
  }
  s.stop();

  // ---- the last boulder. Antiphates puts everything into it; it comes down just behind the stern
  phase = "out";
  speed = Math.max(speed, 8);
  const last = makeBoulder(3.8); world.scene.add(last);
  giant.group.rotation.y = Math.atan2(ship.position.x - G.x, ship.position.z - G.z);
  giant.current = null;
  const lastThrow = giant.play("throw", 0.2); lastThrow.reset().play();
  const rideL = { update: () => last.position.copy(giant.handPos(wp)) }; world.add(rideL);
  s = shot(world, director, (tt, o) => { const st = stern(); o.pos.set(st.x + 9, 2.2, st.z - 10); o.look.set(G.x, G.y + 21, G.z); o.fov = 56; });
  while (lastThrow.time < THROW_RELEASE) await hero.wait(0.02);
  unhook(rideL);
  const lf = last.position.clone(), lt = new THREE.Vector3(ship.position.x + 1, 0, ship.position.z + 24);
  s.stop();
  // wide, from out beyond the mouth: the ship coming at us between the cliffs, the boulder falling behind it
  s = shot(world, director, (tt, o) => { o.pos.set(ship.position.x + 10, 5, zOut - 26); o.look.set(ship.position.x, 4, ship.position.z + 8); o.fov = 46; });
  slow(0.3);
  await hero.over(2.6, k => { lt.z = ship.position.z + 22; last.position.lerpVectors(lf, lt, k); last.position.y += Math.sin(Math.PI * k) * 30; last.rotation.x += 0.05; });
  world.timeScale = 1;
  splashAt(world, lt, 4.5);
  comic.sfx("KA-BLOOSH!", { x: 50, y: 44, r: 7, size: 11, seconds: 1.6 });
  world.scene.remove(last);
  s.o.shake = 1.6;
  // the wave behind it throws the ship out through the mouth
  await hero.over(1.8, k => { speed = 16 * (1 - k) + 6 * k; ship.rotation.x = -0.12 * Math.sin(Math.PI * k); });
  await hero.wait(0.6);
  s.stop();
  unhook(chase);
  rocks.forEach(r => world.scene.remove(r.b));
  ship.rotation.x = 0;

  // ---- 7. out at sea. The storm breaks; the dawn. It ends on him.
  // at the bow, facing home
  hero.group.rotation.set(0, Math.PI / 2, 0); hero.group.position.set(11.5, 2.45, 0);
  hero.play("idle", 0.3);
  crowd.forEach(g => g.hide());
  const S0 = ship.position.clone(), S1z = S0.z - 24;
  s = shot(world, director, (tt, o) => { const k = Math.min(1, tt / 9); o.pos.set(ship.position.x - 12 + k * 4, 4 + k * 14, ship.position.z - 26 - k * 6); o.look.set(ship.position.x, 3, ship.position.z + 12); o.fov = 52; });
  mood.to(1, 8);
  await hero.over(9, k => { ship.position.z = S0.z + (S1z - S0.z) * ease(k); });
  s.stop();
  // the last frame: him at the bow, the dawn on his face
  const bow = hero.group.getWorldPosition(new THREE.Vector3());
  s = shot(world, director, (tt, o) => { o.pos.copy(bow).add(new THREE.Vector3(1.6, 1.2, -3.4 + tt * 0.1)); o.look.copy(bow).add(up(1.6)); o.fov = 32; });
  await hero.wait(2.0);
  await director.freeze(cardAfter.name, cardAfter.sub, 4.2);
  s.stop();

  L.restore();
  document.body.classList.remove("cinematic");
  comic.clear();
  return { axe };
}
