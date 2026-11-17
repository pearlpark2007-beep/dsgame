// troyStorm.js — the storm over the title (shot 11), modelled on how real lightning behaves:
//  · a faint, downward-BRANCHING stepped leader first (real: ~30 m steps, tens of ms; stretched here to a few frames so it can be seen)
//  · then the bright RETURN STROKE up the channel — the flash people see — lighting the clouds from inside
//  · then usually 3–4 more strokes along the SAME main channel (no new branches), tens of ms apart: the flicker
//  · thunder arrives later by distance (sound: ~343 m/s, "5 seconds a mile"): a sharp crack/clap when close, a long low rumble when far
// Sources: Britannica, "Cloud-to-ground lightning"; US National Weather Service, "Dr. Lightning" science guide.
// Uses the engine's StormSky (clouds) and Rain unchanged; the sky's own `flash` uniform lights the clouds.
import * as THREE from "three";
import { StormSky } from "../../engine/sky.js";
import { Rain } from "../../engine/weather.js";
import { sound } from "../../engine/sound.js";

const rnd = (a, b) => a + Math.random() * (b - a);

// a jagged channel from top to bottom by midpoint displacement, with branches that die out before the ground
function channel(top, bottom, { rough = 0.22, depth = 6, branches = 5 } = {}) {
  let pts = [top.clone(), bottom.clone()];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(rnd(-1, 1) * len * rough, rnd(-0.3, 0.3) * len * rough, rnd(-1, 1) * len * rough * 0.5));
      next.push(m, b);
    }
    pts = next;
  }
  const out = { main: pts, branches: [] };
  for (let i = 0; i < branches; i++) {
    const k = Math.floor(rnd(0.08, 0.6) * pts.length), from = pts[k];
    const len = top.distanceTo(bottom) * rnd(0.12, 0.3);
    const to = from.clone().add(new THREE.Vector3(rnd(-0.7, 0.7) * len, -len, rnd(-0.3, 0.3) * len));
    out.branches.push(channel(from, to, { rough: 0.28, depth: 4, branches: 0 }).main);
  }
  return out;
}
function tube(pts, radius, mat) {
  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  return new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 2, radius, 4, false), mat);
}

