// cine.js — the tools both Harbour cinematics share (opening.js and climax.js), so they look like one film:
// the same lighting, the same camera rig, the same weight to things falling and splashing.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";

export const ease = k => k * k * (3 - 2 * k);

// reduced motion: no shake, shorter slow motion (the story and the end state stay the same)
export const REDUCED = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };

// one seeded random per film, so every viewing (and every skip) breaks things the same way
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
let R = rng(11);
// each film starts its dice from the same place
export function reseed(seed) { R = rng(seed); }
export const rand = () => R();

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
    // weight, not noise: a smooth damped wobble in real time (the same at any frame rate, nothing in reduced motion)
    if (o.shake > 0.01 && !director.skipping && !REDUCED()) {
      const a = o.shake * 0.22;
      director.cam.position.x += a * (Math.sin(t * 23.0) * 0.6 + Math.sin(t * 37.0 + 1.3) * 0.4);
      director.cam.position.y += a * (Math.sin(t * 29.0 + 0.7) * 0.6 + Math.sin(t * 41.0 + 2.1) * 0.4);
    }
    o.shake *= Math.exp(-raw * 5);
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
  const u = { update: dt => {
    for (const b of bodies) {
      if (b.rest) continue;
      b.v.y -= 18 * dt;
      b.o.position.addScaledVector(b.v, dt);
      b.o.rotation.x += b.w.x * dt; b.o.rotation.z += b.w.z * dt;
      const floor = b.o.position.z > -4 && b.o.position.z < 12 ? QUAY_TOP : -3;          // the quay, or the sea
      if (b.o.position.y < floor) { b.o.position.y = floor; b.v.multiplyScalar(0.3); b.v.y = Math.abs(b.v.y) * 0.25; b.w.multiplyScalar(0.5); if (b.v.length() < 0.5) b.rest = true; }
    }
  } };
  world.add(u);
  const fling = (o, v, w = new THREE.Vector3(3, 0, 2)) => bodies.push({ o, v, w, rest: false });
  fling.stop = () => { const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); };
  return fling;
}

// a soft round dot (spray and sparks are round drops, never squares)
let DOT = null;
function dot() {
  if (DOT) return DOT;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.45, "rgba(255,255,255,0.75)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  DOT = new THREE.CanvasTexture(c); DOT.colorSpace = THREE.SRGBColorSpace;
  return DOT;
}

// white water thrown up where something heavy hits the sea: a column of soft spray that rises, spreads and falls back
export function splashAt(world, at, size = 1) {
  const n = 160, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R());
    pos.set([at.x + Math.cos(a) * r * 0.6 * size, 0.2, at.z + Math.sin(a) * r * 0.6 * size], i * 3);
    vel.push(new THREE.Vector3(Math.cos(a) * (0.6 + r * 4.2) * size, (4 + R() * 10) * size * (1 - 0.45 * r), Math.sin(a) * (0.6 + r * 4.2) * size));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xe9eef0, map: dot(), size: 0.42 * size, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); world.scene.add(pts);
  let t = 0;
  const u = { update: dt => {
    t += dt;
    for (let i = 0; i < n; i++) { vel[i].y -= 18 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] = Math.max(0, pos[i * 3 + 1] + vel[i].y * dt); pos[i * 3 + 2] += vel[i].z * dt; }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.7 * Math.max(0, 1 - t / 1.9);
    if (t > 1.9) { world.scene.remove(pts); geo.dispose(); mat.dispose(); const i = world.updaters.indexOf(u); if (i >= 0) world.updaters.splice(i, 1); }
  } };
  world.add(u);
}

// sparks: bronze on bronze, thrown out from where the axe meets the chain
export function sparks(world, at, n = 80) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([at.x, at.y, at.z], i * 3);
    const a = R() * Math.PI * 2, u = R() * 2 - 1, s = 6 + R() * 14;
    vel.push(new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - u * u) * s, Math.abs(u) * s * 0.8 + 2, Math.sin(a) * Math.sqrt(1 - u * u) * s));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffd28a, map: dot(), size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
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

// the first of several camera spots that sees all the aim points with nothing big (a column, a wall, a tower) in the way
export function clearSpot(world, candidates, aims, skip = []) {
  const ray = new THREE.Raycaster(), solid = [];
  const big = o => { const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3()); return Math.max(sz.x, sz.y, sz.z) > 2.0; };
  world.scene.updateMatrixWorld(true);
  world.scene.traverse(o => { if (o.isMesh && o.visible && !o.isSkinnedMesh && !o.isInstancedMesh && o.material && !o.material.transparent && o.material.side !== THREE.BackSide && !skip.some(s => s === o || s.getObjectById(o.id)) && big(o)) solid.push(o); });
  for (const c of candidates) {
    let clear = true;
    for (const a of aims) {
      const d = a.clone().sub(c), len = d.length();
      ray.set(c, d.normalize()); ray.far = len - 1.5;
      if (ray.intersectObjects(solid, false).length) { clear = false; break; }
    }
    if (clear) return c;
  }
  return candidates[0];
}
