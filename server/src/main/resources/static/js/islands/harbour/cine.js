// cine.js — the tools both Harbour cinematics share (opening.js and climax.js), so they look like one film:
// the same lighting, the same camera rig, the same weight to things falling and splashing.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";

export const ease = k => k * k * (3 - 2 * k);

// where Antiphates stands: on the quay behind the ruined colonnade. At 34 m the columns reach his shins.
export const ANTIPHATES_AT = new THREE.Vector3(-20, QUAY_TOP, 24);

// drive the camera for one shot: fn(t, o) sets o.pos, o.look, o.fov every frame (t in real seconds)
export function shot(world, director, fn) {
  let t = 0, live = true;
  const o = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40, shake: 0 };
  const u = { update: (dt, time, raw) => {
    if (!live) return;
    t += raw; fn(t, o);
    director.mode = null;
    director.cam.position.copy(o.pos);
    if (o.shake > 0) { director.cam.position.x += (Math.random() - 0.5) * o.shake; director.cam.position.y += (Math.random() - 0.5) * o.shake; o.shake *= 0.9; }
    director.look.copy(o.look); director.setFov(o.fov); director.cam.lookAt(o.look);
  } };
  world.add(u);
  return { o, stop() { live = false; const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); } };
}

// the cinematic lighting: the storm stays, but the giants and the hero get just enough light to read
export function cineLights(world) {
  const key = new THREE.DirectionalLight(0xffd2a0, 1.3); key.position.set(30, 40, 40); key.target.position.set(-8, 0, -20);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4); rim.position.set(-40, 30, -90); rim.target.position.set(-8, 0, -10);
  const spot = new THREE.SpotLight(0xffc890, 900, 140, 0.5, 0.6, 1.5); spot.position.set(-6, 24, -12);
  const flash = new THREE.DirectionalLight(0xdfe8ff, 0); flash.position.set(10, 60, -20);
  world.scene.add(key, key.target, rim, rim.target, spot, spot.target, flash, flash.target);
  const exposure = world.renderer.toneMappingExposure; world.renderer.toneMappingExposure = exposure * 1.25;
  const fog = world.scene.fog, density = fog && fog.density; if (fog && fog.density) fog.density *= 0.6;
  return {
    spot, key, rim, flash,
    aim(at) { spot.target.position.copy(at).add(new THREE.Vector3(0, 14, 0)); },
    // a lightning flash on things: white, flicker, white, gone (call every frame with k 0..1)
    flicker(k, peak = 8) { flash.intensity = k < 0.1 ? peak : k < 0.18 ? peak * 0.1 : k < 0.4 ? peak * 0.8 * (1 - (k - 0.18) / 0.22) : 0; },
    restore() {
      world.scene.remove(key, key.target, rim, rim.target, spot, spot.target, flash, flash.target);
      world.renderer.toneMappingExposure = exposure;
      if (fog && density) fog.density = density;
    }
  };
}

export function bolt(harbour, x, z) { if (harbour && harbour.lightning) { harbour.lightning.strike(new THREE.Vector3(x, 0, z)); harbour.lightning.pulseClock = 0.01; } }

// loose things that fly and fall: crates, planks, boulders after they hit
export function physics(world) {
  const bodies = [];
  world.add({ update: dt => {
    for (const b of bodies) {
      if (b.rest) continue;
      b.v.y -= 18 * dt;
      b.o.position.addScaledVector(b.v, dt);
      b.o.rotation.x += b.w.x * dt; b.o.rotation.z += b.w.z * dt;
      const floor = b.o.position.z > -4 && b.o.position.z < 12 ? QUAY_TOP : -3;          // the quay, or the sea
      if (b.o.position.y < floor) { b.o.position.y = floor; b.v.multiplyScalar(0.3); b.v.y = Math.abs(b.v.y) * 0.25; b.w.multiplyScalar(0.5); if (b.v.length() < 0.5) b.rest = true; }
    }
  } });
  return (o, v, w = new THREE.Vector3(3, 0, 2)) => bodies.push({ o, v, w, rest: false });
}

// white water thrown up where something heavy hits the sea
export function splashAt(world, at, size = 1) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xf4f1ea, transparent: true });
  const drops = [];
  for (let i = 0; i < 30; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.25 * size * (0.6 + Math.random()), 6, 4), mat);
    d.position.copy(at); d.position.y = 0.2;
    const a = Math.random() * Math.PI * 2, r = Math.random();
    d.userData.v = new THREE.Vector3(Math.cos(a) * r * 4 * size, (6 + Math.random() * 8) * size, Math.sin(a) * r * 4 * size);
    world.scene.add(d); drops.push(d);
  }
  let t = 0;
  const u = { update: dt => {
    t += dt;
    for (const d of drops) { d.userData.v.y -= 20 * dt; d.position.addScaledVector(d.userData.v, dt); }
    mat.opacity = Math.max(0, 1 - t / 1.8);
    if (t > 1.8) { drops.forEach(d => world.scene.remove(d)); world.updaters.splice(world.updaters.indexOf(u), 1); }
  } };
  world.add(u);
}

// sparks: bronze on bronze, thrown out from where the axe meets the chain
export function sparks(world, at, n = 80) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([at.x, at.y, at.z], i * 3);
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = 6 + Math.random() * 14;
    vel.push(new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - u * u) * s, Math.abs(u) * s * 0.8 + 2, Math.sin(a) * Math.sqrt(1 - u * u) * s));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffd28a, size: 0.14, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(geo, mat); world.scene.add(pts);
  let t = 0;
  const u = { update: dt => {
    t += dt;
    for (let i = 0; i < n; i++) { vel[i].y -= 20 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - t / 0.9);
    if (t > 0.9) { world.scene.remove(pts); world.updaters.splice(world.updaters.indexOf(u), 1); }
  } };
  world.add(u);
}