export class Storm {
  constructor(world, { camera, horizon = [[-900, 900], [1100, 1900]] } = {}) {
    this.world = world; this.cam = camera; this.area = horizon;
    this.sky = new StormSky(world, { zenith: 0x05080c, horizon: 0x1a2229, cloudDark: 0x0b0f14, cloudLit: 0x4a5866, glow: 0x2a3440, glowDir: new THREE.Vector3(0, 0.05, 1) });
    world.add(this.sky);
    this.rain = new Rain(world, { count: 9000, box: [60, 34, 60], wind: new THREE.Vector3(-3.5, 0, -6), speed: 30 });
    this.rain.mat.opacity = 0.28;
    world.add(this.rain);
    this.light = new THREE.DirectionalLight(0xc8d6ff, 0); world.scene.add(this.light, this.light.target);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xe6eeff, toneMapped: false, transparent: true, fog: false, depthWrite: false });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x8fa8ff, toneMapped: false, transparent: true, opacity: 0.3, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
    this.group = new THREE.Group(); world.scene.add(this.group);
    this.events = []; this.clock = 0; this.flash = 0;
    world.add(this);
  }

  // one cloud-to-ground flash at distance `dist` metres (in front of the camera, to one side by `side`)
  strike({ dist = 1400, side = 0, strokes = 4, at = 0 } = {}) {
    const c = this.cam.position, fwd = new THREE.Vector3(0, 0, 1);
    const ground = new THREE.Vector3(c.x + side, 0, c.z).addScaledVector(fwd, dist);
    const top = ground.clone().add(new THREE.Vector3(rnd(-120, 120), dist * 0.32 + 220, rnd(-60, 60)));
    const ch = channel(top, ground);
    const r = Math.max(1.2, dist / 450);                                 // thick enough to read at a distance
    const main = tube(ch.main, r, this.mat), halo = tube(ch.main, r * 5, this.glowMat);
    const leaders = ch.branches.map(b => tube(b, r * 0.6, this.mat));
    const t0 = this.clock + at;
    // the stepped leader: faint, growing downward with its branches (0.18 s), then the return stroke and the re-strikes
    this.events.push({ t0, kind: "leader", meshes: [main, ...leaders], len: 0.18 });
    let t = t0 + 0.18;
    for (let i = 0; i < strokes; i++) {
      this.events.push({ t0: t, kind: "stroke", meshes: i === 0 ? [main, halo, ...leaders] : [main, halo], power: i === 0 ? 1 : rnd(0.5, 0.85), len: i === 0 ? 0.09 : rnd(0.04, 0.07),
        dir: top.clone().lerp(ground, 0.5) });
      t += rnd(0.05, 0.11);
    }
    this.events.push({ t0: t + 0.35, kind: "end", meshes: [main, halo, ...leaders] });
    // the thunder, late by the distance: sound covers about 343 m a second
    const delay = (at + dist / 343) * 1000;
    setTimeout(() => !this.world.timeScale || this.world.timeScale < 6 ? Storm.thunder(dist) : null, delay);
    return { dist, delay: delay / 1000 };
  }
  // a flash inside the clouds only (no channel to the ground): the sky lights up, far off
  cloudFlash(dir = new THREE.Vector3(rnd(-0.6, 0.6), 0.25, 1), at = 0) {
    const t0 = this.clock + at;
    this.events.push({ t0, kind: "stroke", meshes: [], power: 0.55, len: 0.12, dir: this.cam.position.clone().addScaledVector(dir.normalize(), 1500) });
    this.events.push({ t0: t0 + 0.2, kind: "stroke", meshes: [], power: 0.35, len: 0.08, dir: this.cam.position.clone().addScaledVector(dir, 1500) });
  }

  update(dt, time, raw) {
    this.clock += raw;
    let f = 0, dir = null;
    for (const e of this.events) {
      const into = this.clock - e.t0;
      if (into < 0) continue;
      if (e.kind === "leader" && into < e.len) {
        for (const m of e.meshes) { if (!m.parent) this.group.add(m); }
        this.mat.opacity = 0.18 * (into / e.len);                       // faint while it gropes downward
        e.meshes.forEach(m => m.scale.y = 1);
      }
      if (e.kind === "stroke" && into < e.len) { for (const m of e.meshes) if (!m.parent) this.group.add(m); f = Math.max(f, e.power); dir = e.dir; }
      if (e.kind === "end" && into >= 0) { e.meshes.forEach(m => { this.group.remove(m); m.geometry.dispose(); }); e.done = true; }
    }
    this.events = this.events.filter(e => !e.done && this.clock - e.t0 < 3);
    this.flash += (f - this.flash) * Math.min(1, raw * 45);
    if (f > 0) { this.mat.opacity = 1; this.glowMat.opacity = 0.35 * f; } else if (this.mat.opacity > 0.2) { this.mat.opacity *= 0.82; this.glowMat.opacity *= 0.8; }   // a short afterglow of the channel
    if (dir) { this.light.position.copy(dir); this.sky.uniforms.flashDir.value.copy(dir).sub(this.cam.position).normalize(); }
    this.light.intensity = this.flash * 1.1;          // lights the sea from the strike's side
    this.sky.uniforms.flash.value = this.flash * 0.42;            // clouds lit from inside, not a white-out
    this.world.grade.uniforms.flash.value = this.flash * 0.08;
  }

  dispose() {
    for (const o of [this, this.sky, this.rain]) { const i = this.world.updaters.indexOf(o); if (i >= 0) this.world.updaters.splice(i, 1); }
    this.world.scene.remove(this.sky.mesh, this.rain.lines, this.light, this.light.target, this.group);
    this.world.grade.uniforms.flash.value = 0;
  }

  // thunder from a strike `dist` metres away. Close: a tearing crack, then the clap, then a rolling rumble.
  // Far: only the rumble, low and long (the high sounds die out over distance).
  static thunder(dist) {
    const A = sound.ctx; if (!A || sound.muted) return;
    const out = sound._out, t = A.currentTime;
    const near = THREE.MathUtils.clamp(1 - (dist - 400) / 2600, 0, 1);  // 1 at 400 m, 0 beyond 3 km
    const level = 0.22 + 0.5 * near;
    const env = (g, at, peak, attack, hold, release) => { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + attack); g.gain.setValueAtTime(peak, at + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release); };
    if (near > 0.25) {                                                  // the crack: bright noise, very short
      const n = sound._noise(0.5), f = A.createBiquadFilter(), g = A.createGain();
      f.type = "highpass"; f.frequency.value = 1400; env(g, t, level * 0.9 * near, 0.004, 0.05, 0.35);
      n.connect(f).connect(g).connect(out); n.start(t);
      const n2 = sound._noise(1.4), f2 = A.createBiquadFilter(), g2 = A.createGain();   // the clap
      f2.type = "lowpass"; f2.frequency.value = 900; env(g2, t + 0.05, level * near, 0.01, 0.12, 1.1);
      n2.connect(f2).connect(g2).connect(out); n2.start(t + 0.05);
    }
    // the rumble: low noise, rolling (a few swells as sound arrives from different parts of a long channel)
    const dur = 4 + 4 * (1 - near);
    const n3 = sound._noise(dur + 1), f3 = A.createBiquadFilter(), g3 = A.createGain();
    f3.type = "lowpass"; f3.frequency.value = 110 + 260 * near; f3.Q.value = 0.7;
    g3.gain.setValueAtTime(0.0001, t);
    const swells = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < swells; i++) { const at = t + 0.15 + (i / swells) * dur * 0.75 + Math.random() * 0.3; g3.gain.linearRampToValueAtTime(level * (1.1 - i / swells * 0.6), at); g3.gain.linearRampToValueAtTime(level * 0.35, at + 0.45); }
    g3.gain.linearRampToValueAtTime(0.0001, t + dur);
    n3.connect(f3).connect(g3).connect(out); n3.start(t); n3.stop(t + dur + 0.5);
  }
}
